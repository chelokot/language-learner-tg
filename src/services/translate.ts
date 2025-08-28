import { LlmUnavailableError, chat } from './llm.js';

/**

* Heuristic mapping for common languages to short codes.
* Used as a fast path and for tests without LLM.
  */
const COMMON_CODES: Record<string, string> = {
  english: 'EN',
  russian: 'RU',
  ukrainian: 'UK',
  ukrainian_u: 'UA', // sometimes desired
  german: 'DE',
  french: 'FR',
  spanish: 'ES',
  italian: 'IT',
  polish: 'PL',
  portuguese: 'PT',
  dutch: 'NL',
  japanese: 'JA',
  chinese: 'ZH',
  korean: 'KO',
};

/** Try to infer a short language code; prefer LLM if available; fallback to heuristics. */
export async function inferLanguageCode(langName: string): Promise<string> {
  const key = langName.trim().toLowerCase();
  if (COMMON_CODES[key]) return COMMON_CODES[key];
  // Fallback: 2–3 letter uppercase prefix
  const fallback =
    key
      .replace(/[^a-z]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'XX';

  try {
    const content = await chat([
      {
        role: 'system',
        content:
          'You are a strict normalizer. Given a human language name, answer with a short code (2–4 letters). Prefer ISO 639-1 when obvious, else common 2–3 letter forms. Answer with the code ONLY.',
      },
      { role: 'user', content: langName },
    ]);
    const code = content
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    return code || fallback;
  } catch (e) {
    if (e instanceof LlmUnavailableError) return fallback;
    throw e;
  }
}

/** Auto-translate using LLM; returns null if LLM not available. */
export async function autoTranslate(
  text: string,
  fromLang: string,
  toLang: string,
  level: string,
): Promise<string | null> {
  try {
    const content = await chat([
      {
        role: 'system',
        content:
          'You are a precise translator. Output only the translation with no quotes, no extra punctuation, no explanations. Be very clever. Do not answer with very stupid and generic translation, find a very that is very good by meaning and vibe. Take user goal language level into account to not propose too simple or too complex translation. You can translate into word (preffered) or short phrase if needed.',
      },
      {
        role: 'user',
        content: `Goal language level: ${level}.\n\nTranslate from ${fromLang} to ${toLang}:\n\n${text}`,
      },
    ]);
    return content.replace(/^["“”]+|["“”]+$/g, '').trim();
  } catch (e) {
    if (e instanceof LlmUnavailableError) return null;
    throw e;
  }
}

/** Generate a short sentence that MUST include targetTerm. Falls back to a template if LLM is unavailable. */
export async function generateSentenceWithTerm(
  language: string,
  targetTerm: string,
  direction: 'goal' | 'native',
  level: string,
  previousExamples: string[],
): Promise<string> {
  const fallback =
    direction === 'goal'
      ? `This simple sentence uses the word "${targetTerm}".`
      : `Це просте речення використовує слово "${targetTerm}".`;

  const examplesText =
    previousExamples && previousExamples.length
      ? `Here are recent examples previously used. Do NOT repeat their ideas or wording; produce something unique and DIFFERENT in theme/structure/vocab. Make them really different: some formal, and some with slang, some very serious, and some funny, on very high topics and on casul real everyday stuff, some on them may be adult (18+) sentences because app is 18+, and some can be very naive and simple, with different times, lengths, structures, make sure new one is different from these old ones!:\n${previousExamples.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : '';

  try {
    const content = await chat([
      {
        role: 'system',
        content:
          'Write one short, natural sentence in the requested language. The sentence MUST include the given target term exactly once (or its inflected form). It must be interesting an unique. Take user goal language level into account to not propose too simple or too complex translation.',
      },
      {
        role: 'user',
        content: `${examplesText}\n\nGoal language level: ${level}.\nLanguage: ${language}\nTarget term to include: ${targetTerm}`,
      },
    ]);
    return content.trim();
  } catch {
    return fallback;
  }
}

/** Judge translation quality and return {ok, feedback}. */
export async function judgeTranslation(
  source: string,
  userAnswer: string,
  fromLang: string,
  toLang: string,
  goalWord: string,
  nativeWord: string,
  level: string,
): Promise<{ ok: boolean; feedback: string }> {
  try {
    const content = await chat([
      {
        role: 'system',
        content:
          'You are a concise grader. Decide if the learner translation is acceptable. Minor grammar/spelling errors are OK. Take user goal language level into account to not expect too simple or too complex translation. Main goal of this exercise is WORD learning. The word that needs to be learned will be provided into the prompt. Whether that word was correctly translated and used in context is the MAIN thing to consider (if some other words are translated a bit akwardly -- still accept it as a correct answer, just give a feedback). Respond with JSON: {"ok": true/false, "feedback": "one sentence"}.',
      },
      {
        role: 'user',
        content: `Goal language level: ${level}.\nWord being trained: ${nativeWord}->${goalWord}. It's important for user to learn ${goalWord} word, ${nativeWord} is allowed to be replaced with close synonym, but ${goalWord} is not.\nSource (${fromLang}): ${source}\nLearner answer (${toLang}): ${userAnswer}`,
      },
    ]);
    const parsed = safeParseJson(content);
    if (typeof parsed?.ok === 'boolean' && typeof parsed?.feedback === 'string') {
      return { ok: parsed.ok, feedback: parsed.feedback.trim() };
    }
  } catch (e) {
    if (e instanceof LlmUnavailableError) {
      console.warn('LLM unavailable, using heuristic translation judge.');
    } else {
      throw e;
    }
  }

  // Heuristic fallback: accept if non-empty, not identical to source
  let ok = userAnswer.trim().length > 0 && userAnswer.trim() !== source.trim();
  // if original contains goal word, check if answer contains native word and vice versa
  const goalWordRegex = new RegExp(escapeRegExp(goalWord), 'i');
  const nativeWordRegex = new RegExp(escapeRegExp(nativeWord), 'i');
  if (
    (source.match(goalWordRegex) && !userAnswer.match(nativeWordRegex)) ||
    (source.match(nativeWordRegex) && !userAnswer.match(goalWordRegex))
  ) {
    ok = false;
  }
  return {
    ok,
    feedback: ok ? 'Looks fine.' : 'That does not seem correct. Try again.',
  };
}

export async function judgeWordTranslation(
  sourceWord: string,
  fromLang: string,
  toLang: string,
  expected: string,
  userAnswer: string,
  level: string,
): Promise<{ ok: boolean; feedback: string }> {
  try {
    const content = await chat([
      {
        role: 'system',
        content:
          'You are a precise bilingual lexicographer. Determine if the learner translation has the SAME MEANING as the expected one, allowing close synonyms, common paraphrases, and inflected forms. Be strict about direction and meaning, but tolerant about morphology and case. Respond with compact JSON: {"ok": true|false, "feedback": "one short hint"}.',
      },
      {
        role: 'user',
        content: `Goal language level: ${level}.\nCheck if learner translated a single word correctly by meaning.\nFrom (${fromLang}) word: ${sourceWord}\nTo (${toLang}) EXPECTED: ${expected}\nLearner ANSWER: ${userAnswer}`,
      },
    ]);
    const parsed = safeParseJson(content);
    if (typeof parsed?.ok === 'boolean' && typeof parsed?.feedback === 'string') {
      return { ok: parsed.ok, feedback: parsed.feedback.trim() };
    }
  } catch (e) {
    if (!(e instanceof LlmUnavailableError)) throw e;
  }

  // Fallback: old behavior — strict string check (this is also needed for your unit/e2e tests).
  const ok = expected.trim().toLowerCase() === userAnswer.trim().toLowerCase();
  return {
    ok,
    feedback: ok ? 'Looks fine.' : 'Consider a closer synonym.',
  };
}

function safeParseJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/{[sS]*}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[]]/g, '$&');
}

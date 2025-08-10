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
    const content = await chat(
      [
        {
          role: 'system',
          content:
            'You are a strict normalizer. Given a human language name, answer with a short code (2–4 letters). Prefer ISO 639-1 when obvious, else common 2–3 letter forms. Answer with the code ONLY.',
        },
        { role: 'user', content: langName },
      ],
      { temperature: 0 },
    );
    const code = content
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    return code || fallback;
  } catch (e) {
    if (e instanceof LlmUnavailableError) return fallback;
    return fallback;
  }
}

/** Auto-translate using LLM; returns null if LLM not available. */
export async function autoTranslate(text: string, fromLang: string, toLang: string): Promise<string | null> {
  try {
    const content = await chat(
      [
        {
          role: 'system',
          content:
            'You are a precise translator. Output only the translation with no quotes, no extra punctuation, no explanations.',
        },
        {
          role: 'user',
          content: `Translate from ${fromLang} to ${toLang}:nn${text}`,
        },
      ],
      { temperature: 0 },
    );
    return content.replace(/^["“”]+|["“”]+$/g, '').trim();
  } catch (e) {
    if (e instanceof LlmUnavailableError) return null;
    return null;
  }
}

/** Generate a short sentence that MUST include targetTerm. Falls back to a template if LLM is unavailable. */
export async function generateSentenceWithTerm(
  language: string,
  targetTerm: string,
  direction: 'goal' | 'native',
): Promise<string> {
  const fallback =
    direction === 'goal'
      ? `This simple sentence uses the word "${targetTerm}".`
      : `Це просте речення використовує слово "${targetTerm}".`;

  try {
    const content = await chat(
      [
        {
          role: 'system',
          content:
            'Write one short, natural sentence in the requested language. The sentence MUST include the given target term exactly once (or its inflected form), and should be simple for learners.',
        },
        {
          role: 'user',
          content: `Language: ${language}nTarget term to include: ${targetTerm}nLength: 5–12 words.`,
        },
      ],
      { temperature: 0.5 },
    );
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
  mustContain?: string,
): Promise<{ ok: boolean; feedback: string }> {
  // basic quick check: if mustContain is provided, enforce it first
  if (mustContain && !new RegExp(`b${escapeRegExp(mustContain)}b`, 'i').test(userAnswer)) {
    return {
      ok: false,
      feedback: `Your answer must include the word “${mustContain}”.`,
    };
  }

  try {
    const content = await chat(
      [
        {
          role: 'system',
          content:
            'You are a concise grader. Decide if the learner translation is acceptable. Minor grammar/spelling errors are OK. Respond with JSON: {"ok": true/false, "feedback": "one short sentence"}.',
        },
        {
          role: 'user',
          content: `Source (${fromLang}): ${source}nLearner answer (${toLang}): ${userAnswer}`,
        },
      ],
      { temperature: 0 },
    );
    const parsed = safeParseJson(content);
    if (typeof parsed?.ok === 'boolean' && typeof parsed?.feedback === 'string') {
      return { ok: parsed.ok, feedback: parsed.feedback.trim() };
    }
  } catch {
    // fall through to heuristic
  }

  // Heuristic fallback: accept if non-empty and not identical to source
  const ok = userAnswer.trim().length > 0 && userAnswer.trim() !== source.trim();
  return {
    ok,
    feedback: ok ? 'Looks fine.' : 'That does not seem correct. Try again.',
  };
}

function safeParseJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    // attempt to extract JSON blob
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

/**

* Minimal OpenRouter client for chat completions.
* Gracefully no-ops if OPENROUTER_API_KEY is not set.
  */
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const DEFAULT_BASE = '[https://openrouter.ai/api/v1](https://openrouter.ai/api/v1)';
const DEFAULT_MODEL = 'gpt-5-mini';

export class LlmUnavailableError extends Error {}

export async function chat(messages: ChatMessage[], opts?: { model?: string; temperature?: number }): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new LlmUnavailableError('OPENROUTER_API_KEY is not set');

  const base = process.env.OPENROUTER_BASE || DEFAULT_BASE;
  const model = opts?.model || DEFAULT_MODEL;

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: opts?.temperature ?? 0,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('Empty completion from OpenRouter');
  return content.trim();
}

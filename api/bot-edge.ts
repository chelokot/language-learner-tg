export const config = { runtime: 'edge', regions: ['fra1', 'arn1'] } as const;

// Strategy: ultra-fast ACK on Edge, forward the update to the Node handler.
// This keeps DB and heavy deps in Node while reducing webhook latency.

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('ok');

  // Compute target: either explicit forward URL, or same host Node handler
  const url = new URL(req.url);
  const base = process.env.WEBHOOK_FORWARD_URL ?? `https://${url.host}`;
  const path = process.env.WEBHOOK_FORWARD_PATH ?? '/api/bot';
  const target = `${base}${path}`;

  // Read body and forward without awaiting (fire-and-forget)
  const body = await req.text();
  // Do not await; errors are swallowed so the ACK stays instant
  // noinspection ES6MissingAwait
  fetch(target, {
    method: 'POST',
    headers: { 'content-type': req.headers.get('content-type') ?? 'application/json' },
    body,
  }).catch(() => {});

  // Immediate ACK to Telegram
  return new Response('ok');
}

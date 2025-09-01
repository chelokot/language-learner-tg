import { execFile } from 'node:child_process';

export async function runMigrations() {
  await new Promise<void>((resolve, reject) => {
    execFile('graphile-migrate', ['migrate'], err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function registerWebhook(
  token: string,
  baseUrl: string,
  pathOrFetch?: string | typeof fetch,
  maybeFetch?: typeof fetch,
) {
  let path = '/api/bot';
  let fetchFn: typeof fetch = fetch;
  if (typeof pathOrFetch === 'function') {
    fetchFn = pathOrFetch;
  } else if (typeof pathOrFetch === 'string') {
    path = pathOrFetch;
    if (maybeFetch) fetchFn = maybeFetch;
  }
  const url = `https://api.telegram.org/bot${token}/setWebhook?url=${baseUrl}${path}`;
  const res = await fetchFn(url);
  if (!('ok' in res)) {
    throw new Error('Unexpected fetch implementation');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook setup failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) {
    throw new Error(`Webhook setup failed: ${data.description ?? 'unknown error'}`);
  }
}

export const runtime = 'edge' as const;
export const config = { runtime: 'edge', regions: ['fra1'] } as const;

export default async function ping(_req: Request): Promise<Response> {
  const body = JSON.stringify({ ok: true, edgeRuntime: String((globalThis as any).EdgeRuntime || '') });
  return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
}


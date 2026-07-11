export const config = { runtime: 'edge' };

const ALLOWED = [
  'https://denrod25-del.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function cors(req) {
  const origin = req.headers.get('origin') || '';
  return {
    'access-control-allow-origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'origin',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: cors(req) });

  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'ASSEMBLYAI_API_KEY not set' }), {
      status: 500, headers: { 'content-type': 'application/json', ...cors(req) },
    });
  }

  const upstream = await fetch(
    'https://streaming.assemblyai.com/v3/token?expires_in_seconds=60',
    { headers: { authorization: key } },
  );

  if (!upstream.ok) {
    const detail = await upstream.text();
    return new Response(JSON.stringify({ error: 'Token mint failed', detail }), {
      status: 502, headers: { 'content-type': 'application/json', ...cors(req) },
    });
  }

  const { token } = await upstream.json();
  return new Response(JSON.stringify({ token }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(req) },
  });
}

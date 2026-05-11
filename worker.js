/* Aegir·Intel Worker — Static assets + API proxy + KV shared storage */

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

// ===== API Proxy (BCB, FRED, etc.) =====
async function handleProxy(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) return json({ error: 'Missing url param' }, 400);
  try {
    const resp = await fetch(target, { headers: { 'Accept': 'application/json' } });
    const body = await resp.text();
    return new Response(body, { status: resp.status, headers: { 'Content-Type': 'application/json', ...CORS } });
  } catch (e) { return json({ error: e.message }, 502); }
}

// ===== KV Shared Data API =====
async function handleKV(request, env, path, method) {
  const KV = env.AEGIR_KV;
  if (!KV) return json({ error: 'KV not configured' }, 500);

  // GET /api/data — list all shared keys
  if (path === '/api/data' && method === 'GET') {
    const list = await KV.list();
    const result = {};
    for (const key of list.keys) {
      const val = await KV.get(key.name, 'json');
      result[key.name] = val;
    }
    return json(result);
  }

  // GET /api/data/:key — get a specific key
  if (path.startsWith('/api/data/') && method === 'GET') {
    const key = decodeURIComponent(path.slice('/api/data/'.length));
    const val = await KV.get(key, 'json');
    if (val === null) return json({ error: 'Not found' }, 404);
    return json(val);
  }

  // PUT /api/data/:key — save a key
  if (path.startsWith('/api/data/') && method === 'PUT') {
    const key = decodeURIComponent(path.slice('/api/data/'.length));
    const body = await request.json();
    await KV.put(key, JSON.stringify(body));
    return json({ ok: true, key });
  }

  // DELETE /api/data/:key — delete a key
  if (path.startsWith('/api/data/') && method === 'DELETE') {
    const key = decodeURIComponent(path.slice('/api/data/'.length));
    await KV.delete(key);
    return json({ ok: true });
  }

  // POST /api/sync — bulk save (receives { key: value, key2: value2, ... })
  if (path === '/api/sync' && method === 'POST') {
    const body = await request.json();
    const keys = Object.keys(body);
    for (const key of keys) {
      await KV.put(key, JSON.stringify(body[key]));
    }
    return json({ ok: true, synced: keys.length });
  }

  return json({ error: 'Not found' }, 404);
}

// ===== Main Handler =====
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    // Cloudflare internal
    if (url.pathname.startsWith('/cdn-cgi/')) return new Response(null, { status: 404 });

    // API proxy
    if (url.pathname === '/api-proxy') return handleProxy(request);

    // Shared data API
    if (url.pathname.startsWith('/api/')) return handleKV(request, env, url.pathname, method);

    // Static assets
    return env.ASSETS.fetch(request);
  },
};

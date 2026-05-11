async function handleProxy(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) return new Response('Missing url param', { status: 400 });
  try {
    const resp = await fetch(target, { headers: { 'Accept': 'application/json' } });
    const body = await resp.text();
    return new Response(body, { status: resp.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 502 }); }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/cdn-cgi/')) return new Response(null, { status: 404 });
    if (url.pathname === '/api-proxy') return handleProxy(request);
    return env.ASSETS.fetch(request);
  },
};

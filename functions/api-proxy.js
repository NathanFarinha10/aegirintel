// Cloudflare Pages Function: serverless proxy for BCB, FRED, Finnhub
// URL: /api-proxy?source=bcb&code=432&last=24

const ALLOWED_SOURCES = {
  bcb: {
    buildUrl: (params) => {
      const code = params.code;
      const last = params.last || 24;
      if (!code) throw new Error('Missing code parameter');
      return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/${last}?formato=json`;
    },
    buildFallbackUrl: (params) => {
      const code = params.code;
      if (!code) return null;
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - (parseInt(params.last) || 24));
      const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`;
    },
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'AegirIntel/1.0 (financial research platform)',
    },
  },
  bcb_olinda: {
    buildUrl: (params) => {
      const code = params.code;
      if (!code) throw new Error('Missing code parameter');
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - (parseInt(params.last) || 24));
      const fmtISO = (d) => d.toISOString().split('T')[0];
      return `https://olinda.bcb.gov.br/olinda/servico/SerieTemporalDadosAbertos/versao/v1/odata/SerieTemporalDadosAbertos(SERCODIGO='${code}')?$filter=VALDATA ge '${fmtISO(start)}' and VALDATA le '${fmtISO(end)}'&$format=json&$orderby=VALDATA asc&$top=${parseInt(params.last) || 60}`;
    },
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'AegirIntel/1.0',
    },
  },
  fred: {
    buildUrl: (params) => {
      const { series_id, api_key, limit, observation_start } = params;
      if (!series_id || !api_key) throw new Error('Missing series_id or api_key');
      let url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&api_key=${api_key}&file_type=json&sort_order=desc`;
      if (limit) url += `&limit=${limit}`;
      if (observation_start) url += `&observation_start=${observation_start}`;
      return url;
    },
    headers: { 'Accept': 'application/json' },
  },
  finnhub_calendar: {
    buildUrl: (params) => {
      const { token } = params;
      if (!token) throw new Error('Missing token');
      const now = new Date();
      const from = params.from || new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
      const to = params.to || new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];
      return `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${token}`;
    },
    headers: { 'Accept': 'application/json' },
  },
};

async function fetchUpstream(url, headers) {
  const res = await fetch(url, { headers });
  return res;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const source = url.searchParams.get('source');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!source || !ALLOWED_SOURCES[source]) {
    return new Response(
      JSON.stringify({ error: `Invalid source. Use: ${Object.keys(ALLOWED_SOURCES).join(', ')}` }),
      { status: 400, headers: corsHeaders }
    );
  }

  const params = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'source') params[key] = value;
  }

  const sourceConfig = ALLOWED_SOURCES[source];

  // Try primary URL
  try {
    const targetUrl = sourceConfig.buildUrl(params);
    const response = await fetchUpstream(targetUrl, sourceConfig.headers || {});

    if (response.ok) {
      const data = await response.text();
      return new Response(data, {
        status: 200,
        headers: { ...corsHeaders, 'X-Proxy-Source': source, 'X-Proxy-Attempt': 'primary' },
      });
    }

    // If primary failed and there's a fallback, try it
    if (sourceConfig.buildFallbackUrl) {
      const fallbackUrl = sourceConfig.buildFallbackUrl(params);
      if (fallbackUrl) {
        const fbRes = await fetchUpstream(fallbackUrl, sourceConfig.headers || {});
        if (fbRes.ok) {
          const data = await fbRes.text();
          return new Response(data, {
            status: 200,
            headers: { ...corsHeaders, 'X-Proxy-Source': source, 'X-Proxy-Attempt': 'fallback' },
          });
        }
      }
    }

    const errorText = await response.text();
    return new Response(
      JSON.stringify({ error: `Upstream ${source} returned ${response.status}`, detail: errorText.substring(0, 500) }),
      { status: response.status, headers: corsHeaders }
    );
  } catch (err) {
    // Try fallback on error
    if (sourceConfig.buildFallbackUrl) {
      try {
        const fallbackUrl = sourceConfig.buildFallbackUrl(params);
        if (fallbackUrl) {
          const fbRes = await fetchUpstream(fallbackUrl, sourceConfig.headers || {});
          if (fbRes.ok) {
            const data = await fbRes.text();
            return new Response(data, {
              status: 200,
              headers: { ...corsHeaders, 'X-Proxy-Source': source, 'X-Proxy-Attempt': 'fallback-after-error' },
            });
          }
        }
      } catch (fbErr) {
        // both failed
      }
    }

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

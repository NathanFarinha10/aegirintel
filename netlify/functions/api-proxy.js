// Netlify Function: serverless proxy for BCB and FRED APIs
// Bypasses CORS restrictions by fetching server-side
// Endpoint: /.netlify/functions/api-proxy?source=bcb&code=432&last=24
//           /.netlify/functions/api-proxy?source=fred&series_id=DGS10&api_key=xxx&limit=60

const ALLOWED_SOURCES = {
  bcb: {
    baseUrl: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs',
    buildUrl: (params) => {
      const code = params.code;
      const last = params.last || 24;
      if (!code) throw new Error('Missing code parameter');
      return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/${last}?formato=json`;
    },
  },
  fred: {
    baseUrl: 'https://api.stlouisfed.org/fred/series/observations',
    buildUrl: (params) => {
      const { series_id, api_key, limit, observation_start } = params;
      if (!series_id || !api_key) throw new Error('Missing series_id or api_key');
      let url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&api_key=${api_key}&file_type=json&sort_order=desc`;
      if (limit) url += `&limit=${limit}`;
      if (observation_start) url += `&observation_start=${observation_start}`;
      return url;
    },
  },
  finnhub_calendar: {
    baseUrl: 'https://finnhub.io/api/v1/calendar/economic',
    buildUrl: (params) => {
      const { token } = params;
      if (!token) throw new Error('Missing token');
      // from/to are optional, default to ±14 days
      const now = new Date();
      const from = params.from || new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
      const to = params.to || new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];
      return `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${token}`;
    },
  },
};

export default async (req) => {
  const url = new URL(req.url);
  const source = url.searchParams.get('source');

  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 5 min cache
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (!source || !ALLOWED_SOURCES[source]) {
    return new Response(
      JSON.stringify({ error: `Invalid source. Use: ${Object.keys(ALLOWED_SOURCES).join(', ')}` }),
      { status: 400, headers }
    );
  }

  try {
    // Build params from query string
    const params = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== 'source') params[key] = value;
    }

    const targetUrl = ALLOWED_SOURCES[source].buildUrl(params);

    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Upstream ${source} returned ${response.status}`, detail: errorText.substring(0, 500) }),
        { status: response.status, headers }
      );
    }

    const data = await response.text();

    return new Response(data, {
      status: 200,
      headers: { ...headers, 'X-Proxy-Source': source },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/.netlify/functions/api-proxy",
};

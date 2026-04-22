
/* ============================================================
   15. SECURITIES (Finnhub integration)
   ============================================================ */

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const BRAPI_BASE = 'https://brapi.dev/api';

// In-memory cache for current session (avoid re-fetching same ticker)
const SEC_CACHE = {};

// Detect Brazilian tickers (PETR4, VALE3, ITUB4, MGLU3, BBAS3, etc)
// Pattern: 4 uppercase letters + 1-2 digits, optionally followed by F (for "Free Float") or .SA
function isBrazilianTicker(ticker) {
  const t = ticker.toUpperCase().replace(/\.SA$/i, '');
  return /^[A-Z]{4}\d{1,2}F?$/.test(t);
}

function normalizeBrTicker(ticker) {
  return ticker.toUpperCase().replace(/\.SA$/i, '');
}

async function finnhubFetch(endpoint, params = {}) {
  const key = DB.settings.finnhub_api_key;
  if (!key) throw new Error('Configure sua Finnhub API key em Settings primeiro');
  const queryParts = Object.entries({ ...params, token: key })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${FINNHUB_BASE}${endpoint}?${queryParts}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Finnhub API key inválida');
    if (res.status === 429) throw new Error('Limite de requisições atingido (60/min). Aguarde um momento.');
    if (res.status === 403) throw new Error('Dado não disponível no free tier');
    const text = await res.text();
    throw new Error(`Finnhub ${res.status}: ${text.substring(0, 150)}`);
  }
  return res.json();
}

async function brapiFetch(ticker, params = {}) {
  const key = DB.settings.brapi_api_key;
  const queryParts = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  let url = `${BRAPI_BASE}/quote/${encodeURIComponent(ticker)}`;
  if (queryParts) url += '?' + queryParts;
  const headers = { 'Accept': 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 402) {
      throw new Error('brapi requer token para esse ticker. Configure em Settings (free em brapi.dev/dashboard) — ou use PETR4, VALE3, ITUB4, MGLU3 sem token.');
    }
    throw new Error(`brapi ${res.status}: ${text.substring(0, 150)}`);
  }
  return res.json();
}

async function finnhubSearch(query) {
  if (!query.trim()) return [];
  const data = await finnhubFetch('/search', { q: query });
  return (data.result || [])
    .filter(r => r.type === 'Common Stock' || r.type === 'ETF' || r.type === 'ETP' || r.type === '')
    .slice(0, 15);
}

async function loadSecurityData(ticker) {
  ticker = ticker.toUpperCase();
  const isBR = isBrazilianTicker(ticker);

  // 5-minute cache per session
  const cached = SEC_CACHE[ticker];
  if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
    return cached.data;
  }

  let data;
  if (isBR) {
    data = await loadBrapiData(ticker);
  } else {
    data = await loadFinnhubData(ticker);
  }

  // Compute "is ETF" hint — used to switch the render path
  data.isETF = detectIsETF(data);

  SEC_CACHE[ticker] = { timestamp: Date.now(), data };
  return data;
}

function detectIsETF(data) {
  const t = (data.profile?.type || '').toUpperCase();
  if (t === 'ETP' || t === 'ETF' || t.includes('EXCHANGE TRADED')) return true;
  // Common ETF tickers
  const etfTickers = new Set(['SPY','QQQ','IVV','VOO','VTI','VEA','VWO','AGG','BND','GLD','SLV','TLT','IEF','EFA','EEM','DIA','IWM','XLK','XLF','XLE','XLV','XLI','XLP','XLY','XLU','XLB','XLRE','XLC']);
  if (etfTickers.has(data.ticker)) return true;
  // Absence of net margin + zero earnings metrics is a good heuristic
  const m = data.metrics?.metric;
  if (m && m.netProfitMarginTTM == null && m.peBasicExclExtraTTM == null && m['52WeekHigh'] != null) return true;
  return false;
}

async function loadFinnhubData(ticker) {
  const [profile, quote, metrics, recommendations, priceTarget, candles, news, peers] = await Promise.all([
    finnhubFetch('/stock/profile2', { symbol: ticker }).catch(e => { console.warn('profile2:', e); return {}; }),
    finnhubFetch('/quote', { symbol: ticker }).catch(e => { console.warn('quote:', e); return {}; }),
    finnhubFetch('/stock/metric', { symbol: ticker, metric: 'all' }).catch(e => { console.warn('metric:', e); return {}; }),
    finnhubFetch('/stock/recommendation', { symbol: ticker }).catch(e => { console.warn('recommendation:', e); return []; }),
    finnhubFetch('/stock/price-target', { symbol: ticker }).catch(e => { console.warn('price-target:', e); return {}; }),
    loadCandlesWithFallback(ticker, '1Y'),
    loadNews(ticker),
    finnhubFetch('/stock/peers', { symbol: ticker }).catch(() => []),
  ]);
  return { ticker, source: 'finnhub', profile, quote, metrics, recommendations, priceTarget, candles, news, peers };
}

async function loadBrapiData(ticker) {
  const brTicker = normalizeBrTicker(ticker);
  const main = await brapiFetch(brTicker, {
    range: '1y',
    interval: '1d',
    modules: 'summaryProfile,defaultKeyStatistics,financialData,incomeStatementHistory,balanceSheetHistory',
    dividends: 'true',
    fundamental: 'true',
  });

  const result = main.results?.[0] || {};
  const hist = result.historicalDataPrice || [];

  // Adapt brapi response to the same shape Finnhub produces
  const profile = {
    name: result.longName || result.shortName || brTicker,
    ticker: brTicker,
    currency: result.currency || 'BRL',
    exchange: 'B3',
    country: 'Brazil',
    finnhubIndustry: result.summaryProfile?.industry || result.summaryProfile?.sector || '—',
    marketCapitalization: result.marketCap ? result.marketCap / 1e6 : null, // Finnhub uses $M
    ipo: null,
    type: (result.longName || '').toUpperCase().includes('FUNDO') ? 'ETF' : 'Common Stock',
    webUrl: result.summaryProfile?.website,
  };

  const quote = {
    c: result.regularMarketPrice,
    d: result.regularMarketChange,
    dp: result.regularMarketChangePercent,
    h: result.regularMarketDayHigh,
    l: result.regularMarketDayLow,
    o: result.regularMarketOpen,
    pc: result.regularMarketPreviousClose,
  };

  // Adapt financialData and defaultKeyStatistics into Finnhub-style metrics.metric
  const fd = result.financialData || {};
  const stats = result.defaultKeyStatistics || {};
  const metrics = {
    metric: {
      '52WeekHigh': result.fiftyTwoWeekHigh,
      '52WeekLow': result.fiftyTwoWeekLow,
      beta: stats.beta,
      peBasicExclExtraTTM: result.priceEarnings || stats.trailingEps ? (result.regularMarketPrice / stats.trailingEps) : null,
      peTTM: result.priceEarnings,
      pbQuarterly: stats.priceToBook,
      psTTM: stats.priceToSalesTrailing12Months,
      dividendYieldIndicatedAnnual: stats.trailingAnnualDividendYield,
      grossMarginTTM: fd.grossMargins != null ? fd.grossMargins * 100 : null,
      operatingMarginTTM: fd.operatingMargins != null ? fd.operatingMargins * 100 : null,
      netProfitMarginTTM: fd.profitMargins != null ? fd.profitMargins * 100 : null,
      roeTTM: fd.returnOnEquity != null ? fd.returnOnEquity * 100 : null,
      roaTTM: fd.returnOnAssets != null ? fd.returnOnAssets * 100 : null,
      revenueGrowth5Y: null,
      revenueGrowthTTMYoy: fd.revenueGrowth != null ? fd.revenueGrowth * 100 : null,
      epsGrowth5Y: null,
      totalDebt_totalEquityQuarterly: fd.debtToEquity,
      currentRatioQuarterly: fd.currentRatio,
      quickRatioQuarterly: fd.quickRatio,
      fcfMarginTTM: null,
    },
  };

  // Transform historical prices into Finnhub candle shape
  const candles = hist.length > 0 ? {
    timestamps: hist.map(p => p.date),
    close: hist.map(p => p.close),
    high: hist.map(p => p.high),
    low: hist.map(p => p.low),
    open: hist.map(p => p.open),
    volume: hist.map(p => p.volume),
  } : null;

  return {
    ticker: brTicker,
    source: 'brapi',
    profile,
    quote,
    metrics,
    recommendations: [],
    priceTarget: {},
    candles,
    news: [],
    peers: [],
  };
}

// Yahoo Finance v8 chart API via multiple public CORS proxies as fallbacks.
// Chart endpoint is the most reliable Yahoo endpoint and these proxies are free/stable.
const YAHOO_PROXIES = [
  (yahooUrl) => `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
  (yahooUrl) => `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
  (yahooUrl) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`,
  (yahooUrl) => `https://cors.eu.org/${yahooUrl}`,
];

async function loadCandlesYahoo(ticker, range = '1Y') {
  const rangeMap = { '1M': '1mo', '6M': '6mo', '1Y': '1y', '5Y': '5y' };
  const yRange = rangeMap[range] || '1y';
  const interval = range === '5Y' ? '1wk' : range === '1M' ? '1d' : '1d';

  // If Brazilian and no .SA suffix, add it for Yahoo
  let yahooTicker = ticker;
  if (isBrazilianTicker(ticker) && !ticker.toUpperCase().endsWith('.SA')) {
    yahooTicker = normalizeBrTicker(ticker) + '.SA';
  }

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?range=${yRange}&interval=${interval}`;

  const errors = [];
  for (const makeProxyUrl of YAHOO_PROXIES) {
    try {
      const proxyUrl = makeProxyUrl(yahooUrl);
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        errors.push(`${res.status} via ${proxyUrl.split('?')[0]}`);
        continue;
      }
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (!result) {
        errors.push('no chart result');
        continue;
      }
      const q = result.indicators?.quote?.[0];
      if (!q || !q.close) {
        errors.push('no quote data');
        continue;
      }
      // Filter out nulls but keep alignment
      const validIdx = q.close.map((v, i) => v != null ? i : -1).filter(i => i >= 0);
      if (validIdx.length < 2) {
        errors.push('insufficient data');
        continue;
      }
      return {
        timestamps: validIdx.map(i => result.timestamp[i]),
        close:      validIdx.map(i => q.close[i]),
        high:       validIdx.map(i => q.high[i]),
        low:        validIdx.map(i => q.low[i]),
        open:       validIdx.map(i => q.open[i]),
        volume:     validIdx.map(i => q.volume[i]),
      };
    } catch (e) {
      errors.push(e.message);
    }
  }
  console.warn(`All Yahoo proxies failed for ${ticker}:`, errors);
  return null;
}

async function loadCandlesWithFallback(ticker, range = '1Y') {
  // Finnhub's /stock/candle was removed from free tier in 2024. Use Yahoo.
  return loadCandlesYahoo(ticker, range);
}

async function loadCandlesFinnhub(ticker, range = '1Y') {
  // Kept for legacy compatibility but returns null — Finnhub candle is paid now
  return null;
}

async function loadCandles(ticker, range = '1Y') {
  const isBR = isBrazilianTicker(ticker);
  if (isBR) {
    // Re-fetch brapi for a different range
    try {
      const res = await brapiFetch(normalizeBrTicker(ticker), {
        range: range === '1M' ? '1mo' : range === '6M' ? '6mo' : range === '5Y' ? '5y' : '1y',
        interval: range === '5Y' ? '1wk' : '1d',
      });
      const hist = res.results?.[0]?.historicalDataPrice || [];
      if (hist.length === 0) return null;
      return {
        timestamps: hist.map(p => p.date),
        close: hist.map(p => p.close),
        high: hist.map(p => p.high),
        low: hist.map(p => p.low),
        open: hist.map(p => p.open),
        volume: hist.map(p => p.volume),
      };
    } catch (e) {
      console.warn('brapi candles:', e);
      return null;
    }
  }
  return loadCandlesWithFallback(ticker, range);
}

async function loadNews(ticker) {
  const to = new Date().toISOString().split('T')[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 14);
  const from = fromDate.toISOString().split('T')[0];
  try {
    const data = await finnhubFetch('/company-news', { symbol: ticker, from, to });
    return (data || []).slice(0, 10);
  } catch (e) {
    return [];
  }
}

/* ---------- Watchlist helpers ---------- */

function getWatchlist() {
  if (!DB.watchlist) { DB.watchlist = []; saveDB(DB); }
  return DB.watchlist;
}

function addToWatchlist(ticker, name) {
  const wl = getWatchlist();
  if (wl.find(w => w.ticker === ticker)) return;
  wl.push({ ticker, name, added_at: new Date().toISOString() });
  saveDB(DB);
  showToast(`${ticker} adicionado à watchlist`);
}

function removeFromWatchlist(ticker) {
  DB.watchlist = getWatchlist().filter(w => w.ticker !== ticker);
  saveDB(DB);
  render();
}

function isInWatchlist(ticker) {
  return getWatchlist().some(w => w.ticker === ticker);
}

/* ---------- Proprietary rating calculation ---------- */

/* ---------- Automatic descriptive commentary (no AI) ---------- */

// Given a metric value, returns { tier: 'excellent'|'good'|'neutral'|'poor'|'bad', note: 'descrição' }
function interpretMetric(type, value) {
  if (value == null || isNaN(value)) return null;

  const band = (tiers) => {
    for (const t of tiers) {
      const match = t.cond(value);
      if (match) return { tier: t.tier, note: t.note };
    }
    return null;
  };

  const BANDS = {
    pe: [
      { cond: v => v < 0, tier: 'bad', note: 'P/E negativo indica prejuízo no período.' },
      { cond: v => v < 10, tier: 'excellent', note: 'Múltiplo baixo — tese de value ou mercado precificando risco.' },
      { cond: v => v < 20, tier: 'good', note: 'Múltiplo razoável em linha com mercado maduro.' },
      { cond: v => v < 30, tier: 'neutral', note: 'Múltiplo elevado — embute expectativa de crescimento.' },
      { cond: v => v < 50, tier: 'poor', note: 'Premium alto — crescimento precisa se materializar.' },
      { cond: v => v >= 50, tier: 'bad', note: 'Múltiplo muito elevado — sensibilidade alta a revisões.' },
    ],
    pb: [
      { cond: v => v < 1, tier: 'excellent', note: 'Abaixo do valor patrimonial — possível situação especial.' },
      { cond: v => v < 2, tier: 'good', note: 'Razoável em relação ao patrimônio líquido.' },
      { cond: v => v < 4, tier: 'neutral', note: 'Prêmio moderado sobre valor contábil.' },
      { cond: v => v >= 4, tier: 'poor', note: 'Premium alto — empresa cria valor sobre o patrimônio.' },
    ],
    dividendYield: [
      { cond: v => v >= 6, tier: 'excellent', note: 'Dividend yield elevado — forte para estratégia de renda.' },
      { cond: v => v >= 4, tier: 'good', note: 'Yield acima da média do mercado.' },
      { cond: v => v >= 2, tier: 'neutral', note: 'Yield moderado.' },
      { cond: v => v >= 0.5, tier: 'poor', note: 'Yield baixo — empresa reinveste lucros.' },
      { cond: v => v < 0.5, tier: 'bad', note: 'Yield quase inexistente ou empresa não paga dividendos.' },
    ],
    roe: [
      { cond: v => v >= 25, tier: 'excellent', note: 'ROE excepcional — alta eficiência na alocação de capital.' },
      { cond: v => v >= 15, tier: 'good', note: 'ROE sólido, acima da média do mercado.' },
      { cond: v => v >= 10, tier: 'neutral', note: 'ROE em linha com custo de capital típico.' },
      { cond: v => v >= 5, tier: 'poor', note: 'ROE baixo — retornos abaixo do custo de capital.' },
      { cond: v => v < 5, tier: 'bad', note: 'ROE muito baixo ou negativo.' },
    ],
    netMargin: [
      { cond: v => v >= 20, tier: 'excellent', note: 'Margem líquida elevada — modelo de negócio altamente escalável.' },
      { cond: v => v >= 10, tier: 'good', note: 'Margem líquida saudável.' },
      { cond: v => v >= 5, tier: 'neutral', note: 'Margem líquida moderada.' },
      { cond: v => v >= 0, tier: 'poor', note: 'Margem líquida estreita — sensível a custos.' },
      { cond: v => v < 0, tier: 'bad', note: 'Prejuízo líquido no período.' },
    ],
    debtEquity: [
      { cond: v => v < 0.3, tier: 'excellent', note: 'Alavancagem muito baixa — forte capacidade de pagamento.' },
      { cond: v => v < 0.7, tier: 'good', note: 'Alavancagem conservadora.' },
      { cond: v => v < 1.2, tier: 'neutral', note: 'Alavancagem moderada — dentro de padrões setoriais.' },
      { cond: v => v < 2, tier: 'poor', note: 'Alavancagem elevada — atenção em cenários de juros altos.' },
      { cond: v => v >= 2, tier: 'bad', note: 'Alavancagem agressiva — risco financeiro elevado.' },
    ],
    currentRatio: [
      { cond: v => v >= 2, tier: 'excellent', note: 'Liquidez corrente muito confortável.' },
      { cond: v => v >= 1.5, tier: 'good', note: 'Liquidez corrente adequada.' },
      { cond: v => v >= 1, tier: 'neutral', note: 'Ativos correntes cobrem passivos correntes.' },
      { cond: v => v < 1, tier: 'bad', note: 'Liquidez corrente abaixo de 1 — risco de curto prazo.' },
    ],
    beta: [
      { cond: v => v < 0.6, tier: 'good', note: 'Baixa correlação com mercado — ativo defensivo.' },
      { cond: v => v < 0.9, tier: 'good', note: 'Menos volátil que o mercado.' },
      { cond: v => v <= 1.1, tier: 'neutral', note: 'Volatilidade em linha com o mercado.' },
      { cond: v => v < 1.5, tier: 'poor', note: 'Mais volátil que o mercado — maior sensibilidade macro.' },
      { cond: v => v >= 1.5, tier: 'poor', note: 'Alta volatilidade — amplifica movimentos de mercado.' },
    ],
    revenueGrowth: [
      { cond: v => v >= 20, tier: 'excellent', note: 'Crescimento de receita expressivo.' },
      { cond: v => v >= 10, tier: 'good', note: 'Crescimento sólido acima da inflação.' },
      { cond: v => v >= 5, tier: 'neutral', note: 'Crescimento moderado.' },
      { cond: v => v >= 0, tier: 'poor', note: 'Crescimento mínimo — empresa em maturação.' },
      { cond: v => v < 0, tier: 'bad', note: 'Receita em contração.' },
    ],
    upside: [
      { cond: v => v >= 25, tier: 'excellent', note: 'Alto upside implícito no consenso de analistas.' },
      { cond: v => v >= 10, tier: 'good', note: 'Upside positivo moderado.' },
      { cond: v => v >= -5, tier: 'neutral', note: 'Preço próximo ao target médio de analistas.' },
      { cond: v => v >= -15, tier: 'poor', note: 'Cotação acima do target — possível sobrevalorização.' },
      { cond: v => v < -15, tier: 'bad', note: 'Cotação significativamente acima do target de consenso.' },
    ],
  };

  return band(BANDS[type] || []);
}

// Generate an automatic descriptive summary of key metrics (in Portuguese)
function generateDescriptiveCommentary(data, rating) {
  const m = data.metrics?.metric || {};
  const profile = data.profile || {};
  const quote = data.quote || {};
  const sections = [];

  // Valuation section
  const peVal = m.peBasicExclExtraTTM || m.peTTM;
  const pbVal = m.pbQuarterly || m.pbAnnual;
  const psVal = m.psTTM || m.psAnnual;
  const divY = m.dividendYieldIndicatedAnnual;
  const divYPct = divY != null ? (divY > 1 ? divY : divY * 100) : null;
  const valBits = [];
  if (peVal != null) { const x = interpretMetric('pe', peVal); if (x) valBits.push({ label: `P/E de ${peVal.toFixed(1)}`, note: x.note, tier: x.tier }); }
  if (pbVal != null) { const x = interpretMetric('pb', pbVal); if (x) valBits.push({ label: `P/B de ${pbVal.toFixed(2)}`, note: x.note, tier: x.tier }); }
  if (divYPct != null) { const x = interpretMetric('dividendYield', divYPct); if (x) valBits.push({ label: `Dividend Yield de ${divYPct.toFixed(2)}%`, note: x.note, tier: x.tier }); }
  if (valBits.length) sections.push({ title: 'Valuation', items: valBits });

  // Profitability
  const profBits = [];
  if (m.roeTTM != null) { const x = interpretMetric('roe', m.roeTTM); if (x) profBits.push({ label: `ROE de ${m.roeTTM.toFixed(1)}%`, note: x.note, tier: x.tier }); }
  if (m.netProfitMarginTTM != null) { const x = interpretMetric('netMargin', m.netProfitMarginTTM); if (x) profBits.push({ label: `Margem líquida de ${m.netProfitMarginTTM.toFixed(1)}%`, note: x.note, tier: x.tier }); }
  if (profBits.length) sections.push({ title: 'Rentabilidade', items: profBits });

  // Growth
  const growthBits = [];
  const revGrowth = m.revenueGrowth5Y || m.revenueGrowthTTMYoy;
  if (revGrowth != null) { const x = interpretMetric('revenueGrowth', revGrowth); if (x) growthBits.push({ label: `Crescimento de receita de ${revGrowth.toFixed(1)}%`, note: x.note, tier: x.tier }); }
  if (growthBits.length) sections.push({ title: 'Crescimento', items: growthBits });

  // Financial health / Credit
  const healthBits = [];
  const de = m.totalDebt_totalEquityQuarterly || m.totalDebt_totalEquityAnnual;
  if (de != null) { const x = interpretMetric('debtEquity', de); if (x) healthBits.push({ label: `Debt/Equity de ${de.toFixed(2)}`, note: x.note, tier: x.tier }); }
  const cr = m.currentRatioQuarterly || m.currentRatioAnnual;
  if (cr != null) { const x = interpretMetric('currentRatio', cr); if (x) healthBits.push({ label: `Current Ratio de ${cr.toFixed(2)}`, note: x.note, tier: x.tier }); }
  if (healthBits.length) sections.push({ title: 'Saúde Financeira', items: healthBits });

  // Risk / Market sensitivity
  const riskBits = [];
  if (m.beta != null) { const x = interpretMetric('beta', m.beta); if (x) riskBits.push({ label: `Beta de ${m.beta.toFixed(2)}`, note: x.note, tier: x.tier }); }
  // Distance from 52W high/low
  if (m['52WeekHigh'] && quote.c) {
    const dist = ((quote.c - m['52WeekHigh']) / m['52WeekHigh']) * 100;
    if (dist < -15) riskBits.push({ label: `Cotação ${Math.abs(dist).toFixed(1)}% abaixo da máxima de 52 semanas`, note: 'Possível entrada de valor ou sinal de deterioração — depende do contexto.', tier: 'neutral' });
    else if (dist > -3) riskBits.push({ label: `Cotação próxima da máxima de 52 semanas`, note: 'Momento de preço forte, atenção a possível extensão.', tier: 'neutral' });
  }
  if (riskBits.length) sections.push({ title: 'Risco e Preço', items: riskBits });

  // Overall
  let overall = null;
  if (rating?.score != null) {
    const s = rating.score;
    if (s >= 80) overall = `Composição fundamentalista forte (rating ${s}/100) — combinação de rentabilidade, valuation e saúde financeira em patamar superior.`;
    else if (s >= 65) overall = `Perfil sólido (rating ${s}/100) com fundamentals em patamar positivo.`;
    else if (s >= 50) overall = `Perfil balanceado (rating ${s}/100) — trade-offs entre crescimento, valuation e risco.`;
    else if (s >= 35) overall = `Perfil desafiador (rating ${s}/100) — fundamentals indicam cautela ou tese precisa amadurecer.`;
    else overall = `Fundamentals frágeis (rating ${s}/100) — riscos dominam o quadro atual.`;
  }

  return { sections, overall };
}

// ETF-specific commentary
function generateETFCommentary(data) {
  const m = data.metrics?.metric || {};
  const quote = data.quote || {};
  const items = [];

  if (m['52WeekHigh'] && m['52WeekLow']) {
    const rangePct = ((m['52WeekHigh'] - m['52WeekLow']) / m['52WeekLow']) * 100;
    items.push({
      label: `Range de 52 semanas: ${rangePct.toFixed(1)}%`,
      note: rangePct < 20 ? 'Baixa volatilidade — comportamento defensivo.' :
            rangePct < 40 ? 'Volatilidade moderada.' :
            'Volatilidade elevada — típico de setoriais ou temáticos.',
      tier: rangePct < 20 ? 'good' : rangePct < 40 ? 'neutral' : 'poor',
    });
  }

  if (m.beta != null) {
    const x = interpretMetric('beta', m.beta);
    if (x) items.push({ label: `Beta de ${m.beta.toFixed(2)}`, note: x.note, tier: x.tier });
  }

  if (m.dividendYieldIndicatedAnnual != null) {
    const dy = m.dividendYieldIndicatedAnnual > 1 ? m.dividendYieldIndicatedAnnual : m.dividendYieldIndicatedAnnual * 100;
    const x = interpretMetric('dividendYield', dy);
    if (x) items.push({ label: `Distribuição de ${dy.toFixed(2)}%`, note: x.note, tier: x.tier });
  }

  if (quote.c && m['52WeekHigh']) {
    const distHigh = ((quote.c - m['52WeekHigh']) / m['52WeekHigh']) * 100;
    if (distHigh < -10) items.push({ label: `${Math.abs(distHigh).toFixed(1)}% abaixo da máxima de 52s`, note: 'ETF em correção — avaliar contexto do underlying.', tier: 'neutral' });
  }

  return { sections: items.length ? [{ title: 'Análise do ETF', items }] : [], overall: null };
}

function renderDescriptiveCommentary(commentary) {
  if (!commentary || !commentary.sections.length) return null;

  const tierColor = {
    excellent: 'var(--green)',
    good: '#a5b87a',
    neutral: 'var(--text-muted)',
    poor: 'var(--orange)',
    bad: 'var(--red)',
  };

  return h('div', { class: 'portfolio-card', style: { padding: '22px 26px' } }, [
    commentary.overall && h('div', {
      style: {
        fontFamily: 'Fraunces, serif',
        fontSize: '14px',
        lineHeight: '1.7',
        color: 'var(--text-2)',
        paddingBottom: '16px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border)',
        fontStyle: 'italic',
      }
    }, commentary.overall),

    ...commentary.sections.map(section => h('div', { style: { marginBottom: '14px' } }, [
      h('div', {
        style: {
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'var(--amber)',
          marginBottom: '8px',
        }
      }, section.title),
      ...section.items.map(it => h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '200px 1fr',
          gap: '14px',
          padding: '6px 0',
          fontSize: '12px',
          borderBottom: '1px dashed var(--border)',
        }
      }, [
        h('div', { style: { color: tierColor[it.tier] || 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' } }, it.label),
        h('div', { style: { color: 'var(--text-2)', lineHeight: '1.5' } }, it.note),
      ])),
    ])),
  ]);
}

function computeProprietaryRating(m) {
  // m is the Finnhub metrics object
  if (!m || !m.metric) return { score: null, breakdown: [] };
  const mm = m.metric;

  // Score each factor 0-100
  // Valuation (30%): lower multiples = higher score
  const pe = mm.peBasicExclExtraTTM || mm.peTTM || mm.peNormalizedAnnual;
  const valScore = pe == null ? 50 :
    pe < 0 ? 30 :        // unprofitable
    pe < 10 ? 90 :
    pe < 15 ? 80 :
    pe < 20 ? 70 :
    pe < 30 ? 55 :
    pe < 50 ? 40 : 25;

  // Growth (25%): revenue growth
  const revGrowth = mm.revenueGrowth5Y || mm.revenueGrowthTTMYoy || 0;
  const growthScore = revGrowth == null ? 50 :
    revGrowth > 20 ? 95 :
    revGrowth > 15 ? 85 :
    revGrowth > 10 ? 75 :
    revGrowth > 5 ? 60 :
    revGrowth > 0 ? 45 : 25;

  // Profitability (25%): ROE + margins
  const roe = mm.roeTTM || mm.roeRfy || 0;
  const netMargin = mm.netProfitMarginTTM || 0;
  const profScoreRoe = roe == null ? 50 :
    roe > 25 ? 95 :
    roe > 20 ? 85 :
    roe > 15 ? 75 :
    roe > 10 ? 65 :
    roe > 5 ? 50 : 30;
  const profScoreMargin = netMargin == null ? 50 :
    netMargin > 20 ? 90 :
    netMargin > 15 ? 80 :
    netMargin > 10 ? 70 :
    netMargin > 5 ? 55 :
    netMargin > 0 ? 40 : 20;
  const profScore = (profScoreRoe + profScoreMargin) / 2;

  // Financial Health (20%): debt/equity + current ratio
  const de = mm.totalDebt_totalEquityQuarterly || mm.totalDebt_totalEquityAnnual || 0;
  const current = mm.currentRatioQuarterly || mm.currentRatioAnnual || 1;
  const healthScoreDE = de == null ? 50 :
    de < 0.3 ? 95 :
    de < 0.5 ? 85 :
    de < 1.0 ? 70 :
    de < 1.5 ? 55 :
    de < 2.5 ? 40 : 20;
  const healthScoreCR = current == null ? 50 :
    current > 2 ? 90 :
    current > 1.5 ? 80 :
    current > 1.2 ? 70 :
    current > 1 ? 55 : 30;
  const healthScore = (healthScoreDE + healthScoreCR) / 2;

  const weighted = valScore * 0.30 + growthScore * 0.25 + profScore * 0.25 + healthScore * 0.20;

  return {
    score: Math.round(weighted),
    breakdown: [
      { label: 'Valuation',           score: Math.round(valScore),    weight: 30 },
      { label: 'Growth',              score: Math.round(growthScore), weight: 25 },
      { label: 'Profitability',       score: Math.round(profScore),   weight: 25 },
      { label: 'Financial Health',    score: Math.round(healthScore), weight: 20 },
    ],
  };
}

function ratingLabel(score) {
  if (score == null) return 'N/A';
  if (score >= 80) return 'Strong Buy';
  if (score >= 65) return 'Buy';
  if (score >= 50) return 'Hold';
  if (score >= 35) return 'Underperform';
  return 'Sell';
}

function ratingColor(score) {
  if (score == null) return 'var(--text-muted)';
  if (score >= 65) return 'var(--green)';
  if (score >= 50) return 'var(--orange)';
  return 'var(--red)';
}

/* ---------- Render: Search page ---------- */

function renderSecSearch() {
  if (!DB.settings.finnhub_api_key) {
    return h('div', { class: 'content fade-up' }, [
      pageHead('Securities · Search', 'Buscar <em>Ativo</em>',
        'Configure sua Finnhub API key em <span class="mono-hi">Settings (⚙)</span> para habilitar a busca de ativos.'),
      h('div', { class: 'empty' }, [
        h('div', { class: 'empty-title' }, 'API Key necessária'),
        h('p', { class: 'empty-desc', html: 'A busca de ações, ETFs e índices requer a Finnhub API key. É gratuita e leva 2 minutos: crie em <strong>finnhub.io/register</strong>, copie a key e cole em Settings.' }),
        h('button', { class: 'btn-secondary', onClick: () => setModal('settings') }, 'Abrir Settings'),
      ]),
    ]);
  }

  const query = state._sec_query || '';
  const results = state._sec_results || [];
  const searching = state._sec_searching || false;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Securities · Search', 'Buscar <em>Ativo</em>',
      'Digite o ticker ou o nome da empresa. Suporta ações, ETFs e índices (mercados globais com foco em US).'),

    h('div', { class: 'sec-search-hero' }, [
      h('div', { class: 'sec-search-box' }, [
        h('span', { class: 'search-icon', style: { fontSize: '20px' } }, '⌕'),
        h('input', {
          type: 'text',
          placeholder: 'Ex: AAPL, Apple, SPY, Microsoft...',
          value: query,
          oninput: (e) => {
            state._sec_query = e.target.value;
            clearTimeout(window._secSearchTimer);
            window._secSearchTimer = setTimeout(() => runSecSearch(e.target.value), 400);
          },
        }),
        searching && h('span', { style: { color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' } }, 'buscando…'),
      ]),
      h('div', { class: 'sec-search-hint', html:
        'Sugestões: <code>AAPL</code> Apple, <code>MSFT</code> Microsoft, <code>SPY</code> S&P 500 ETF, <code>QQQ</code> Nasdaq ETF, <code>BRK.B</code> Berkshire, <code>VALE</code>, <code>PETR4.SA</code> (Bovespa com .SA)'
      }),
    ]),

    results.length > 0 && h('div', { class: 'sec-search-results' }, results.map(r =>
      h('div', {
        class: 'sec-search-result',
        onClick: () => { state._sec_query = ''; state._sec_results = []; setDetail('security', r.symbol); },
      }, [
        h('div', { class: 'sec-ticker' }, r.symbol),
        h('div', {}, [
          h('div', { class: 'sec-name' }, r.description || ''),
          h('div', { class: 'sec-exchange' }, `${r.type || 'Common Stock'} · ${r.displaySymbol || r.symbol}`),
        ]),
        h('div', { style: { fontSize: '18px', color: 'var(--amber)' } }, '→'),
      ])
    )),

    // Popular quick-access
    results.length === 0 && !query && h('div', { style: { marginTop: '24px' } }, [
      sectionHead('01', 'Acesso Rápido', 'Ativos populares para começar'),
      h('div', { class: 'watchlist-grid' },
        ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA', 'AMZN', 'SPY', 'QQQ'].map(t =>
          h('button', {
            class: 'watchlist-card',
            onClick: () => setDetail('security', t),
          }, [
            h('div', { class: 'watchlist-ticker' }, t),
            h('div', { class: 'watchlist-name' }, '—'),
          ])
        )
      ),
    ]),
  ]);
}

async function runSecSearch(query) {
  if (!query.trim()) {
    state._sec_results = [];
    state._sec_searching = false;
    render();
    return;
  }
  state._sec_searching = true;
  render();
  try {
    const results = await finnhubSearch(query);
    state._sec_results = results;
  } catch (err) {
    state._sec_results = [];
    showToast(err.message, true);
  } finally {
    state._sec_searching = false;
    render();
  }
}

/* ---------- Render: Security detail page ---------- */

function renderCommentary(label, lines) {
  if (!lines || lines.length === 0) return null;
  return h('div', { class: 'sec-commentary' }, [
    h('div', { class: 'sec-commentary-label' }, label),
    h('ul', {}, lines.map(line => h('li', {}, line))),
  ]);
}

// ETFs need completely different analysis than stocks — use dedicated render path
function renderETFDetail(data) {
  const { ticker, profile, quote, metrics, candles, news } = data;
  const m = metrics.metric || {};
  const change = quote.d || 0;
  const changePct = quote.dp || 0;
  const priceColor = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const geminiAnalysis = state._sec_gemini?.[ticker];
  const geminiLoading = state._sec_gemini_loading?.[ticker];

  const dy = getMetric(m, 'dividendYieldIndicatedAnnual', 'currentDividendYieldTTM', 'dividendYield5Y');
  const yearHigh = getMetric(m, '52WeekHigh');
  const yearLow = getMetric(m, '52WeekLow');
  const priceRelReturn = getMetric(m, 'priceRelativeToS&P50052Week', 'priceRelativeToSP50052Week');
  const return1Y  = getMetric(m, '52WeekPriceReturnDaily', 'yearToDatePriceReturnDaily');
  const return3M  = getMetric(m, '13WeekPriceReturnDaily');
  const return1M  = getMetric(m, '5DayPriceReturnDaily', 'monthToDatePriceReturnDaily');
  const beta = getMetric(m, 'beta');

  return h('div', { class: 'content fade-up' }, [
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      h('button', { class: 'back-btn', style: { margin: '0' }, onClick: clearDetail }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', {
          class: 'btn-secondary',
          onClick: () => {
            if (isInWatchlist(ticker)) removeFromWatchlist(ticker);
            else { addToWatchlist(ticker, profile.name || ticker); render(); }
          },
        }, isInWatchlist(ticker) ? '★ Na watchlist' : '☆ Adicionar à watchlist'),
        h('button', {
          class: 'btn-secondary',
          onClick: () => generateSecurityReport(data, { score: null, breakdown: [] }, geminiAnalysis),
        }, 'Gerar PDF do ativo'),
      ]),
    ]),

    // Header
    h('div', { class: 'sec-detail-head' }, [
      h('div', {}, [
        h('div', { class: 'sec-detail-ticker' }, [
          ticker,
          h('span', { class: 'etf-type-badge' }, 'ETF'),
        ]),
        h('div', { class: 'sec-detail-name' }, profile.name || ticker),
        h('div', { class: 'sec-detail-meta' }, [
          profile.finnhubIndustry && h('span', { class: 'badge' }, profile.finnhubIndustry),
          profile.country && h('span', { class: 'badge' }, profile.country),
          profile.exchange && h('span', { class: 'badge' }, profile.exchange),
          profile.marketCapitalization && h('span', { class: 'badge' }, `AUM ${formatMoney(profile.marketCapitalization * 1e6)}`),
        ]),
      ]),
      h('div', { class: 'sec-price-box' }, [
        h('div', { class: 'sec-price-current' }, formatCurrency(quote.c, profile.currency)),
        h('div', { class: `sec-price-change ${priceColor}` },
          `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`),
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '8px' } },
          `O: ${formatCurrency(quote.o, profile.currency)} · H: ${formatCurrency(quote.h, profile.currency)} · L: ${formatCurrency(quote.l, profile.currency)}`),
      ]),
    ]),

    // Section 1: Snapshot + Chart
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 01'),
        h('h2', { class: 'sec-section-title' }, 'Snapshot'),
      ]),
      h('div', { class: 'sec-metrics-grid', style: { marginBottom: '16px' } }, [
        renderSecMetric('Prev Close',  formatCurrency(quote.pc, profile.currency), null),
        renderSecMetric('52W High',    formatCurrency(yearHigh, profile.currency), null),
        renderSecMetric('52W Low',     formatCurrency(yearLow, profile.currency), null),
        renderSecMetric('Beta',        beta != null ? beta.toFixed(2) : '—', 'vs S&P 500'),
      ]),
      renderSecChart(ticker, candles),
    ]),

    // Section 2: ETF Characteristics
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 02'),
        h('h2', { class: 'sec-section-title' }, 'Características do ETF'),
      ]),
      h('div', { class: 'sec-metrics-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1px' } }, [
        renderSecMetric('AUM', profile.marketCapitalization ? formatMoney(profile.marketCapitalization * 1e6) : '—', 'Assets under management'),
        renderSecMetric('Dividend Yield', dy != null ? (dy * 100).toFixed(2) + '%' : '—', 'Anual indicativo'),
        renderSecMetric('Exchange', profile.exchange || '—', null),
        renderSecMetric('Moeda Base', profile.currency || '—', null),
      ]),
      renderCommentary('Notas sobre o ETF', analyzeETF(data)),
      h('div', { style: { marginTop: '12px', padding: '12px 16px', background: 'var(--bg-2)', border: '1px dashed var(--border)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'Fraunces, serif' } },
        'Nota: Expense ratio e composição por holdings não estão disponíveis no free tier do Finnhub. Consulte o prospecto do ETF no site do emissor (ex: iShares, Vanguard, SPDR) para detalhes de custos e carteira.'),
    ]),

    // Section 3: Performance
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 03'),
        h('h2', { class: 'sec-section-title' }, 'Performance'),
      ]),
      h('div', { class: 'sec-metrics-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)' } }, [
        renderSecMetric('Retorno 1M',  return1M != null ? `${return1M >= 0 ? '+' : ''}${return1M.toFixed(2)}%` : '—', null),
        renderSecMetric('Retorno 3M',  return3M != null ? `${return3M >= 0 ? '+' : ''}${return3M.toFixed(2)}%` : '—', null),
        renderSecMetric('Retorno 52W', return1Y != null ? `${return1Y >= 0 ? '+' : ''}${return1Y.toFixed(2)}%` : '—', null),
        renderSecMetric('vs S&P 500 (52W)', priceRelReturn != null ? `${priceRelReturn >= 0 ? '+' : ''}${priceRelReturn.toFixed(2)}%` : '—', 'Excess return'),
      ]),
    ]),

    // Section 4: Qualitative Analysis
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 04'),
        h('h2', { class: 'sec-section-title' }, 'Análise Qualitativa (Gemini)'),
      ]),
      geminiAnalysis
        ? renderGeminiAnalysis(geminiAnalysis)
        : geminiLoading
          ? h('div', { class: 'sec-gemini-empty' }, [
              h('div', { style: { color: 'var(--amber)', fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '8px' } }, 'Gerando análise…'),
              h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, 'Analisando características do ETF via Gemini'),
            ])
          : h('div', { class: 'sec-gemini-empty' }, [
              h('div', { style: { color: 'var(--text-muted)', fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '12px' } }, 'Análise ainda não gerada'),
              h('p', { class: 'empty-desc', style: { marginBottom: '16px' } }, 'O Gemini irá produzir uma tese qualitativa: para quem é este ETF, perfil de risco, cenários favoráveis e desfavoráveis.'),
              h('button', {
                class: 'btn-secondary',
                onClick: () => runSecurityGeminiAnalysis(ticker),
                disabled: !DB.settings.gemini_api_key ? 'disabled' : null,
              }, !DB.settings.gemini_api_key ? 'Configure Gemini key primeiro' : '✨ Gerar análise qualitativa'),
            ]),
    ]),

    // Section 5: News
    news && news.length > 0 && h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 05'),
        h('h2', { class: 'sec-section-title' }, 'Notícias Recentes'),
      ]),
      h('div', { class: 'portfolio-card', style: { padding: '0 20px' } }, news.map(n =>
        h('div', { class: 'sec-news-item' }, [
          h('div', {}, [
            h('div', { class: 'sec-news-headline' },
              h('a', { href: n.url, target: '_blank' }, n.headline)),
            h('div', { class: 'sec-news-meta' }, `${n.source} · ${n.category || 'news'}`),
          ]),
          h('div', { class: 'sec-news-date' }, new Date(n.datetime * 1000).toLocaleDateString('pt-BR')),
        ])
      )),
    ]),
  ]);
}

function analyzeETF(data) {
  const out = [];
  const { profile, metrics, ticker } = data;
  const m = metrics.metric || {};
  const dy = getMetric(m, 'dividendYieldIndicatedAnnual', 'currentDividendYieldTTM');
  const beta = getMetric(m, 'beta');
  const aum = profile.marketCapitalization;
  const return1Y = getMetric(m, '52WeekPriceReturnDaily', 'yearToDatePriceReturnDaily');
  const priceRelReturn = getMetric(m, 'priceRelativeToS&P50052Week', 'priceRelativeToSP50052Week');

  // Identifica família do ETF pelo ticker
  const family = identifyETFFamily(ticker);
  if (family) out.push(`${family.description}`);

  if (aum && aum > 100000) out.push(`AUM de ${formatMoney(aum * 1e6)} indica ETF de grande porte — alta liquidez, baixo tracking error esperado.`);
  else if (aum && aum > 1000) out.push(`AUM moderado (${formatMoney(aum * 1e6)}) — adequado mas verifique spreads em operações grandes.`);
  else if (aum) out.push(`AUM relativamente pequeno (${formatMoney(aum * 1e6)}) — pode ter menor liquidez e spread mais amplo.`);

  if (dy != null) {
    const dyPct = dy * 100;
    if (dyPct > 4) out.push(`Dividend yield alto (${dyPct.toFixed(2)}%) — típico de ETFs de renda (bonds, utilities, dividend-focused).`);
    else if (dyPct > 1.5) out.push(`Dividend yield moderado (${dyPct.toFixed(2)}%).`);
    else if (dyPct > 0) out.push(`Dividend yield baixo (${dyPct.toFixed(2)}%) — tipicamente ETFs de crescimento ou concentrados em empresas que reinvestem.`);
  }

  if (beta != null) {
    if (beta > 1.2) out.push(`Beta de ${beta.toFixed(2)} indica volatilidade maior que o mercado amplo — ETF com viés setorial ou temático.`);
    else if (beta < 0.8) out.push(`Beta de ${beta.toFixed(2)} indica perfil defensivo.`);
    else out.push(`Beta próximo de 1 (${beta.toFixed(2)}) — comportamento alinhado ao mercado amplo.`);
  }

  if (return1Y != null) {
    if (return1Y > 25) out.push(`Retorno de ${return1Y.toFixed(1)}% em 52 semanas é excepcional — avalie se o tema ainda tem tração ou se já está precificado.`);
    else if (return1Y < -15) out.push(`Retorno de ${return1Y.toFixed(1)}% em 52 semanas — drawdown significativo pode representar oportunidade de entrada ou sinal de problema estrutural.`);
  }

  if (priceRelReturn != null && Math.abs(priceRelReturn) > 10) {
    if (priceRelReturn > 0) out.push(`Outperformance de ${priceRelReturn.toFixed(1)}% vs S&P 500 em 52 semanas — setor/tema superior ao mercado amplo no período.`);
    else out.push(`Underperformance de ${Math.abs(priceRelReturn).toFixed(1)}% vs S&P 500 em 52 semanas — setor enfrentando headwinds relativos.`);
  }

  return out.length > 0 ? out : ['Dados limitados para análise automática deste ETF.'];
}

// Known ETF families with curated descriptions
function identifyETFFamily(ticker) {
  const families = {
    'SPY':  { description: 'ETF emblemático que replica o S&P 500 — referência para exposição ao mercado amplo de grandes empresas americanas.' },
    'IVV':  { description: 'BlackRock iShares S&P 500 — alternativa ao SPY com expense ratio tipicamente menor.' },
    'VOO':  { description: 'Vanguard S&P 500 — expense ratio mais baixo da categoria, ideal para buy & hold de longo prazo.' },
    'QQQ':  { description: 'Replica o Nasdaq-100 — exposição concentrada em grandes empresas de tecnologia e crescimento.' },
    'VTI':  { description: 'Vanguard Total Stock Market — exposição ampla ao mercado acionário americano completo (large, mid e small cap).' },
    'DIA':  { description: 'Replica o Dow Jones Industrial Average — 30 blue-chips americanas.' },
    'IWM':  { description: 'Russell 2000 — exposição a small caps americanas, mais sensíveis ao ciclo doméstico.' },
    'VEA':  { description: 'Vanguard FTSE Developed Markets — exposição a mercados desenvolvidos ex-US (Europa, Japão, etc).' },
    'EFA':  { description: 'MSCI EAFE — mercados desenvolvidos Europa, Australásia, Far East.' },
    'VWO':  { description: 'Vanguard FTSE Emerging Markets — diversificação em mercados emergentes.' },
    'EEM':  { description: 'MSCI Emerging Markets — exposição a EM com composição ligeiramente diferente do VWO.' },
    'AGG':  { description: 'US Aggregate Bond — exposição ampla a renda fixa americana (tesouro, corporate, MBS).' },
    'BND':  { description: 'Vanguard Total Bond Market — benchmark doméstico de renda fixa.' },
    'TLT':  { description: 'Treasury 20+ Years — duration longa, alta sensibilidade a mudanças de taxa de juros.' },
    'IEF':  { description: 'Treasury 7-10 Years — duration intermediária em bonds americanos.' },
    'GLD':  { description: 'SPDR Gold Shares — exposição direta ao ouro físico, proteção contra inflação e tail risks.' },
    'SLV':  { description: 'iShares Silver Trust — exposição à prata física.' },
    'XLK':  { description: 'Sector SPDR Technology — concentrado em empresas de tecnologia do S&P 500.' },
    'XLF':  { description: 'Sector SPDR Financials — bancos, seguradoras e financeiras do S&P 500.' },
    'XLE':  { description: 'Sector SPDR Energy — majors de petróleo e gás do S&P 500.' },
    'XLV':  { description: 'Sector SPDR Health Care — pharma, biotech, dispositivos médicos do S&P 500.' },
    'XLI':  { description: 'Sector SPDR Industrials — defesa, transporte, máquinas do S&P 500.' },
    'XLP':  { description: 'Sector SPDR Consumer Staples — bens essenciais, defensivo em recessões.' },
    'XLY':  { description: 'Sector SPDR Consumer Discretionary — bens não-essenciais, sensível ao ciclo.' },
    'XLU':  { description: 'Sector SPDR Utilities — utilidades, defensivo com dividendos consistentes.' },
    'XLB':  { description: 'Sector SPDR Materials — commodities, mineração, químicos.' },
    'XLRE': { description: 'Sector SPDR Real Estate — REITs do S&P 500.' },
    'XLC':  { description: 'Sector SPDR Communication Services — telecoms e mídia digital.' },
  };
  const t = ticker.toUpperCase();
  return families[t] || null;
}

function renderSecurityDetail() {
  const ticker = state.detail.slug;
  const data = state._sec_data?.[ticker];

  if (!data) {
    // Trigger async load
    if (!state._sec_loading?.[ticker]) {
      if (!state._sec_loading) state._sec_loading = {};
      state._sec_loading[ticker] = true;
      loadSecurityData(ticker).then(result => {
        if (!state._sec_data) state._sec_data = {};
        state._sec_data[ticker] = result;
        state._sec_loading[ticker] = false;
        render();
      }).catch(err => {
        state._sec_loading[ticker] = false;
        state._sec_error = err.message;
        render();
      });
    }

    if (state._sec_error) {
      return h('div', { class: 'content fade-up' }, [
        h('button', { class: 'back-btn', onClick: clearDetail }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),
        h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Erro ao carregar'),
          h('p', { class: 'empty-desc' }, state._sec_error),
          h('button', { class: 'btn-secondary', onClick: () => { state._sec_error = null; delete state._sec_loading?.[ticker]; render(); } }, 'Tentar novamente'),
        ]),
      ]);
    }

    return h('div', { class: 'content fade-up' }, [
      h('button', { class: 'back-btn', onClick: clearDetail }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),
      h('div', { style: { padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' } }, [
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', marginBottom: '12px' } }, `Carregando ${ticker}...`),
        h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, 'Buscando perfil, cotação, fundamentals, analistas e notícias'),
      ]),
    ]);
  }

  const { profile, quote, metrics, recommendations, priceTarget, candles, news } = data;

  // ETFs get a completely different render path
  if (data.isETF) return renderETFDetail(data);

  const rating = computeProprietaryRating(metrics);
  const change = quote.d || 0;
  const changePct = quote.dp || 0;
  const priceColor = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const m = metrics.metric || {};
  const geminiAnalysis = state._sec_gemini?.[ticker];
  const geminiLoading = state._sec_gemini_loading?.[ticker];

  // Extract fundamentals + credit via smart helpers (handles multiple field name variants)
  const fund = getFundamentalMetrics(m);
  const credit = getCreditMetrics(m);

  return h('div', { class: 'content fade-up' }, [
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      h('button', { class: 'back-btn', style: { margin: '0' }, onClick: clearDetail }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', {
          class: 'btn-secondary',
          onClick: () => {
            if (isInWatchlist(ticker)) removeFromWatchlist(ticker);
            else { addToWatchlist(ticker, profile.name || ticker); render(); }
          },
        }, isInWatchlist(ticker) ? '★ Na watchlist' : '☆ Adicionar à watchlist'),
        h('button', {
          class: 'btn-secondary',
          onClick: () => generateSecurityReport(data, rating, geminiAnalysis),
        }, 'Gerar PDF do ativo'),
      ]),
    ]),

    // Header
    h('div', { class: 'sec-detail-head' }, [
      h('div', {}, [
        h('div', { class: 'sec-detail-ticker' }, ticker),
        h('div', { class: 'sec-detail-name' }, profile.name || ticker),
        h('div', { class: 'sec-detail-meta' }, [
          profile.finnhubIndustry && h('span', { class: 'badge' }, profile.finnhubIndustry),
          profile.country && h('span', { class: 'badge' }, profile.country),
          profile.exchange && h('span', { class: 'badge' }, profile.exchange),
          profile.marketCapitalization && h('span', { class: 'badge' }, `Mkt Cap ${formatMoney(profile.marketCapitalization * 1e6)}`),
          profile.ipo && h('span', { class: 'badge' }, `IPO ${profile.ipo}`),
        ]),
      ]),
      h('div', { class: 'sec-price-box' }, [
        h('div', { class: 'sec-price-current' }, formatCurrency(quote.c, profile.currency)),
        h('div', { class: `sec-price-change ${priceColor}` },
          `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`),
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '8px' } },
          `O: ${formatCurrency(quote.o, profile.currency)} · H: ${formatCurrency(quote.h, profile.currency)} · L: ${formatCurrency(quote.l, profile.currency)}`),
      ]),
    ]),

    // Section 1: Snapshot + Chart
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 01'),
        h('h2', { class: 'sec-section-title' }, 'Snapshot'),
      ]),
      h('div', { class: 'sec-metrics-grid', style: { marginBottom: '16px' } }, [
        renderSecMetric('Prev Close',  formatCurrency(quote.pc, profile.currency), null),
        renderSecMetric('52W High',    formatCurrency(fund.fiftyTwoHigh, profile.currency), null),
        renderSecMetric('52W Low',     formatCurrency(fund.fiftyTwoLow, profile.currency), null),
        renderSecMetric('Beta',        fund.beta != null ? fund.beta.toFixed(2) : '—', null),
      ]),
      renderSecChart(ticker, candles),
    ]),

    // Section 2: Fundamentals (Equity lens)
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 02'),
        h('h2', { class: 'sec-section-title' }, 'Fundamentals · Equity Lens'),
      ]),
      h('div', { class: 'sec-metrics-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1px' } }, [
        renderSecMetric('P/E (TTM)',   fmt(fund.pe, 2), null),
        renderSecMetric('P/B',         fmt(fund.pb, 2), null),
        renderSecMetric('P/S',         fmt(fund.ps, 2), null),
        renderSecMetric('EV / EBITDA', fmt(fund.evEbitda, 2), null),
      ]),
      h('div', { class: 'sec-metrics-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1px' } }, [
        renderSecMetric('Dividend Yield', fund.dividendYield != null ? (fund.dividendYield * 100).toFixed(2) + '%' : '—', null),
        renderSecMetric('Revenue Growth (5Y)', fmtPct(fund.revGrowth5Y), null),
        renderSecMetric('EPS Growth (5Y)', fmtPct(fund.epsGrowth5Y), null),
        renderSecMetric('Payout Ratio', fmtPct(fund.payoutRatio), null),
      ]),
      h('div', { class: 'sec-metrics-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)' } }, [
        renderSecMetric('Gross Margin', fmtPct(fund.grossMargin), null),
        renderSecMetric('Oper. Margin', fmtPct(fund.operMargin), null),
        renderSecMetric('Net Margin',   fmtPct(fund.netMargin), null),
        renderSecMetric('ROE',          fmtPct(fund.roe), null),
      ]),
      renderCommentary('Leitura dos Fundamentos', analyzeFundamentals(fund)),
    ]),

    // Section 3: Credit lens
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 03'),
        h('h2', { class: 'sec-section-title' }, 'Credit Lens'),
      ]),
      h('div', { class: 'sec-metrics-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)' } }, [
        renderSecMetric('Debt / Equity',   fmt(credit.debtToEquity, 2), 'Alavancagem financeira'),
        renderSecMetric('LT Debt / Cap',   fmt(credit.ltDebtToCapital, 2), null),
        renderSecMetric('Current Ratio',   fmt(credit.currentRatio, 2), 'Liquidez de curto prazo'),
        renderSecMetric('Quick Ratio',     fmt(credit.quickRatio, 2), null),
      ]),
      h('div', { class: 'sec-metrics-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '1px' } }, [
        renderSecMetric('FCF Margin',        fmtPct(credit.fcfMargin), null),
        renderSecMetric('Interest Coverage', fmt(credit.interestCoverage, 2), 'EBIT / Juros'),
        renderSecMetric('Asset Turnover',    fmt(credit.assetTurnover, 2), null),
        renderSecMetric('Cash / Share',      fmt(credit.cashPerShare, 2), null),
      ]),
      renderCommentary('Leitura de Crédito', analyzeCredit(credit)),
      h('div', { style: { marginTop: '12px', padding: '12px 16px', background: 'var(--bg-2)', border: '1px dashed var(--border)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'Fraunces, serif' } },
        'Nota: Dados agregados do balanço. Análise bond-by-bond (spread, duration, cupom) requer fontes especializadas não gratuitas.'),
    ]),

    // Section 4: Analyst consensus
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 04'),
        h('h2', { class: 'sec-section-title' }, 'Consenso de Analistas'),
      ]),
      renderAnalystSection(recommendations, priceTarget, quote.c),
      renderCommentary('Leitura do Consenso', analyzeAnalystConsensus(recommendations, priceTarget, quote.c)),
    ]),

    // Section 5: Proprietary rating
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 05'),
        h('h2', { class: 'sec-section-title' }, 'Rating Proprietário'),
      ]),
      renderRatingSection(rating),
      renderCommentary('Leitura do Rating', analyzeRating(rating)),
    ]),

    // Section 6: Gemini Analysis
    h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 06'),
        h('h2', { class: 'sec-section-title' }, 'Análise Qualitativa (Gemini)'),
      ]),
      geminiAnalysis
        ? renderGeminiAnalysis(geminiAnalysis)
        : geminiLoading
          ? h('div', { class: 'sec-gemini-empty' }, [
              h('div', { style: { color: 'var(--amber)', fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '8px' } }, 'Gerando análise…'),
              h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, 'Enviando fundamentals + notícias recentes para Gemini'),
            ])
          : h('div', { class: 'sec-gemini-empty' }, [
              h('div', { style: { color: 'var(--text-muted)', fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '12px' } }, 'Análise ainda não gerada'),
              h('p', { class: 'empty-desc', style: { marginBottom: '16px' } }, 'O Gemini irá analisar os fundamentals, consenso de analistas e notícias recentes para produzir uma tese qualitativa com bull case e bear case.'),
              h('button', {
                class: 'btn-secondary',
                onClick: () => runSecurityGeminiAnalysis(ticker),
                disabled: !DB.settings.gemini_api_key ? 'disabled' : null,
              }, !DB.settings.gemini_api_key ? 'Configure Gemini key primeiro' : '✨ Gerar análise qualitativa'),
            ]),
    ]),

    // Section 7: News
    news.length > 0 && h('div', { class: 'sec-section' }, [
      h('div', { class: 'sec-section-head' }, [
        h('span', { class: 'sec-section-num' }, '§ 07'),
        h('h2', { class: 'sec-section-title' }, 'Notícias Recentes'),
      ]),
      h('div', { class: 'portfolio-card', style: { padding: '0 20px' } }, news.map(n =>
        h('div', { class: 'sec-news-item' }, [
          h('div', {}, [
            h('div', { class: 'sec-news-headline' },
              h('a', { href: n.url, target: '_blank' }, n.headline)),
            h('div', { class: 'sec-news-meta' }, `${n.source} · ${n.category || 'news'}`),
          ]),
          h('div', { class: 'sec-news-date' }, new Date(n.datetime * 1000).toLocaleDateString('pt-BR')),
        ])
      )),
    ]),
  ]);
}

function renderSecMetric(label, value, sub) {
  return h('div', { class: 'sec-metric' }, [
    h('div', { class: 'sec-metric-label' }, label),
    h('div', { class: 'sec-metric-value' }, String(value)),
    sub && h('div', { class: 'sec-metric-sub' }, sub),
  ]);
}

function renderSecChart(ticker, candles) {
  const range = state._sec_chart_range || '1Y';

  return h('div', { class: 'sec-chart-wrap' }, [
    h('div', { class: 'sec-chart-tabs' },
      ['1M', '6M', '1Y', '5Y'].map(r =>
        h('button', {
          class: `sec-chart-tab ${range === r ? 'active' : ''}`,
          onClick: async () => {
            state._sec_chart_range = r;
            // Reload candles for new range
            state._sec_data[ticker].candles = null;
            render();
            const newCandles = await loadCandles(ticker, r);
            if (state._sec_data[ticker]) {
              state._sec_data[ticker].candles = newCandles;
            }
            render();
          },
        }, r)
      )
    ),
    candles === null
      ? h('div', { style: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' } }, 'Carregando gráfico…')
      : !candles || !candles.close || candles.close.length === 0
        ? h('div', { style: { padding: '60px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px' } }, 'Dados de preço indisponíveis para esse range')
        : buildPriceChart(candles),
  ]);
}

function buildPriceChart(candles) {
  const w = 900, ht = 280, pad = { l: 60, r: 20, t: 10, b: 30 };
  const plotW = w - pad.l - pad.r, plotH = ht - pad.t - pad.b;
  const prices = candles.close;
  const n = prices.length;
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const xFor = i => pad.l + (i / (n - 1)) * plotW;
  const yFor = p => pad.t + ((maxP - p) / range) * plotH;

  const pts = prices.map((p, i) => `${xFor(i)},${yFor(p)}`).join(' ');
  const areaD = `M ${xFor(0)} ${yFor(prices[0])} ` + prices.map((p, i) => `L ${xFor(i)} ${yFor(p)}`).join(' ') + ` L ${xFor(n-1)} ${pad.t + plotH} L ${xFor(0)} ${pad.t + plotH} Z`;

  const firstPrice = prices[0], lastPrice = prices[n - 1];
  const isUp = lastPrice >= firstPrice;
  const color = isUp ? '#7a9b5c' : '#b85c5c';

  // Y-axis labels (5 levels)
  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const v = minP + (range * i / 4);
    yLabels.push({ y: yFor(v), label: v.toFixed(2) });
  }

  // X-axis labels (approximately 5)
  const xLabels = [];
  const step = Math.floor(n / 5);
  for (let i = 0; i < n; i += step) {
    const d = new Date(candles.timestamps[i] * 1000);
    xLabels.push({ x: xFor(i), label: `${d.getMonth()+1}/${String(d.getFullYear()).slice(2)}` });
  }

  const svgHTML = `
    ${yLabels.map(l => `
      <line x1="${pad.l}" x2="${w - pad.r}" y1="${l.y}" y2="${l.y}" stroke="#2a2621" stroke-dasharray="2 3"/>
      <text x="${pad.l - 10}" y="${l.y + 4}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" fill="#8a8578">${l.label}</text>
    `).join('')}
    ${xLabels.map(l => `
      <text x="${l.x}" y="${ht - 10}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#6a6258">${l.label}</text>
    `).join('')}
    <path d="${areaD}" fill="${color}" opacity="0.12"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8"/>
  `;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${ht}`);
  svg.setAttribute('style', 'width: 100%; height: auto;');
  svg.innerHTML = svgHTML;
  return svg;
}

function renderAnalystSection(recommendations, priceTarget, currentPrice) {
  const latest = recommendations && recommendations.length > 0 ? recommendations[0] : null;
  if (!latest && !priceTarget?.targetMean) {
    return h('div', { class: 'sec-gemini-empty' }, [
      h('p', { class: 'empty-desc' }, 'Dados de analistas não disponíveis para este ativo.'),
    ]);
  }

  const total = latest ? (latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell) : 0;
  const upside = priceTarget?.targetMean && currentPrice ?
    ((priceTarget.targetMean / currentPrice - 1) * 100) : null;

  return h('div', {}, [
    // Distribution
    latest && h('div', { class: 'sec-analyst-dist' }, [
      h('div', { class: 'sec-analyst-col' }, [
        h('div', { class: 'sec-analyst-label', style: { color: '#7a9b5c' } }, 'Strong Buy'),
        h('div', { class: 'sec-analyst-count' }, String(latest.strongBuy)),
      ]),
      h('div', { class: 'sec-analyst-col' }, [
        h('div', { class: 'sec-analyst-label', style: { color: '#a5b87a' } }, 'Buy'),
        h('div', { class: 'sec-analyst-count' }, String(latest.buy)),
      ]),
      h('div', { class: 'sec-analyst-col' }, [
        h('div', { class: 'sec-analyst-label', style: { color: '#8a8578' } }, 'Hold'),
        h('div', { class: 'sec-analyst-count' }, String(latest.hold)),
      ]),
      h('div', { class: 'sec-analyst-col' }, [
        h('div', { class: 'sec-analyst-label', style: { color: '#c89b7a' } }, 'Sell'),
        h('div', { class: 'sec-analyst-count' }, String(latest.sell)),
      ]),
      h('div', { class: 'sec-analyst-col' }, [
        h('div', { class: 'sec-analyst-label', style: { color: '#b85c5c' } }, 'Strong Sell'),
        h('div', { class: 'sec-analyst-count' }, String(latest.strongSell)),
      ]),
    ]),

    // Price targets
    priceTarget?.targetMean && h('div', { class: 'sec-metrics-grid', style: { marginTop: '1px' } }, [
      renderSecMetric('Target Mean', formatCurrency(priceTarget.targetMean), null),
      renderSecMetric('Target High', formatCurrency(priceTarget.targetHigh), null),
      renderSecMetric('Target Low',  formatCurrency(priceTarget.targetLow), null),
      renderSecMetric('Upside', upside != null ? `${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%` : '—',
        priceTarget.numberOfAnalysts ? `${priceTarget.numberOfAnalysts} analistas` : null),
    ]),

    latest && h('div', { style: { marginTop: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-faint)' } },
      `Total: ${total} analistas · Período: ${latest.period || '—'}`),
  ]);
}

function renderRatingSection(rating) {
  const score = rating.score;
  const size = 180, r = size / 2 - 8, circ = 2 * Math.PI * r;
  const pct = score != null ? score / 100 : 0;
  const color = score == null ? '#8a8578' : score >= 65 ? '#7a9b5c' : score >= 50 ? '#c89b7a' : '#b85c5c';

  const ratingSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ratingSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  ratingSvg.setAttribute('width', size);
  ratingSvg.setAttribute('height', size);
  ratingSvg.innerHTML = `
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#2a2621" stroke-width="10"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
      stroke-dasharray="${circ * pct} ${circ}"
      stroke-linecap="round"
      transform="rotate(-90 ${size/2} ${size/2})"/>
  `;

  return h('div', { class: 'sec-rating-box' }, [
    h('div', { class: 'sec-rating-dial' }, [
      ratingSvg,
      h('div', { class: 'sec-rating-score' }, [
        h('div', { class: 'n', style: { color } }, score != null ? String(score) : '—'),
        h('div', { class: 'l', style: { color } }, ratingLabel(score)),
      ]),
    ]),
    h('div', { class: 'sec-rating-breakdown' },
      rating.breakdown.map(f => h('div', { class: 'sec-rating-factor' }, [
        h('div', { class: 'sec-rating-factor-label' }, `${f.label} (${f.weight}%)`),
        h('div', { class: 'sec-rating-bar-track' }, [
          h('div', { class: 'sec-rating-bar-fill', style: { width: `${f.score}%` } }),
        ]),
        h('div', { class: 'sec-rating-factor-score' }, String(f.score)),
      ]))
    ),
  ]);
}

function renderGeminiAnalysis(analysis) {
  return h('div', { class: 'sec-gemini-box' }, [
    analysis.thesis && h('div', { class: 'sec-gemini-section' }, [
      h('div', { class: 'sec-gemini-label', style: { color: 'var(--amber)' } }, 'Tese Central'),
      h('div', { class: 'sec-gemini-text' }, analysis.thesis),
    ]),
    analysis.bull_case && h('div', { class: 'sec-gemini-section' }, [
      h('div', { class: 'sec-gemini-label', style: { color: 'var(--green)' } }, 'Bull Case'),
      h('div', { class: 'sec-gemini-text' }, analysis.bull_case),
    ]),
    analysis.bear_case && h('div', { class: 'sec-gemini-section' }, [
      h('div', { class: 'sec-gemini-label', style: { color: 'var(--red)' } }, 'Bear Case'),
      h('div', { class: 'sec-gemini-text' }, analysis.bear_case),
    ]),
    analysis.key_catalysts?.length > 0 && h('div', { class: 'sec-gemini-section' }, [
      h('div', { class: 'sec-gemini-label', style: { color: 'var(--amber)' } }, 'Principais Catalisadores'),
      h('ul', { style: { paddingLeft: '18px', fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.8', color: 'var(--text-2)' } },
        analysis.key_catalysts.map(c => h('li', {}, c))),
    ]),
    analysis.key_risks?.length > 0 && h('div', { class: 'sec-gemini-section' }, [
      h('div', { class: 'sec-gemini-label', style: { color: 'var(--red)' } }, 'Principais Riscos'),
      h('ul', { style: { paddingLeft: '18px', fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.8', color: 'var(--text-2)' } },
        analysis.key_risks.map(c => h('li', {}, c))),
    ]),
    h('div', { style: { marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, `Gerado em ${new Date(analysis.generated_at).toLocaleString('pt-BR')}`),
      h('button', {
        class: 'btn-secondary',
        onClick: () => runSecurityGeminiAnalysis(state.detail.slug),
      }, 'Regenerar'),
    ]),
  ]);
}

async function runSecurityGeminiAnalysis(ticker) {
  const data = state._sec_data?.[ticker];
  if (!data) return;
  if (!DB.settings.gemini_api_key) {
    showToast('Configure Gemini API key primeiro', true);
    return;
  }

  if (!state._sec_gemini_loading) state._sec_gemini_loading = {};
  state._sec_gemini_loading[ticker] = true;
  state._sec_gemini_error = null;
  render();

  const { profile, quote, metrics, recommendations, priceTarget, news } = data;
  const m = metrics.metric || {};
  const latest = recommendations?.[0];
  const rating = computeProprietaryRating(metrics);
  const fund = getFundamentalMetrics(m);
  const credit = getCreditMetrics(m);

  // Helper: drop null/undefined values so Gemini doesn't get confused by missing data
  const stripNulls = (obj) => {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v == null || (typeof v === 'object' && !Array.isArray(v) && Object.keys(stripNulls(v)).length === 0)) continue;
      if (typeof v === 'object' && !Array.isArray(v)) out[k] = stripNulls(v);
      else out[k] = v;
    }
    return out;
  };

  const dataBrief = stripNulls({
    ticker,
    name: profile.name,
    industry: profile.finnhubIndustry,
    market_cap_musd: profile.marketCapitalization,
    price: quote.c,
    change_pct: quote.dp,
    is_etf: !!data.isETF,
    valuation: {
      pe: fund.pe, pb: fund.pb, ps: fund.ps,
      ev_ebitda: fund.evEbitda,
      dividend_yield_pct: fund.dividendYield != null ? (fund.dividendYield * 100) : null,
    },
    growth: {
      revenue_5y_pct: fund.revGrowth5Y,
      revenue_yoy_pct: fund.revGrowthYoy,
      eps_5y_pct: fund.epsGrowth5Y,
    },
    profitability: {
      gross_margin_pct: fund.grossMargin,
      operating_margin_pct: fund.operMargin,
      net_margin_pct: fund.netMargin,
      roe_pct: fund.roe,
      roa_pct: fund.roa,
    },
    leverage: {
      debt_equity: credit.debtToEquity,
      lt_debt_to_capital: credit.ltDebtToCapital,
      current_ratio: credit.currentRatio,
      quick_ratio: credit.quickRatio,
      interest_coverage: credit.interestCoverage,
      fcf_margin_pct: credit.fcfMargin,
    },
    risk: {
      beta: fund.beta,
      week52_high: fund.fiftyTwoHigh,
      week52_low: fund.fiftyTwoLow,
    },
    analyst_consensus: latest ? {
      strong_buy: latest.strongBuy, buy: latest.buy, hold: latest.hold,
      sell: latest.sell, strong_sell: latest.strongSell,
    } : null,
    price_target: priceTarget?.targetMean ? {
      mean: priceTarget.targetMean,
      high: priceTarget.targetHigh,
      low: priceTarget.targetLow,
      n_analysts: priceTarget.numberOfAnalysts,
    } : null,
    proprietary_rating_score: rating.score,
    proprietary_rating_breakdown: rating.breakdown,
    recent_news_headlines: (news || []).slice(0, 8).map(n => n.headline).filter(Boolean),
  });

  const promptType = data.isETF
    ? `You are a senior portfolio strategist analyzing an ETF. Produce an objective qualitative analysis.

Respond with JSON ONLY (no markdown, no code fences):

{
  "thesis": "1-2 sentence overall view: what role this ETF plays in a portfolio and whether the current setup is attractive, neutral, or unattractive.",
  "bull_case": "3-5 sentences: what scenarios make this ETF outperform. Reference the specific theme/sector/exposure.",
  "bear_case": "3-5 sentences: scenarios where this ETF underperforms or carries risk.",
  "key_catalysts": ["3 bullets, one sentence each"],
  "key_risks": ["3 bullets, one sentence each"]
}

Style: institutional, Financial Times tone. Concrete. Reference specific numbers when relevant.`
    : `You are a senior equity research analyst. Produce an objective qualitative analysis for the security below.

Respond with JSON ONLY (no markdown, no code fences):

{
  "thesis": "1-2 sentence overall investment thesis, stating whether the setup is attractive, neutral, or unattractive and why.",
  "bull_case": "3-5 sentence constructive view — what would drive outperformance. Reference specific metrics or news when relevant.",
  "bear_case": "3-5 sentence bearish/risk-focused view — what could go wrong, what's priced in, what risks dominate.",
  "key_catalysts": ["bullet 1 (one sentence)", "bullet 2", "bullet 3"],
  "key_risks": ["bullet 1", "bullet 2", "bullet 3"]
}

Style: institutional, Financial Times editorial tone. Concrete, avoid hedging. Reference specific numbers from the data when possible. Write in English.`;

  const prompt = `${promptType}

DATA:
${JSON.stringify(dataBrief, null, 2)}`;

  try {
    const result = await callGeminiRaw(prompt, DB.settings.gemini_api_key, () => {});

    // Validate that we got at least some content
    if (!result || (!result.thesis && !result.bull_case && !result.bear_case)) {
      throw new Error('Gemini retornou resposta vazia. Tente novamente em alguns segundos.');
    }

    if (!state._sec_gemini) state._sec_gemini = {};
    state._sec_gemini[ticker] = { ...result, generated_at: new Date().toISOString() };
    state._sec_gemini_loading[ticker] = false;
    render();
    showToast('Análise gerada');
  } catch (err) {
    state._sec_gemini_loading[ticker] = false;
    state._sec_gemini_error = err.message;
    render();
    showToast('Erro ao gerar análise: ' + err.message, true);
    console.error('Gemini analysis error:', err);
  }
}

/* ---------- Render: Watchlist ---------- */

function renderWatchlistView() {
  const wl = getWatchlist();
  if (wl.length === 0) {
    return h('div', { class: 'content fade-up' }, [
      pageHead('Securities · Watchlist', 'Watchlist', 'Ativos que você marcou para acompanhar.'),
      h('div', { class: 'empty' }, [
        h('div', { class: 'empty-title' }, 'Watchlist vazia'),
        h('p', { class: 'empty-desc', html: 'Busque ativos em <strong>Buscar Ativo</strong> e clique em "Adicionar à watchlist" para vê-los aqui.' }),
        h('button', { class: 'btn-secondary', onClick: () => setView('sec_search') }, 'Ir para Buscar Ativo'),
      ]),
    ]);
  }

  return h('div', { class: 'content fade-up' }, [
    pageHead('Securities · Watchlist', 'Watchlist', `${wl.length} ativos monitorados. Clique em qualquer card para ver análise completa.`),
    h('div', { class: 'watchlist-grid' }, wl.map(w => renderWatchlistCard(w))),
  ]);
}

function renderWatchlistCard(entry) {
  const cached = SEC_CACHE[entry.ticker];
  const data = cached?.data;
  const quote = data?.quote;

  return h('div', {
    class: 'watchlist-card',
    onClick: () => setDetail('security', entry.ticker),
  }, [
    h('button', {
      class: 'watchlist-remove',
      title: 'Remover',
      onClick: (e) => { e.stopPropagation(); removeFromWatchlist(entry.ticker); },
    }, '×'),
    h('div', { class: 'watchlist-ticker' }, entry.ticker),
    h('div', { class: 'watchlist-name' }, entry.name || ''),
    quote && quote.c ? h('div', {}, [
      h('div', { class: 'watchlist-price' }, formatCurrency(quote.c)),
      h('div', { class: `watchlist-change ${quote.d >= 0 ? '' : ''}`, style: { color: quote.d >= 0 ? 'var(--green)' : 'var(--red)' } },
        `${quote.d >= 0 ? '+' : ''}${quote.d?.toFixed(2)} (${quote.dp?.toFixed(2)}%)`),
    ]) : h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '8px' } }, 'Clique para carregar dados'),
  ]);
}

/* ---------- Security PDF report ---------- */

async function generateSecurityReport(data, rating, geminiAnalysis) {
  const { ticker, profile, quote, metrics, recommendations, priceTarget, news } = data;
  const m = metrics.metric || {};
  const latest = recommendations?.[0];
  const today = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

  let html = `
    <div class="print-cover">
      <div class="print-brand">Aegir · Intel · Security Report</div>
      <h1>${escapeHtml(profile.name || ticker)} <em>${ticker}</em></h1>
      <div class="print-subtitle">${escapeHtml(profile.finnhubIndustry || '')} · ${escapeHtml(profile.exchange || '')}</div>
      <div class="print-meta">
        Gerado em ${today}<br>
        Cotação: ${formatCurrency(quote.c, profile.currency)} (${quote.dp >= 0 ? '+' : ''}${quote.dp?.toFixed(2)}%)<br>
        Market Cap: ${formatMoney(profile.marketCapitalization * 1e6)}
      </div>
    </div>

    <div class="print-section page-break"><div class="print-kicker">Section 01</div>
      <h2>Snapshot</h2>
      <div class="p-grid">
        <div class="p-kpi"><div class="p-kpi-label">Cotação Atual</div><div class="p-kpi-value">${formatCurrency(quote.c, profile.currency)}</div></div>
        <div class="p-kpi"><div class="p-kpi-label">Variação (dia)</div><div class="p-kpi-value">${quote.dp >= 0 ? '+' : ''}${quote.dp?.toFixed(2)}%</div></div>
        <div class="p-kpi"><div class="p-kpi-label">52W High</div><div class="p-kpi-value">${formatCurrency(m['52WeekHigh'], profile.currency)}</div></div>
        <div class="p-kpi"><div class="p-kpi-label">52W Low</div><div class="p-kpi-value">${formatCurrency(m['52WeekLow'], profile.currency)}</div></div>
      </div>
    </div>

    <div class="print-section page-break"><div class="print-kicker">Section 02</div>
      <h2>Fundamentals — Equity Lens</h2>
      <table>
        <thead><tr><th>Múltiplo</th><th>Valor</th><th>Métrica</th><th>Valor</th></tr></thead>
        <tbody>
          <tr><td>P/E (TTM)</td><td>${fmt(m.peBasicExclExtraTTM || m.peTTM, 2)}</td>
              <td>Revenue Growth (5Y)</td><td>${fmtPct(m.revenueGrowth5Y)}</td></tr>
          <tr><td>P/B</td><td>${fmt(m.pbQuarterly, 2)}</td>
              <td>EPS Growth (5Y)</td><td>${fmtPct(m.epsGrowth5Y)}</td></tr>
          <tr><td>P/S</td><td>${fmt(m.psTTM, 2)}</td>
              <td>Gross Margin</td><td>${fmtPct(m.grossMarginTTM)}</td></tr>
          <tr><td>Dividend Yield</td><td>${m.dividendYieldIndicatedAnnual != null ? (m.dividendYieldIndicatedAnnual*100).toFixed(2)+'%' : '—'}</td>
              <td>Operating Margin</td><td>${fmtPct(m.operatingMarginTTM)}</td></tr>
          <tr><td>Beta</td><td>${fmt(m.beta, 2)}</td>
              <td>ROE</td><td>${fmtPct(m.roeTTM)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="print-section page-break"><div class="print-kicker">Section 03</div>
      <h2>Credit Lens</h2>
      <table>
        <thead><tr><th>Métrica</th><th>Valor</th><th>Interpretação</th></tr></thead>
        <tbody>
          <tr><td>Debt / Equity</td><td>${fmt(m.totalDebt_totalEquityQuarterly, 2)}</td><td>Alavancagem financeira geral</td></tr>
          <tr><td>LT Debt / Capital</td><td>${fmt(m.longTermDebt_totalCapitalQuarterly, 2)}</td><td>Peso da dívida de longo prazo</td></tr>
          <tr><td>Current Ratio</td><td>${fmt(m.currentRatioQuarterly, 2)}</td><td>Liquidez de curto prazo</td></tr>
          <tr><td>Quick Ratio</td><td>${fmt(m.quickRatioQuarterly, 2)}</td><td>Liquidez imediata</td></tr>
          <tr><td>FCF Margin</td><td>${fmtPct(m.fcfMarginTTM)}</td><td>Geração de caixa livre</td></tr>
        </tbody>
      </table>
    </div>
  `;

  if (latest || priceTarget?.targetMean) {
    const upside = priceTarget?.targetMean && quote.c ? ((priceTarget.targetMean / quote.c - 1) * 100) : null;
    html += `<div class="print-section page-break"><div class="print-kicker">Section 04</div>
      <h2>Consenso de Analistas</h2>`;
    if (latest) {
      html += `<table>
        <thead><tr><th>Strong Buy</th><th>Buy</th><th>Hold</th><th>Sell</th><th>Strong Sell</th></tr></thead>
        <tbody><tr>
          <td>${latest.strongBuy}</td><td>${latest.buy}</td><td>${latest.hold}</td>
          <td>${latest.sell}</td><td>${latest.strongSell}</td>
        </tr></tbody>
      </table>`;
    }
    if (priceTarget?.targetMean) {
      html += `<table style="margin-top:16px">
        <thead><tr><th>Target Mean</th><th>Target High</th><th>Target Low</th><th>Upside vs Current</th></tr></thead>
        <tbody><tr>
          <td>${formatCurrency(priceTarget.targetMean)}</td>
          <td>${formatCurrency(priceTarget.targetHigh)}</td>
          <td>${formatCurrency(priceTarget.targetLow)}</td>
          <td>${upside != null ? (upside >= 0 ? '+' : '') + upside.toFixed(1) + '%' : '—'}</td>
        </tr></tbody>
      </table>`;
    }
    html += `</div>`;
  }

  if (rating.score != null) {
    html += `<div class="print-section page-break"><div class="print-kicker">Section 05</div>
      <h2>Rating Proprietário</h2>
      <div class="p-grid">
        <div class="p-kpi"><div class="p-kpi-label">Score Geral</div><div class="p-kpi-value">${rating.score} / 100</div></div>
        <div class="p-kpi"><div class="p-kpi-label">Classificação</div><div class="p-kpi-value">${ratingLabel(rating.score)}</div></div>
      </div>
      <table style="margin-top:16px">
        <thead><tr><th>Fator</th><th>Peso</th><th>Score</th></tr></thead>
        <tbody>
          ${rating.breakdown.map(f => `<tr><td>${f.label}</td><td>${f.weight}%</td><td>${f.score}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  if (geminiAnalysis) {
    html += `<div class="print-section page-break"><div class="print-kicker">Section 06</div>
      <h2>Análise Qualitativa</h2>
      ${geminiAnalysis.thesis ? `<h3>Tese</h3><p class="print-narrative">${escapeHtml(geminiAnalysis.thesis)}</p>` : ''}
      ${geminiAnalysis.bull_case ? `<h3 style="color:#7a9b5c">Bull Case</h3><p class="print-narrative">${escapeHtml(geminiAnalysis.bull_case)}</p>` : ''}
      ${geminiAnalysis.bear_case ? `<h3 style="color:#b85c5c">Bear Case</h3><p class="print-narrative">${escapeHtml(geminiAnalysis.bear_case)}</p>` : ''}
      ${geminiAnalysis.key_catalysts?.length ? `<h3>Principais Catalisadores</h3><ul>${geminiAnalysis.key_catalysts.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : ''}
      ${geminiAnalysis.key_risks?.length ? `<h3>Principais Riscos</h3><ul>${geminiAnalysis.key_risks.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : ''}
    </div>`;
  }

  if (news && news.length > 0) {
    html += `<div class="print-section page-break"><div class="print-kicker">Section 07</div>
      <h2>Notícias Recentes</h2>
      <table>
        <thead><tr><th>Data</th><th>Fonte</th><th>Manchete</th></tr></thead>
        <tbody>
          ${news.slice(0, 10).map(n => `<tr>
            <td>${new Date(n.datetime * 1000).toLocaleDateString('pt-BR')}</td>
            <td>${escapeHtml(n.source)}</td>
            <td>${escapeHtml(n.headline)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  html += `<div class="p-footer">Aegir · Intel — Security Report · ${ticker} · Confidential</div>`;

  const container = document.getElementById('print-report');
  container.innerHTML = html;
  await new Promise(r => setTimeout(r, 300));
  window.print();
}

/* ---------- Formatters ---------- */

// Gets a metric from Finnhub's metric object, trying multiple field name variations.
// Also supports computing from raw balance sheet numbers if ratio fields are missing.
function getMetric(m, ...aliases) {
  if (!m) return null;
  for (const alias of aliases) {
    if (m[alias] !== null && m[alias] !== undefined && !isNaN(m[alias])) {
      return Number(m[alias]);
    }
  }
  return null;
}

// Pull specific credit-related metrics with smart fallbacks
function getCreditMetrics(m) {
  if (!m) return {};
  return {
    debtToEquity: getMetric(m,
      'totalDebt/totalEquityQuarterly',
      'totalDebt_totalEquityQuarterly',
      'totalDebt/totalEquityAnnual',
      'totalDebt_totalEquityAnnual',
      'longTermDebt/equityQuarterly',
      'longTermDebt_equityQuarterly',
    ),
    ltDebtToCapital: getMetric(m,
      'longTermDebt/totalCapitalQuarterly',
      'longTermDebt_totalCapitalQuarterly',
      'longTermDebt/totalCapitalAnnual',
      'longTermDebt_totalCapitalAnnual',
      'longTermDebt/totalAssetQuarterly',
      'longTermDebt_totalAssetQuarterly',
    ),
    currentRatio: getMetric(m,
      'currentRatioQuarterly', 'currentRatioAnnual',
    ),
    quickRatio: getMetric(m,
      'quickRatioQuarterly', 'quickRatioAnnual',
    ),
    fcfMargin: getMetric(m,
      'fcfMargin5Y',
      'fcfMarginTTM',
      'currentEv/freeCashFlowTTM',
      'currentEv_freeCashFlowTTM',
    ),
    assetTurnover: getMetric(m,
      'assetTurnoverTTM', 'assetTurnoverAnnual',
    ),
    inventoryTurnover: getMetric(m,
      'inventoryTurnoverTTM', 'inventoryTurnoverAnnual',
    ),
    cashPerShare: getMetric(m,
      'cashPerSharePerShareAnnual',
      'cashPerShareAnnual',
      'cashPerSharePerShareQuarterly',
      'cashPerShareQuarterly',
    ),
    interestCoverage: getMetric(m,
      'netInterestCoverageTTM',
      'netInterestCoverageAnnual',
    ),
    totalDebtToTotalAsset: getMetric(m,
      'totalDebt/totalAssetQuarterly',
      'totalDebt_totalAssetQuarterly',
      'totalDebt/totalAssetAnnual',
      'totalDebt_totalAssetAnnual',
    ),
  };
}

function getFundamentalMetrics(m) {
  if (!m) return {};
  return {
    pe: getMetric(m,
      'peBasicExclExtraTTM', 'peTTM', 'peNormalizedAnnual',
      'peExclExtraTTM', 'peInclExtraTTM', 'peAnnual',
    ),
    pb: getMetric(m, 'pbQuarterly', 'pbAnnual'),
    ps: getMetric(m, 'psTTM', 'psAnnual'),
    evEbitda: getMetric(m,
      'currentEv/ebitdaAnnual', 'currentEv_ebitdaAnnual',
      'currentEv/ebitdaTTM', 'currentEv_ebitdaTTM',
      'ev/ebitda', 'ev_Ebitda',
    ),
    dividendYield: getMetric(m,
      'dividendYieldIndicatedAnnual', 'currentDividendYieldTTM',
      'dividendYield5Y',
    ),
    revGrowth5Y: getMetric(m, 'revenueGrowth5Y'),
    revGrowthYoy: getMetric(m, 'revenueGrowthTTMYoy', 'revenueGrowthQuarterlyYoy'),
    epsGrowth5Y: getMetric(m, 'epsGrowth5Y'),
    payoutRatio: getMetric(m, 'payoutRatioTTM', 'payoutRatioAnnual'),
    grossMargin: getMetric(m, 'grossMarginTTM', 'grossMarginAnnual', 'grossMargin5Y'),
    operMargin: getMetric(m, 'operatingMarginTTM', 'operatingMarginAnnual', 'operatingMargin5Y'),
    netMargin: getMetric(m, 'netProfitMarginTTM', 'netProfitMarginAnnual', 'netProfitMargin5Y'),
    roe: getMetric(m, 'roeTTM', 'roeRfy', 'roeAnnual', 'roe5Y'),
    roa: getMetric(m, 'roaTTM', 'roaRfy', 'roaAnnual', 'roa5Y'),
    roic: getMetric(m, 'roiTTM', 'roiAnnual', 'roi5Y'),
    fiftyTwoHigh: getMetric(m, '52WeekHigh'),
    fiftyTwoLow: getMetric(m, '52WeekLow'),
    beta: getMetric(m, 'beta'),
  };
}

/* ---------- Automatic descriptive analysis (rule-based, no LLM) ---------- */
// Generates human-readable commentary on a set of metrics using simple thresholds.
// Returns an array of strings, each is one descriptive sentence.

function analyzeFundamentals(f) {
  const out = [];
  if (f.pe != null) {
    if (f.pe < 0) out.push(`P/L negativo (${f.pe.toFixed(1)}x), indicando que a empresa reportou prejuízo nos últimos 12 meses.`);
    else if (f.pe < 10) out.push(`P/L de ${f.pe.toFixed(1)}x é baixo em termos absolutos, sugerindo valuation descontado — pode refletir expectativas conservadoras ou questões estruturais.`);
    else if (f.pe < 18) out.push(`P/L de ${f.pe.toFixed(1)}x está em nível considerado razoável, próximo à média histórica do S&P 500 (~18x).`);
    else if (f.pe < 30) out.push(`P/L de ${f.pe.toFixed(1)}x está acima da média do mercado, sugerindo que investidores precificam crescimento acima do normal.`);
    else out.push(`P/L de ${f.pe.toFixed(1)}x é elevado, indicando valuation premium — o ativo precifica forte crescimento futuro, elevando o risco de repricing em cenário adverso.`);
  }
  if (f.pb != null && f.pb > 0) {
    if (f.pb < 1) out.push(`P/VP de ${f.pb.toFixed(2)}x abaixo de 1 sugere que o mercado avalia os ativos abaixo do valor contábil — pode indicar valor ou problemas de qualidade de ativo.`);
    else if (f.pb > 5) out.push(`P/VP de ${f.pb.toFixed(2)}x é elevado, compatível com empresas de tecnologia ou com forte intangíveis (marca, propriedade intelectual).`);
  }
  if (f.dividendYield != null) {
    const dy = f.dividendYield * 100;
    if (dy > 5) out.push(`Dividend yield de ${dy.toFixed(1)}% é alto — atrativo para renda, mas verifique sustentabilidade via payout.`);
    else if (dy > 2) out.push(`Dividend yield de ${dy.toFixed(1)}% está em nível moderado, tipicamente encontrado em empresas maduras.`);
    else if (dy > 0) out.push(`Dividend yield de ${dy.toFixed(1)}% é baixo — empresa prioriza reinvestimento ou buyback em vez de dividendos.`);
  }
  if (f.revGrowth5Y != null) {
    if (f.revGrowth5Y > 20) out.push(`Crescimento de receita de ${f.revGrowth5Y.toFixed(1)}% ao ano nos últimos 5 anos é excepcional.`);
    else if (f.revGrowth5Y > 10) out.push(`Crescimento de receita de ${f.revGrowth5Y.toFixed(1)}% a.a. nos últimos 5 anos é sólido e acima da média do mercado.`);
    else if (f.revGrowth5Y > 0) out.push(`Crescimento modesto de receita (${f.revGrowth5Y.toFixed(1)}% a.a.) nos últimos 5 anos — empresa em estágio maduro ou enfrentando headwinds.`);
    else out.push(`Receita em contração (${f.revGrowth5Y.toFixed(1)}% a.a.) nos últimos 5 anos — sinal de alerta que requer análise de causas (cíclica vs estrutural).`);
  }
  if (f.roe != null) {
    if (f.roe > 20) out.push(`ROE de ${f.roe.toFixed(1)}% é superior, indicando uso eficiente do capital dos acionistas.`);
    else if (f.roe > 12) out.push(`ROE de ${f.roe.toFixed(1)}% é adequado, próximo ao custo de capital médio.`);
    else if (f.roe > 0) out.push(`ROE de ${f.roe.toFixed(1)}% é baixo, possivelmente abaixo do custo de capital — empresa não está gerando retorno excedente.`);
    else out.push(`ROE negativo (${f.roe.toFixed(1)}%) indica destruição de valor para acionistas no período.`);
  }
  if (f.netMargin != null) {
    if (f.netMargin > 20) out.push(`Margem líquida de ${f.netMargin.toFixed(1)}% é excelente, típica de empresas com vantagens competitivas ou modelos asset-light.`);
    else if (f.netMargin > 10) out.push(`Margem líquida de ${f.netMargin.toFixed(1)}% é saudável.`);
    else if (f.netMargin > 0) out.push(`Margem líquida apertada (${f.netMargin.toFixed(1)}%) deixa pouco espaço para absorver choques de custos.`);
    else out.push(`Prejuízo no período (margem líquida ${f.netMargin.toFixed(1)}%) — avaliar se é temporário (investimento, restruturação) ou estrutural.`);
  }
  if (f.beta != null) {
    if (f.beta > 1.3) out.push(`Beta de ${f.beta.toFixed(2)} indica volatilidade significativamente maior que o mercado — amplifica ganhos e perdas.`);
    else if (f.beta < 0.7) out.push(`Beta de ${f.beta.toFixed(2)} indica perfil defensivo — menos volátil que o mercado.`);
  }
  return out;
}

function analyzeCredit(c) {
  const out = [];
  if (c.debtToEquity != null) {
    if (c.debtToEquity > 200) out.push(`Alavancagem elevadíssima (D/E ${c.debtToEquity.toFixed(0)}%) — setor típico são utilities, bancos ou real estate; fora desses setores é risco material.`);
    else if (c.debtToEquity > 100) out.push(`Alavancagem elevada (D/E ${c.debtToEquity.toFixed(0)}%) — requer atenção à capacidade de pagamento, especialmente em ciclo de juros altos.`);
    else if (c.debtToEquity > 50) out.push(`Alavancagem moderada (D/E ${c.debtToEquity.toFixed(0)}%) é administrável na maioria dos setores.`);
    else if (c.debtToEquity >= 0) out.push(`Estrutura de capital conservadora (D/E ${c.debtToEquity.toFixed(0)}%) — baixa dependência de dívida reduz risco de refinanciamento.`);
  }
  if (c.currentRatio != null) {
    if (c.currentRatio < 1) out.push(`Current ratio de ${c.currentRatio.toFixed(2)} abaixo de 1 sugere desafio de liquidez de curto prazo — passivos circulantes superam ativos circulantes.`);
    else if (c.currentRatio > 2) out.push(`Current ratio de ${c.currentRatio.toFixed(2)} é confortável — folga em liquidez de curto prazo.`);
    else out.push(`Current ratio de ${c.currentRatio.toFixed(2)} é adequado — ativos circulantes cobrem passivos de curto prazo.`);
  }
  if (c.quickRatio != null && c.quickRatio < 0.7) {
    out.push(`Quick ratio de ${c.quickRatio.toFixed(2)} sinaliza que, excluindo estoques, a capacidade de pagar passivos imediatos é limitada.`);
  }
  if (c.interestCoverage != null) {
    if (c.interestCoverage < 1.5) out.push(`Cobertura de juros de ${c.interestCoverage.toFixed(1)}x é perigosamente baixa — empresa próxima de não conseguir cobrir despesa financeira com o operacional.`);
    else if (c.interestCoverage < 4) out.push(`Cobertura de juros de ${c.interestCoverage.toFixed(1)}x é apertada — em deterioração operacional, risco de default sobe rapidamente.`);
    else if (c.interestCoverage > 10) out.push(`Cobertura de juros de ${c.interestCoverage.toFixed(1)}x é muito confortável — geração operacional cobre despesa financeira múltiplas vezes.`);
  }
  if (out.length === 0) out.push('Dados de crédito limitados para análise narrativa. Consulte as métricas individuais.');
  return out;
}

function analyzeAnalystConsensus(recommendations, priceTarget, currentPrice) {
  const out = [];
  const latest = recommendations?.[0];
  if (latest) {
    const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;
    const positive = latest.strongBuy + latest.buy;
    const negative = latest.sell + latest.strongSell;
    const posPct = total > 0 ? (positive / total) * 100 : 0;
    if (total === 0) {
      out.push('Sem cobertura de analistas disponível neste período.');
    } else if (posPct > 70) {
      out.push(`${positive} de ${total} analistas recomendam compra (${posPct.toFixed(0)}%) — consenso fortemente construtivo.`);
    } else if (posPct > 50) {
      out.push(`Consenso moderadamente positivo: ${positive} de ${total} analistas (${posPct.toFixed(0)}%) recomendam compra.`);
    } else if (negative > positive) {
      out.push(`Consenso negativo: mais analistas recomendam venda (${negative}) do que compra (${positive}) entre ${total} cobrindo o ativo.`);
    } else {
      out.push(`Consenso misto (${positive} buy vs ${negative} sell de ${total} analistas) — divergência sinaliza incerteza sobre direção.`);
    }
  }
  if (priceTarget?.targetMean && currentPrice) {
    const upside = (priceTarget.targetMean / currentPrice - 1) * 100;
    const spread = priceTarget.targetHigh && priceTarget.targetLow ?
      ((priceTarget.targetHigh - priceTarget.targetLow) / priceTarget.targetMean) * 100 : null;
    if (upside > 20) out.push(`Price target médio implica upside de ${upside.toFixed(1)}% — analistas veem espaço significativo para alta.`);
    else if (upside > 5) out.push(`Price target médio implica upside moderado de ${upside.toFixed(1)}%.`);
    else if (upside > -5) out.push(`Price target médio próximo ao preço atual (${upside.toFixed(1)}% upside) — fair value precificado.`);
    else out.push(`Preço atual acima do target médio (${Math.abs(upside).toFixed(1)}% downside) — pode estar sobrevalorizado na visão do sell-side.`);
    if (spread && spread > 40) {
      out.push(`Dispersão alta entre targets (${spread.toFixed(0)}% entre máx e mín) — analistas discordam significativamente sobre o ativo.`);
    }
  }
  return out.length > 0 ? out : ['Sem dados suficientes de analistas para análise.'];
}

function analyzeRating(rating) {
  const out = [];
  if (rating.score == null) return ['Rating não calculável — dados insuficientes.'];
  const score = rating.score;
  const factors = rating.breakdown;
  if (score >= 75) out.push(`Score de ${score} coloca o ativo entre os mais atrativos da nossa metodologia — perfil combina valuation, crescimento, rentabilidade e saúde financeira.`);
  else if (score >= 60) out.push(`Score de ${score} indica perfil acima da média — sólido em alguns fatores mas com pontos a monitorar.`);
  else if (score >= 45) out.push(`Score de ${score} é neutro — qualidades e deficiências equilibram-se.`);
  else out.push(`Score de ${score} indica perfil abaixo da média — múltiplos fatores apontam cautela.`);

  const strongest = [...factors].sort((a, b) => b.score - a.score)[0];
  const weakest = [...factors].sort((a, b) => a.score - b.score)[0];
  if (strongest.score > 70) out.push(`${strongest.label} é o ponto mais forte (score ${strongest.score}/100).`);
  if (weakest.score < 45) out.push(`${weakest.label} é o ponto mais fraco (score ${weakest.score}/100) — requer atenção particular.`);
  return out;
}

/* ---------- Standard formatters ---------- */

function fmt(v, decimals = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(decimals);
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(1) + '%';
}

function formatCurrency(v, currency = 'USD') {
  if (v == null || isNaN(v)) return '—';
  const sym = currency === 'BRL' ? 'R$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return sym + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoney(v) {
  if (v == null || isNaN(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return '$' + (v / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6)  return '$' + (v / 1e6).toFixed(2) + 'M';
  return '$' + v.toLocaleString('en-US');
}


/* ============================================================
   18. COMPARADOR DE ATIVOS (genérico)
   ============================================================ */

// Metric definitions for comparison tables. Type determines what "better" means.
const COMPARE_METRICS_STOCK = {
  price: [
    { key: 'price',      label: 'Cotação',            get: d => d.quote?.c, fmt: (v, d) => formatCurrency(v, d.profile?.currency), dir: null },
    { key: 'marketcap',  label: 'Market Cap',         get: d => d.profile?.marketCapitalization, fmt: v => v ? formatMoney(v * 1e6) : '—', dir: null },
    { key: 'w52_high',   label: '52W High',           get: d => getMetric(d.metrics?.metric, '52WeekHigh'), fmt: (v, d) => formatCurrency(v, d.profile?.currency), dir: null },
    { key: 'w52_low',    label: '52W Low',            get: d => getMetric(d.metrics?.metric, '52WeekLow'), fmt: (v, d) => formatCurrency(v, d.profile?.currency), dir: null },
    { key: 'beta',       label: 'Beta',               get: d => getMetric(d.metrics?.metric, 'beta'), fmt: v => fmt(v, 2), dir: null },
  ],
  valuation: [
    { key: 'pe',         label: 'P/E (TTM)',          get: d => getFundamentalMetrics(d.metrics?.metric).pe, fmt: v => fmt(v, 2), dir: 'lower' },
    { key: 'pb',         label: 'P/B',                get: d => getFundamentalMetrics(d.metrics?.metric).pb, fmt: v => fmt(v, 2), dir: 'lower' },
    { key: 'ps',         label: 'P/S',                get: d => getFundamentalMetrics(d.metrics?.metric).ps, fmt: v => fmt(v, 2), dir: 'lower' },
    { key: 'dy',         label: 'Dividend Yield',     get: d => { const v = getFundamentalMetrics(d.metrics?.metric).dividendYield; return v != null ? v * 100 : null; }, fmt: v => v != null ? v.toFixed(2) + '%' : '—', dir: 'higher' },
  ],
  growth: [
    { key: 'rev5y',      label: 'Revenue Growth 5Y',  get: d => getFundamentalMetrics(d.metrics?.metric).revGrowth5Y, fmt: fmtPct, dir: 'higher' },
    { key: 'eps5y',      label: 'EPS Growth 5Y',      get: d => getFundamentalMetrics(d.metrics?.metric).epsGrowth5Y, fmt: fmtPct, dir: 'higher' },
  ],
  profitability: [
    { key: 'grossm',     label: 'Gross Margin',       get: d => getFundamentalMetrics(d.metrics?.metric).grossMargin, fmt: fmtPct, dir: 'higher' },
    { key: 'opm',        label: 'Operating Margin',   get: d => getFundamentalMetrics(d.metrics?.metric).operMargin, fmt: fmtPct, dir: 'higher' },
    { key: 'netm',       label: 'Net Margin',         get: d => getFundamentalMetrics(d.metrics?.metric).netMargin, fmt: fmtPct, dir: 'higher' },
    { key: 'roe',        label: 'ROE',                get: d => getFundamentalMetrics(d.metrics?.metric).roe, fmt: fmtPct, dir: 'higher' },
  ],
  credit: [
    { key: 'de',         label: 'Debt / Equity',      get: d => getCreditMetrics(d.metrics?.metric).debtToEquity, fmt: v => fmt(v, 2), dir: 'lower' },
    { key: 'cr',         label: 'Current Ratio',      get: d => getCreditMetrics(d.metrics?.metric).currentRatio, fmt: v => fmt(v, 2), dir: 'higher' },
  ],
  analyst: [
    { key: 'tgt_mean',   label: 'Target Mean',        get: d => d.priceTarget?.targetMean, fmt: v => formatCurrency(v), dir: null },
    { key: 'tgt_upside', label: 'Upside vs atual',    get: d => d.priceTarget?.targetMean && d.quote?.c ? ((d.priceTarget.targetMean / d.quote.c - 1) * 100) : null, fmt: v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—', dir: 'higher' },
    { key: 'rating',     label: 'Rating Proprietário',get: d => computeProprietaryRating(d.metrics).score, fmt: v => v != null ? `${v} (${ratingLabel(v)})` : '—', dir: 'higher' },
  ],
};

const COMPARE_METRICS_FII = {
  price: [
    { key: 'price',     label: 'Cotação',              get: d => d.regularMarketPrice, fmt: v => formatCurrency(v, 'BRL'), dir: null },
    { key: 'mktcap',    label: 'Valor de Mercado',     get: d => d.marketCap, fmt: v => v ? formatMoney(v) + ' BRL' : '—', dir: null },
  ],
  fii: [
    { key: 'dy',        label: 'DY (12m)',             get: d => d.dy12m, fmt: v => v != null ? v.toFixed(2) + '%' : '—', dir: 'higher' },
    { key: 'pvp',       label: 'P/VP',                 get: d => d.pvp, fmt: v => fmt(v, 2), dir: 'lower' },
    { key: 'lastdiv',   label: 'Último Dividendo',     get: d => d.lastDividend, fmt: v => v != null ? 'R$ ' + v.toFixed(4) : '—', dir: 'higher' },
    { key: 'divyield',  label: 'Div Yield (anualiz)',  get: d => d.dyAnualizada, fmt: v => v != null ? v.toFixed(2) + '%' : '—', dir: 'higher' },
    { key: 'pat',       label: 'Patrimônio Líquido',   get: d => d.patrimonio, fmt: v => v ? formatMoney(v) + ' BRL' : '—', dir: null },
    { key: 'vpcota',    label: 'VP / Cota',            get: d => d.vpCota, fmt: v => v != null ? 'R$ ' + v.toFixed(2) : '—', dir: null },
    { key: 'segment',   label: 'Segmento',             get: d => d.segment, fmt: v => v || '—', dir: null },
  ],
};

function renderSecurityCompare() {
  const tickers = state._compare_tickers || [];
  const dataMap = state._compare_data || {};

  return h('div', { class: 'content fade-up' }, [
    pageHead('Securities · Comparador', 'Comparar <em>Ativos</em>',
      'Adicione 2 a 4 tickers para comparar múltiplos, crescimento, rentabilidade e rating lado a lado. Destaque verde = melhor, vermelho = pior.'),

    h('div', { class: 'compare-add-box' }, [
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, [
        h('input', {
          type: 'text', id: 'compare-input',
          placeholder: 'Digite o ticker (ex: AAPL, MSFT, PETR4) e Enter',
          style: { flex: 1, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '14px', fontFamily: 'Geist, sans-serif' },
          onkeydown: (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const t = e.target.value.trim().toUpperCase();
              if (t) { addTickerToCompare(t); e.target.value = ''; }
            }
          },
        }),
        h('button', {
          class: 'btn-secondary',
          onClick: () => {
            const inp = document.getElementById('compare-input');
            if (inp.value.trim()) { addTickerToCompare(inp.value.trim().toUpperCase()); inp.value = ''; }
          },
        }, 'Adicionar'),
        tickers.length > 0 && h('button', {
          class: 'btn-secondary',
          onClick: () => { state._compare_tickers = []; state._compare_data = {}; render(); },
        }, 'Limpar tudo'),
      ]),
      tickers.length > 0 && h('div', { class: 'compare-tickers-chips' },
        tickers.map(t => h('span', { class: 'compare-chip' }, [
          t,
          h('span', {
            class: 'compare-chip-remove',
            onClick: () => removeTickerFromCompare(t),
          }, '×'),
        ]))
      ),
      h('div', { style: { fontSize: '11px', color: 'var(--text-faint)', marginTop: '10px', fontFamily: 'JetBrains Mono, monospace' } },
        'Máximo: 4 tickers simultâneos · Dados puxados em cache de 5 minutos por ticker'),
    ]),

    tickers.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum ativo no comparador'),
          h('p', { class: 'empty-desc' }, 'Adicione tickers acima para começar a comparar.'),
        ])
      : renderCompareTable(tickers, dataMap),
  ]);
}

function addTickerToCompare(ticker) {
  if (!state._compare_tickers) state._compare_tickers = [];
  if (state._compare_tickers.includes(ticker)) { showToast('Ticker já está no comparador'); return; }
  if (state._compare_tickers.length >= 4) { showToast('Máximo 4 tickers por vez', true); return; }
  state._compare_tickers.push(ticker);
  if (!state._compare_data) state._compare_data = {};

  // Load data if not cached
  if (!state._compare_data[ticker]) {
    const cached = SEC_CACHE[ticker];
    if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
      state._compare_data[ticker] = cached.data;
      render();
    } else {
      render();
      loadSecurityData(ticker).then(data => {
        state._compare_data[ticker] = data;
        render();
      }).catch(err => {
        showToast(`Erro ao carregar ${ticker}: ${err.message}`, true);
        state._compare_tickers = state._compare_tickers.filter(t => t !== ticker);
        render();
      });
    }
  } else {
    render();
  }
}

function removeTickerFromCompare(ticker) {
  state._compare_tickers = state._compare_tickers.filter(t => t !== ticker);
  render();
}

function renderCompareTable(tickers, dataMap) {
  const allLoaded = tickers.every(t => dataMap[t]);

  if (!allLoaded) {
    return h('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '8px' } }, 'Carregando dados dos ativos…'),
      h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } },
        `${tickers.filter(t => dataMap[t]).length}/${tickers.length} carregados`),
    ]);
  }

  const groups = Object.entries(COMPARE_METRICS_STOCK);
  const datas = tickers.map(t => dataMap[t]);

  return h('div', { class: 'compare-table-wrap' }, [
    h('table', { class: 'compare-table' }, [
      h('thead', {}, [
        h('tr', {}, [
          h('th', { class: 'metric-name' }, 'Métrica'),
          ...tickers.map(t => {
            const d = dataMap[t];
            return h('th', { class: 'ticker-col' }, [
              h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--amber)', textAlign: 'right' } }, t),
              h('div', { style: { fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px', textTransform: 'none', letterSpacing: 'normal' } },
                (d.profile?.name || '').substring(0, 25)),
            ]);
          }),
        ]),
      ]),
      h('tbody', {}, groups.flatMap(([groupKey, metrics]) => {
        const groupLabel = { price: 'Preço & Risco', valuation: 'Valuation', growth: 'Crescimento', profitability: 'Rentabilidade', credit: 'Saúde Financeira', analyst: 'Analistas & Rating' }[groupKey] || groupKey;
        return [
          h('tr', { class: 'group-header' }, [
            h('td', { colspan: String(tickers.length + 1) }, groupLabel),
          ]),
          ...metrics.map(m => {
            const values = datas.map(d => m.get(d));
            const numericValues = values.filter(v => v != null && typeof v === 'number' && !isNaN(v));
            let bestIdx = -1, worstIdx = -1;
            if (m.dir && numericValues.length >= 2) {
              const best = m.dir === 'higher' ? Math.max(...numericValues) : Math.min(...numericValues);
              const worst = m.dir === 'higher' ? Math.min(...numericValues) : Math.max(...numericValues);
              if (best !== worst) {
                bestIdx = values.findIndex(v => v === best);
                worstIdx = values.findIndex(v => v === worst);
              }
            }
            return h('tr', {}, [
              h('td', { class: 'metric-name' }, m.label),
              ...values.map((v, i) => {
                const cls = i === bestIdx ? 'value-cell best' : i === worstIdx ? 'value-cell worst' : 'value-cell';
                return h('td', { class: cls }, m.fmt(v, datas[i]) || '—');
              }),
            ]);
          }),
        ];
      })),
    ]),
  ]);
}

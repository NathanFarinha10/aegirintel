
/* ============================================================
   16. MACRO & RATES (BCB Olinda / SGS API)
   ============================================================ */

const BCB_SGS_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';
const IPEA_BASE = 'https://www.ipeadata.gov.br/api/odata4';

// CORS proxies — on HTTPS (Netlify), direct usually works; proxies as fallback
const MACRO_PROXIES = [
  (url) => url, // direct first (works on HTTPS origins)
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchWithProxyFallback(url) {
  const errors = [];
  for (const makeUrl of MACRO_PROXIES) {
    try {
      const finalUrl = makeUrl(url);
      const res = await fetchWithTimeout(finalUrl, 10000);
      if (!res.ok) {
        errors.push(`${finalUrl.substring(0, 60)}… → ${res.status}`);
        continue;
      }
      const text = await res.text();
      // Validate JSON before returning
      try {
        return JSON.parse(text);
      } catch {
        errors.push(`${finalUrl.substring(0, 60)}… → JSON inválido`);
        continue;
      }
    } catch (e) {
      errors.push(e.name === 'AbortError' ? 'timeout' : e.message);
    }
  }
  throw new Error(`Falha após ${MACRO_PROXIES.length} tentativas: ${errors.join(' | ')}`);
}

// Series codes do BCB SGS — fonte oficial: https://dadosabertos.bcb.gov.br/
const BCB_SERIES = {
  // === Juros ===
  selic:     { code: 432,   name: 'SELIC Meta',           group: 'rates',    unit: '% a.a.',   decimals: 2 },
  cdi:       { code: 4389,  name: 'CDI',                  group: 'rates',    unit: '% a.a.',   decimals: 2, name2: 'Taxa DI anualizada' },
  ipca:      { code: 433,   name: 'IPCA',                 group: 'inflation', unit: '% mensal', decimals: 2 },
  ipca12m:   { code: 13522, name: 'IPCA acumulado 12m',   group: 'inflation', unit: '% a.a.',   decimals: 2 },
  igpm:      { code: 189,   name: 'IGP-M',                group: 'inflation', unit: '% mensal', decimals: 2, name2: 'IGP-M (FGV)' },
  // === Real Estate — Preços & Custos ===
  incc:      { code: 192,   name: 'INCC-M',               group: 'realestate', unit: '% mensal', decimals: 2 },
  ivgr:      { code: 21340, name: 'IVG-R (Valor Garantias Residenciais)', group: 'realestate', unit: 'índice', decimals: 2, name2: 'Mediana dos valores de avaliação' },
  // === Real Estate — Saldo de Crédito ===
  credimob:  { code: 20714, name: 'Saldo Crédito Imob. Total',  group: 're_saldo', unit: 'R$ mi', decimals: 0 },
  credimobPF:{ code: 20612, name: 'Saldo Crédito Imob. PF',     group: 're_saldo', unit: 'R$ mi', decimals: 0 },
  credimobPJ:{ code: 20600, name: 'Saldo Crédito Imob. PJ',     group: 're_saldo', unit: 'R$ mi', decimals: 0 },
  // === Real Estate — Concessões (fluxo mensal) ===
  concImobPF:     { code: 20704, name: 'Concessões Imob. PF Total',    group: 're_concessao', unit: 'R$ mi', decimals: 0 },
  concImobPFMerc: { code: 20702, name: 'Concessões Imob. PF Mercado',  group: 're_concessao', unit: 'R$ mi', decimals: 0, name2: 'Taxas de mercado (SFI)' },
  concImobPFReg:  { code: 20700, name: 'Concessões Imob. PF Regulado', group: 're_concessao', unit: 'R$ mi', decimals: 0, name2: 'Taxas reguladas (SFH)' },
  concImobPJ:     { code: 20692, name: 'Concessões Imob. PJ Total',    group: 're_concessao', unit: 'R$ mi', decimals: 0 },
  concImobPJMerc: { code: 20690, name: 'Concessões Imob. PJ Mercado',  group: 're_concessao', unit: 'R$ mi', decimals: 0 },
  // === Real Estate — Taxas de Juros ===
  txImobPF:     { code: 25497, name: 'Taxa Imob. PF Total',       group: 're_taxas', unit: '% a.a.', decimals: 2, name2: 'Média ponderada' },
  txImobPFMerc: { code: 20772, name: 'Taxa Imob. PF Mercado',     group: 're_taxas', unit: '% a.a.', decimals: 2, name2: 'SFI / taxas livres' },
  txImobPFReg:  { code: 20770, name: 'Taxa Imob. PF Regulado',    group: 're_taxas', unit: '% a.a.', decimals: 2, name2: 'SFH / taxas reguladas' },
  txImobPJMerc: { code: 20761, name: 'Taxa Imob. PJ Mercado',     group: 're_taxas', unit: '% a.a.', decimals: 2 },
  // === Real Estate — Inadimplência ===
  inadImobPF:   { code: 21112, name: 'Inadimplência Imob. PF',    group: 're_inadimp', unit: '%', decimals: 2 },
  inadImobPJ:   { code: 21100, name: 'Inadimplência Imob. PJ',    group: 're_inadimp', unit: '%', decimals: 2 },
  // === Real Estate — Poupança / SBPE ===
  poupSaldo:    { code: 7456,  name: 'Saldo Poupança SBPE',       group: 're_sbpe', unit: 'R$ mi', decimals: 0, name2: 'Base de funding imobiliário' },
  poupCaptLiq:  { code: 7455,  name: 'Captação Líquida Poupança', group: 're_sbpe', unit: 'R$ mi', decimals: 0, name2: 'Entradas - saídas' },
  // === FX ===
  usd_venda: { code: 1,     name: 'USD/BRL Comercial',    group: 'fx',       unit: 'R$',       decimals: 4 },
  // === Atividade ===
  ibcbr:     { code: 24364, name: 'IBC-BR',               group: 'activity',  unit: 'índice',  decimals: 2, name2: 'Atividade Econômica (dessaz.)' },
  // === Crédito Geral ===
  inadi:     { code: 21082, name: 'Inadimplência PF Livre', group: 'credit', unit: '%',        decimals: 2 },
  inadipj:   { code: 21083, name: 'Inadimplência PJ Livre', group: 'credit', unit: '%',        decimals: 2 },
  inadhabit: { code: 21146, name: 'Inadimplência Habitacional (SCR)', group: 'credit', unit: '%', decimals: 2 },
  spreadTot: { code: 20783, name: 'Spread Bancário Total', group: 'credit',   unit: 'p.p.',    decimals: 2 },
  // === Confiança ===
  icc:       { code: 4393,  name: 'Confiança Consumidor', group: 'activity', unit: 'índice', decimals: 1, name2: 'Expectativa do Consumidor' },
};

async function fetchBCBSeries(code, lastN = 24) {
  // Strategy: Netlify proxy (SGS) → Netlify proxy (Olinda) → direct (local dev)
  const proxyUrl = `/api-proxy?source=bcb&code=${code}&last=${lastN}`;
  const olindaUrl = `/api-proxy?source=bcb_olinda&code=${code}&last=${lastN}`;
  const directUrl = `${BCB_SGS_BASE}.${code}/dados/ultimos/${lastN}?formato=json`;

  const urls = [proxyUrl, olindaUrl, directUrl];
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, 15000);
      if (!res.ok) continue;
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { continue; }

      // SGS format: [{data: "dd/MM/yyyy", valor: "1.23"}, ...]
      if (Array.isArray(data) && data.length > 0 && data[0].data != null) {
        return data.map(row => ({
          date: row.data,
          value: parseFloat(String(row.valor).replace(',', '.')),
        }));
      }

      // Olinda format: { value: [{SERCODIGO: "432", VALDATA: "2024-01-01", VALVALOR: 1.23}, ...] }
      if (data.value && Array.isArray(data.value)) {
        return data.value.map(row => ({
          date: row.VALDATA ? row.VALDATA.substring(0, 10).replace(/-/g, '/').split('/').reverse().join('/') : '',
          value: parseFloat(row.VALVALOR),
        })).filter(r => !isNaN(r.value));
      }

      // Proxy error envelope
      if (data.error) { console.warn(`BCB ${code}:`, data.error); continue; }
    } catch (err) {
      console.warn(`BCB ${code} via ${url.substring(0, 60)}:`, err.message);
    }
  }
  console.warn(`BCB série ${code}: todas tentativas falharam`);
  return null;
}

async function loadAllBCBSeries() {
  // Cache for 1 hour
  const cached = DB.macroCache;
  if (cached && (Date.now() - cached.timestamp) < 60 * 60 * 1000) {
    return cached.series;
  }

  const entries = Object.entries(BCB_SERIES);
  // Load in batches of 4 to avoid overwhelming
  const series = {};
  const batchSize = 4;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(([key, meta]) => fetchBCBSeries(meta.code, 24).then(data => [key, data]))
    );
    for (const [key, data] of results) series[key] = data;
  }

  DB.macroCache = { timestamp: Date.now(), series };
  saveDB(DB);
  return series;
}

/* ---------- IPEA Data integration (complementary to BCB) ---------- */

const IPEA_SERIES = {
  // Fipezap — price residential (monthly variation)
  fipezap:    { code: 'IGP12_IPCA12', name: 'IPCA (IPEA)', group: 'inflation', unit: '% mensal', decimals: 2 },
  // Note: IPEA has thousands of series. Only adding key ones not in BCB.
  // If CORS fails on IPEA, these series are silently skipped (not critical).
};

async function fetchIPEASeries(code, lastN = 24) {
  // IPEA OData endpoint — returns last N observations
  const url = `https://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${code}')?$orderby=VALDATA%20desc&$top=${lastN}`;
  try {
    const data = await fetchWithProxyFallback(url);
    if (!data.value || !Array.isArray(data.value)) return null;
    // IPEA returns most recent first; reverse to get chronological order
    return data.value.reverse().map(row => ({
      date: row.VALDATA ? row.VALDATA.split('T')[0] : '',
      value: parseFloat(row.VALVALOR),
    }));
  } catch (err) {
    console.warn(`IPEA série ${code} falhou:`, err.message);
    return null;
  }
}

/* ---------- Computed indicators (cross-series calculations) ---------- */

// Takes the BCB series object and computes derived indicators used in the dashboards
function computeMacroIndicators(series) {
  const out = {};
  const latest = (key) => {
    const data = series[key];
    return data && data.length > 0 ? data[data.length - 1].value : null;
  };
  const avg = (key, n) => {
    const data = series[key];
    if (!data || data.length < n) return null;
    const slice = data.slice(-n);
    return slice.reduce((a, b) => a + b.value, 0) / slice.length;
  };

  // Juros real ex-post (SELIC nominal - IPCA 12m)
  const selic = latest('selic');
  const ipca12m = latest('ipca12m');
  out.jurosReal = (selic != null && ipca12m != null) ? (selic - ipca12m) : null;

  // Spread de custo de construção (INCC 12m - IPCA 12m)
  // INCC is monthly; need to sum last 12 to approximate 12m
  const inccData = series.incc;
  let incc12m = null;
  if (inccData && inccData.length >= 12) {
    incc12m = inccData.slice(-12).reduce((acc, r) => acc * (1 + r.value / 100), 1);
    incc12m = (incc12m - 1) * 100;
  }
  out.incc12m = incc12m;
  out.spreadConstrucao = (incc12m != null && ipca12m != null) ? (incc12m - ipca12m) : null;

  // IGP-M 12m acumulado
  const igpmData = series.igpm;
  let igpm12m = null;
  if (igpmData && igpmData.length >= 12) {
    igpm12m = igpmData.slice(-12).reduce((acc, r) => acc * (1 + r.value / 100), 1);
    igpm12m = (igpm12m - 1) * 100;
  }
  out.igpm12m = igpm12m;

  // Crescimento do crédito imobiliário (YoY)
  const credimobData = series.credimob;
  if (credimobData && credimobData.length >= 13) {
    const now = credimobData[credimobData.length - 1].value;
    const ago = credimobData[credimobData.length - 13].value;
    out.credimobYoY = ago > 0 ? ((now / ago) - 1) * 100 : null;
  }

  // Tendência de inadimplência PF (3m avg vs 12m avg)
  const inadData = series.inadi;
  if (inadData && inadData.length >= 12) {
    const last3 = inadData.slice(-3).reduce((a, b) => a + b.value, 0) / 3;
    const last12 = inadData.slice(-12).reduce((a, b) => a + b.value, 0) / 12;
    out.inadimplenciaTrend = last3 - last12; // positive = piorando
  }

  // Trend de atividade (IBC-BR)
  const ibcData = series.ibcbr;
  if (ibcData && ibcData.length >= 12) {
    const last = ibcData[ibcData.length - 1].value;
    const ago = ibcData[ibcData.length - 12].value;
    out.atividadeYoY = ago > 0 ? ((last / ago) - 1) * 100 : null;
  }

  return out;
}

/* ---------- Cycle indicators (rule-based) ---------- */

// Real Estate cycle: 4 phases based on cost, rates, credit, activity signals
function computeRealEstateCycle(indicators) {
  const signals = [];
  const confidence_factors = [];

  // Signal 1: Juros real
  if (indicators.jurosReal != null) {
    if (indicators.jurosReal > 7) { signals.push('contraction'); confidence_factors.push('Juros real >7% (muito aperto)'); }
    else if (indicators.jurosReal > 4) { signals.push('maturation'); confidence_factors.push('Juros real 4-7% (restritivo)'); }
    else if (indicators.jurosReal > 2) { signals.push('expansion'); confidence_factors.push('Juros real 2-4% (neutro)'); }
    else { signals.push('expansion'); confidence_factors.push('Juros real <2% (estímulo)'); }
  }

  // Signal 2: Spread INCC vs IPCA (custos de construção)
  if (indicators.spreadConstrucao != null) {
    if (indicators.spreadConstrucao > 3) { signals.push('contraction'); confidence_factors.push('INCC >3pp acima IPCA (custos pressionados)'); }
    else if (indicators.spreadConstrucao > 1) { signals.push('maturation'); confidence_factors.push('INCC acima IPCA (pressão moderada)'); }
    else { signals.push('expansion'); confidence_factors.push('INCC em linha com IPCA (custos estáveis)'); }
  }

  // Signal 3: Crescimento do crédito imobiliário
  if (indicators.credimobYoY != null) {
    if (indicators.credimobYoY > 15) { signals.push('expansion'); confidence_factors.push('Crédito imob. YoY >15% (forte expansão)'); }
    else if (indicators.credimobYoY > 8) { signals.push('expansion'); confidence_factors.push('Crédito imob. YoY 8-15% (expansão)'); }
    else if (indicators.credimobYoY > 3) { signals.push('maturation'); confidence_factors.push('Crédito imob. YoY 3-8% (desacelerando)'); }
    else { signals.push('contraction'); confidence_factors.push('Crédito imob. YoY <3% (contração)'); }
  }

  // Signal 4: Atividade econômica
  if (indicators.atividadeYoY != null) {
    if (indicators.atividadeYoY > 2) { signals.push('expansion'); confidence_factors.push('IBC-Br YoY >2% (crescimento)'); }
    else if (indicators.atividadeYoY > 0) { signals.push('maturation'); confidence_factors.push('IBC-Br YoY 0-2% (estagnação)'); }
    else { signals.push('contraction'); confidence_factors.push('IBC-Br YoY <0% (recessão)'); }
  }

  // Signal 5: Inadimplência habitacional (trend)
  if (indicators.inadimplenciaTrend != null) {
    if (indicators.inadimplenciaTrend > 0.3) { signals.push('contraction'); confidence_factors.push('Inadimplência piorando (+0.3pp trend)'); }
    else if (indicators.inadimplenciaTrend < -0.3) { signals.push('expansion'); confidence_factors.push('Inadimplência caindo'); }
    else { signals.push('maturation'); confidence_factors.push('Inadimplência estável'); }
  }

  if (signals.length === 0) return null;

  // Determine phase by majority
  const counts = { expansion: 0, maturation: 0, contraction: 0, recovery: 0 };
  signals.forEach(s => counts[s] = (counts[s] || 0) + 1);
  const phase = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const confidence = Math.round((counts[phase] / signals.length) * 100);

  return { phase, confidence, signals_count: signals.length, factors: confidence_factors };
}

// Credit cycle: based on rates, spreads, default rates, credit growth
function computeCreditCycle(indicators, series) {
  const signals = [];
  const factors = [];

  if (indicators.jurosReal != null) {
    if (indicators.jurosReal > 6) { signals.push('tight'); factors.push('Juros real alto (>6%) — custo de capital elevado'); }
    else if (indicators.jurosReal > 3) { signals.push('neutral'); factors.push('Juros real moderado (3-6%)'); }
    else { signals.push('loose'); factors.push('Juros real baixo (<3%) — estímulo a crédito'); }
  }

  // Spread bancário
  const spreadData = series.spreadTot;
  if (spreadData && spreadData.length >= 6) {
    const now = spreadData[spreadData.length - 1].value;
    const ago = spreadData[spreadData.length - 6].value;
    const spreadTrend = now - ago;
    if (spreadTrend > 2) { signals.push('tight'); factors.push('Spread bancário subindo (+2pp em 6m)'); }
    else if (spreadTrend < -2) { signals.push('loose'); factors.push('Spread bancário caindo'); }
    else { signals.push('neutral'); factors.push('Spread bancário estável'); }
  }

  // Inadimplência PJ
  const inadpjData = series.inadipj;
  if (inadpjData && inadpjData.length >= 3) {
    const last3 = inadpjData.slice(-3).reduce((a, b) => a + b.value, 0) / 3;
    const last12 = inadpjData.length >= 12 ? inadpjData.slice(-12).reduce((a, b) => a + b.value, 0) / 12 : last3;
    const trend = last3 - last12;
    if (trend > 0.3) { signals.push('tight'); factors.push('Inadimplência PJ piorando'); }
    else if (trend < -0.3) { signals.push('loose'); factors.push('Inadimplência PJ melhorando'); }
    else { signals.push('neutral'); factors.push('Inadimplência PJ estável'); }
  }

  if (signals.length === 0) return null;
  const counts = {};
  signals.forEach(s => counts[s] = (counts[s] || 0) + 1);
  const phase = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const confidence = Math.round((counts[phase] / signals.length) * 100);
  return { phase, confidence, signals_count: signals.length, factors };
}

const CYCLE_PHASE_LABELS = {
  expansion:   { label: 'Expansão',    color: 'var(--green)',  desc: 'Indicadores sugerem ambiente favorável para Real Estate — crédito abundante, custos controlados.' },
  maturation:  { label: 'Maturação',   color: '#d4a574',       desc: 'Ciclo amadurecendo — manter cautela, ativos de melhor qualidade ganham relevância.' },
  contraction: { label: 'Contração',   color: 'var(--red)',    desc: 'Indicadores desfavoráveis — cautela elevada, oportunidades pontuais em ativos descontados.' },
  recovery:    { label: 'Recuperação', color: '#7a8aa5',       desc: 'Sinais de retomada após contração — momento de posicionamento gradual.' },
  tight:       { label: 'Aperto',      color: 'var(--red)',    desc: 'Condições de crédito apertadas — preferência por pré-fixados curtos, qualidade de crédito alta.' },
  neutral:     { label: 'Neutro',      color: '#d4a574',       desc: 'Condições equilibradas — carry trade moderado, diversificação de indexadores.' },
  loose:       { label: 'Flexível',    color: 'var(--green)',  desc: 'Condições favoráveis — apetite por spreads mais amplos, duration mais longa.' },
};

/* ---------- Rendering: Dashboard overview ---------- */

function renderMacroDashboard() {
  const series = state._macro_series;
  const loading = state._macro_loading;
  const error = state._macro_error;

  // Trigger load if needed
  if (!series && !loading && !error) {
    state._macro_loading = true;
    loadAllBCBSeries().then(s => {
      state._macro_series = s;
      state._macro_loading = false;
      const allNull = Object.values(s).every(v => v === null);
      if (allNull) {
        state._macro_error = 'Não foi possível conectar com o BCB após tentativa via todos os proxies.';
      }
      render();
    }).catch(err => {
      state._macro_loading = false;
      state._macro_error = err.message;
      render();
    });
  }

  const indicators = series ? computeMacroIndicators(series) : null;
  const reCycle = indicators ? computeRealEstateCycle(indicators) : null;
  const credCycle = (series && indicators) ? computeCreditCycle(indicators, series) : null;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Dashboard', 'Macro <em>Intelligence</em>',
      'Inteligência macroeconômica para tomada de decisão em Real Estate e Crédito Privado. Séries do BCB e indicadores derivados calculados automaticamente. Cache de 1 hora.'),

    renderMacroStatusBar(loading, error, series),

    error && renderMacroError(error),

    series && !error && h('div', {}, [
      // Top: Central bank widgets (latest decisions)
      renderCBWidgets(),

      // Cycle indicators
      renderCycleCards(reCycle, credCycle),

      // Key Rates
      renderMacroSection('Juros Nominais & Reais', [
        { key: 'selic',    series },
        { key: 'cdi',      series },
        { key: 'ipca12m',  series },
        { key: 'igpm',     series },
      ], indicators, ['jurosReal']),

      // Real Estate block
      renderMacroSection('Real Estate', [
        { key: 'incc',      series },
        { key: 'ivgr',      series },
        { key: 'credimob',  series },
        { key: 'inadhabit', series },
      ], indicators, ['incc12m', 'spreadConstrucao', 'credimobYoY']),

      // Credit block
      renderMacroSection('Crédito', [
        { key: 'inadi',    series },
        { key: 'inadipj',  series },
        { key: 'spreadTot', series },
      ], indicators, ['inadimplenciaTrend']),

      // Activity & FX
      renderMacroSection('Atividade & Câmbio', [
        { key: 'ibcbr',     series },
        { key: 'icc',       series },
        { key: 'usd_venda', series },
      ], indicators, ['atividadeYoY']),
    ]),
  ]);
}

function renderMacroStatusBar(loading, error, series) {
  return h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
    h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } },
      DB.macroCache ? `Última atualização: ${new Date(DB.macroCache.timestamp).toLocaleString('pt-BR')}` : ''),
    h('div', { style: { display: 'flex', gap: '8px' } }, [
      loading && h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--amber)' } }, 'carregando séries via BCB…'),
      series && h('button', {
        class: 'btn-secondary',
        onClick: () => runMacroCommentary(),
      }, '✨ Gerar leitura macro'),
      h('button', {
        class: 'btn-secondary',
        onClick: () => {
          DB.macroCache = null;
          saveDB(DB);
          state._macro_series = null;
          state._macro_loading = false;
          state._macro_error = null;
          state._macro_commentary = null;
          render();
        },
      }, '↻ Atualizar dados'),
    ]),
  ]);
}

function renderMacroError(error) {
  return h('div', { class: 'empty' }, [
    h('div', { class: 'empty-title' }, 'Falha ao carregar indicadores'),
    h('p', { class: 'empty-desc' }, error),
    h('div', { style: { marginTop: '16px', padding: '14px 18px', background: 'var(--bg-2)', border: '1px dashed var(--border)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'left' } }, [
      h('strong', { style: { color: 'var(--text)' } }, 'Possíveis causas:'),
      h('ul', { style: { marginTop: '8px', paddingLeft: '20px', lineHeight: '1.7' } }, [
        h('li', {}, 'Rodando como file:// — alguns proxies bloqueiam essa origem'),
        h('li', {}, 'BCB temporariamente indisponível'),
        h('li', {}, 'Proxies públicos (corsproxy.io, allorigins, codetabs) fora do ar'),
      ]),
      h('p', { style: { marginTop: '10px' } }, 'Solução: sirva o arquivo via HTTP local. No terminal: '),
      h('pre', { style: { background: 'var(--bg-3)', padding: '10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', marginTop: '6px' } },
        'python3 -m http.server 8000\n\ne abra: http://localhost:8000/aegir-intel.html'),
    ]),
    h('button', {
      class: 'btn-secondary',
      style: { marginTop: '20px' },
      onClick: () => {
        state._macro_error = null;
        state._macro_series = null;
        DB.macroCache = null;
        saveDB(DB);
        render();
      },
    }, 'Tentar novamente'),
  ]);
}

function renderCycleCards(reCycle, credCycle) {
  return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' } }, [
    renderCycleCard('Ciclo Imobiliário', reCycle, 'realestate'),
    renderCycleCard('Ciclo de Crédito', credCycle, 'credit'),
  ]);
}

function renderCycleCard(title, cycle, kind) {
  if (!cycle) {
    return h('div', { class: 'cycle-card' }, [
      h('div', { class: 'cycle-card-title' }, title),
      h('div', { class: 'cycle-card-empty' }, 'Dados insuficientes para calcular'),
    ]);
  }
  const meta = CYCLE_PHASE_LABELS[cycle.phase];
  return h('div', { class: 'cycle-card' }, [
    h('div', { class: 'cycle-card-head' }, [
      h('div', { class: 'cycle-card-title' }, title),
      h('div', { class: 'cycle-card-confidence' }, `${cycle.confidence}% · ${cycle.signals_count} sinais`),
    ]),
    h('div', { class: 'cycle-card-phase', style: { color: meta.color } }, meta.label),
    h('div', { class: 'cycle-card-desc' }, meta.desc),
    h('details', { style: { marginTop: '10px' } }, [
      h('summary', { style: { cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em' } }, 'Sinais considerados'),
      h('ul', { style: { margin: '10px 0 0 0', paddingLeft: '18px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.7' } },
        cycle.factors.map(f => h('li', {}, f))),
    ]),
  ]);
}

function renderMacroSection(label, items, indicators, indicatorKeys) {
  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, label),
    h('div', { class: 'macro-rate-grid' }, items.map(({ key, series }) => renderMacroCard(key, series))),
    indicatorKeys && indicatorKeys.length > 0 && renderDerivedIndicators(indicators, indicatorKeys),
  ]);
}

function renderMacroCard(key, series) {
  const meta = BCB_SERIES[key];
  const data = series[key];
  const latest = data && data.length > 0 ? data[data.length - 1] : null;
  const previous = data && data.length > 1 ? data[data.length - 2] : null;
  const delta = latest && previous ? latest.value - previous.value : null;

  return h('div', { class: 'macro-rate-card' }, [
    h('div', { class: 'macro-rate-label' }, meta.unit),
    h('div', { class: 'macro-rate-name' }, meta.name2 || meta.name),
    latest
      ? h('div', { class: 'macro-rate-value' }, formatMacroValue(latest.value, meta))
      : h('div', { class: 'macro-rate-value loading' }, 'Indisponível'),
    latest && h('div', { class: 'macro-rate-date' }, [
      latest.date,
      delta != null && h('span', { style: { marginLeft: '12px', color: delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--green)' : 'var(--text-faint)' } },
        `${delta > 0 ? '↑' : delta < 0 ? '↓' : '='} ${Math.abs(delta).toFixed(2)}`),
    ]),
    data && data.length > 3 && h('div', { class: 'macro-rate-sparkline' }, [buildSparkline(data.map(d => d.value))]),
  ]);
}

const DERIVED_META = {
  jurosReal:          { label: 'Juros Real ex-post', desc: 'SELIC nominal - IPCA 12m. Se >4%, ambiente restritivo; <2%, estímulo.', fmt: v => v != null ? v.toFixed(2) + '%' : '—', unit: '% a.a.' },
  incc12m:            { label: 'INCC acumulado 12m', desc: 'Variação acumulada dos custos de construção nos últimos 12 meses.', fmt: v => v != null ? v.toFixed(2) + '%' : '—', unit: '% a.a.' },
  spreadConstrucao:   { label: 'Spread Construção (INCC-IPCA)', desc: 'Quanto custos de construção rodam acima da inflação geral. >3pp pressiona margens.', fmt: v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(2) + ' p.p.' : '—', unit: 'p.p.' },
  igpm12m:            { label: 'IGP-M acumulado 12m', desc: 'Inflação de atacado. Referência para reajuste de aluguéis comerciais.', fmt: v => v != null ? v.toFixed(2) + '%' : '—', unit: '% a.a.' },
  credimobYoY:        { label: 'Crédito Imob. YoY', desc: 'Crescimento do saldo de crédito imobiliário vs 12 meses atrás.', fmt: v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—', unit: '% a.a.' },
  inadimplenciaTrend: { label: 'Tendência Inadimplência PF', desc: 'Média 3m vs média 12m. Positivo = deterioração; negativo = melhora.', fmt: v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(2) + ' p.p.' : '—', unit: 'p.p.' },
  atividadeYoY:       { label: 'Atividade YoY (IBC-Br)', desc: 'Proxy mensal do PIB. Tendência de crescimento da economia.', fmt: v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(2) + '%' : '—', unit: '% a.a.' },
};

function renderDerivedIndicators(indicators, keys) {
  if (!indicators) return null;
  const rows = keys.filter(k => DERIVED_META[k] && indicators[k] != null);
  if (rows.length === 0) return null;

  return h('div', { class: 'derived-indicators' }, [
    h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px' } }, 'Indicadores derivados'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' } },
      rows.map(k => {
        const meta = DERIVED_META[k];
        const v = indicators[k];
        return h('div', { class: 'derived-card' }, [
          h('div', { class: 'derived-label' }, meta.label),
          h('div', { class: 'derived-value' }, meta.fmt(v)),
          h('div', { class: 'derived-desc' }, meta.desc),
        ]);
      })
    ),
  ]);
}

/* ---------- Real Estate Lens ---------- */

function renderRealEstateLens() {
  const series = state._macro_series;
  const imob = state._bcb_imob;
  const loading = state._bcb_imob_loading;

  // Ensure macro series are loading
  if (!series && !state._macro_loading && !state._macro_error) {
    state._macro_loading = true;
    loadAllBCBSeries().then(s => { state._macro_series = s; state._macro_loading = false; render(); })
      .catch(err => { state._macro_loading = false; state._macro_error = err.message; render(); });
  }

  // Load BCB Mercado Imobiliário OData
  if (!imob && !loading) {
    state._bcb_imob_loading = true;
    loadBCBImobData().then(d => {
      state._bcb_imob = d;
      state._bcb_imob_loading = false;
      render();
    }).catch(err => {
      state._bcb_imob_loading = false;
      console.warn('BCB Imob error:', err.message);
      render();
    });
  }

  const activeTab = state._re_tab || 'fontes';
  const indicators = series ? computeMacroIndicators(series) : null;
  const cycle = indicators ? computeRealEstateCycle(indicators) : null;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Mercado Imobiliário', 'Mercado <em>Imobiliário</em>',
      'Réplica do painel BCB — Informações do Mercado Imobiliário. Fontes de recursos, direcionamento, dados contábeis, contratação PF/PJ, imóveis e índices. 4000+ séries da API OData BCB.'),

    // Status bar
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } },
        loading ? 'Carregando dados do Mercado Imobiliário…' :
        imob ? `${Object.keys(imob).length} séries carregadas · fonte: BCB/Desig OData` : 'Dados não carregados'),
      h('button', { class: 'btn-secondary', style: { fontSize: '10px' }, onClick: () => {
        state._bcb_imob = null; state._bcb_imob_loading = false;
        DB.bcbImobCache = null; saveDB(DB);
        render();
      }}, '↻ Atualizar'),
    ]),

    // Cycle card (from existing macro data)
    cycle && h('div', { style: { marginBottom: '20px' } }, [renderCycleCard('Fase do Ciclo Imobiliário', cycle, 'realestate')]),

    // Tab navigation — matching BCB panel sections
    h('div', { class: 'sec-tab-row', style: { marginBottom: '20px' } },
      [
        ['fontes',       'Fontes de Recursos'],
        ['direcionamento','Direcionamento'],
        ['contabil',     'Contábil'],
        ['contratacao',  'Contratação'],
        ['indices',      'Índices & Preços'],
        ['credito_sgs',  'Crédito (SGS)'],
      ].map(([key, label]) => h('button', {
        class: 'sec-tab' + (activeTab === key ? ' active' : ''),
        onClick: () => { state._re_tab = key; render(); },
      }, label))
    ),

    // Tab content
    activeTab === 'fontes' ? renderImobFontes(imob) :
    activeTab === 'direcionamento' ? renderImobDirecionamento(imob) :
    activeTab === 'contabil' ? renderImobContabil(imob) :
    activeTab === 'contratacao' ? renderImobContratacao(imob) :
    activeTab === 'indices' ? renderImobIndices(series) :
    activeTab === 'credito_sgs' ? renderImobCreditoSGS(series) : null,

    // Gemini commentary
    h('div', { style: { display: 'flex', justifyContent: 'center', marginTop: '32px' } }, [
      h('button', { class: 'btn-primary', onClick: () => runMacroCommentary('realestate') }, '✨ Gerar leitura Real Estate via Gemini'),
    ]),
    state._macro_commentary?.realestate && renderMacroCommentaryBox(state._macro_commentary.realestate, 'Leitura Real Estate'),
  ]);
}

/* ---------- BCB Mercado Imobiliário OData Fetch ---------- */

// Series names from the BCB OData API (matching panel sections)
const BCB_IMOB_SERIES = {
  // Fontes de Recursos
  fontes_sbpe:                 { section: 'fontes', label: 'SBPE Estoque', unit: 'R$ bi' },
  fontes_titulo_cri:           { section: 'fontes', label: 'CRI Estoque', unit: 'R$ bi' },
  fontes_titulo_lci:           { section: 'fontes', label: 'LCI Estoque', unit: 'R$ bi' },
  fontes_titulo_lh:            { section: 'fontes', label: 'LH Estoque', unit: 'R$ bi' },
  fontes_titulo_lig:           { section: 'fontes', label: 'LIG Estoque', unit: 'R$ bi' },
  // Direcionamento
  direcionamento_aplicacao:    { section: 'direcionamento', label: 'Aplicação', unit: 'R$ bi' },
  direcionamento_aquisicao:    { section: 'direcionamento', label: 'Aquisição', unit: 'R$ bi' },
  direcionamento_construcao:   { section: 'direcionamento', label: 'Construção', unit: 'R$ bi' },
  direcionamento_reforma:      { section: 'direcionamento', label: 'Reforma / Ampliação', unit: 'R$ bi' },
  // Contábil
  contabil_financiamento_residencial: { section: 'contabil', label: 'Financ. Residencial', unit: 'R$ bi' },
  contabil_financiamento_comercial:   { section: 'contabil', label: 'Financ. Comercial', unit: 'R$ bi' },
  contabil_bndu:                      { section: 'contabil', label: 'BNDU (Bens não de uso)', unit: 'R$ bi' },
  // Contratação PF — Valor
  credito_contratacao_contratado_pf_SFH:         { section: 'contratacao_pf', label: 'PF SFH', unit: 'R$ bi' },
  credito_contratacao_contratado_pf_FGTS:        { section: 'contratacao_pf', label: 'PF FGTS', unit: 'R$ bi' },
  credito_contratacao_contratado_pf_LIVRE:       { section: 'contratacao_pf', label: 'PF Livre (SFI)', unit: 'R$ bi' },
  credito_contratacao_contratado_pf_COMERCIAL:   { section: 'contratacao_pf', label: 'PF Comercial', unit: 'R$ bi' },
  credito_contratacao_contratado_pf_HOME_EQUITY: { section: 'contratacao_pf', label: 'PF Home Equity', unit: 'R$ bi' },
  // Contratação PF — Indexador
  credito_contratacao_indexador_pf_PREFIXADO: { section: 'contratacao_idx', label: 'PF Prefixado', unit: 'R$ bi' },
  credito_contratacao_indexador_pf_IPCA:      { section: 'contratacao_idx', label: 'PF IPCA', unit: 'R$ bi' },
  credito_contratacao_indexador_pf_TR:        { section: 'contratacao_idx', label: 'PF TR', unit: 'R$ bi' },
  credito_contratacao_indexador_pf_OUTROS:    { section: 'contratacao_idx', label: 'PF Outros', unit: 'R$ bi' },
  // Contratação PF — Taxa
  credito_contratacao_taxa_pf_SFH:            { section: 'contratacao_taxa', label: 'Taxa PF SFH', unit: '% a.a.' },
  credito_contratacao_taxa_pf_FGTS:           { section: 'contratacao_taxa', label: 'Taxa PF FGTS', unit: '% a.a.' },
  credito_contratacao_taxa_pf_LIVRE:          { section: 'contratacao_taxa', label: 'Taxa PF Livre', unit: '% a.a.' },
  credito_contratacao_taxa_pf_COMERCIAL:      { section: 'contratacao_taxa', label: 'Taxa PF Comercial', unit: '% a.a.' },
  credito_contratacao_taxa_pf_HOME_EQUITY:    { section: 'contratacao_taxa', label: 'Taxa PF Home Equity', unit: '% a.a.' },
  // Contratação PF — LTV
  credito_contratacao_ltv_pf_SFH:             { section: 'contratacao_ltv', label: 'LTV PF SFH', unit: '%' },
  credito_contratacao_ltv_pf_FGTS:            { section: 'contratacao_ltv', label: 'LTV PF FGTS', unit: '%' },
  credito_contratacao_ltv_pf_LIVRE:           { section: 'contratacao_ltv', label: 'LTV PF Livre', unit: '%' },
  credito_contratacao_ltv_pf_COMERCIAL:       { section: 'contratacao_ltv', label: 'LTV PF Comercial', unit: '%' },
  credito_contratacao_ltv_pf_HOME_EQUITY:     { section: 'contratacao_ltv', label: 'LTV PF Home Equity', unit: '%' },
};

async function fetchBCBImobSeries(seriesName) {
  const url = `/api-proxy?source=bcb_imob&series=${encodeURIComponent(seriesName)}&top=150`;
  try {
    const res = await fetchWithTimeout(url, 20000);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.value && Array.isArray(data.value)) {
      return data.value.map(r => ({
        date: r.Data ? r.Data.substring(0, 10) : '',
        value: parseFloat(r.Valor),
      })).filter(r => !isNaN(r.value) && r.date);
    }
    if (data.error) { console.warn(`BCB Imob ${seriesName}:`, data.error); }
    return null;
  } catch (err) {
    console.warn(`BCB Imob ${seriesName}:`, err.message);
    return null;
  }
}

async function loadBCBImobData() {
  // Cache 4 hours
  if (DB.bcbImobCache && (Date.now() - DB.bcbImobCache.ts) < 4 * 60 * 60 * 1000) {
    return DB.bcbImobCache.data;
  }

  const entries = Object.keys(BCB_IMOB_SERIES);
  const result = {};
  const batchSize = 4;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(key => fetchBCBImobSeries(key).then(data => [key, data]))
    );
    for (const [key, data] of results) {
      if (data && data.length > 0) result[key] = data;
    }
    if (i + batchSize < entries.length) await new Promise(r => setTimeout(r, 300));
  }

  DB.bcbImobCache = { ts: Date.now(), data: result };
  saveDB(DB);
  return result;
}

/* ---------- Render helpers for Imob charts ---------- */

function renderImobAreaChart(title, seriesMap, imob, colors) {
  // seriesMap: [{key, label, color}]
  const allData = seriesMap.map(s => ({ ...s, data: imob?.[s.key] || [] })).filter(s => s.data.length > 0);
  if (allData.length === 0) return renderImobEmpty(title);

  // Use last 120 points
  const maxPts = 120;
  const trimmed = allData.map(s => ({ ...s, data: s.data.slice(-maxPts) }));
  const allDates = [...new Set(trimmed.flatMap(s => s.data.map(d => d.date)))].sort();
  if (allDates.length < 2) return renderImobEmpty(title);

  const w = 440, ht = 220, pad = { l: 55, r: 15, t: 20, b: 35 };
  const plotW = w - pad.l - pad.r, plotH = ht - pad.t - pad.b;

  // Build aligned values per date
  const aligned = allDates.map(date => {
    const row = { date };
    for (const s of trimmed) {
      const pt = s.data.find(d => d.date === date);
      row[s.key] = pt ? pt.value : null;
    }
    return row;
  });

  // For stacked area, compute max of sum
  const isStacked = trimmed.length > 1;
  let maxVal = 0;
  for (const row of aligned) {
    let sum = 0;
    for (const s of trimmed) sum += row[s.key] || 0;
    if (sum > maxVal) maxVal = sum;
  }
  if (!isStacked) {
    maxVal = Math.max(...trimmed[0].data.map(d => d.value));
  }
  maxVal = maxVal * 1.1 || 1;

  const xFor = (i) => pad.l + (i / Math.max(1, allDates.length - 1)) * plotW;
  const yFor = (v) => pad.t + plotH - (v / maxVal) * plotH;

  // Build SVG paths
  let svgContent = '';
  // Grid lines
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (g / 4) * plotH;
    const val = maxVal * (1 - g / 4);
    svgContent += `<line x1="${pad.l}" x2="${w-pad.r}" y1="${y}" y2="${y}" stroke="var(--border)" stroke-width="0.5" opacity="0.4"/>`;
    svgContent += `<text x="${pad.l-6}" y="${y+4}" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="9" fill="var(--text-faint)">${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val >= 1 ? val.toFixed(0) : val.toFixed(2)}</text>`;
  }
  // X labels
  const labelCount = Math.min(6, allDates.length);
  for (let l = 0; l < labelCount; l++) {
    const idx = Math.round(l * (allDates.length - 1) / Math.max(1, labelCount - 1));
    const d = allDates[idx];
    const label = d.substring(0, 7).replace('-', '/');
    svgContent += `<text x="${xFor(idx)}" y="${ht-8}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="var(--text-faint)">${label}</text>`;
  }

  if (isStacked) {
    // Stacked area — draw from bottom up
    const cumulative = allDates.map(() => 0);
    for (let si = trimmed.length - 1; si >= 0; si--) {
      const s = trimmed[si];
      const color = s.color || colors?.[si] || '#d4a574';
      const top = allDates.map((_, i) => {
        const val = aligned[i][s.key] || 0;
        cumulative[i] += val;
        return cumulative[i];
      });
      const bottom = allDates.map((_, i) => cumulative[i] - (aligned[i][s.key] || 0));
      const pathTop = top.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ');
      const pathBot = [...bottom].reverse().map((v, i) => `L ${xFor(allDates.length - 1 - i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ');
      svgContent += `<path d="${pathTop} ${pathBot} Z" fill="${color}" opacity="0.6"/>`;
    }
  } else {
    // Single area
    const s = trimmed[0];
    const color = s.color || colors?.[0] || '#5a8a9a';
    const path = s.data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.value).toFixed(1)}`).join(' ');
    const area = `${path} L ${xFor(s.data.length-1).toFixed(1)} ${yFor(0).toFixed(1)} L ${xFor(0).toFixed(1)} ${yFor(0).toFixed(1)} Z`;
    svgContent += `<path d="${area}" fill="${color}" opacity="0.25"/>`;
    svgContent += `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
  }

  // Legend
  const legend = trimmed.map((s, i) => {
    const color = s.color || colors?.[i] || '#d4a574';
    return `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color}"></span><span style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--text-faint)">${s.label}</span></span>`;
  }).join('');

  return h('div', { class: 'card', style: { padding: '16px' } }, [
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px', color: 'var(--amber)', marginBottom: '10px', textAlign: 'center' } }, title),
    h('svg', { viewBox: `0 0 ${w} ${ht}`, style: { width: '100%' }, html: svgContent }),
    h('div', { style: { textAlign: 'center', marginTop: '8px' }, html: legend }),
  ]);
}

function renderImobEmpty(title) {
  return h('div', { class: 'card', style: { padding: '30px', textAlign: 'center' } }, [
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px', color: 'var(--text-faint)', marginBottom: '8px' } }, title),
    h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Dados não disponíveis'),
  ]);
}

/* ---------- Tab: Fontes de Recursos ---------- */

function renderImobFontes(imob) {
  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, 'Fontes de Recursos do Financiamento Imobiliário'),
    h('div', { style: { fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: '16px' } },
      'Fontes de recursos do financiamento imobiliário. O SBPE é a principal fonte de funding via poupança. CRI, LCI, LH e LIG são títulos do mercado de capitais.'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } }, [
      renderImobAreaChart('Sistema Brasileiro de Poupança e Empréstimo', [
        { key: 'fontes_sbpe', label: 'SBPE', color: '#5a8a9a' },
      ], imob),
      renderImobAreaChart('Títulos', [
        { key: 'fontes_titulo_cri', label: 'CRI', color: '#2a5a7a' },
        { key: 'fontes_titulo_lci', label: 'LCI', color: '#d4a574' },
        { key: 'fontes_titulo_lh',  label: 'LH',  color: '#7ac5c5' },
        { key: 'fontes_titulo_lig', label: 'LIG', color: '#8a5a3a' },
      ], imob, ['#2a5a7a', '#d4a574', '#7ac5c5', '#8a5a3a']),
    ]),
    renderImobKPIStrip(imob, ['fontes_sbpe', 'fontes_titulo_cri', 'fontes_titulo_lci', 'fontes_titulo_lh', 'fontes_titulo_lig']),
  ]);
}

/* ---------- Tab: Direcionamento ---------- */

function renderImobDirecionamento(imob) {
  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, 'Direcionamento'),
    h('div', { style: { fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: '16px' } },
      'Aplicações em créditos imobiliários de parte dos recursos de caderneta de poupança e depósitos à vista captados pelas instituições financeiras.'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } }, [
      renderImobAreaChart('Aplicação', [
        { key: 'direcionamento_aplicacao', label: 'Imobiliário', color: '#5a8a9a' },
      ], imob),
      renderImobAreaChart('Aquisição', [
        { key: 'direcionamento_aquisicao', label: 'Imobiliário', color: '#5a8a9a' },
      ], imob),
    ]),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' } }, [
      renderImobAreaChart('Construção', [
        { key: 'direcionamento_construcao', label: 'Imobiliário', color: '#5a8a9a' },
      ], imob),
      renderImobAreaChart('Reforma ou Ampliação', [
        { key: 'direcionamento_reforma', label: 'Imobiliário', color: '#5a8a9a' },
      ], imob),
    ]),
  ]);
}

/* ---------- Tab: Contábil ---------- */

function renderImobContabil(imob) {
  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, 'Contábil'),
    h('div', { style: { fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: '16px' } },
      'Operações de crédito destinadas à construção, reforma, ampliação e aquisição de unidades residenciais e comerciais.'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } }, [
      renderImobAreaChart('Financiamentos', [
        { key: 'contabil_financiamento_comercial',   label: 'Comercial',   color: '#2a5a7a' },
        { key: 'contabil_financiamento_residencial', label: 'Residencial', color: '#d4a574' },
      ], imob, ['#2a5a7a', '#d4a574']),
      renderImobAreaChart('Bens não de uso próprio — BNDU', [
        { key: 'contabil_bndu', label: 'Imobiliário', color: '#5a8a9a' },
      ], imob),
    ]),
  ]);
}

/* ---------- Tab: Contratação ---------- */

function renderImobContratacao(imob) {
  const subTab = state._re_contratacao_tab || 'valor';
  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, 'Contratação — Pessoa Física'),
    h('div', { style: { fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: '12px' } },
      'Detalhamento das contratações PF por modalidade (SFH, FGTS, Livre, Comercial, Home Equity), indexador (Prefixado, IPCA, TR), taxa de juros e LTV.'),

    // Sub-tabs
    h('div', { style: { display: 'flex', gap: '6px', marginBottom: '16px' } },
      [['valor', 'Valor Contratado'], ['indexador', 'Indexadores'], ['taxa', 'Taxa'], ['ltv', 'LTV']].map(([k, l]) =>
        h('button', {
          class: 'sec-tab' + (subTab === k ? ' active' : ''),
          style: { fontSize: '11px', padding: '4px 12px' },
          onClick: () => { state._re_contratacao_tab = k; render(); },
        }, l)
      )
    ),

    subTab === 'valor' ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' } }, [
      renderImobAreaChart('Valor Contratado — PF', [
        { key: 'credito_contratacao_contratado_pf_COMERCIAL',   label: 'Comercial',   color: '#2a5a7a' },
        { key: 'credito_contratacao_contratado_pf_HOME_EQUITY', label: 'Home Equity',  color: '#d4a574' },
        { key: 'credito_contratacao_contratado_pf_LIVRE',       label: 'Livre',        color: '#7ac5c5' },
        { key: 'credito_contratacao_contratado_pf_FGTS',        label: 'FGTS',         color: '#8a3a3a' },
        { key: 'credito_contratacao_contratado_pf_SFH',         label: 'SFH',          color: '#7a3a8a' },
      ], imob, ['#2a5a7a', '#d4a574', '#7ac5c5', '#8a3a3a', '#7a3a8a']),
      renderImobKPIStrip(imob, ['credito_contratacao_contratado_pf_SFH', 'credito_contratacao_contratado_pf_FGTS', 'credito_contratacao_contratado_pf_LIVRE', 'credito_contratacao_contratado_pf_COMERCIAL', 'credito_contratacao_contratado_pf_HOME_EQUITY']),
    ]) :

    subTab === 'indexador' ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' } }, [
      renderImobAreaChart('Indexadores — PF', [
        { key: 'credito_contratacao_indexador_pf_PREFIXADO', label: 'Prefixado', color: '#7a3a8a' },
        { key: 'credito_contratacao_indexador_pf_IPCA',      label: 'IPCA',      color: '#8a5a3a' },
        { key: 'credito_contratacao_indexador_pf_OUTROS',    label: 'Outros',    color: '#7ac5c5' },
        { key: 'credito_contratacao_indexador_pf_TR',        label: 'TR',        color: '#d4a574' },
      ], imob, ['#7a3a8a', '#8a5a3a', '#7ac5c5', '#d4a574']),
    ]) :

    subTab === 'taxa' ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' } }, [
      renderImobAreaChart('Taxa de Juros — PF (% a.a.)', [
        { key: 'credito_contratacao_taxa_pf_SFH',         label: 'SFH',         color: '#2a5a7a' },
        { key: 'credito_contratacao_taxa_pf_FGTS',        label: 'FGTS',        color: '#8a3a3a' },
        { key: 'credito_contratacao_taxa_pf_LIVRE',       label: 'Livre',       color: '#7ac5c5' },
        { key: 'credito_contratacao_taxa_pf_COMERCIAL',   label: 'Comercial',   color: '#d4a574' },
        { key: 'credito_contratacao_taxa_pf_HOME_EQUITY', label: 'Home Equity', color: '#7a3a8a' },
      ], imob, ['#2a5a7a', '#8a3a3a', '#7ac5c5', '#d4a574', '#7a3a8a']),
    ]) :

    subTab === 'ltv' ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' } }, [
      renderImobAreaChart('Loan to Value — PF (%)', [
        { key: 'credito_contratacao_ltv_pf_SFH',         label: 'SFH',         color: '#2a5a7a' },
        { key: 'credito_contratacao_ltv_pf_FGTS',        label: 'FGTS',        color: '#8a3a3a' },
        { key: 'credito_contratacao_ltv_pf_LIVRE',       label: 'Livre',       color: '#7ac5c5' },
        { key: 'credito_contratacao_ltv_pf_COMERCIAL',   label: 'Comercial',   color: '#d4a574' },
        { key: 'credito_contratacao_ltv_pf_HOME_EQUITY', label: 'Home Equity', color: '#7a3a8a' },
      ], imob, ['#2a5a7a', '#8a3a3a', '#7ac5c5', '#d4a574', '#7a3a8a']),
    ]) : null,
  ]);
}

/* ---------- Tab: Índices & Preços ---------- */

function renderImobIndices(series) {
  if (!series) return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Carregue o Dashboard BCB primeiro.');
  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, 'Índices de Preços & Custos'),
    h('div', { style: { fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: '16px' } },
      'Indicadores de preços de imóveis e custos de construção. INCC: custo de construção. IVG-R: valor de garantias hipotecárias.'),
    renderMacroSection('Custos de Construção & Preços', [
      { key: 'incc', series }, { key: 'igpm', series },
      { key: 'ivgr', series }, { key: 'ipca12m', series },
    ], computeMacroIndicators(series), []),
    renderMacroSection('Referência', [
      { key: 'selic', series }, { key: 'usd_venda', series },
    ], {}, []),
  ]);
}

/* ---------- Tab: Crédito SGS ---------- */

function renderImobCreditoSGS(series) {
  if (!series) return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Carregue o Dashboard BCB primeiro.');
  const reIndicators = computeREIndicators(series);
  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, 'Crédito Imobiliário (séries SGS)'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
      renderBigIndicator('Taxa Imob. PF', latestVal(series, 'txImobPF'), '% a.a.', 'Média ponderada'),
      renderBigIndicator('Spread Imob-SELIC', reIndicators.spreadImobSelic, 'p.p.', 'Taxa PF - SELIC'),
      renderBigIndicator('Saldo Total YoY', reIndicators.saldoTotalYoY, '%', 'Crescimento 12m'),
      renderBigIndicator('Concessões PF YoY', reIndicators.concPFYoY, '%', 'Variação 12m'),
      renderBigIndicator('Inadimplência PF', latestVal(series, 'inadImobPF'), '%', 'Habitacional PF'),
      renderBigIndicator('Share SFI', reIndicators.shareSFI, '%', `SFH: ${reIndicators.shareSFH != null ? reIndicators.shareSFH.toFixed(0) : '?'}%`),
    ]),
    renderMacroSection('Saldo de Crédito', [
      { key: 'credimob', series }, { key: 'credimobPF', series }, { key: 'credimobPJ', series },
    ], {}, []),
    renderMacroSection('Concessões (fluxo mensal)', [
      { key: 'concImobPF', series }, { key: 'concImobPFMerc', series }, { key: 'concImobPFReg', series }, { key: 'concImobPJ', series },
    ], {}, []),
    renderMacroSection('Taxas de Juros', [
      { key: 'txImobPF', series }, { key: 'txImobPFMerc', series }, { key: 'txImobPFReg', series },
    ], {}, []),
    renderMacroSection('Inadimplência', [
      { key: 'inadImobPF', series }, { key: 'inadImobPJ', series }, { key: 'inadhabit', series },
    ], {}, []),
    renderMacroSection('Poupança & SBPE', [
      { key: 'poupSaldo', series }, { key: 'poupCaptLiq', series },
    ], {}, []),
  ]);
}

/* ---------- KPI Strip from imob data ---------- */

function renderImobKPIStrip(imob, keys) {
  if (!imob) return null;
  const cards = keys.map(key => {
    const meta = BCB_IMOB_SERIES[key];
    const data = imob[key];
    if (!data || data.length === 0) return null;
    const last = data[data.length - 1];
    const prev = data.length > 1 ? data[data.length - 2] : null;
    const delta = prev ? last.value - prev.value : null;
    return h('div', { class: 'card', style: { padding: '12px 14px' } }, [
      h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', marginBottom: '4px' } }, meta?.label || key),
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px' } },
        meta?.unit === 'R$ bi' ? `R$ ${last.value.toFixed(1)} bi` :
        meta?.unit === '% a.a.' ? `${last.value.toFixed(2)}%` :
        meta?.unit === '%' ? `${last.value.toFixed(1)}%` :
        last.value.toFixed(2)),
      h('div', { class: 'mono', style: { fontSize: '9px', color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-faint)', marginTop: '3px' } },
        delta != null ? `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(2)}` : ''),
      h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', marginTop: '2px' } }, last.date?.substring(0, 7) || ''),
    ]);
  }).filter(Boolean);
  if (cards.length === 0) return null;
  return h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${Math.min(cards.length, 5)}, 1fr)`, gap: '10px', marginTop: '16px' } }, cards);
}

/* ---------- Credit Lens ---------- */

function renderCreditLens() {
  const series = state._macro_series;
  if (!series) {
    if (!state._macro_loading && !state._macro_error) {
      state._macro_loading = true;
      loadAllBCBSeries().then(s => {
        state._macro_series = s;
        state._macro_loading = false;
        render();
      }).catch(err => {
        state._macro_loading = false;
        state._macro_error = err.message;
        render();
      });
    }
    return h('div', { class: 'content fade-up' }, [
      pageHead('Macro Intelligence · Credit Lens', 'Credit <em>Lens</em>', 'Carregando dados macro…'),
      state._macro_error ? renderMacroError(state._macro_error) : h('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' } }, 'Aguardando dados do BCB…'),
    ]);
  }

  const indicators = computeMacroIndicators(series);
  const cycle = computeCreditCycle(indicators, series);

  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Credit Lens', 'Credit <em>Lens</em>',
      'Visão macroeconômica focada em Crédito Privado. Condições de financiamento, spreads, inadimplência corporativa.'),

    cycle && h('div', { style: { marginBottom: '28px' } }, [renderCycleCard('Fase do Ciclo de Crédito', cycle, 'credit')]),

    h('div', { class: 'macro-section-subhead' }, 'Termômetro do Ciclo'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' } }, [
      renderBigIndicator('Juros Real',             indicators.jurosReal,          '% a.a.', 'SELIC - IPCA 12m'),
      renderBigIndicator('Tend. Inadimp. PF',      indicators.inadimplenciaTrend, 'p.p.',    'Média 3m - Média 12m'),
      renderBigIndicator('Atividade YoY',          indicators.atividadeYoY,       '%',       'IBC-Br (proxy PIB)'),
    ]),

    renderMacroSection('Taxas & Spreads', [
      { key: 'selic',     series },
      { key: 'cdi',       series },
      { key: 'spreadTot', series },
    ], indicators, []),

    renderMacroSection('Qualidade do Crédito', [
      { key: 'inadi',     series },
      { key: 'inadipj',   series },
      { key: 'inadhabit', series },
    ], indicators, []),

    renderMacroSection('Macro Fundamentais', [
      { key: 'ipca12m',   series },
      { key: 'igpm',      series },
      { key: 'ibcbr',     series },
      { key: 'usd_venda', series },
    ], indicators, []),

    h('div', { style: { display: 'flex', justifyContent: 'center', marginTop: '32px' } }, [
      h('button', { class: 'btn-primary', onClick: () => runMacroCommentary('credit') }, '✨ Gerar leitura Crédito via Gemini'),
    ]),

    state._macro_commentary?.credit && renderMacroCommentaryBox(state._macro_commentary.credit, 'Leitura Crédito'),
  ]);
}

function renderBigIndicator(label, value, unit, desc) {
  const fmtValue = value == null ? '—' :
    unit === '% a.a.' || unit === '%' ? (value >= 0 ? '+' : '') + value.toFixed(2) + '%' :
    unit === 'p.p.' ? (value >= 0 ? '+' : '') + value.toFixed(2) + ' p.p.' :
    value.toFixed(2);
  const color = value == null ? 'var(--text-muted)' :
    value > 0 ? 'var(--red)' : value < 0 ? 'var(--green)' : 'var(--text)';

  return h('div', { class: 'big-indicator' }, [
    h('div', { class: 'big-indicator-label' }, label),
    h('div', { class: 'big-indicator-value', style: { color } }, fmtValue),
    h('div', { class: 'big-indicator-desc' }, desc),
  ]);
}

/* ---------- Gemini commentary ---------- */

async function runMacroCommentary(lens) {
  const series = state._macro_series;
  if (!series) { showToast('Aguarde os dados carregarem', true); return; }
  if (!DB.settings.gemini_api_key) {
    showToast('Configure Gemini API key primeiro', true);
    setModal('settings');
    return;
  }

  const indicators = computeMacroIndicators(series);
  const reCycle = computeRealEstateCycle(indicators);
  const credCycle = computeCreditCycle(indicators, series);

  if (!state._macro_commentary) state._macro_commentary = {};
  const key = lens || 'overview';
  state._macro_commentary[key] = { loading: true };
  render();

  // Build compact snapshot
  const snapshot = {
    selic_meta_pct_aa:         series.selic?.slice(-1)?.[0]?.value ?? null,
    cdi_pct_aa:                series.cdi?.slice(-1)?.[0]?.value ?? null,
    ipca_12m_pct:              series.ipca12m?.slice(-1)?.[0]?.value ?? null,
    igpm_mensal_pct:           series.igpm?.slice(-1)?.[0]?.value ?? null,
    juros_real_ex_post_pct_aa: indicators.jurosReal,
    incc_12m_pct:              indicators.incc12m,
    spread_incc_ipca_pp:       indicators.spreadConstrucao,
    credimob_yoy_pct:          indicators.credimobYoY,
    atividade_yoy_pct:         indicators.atividadeYoY,
    inadimplencia_pf_pct:      series.inadi?.slice(-1)?.[0]?.value ?? null,
    inadimplencia_pj_pct:      series.inadipj?.slice(-1)?.[0]?.value ?? null,
    inadimplencia_habit_pct:   series.inadhabit?.slice(-1)?.[0]?.value ?? null,
    ivg_r_mensal_pct:          series.ivgr?.slice(-1)?.[0]?.value ?? null,
    confianca_consumidor:      series.icc?.slice(-1)?.[0]?.value ?? null,
    usd_brl:                   series.usd_venda?.slice(-1)?.[0]?.value ?? null,
    tendencia_inadimplencia_pp: indicators.inadimplenciaTrend,
    ciclo_imobiliario:         reCycle ? `${reCycle.phase} (${reCycle.confidence}%)` : null,
    ciclo_credito:             credCycle ? `${credCycle.phase} (${credCycle.confidence}%)` : null,
  };

  const focusPrompt = {
    realestate: 'Foque a análise em implicações para investimento em Real Estate (FIIs, empreendimentos, desenvolvimento, CRIs imobiliários).',
    credit:     'Foque a análise em implicações para investimento em Crédito Privado (debêntures, CRIs, CRAs, FIDCs, emissões corporativas).',
    overview:   'Análise equilibrada para gestora de ativos brasileira com exposição em Real Estate e Crédito Privado.',
  }[key] || 'Análise macro equilibrada.';

  const prompt = `Você é um estrategista macro sênior de uma gestora brasileira focada em Real Estate e Crédito Privado.

${focusPrompt}

Com base nos dados abaixo (séries oficiais do BCB, data corrente), produza uma análise macro em Português do Brasil. Tom: institucional, denso, Financial Times.

Responda APENAS em JSON válido:

{
  "cenario": "2-3 frases resumindo o cenário macro atual",
  "implicacoes": "3-4 frases sobre implicações concretas para decisões de investimento nessa classe de ativos",
  "oportunidades": ["3 bullets de oportunidades táticas"],
  "riscos": ["3 bullets de riscos a monitorar"],
  "sinalizacao": "uma frase sobre postura sugerida (ex: 'seletividade aumentada', 'janela tática favorável', 'defensivo')"
}

DADOS:
${JSON.stringify(snapshot, null, 2)}`;

  try {
    const result = await callGeminiRaw(prompt, DB.settings.gemini_api_key, () => {});
    if (!result || !result.cenario) throw new Error('Resposta vazia');
    state._macro_commentary[key] = { ...result, generated_at: new Date().toISOString() };
    render();
    showToast('Leitura macro gerada');
  } catch (err) {
    state._macro_commentary[key] = { error: err.message };
    render();
    showToast('Erro ao gerar leitura: ' + err.message, true);
  }
}

function renderMacroCommentaryBox(commentary, title) {
  if (commentary.loading) {
    return h('div', { class: 'sec-gemini-box', style: { marginTop: '24px' } }, [
      h('div', { style: { color: 'var(--amber)', fontFamily: 'Fraunces, serif', fontSize: '16px' } }, 'Gerando leitura via Gemini…'),
    ]);
  }
  if (commentary.error) {
    return h('div', { class: 'sec-gemini-box', style: { marginTop: '24px', borderLeft: '3px solid var(--red)' } }, [
      h('div', { class: 'sec-gemini-label', style: { color: 'var(--red)' } }, 'Erro'),
      h('div', { class: 'sec-gemini-text' }, commentary.error),
    ]);
  }
  return h('div', { class: 'sec-gemini-box', style: { marginTop: '24px' } }, [
    h('div', { class: 'sec-gemini-label', style: { color: 'var(--amber)' } }, title + ' — via Gemini'),
    commentary.cenario && h('div', { class: 'sec-gemini-section' }, [
      h('div', { class: 'sec-gemini-label' }, 'Cenário'),
      h('div', { class: 'sec-gemini-text' }, commentary.cenario),
    ]),
    commentary.implicacoes && h('div', { class: 'sec-gemini-section' }, [
      h('div', { class: 'sec-gemini-label' }, 'Implicações'),
      h('div', { class: 'sec-gemini-text' }, commentary.implicacoes),
    ]),
    commentary.oportunidades?.length > 0 && h('div', { class: 'sec-gemini-section' }, [
      h('div', { class: 'sec-gemini-label', style: { color: 'var(--green)' } }, 'Oportunidades'),
      h('ul', { style: { paddingLeft: '18px', fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.75', color: 'var(--text-2)' } },
        commentary.oportunidades.map(c => h('li', {}, c))),
    ]),
    commentary.riscos?.length > 0 && h('div', { class: 'sec-gemini-section' }, [
      h('div', { class: 'sec-gemini-label', style: { color: 'var(--red)' } }, 'Riscos'),
      h('ul', { style: { paddingLeft: '18px', fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.75', color: 'var(--text-2)' } },
        commentary.riscos.map(c => h('li', {}, c))),
    ]),
    commentary.sinalizacao && h('div', { class: 'sec-gemini-section', style: { borderTop: '1px solid var(--amber)', paddingTop: '14px', marginTop: '14px' } }, [
      h('div', { class: 'sec-gemini-label', style: { color: 'var(--amber)' } }, 'Sinalização'),
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px', color: 'var(--amber)', fontStyle: 'italic' } }, commentary.sinalizacao),
    ]),
    h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '16px' } },
      `Gerado em ${new Date(commentary.generated_at).toLocaleString('pt-BR')}`),
  ]);
}

// Kept for backward compat — redirects to new dashboard
function renderMacroRates() {
  return renderMacroDashboard();
}

function formatMacroValue(v, meta) {
  if (v == null) return '—';
  const d = meta.decimals != null ? meta.decimals : 2;
  if (meta.unit === 'R$') return 'R$ ' + v.toFixed(d);
  if (meta.unit.includes('%') || meta.unit === 'p.p.') return v.toFixed(d) + (meta.unit.includes('%') ? '%' : ' p.p.');
  if (meta.unit === 'R$ mi') return 'R$ ' + (v / 1000).toFixed(1) + ' bi';
  if (meta.unit === 'índice') return v.toFixed(d);
  return v.toFixed(d);
}

function buildSparkline(values) {
  const w = 200, ht = 40;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const n = values.length;
  const xFor = i => (i / (n - 1)) * w;
  const yFor = v => ht - ((v - min) / range) * ht;
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(v)}`).join(' ');
  const isUp = values[n - 1] >= values[0];
  const color = isUp ? '#7a9b5c' : '#b85c5c';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${ht}`);
  svg.setAttribute('style', 'width: 100%; height: 40px;');
  svg.innerHTML = `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.8"/>`;
  return svg;
}

/* ============================================================
   17. EVENT CALENDAR
   ============================================================ */

const EVENT_TYPES = {
  cb:       { label: 'Banco Central', class: 'cb' },
  macro:    { label: 'Macro',         class: 'macro' },
  earnings: { label: 'Earnings',      class: 'earnings' },
  dividend: { label: 'Dividendo',     class: 'dividend' },
  debt:     { label: 'Dívida',        class: 'debt' },
  custom:   { label: 'Outro',         class: 'custom' },
};

function getEvents() {
  if (!DB.events) { DB.events = []; saveDB(DB); }
  return DB.events;
}

function addEvent(ev) {
  getEvents();
  DB.events.push({ id: `ev_${Date.now()}`, ...ev });
  DB.events.sort((a, b) => a.date.localeCompare(b.date));
  saveDB(DB);
}

function removeEvent(id) {
  DB.events = getEvents().filter(e => e.id !== id);
  saveDB(DB);
  render();
}

function renderEventCalendar() {
  const events = getEvents();
  const today = new Date().toISOString().split('T')[0];

  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro & Rates · Event Calendar', 'Event <em>Calendar</em>',
      'Calendário econômico global (automático via Finnhub) + eventos manuais (internos, earnings, vencimentos). Dados automatizados requerem Finnhub API key em Settings.'),

    // Auto-populated economic calendar (Finnhub)
    renderEconomicCalendarAuto(),

    // Manual events
    h('div', { style: { marginTop: '36px' } }, [
      sectionHead('02', 'Eventos Manuais', 'Eventos internos, earnings, vencimentos de dívida, dividendos. Adicione o que for relevante.'),
      h('div', { class: 'event-cal-wrap' }, [
        h('div', { class: 'event-cal-add' }, [
          h('input', { type: 'date', id: 'ev-date', value: today }),
          h('input', { type: 'text', id: 'ev-title', placeholder: 'Título (ex: Reunião COPOM, Vencimento CRA PTBL)' }),
          h('input', { type: 'text', id: 'ev-ticker', placeholder: 'Ticker/Emissor (opcional)' }),
          h('select', { id: 'ev-type' },
            Object.entries(EVENT_TYPES).map(([k, v]) => h('option', { value: k }, v.label))
          ),
          h('button', {
            class: 'btn-primary',
            onClick: () => {
              const date = document.getElementById('ev-date').value;
              const title = document.getElementById('ev-title').value.trim();
              const ticker = document.getElementById('ev-ticker').value.trim();
              const type = document.getElementById('ev-type').value;
              if (!date || !title) { showToast('Data e título são obrigatórios', true); return; }
              addEvent({ date, title, ticker, type });
              showToast('Evento adicionado');
              render();
            },
          }, '+ Adicionar'),
        ]),

        events.length === 0
          ? h('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' } }, 'Nenhum evento manual cadastrado.')
          : h('div', { class: 'event-cal-list' }, events.map(ev => {
              const isPast = ev.date < today;
              const isToday = ev.date === today;
              const classes = `event-cal-row ${isPast ? 'event-cal-past' : ''} ${isToday ? 'event-cal-today' : ''}`;
              const typeMeta = EVENT_TYPES[ev.type] || EVENT_TYPES.custom;
              const d = new Date(ev.date + 'T12:00:00');
              const dateLabel = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

              return h('div', { class: classes }, [
                h('div', { class: 'event-cal-date' }, dateLabel),
                h('div', {}, h('span', { class: `event-cal-type ${typeMeta.class}` }, typeMeta.label)),
                h('div', { class: 'event-cal-title' }, ev.title),
                h('div', { class: 'event-cal-ticker' }, ev.ticker || ''),
                h('button', {
                  class: 'event-cal-delete',
                  onClick: () => removeEvent(ev.id),
                  title: 'Remover',
                }, '×'),
              ]);
            })),
      ]),
    ]),
  ]);
}

/* ---------- Economic Calendar via Finnhub ---------- */

async function fetchEconomicCalendar() {
  const token = DB.settings.finnhub_api_key;
  if (!token) return null;

  // Cache 6 hours
  if (DB.ecoCalCache && (Date.now() - DB.ecoCalCache.ts) < 6 * 60 * 60 * 1000) {
    return DB.ecoCalCache.data;
  }

  const now = new Date();
  const from = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const to = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];

  // Try Netlify proxy first
  const proxyUrl = `/api-proxy?source=finnhub_calendar&token=${token}&from=${from}&to=${to}`;
  const directUrl = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${token}`;

  for (const url of [proxyUrl, directUrl]) {
    try {
      const res = await fetchWithTimeout(url, 12000);
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.economicCalendar || data;
      if (Array.isArray(events)) {
        DB.ecoCalCache = { ts: Date.now(), data: events };
        saveDB(DB);
        return events;
      }
    } catch (err) {
      console.warn('Economic calendar:', err.message);
    }
  }
  return null;
}

const ECO_IMPACT_COLORS = {
  3: { label: 'Alto',  color: 'var(--red)',   bg: 'rgba(184,92,92,0.12)' },
  2: { label: 'Médio', color: 'var(--amber)', bg: 'rgba(212,165,116,0.12)' },
  1: { label: 'Baixo', color: 'var(--text-faint)', bg: 'transparent' },
};

function renderEconomicCalendarAuto() {
  const calData = state._eco_cal;
  const loading = state._eco_cal_loading;

  if (!calData && !loading) {
    state._eco_cal_loading = true;
    fetchEconomicCalendar().then(d => {
      state._eco_cal = d;
      state._eco_cal_loading = false;
      render();
    }).catch(() => {
      state._eco_cal_loading = false;
      render();
    });
  }

  if (!DB.settings.finnhub_api_key) {
    return h('div', {}, [
      sectionHead('01', 'Calendário Econômico Global', 'Requer Finnhub API key em Settings'),
      h('div', { style: { padding: '20px', textAlign: 'center', color: 'var(--text-faint)', border: '1px dashed var(--border)' } },
        'Configure sua Finnhub API key em Settings para ativar o calendário automático.'),
    ]);
  }

  if (loading && !calData) {
    return h('div', {}, [
      sectionHead('01', 'Calendário Econômico Global', 'Carregando eventos…'),
      h('div', { style: { padding: '20px', textAlign: 'center', color: 'var(--amber)' } }, 'Buscando eventos…'),
    ]);
  }

  if (!calData || calData.length === 0) {
    return h('div', {}, [
      sectionHead('01', 'Calendário Econômico Global', 'Sem eventos disponíveis'),
    ]);
  }

  const today = new Date().toISOString().split('T')[0];

  // Filter to major countries and high/medium impact
  const TRACKED_COUNTRIES = ['US', 'BR', 'EU', 'GB', 'CN', 'JP', 'IN', 'DE', 'FR'];
  const filtered = calData
    .filter(ev => {
      const impact = ev.impact || 0;
      const country = ev.country || '';
      return impact >= 2 || TRACKED_COUNTRIES.includes(country);
    })
    .sort((a, b) => (a.time || a.date || '').localeCompare(b.time || b.date || ''));

  // Group by date
  const byDate = {};
  for (const ev of filtered) {
    const date = (ev.time || ev.date || '').substring(0, 10);
    if (!date) continue;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(ev);
  }

  const dates = Object.keys(byDate).sort();

  // Split into upcoming and past
  const upcoming = dates.filter(d => d >= today);
  const past = dates.filter(d => d < today).slice(-3); // last 3 days only

  return h('div', {}, [
    sectionHead('01', 'Calendário Econômico Global',
      `${filtered.length} eventos (${upcoming.length > 0 ? upcoming.length + ' dias futuros' : 'sem eventos próximos'}). Atualiza a cada 6h.`),
    h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' } }, [
      h('button', { class: 'btn-secondary', style: { fontSize: '10px' }, onClick: () => {
        DB.ecoCalCache = null; saveDB(DB);
        state._eco_cal = null; state._eco_cal_loading = false;
        render();
      }}, '↻ Atualizar calendário'),
    ]),

    // Recent past events (results published)
    past.length > 0 && h('div', { style: { marginBottom: '20px', opacity: '0.6' } }, [
      h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' } }, 'Recentes (resultados publicados)'),
      ...past.map(date => renderEcoCalDay(date, byDate[date], true)),
    ]),

    // Upcoming
    upcoming.length > 0 ? h('div', {}, [
      h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' } }, 'Próximos eventos'),
      ...upcoming.map(date => renderEcoCalDay(date, byDate[date], false)),
    ]) : h('div', { style: { padding: '20px', textAlign: 'center', color: 'var(--text-muted)' } }, 'Sem eventos econômicos nos próximos 14 dias.'),
  ]);
}

function renderEcoCalDay(dateStr, events, isPast) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date().toISOString().split('T')[0];
  const isToday = dateStr === today;
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayLabel = `${dayNames[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  return h('div', {
    style: {
      marginBottom: '12px', border: '1px solid var(--border)',
      borderLeft: isToday ? '3px solid var(--amber)' : '1px solid var(--border)',
      background: isToday ? 'rgba(212,165,116,0.04)' : 'var(--bg-2)',
    },
  }, [
    h('div', {
      style: {
        padding: '8px 14px', background: isToday ? 'rgba(212,165,116,0.08)' : 'var(--bg-3)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
        color: isToday ? 'var(--amber)' : 'var(--text-muted)',
        display: 'flex', justifyContent: 'space-between',
      },
    }, [
      h('span', {}, dayLabel + (isToday ? ' · HOJE' : '')),
      h('span', { style: { color: 'var(--text-faint)' } }, `${events.length} evento${events.length > 1 ? 's' : ''}`),
    ]),
    ...events.map(ev => {
      const impact = ECO_IMPACT_COLORS[ev.impact] || ECO_IMPACT_COLORS[1];
      const time = (ev.time || '').substring(11, 16);
      const hasResult = ev.actual != null && ev.actual !== '';

      return h('div', {
        style: {
          padding: '8px 14px', borderTop: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: '50px 30px 1fr 100px 100px 100px',
          gap: '10px', alignItems: 'center', fontSize: '12px',
          background: impact.bg,
        },
      }, [
        h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, time || '—'),
        h('span', { class: 'mono', style: { fontSize: '10px', fontWeight: '600' } }, ev.country || ''),
        h('span', { style: { fontFamily: 'Fraunces, serif' } }, ev.event || ev.indicator || ''),
        h('span', { class: 'mono', style: { textAlign: 'right', color: hasResult ? 'var(--text)' : 'var(--text-faint)', fontSize: '11px' } },
          hasResult ? `Atual: ${ev.actual}` : 'pendente'),
        h('span', { class: 'mono', style: { textAlign: 'right', fontSize: '10px', color: 'var(--text-faint)' } },
          ev.estimate ? `Est: ${ev.estimate}` : ''),
        h('span', { class: 'mono', style: { textAlign: 'right', fontSize: '10px', color: 'var(--text-faint)' } },
          ev.prev ? `Ant: ${ev.prev}` : ''),
      ]);
    }),
  ]);
}


/* ============================================================
   21. CENTRAL BANK MINUTES — COPOM & FOMC
   ============================================================ */

const CB_BANKS = {
  copom: { label: 'COPOM',     country: 'Brasil',          lang: 'pt', rate_name: 'SELIC',      cycle: 'A cada ~45 dias' },
  fomc:  { label: 'FOMC (Fed)', country: 'Estados Unidos', lang: 'en', rate_name: 'Fed Funds',  cycle: '8 reuniões/ano' },
};

const CB_DECISIONS = {
  cut:  { label: 'Corte',      class: 'cut'  },
  hike: { label: 'Alta',       class: 'hike' },
  hold: { label: 'Manutenção', class: 'hold' },
};

const CB_TONES = {
  hawkish: { label: 'Hawkish', class: 'hawkish', desc: 'Inclinação restritiva — preocupação com inflação prevalece' },
  dovish:  { label: 'Dovish',  class: 'dovish',  desc: 'Inclinação acomodatícia — preocupação com atividade prevalece' },
  neutral: { label: 'Neutro',  class: 'neutral', desc: 'Equilíbrio entre riscos de inflação e de atividade' },
};

/* ---------- Data layer ---------- */

function getCBMinutes() {
  if (!DB.cb_minutes) { DB.cb_minutes = []; saveDB(DB); }
  return DB.cb_minutes;
}

function getCBMinute(id) { return getCBMinutes().find(m => m.id === id); }

function saveCBMinute(minute) {
  getCBMinutes();
  if (!minute.id) {
    minute.id = `cb_${Date.now()}`;
    minute.created_at = new Date().toISOString();
    DB.cb_minutes.push(minute);
  } else {
    const idx = DB.cb_minutes.findIndex(m => m.id === minute.id);
    if (idx >= 0) DB.cb_minutes[idx] = minute;
    else DB.cb_minutes.push(minute);
  }
  // Sort by date desc
  DB.cb_minutes.sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || ''));
  saveDB(DB);
  return minute.id;
}

function deleteCBMinute(id) {
  if (!confirm('Excluir essa ata? Não pode ser desfeito.')) return;
  DB.cb_minutes = getCBMinutes().filter(m => m.id !== id);
  saveDB(DB);
  render();
}

function emptyCBMinute(bank) {
  return {
    id: null,
    bank: bank || 'copom',
    meeting_date: '',
    decision: 'hold',
    magnitude_bps: 0,
    rate_after: null,
    vote: { unanimous: true, dissenters: [] },
    tone: 'neutral',
    tone_score: 0,
    summary: '',
    forward_guidance: '',
    risks_inflation: [],
    risks_activity: [],
    changes_vs_previous: [],
    key_quotes: [],
    source_filename: '',
    created_at: null,
  };
}

function getLatestCBMinute(bank) {
  return getCBMinutes().filter(m => m.bank === bank)[0] || null;
}

/* ---------- Extraction prompts (per bank, per language) ---------- */

function buildCBExtractionPrompt(bank, pdfText) {
  const isCopom = bank === 'copom';
  const lang = isCopom ? 'em Português do Brasil' : 'in English';
  const bankLabel = CB_BANKS[bank].label;
  const rateName = CB_BANKS[bank].rate_name;

  return `Você é um analista macro sênior. Vou te dar o texto integral de uma ata do ${bankLabel} (${CB_BANKS[bank].country}). Extraia as informações estruturadas abaixo. Seja FIEL ao texto — não invente, não interprete excessivamente. Se algo não está claro no texto, use null.

Responda APENAS com JSON válido, neste schema exato:

{
  "meeting_date": "YYYY-MM-DD",
  "decision": "cut" | "hike" | "hold",
  "magnitude_bps": 0,
  "rate_after": número (taxa em % ao ano, ex: 10.50),
  "vote": {
    "unanimous": true/false,
    "dissenters": [{"name": "nome do dissenter", "position": "preferiu cortar X bps a mais" }]
  },
  "tone": "hawkish" | "dovish" | "neutral",
  "tone_score": -2 a +2 (negativo = dovish, positivo = hawkish, escala inteira),
  "summary": "resumo de 3-5 frases ${lang} capturando a essência da decisão e mensagem central",
  "forward_guidance": "1-2 frases ${lang} sobre o que sinalizam para próximas reuniões. Use null se não houver guidance explícito.",
  "risks_inflation": ["bullet 1 ${lang}", "bullet 2 ${lang}"],
  "risks_activity": ["bullet 1 ${lang}", "bullet 2 ${lang}"],
  "changes_vs_previous": ["bullet ${lang} sobre o que mudou na linguagem vs ata/comunicado anterior"],
  "key_quotes": [
    { "text": "trecho relevante curto, máximo 30 palavras, sempre na língua original do documento", "attribution": "contexto (ex: 'parágrafo sobre inflação', 'forward guidance', 'avaliação de riscos')" }
  ]
}

REGRAS:
- meeting_date: data da reunião (não da publicação da ata). Procure no documento.
- decision: "cut" se cortou taxa, "hike" se subiu, "hold" se manteve.
- magnitude_bps: magnitude em basis points (50 para 0.50pp). 0 se hold.
- rate_after: a taxa que ficou após a decisão (% a.a.). Procure menções tipo "manteve em X%" ou "elevou para Y%".
- vote.unanimous: true se votação foi unânime.
- dissenters: liste se houver votos divergentes, com nome e qual posição preferiam.
- tone: avalie o tom geral. Hawkish = mais preocupado com inflação / mais restritivo. Dovish = mais preocupado com atividade / mais acomodatício. Neutral = balanço entre riscos.
- tone_score: -2 (muito dovish), -1 (dovish), 0 (neutral), +1 (hawkish), +2 (muito hawkish).
- summary: ${lang}, denso, institucional. Não copie do texto original — sintetize.
- changes_vs_previous: SE o texto mencionar mudanças vs comunicado anterior, liste. Se não houver menção explícita, retorne array vazio.
- key_quotes: 2-4 trechos CURTOS (máx 30 palavras cada). Mantenha na língua original. Atribuição = contexto onde aparecem.

TEXTO DA ATA:
${pdfText}`;
}

/* ---------- Ingestion flow ---------- */

async function startCBIngestion(file, bank) {
  if (!DB.settings.gemini_api_key) {
    showToast('Configure Gemini API key primeiro', true);
    setModal('settings');
    return;
  }

  state._cb_ingest = { stage: 'extracting_pdf', file, bank, status: 'Extraindo texto do PDF…' };
  render();

  try {
    const { text, pageCount } = await extractPdfText(file);
    if (!text || text.length < 200) throw new Error('PDF muito curto ou ilegível');

    state._cb_ingest.stage = 'calling_gemini';
    state._cb_ingest.status = `PDF extraído (${pageCount} páginas, ${text.length} chars). Chamando Gemini...`;
    render();

    const prompt = buildCBExtractionPrompt(bank, text);
    const result = await callGeminiRaw(prompt, DB.settings.gemini_api_key, (msg) => {
      state._cb_ingest.status = msg;
      render();
    });

    if (!result || !result.decision) throw new Error('Resposta inválida do Gemini');

    // Build draft minute object
    const draft = {
      ...emptyCBMinute(bank),
      bank,
      source_filename: file.name,
      ...result,
    };
    // Ensure arrays are arrays
    draft.risks_inflation     = Array.isArray(draft.risks_inflation)     ? draft.risks_inflation     : [];
    draft.risks_activity      = Array.isArray(draft.risks_activity)      ? draft.risks_activity      : [];
    draft.changes_vs_previous = Array.isArray(draft.changes_vs_previous) ? draft.changes_vs_previous : [];
    draft.key_quotes          = Array.isArray(draft.key_quotes)          ? draft.key_quotes          : [];
    if (!draft.vote || typeof draft.vote !== 'object') draft.vote = { unanimous: true, dissenters: [] };
    if (!Array.isArray(draft.vote.dissenters)) draft.vote.dissenters = [];

    state._cb_ingest = null;
    state._cb_review = draft;
    state.view = 'mi_cb_review';
    render();
    showToast('Ata extraída — revise antes de salvar');
  } catch (err) {
    console.error('CB ingestion error:', err);
    state._cb_ingest = null;
    showToast('Erro: ' + err.message, true);
    render();
  }
}

/* ---------- Render: List ---------- */

function renderCentralBanks() {
  const all = getCBMinutes();
  const filter = state._cb_filter || 'all';
  const filtered = filter === 'all' ? all : all.filter(m => m.bank === filter);

  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Bancos Centrais', 'Bancos <em>Centrais</em>',
      'Atas de COPOM e FOMC ingeridas e estruturadas. O sistema extrai decisão, tom, guidance e riscos via Gemini, com revisão editável antes de salvar.'),

    h('div', { class: 'cb-page-actions' }, [
      h('div', { class: 'cb-bank-tabs' }, [
        h('button', {
          class: 'cb-bank-tab' + (filter === 'all' ? ' active' : ''),
          onClick: () => { state._cb_filter = 'all'; render(); },
        }, `Todos (${all.length})`),
        h('button', {
          class: 'cb-bank-tab' + (filter === 'copom' ? ' active' : ''),
          onClick: () => { state._cb_filter = 'copom'; render(); },
        }, `COPOM (${all.filter(m => m.bank === 'copom').length})`),
        h('button', {
          class: 'cb-bank-tab' + (filter === 'fomc' ? ' active' : ''),
          onClick: () => { state._cb_filter = 'fomc'; render(); },
        }, `FOMC (${all.filter(m => m.bank === 'fomc').length})`),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-secondary', onClick: () => triggerCBUpload('copom') }, '+ Ingerir ata COPOM'),
        h('button', { class: 'btn-secondary', onClick: () => triggerCBUpload('fomc') }, '+ Ingerir ata FOMC'),
      ]),
    ]),

    state._cb_ingest && renderCBIngestProgress(),

    filtered.length === 0
      ? renderCBEmpty(filter)
      : h('div', { class: 'cb-list' }, filtered.map(m => renderCBRow(m))),
  ]);
}

function renderCBIngestProgress() {
  const ig = state._cb_ingest;
  return h('div', {
    style: {
      background: 'var(--bg-2)', border: '1px solid var(--amber)', padding: '16px 20px',
      marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }
  }, [
    h('div', {}, [
      h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '6px' } },
        'Processando ata ' + CB_BANKS[ig.bank].label + ' · ' + ig.file.name),
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)' } },
        ig.status),
    ]),
  ]);
}

function renderCBEmpty(filter) {
  return h('div', { class: 'cb-empty' }, [
    h('div', { class: 'cb-empty-title' }, 'Nenhuma ata ingerida ainda'),
    h('p', { class: 'cb-empty-desc' }, 'Faça upload da ata em PDF (COPOM publica em PT, FOMC publica em EN). O sistema extrai decisão, votação, tom, forward guidance e riscos automaticamente. Você revisa antes de salvar.'),
    h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center' } }, [
      h('button', { class: 'btn-primary', onClick: () => triggerCBUpload('copom') }, '+ Ingerir COPOM'),
      h('button', { class: 'btn-primary', onClick: () => triggerCBUpload('fomc') }, '+ Ingerir FOMC'),
    ]),
  ]);
}

function renderCBRow(m) {
  const bank = CB_BANKS[m.bank];
  const dec = CB_DECISIONS[m.decision] || CB_DECISIONS.hold;
  const tone = CB_TONES[m.tone] || CB_TONES.neutral;
  const decLabel = dec.label + (m.magnitude_bps ? ` ${m.magnitude_bps}bps` : '');
  const dateLabel = m.meeting_date ? formatBRDate(m.meeting_date) : '—';

  return h('div', { class: 'cb-row', onClick: () => setDetail('cbminute', m.id) }, [
    h('div', { class: 'cb-row-date' }, dateLabel),
    h('div', { class: 'cb-row-bank' }, bank.label),
    h('div', { class: 'cb-row-decision ' + dec.class }, decLabel),
    h('div', { class: 'cb-row-summary' }, m.summary || '—'),
    h('div', { class: 'cb-row-tone ' + tone.class }, tone.label),
    h('button', {
      class: 'cb-row-delete',
      onClick: (e) => { e.stopPropagation(); deleteCBMinute(m.id); },
      title: 'Excluir',
    }, '×'),
  ]);
}

function formatBRDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

/* ---------- Trigger upload ---------- */

function triggerCBUpload(bank) {
  // Create a transient file input and click it
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf,.pdf';
  input.onchange = (e) => {
    const file = e.target.files?.[0];
    if (file) startCBIngestion(file, bank);
  };
  input.click();
}

/* ---------- Render: Review (after extraction) ---------- */

function renderCBReview() {
  const m = state._cb_review;
  if (!m) return renderCentralBanks();
  const bank = CB_BANKS[m.bank];

  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Revisar Ata', `Revisar — ${bank.label} <em>${m.meeting_date || 'sem data'}</em>`,
      'Confira e ajuste os campos extraídos antes de salvar. Tudo é editável.'),

    h('div', { class: 'cb-review-wrap' }, [
      h('div', { class: 'cb-review-banner' },
        `Extração via Gemini concluída. Os campos abaixo refletem a interpretação automática. Revise especialmente: decisão, magnitude, taxa final, tom e guidance. Edite o que precisar e salve.`),

      // Section: Identificação
      h('div', { class: 'cb-review-section' }, [
        h('div', { class: 'cb-review-section-title' }, '01 — Identificação'),
        h('div', { class: 'form-row three' }, [
          formField('Banco Central', h('select', {
            class: 'form-field-select',
            onchange: e => { m.bank = e.target.value; render(); },
          }, Object.entries(CB_BANKS).map(([k, v]) =>
            h('option', { value: k, selected: m.bank === k ? 'selected' : null }, v.label)
          ))),
          formField('Data da reunião', h('input', {
            class: 'form-field-input', type: 'date', value: m.meeting_date || '',
            oninput: e => m.meeting_date = e.target.value,
          })),
          formField('Taxa após decisão (% a.a.)', h('input', {
            class: 'form-field-input', type: 'number', step: '0.05',
            value: m.rate_after != null ? m.rate_after : '',
            placeholder: 'ex: 10.50',
            oninput: e => m.rate_after = e.target.value === '' ? null : parseFloat(e.target.value),
          })),
        ]),
      ]),

      // Section: Decisão
      h('div', { class: 'cb-review-section' }, [
        h('div', { class: 'cb-review-section-title' }, '02 — Decisão & Votação'),
        h('div', { class: 'form-row three' }, [
          formField('Decisão', h('select', {
            class: 'form-field-select',
            onchange: e => { m.decision = e.target.value; if (e.target.value === 'hold') m.magnitude_bps = 0; render(); },
          }, Object.entries(CB_DECISIONS).map(([k, v]) =>
            h('option', { value: k, selected: m.decision === k ? 'selected' : null }, v.label)
          ))),
          formField('Magnitude (bps)', h('input', {
            class: 'form-field-input', type: 'number', step: '25',
            value: m.magnitude_bps || 0, disabled: m.decision === 'hold',
            oninput: e => m.magnitude_bps = parseInt(e.target.value) || 0,
          })),
          formField('Votação', h('select', {
            class: 'form-field-select',
            onchange: e => { m.vote.unanimous = e.target.value === 'true'; if (m.vote.unanimous) m.vote.dissenters = []; render(); },
          }, [
            h('option', { value: 'true', selected: m.vote.unanimous ? 'selected' : null }, 'Unânime'),
            h('option', { value: 'false', selected: !m.vote.unanimous ? 'selected' : null }, 'Com divergências'),
          ])),
        ]),
        !m.vote.unanimous && h('div', { style: { marginTop: '10px' } }, [
          h('label', { class: 'form-field-label' }, 'Dissenters'),
          renderCBListEditor(m.vote.dissenters, (idx, val) => {
            m.vote.dissenters[idx] = val ? { name: val, position: '' } : null;
            m.vote.dissenters = m.vote.dissenters.filter(Boolean);
            render();
          }, (val) => { m.vote.dissenters.push({ name: val, position: '' }); render(); },
            (idx) => { m.vote.dissenters.splice(idx, 1); render(); },
            'Nome do dissenter (ex: João Silva — preferiu cortar 25bps a mais)',
            (d) => d.name + (d.position ? ' — ' + d.position : '')
          ),
        ]),
      ]),

      // Section: Tom
      h('div', { class: 'cb-review-section' }, [
        h('div', { class: 'cb-review-section-title' }, '03 — Tom Geral'),
        h('div', { class: 'form-row' }, [
          formField('Tom', h('select', {
            class: 'form-field-select',
            onchange: e => { m.tone = e.target.value; render(); },
          }, Object.entries(CB_TONES).map(([k, v]) =>
            h('option', { value: k, selected: m.tone === k ? 'selected' : null }, v.label)
          ))),
          formField('Score (-2 dovish a +2 hawkish)', h('input', {
            class: 'form-field-input', type: 'number', step: '1', min: '-2', max: '2',
            value: m.tone_score != null ? m.tone_score : 0,
            oninput: e => m.tone_score = parseInt(e.target.value) || 0,
          })),
        ]),
      ]),

      // Section: Summary
      h('div', { class: 'cb-review-section' }, [
        h('div', { class: 'cb-review-section-title' }, '04 — Resumo'),
        h('textarea', {
          class: 'form-field-textarea', rows: '5',
          oninput: e => m.summary = e.target.value,
        }, m.summary || ''),
      ]),

      // Section: Forward Guidance
      h('div', { class: 'cb-review-section' }, [
        h('div', { class: 'cb-review-section-title' }, '05 — Forward Guidance'),
        h('textarea', {
          class: 'form-field-textarea', rows: '3',
          placeholder: 'O que sinalizam para próximas reuniões. Vazio se não houver guidance explícito.',
          oninput: e => m.forward_guidance = e.target.value,
        }, m.forward_guidance || ''),
      ]),

      // Section: Risks
      h('div', { class: 'cb-review-section' }, [
        h('div', { class: 'cb-review-section-title' }, '06 — Riscos para Inflação'),
        renderCBListEditor(m.risks_inflation,
          (idx, val) => { m.risks_inflation[idx] = val; render(); },
          (val) => { m.risks_inflation.push(val); render(); },
          (idx) => { m.risks_inflation.splice(idx, 1); render(); },
          'Adicionar risco para inflação...'
        ),
      ]),
      h('div', { class: 'cb-review-section' }, [
        h('div', { class: 'cb-review-section-title' }, '07 — Riscos para Atividade'),
        renderCBListEditor(m.risks_activity,
          (idx, val) => { m.risks_activity[idx] = val; render(); },
          (val) => { m.risks_activity.push(val); render(); },
          (idx) => { m.risks_activity.splice(idx, 1); render(); },
          'Adicionar risco para atividade...'
        ),
      ]),

      // Section: Changes
      h('div', { class: 'cb-review-section' }, [
        h('div', { class: 'cb-review-section-title' }, '08 — Mudanças vs Ata Anterior'),
        renderCBListEditor(m.changes_vs_previous,
          (idx, val) => { m.changes_vs_previous[idx] = val; render(); },
          (val) => { m.changes_vs_previous.push(val); render(); },
          (idx) => { m.changes_vs_previous.splice(idx, 1); render(); },
          'Mudança identificada vs comunicado anterior...'
        ),
      ]),

      // Section: Key quotes
      h('div', { class: 'cb-review-section' }, [
        h('div', { class: 'cb-review-section-title' }, '09 — Trechos-Chave'),
        h('div', { class: 'cb-list-edit' },
          (m.key_quotes || []).map((q, idx) =>
            h('div', { class: 'cb-list-edit-row' }, [
              h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' } }, [
                h('textarea', {
                  oninput: e => { q.text = e.target.value; },
                }, q.text || ''),
                h('input', {
                  class: 'form-field-input', type: 'text', value: q.attribution || '',
                  placeholder: 'Contexto / atribuição (ex: "parágrafo sobre inflação")',
                  oninput: e => { q.attribution = e.target.value; },
                  style: { fontSize: '11px' },
                }),
              ]),
              h('button', {
                class: 'cb-list-edit-remove',
                onClick: () => { m.key_quotes.splice(idx, 1); render(); },
              }, '×'),
            ])
          )
        ),
        h('button', {
          class: 'cb-list-edit-add',
          style: { marginTop: '8px' },
          onClick: () => { m.key_quotes.push({ text: '', attribution: '' }); render(); },
        }, '+ Adicionar trecho'),
      ]),

      // Actions
      h('div', { class: 'form-actions' }, [
        h('button', {
          class: 'btn-secondary',
          onClick: () => { state._cb_review = null; setView('mi_centralbanks'); },
        }, 'Descartar'),
        h('button', {
          class: 'btn-primary',
          onClick: () => {
            const draft = state._cb_review;
            if (!draft.meeting_date) { showToast('Data da reunião é obrigatória', true); return; }
            const id = saveCBMinute(draft);
            state._cb_review = null;
            showToast('Ata salva');
            state.view = 'mi_centralbanks';
            state.detail = { kind: 'cbminute', slug: id };
            render();
          },
        }, 'Salvar ata'),
      ]),
    ]),
  ]);
}

function renderCBListEditor(items, onUpdate, onAdd, onRemove, placeholder, formatter) {
  return h('div', {}, [
    h('div', { class: 'cb-list-edit' },
      (items || []).map((item, idx) => {
        const value = formatter ? formatter(item) : item;
        return h('div', { class: 'cb-list-edit-row' }, [
          h('textarea', {
            value: value, rows: '2',
            oninput: e => onUpdate(idx, e.target.value),
          }, value),
          h('button', {
            class: 'cb-list-edit-remove',
            onClick: () => onRemove(idx),
          }, '×'),
        ]);
      })
    ),
    h('button', {
      class: 'cb-list-edit-add',
      style: { marginTop: '8px' },
      onClick: () => {
        const val = prompt(placeholder || 'Adicionar item:');
        if (val && val.trim()) onAdd(val.trim());
      },
    }, '+ Adicionar'),
  ]);
}

/* ---------- Render: Detail ---------- */

function renderCBMinuteDetail() {
  const m = getCBMinute(state.detail.slug);
  if (!m) {
    return h('div', { class: 'content fade-up' }, [
      h('button', { class: 'back-btn', onClick: clearDetail }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),
      h('div', { class: 'empty' }, [h('div', { class: 'empty-title' }, 'Ata não encontrada')]),
    ]);
  }

  const bank = CB_BANKS[m.bank];
  const dec = CB_DECISIONS[m.decision] || CB_DECISIONS.hold;
  const tone = CB_TONES[m.tone] || CB_TONES.neutral;

  return h('div', { class: 'content fade-up' }, [
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      h('button', { class: 'back-btn', style: { margin: '0' }, onClick: clearDetail }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', {
          class: 'btn-secondary',
          onClick: () => {
            state._cb_review = JSON.parse(JSON.stringify(m));
            state.view = 'mi_cb_review';
            render();
          },
        }, '✎ Editar'),
        h('button', {
          class: 'btn-secondary',
          style: { color: 'var(--red)', borderColor: 'var(--red)' },
          onClick: () => { deleteCBMinute(m.id); setView('mi_centralbanks'); },
        }, 'Excluir'),
      ]),
    ]),

    // Header
    h('div', { class: 'cb-detail-head' }, [
      h('div', { class: 'cb-detail-meta' }, [
        h('span', {}, bank.label + ' · ' + bank.country),
        h('span', { style: { color: 'var(--amber)' } }, formatBRDate(m.meeting_date)),
      ]),
      h('div', { class: 'cb-detail-title' }, `${dec.label}${m.magnitude_bps ? ' de ' + m.magnitude_bps + ' bps' : ''}`),
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px', color: 'var(--text-muted)', marginTop: '4px' } },
        m.rate_after != null ? `${bank.rate_name} ficou em ${m.rate_after.toFixed(2)}% a.a.` : ''),
      h('div', { class: 'cb-detail-decision-badges' }, [
        h('span', { class: 'cb-row-decision ' + dec.class }, dec.label + (m.magnitude_bps ? ' ' + m.magnitude_bps + 'bps' : '')),
        h('span', { class: 'cb-row-tone ' + tone.class, title: tone.desc }, 'Tom: ' + tone.label),
        h('span', { class: 'badge' }, m.vote.unanimous ? 'Votação unânime' : `${(m.vote.dissenters || []).length} dissenter(s)`),
      ]),
    ]),

    // Section: Resumo
    m.summary && h('div', { class: 'cb-detail-section' }, [
      h('div', { class: 'cb-detail-section-title' }, 'Resumo'),
      h('p', { class: 'cb-detail-text' }, m.summary),
    ]),

    // Section: Forward Guidance
    m.forward_guidance && h('div', { class: 'cb-detail-section' }, [
      h('div', { class: 'cb-detail-section-title' }, 'Forward Guidance'),
      h('p', { class: 'cb-detail-text' }, m.forward_guidance),
    ]),

    // Section: Riscos
    (m.risks_inflation?.length > 0 || m.risks_activity?.length > 0) &&
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' } }, [
      m.risks_inflation?.length > 0 && h('div', {}, [
        h('div', { class: 'cb-detail-section-title' }, 'Riscos para Inflação'),
        h('ul', { class: 'cb-detail-list' }, m.risks_inflation.map(r => h('li', {}, r))),
      ]),
      m.risks_activity?.length > 0 && h('div', {}, [
        h('div', { class: 'cb-detail-section-title' }, 'Riscos para Atividade'),
        h('ul', { class: 'cb-detail-list' }, m.risks_activity.map(r => h('li', {}, r))),
      ]),
    ]),

    // Section: Mudanças
    m.changes_vs_previous?.length > 0 && h('div', { class: 'cb-detail-section' }, [
      h('div', { class: 'cb-detail-section-title' }, 'Mudanças vs Comunicado Anterior'),
      h('div', { class: 'cb-detail-changes' }, [
        h('ul', { class: 'cb-detail-list', style: { margin: 0 } }, m.changes_vs_previous.map(c => h('li', {}, c))),
      ]),
    ]),

    // Section: Votação
    !m.vote.unanimous && (m.vote.dissenters || []).length > 0 && h('div', { class: 'cb-detail-section' }, [
      h('div', { class: 'cb-detail-section-title' }, 'Votos Divergentes'),
      h('ul', { class: 'cb-detail-list' }, m.vote.dissenters.map(d =>
        h('li', {}, d.name + (d.position ? ' — ' + d.position : ''))
      )),
    ]),

    // Section: Trechos-chave
    m.key_quotes?.length > 0 && h('div', { class: 'cb-detail-section' }, [
      h('div', { class: 'cb-detail-section-title' }, 'Trechos-Chave'),
      ...m.key_quotes.map(q => h('div', { class: 'cb-detail-quote' }, [
        h('div', { class: 'cb-detail-quote-text' }, '« ' + q.text + ' »'),
        q.attribution && h('div', { class: 'cb-detail-quote-attr' }, q.attribution),
      ])),
    ]),

    // Footer: source + date
    h('div', { style: { marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-faint)' } }, [
      m.source_filename && h('div', {}, 'Fonte: ' + m.source_filename),
      m.created_at && h('div', { style: { marginTop: '4px' } }, 'Ingerido em ' + new Date(m.created_at).toLocaleString('pt-BR')),
    ]),
  ]);
}

/* ---------- Widget: latest CB on Macro Dashboard ---------- */

function renderCBWidgets() {
  const copom = getLatestCBMinute('copom');
  const fomc = getLatestCBMinute('fomc');

  return h('div', { class: 'cb-widget-grid' }, [
    renderCBWidget('copom', copom),
    renderCBWidget('fomc', fomc),
  ]);
}

function renderCBWidget(bank, m) {
  const bankMeta = CB_BANKS[bank];
  if (!m) {
    return h('div', { class: 'cb-widget cb-widget-empty' }, [
      h('div', { class: 'cb-widget-head' }, [
        h('div', { class: 'cb-widget-title' }, 'Última ata ' + bankMeta.label),
        h('div', { class: 'cb-widget-date' }, '—'),
      ]),
      h('div', { class: 'cb-widget-decision', style: { color: 'var(--text-faint)', fontSize: '14px', fontStyle: 'italic' } },
        'Nenhuma ata ingerida'),
      h('div', { class: 'cb-widget-summary' },
        bankMeta.cycle + '. Ingira a última ata em Macro Intelligence → Bancos Centrais.'),
    ]);
  }

  const dec = CB_DECISIONS[m.decision] || CB_DECISIONS.hold;
  const tone = CB_TONES[m.tone] || CB_TONES.neutral;
  const decLabel = dec.label + (m.magnitude_bps ? ` de ${m.magnitude_bps}bps` : '');

  return h('div', { class: 'cb-widget', onClick: () => setDetail('cbminute', m.id) }, [
    h('div', { class: 'cb-widget-head' }, [
      h('div', { class: 'cb-widget-title' }, 'Última ata ' + bankMeta.label),
      h('div', { class: 'cb-widget-date' }, formatBRDate(m.meeting_date)),
    ]),
    h('div', { class: 'cb-widget-decision' }, decLabel + (m.rate_after != null ? ` · ${bankMeta.rate_name} ${m.rate_after.toFixed(2)}%` : '')),
    m.summary && h('div', { class: 'cb-widget-summary' }, m.summary),
    h('div', { class: 'cb-widget-tags' }, [
      h('span', { class: 'cb-widget-tag tone-' + tone.class }, 'Tom: ' + tone.label),
      m.vote.unanimous
        ? h('span', { class: 'cb-widget-tag' }, 'Unânime')
        : h('span', { class: 'cb-widget-tag' }, `${m.vote.dissenters.length} divergente(s)`),
    ]),
  ]);
}


/* ============================================================
   23. SECTORAL INDICATORS — FipeZap + Abrainc/Fipe
   ============================================================ */

// 9 praças cobertas: Nacional + 8 capitais + Goiânia (sede da gestora)
const FIPE_CITIES = [
  { key: 'nacional',  label: 'Nacional',        variants: ['nacional', 'índice fipezap', 'fipezap', 'brasil', 'geral'] },
  { key: 'sp',        label: 'São Paulo',       variants: ['são paulo', 'sao paulo', 'sp'] },
  { key: 'rj',        label: 'Rio de Janeiro',  variants: ['rio de janeiro', 'rio', 'rj'] },
  { key: 'bh',        label: 'Belo Horizonte',  variants: ['belo horizonte', 'bh'] },
  { key: 'poa',       label: 'Porto Alegre',    variants: ['porto alegre', 'poa'] },
  { key: 'recife',    label: 'Recife',          variants: ['recife'] },
  { key: 'bsb',       label: 'Brasília',        variants: ['brasília', 'brasilia', 'bsb', 'df'] },
  { key: 'fortaleza', label: 'Fortaleza',       variants: ['fortaleza'] },
  { key: 'salvador',  label: 'Salvador',        variants: ['salvador'] },
  { key: 'goiania',   label: 'Goiânia',         variants: ['goiânia', 'goiania', 'goias', 'goiás'] },
];

function fipeCityKeyFromLabel(label) {
  if (!label) return null;
  const norm = String(label).toLowerCase().trim();
  for (const c of FIPE_CITIES) {
    if (c.variants.some(v => norm === v || norm.includes(v))) return c.key;
  }
  return null;
}

const FIPE_SERIES_TYPES = [
  { key: 'res_venda',    label: 'Residencial · Venda',    short: 'Res. Venda' },
  { key: 'res_locacao',  label: 'Residencial · Locação',  short: 'Res. Locação' },
  { key: 'com_venda',    label: 'Comercial · Venda',      short: 'Com. Venda' },
  { key: 'com_locacao',  label: 'Comercial · Locação',    short: 'Com. Locação' },
];

const ABRAINC_SEGMENTS = [
  { key: 'map',   label: 'Médio e Alto Padrão (MAP)' },
  { key: 'mcmv',  label: 'Minha Casa Minha Vida (MCMV)' },
  { key: 'total', label: 'Total do mercado' },
];

const ABRAINC_METRICS = [
  { key: 'lancamentos',  label: 'Lançamentos', unit: 'unid.', desc: 'Unidades lançadas' },
  { key: 'vendas',       label: 'Vendas',      unit: 'unid.', desc: 'Unidades vendidas (brutas)' },
  { key: 'entregas',     label: 'Entregas',    unit: 'unid.', desc: 'Unidades com habite-se' },
  { key: 'oferta',       label: 'Oferta Final',unit: 'unid.', desc: 'Estoque disponível' },
  { key: 'distratos',    label: 'Distratos',   unit: 'unid.', desc: 'Unidades distratadas' },
  { key: 'absorcao',     label: 'Prazo de absorção', unit: 'meses', desc: 'Meses para vender estoque' },
];

/* ---------- Data layer ---------- */

function getFipeData() {
  if (!DB.fipezap) DB.fipezap = { series: {}, updated_at: null, source_filename: null };
  return DB.fipezap;
}

function getAbraincData() {
  if (!DB.abrainc) DB.abrainc = { series: {}, updated_at: null, source_filename: null };
  return DB.abrainc;
}

/* ---------- Parser: FipeZap ----------
   A planilha histórica da Fipe tem múltiplas abas (residencial venda, residencial locação,
   comercial venda, comercial locação) ou uma única aba com colunas por cidade e linhas por mês.
   Parser tolera: 1) múltiplas abas com nomes variados; 2) cabeçalho em qualquer linha do topo;
   3) datas em coluna A (em formato string "Jan/2014" ou serial Excel); 4) cidades em colunas.
*/

function parseFipeZapWorkbook(workbook) {
  const result = { series: {}, warnings: [], stats: { totalRows: 0, citiesFound: new Set() } };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false, dateNF: 'yyyy-mm-dd' });
    if (!rows || rows.length < 5) continue;

    const seriesType = inferFipeSeriesType(sheetName);
    if (!seriesType) {
      result.warnings.push(`Aba "${sheetName}" não reconhecida como tipo FipeZap`);
      continue;
    }

    // Find header row: row with the most city-like strings
    let headerRow = -1;
    let headerCols = [];
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const row = rows[r] || [];
      let cityMatches = 0;
      for (let c = 1; c < row.length; c++) {
        const v = row[c];
        if (v && typeof v === 'string' && fipeCityKeyFromLabel(v)) cityMatches++;
      }
      if (cityMatches >= 2) { headerRow = r; headerCols = row; break; }
    }
    if (headerRow < 0) {
      result.warnings.push(`Aba "${sheetName}": cabeçalho não identificado`);
      continue;
    }

    // Build city → column map
    const cityCols = {};
    for (let c = 1; c < headerCols.length; c++) {
      const cityKey = fipeCityKeyFromLabel(headerCols[c]);
      if (cityKey && !cityCols[cityKey]) {
        cityCols[cityKey] = c;
        result.stats.citiesFound.add(cityKey);
      }
    }

    if (Object.keys(cityCols).length === 0) {
      result.warnings.push(`Aba "${sheetName}": nenhuma cidade reconhecida`);
      continue;
    }

    // Initialize series
    if (!result.series[seriesType]) result.series[seriesType] = {};
    for (const cityKey of Object.keys(cityCols)) {
      if (!result.series[seriesType][cityKey]) result.series[seriesType][cityKey] = [];
    }

    // Parse data rows
    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[0]) continue;
      const dateIso = parseFipeDate(row[0]);
      if (!dateIso) continue;

      for (const [cityKey, col] of Object.entries(cityCols)) {
        const raw = row[col];
        const val = parseFipeNumber(raw);
        if (val != null) {
          result.series[seriesType][cityKey].push({ date: dateIso, value: val });
          result.stats.totalRows++;
        }
      }
    }
  }

  // Sort series chronologically
  for (const st of Object.keys(result.series)) {
    for (const ck of Object.keys(result.series[st])) {
      result.series[st][ck].sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  result.stats.citiesFound = Array.from(result.stats.citiesFound);
  return result;
}

function inferFipeSeriesType(sheetName) {
  const n = String(sheetName).toLowerCase();
  const isComercial = n.includes('comerci');
  const isLocacao = n.includes('loca') || n.includes('aluguel') || n.includes('renta');
  const isVenda = n.includes('venda') || n.includes('sale');
  if (isComercial && isLocacao) return 'com_locacao';
  if (isComercial && isVenda)   return 'com_venda';
  if (isLocacao && !isComercial) return 'res_locacao';
  if (isVenda && !isComercial)   return 'res_venda';
  // Default assumption for ambiguous sheets
  if (n.includes('residenc')) return 'res_venda';
  return null;
}

function parseFipeDate(raw) {
  if (!raw) return null;
  // Serial date from Excel
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = String(raw).trim();
  // ISO format
  const iso = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3] || '01'}`;
  // "Jan/2014", "jan-14", "01/2014"
  const monthsPt = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
                     jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
  const mt = s.toLowerCase().match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z\/\-\s]*(\d{2,4})/);
  if (mt) {
    const m = monthsPt[mt[1]]; let y = mt[2];
    if (y.length === 2) y = (parseInt(y) > 80 ? '19' : '20') + y;
    return `${y}-${m}-01`;
  }
  // "01/2014" or "1/2014"
  const mm = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (mm) return `${mm[2]}-${String(mm[1]).padStart(2,'0')}-01`;
  // "01/01/2014"
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`;
  return null;
}

function parseFipeNumber(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && !isNaN(raw)) return raw;
  const s = String(raw).replace(/%/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/* ---------- Parser: Abrainc ----------
   Estrutura tipica: abas com lançamentos, vendas, entregas, oferta, distratos.
   Segmentação MAP/MCMV em colunas ou em abas separadas. Datas em coluna A (mensais).
*/

function parseAbraincWorkbook(workbook) {
  const result = { series: {}, warnings: [], stats: { totalRows: 0, metricsFound: new Set() } };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false, dateNF: 'yyyy-mm-dd' });
    if (!rows || rows.length < 5) continue;

    const metric = inferAbraincMetric(sheetName);
    if (!metric) {
      result.warnings.push(`Aba "${sheetName}" não reconhecida como métrica Abrainc`);
      continue;
    }
    result.stats.metricsFound.add(metric);

    // Find header row — looks for segment labels (MAP, MCMV, Total)
    let headerRow = -1;
    let headerCols = [];
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const row = rows[r] || [];
      let segMatches = 0;
      for (let c = 1; c < row.length; c++) {
        const v = String(row[c] || '').toLowerCase();
        if (v.includes('map') || v.includes('mcmv') || v.includes('total') ||
            v.includes('médio') || v.includes('econ') || v.includes('alto padrão')) {
          segMatches++;
        }
      }
      if (segMatches >= 1) { headerRow = r; headerCols = row; break; }
    }

    // Fallback: use first row if no segment markers found
    if (headerRow < 0) { headerRow = 0; headerCols = rows[0] || []; }

    // Build segment → column map
    const segCols = { map: -1, mcmv: -1, total: -1 };
    for (let c = 1; c < headerCols.length; c++) {
      const v = String(headerCols[c] || '').toLowerCase();
      if ((v.includes('map') || v.includes('médio') || v.includes('alto padrão')) && segCols.map === -1) segCols.map = c;
      else if ((v.includes('mcmv') || v.includes('econ') || v.includes('minha casa')) && segCols.mcmv === -1) segCols.mcmv = c;
      else if (v.includes('total') && segCols.total === -1) segCols.total = c;
    }
    // If no segment columns found, assume single-column data is "total"
    if (segCols.map === -1 && segCols.mcmv === -1 && segCols.total === -1) {
      segCols.total = 1;
    }

    // Initialize series
    if (!result.series[metric]) result.series[metric] = {};
    for (const seg of ['map', 'mcmv', 'total']) {
      if (segCols[seg] >= 0 && !result.series[metric][seg]) result.series[metric][seg] = [];
    }

    // Parse data rows
    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[0]) continue;
      const dateIso = parseFipeDate(row[0]);
      if (!dateIso) continue;

      for (const seg of ['map', 'mcmv', 'total']) {
        if (segCols[seg] < 0) continue;
        const val = parseFipeNumber(row[segCols[seg]]);
        if (val != null) {
          result.series[metric][seg].push({ date: dateIso, value: val });
          result.stats.totalRows++;
        }
      }
    }
  }

  // Sort and dedupe
  for (const m of Object.keys(result.series)) {
    for (const s of Object.keys(result.series[m])) {
      result.series[m][s].sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  result.stats.metricsFound = Array.from(result.stats.metricsFound);
  return result;
}

function inferAbraincMetric(sheetName) {
  const n = String(sheetName).toLowerCase();
  if (n.includes('lança') || n.includes('lanca') || n.includes('launch')) return 'lancamentos';
  if (n.includes('venda') || n.includes('sale')) return 'vendas';
  if (n.includes('entreg') || n.includes('delivery')) return 'entregas';
  if (n.includes('oferta') || n.includes('estoque') || n.includes('inventor')) return 'oferta';
  if (n.includes('distrato') || n.includes('cancel')) return 'distratos';
  if (n.includes('absor') || n.includes('vso')) return 'absorcao';
  return null;
}

/* ---------- Ingestion handler ---------- */

async function ingestSectoralFile(file, source) {
  state._sectoral_ingest = { source, status: `Lendo arquivo "${file.name}"…`, error: null };
  render();

  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false });

    state._sectoral_ingest.status = 'Parseando planilha…';
    render();

    let parsed;
    if (source === 'fipezap') parsed = parseFipeZapWorkbook(wb);
    else if (source === 'abrainc') parsed = parseAbraincWorkbook(wb);
    else throw new Error('Fonte desconhecida');

    const totalSeries = source === 'fipezap'
      ? Object.keys(parsed.series).reduce((a, k) => a + Object.keys(parsed.series[k]).length, 0)
      : Object.keys(parsed.series).reduce((a, k) => a + Object.keys(parsed.series[k]).length, 0);

    if (totalSeries === 0) {
      throw new Error('Nenhuma série identificada. Verifique se a planilha é do layout oficial.');
    }

    // Save to DB
    if (source === 'fipezap') {
      DB.fipezap = {
        series: parsed.series,
        updated_at: new Date().toISOString(),
        source_filename: file.name,
        stats: parsed.stats,
        warnings: parsed.warnings,
      };
    } else {
      DB.abrainc = {
        series: parsed.series,
        updated_at: new Date().toISOString(),
        source_filename: file.name,
        stats: parsed.stats,
        warnings: parsed.warnings,
      };
    }
    saveDB(DB);

    state._sectoral_ingest = null;
    showToast(`${source === 'fipezap' ? 'FipeZap' : 'Abrainc'}: ${parsed.stats.totalRows} observações importadas`);
    render();
  } catch (err) {
    console.error('Sectoral ingestion error:', err);
    state._sectoral_ingest = { source, status: null, error: err.message };
    showToast('Erro: ' + err.message, true);
    render();
  }
}

function triggerSectoralUpload(source) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.onchange = (e) => {
    const file = e.target.files?.[0];
    if (file) ingestSectoralFile(file, source);
  };
  input.click();
}

/* ---------- Computed helpers ---------- */

// Compute MoM, YoY, YTD from a time series [{date, value}]
function computeSeriesStats(series) {
  if (!series || series.length === 0) return {};
  const last = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : null;
  const yrAgo = series.length > 12 ? series[series.length - 13] : null;

  const mom = (prev && last.value != null && prev.value != null) ? last.value - prev.value : null;
  const yoy = (yrAgo && last.value != null && yrAgo.value != null) ? last.value - yrAgo.value : null;

  // YTD: from Jan of current year
  const year = last.date.substring(0, 4);
  const janStart = series.find(s => s.date.startsWith(year + '-01'));
  const ytd = (janStart && last.value != null && janStart.value != null) ? last.value - janStart.value : null;

  // 12m accumulated return — compound monthly percentage changes (only if values look like percentages or indexes)
  const last12 = series.slice(-12);
  let accum12m = null;
  if (last12.length === 12) {
    // If values are index levels, compute (last / firstOf13) - 1
    const firstOf13 = series[series.length - 13];
    if (firstOf13 && firstOf13.value) {
      accum12m = ((last.value / firstOf13.value) - 1) * 100;
    }
  }

  return { last, prev, yrAgo, mom, yoy, ytd, accum12m };
}

/* ---------- Render: main page ---------- */

function renderSectoralIndicators() {
  const activeTab = state._sectoral_tab || 'fipezap';
  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Indicadores Setoriais', 'Indicadores <em>Setoriais</em> · Imobiliário',
      'Dados Fipe/Abrainc ingeridos mensalmente via Excel oficial. Preços (FipeZap), volumes do mercado primário (Abrainc). Base para o Ciclo Imobiliário aprimorado.'),

    renderSectoralIngestPanel(),

    h('div', { class: 'sec-tab-row' }, [
      h('button', {
        class: 'sec-tab' + (activeTab === 'fipezap' ? ' active' : ''),
        onClick: () => { state._sectoral_tab = 'fipezap'; render(); },
      }, 'FipeZap'),
      h('button', {
        class: 'sec-tab' + (activeTab === 'abrainc' ? ' active' : ''),
        onClick: () => { state._sectoral_tab = 'abrainc'; render(); },
      }, 'Abrainc/Fipe'),
    ]),

    activeTab === 'fipezap' ? renderFipeZapDashboard() : renderAbraincDashboard(),
  ]);
}

function renderSectoralIngestPanel() {
  const fipe = getFipeData();
  const abr = getAbraincData();
  const ig = state._sectoral_ingest;

  return h('div', { class: 'sec-ingest-panel' }, [
    renderIngestCard('FipeZap', 'fipezap', fipe, ig,
      'Planilha oficial da Fipe — série histórica de preços residencial/comercial, venda/locação, por cidade.',
      'https://www.fipe.org.br/pt-br/indices/fipezap/'),
    renderIngestCard('Abrainc/Fipe', 'abrainc', abr, ig,
      'Planilha oficial Abrainc — lançamentos, vendas, entregas, oferta, distratos por segmento MAP/MCMV.',
      'https://www.fipe.org.br/pt-br/indices/abrainc/'),
  ]);
}

function renderIngestCard(title, source, data, ig, desc, sourceUrl) {
  const isIngesting = ig && ig.source === source;
  const hasData = data.updated_at != null;
  const nSeries = hasData ? Object.keys(data.series).reduce((a, k) => a + Object.keys(data.series[k]).length, 0) : 0;

  return h('div', { class: 'sec-ingest-card' }, [
    h('div', { class: 'sec-ingest-head' }, [
      h('div', { class: 'sec-ingest-title' }, title),
      h('div', { class: 'sec-ingest-status' + (hasData ? ' ok' : '') }, hasData ? '● ativo' : '○ sem dados'),
    ]),
    h('div', { class: 'sec-ingest-desc' }, desc),

    hasData && h('div', { class: 'sec-ingest-meta' }, [
      h('span', {}, `${nSeries} séries · ${data.stats?.totalRows || '?'} observações`),
      h('span', {}, `atualizado ${new Date(data.updated_at).toLocaleDateString('pt-BR')}`),
    ]),

    isIngesting && ig.status && h('div', { class: 'sec-ingest-preview' }, [
      h('div', { class: 'sec-ingest-preview-title' }, 'Processando…'),
      h('div', { class: 'sec-ingest-preview-text' }, ig.status),
    ]),

    isIngesting && ig.error && h('div', { class: 'sec-ingest-preview', style: { borderColor: 'var(--red)' } }, [
      h('div', { class: 'sec-ingest-preview-title', style: { color: 'var(--red)' } }, 'Erro na ingestão'),
      h('div', { class: 'sec-ingest-preview-text' }, ig.error),
    ]),

    hasData && data.warnings?.length > 0 && h('div', { class: 'sec-ingest-preview', style: { borderColor: 'var(--amber)' } }, [
      h('div', { class: 'sec-ingest-preview-title' }, `${data.warnings.length} aviso(s)`),
      h('div', { class: 'sec-ingest-preview-text' }, data.warnings.slice(0, 5).join('\n')),
    ]),

    h('div', { class: 'sec-ingest-actions' }, [
      h('button', {
        class: 'btn-primary',
        disabled: isIngesting ? 'disabled' : null,
        onClick: () => triggerSectoralUpload(source),
      }, hasData ? '↻ Atualizar dados' : '+ Carregar Excel'),
      h('a', {
        href: sourceUrl, target: '_blank',
        class: 'btn-secondary',
        style: { textDecoration: 'none' },
      }, '↗ Fonte oficial'),
      hasData && h('button', {
        class: 'btn-secondary',
        style: { color: 'var(--text-faint)' },
        onClick: () => {
          if (!confirm('Apagar dados ' + title + '?')) return;
          if (source === 'fipezap') delete DB.fipezap;
          else delete DB.abrainc;
          saveDB(DB);
          render();
        },
      }, 'Limpar'),
    ]),
  ]);
}

/* ---------- FipeZap Dashboard ---------- */

function renderFipeZapDashboard() {
  const data = getFipeData();
  if (!data.updated_at) {
    return h('div', { class: 'sec-empty-state' }, [
      h('div', { class: 'sec-empty-title' }, 'FipeZap ainda não foi carregado'),
      h('p', { class: 'sec-empty-desc' },
        'Baixe a planilha oficial no site da Fipe e faça upload acima. O parser aceita o Excel histórico completo (múltiplas abas: residencial venda, residencial locação, comercial venda, comercial locação).'),
    ]);
  }

  const activeSeries = state._fipe_series_type || 'res_venda';
  const activeCity = state._fipe_city || 'nacional';

  return h('div', {}, [
    // Series type selector
    h('div', { class: 'sec-city-chips', style: { marginBottom: '10px' } },
      FIPE_SERIES_TYPES.map(st => h('span', {
        class: 'sec-city-chip' + (activeSeries === st.key ? ' active' : ''),
        onClick: () => { state._fipe_series_type = st.key; render(); },
      }, st.label))
    ),

    // City selector
    h('div', { class: 'sec-city-chips' },
      FIPE_CITIES.map(c => {
        const exists = data.series[activeSeries]?.[c.key] && data.series[activeSeries][c.key].length > 0;
        return h('span', {
          class: 'sec-city-chip' + (activeCity === c.key ? ' active' : '') + (exists ? '' : ' disabled'),
          style: exists ? {} : { opacity: '0.35', cursor: 'default' },
          onClick: () => { if (exists) { state._fipe_city = c.key; render(); } },
          title: exists ? c.label : c.label + ' — sem dados nesta série',
        }, c.label);
      })
    ),

    renderFipeZapStatsBlock(data, activeSeries, activeCity),

    renderFipeZapChart(data, activeSeries, activeCity),

    renderFipeZapCompareTable(data, activeSeries),
  ]);
}

function renderFipeZapStatsBlock(data, seriesType, cityKey) {
  const series = data.series[seriesType]?.[cityKey] || [];
  if (series.length === 0) {
    return h('div', { class: 'sec-empty-state' }, [
      h('p', { class: 'sec-empty-desc' }, 'Sem dados para essa combinação.'),
    ]);
  }

  const stats = computeSeriesStats(series);
  const last = stats.last;
  const seriesLabel = FIPE_SERIES_TYPES.find(s => s.key === seriesType)?.label || seriesType;
  const cityLabel = FIPE_CITIES.find(c => c.key === cityKey)?.label || cityKey;

  // Determine if values look like index (level ~100+) or monthly %
  const avgVal = series.slice(-6).reduce((a, b) => a + b.value, 0) / Math.min(6, series.length);
  const isPercent = Math.abs(avgVal) < 10; // assume values <10 are monthly %

  const formatVal = v => v == null ? '—' : isPercent ? (v >= 0 ? '+' : '') + v.toFixed(2) + '%' : v.toFixed(2);

  return h('div', { class: 'sec-kpi-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)' } }, [
    h('div', { class: 'sec-kpi-card' }, [
      h('div', { class: 'sec-kpi-label' }, `Último · ${cityLabel}`),
      h('div', { class: 'sec-kpi-value' }, formatVal(last.value)),
      h('div', { class: 'sec-kpi-sub' }, last.date),
    ]),
    h('div', { class: 'sec-kpi-card' }, [
      h('div', { class: 'sec-kpi-label' }, isPercent ? 'Δ vs mês anterior (p.p.)' : 'Δ vs mês anterior'),
      h('div', { class: 'sec-kpi-value' + (stats.mom > 0 ? ' up' : stats.mom < 0 ? ' down' : '') },
        stats.mom != null ? (stats.mom >= 0 ? '+' : '') + stats.mom.toFixed(2) : '—'),
      h('div', { class: 'sec-kpi-sub' }, 'MoM'),
    ]),
    h('div', { class: 'sec-kpi-card' }, [
      h('div', { class: 'sec-kpi-label' }, stats.accum12m != null ? 'Var. 12m acumulada' : 'YoY (p.p.)'),
      h('div', { class: 'sec-kpi-value' + ((stats.accum12m || stats.yoy) > 0 ? ' up' : (stats.accum12m || stats.yoy) < 0 ? ' down' : '') },
        stats.accum12m != null ? (stats.accum12m >= 0 ? '+' : '') + stats.accum12m.toFixed(2) + '%' :
        stats.yoy != null ? (stats.yoy >= 0 ? '+' : '') + stats.yoy.toFixed(2) : '—'),
      h('div', { class: 'sec-kpi-sub' }, 'últimos 12 meses'),
    ]),
    h('div', { class: 'sec-kpi-card' }, [
      h('div', { class: 'sec-kpi-label' }, 'Série'),
      h('div', { class: 'sec-kpi-value', style: { fontSize: '16px', lineHeight: '1.3' } },
        seriesLabel),
      h('div', { class: 'sec-kpi-sub' }, `${series.length} observações`),
    ]),
  ]);
}

function renderFipeZapChart(data, seriesType, cityKey) {
  const series = data.series[seriesType]?.[cityKey] || [];
  if (series.length < 2) return null;

  const last36 = series.slice(-Math.min(36, series.length));
  const seriesLabel = FIPE_SERIES_TYPES.find(s => s.key === seriesType)?.label || '';
  const cityLabel = FIPE_CITIES.find(c => c.key === cityKey)?.label || '';

  return h('div', { class: 'sec-chart-wrap' }, [
    h('div', { class: 'sec-chart-title' }, `${seriesLabel} · ${cityLabel} · últimos ${last36.length} meses`),
    h('div', { style: { width: '100%' } }, [buildLineChart(last36, 680, 220)]),
  ]);
}

function buildLineChart(series, w, ht) {
  if (!series || series.length < 2) return null;
  const values = series.map(s => s.value);
  const dates = series.map(s => s.date);
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max - min) || 1;
  const padding = range * 0.1;
  const yMin = min - padding, yMax = max + padding;
  const yRange = yMax - yMin;
  const n = series.length;
  const padX = 50, padY = 20;
  const chartW = w - padX - 10;
  const chartH = ht - padY - 30;
  const xFor = i => padX + (i / (n - 1)) * chartW;
  const yFor = v => padY + chartH - ((v - yMin) / yRange) * chartH;

  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${xFor(n-1).toFixed(1)} ${(padY + chartH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(padY + chartH).toFixed(1)} Z`;

  // Grid lines (5 horizontal)
  const gridLines = [];
  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const y = padY + (i / 4) * chartH;
    const val = yMax - (i / 4) * yRange;
    gridLines.push(`<line x1="${padX}" y1="${y}" x2="${padX + chartW}" y2="${y}" stroke="var(--border)" stroke-width="0.5" opacity="0.5"/>`);
    yLabels.push(`<text x="${padX - 6}" y="${y + 3}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--text-faint)">${val.toFixed(2)}</text>`);
  }

  // X labels (first, middle, last)
  const xLabels = [0, Math.floor(n / 2), n - 1].map(i => {
    const d = dates[i];
    const label = d ? d.substring(0, 7) : '';
    return `<text x="${xFor(i).toFixed(1)}" y="${(padY + chartH + 14).toFixed(1)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--text-faint)">${label}</text>`;
  });

  const last = values[n - 1];
  const first = values[0];
  const trendColor = last >= first ? '#7a9b5c' : '#b85c5c';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${ht}`);
  svg.setAttribute('class', 'sec-chart-svg');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `
    ${gridLines.join('')}
    <path d="${areaPath}" fill="${trendColor}" opacity="0.08"/>
    <path d="${path}" fill="none" stroke="${trendColor}" stroke-width="1.5"/>
    <circle cx="${xFor(n-1).toFixed(1)}" cy="${yFor(last).toFixed(1)}" r="3" fill="${trendColor}"/>
    ${yLabels.join('')}
    ${xLabels.join('')}
  `;
  return svg;
}

function renderFipeZapCompareTable(data, seriesType) {
  const cityData = data.series[seriesType] || {};
  const rows = FIPE_CITIES
    .map(c => {
      const s = cityData[c.key];
      if (!s || s.length === 0) return null;
      const stats = computeSeriesStats(s);
      return { city: c, series: s, stats };
    })
    .filter(Boolean);

  if (rows.length === 0) return null;

  return h('div', { style: { marginTop: '24px' } }, [
    h('div', { class: 'sec-chart-title' }, 'Comparativo entre cidades — Δ mês anterior e 12m'),
    h('table', { class: 'sec-compare-table' }, [
      h('thead', {}, h('tr', {}, [
        h('th', {}, 'Cidade'),
        h('th', { style: { textAlign: 'right' } }, 'Último'),
        h('th', { style: { textAlign: 'right' } }, 'Data'),
        h('th', { style: { textAlign: 'right' } }, 'Δ mês'),
        h('th', { style: { textAlign: 'right' } }, '12m acum.'),
        h('th', { style: { textAlign: 'right' } }, 'Obs.'),
      ])),
      h('tbody', {}, rows.map(r => {
        const val = r.stats.last?.value;
        const mom = r.stats.mom;
        const acc = r.stats.accum12m;
        return h('tr', {
          style: { cursor: 'pointer' },
          onClick: () => { state._fipe_city = r.city.key; render(); },
        }, [
          h('td', {}, r.city.label),
          h('td', { class: 'num' }, val != null ? val.toFixed(2) : '—'),
          h('td', { class: 'num', style: { color: 'var(--text-faint)' } }, r.stats.last?.date || ''),
          h('td', { class: 'num' + (mom > 0 ? ' up' : mom < 0 ? ' down' : '') },
            mom != null ? (mom >= 0 ? '+' : '') + mom.toFixed(2) : '—'),
          h('td', { class: 'num' + (acc > 0 ? ' up' : acc < 0 ? ' down' : '') },
            acc != null ? (acc >= 0 ? '+' : '') + acc.toFixed(2) + '%' : '—'),
          h('td', { class: 'num', style: { color: 'var(--text-faint)' } }, String(r.series.length)),
        ]);
      })),
    ]),
  ]);
}

/* ---------- Abrainc Dashboard ---------- */

function renderAbraincDashboard() {
  const data = getAbraincData();
  if (!data.updated_at) {
    return h('div', { class: 'sec-empty-state' }, [
      h('div', { class: 'sec-empty-title' }, 'Abrainc/Fipe ainda não foi carregado'),
      h('p', { class: 'sec-empty-desc' },
        'Baixe a planilha oficial no site da Fipe (seção Abrainc) e faça upload acima. Você verá lançamentos, vendas, entregas, oferta e distratos segmentados por MAP e MCMV.'),
    ]);
  }

  const activeSegment = state._abrainc_segment || 'total';
  const segLabel = ABRAINC_SEGMENTS.find(s => s.key === activeSegment)?.label || '';

  return h('div', {}, [
    // Segment selector
    h('div', { class: 'sec-city-chips' },
      ABRAINC_SEGMENTS.map(seg => {
        const hasAny = Object.values(data.series || {}).some(m => m[seg.key] && m[seg.key].length > 0);
        return h('span', {
          class: 'sec-city-chip' + (activeSegment === seg.key ? ' active' : ''),
          style: hasAny ? {} : { opacity: '0.35', cursor: 'default' },
          onClick: () => { if (hasAny) { state._abrainc_segment = seg.key; render(); } },
        }, seg.label);
      })
    ),

    renderAbraincFunnel(data, activeSegment),

    renderAbraincMetricsGrid(data, activeSegment),

    renderAbraincChartBlock(data, activeSegment),
  ]);
}

function renderAbraincFunnel(data, segment) {
  // Funnel: lançamentos → vendas → entregas → oferta → distratos
  const order = ['lancamentos', 'vendas', 'entregas', 'oferta', 'distratos'];
  const stats = {};
  for (const m of order) {
    const s = data.series[m]?.[segment];
    stats[m] = s && s.length > 0 ? computeSeriesStats(s) : null;
  }

  const anyData = order.some(m => stats[m]);
  if (!anyData) {
    return h('div', { class: 'sec-empty-state', style: { padding: '20px' } }, [
      h('p', { class: 'sec-empty-desc' }, 'Sem dados do funil para o segmento selecionado.'),
    ]);
  }

  return h('div', { class: 'sec-abrainc-funnel' },
    order.map(m => {
      const meta = ABRAINC_METRICS.find(x => x.key === m);
      const st = stats[m];
      return h('div', { class: 'sec-funnel-step' }, [
        h('div', { class: 'sec-funnel-label' }, meta.label),
        h('div', { class: 'sec-funnel-value' },
          st ? (st.last.value >= 1000 ? (st.last.value / 1000).toFixed(1) + 'k' : st.last.value.toFixed(0)) : '—'),
        h('div', { class: 'sec-funnel-sub' },
          st ? `${meta.unit} · ${st.last.date?.substring(0, 7) || ''}` : 'sem dados'),
      ]);
    })
  );
}

function renderAbraincMetricsGrid(data, segment) {
  const cards = ABRAINC_METRICS.map(meta => {
    const s = data.series[meta.key]?.[segment];
    if (!s || s.length === 0) return null;
    const stats = computeSeriesStats(s);
    const yoy = stats.yoy != null ? (stats.yoy / (stats.yrAgo?.value || 1)) * 100 : null;

    return h('div', { class: 'sec-kpi-card' }, [
      h('div', { class: 'sec-kpi-label' }, meta.label),
      h('div', { class: 'sec-kpi-value' },
        stats.last.value >= 1000 ? (stats.last.value / 1000).toFixed(1) + 'k' : stats.last.value.toFixed(1)),
      h('div', { class: 'sec-kpi-sub' },
        `${meta.unit} · ${stats.last.date?.substring(0, 7) || ''}` +
        (yoy != null ? ` · YoY ${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%` : '')),
      s.length >= 6 && h('div', { class: 'sec-kpi-sparkline' }, [buildSparkline(s.slice(-24).map(d => d.value))]),
    ]);
  }).filter(Boolean);

  if (cards.length === 0) return null;

  return h('div', { style: { marginTop: '20px' } }, [
    h('div', { class: 'sec-chart-title' }, `Métricas · ${ABRAINC_SEGMENTS.find(s => s.key === segment)?.label}`),
    h('div', { class: 'sec-kpi-grid', style: { gridTemplateColumns: 'repeat(3, 1fr)' } }, cards),
  ]);
}

function renderAbraincChartBlock(data, segment) {
  const activeMetric = state._abrainc_metric || 'lancamentos';
  const s = data.series[activeMetric]?.[segment];
  if (!s || s.length < 2) return null;

  const last36 = s.slice(-Math.min(36, s.length));
  const meta = ABRAINC_METRICS.find(m => m.key === activeMetric);

  return h('div', { style: { marginTop: '24px' } }, [
    h('div', { class: 'sec-city-chips' },
      ABRAINC_METRICS.map(m => {
        const has = data.series[m.key]?.[segment]?.length > 0;
        return h('span', {
          class: 'sec-city-chip' + (activeMetric === m.key ? ' active' : ''),
          style: has ? {} : { opacity: '0.35', cursor: 'default' },
          onClick: () => { if (has) { state._abrainc_metric = m.key; render(); } },
        }, m.label);
      })
    ),
    h('div', { class: 'sec-chart-wrap' }, [
      h('div', { class: 'sec-chart-title' }, `${meta.label} · ${ABRAINC_SEGMENTS.find(x => x.key === segment)?.label} · últimos ${last36.length} meses`),
      h('div', { style: { width: '100%' } }, [buildLineChart(last36, 680, 220)]),
    ]),
  ]);
}
/* ============================================================
   25. FRED — Federal Reserve Economic Data (US Macro)
   API: https://api.stlouisfed.org/fred/series/observations
   Free, requires API key from fred.stlouisfed.org
   ============================================================ */

const FRED_API_BASE = 'https://api.stlouisfed.org/fred/series/observations';

const FRED_SERIES = {
  // === Rates & Yield Curve ===
  fed_funds:   { id: 'DFEDTARU',       name: 'Fed Funds Target (Upper)',  group: 'rates',      unit: '%',    decimals: 2, freq: 'daily' },
  dgs2:        { id: 'DGS2',           name: 'Treasury 2Y Yield',         group: 'rates',      unit: '%',    decimals: 2, freq: 'daily' },
  dgs10:       { id: 'DGS10',          name: 'Treasury 10Y Yield',        group: 'rates',      unit: '%',    decimals: 2, freq: 'daily' },
  dgs30:       { id: 'DGS30',          name: 'Treasury 30Y Yield',        group: 'rates',      unit: '%',    decimals: 2, freq: 'daily' },
  t10y2y:      { id: 'T10Y2Y',         name: '10Y-2Y Spread (Yield Curve)', group: 'rates',    unit: 'p.p.', decimals: 2, freq: 'daily' },
  t10y3m:      { id: 'T10Y3M',         name: '10Y-3M Spread (Recession Signal)', group: 'rates', unit: 'p.p.', decimals: 2, freq: 'daily' },
  mortgage30:  { id: 'MORTGAGE30US',    name: 'Mortgage Rate 30Y Fixed',   group: 'rates',      unit: '%',    decimals: 2, freq: 'weekly' },

  // === Inflation ===
  cpi:         { id: 'CPIAUCSL',        name: 'CPI All Items',             group: 'inflation',  unit: 'index', decimals: 1, freq: 'monthly', yoy: true },
  core_cpi:    { id: 'CPILFESL',        name: 'Core CPI (ex Food & Energy)', group: 'inflation', unit: 'index', decimals: 1, freq: 'monthly', yoy: true },
  core_pce:    { id: 'PCEPILFE',        name: 'Core PCE (Fed preferred)',  group: 'inflation',  unit: 'index', decimals: 1, freq: 'monthly', yoy: true },
  breakeven5y: { id: 'T5YIE',           name: '5Y Breakeven Inflation',    group: 'inflation',  unit: '%',    decimals: 2, freq: 'daily' },
  breakeven10y:{ id: 'T10YIE',          name: '10Y Breakeven Inflation',   group: 'inflation',  unit: '%',    decimals: 2, freq: 'daily' },
  umich_exp:   { id: 'MICH',            name: 'Michigan Inflation Expectations', group: 'inflation', unit: '%', decimals: 1, freq: 'monthly' },

  // === Employment & Activity ===
  unrate:      { id: 'UNRATE',          name: 'Unemployment Rate',         group: 'activity',   unit: '%',    decimals: 1, freq: 'monthly' },
  payems:      { id: 'PAYEMS',          name: 'Nonfarm Payrolls',          group: 'activity',   unit: 'thousands', decimals: 0, freq: 'monthly', mom: true },
  claims:      { id: 'ICSA',            name: 'Initial Jobless Claims',    group: 'activity',   unit: 'thousands', decimals: 0, freq: 'weekly' },
  indpro:      { id: 'INDPRO',          name: 'Industrial Production',     group: 'activity',   unit: 'index', decimals: 1, freq: 'monthly', yoy: true },
  retail:      { id: 'RSXFS',           name: 'Retail Sales (ex Food)',    group: 'activity',   unit: 'M USD', decimals: 0, freq: 'monthly', yoy: true },
  umcsent:     { id: 'UMCSENT',         name: 'Consumer Sentiment (Michigan)', group: 'activity', unit: 'index', decimals: 1, freq: 'monthly' },

  // === Liquidity & Financial Conditions ===
  m2:          { id: 'M2SL',            name: 'M2 Money Supply',           group: 'liquidity',  unit: 'B USD', decimals: 0, freq: 'monthly', yoy: true },
  fed_assets:  { id: 'WALCL',           name: 'Fed Balance Sheet (Total Assets)', group: 'liquidity', unit: 'M USD', decimals: 0, freq: 'weekly' },
  nfci:        { id: 'NFCI',            name: 'Financial Conditions (Chicago Fed)', group: 'liquidity', unit: 'index', decimals: 2, freq: 'weekly', name2: 'Negativo = loose, Positivo = tight' },
  stlfsi:      { id: 'STLFSI4',         name: 'Financial Stress (St Louis Fed)', group: 'liquidity', unit: 'index', decimals: 2, freq: 'weekly', name2: '>0 = acima da média' },

  // === Credit Spreads ===
  hy_spread:   { id: 'BAMLH0A0HYM2',   name: 'US High Yield Spread (OAS)', group: 'credit',    unit: 'p.p.', decimals: 2, freq: 'daily' },
  ig_spread:   { id: 'BAMLC0A0CM',      name: 'US IG Spread (OAS)',        group: 'credit',     unit: 'p.p.', decimals: 2, freq: 'daily' },

  // === Housing (US) ===
  housing_starts: { id: 'HOUST',        name: 'Housing Starts',            group: 'housing',    unit: 'thousands', decimals: 0, freq: 'monthly' },
  case_shiller:   { id: 'CSUSHPINSA',   name: 'Case-Shiller Home Price',   group: 'housing',    unit: 'index', decimals: 1, freq: 'monthly', yoy: true },
  permits:        { id: 'PERMIT',       name: 'Building Permits',          group: 'housing',    unit: 'thousands', decimals: 0, freq: 'monthly' },
};

const FRED_GROUPS = {
  rates:      { label: 'Taxas & Yield Curve',        order: 1, icon: '📈' },
  inflation:  { label: 'Inflação',                   order: 2, icon: '🔥' },
  activity:   { label: 'Emprego & Atividade',        order: 3, icon: '⚡' },
  liquidity:  { label: 'Liquidez & Condições Financeiras', order: 4, icon: '💧' },
  credit:     { label: 'Spreads de Crédito',         order: 5, icon: '📊' },
  housing:    { label: 'Housing (EUA)',              order: 6, icon: '🏠' },
};

/* ---------- FRED Fetch ---------- */

async function fetchFREDSeries(seriesId, apiKey, limit = 60) {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 3);
  const startStr = startDate.toISOString().split('T')[0];

  // Try Netlify Function proxy first (bypasses CORS), then direct
  const proxyUrl = `/api-proxy?source=fred&series_id=${seriesId}&api_key=${apiKey}&limit=${limit}&observation_start=${startStr}`;
  const directUrl = `${FRED_API_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}&observation_start=${startStr}`;

  const urls = [proxyUrl, directUrl];
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, 15000);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`FRED ${seriesId} via ${url.substring(0, 60)}: ${res.status} ${errText.substring(0, 80)}`);
        continue;
      }
      const data = await res.json();
      if (!data.observations || !Array.isArray(data.observations)) {
        if (data.error) { console.warn(`FRED ${seriesId}:`, data.error); continue; }
        continue;
      }
      return data.observations
        .filter(o => o.value !== '.' && o.value != null)
        .reverse()
        .map(o => ({ date: o.date, value: parseFloat(o.value) }));
    } catch (err) {
      console.warn(`FRED ${seriesId} via ${url.substring(0, 60)}:`, err.message);
    }
  }
  console.warn(`FRED ${seriesId}: todas tentativas falharam`);
  return null;
}

async function loadAllFREDSeries() {
  const apiKey = DB.settings.fred_api_key;
  if (!apiKey) return null;

  // Cache 1 hour
  const cached = DB.fredCache;
  if (cached && (Date.now() - cached.timestamp) < 60 * 60 * 1000) {
    return cached.series;
  }

  const entries = Object.entries(FRED_SERIES);
  const series = {};
  const batchSize = 5;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(([key, meta]) =>
        fetchFREDSeries(meta.id, apiKey, meta.freq === 'daily' ? 120 : 60)
          .then(data => [key, data])
      )
    );
    for (const [key, data] of results) series[key] = data;
    // Breather between batches
    if (i + batchSize < entries.length) await new Promise(r => setTimeout(r, 200));
  }

  DB.fredCache = { timestamp: Date.now(), series };
  saveDB(DB);
  return series;
}

/* ---------- FRED Computed Indicators ---------- */

function computeFREDIndicators(series) {
  const out = {};
  const latest = (key) => {
    const s = series[key];
    return s && s.length > 0 ? s[s.length - 1].value : null;
  };

  // Real Fed Funds Rate (Fed Funds - Core PCE YoY)
  const fedFunds = latest('fed_funds');
  // Core PCE is index — compute YoY
  const pceSeries = series.core_pce;
  let corePceYoY = null;
  if (pceSeries && pceSeries.length >= 13) {
    const now = pceSeries[pceSeries.length - 1].value;
    const ago = pceSeries[pceSeries.length - 13].value;
    corePceYoY = ago > 0 ? ((now / ago) - 1) * 100 : null;
  }
  out.corePceYoY = corePceYoY;
  out.realFedFunds = (fedFunds != null && corePceYoY != null) ? fedFunds - corePceYoY : null;

  // CPI YoY
  const cpiSeries = series.cpi;
  if (cpiSeries && cpiSeries.length >= 13) {
    const now = cpiSeries[cpiSeries.length - 1].value;
    const ago = cpiSeries[cpiSeries.length - 13].value;
    out.cpiYoY = ago > 0 ? ((now / ago) - 1) * 100 : null;
  }

  // Core CPI YoY
  const coreCpiSeries = series.core_cpi;
  if (coreCpiSeries && coreCpiSeries.length >= 13) {
    const now = coreCpiSeries[coreCpiSeries.length - 1].value;
    const ago = coreCpiSeries[coreCpiSeries.length - 13].value;
    out.coreCpiYoY = ago > 0 ? ((now / ago) - 1) * 100 : null;
  }

  // Yield Curve signal
  const t10y2y = latest('t10y2y');
  const t10y3m = latest('t10y3m');
  if (t10y2y != null) {
    out.yieldCurveSignal = t10y2y < 0 ? 'Invertida — sinal recessivo'
      : t10y2y < 0.5 ? 'Plana — cautela'
      : t10y2y < 1.5 ? 'Normal — steepening moderado'
      : 'Steep — expectativa de crescimento';
  }

  // Financial conditions summary
  const nfci = latest('nfci');
  if (nfci != null) {
    out.finConditions = nfci > 0.5 ? 'Apertadas — stress financeiro'
      : nfci > 0 ? 'Levemente apertadas'
      : nfci > -0.5 ? 'Neutras a benignas'
      : 'Soltas — condições acomodativas';
  }

  // HY Spread assessment
  const hySpread = latest('hy_spread');
  if (hySpread != null) {
    out.hyAssessment = hySpread > 6 ? 'Spreads elevados — stress corporativo'
      : hySpread > 4.5 ? 'Acima da média — cautela em HY'
      : hySpread > 3.5 ? 'Média histórica — neutro'
      : 'Compressed — apetite por risco elevado';
  }

  // M2 YoY
  const m2Series = series.m2;
  if (m2Series && m2Series.length >= 13) {
    const now = m2Series[m2Series.length - 1].value;
    const ago = m2Series[m2Series.length - 13].value;
    out.m2YoY = ago > 0 ? ((now / ago) - 1) * 100 : null;
  }

  // Payrolls MoM change
  const payemsSeries = series.payems;
  if (payemsSeries && payemsSeries.length >= 2) {
    const now = payemsSeries[payemsSeries.length - 1].value;
    const prev = payemsSeries[payemsSeries.length - 2].value;
    out.payrollsMoM = now - prev; // in thousands
  }

  return out;
}

/* ---------- FRED Dashboard ---------- */

function renderFEDDashboard() {
  const apiKey = DB.settings.fred_api_key;
  if (!apiKey) {
    return h('div', { class: 'content fade-up' }, [
      pageHead('Macro Intelligence · Fed / FRED', 'Federal Reserve <em>Economic Data</em>',
        '840.000+ séries macroeconômicas dos EUA. Requer API key gratuita do FRED.'),
      h('div', { class: 'empty' }, [
        h('div', { class: 'empty-title' }, 'FRED API Key não configurada'),
        h('p', { class: 'empty-desc' }, 'Configure sua chave gratuita em Settings. Cadastre-se em fred.stlouisfed.org e solicite uma API key (instantâneo, sem custo).'),
        h('button', { class: 'btn-primary', onClick: () => setModal('settings') }, 'Abrir Settings'),
      ]),
    ]);
  }

  const series = state._fred_series;
  const loading = state._fred_loading;
  const error = state._fred_error;

  if (!series && !loading && !error) {
    state._fred_loading = true;
    loadAllFREDSeries().then(s => {
      state._fred_series = s;
      state._fred_loading = false;
      if (!s || Object.values(s).every(v => v === null)) {
        state._fred_error = 'Nenhuma série carregou. Verifique sua API key e conexão.';
      }
      render();
    }).catch(err => {
      state._fred_loading = false;
      state._fred_error = err.message;
      render();
    });
  }

  const indicators = series ? computeFREDIndicators(series) : null;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Fed / FRED', 'Federal Reserve <em>Economic Data</em>',
      '27 séries-chave dos EUA: taxas, yield curve, inflação, emprego, liquidez, spreads de crédito, housing. Dados do FRED (St. Louis Fed). Cache de 1 hora.'),

    // Status bar
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } },
        DB.fredCache ? `Última atualização: ${new Date(DB.fredCache.timestamp).toLocaleString('pt-BR')}` : ''),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        loading && h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--amber)' } }, 'carregando séries FRED…'),
        h('button', {
          class: 'btn-secondary',
          onClick: () => {
            DB.fredCache = null; saveDB(DB);
            state._fred_series = null;
            state._fred_loading = false;
            state._fred_error = null;
            render();
          },
        }, '↻ Atualizar'),
      ]),
    ]),

    error && h('div', { class: 'empty' }, [
      h('div', { class: 'empty-title' }, 'Erro ao carregar FRED'),
      h('p', { class: 'empty-desc' }, error),
      h('button', { class: 'btn-secondary', style: { marginTop: '16px' }, onClick: () => {
        state._fred_error = null; state._fred_series = null;
        DB.fredCache = null; saveDB(DB);
        render();
      }}, 'Tentar novamente'),
    ]),

    loading && !series && h('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px' } }, 'Carregando 27 séries FRED…'),
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '6px' } },
        'Batches de 5 séries com 200ms entre chamadas'),
    ]),

    series && !error && h('div', {}, [
      // Top: Key derived indicators
      indicators && renderFREDDerived(indicators, series),

      // Groups
      ...Object.entries(FRED_GROUPS)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([groupKey, groupMeta]) => renderFREDGroup(groupKey, groupMeta, series, indicators)),
    ]),
  ]);
}

function renderFREDDerived(indicators, series) {
  const latest = (key) => {
    const s = series[key];
    return s && s.length > 0 ? s[s.length - 1].value : null;
  };

  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, 'Indicadores Derivados'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '28px' } }, [
      renderFREDDerivedCard('Real Fed Funds Rate', indicators.realFedFunds, '% a.a.',
        `Fed Funds (${fmtNum(latest('fed_funds'), 2)}%) - Core PCE YoY (${fmtNum(indicators.corePceYoY, 2)}%)`),
      renderFREDDerivedCard('CPI YoY', indicators.cpiYoY, '%', 'Headline inflation'),
      renderFREDDerivedCard('Core CPI YoY', indicators.coreCpiYoY, '%', 'Ex food & energy'),
      renderFREDDerivedCard('Core PCE YoY', indicators.corePceYoY, '%', 'Fed preferred measure'),
      indicators.yieldCurveSignal && renderFREDDerivedCard('Yield Curve', latest('t10y2y'), 'p.p.', indicators.yieldCurveSignal),
      indicators.finConditions && renderFREDDerivedCard('Financial Conditions', latest('nfci'), 'idx', indicators.finConditions),
      indicators.hyAssessment && renderFREDDerivedCard('HY Spread', latest('hy_spread'), 'p.p.', indicators.hyAssessment),
      indicators.m2YoY != null && renderFREDDerivedCard('M2 YoY', indicators.m2YoY, '%', 'Crescimento da oferta monetária'),
      indicators.payrollsMoM != null && renderFREDDerivedCard('Payrolls MoM', indicators.payrollsMoM, 'k jobs', 'Variação mensal de empregos'),
    ]),
  ]);
}

function renderFREDDerivedCard(label, value, unit, desc) {
  const fmtValue = value == null ? '—' :
    unit === '% a.a.' || unit === '%' ? (value >= 0 ? '+' : '') + value.toFixed(2) + '%' :
    unit === 'p.p.' ? (value >= 0 ? '+' : '') + value.toFixed(2) + ' p.p.' :
    unit === 'k jobs' ? (value >= 0 ? '+' : '') + Math.round(value) + 'k' :
    unit === 'idx' ? value.toFixed(2) :
    value.toFixed(2);
  const color = value == null ? 'var(--text-muted)' :
    (unit === '%' || unit === '% a.a.') && value > 3 ? 'var(--red)' :
    (unit === 'p.p.' && label.includes('Spread')) && value > 5 ? 'var(--red)' :
    'var(--text)';

  return h('div', { class: 'derived-card' }, [
    h('div', { class: 'derived-label' }, label),
    h('div', { class: 'derived-value', style: { color } }, fmtValue),
    h('div', { class: 'derived-desc' }, desc),
  ]);
}

function fmtNum(v, d) { return v != null ? v.toFixed(d) : '—'; }

function renderFREDGroup(groupKey, groupMeta, series, indicators) {
  const keys = Object.entries(FRED_SERIES)
    .filter(([_, meta]) => meta.group === groupKey)
    .map(([k]) => k);

  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, `${groupMeta.icon} ${groupMeta.label}`),
    h('div', { class: 'macro-rate-grid' }, keys.map(k => {
      const meta = FRED_SERIES[k];
      const data = series[k];
      const latest = data && data.length > 0 ? data[data.length - 1] : null;
      const previous = data && data.length > 1 ? data[data.length - 2] : null;

      let displayValue = '—';
      let delta = null;
      let deltaLabel = '';

      if (latest) {
        // For YoY series (index), compute and display YoY instead of raw level
        if (meta.yoy && data.length >= 13) {
          const yearAgo = data[data.length - 13];
          const yoy = ((latest.value / yearAgo.value) - 1) * 100;
          displayValue = (yoy >= 0 ? '+' : '') + yoy.toFixed(2) + '% YoY';
          // Delta = YoY change vs previous month's YoY
          if (data.length >= 14) {
            const prevYoY = ((previous.value / data[data.length - 14].value) - 1) * 100;
            delta = yoy - prevYoY;
            deltaLabel = delta >= 0 ? '↑ acelerando' : '↓ desacelerando';
          }
        } else if (meta.mom && data.length >= 2) {
          const change = latest.value - previous.value;
          displayValue = (change >= 0 ? '+' : '') + Math.round(change) + 'k';
          delta = previous && data.length >= 3 ? (latest.value - previous.value) - (previous.value - data[data.length - 3].value) : null;
        } else {
          displayValue = formatFREDValue(latest.value, meta);
          delta = previous ? latest.value - previous.value : null;
        }
      }

      return h('div', { class: 'macro-rate-card' }, [
        h('div', { class: 'macro-rate-label' }, meta.unit),
        h('div', { class: 'macro-rate-name' }, meta.name2 || meta.name),
        latest
          ? h('div', { class: 'macro-rate-value' }, displayValue)
          : h('div', { class: 'macro-rate-value loading' }, 'Indisponível'),
        latest && h('div', { class: 'macro-rate-date' }, [
          latest.date,
          delta != null && h('span', { style: { marginLeft: '10px', color: delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--green)' : 'var(--text-faint)', fontSize: '10px' } },
            deltaLabel || ((delta >= 0 ? '↑' : '↓') + ' ' + Math.abs(delta).toFixed(2))),
        ]),
        data && data.length > 5 && h('div', { class: 'macro-rate-sparkline' }, [buildSparkline(data.map(d => d.value))]),
      ]);
    })),
  ]);
}

function formatFREDValue(v, meta) {
  if (v == null) return '—';
  const d = meta.decimals != null ? meta.decimals : 2;
  if (meta.unit === '%' || meta.unit === 'p.p.') return v.toFixed(d) + (meta.unit === '%' ? '%' : ' p.p.');
  if (meta.unit === 'index' || meta.unit === 'idx') return v.toFixed(d);
  if (meta.unit === 'thousands') return v >= 1000 ? (v / 1000).toFixed(1) + 'M' : Math.round(v).toLocaleString() + 'k';
  if (meta.unit === 'M USD') return '$' + (v / 1e6).toFixed(1) + 'T';
  if (meta.unit === 'B USD') return '$' + (v / 1e3).toFixed(1) + 'T';
  return v.toFixed(d);
}

/* ============================================================
   26. ADVANCED MACRO ANALYSIS PANEL
   Regime detection, liquidity, credit cycle, risk appetite
   ============================================================ */

/* ---------- Regime Detector ---------- */

function detectUSRegime(fredSeries) {
  if (!fredSeries) return null;
  const signals = [];
  const latest = (key) => { const s = fredSeries[key]; return s?.length > 0 ? s[s.length - 1].value : null; };
  const trend = (key, months) => {
    const s = fredSeries[key];
    if (!s || s.length < months + 1) return null;
    const recent = s[s.length - 1].value;
    const past = s[s.length - 1 - months].value;
    return past !== 0 ? ((recent - past) / Math.abs(past)) * 100 : null;
  };

  // 1. Unemployment trend (falling = expansion, rising = contraction)
  const unrateTrend = trend('unrate', 6);
  if (unrateTrend != null) {
    signals.push({
      name: 'Desemprego (6m trend)', value: `${latest('unrate')?.toFixed(1)}%`,
      direction: unrateTrend < -0.5 ? 'expansion' : unrateTrend > 0.5 ? 'contraction' : 'neutral',
      detail: `${unrateTrend > 0 ? '+' : ''}${unrateTrend.toFixed(1)}% em 6m`,
    });
  }

  // 2. Payrolls momentum
  const payems = fredSeries.payems;
  if (payems && payems.length >= 4) {
    const recent3m = (payems[payems.length-1].value - payems[payems.length-4].value) / 3;
    signals.push({
      name: 'Payrolls (média 3m)', value: `${recent3m > 0 ? '+' : ''}${Math.round(recent3m)}k/mês`,
      direction: recent3m > 150 ? 'expansion' : recent3m > 50 ? 'neutral' : recent3m > 0 ? 'slowdown' : 'contraction',
      detail: recent3m > 150 ? 'Criação robusta' : recent3m > 50 ? 'Moderada' : recent3m > 0 ? 'Desacelerando' : 'Destruindo empregos',
    });
  }

  // 3. Yield curve (10Y-2Y)
  const t10y2y = latest('t10y2y');
  if (t10y2y != null) {
    signals.push({
      name: 'Yield Curve (10Y-2Y)', value: `${t10y2y >= 0 ? '+' : ''}${t10y2y.toFixed(2)} p.p.`,
      direction: t10y2y < -0.3 ? 'contraction' : t10y2y < 0.2 ? 'slowdown' : t10y2y < 1.0 ? 'neutral' : 'expansion',
      detail: t10y2y < 0 ? 'Invertida — sinal recessivo' : t10y2y < 0.5 ? 'Plana — cautela' : 'Normal',
    });
  }

  // 4. Financial conditions (NFCI)
  const nfci = latest('nfci');
  if (nfci != null) {
    signals.push({
      name: 'Condições Financeiras (NFCI)', value: nfci.toFixed(2),
      direction: nfci > 0.3 ? 'contraction' : nfci > 0 ? 'slowdown' : nfci > -0.5 ? 'neutral' : 'expansion',
      detail: nfci > 0 ? 'Apertadas' : 'Acomodativas',
    });
  }

  // 5. Consumer sentiment
  const sentTrend = trend('umcsent', 3);
  if (sentTrend != null) {
    signals.push({
      name: 'Sentimento do Consumidor (3m)', value: `${latest('umcsent')?.toFixed(1)}`,
      direction: sentTrend > 5 ? 'expansion' : sentTrend > 0 ? 'neutral' : sentTrend > -5 ? 'slowdown' : 'contraction',
      detail: `${sentTrend > 0 ? '+' : ''}${sentTrend.toFixed(1)}% em 3m`,
    });
  }

  // 6. Industrial production trend
  const indproTrend = trend('indpro', 6);
  if (indproTrend != null) {
    signals.push({
      name: 'Produção Industrial (6m)', value: `${latest('indpro')?.toFixed(1)}`,
      direction: indproTrend > 2 ? 'expansion' : indproTrend > 0 ? 'neutral' : indproTrend > -2 ? 'slowdown' : 'contraction',
      detail: `${indproTrend > 0 ? '+' : ''}${indproTrend.toFixed(1)}% em 6m`,
    });
  }

  // 7. HY Spreads (risk appetite proxy)
  const hySpread = latest('hy_spread');
  if (hySpread != null) {
    signals.push({
      name: 'HY Spread (OAS)', value: `${hySpread.toFixed(0)} bps`,
      direction: hySpread < 300 ? 'expansion' : hySpread < 450 ? 'neutral' : hySpread < 600 ? 'slowdown' : 'contraction',
      detail: hySpread < 350 ? 'Compressed — apetite alto' : hySpread < 500 ? 'Média histórica' : 'Elevado — stress',
    });
  }

  if (signals.length === 0) return null;

  // Aggregate: count directions
  const counts = { expansion: 0, neutral: 0, slowdown: 0, contraction: 0 };
  for (const s of signals) counts[s.direction] = (counts[s.direction] || 0) + 1;
  const total = signals.length;
  const expansionPct = ((counts.expansion + counts.neutral * 0.5) / total) * 100;

  let regime, color;
  if (counts.contraction >= total * 0.4) { regime = 'Contração'; color = 'var(--red)'; }
  else if (counts.slowdown + counts.contraction >= total * 0.5) { regime = 'Desaceleração'; color = '#d4a574'; }
  else if (counts.expansion >= total * 0.5) { regime = 'Expansão'; color = 'var(--green)'; }
  else { regime = 'Transição'; color = 'var(--text-muted)'; }

  const confidence = Math.round(Math.max(counts.expansion, counts.contraction, counts.slowdown, counts.neutral) / total * 100);

  return { regime, color, confidence, signals, counts, expansionPct };
}

function detectBRRegime(macroSeries) {
  if (!macroSeries) return null;
  const signals = [];
  const latest = (key) => { const s = macroSeries[key]; return s?.length > 0 ? s[s.length - 1].value : null; };
  const trend = (key, n) => {
    const s = macroSeries[key];
    if (!s || s.length < n + 1) return null;
    return s[s.length - 1].value - s[s.length - 1 - n].value;
  };

  // 1. SELIC direction
  const selicTrend = trend('selic', 3);
  const selicVal = latest('selic');
  if (selicVal != null) {
    signals.push({
      name: 'SELIC (tendência 3m)', value: `${selicVal.toFixed(2)}%`,
      direction: selicTrend > 0.5 ? 'contraction' : selicTrend < -0.5 ? 'expansion' : 'neutral',
      detail: selicTrend > 0 ? 'Subindo — política restritiva' : selicTrend < 0 ? 'Caindo — estímulo' : 'Estável',
    });
  }

  // 2. IPCA 12m trend
  const ipcaTrend = trend('ipca12m', 3);
  const ipcaVal = latest('ipca12m');
  if (ipcaVal != null) {
    signals.push({
      name: 'IPCA 12m', value: `${ipcaVal.toFixed(2)}%`,
      direction: ipcaVal > 6 ? 'contraction' : ipcaVal > 4.5 ? 'slowdown' : ipcaVal > 3 ? 'neutral' : 'expansion',
      detail: ipcaTrend > 0 ? 'Acelerando' : 'Arrefecendo',
    });
  }

  // 3. Crédito imobiliário
  const credImobTrend = trend('cred_imob', 6);
  const credImobVal = latest('cred_imob');
  if (credImobVal != null && credImobTrend != null) {
    const growthPct = credImobTrend / (credImobVal - credImobTrend) * 100;
    signals.push({
      name: 'Crédito Imobiliário (6m)', value: `R$ ${(credImobVal / 1e6).toFixed(0)}T`,
      direction: growthPct > 5 ? 'expansion' : growthPct > 0 ? 'neutral' : 'contraction',
      detail: `${growthPct > 0 ? '+' : ''}${growthPct.toFixed(1)}% em 6m`,
    });
  }

  // 4. Inadimplência
  const inadTrend = trend('inadimplencia', 3);
  const inadVal = latest('inadimplencia');
  if (inadVal != null) {
    signals.push({
      name: 'Inadimplência', value: `${inadVal.toFixed(2)}%`,
      direction: inadTrend > 0.3 ? 'contraction' : inadTrend < -0.3 ? 'expansion' : 'neutral',
      detail: inadTrend > 0 ? 'Subindo — stress' : inadTrend < 0 ? 'Caindo — saúde' : 'Estável',
    });
  }

  // 5. Câmbio (USD/BRL)
  const cambioTrend = trend('cambio', 3);
  const cambioVal = latest('cambio');
  if (cambioVal != null) {
    signals.push({
      name: 'USD/BRL (3m)', value: `R$ ${cambioVal.toFixed(2)}`,
      direction: cambioTrend > 0.3 ? 'contraction' : cambioTrend < -0.3 ? 'expansion' : 'neutral',
      detail: cambioTrend > 0 ? 'Depreciando' : cambioTrend < 0 ? 'Apreciando' : 'Estável',
    });
  }

  if (signals.length === 0) return null;

  const counts = { expansion: 0, neutral: 0, slowdown: 0, contraction: 0 };
  for (const s of signals) counts[s.direction] = (counts[s.direction] || 0) + 1;
  const total = signals.length;

  let regime, color;
  if (counts.contraction >= total * 0.4) { regime = 'Contração'; color = 'var(--red)'; }
  else if (counts.slowdown + counts.contraction >= total * 0.5) { regime = 'Desaceleração'; color = '#d4a574'; }
  else if (counts.expansion >= total * 0.5) { regime = 'Expansão'; color = 'var(--green)'; }
  else { regime = 'Transição'; color = 'var(--text-muted)'; }

  const confidence = Math.round(Math.max(counts.expansion, counts.contraction, counts.slowdown, counts.neutral) / total * 100);
  return { regime, color, confidence, signals, counts };
}

/* ---------- Liquidity Assessment ---------- */

function assessLiquidity(fredSeries) {
  if (!fredSeries) return null;
  const signals = [];
  const latest = (key) => { const s = fredSeries[key]; return s?.length > 0 ? s[s.length - 1].value : null; };

  // M2 YoY
  const m2 = fredSeries.m2;
  if (m2 && m2.length >= 13) {
    const yoy = ((m2[m2.length-1].value / m2[m2.length-13].value) - 1) * 100;
    signals.push({
      name: 'M2 YoY (US)', value: `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`,
      direction: yoy > 6 ? 'loose' : yoy > 3 ? 'neutral' : yoy > 0 ? 'tight' : 'very_tight',
      detail: yoy > 5 ? 'Expansão monetária forte' : yoy > 0 ? 'Crescimento moderado' : 'Contração monetária',
    });
  }

  // Fed Balance Sheet trend (6m)
  const fedBs = fredSeries.fed_assets;
  if (fedBs && fedBs.length >= 26) {
    const recent = fedBs[fedBs.length-1].value;
    const past = fedBs[fedBs.length-26].value;
    const chg = ((recent - past) / past) * 100;
    signals.push({
      name: 'Fed Balance Sheet (6m)', value: `$${(recent / 1e6).toFixed(1)}T`,
      direction: chg > 2 ? 'loose' : chg > -2 ? 'neutral' : 'tight',
      detail: chg > 0 ? `Expandindo ${chg.toFixed(1)}%` : `Reduzindo ${chg.toFixed(1)}%`,
    });
  }

  // NFCI
  const nfci = latest('nfci');
  if (nfci != null) {
    signals.push({
      name: 'Financial Conditions (NFCI)', value: nfci.toFixed(3),
      direction: nfci < -0.5 ? 'loose' : nfci < 0 ? 'neutral' : nfci < 0.5 ? 'tight' : 'very_tight',
      detail: nfci < 0 ? 'Acomodativas' : 'Restritivas',
    });
  }

  // Financial Stress
  const stlfsi = latest('stlfsi');
  if (stlfsi != null) {
    signals.push({
      name: 'Financial Stress (StL Fed)', value: stlfsi.toFixed(3),
      direction: stlfsi < -0.5 ? 'loose' : stlfsi < 0.5 ? 'neutral' : stlfsi < 1.5 ? 'tight' : 'very_tight',
      detail: stlfsi > 0 ? 'Acima da média — stress' : 'Abaixo da média — calmo',
    });
  }

  // Real Fed Funds Rate
  const ffr = latest('fed_funds');
  const pce = fredSeries.core_pce;
  if (ffr != null && pce && pce.length >= 13) {
    const pceYoY = ((pce[pce.length-1].value / pce[pce.length-13].value) - 1) * 100;
    const realRate = ffr - pceYoY;
    signals.push({
      name: 'Real Fed Funds Rate', value: `${realRate >= 0 ? '+' : ''}${realRate.toFixed(2)}%`,
      direction: realRate > 2 ? 'very_tight' : realRate > 1 ? 'tight' : realRate > 0 ? 'neutral' : 'loose',
      detail: realRate > 2 ? 'Muito restritiva' : realRate > 0 ? 'Positiva — restritiva' : 'Negativa — estimulativa',
    });
  }

  if (signals.length === 0) return null;

  const counts = { loose: 0, neutral: 0, tight: 0, very_tight: 0 };
  for (const s of signals) counts[s.direction] = (counts[s.direction] || 0) + 1;

  let assessment, color;
  if (counts.very_tight + counts.tight >= signals.length * 0.6) { assessment = 'Liquidez Restritiva'; color = 'var(--red)'; }
  else if (counts.loose >= signals.length * 0.5) { assessment = 'Liquidez Abundante'; color = 'var(--green)'; }
  else { assessment = 'Liquidez Neutra'; color = '#d4a574'; }

  return { assessment, color, signals, counts };
}

/* ---------- Risk Appetite Gauge ---------- */

function assessRiskAppetite(fredSeries) {
  if (!fredSeries) return null;
  const latest = (key) => { const s = fredSeries[key]; return s?.length > 0 ? s[s.length - 1].value : null; };
  const signals = [];

  // HY Spread level
  const hy = latest('hy_spread');
  if (hy != null) {
    signals.push({ name: 'HY Spread', score: hy < 300 ? 2 : hy < 400 ? 1 : hy < 550 ? 0 : hy < 700 ? -1 : -2,
      detail: `${hy.toFixed(0)} bps` });
  }

  // IG Spread level
  const ig = latest('ig_spread');
  if (ig != null) {
    signals.push({ name: 'IG Spread', score: ig < 100 ? 2 : ig < 130 ? 1 : ig < 170 ? 0 : ig < 220 ? -1 : -2,
      detail: `${ig.toFixed(0)} bps` });
  }

  // Yield curve (positive = risk on)
  const curve = latest('t10y2y');
  if (curve != null) {
    signals.push({ name: 'Yield Curve', score: curve > 1 ? 2 : curve > 0.3 ? 1 : curve > -0.2 ? 0 : curve > -0.5 ? -1 : -2,
      detail: `${curve >= 0 ? '+' : ''}${curve.toFixed(2)} p.p.` });
  }

  // NFCI (negative = risk on)
  const nfci = latest('nfci');
  if (nfci != null) {
    signals.push({ name: 'Cond. Financeiras', score: nfci < -0.5 ? 2 : nfci < 0 ? 1 : nfci < 0.3 ? 0 : nfci < 0.7 ? -1 : -2,
      detail: nfci.toFixed(3) });
  }

  // Breakeven 5Y (higher = inflation risk = risk off)
  const be5 = latest('breakeven5y');
  if (be5 != null) {
    signals.push({ name: 'Breakeven 5Y', score: be5 < 2 ? 1 : be5 < 2.5 ? 0 : be5 < 3 ? -1 : -2,
      detail: `${be5.toFixed(2)}%` });
  }

  if (signals.length === 0) return null;

  const avgScore = signals.reduce((a, s) => a + s.score, 0) / signals.length;
  let label, color;
  if (avgScore > 1) { label = 'Risk-On Forte'; color = 'var(--green)'; }
  else if (avgScore > 0.3) { label = 'Risk-On Moderado'; color = '#7a9b5c'; }
  else if (avgScore > -0.3) { label = 'Neutro'; color = 'var(--text-muted)'; }
  else if (avgScore > -1) { label = 'Risk-Off Moderado'; color = '#d4a574'; }
  else { label = 'Risk-Off Forte'; color = 'var(--red)'; }

  return { label, color, avgScore, signals };
}

/* ---------- Render: Advanced Analysis ---------- */

function renderAdvancedAnalysis() {
  const fredSeries = state._fred_series;
  const macroSeries = state._macro_series;
  const hasFred = fredSeries && Object.values(fredSeries).some(v => v != null);
  const hasBCB = macroSeries && Object.keys(macroSeries).length > 0;

  if (!hasFred && !hasBCB) {
    return h('div', { class: 'content fade-up' }, [
      pageHead('Macro Intelligence · Análise Avançada', 'Análise <em>Avançada</em>',
        'Painel de alto nível para decisão de investimentos. Requer dados BCB e/ou FRED carregados.'),
      h('div', { class: 'empty' }, [
        h('div', { class: 'empty-title' }, 'Dados não disponíveis'),
        h('p', { class: 'empty-desc' }, 'Carregue os dashboards BCB e FRED primeiro. Vá em Dashboard (BCB) e Fed/FRED para carregar as séries.'),
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' } }, [
          h('button', { class: 'btn-primary', onClick: () => setView('mi_dashboard') }, 'Abrir Dashboard BCB'),
          h('button', { class: 'btn-secondary', onClick: () => setView('mi_fed') }, 'Abrir FRED'),
        ]),
      ]),
    ]);
  }

  const usRegime = hasFred ? detectUSRegime(fredSeries) : null;
  const brRegime = hasBCB ? detectBRRegime(macroSeries) : null;
  const liquidity = hasFred ? assessLiquidity(fredSeries) : null;
  const riskAppetite = hasFred ? assessRiskAppetite(fredSeries) : null;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Análise Avançada', 'Análise <em>Avançada</em>',
      'Detecção de regime, liquidez global, apetite por risco. Baseado em indicadores BCB + FRED processados em tempo real.'),

    // Top-level regime cards
    h('div', { style: { display: 'grid', gridTemplateColumns: usRegime && brRegime ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '32px' } }, [
      usRegime && renderRegimeCard('🇺🇸 Estados Unidos', usRegime),
      brRegime && renderRegimeCard('🇧🇷 Brasil', brRegime),
    ]),

    // Liquidity + Risk side by side
    (liquidity || riskAppetite) && h('div', { style: { display: 'grid', gridTemplateColumns: liquidity && riskAppetite ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '32px' } }, [
      liquidity && renderLiquidityCard(liquidity),
      riskAppetite && renderRiskAppetiteCard(riskAppetite),
    ]),

    // Detailed signals
    usRegime && renderSignalTable('🇺🇸 Sinais do Regime — EUA', usRegime.signals),
    brRegime && renderSignalTable('🇧🇷 Sinais do Regime — Brasil', brRegime.signals),
    liquidity && renderSignalTable('💧 Sinais de Liquidez', liquidity.signals),
  ]);
}

function renderRegimeCard(title, regime) {
  return h('div', { class: 'card', style: { padding: '24px', borderTop: `3px solid ${regime.color}` } }, [
    h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-faint)', marginBottom: '8px' } }, 'Regime Econômico'),
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px', marginBottom: '4px' } }, title),
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '28px', color: regime.color, letterSpacing: '-0.02em' } }, regime.regime),
    h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' } },
      `${regime.confidence}% confiança · ${regime.signals.length} sinais analisados`),
    h('div', { style: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' } }, [
      regime.counts.expansion > 0 && renderCountBadge('Expansão', regime.counts.expansion, 'var(--green)'),
      regime.counts.neutral > 0 && renderCountBadge('Neutro', regime.counts.neutral, 'var(--text-muted)'),
      regime.counts.slowdown > 0 && renderCountBadge('Desacel.', regime.counts.slowdown, '#d4a574'),
      regime.counts.contraction > 0 && renderCountBadge('Contração', regime.counts.contraction, 'var(--red)'),
    ]),
  ]);
}

function renderCountBadge(label, count, color) {
  return h('span', {
    style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', padding: '3px 8px',
      border: `1px solid ${color}`, color: color, background: `${color}11` }
  }, `${label}: ${count}`);
}

function renderLiquidityCard(liq) {
  return h('div', { class: 'card', style: { padding: '24px', borderTop: `3px solid ${liq.color}` } }, [
    h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-faint)', marginBottom: '8px' } }, 'Liquidez Global'),
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '28px', color: liq.color, letterSpacing: '-0.02em' } }, liq.assessment),
    h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' } },
      `${liq.signals.length} indicadores analisados`),
    h('div', { style: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' } }, [
      liq.counts.loose > 0 && renderCountBadge('Solta', liq.counts.loose, 'var(--green)'),
      liq.counts.neutral > 0 && renderCountBadge('Neutra', liq.counts.neutral, 'var(--text-muted)'),
      liq.counts.tight > 0 && renderCountBadge('Apertada', liq.counts.tight, '#d4a574'),
      liq.counts.very_tight > 0 && renderCountBadge('Muito apert.', liq.counts.very_tight, 'var(--red)'),
    ]),
  ]);
}

function renderRiskAppetiteCard(risk) {
  // Gauge visualization
  const pct = ((risk.avgScore + 2) / 4) * 100; // -2 to +2 → 0% to 100%
  return h('div', { class: 'card', style: { padding: '24px', borderTop: `3px solid ${risk.color}` } }, [
    h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-faint)', marginBottom: '8px' } }, 'Apetite por Risco'),
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '28px', color: risk.color, letterSpacing: '-0.02em' } }, risk.label),
    h('div', { style: { marginTop: '16px', height: '8px', background: 'var(--bg)', borderRadius: '4px', position: 'relative', border: '1px solid var(--border)' } }, [
      h('div', { style: {
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${Math.max(5, Math.min(95, pct))}%`,
        background: `linear-gradient(90deg, var(--red), #d4a574, var(--green))`,
        borderRadius: '4px', opacity: '0.7',
      }}),
      h('div', { style: {
        position: 'absolute', left: `${Math.max(2, Math.min(95, pct))}%`, top: '-4px',
        width: '10px', height: '16px', background: risk.color, borderRadius: '2px',
        transform: 'translateX(-50%)',
      }}),
    ]),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '6px' } }, [
      h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--red)' } }, 'RISK-OFF'),
      h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--green)' } }, 'RISK-ON'),
    ]),
    h('div', { style: { marginTop: '14px' } },
      risk.signals.map(s => h('div', {
        style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' },
      }, [
        h('span', { style: { color: 'var(--text-muted)' } }, s.name),
        h('span', { class: 'mono', style: { color: s.score > 0 ? 'var(--green)' : s.score < 0 ? 'var(--red)' : 'var(--text-faint)' } },
          `${s.detail} (${s.score > 0 ? '+' : ''}${s.score})`),
      ]))
    ),
  ]);
}

function renderSignalTable(title, signals) {
  const dirColors = {
    expansion: 'var(--green)', neutral: 'var(--text-muted)', slowdown: '#d4a574', contraction: 'var(--red)',
    loose: 'var(--green)', tight: '#d4a574', very_tight: 'var(--red)',
  };
  return h('div', { style: { marginBottom: '28px' } }, [
    h('div', { class: 'macro-section-subhead' }, title),
    h('div', { class: 'card', style: { padding: '0', overflow: 'hidden' } },
      signals.map((s, i) => h('div', {
        style: {
          display: 'grid', gridTemplateColumns: '200px 120px 100px 1fr',
          gap: '12px', padding: '10px 16px', alignItems: 'center',
          borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: '13px',
        },
      }, [
        h('span', { style: { fontFamily: 'Fraunces, serif' } }, s.name),
        h('span', { class: 'mono', style: { fontWeight: '500' } }, s.value),
        h('span', { class: 'mono', style: { fontSize: '10px', color: dirColors[s.direction] || 'var(--text-faint)', textTransform: 'uppercase' } },
          s.direction === 'expansion' ? '▲ EXPANSÃO' :
          s.direction === 'contraction' ? '▼ CONTRAÇÃO' :
          s.direction === 'slowdown' ? '◆ DESACEL.' :
          s.direction === 'loose' ? '▲ SOLTA' :
          s.direction === 'tight' ? '▼ APERTADA' :
          s.direction === 'very_tight' ? '▼▼ MUITO APERT.' :
          '● NEUTRO'),
        h('span', { style: { fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic' } }, s.detail),
      ]))
    ),
  ]);
}

/* ============================================================
   27. MONTHLY MACRO REPORT (Gemini-generated)
   ============================================================ */

function renderMacroReport() {
  const fredSeries = state._fred_series;
  const macroSeries = state._macro_series;
  const hasFred = fredSeries && Object.values(fredSeries).some(v => v != null);
  const hasBCB = macroSeries && Object.keys(macroSeries).length > 0;
  const hasGemini = !!DB.settings.gemini_api_key;

  const report = state._macro_report;
  const loading = state._macro_report_loading;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Relatório Macro', 'Relatório <em>Macro Mensal</em>',
      'Resumo editorial gerado por IA com os principais indicadores econômicos do Brasil e EUA. Baseado nos dados BCB + FRED carregados.'),

    (!hasFred && !hasBCB) && h('div', { class: 'empty' }, [
      h('div', { class: 'empty-title' }, 'Dados não disponíveis'),
      h('p', { class: 'empty-desc' }, 'Carregue os dashboards BCB e FRED primeiro.'),
      h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' } }, [
        h('button', { class: 'btn-primary', onClick: () => setView('mi_dashboard') }, 'Abrir Dashboard BCB'),
        h('button', { class: 'btn-secondary', onClick: () => setView('mi_fed') }, 'Abrir FRED'),
      ]),
    ]),

    !hasGemini && (hasFred || hasBCB) && h('div', { class: 'empty' }, [
      h('div', { class: 'empty-title' }, 'Gemini API key necessária'),
      h('p', { class: 'empty-desc' }, 'O relatório é gerado por IA (Gemini). Configure a API key em Settings.'),
      h('button', { class: 'btn-primary', onClick: () => setModal('settings') }, 'Abrir Settings'),
    ]),

    hasGemini && (hasFred || hasBCB) && !report && !loading && h('div', { style: { textAlign: 'center', padding: '40px' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px', marginBottom: '16px' } }, 'Pronto para gerar o relatório'),
      h('p', { style: { color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' } },
        'O relatório será gerado com base nos indicadores BCB e FRED atualmente carregados. O processo leva ~30 segundos.'),
      h('button', { class: 'btn-primary', style: { fontSize: '14px', padding: '12px 32px' },
        onClick: () => generateMacroReport(),
      }, '✦ Gerar Relatório Macro'),
    ]),

    loading && h('div', { style: { textAlign: 'center', padding: '60px', color: 'var(--amber)' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px' } }, 'Gerando relatório com Gemini…'),
      h('div', { class: 'mono', style: { fontSize: '10px', marginTop: '8px', color: 'var(--text-faint)' } }, 'Analisando indicadores e compondo editorial'),
    ]),

    report && renderMacroReportContent(report),
  ]);
}

async function generateMacroReport() {
  state._macro_report_loading = true;
  state._macro_report = null;
  render();

  const snapshot = buildMacroSnapshot();
  const apiKey = DB.settings.gemini_api_key;

  const prompt = `You are a senior macro strategist at a Brazilian asset management firm focused on Real Estate and Private Credit.

Based on the following economic data snapshot, write a comprehensive monthly macro report IN PORTUGUESE (Brazilian).

DATA SNAPSHOT:
${snapshot}

Write the report with these sections. Use markdown formatting (##, ###, **bold**, etc):

## Sumário Executivo
2-3 paragraphs: the big picture — what's the dominant macro narrative right now? What changed this month?

## 🇧🇷 Brasil
### Política Monetária & Inflação
SELIC trajectory, IPCA trend, real interest rate, what the COPOM is likely thinking
### Atividade & Crédito
Credit growth, default rates, economic activity signals
### Mercado Imobiliário
Real estate credit, INCC, implications for FIIs and CRIs/CRAs
### Câmbio
USD/BRL dynamics and implications

## 🇺🇸 Estados Unidos
### Fed & Taxas
Fed Funds rate, yield curve shape, real rates, forward guidance signals
### Inflação
CPI, Core PCE, breakevens — direction and pace
### Emprego & Atividade
Payrolls, unemployment, industrial production, consumer sentiment
### Liquidez & Condições Financeiras
M2, Fed balance sheet, NFCI, financial stress
### Crédito & Housing
HY/IG spreads, housing starts, permits, Case-Shiller

## Implicações para Investimentos
### Renda Fixa Brasil
What does this mean for duration, credit spreads, indexador (CDI vs IPCA vs prefixado)?
### Real Estate (FIIs, CRIs/CRAs)
Impact on cap rates, funding costs, vacancy expectations
### Ações (Brasil & US)
Equity risk premium, sector rotations, valuations
### Riscos-Chave
Top 3-5 risks to monitor over the next 30 days

Be specific with numbers. Reference the actual data values. Be opinionated — this is for internal use, not public. Think like a CIO preparing for an investment committee meeting.`;

  try {
    const text = await callGeminiText(prompt, apiKey, (msg) => {
      state._macro_report_status = msg;
      render();
    });
    if (!text) throw new Error('Resposta vazia do Gemini');

    state._macro_report = {
      content: text,
      generated_at: new Date().toISOString(),
      snapshot_summary: `BCB: ${Object.keys(state._macro_series || {}).length} séries · FRED: ${Object.values(state._fred_series || {}).filter(v => v != null).length} séries`,
    };
    state._macro_report_loading = false;
    render();
  } catch (err) {
    state._macro_report_loading = false;
    showToast('Erro ao gerar relatório: ' + err.message, true);
    render();
  }
}

function buildMacroSnapshot() {
  const lines = [];
  const ms = state._macro_series || {};
  const fs = state._fred_series || {};

  const lastVal = (series) => {
    if (!series || series.length === 0) return null;
    const last = series[series.length - 1];
    return { value: last.value, date: last.date };
  };

  lines.push('=== BRAZIL (BCB) ===');
  const bcbKeys = { selic: 'SELIC Meta (%)', ipca12m: 'IPCA 12m (%)', cdi: 'CDI (%)', cambio: 'USD/BRL',
    incc: 'INCC (%)', cred_imob: 'Crédito Imobiliário (R$ mi)', inadimplencia: 'Inadimplência Total (%)',
    ibc_br: 'IBC-Br (atividade)' };
  for (const [key, label] of Object.entries(bcbKeys)) {
    const v = lastVal(ms[key]);
    if (v) lines.push(`${label}: ${v.value} (${v.date})`);
  }

  lines.push('\n=== USA (FRED) ===');
  const fredKeys = {
    fed_funds: 'Fed Funds Target (%)', dgs2: 'Treasury 2Y (%)', dgs10: 'Treasury 10Y (%)',
    t10y2y: '10Y-2Y Spread (p.p.)', mortgage30: 'Mortgage 30Y (%)',
    unrate: 'Unemployment Rate (%)', claims: 'Initial Claims (k)',
    nfci: 'NFCI (financial conditions)', stlfsi: 'Financial Stress Index',
    hy_spread: 'HY Spread OAS (bps)', ig_spread: 'IG Spread OAS (bps)',
    housing_starts: 'Housing Starts (k)', breakeven5y: 'Breakeven 5Y (%)', breakeven10y: 'Breakeven 10Y (%)',
  };
  for (const [key, label] of Object.entries(fredKeys)) {
    const v = lastVal(fs[key]);
    if (v) lines.push(`${label}: ${v.value} (${v.date})`);
  }

  // Computed
  const computeYoY = (s) => {
    if (!s || s.length < 13) return null;
    return ((s[s.length-1].value / s[s.length-13].value) - 1) * 100;
  };
  const cpiYoY = computeYoY(fs.cpi);
  const coreCpiYoY = computeYoY(fs.core_cpi);
  const corePceYoY = computeYoY(fs.core_pce);
  const m2YoY = computeYoY(fs.m2);
  if (cpiYoY != null) lines.push(`CPI YoY: ${cpiYoY.toFixed(2)}%`);
  if (coreCpiYoY != null) lines.push(`Core CPI YoY: ${coreCpiYoY.toFixed(2)}%`);
  if (corePceYoY != null) lines.push(`Core PCE YoY: ${corePceYoY.toFixed(2)}%`);
  if (m2YoY != null) lines.push(`M2 YoY: ${m2YoY.toFixed(2)}%`);

  // Payrolls MoM
  if (fs.payems && fs.payems.length >= 2) {
    const mom = fs.payems[fs.payems.length-1].value - fs.payems[fs.payems.length-2].value;
    lines.push(`Payrolls MoM: ${mom > 0 ? '+' : ''}${Math.round(mom)}k`);
  }

  return lines.join('\n');
}

function renderMacroReportContent(report) {
  // Simple markdown-to-HTML renderer
  let html = report.content
    .replace(/### (.*)/g, '<h3 style="font-family:Fraunces,serif;font-size:16px;color:var(--amber);margin:24px 0 8px;border-bottom:1px solid var(--border);padding-bottom:6px">$1</h3>')
    .replace(/## (.*)/g, '<h2 style="font-family:Fraunces,serif;font-size:20px;margin:32px 0 12px;letter-spacing:-0.02em">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--amber)">$1</strong>')
    .replace(/\n\n/g, '</p><p style="line-height:1.75;color:var(--text-muted);margin:0 0 12px">')
    .replace(/\n/g, '<br>');
  html = '<p style="line-height:1.75;color:var(--text-muted);margin:0 0 12px">' + html + '</p>';

  return h('div', {}, [
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } },
        `Gerado em ${new Date(report.generated_at).toLocaleString('pt-BR')} · ${report.snapshot_summary}`),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-secondary', onClick: () => { state._macro_report = null; render(); }}, '↻ Regenerar'),
        h('button', { class: 'btn-secondary', onClick: () => {
          const blob = new Blob([report.content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `aegir-macro-report-${new Date().toISOString().split('T')[0]}.md`;
          a.click(); URL.revokeObjectURL(url);
          showToast('Relatório exportado como Markdown');
        }}, '↓ Exportar .md'),
      ]),
    ]),
    h('div', { class: 'card', style: { padding: '32px 40px', maxWidth: '900px' } }, [
      h('div', { html }),
    ]),
  ]);
}

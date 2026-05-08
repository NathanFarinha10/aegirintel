// Aegir·Intel — Bundled 2026-05-08

// ====== core.js ======


/* ---------- 1. TAXONOMY (fixed knowledge base) ---------- */

const MANAGERS = [
  { slug:'blackrock',  name:'BlackRock',          short:'BLK', aum:'$11.5T', type:'core' },
  { slug:'pimco',      name:'PIMCO',              short:'PIM', aum:'$2.0T',  type:'core' },
  { slug:'jpm',        name:'JP Morgan AM',       short:'JPM', aum:'$3.6T',  type:'core' },
  { slug:'goldman',    name:'Goldman Sachs AM',   short:'GS',  aum:'$2.8T',  type:'core' },
  { slug:'ms',         name:'Morgan Stanley IM',  short:'MS',  aum:'$1.5T',  type:'core' },
  { slug:'fidelity',   name:'Fidelity',           short:'FID', aum:'$5.3T',  type:'core' },
  { slug:'vanguard',   name:'Vanguard',           short:'VG',  aum:'$9.3T',  type:'core' },
  { slug:'invesco',    name:'Invesco',            short:'IVZ', aum:'$1.8T',  type:'core' },
  { slug:'xp',         name:'XP Inc.',            short:'XP',  aum:'R$ 1.2T', type:'core' },
  { slug:'btg',        name:'BTG Pactual',        short:'BTG', aum:'R$ 1.6T', type:'core' },
];

// Custom managers (stored in DB, user-created)
function getAllManagers() {
  const custom = (DB.custom_managers || []).map(m => ({ ...m, type: m.type || 'secondary' }));
  return [...MANAGERS, ...custom];
}

function getCoreManagers() {
  return getAllManagers().filter(m => m.type === 'core');
}

function getManagerBySlug(slug) {
  return getAllManagers().find(m => m.slug === slug) || null;
}

function addCustomManager(m) {
  if (!DB.custom_managers) DB.custom_managers = [];
  // Ensure unique slug
  const slug = m.slug || m.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
  if (getAllManagers().some(x => x.slug === slug)) {
    showToast('Slug já existe: ' + slug, true);
    return null;
  }
  const mgr = {
    slug,
    name: m.name,
    short: m.short || m.name.substring(0, 3).toUpperCase(),
    aum: m.aum || '',
    type: m.type || 'secondary',
  };
  DB.custom_managers.push(mgr);
  // Rebuild MANAGER_BY_SLUG
  MANAGER_BY_SLUG[slug] = mgr;
  saveDB(DB);
  showToast(`Gestora "${mgr.name}" adicionada como ${mgr.type}`);
  return slug;
}

function removeCustomManager(slug) {
  if (!confirm(`Excluir gestora "${slug}"? Views ingeridas serão mantidas.`)) return;
  DB.custom_managers = (DB.custom_managers || []).filter(m => m.slug !== slug);
  delete MANAGER_BY_SLUG[slug];
  saveDB(DB);
  render();
}

const TAXONOMY = {
  macro: [
    { slug:'us',       name:'United States',          flag:'🇺🇸' },
    { slug:'europe',   name:'Europe',                 flag:'🇪🇺' },
    { slug:'uk',       name:'United Kingdom',         flag:'🇬🇧' },
    { slug:'japan',    name:'Japan',                  flag:'🇯🇵' },
    { slug:'china',    name:'China',                  flag:'🇨🇳' },
    { slug:'india',    name:'India',                  flag:'🇮🇳' },
    { slug:'brazil',   name:'Brazil',                 flag:'🇧🇷' },
    { slug:'emerging', name:'Emerging Markets (ex-CN)',flag:'🌏' },
  ],
  asset: [
    // US
    { slug:'us_equities',       name:'US Equities',           region:'us' },
    { slug:'us_govt',           name:'US Government Bonds',   region:'us' },
    { slug:'us_ig',             name:'US Investment Grade',   region:'us' },
    { slug:'us_hy',             name:'US High Yield',         region:'us' },
    // Europe
    { slug:'dm_ex_us_equities', name:'DM ex-US Equities',     region:'europe' },
    { slug:'eu_govt',           name:'Euro Area Govt Bonds',  region:'europe' },
    { slug:'eu_ig',             name:'Euro IG Credit',        region:'europe' },
    // EM & Brasil
    { slug:'em_equities',       name:'EM Equities',           region:'em' },
    { slug:'em_debt',           name:'EM Debt (Local)',        region:'em' },
    { slug:'brazil_equities',   name:'Brasil Ações',          region:'em' },
    { slug:'brazil_fi',         name:'Brasil Renda Fixa',     region:'em' },
    { slug:'brazil_re',         name:'Brasil Real Estate',    region:'em' },
    { slug:'brazil_credit',     name:'Brasil Crédito Privado',region:'em' },
    // Global / Alternatives
    { slug:'real_estate',       name:'Real Estate (Global)',   region:'global' },
    { slug:'commodities',       name:'Commodities',           region:'global' },
    { slug:'gold',              name:'Gold',                  region:'global' },
    { slug:'hedge_funds',       name:'Hedge Funds',           region:'global' },
    { slug:'private_equity',    name:'Private Equity',        region:'global' },
    { slug:'private_debt',      name:'Private Debt',          region:'global' },
    { slug:'infrastructure',    name:'Infrastructure',        region:'global' },
    { slug:'cash',              name:'Cash',                  region:'global' },
  ],
  micro: [
    // US
    { slug:'us_small_caps',     name:'US Small Caps',          region:'us' },
    { slug:'us_reits',          name:'US REITs',               region:'us' },
    { slug:'us_tips',           name:'US TIPS',                region:'us' },
    { slug:'us_muni',           name:'US Municipal Bonds',     region:'us' },
    { slug:'value_factor',      name:'Value Factor (US)',      region:'us' },
    { slug:'quality_factor',    name:'Quality Factor (US)',    region:'us' },
    { slug:'leveraged_loans',   name:'Leveraged Loans (US)',   region:'us' },
    { slug:'convertibles',      name:'Convertibles (US)',      region:'us' },
    // Europe
    { slug:'eu_small_caps',     name:'Euro Small Caps',        region:'europe' },
    { slug:'eu_reits',          name:'European REITs',         region:'europe' },
    // EM & Brasil
    { slug:'brazil_small_caps', name:'Brasil Small Caps',      region:'em' },
    { slug:'brazil_fiis',       name:'FIIs (Fundos Imob.)',    region:'em' },
    { slug:'brazil_cri_cra',    name:'CRIs / CRAs',           region:'em' },
    { slug:'brazil_debentures', name:'Debêntures BR',          region:'em' },
    { slug:'frontier',          name:'Frontier Markets',       region:'em' },
    // Global
    { slug:'oil_energy',        name:'Oil & Energy',           region:'global' },
    { slug:'industrial_metals', name:'Industrial Metals',      region:'global' },
    { slug:'apac_reits',        name:'APAC REITs',             region:'global' },
  ],
  thematic: [
    { slug:'ai',           name:'Artificial Intelligence',  color:'#d4a574' },
    { slug:'crypto',       name:'Digital Assets / Crypto',  color:'#b87a5c' },
    { slug:'space',        name:'Space Economy',            color:'#7a8aa5' },
    { slug:'energy_trans', name:'Energy Transition',        color:'#7a9b5c' },
    { slug:'biotech',      name:'Biotech & Genomics',       color:'#a57a9b' },
    { slug:'defense',      name:'Defense & Security',       color:'#8a7a5c' },
    { slug:'robotics',     name:'Robotics & Automation',    color:'#c89b7a' },
    { slug:'water',        name:'Water Scarcity',           color:'#5c9b9b' },
    { slug:'longevity',    name:'Longevity & Aging',        color:'#9b7a9b' },
    { slug:'onshoring',    name:'Supply Chain Reshoring',   color:'#d47a5c' },
  ],
  scenery: [
    { slug:'fed_cuts_aggressive',  name:'Fed corta agressivamente',    color:'#7a9b5c' },
    { slug:'fed_higher_longer',    name:'Fed higher for longer',       color:'#b85c5c' },
    { slug:'us_recession',         name:'Recessão nos EUA',            color:'#b87a5c' },
    { slug:'us_soft_landing',      name:'Soft Landing / Goldilocks',   color:'#7a9b5c' },
    { slug:'china_stimulus',       name:'China estimula fortemente',   color:'#d4a574' },
    { slug:'geopolitical_shock',   name:'Choque geopolítico (guerra)', color:'#b85c5c' },
    { slug:'tariff_war',           name:'Guerra tarifária / protecionismo', color:'#c89b7a' },
    { slug:'fiscal_dominance_br',  name:'Dominância fiscal no Brasil', color:'#b85c5c' },
    { slug:'selic_below_10',       name:'SELIC abaixo de 10%',         color:'#7a9b5c' },
    { slug:'inflation_resurgence', name:'Ressurgência inflacionária global', color:'#d47a5c' },
    { slug:'dollar_weakening',     name:'Enfraquecimento global do dólar', color:'#7a8aa5' },
    { slug:'productivity_boom',    name:'Boom de produtividade (AI-driven)', color:'#d4a574' },
  ],
};

// Region metadata for grouping in UI
const ASSET_REGIONS = {
  us:      { label: 'Estados Unidos', flag: '🇺🇸', order: 1 },
  europe:  { label: 'Europa',         flag: '🇪🇺', order: 2 },
  em:      { label: 'Emergentes & Brasil', flag: '🌏', order: 3 },
  global:  { label: 'Global & Alternativos', flag: '🌐', order: 4 },
};

const ALL_SLUGS = new Set();
const SLUG_META = {};
for (const kind of Object.keys(TAXONOMY)) {
  for (const item of TAXONOMY[kind]) {
    ALL_SLUGS.add(item.slug);
    SLUG_META[item.slug] = { ...item, kind };
  }
}

const STANCE_META = {
  OW:  { label:'Overweight',         value: 2, color:'#7a9b5c' },
  MOW: { label:'Modest Overweight',  value: 1, color:'#a5b87a' },
  N:   { label:'Neutral',            value: 0, color:'#8a8578' },
  MUW: { label:'Modest Underweight', value:-1, color:'#c89b7a' },
  UW:  { label:'Underweight',        value:-2, color:'#b85c5c' },
};

const MANAGER_BY_SLUG = {};
// Populated after DB load (so custom managers from DB are included)

/* ---------- 2. STORAGE (LocalStorage wrapper) ---------- */

const DB_KEY = 'aegir_intel_v1';

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return { reports: [], views: [], settings: {} };
    return JSON.parse(raw);
  } catch {
    return { reports: [], views: [], settings: {} };
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

let DB = loadDB();

// Now populate MANAGER_BY_SLUG with all managers (including custom from DB)
for (const m of getAllManagers()) MANAGER_BY_SLUG[m.slug] = m;

/* ---------- 3. GEMINI CLIENT ---------- */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_MODELS = [
  'gemini-2.5-flash',      // primário — melhor qualidade
  'gemini-2.5-flash-lite', // fallback — menos popular, menos congestionado
];

const EXTRACTION_PROMPT = `You are a senior investment research analyst extracting structured market views from a manager's outlook report.

Read the PDF content below and extract every explicit or strongly-implied view the manager has on any country, asset class, sub-asset class, or investment theme. Return ONLY valid JSON.

## TAXONOMY (use EXACTLY these slugs — do not invent new ones)

Macro: us, europe, uk, japan, china, india, brazil, emerging
Assets: us_equities, dm_ex_us_equities, em_equities, us_govt, us_ig, us_hy, em_debt, real_estate, commodities, gold, hedge_funds, private_equity, private_debt, infrastructure, cash
Sub-assets: us_small_caps, value_factor, quality_factor, us_reits, apac_reits, oil_energy, industrial_metals, us_tips, leveraged_loans, convertibles, us_muni, frontier
Themes: ai, crypto, space, energy_trans, biotech, defense, robotics, water, longevity, onshoring

## STANCES (map manager language to one of these)
- OW (Overweight): strong buy, bullish, high conviction
- MOW (Modest Overweight): constructive, favor, prefer, slight tilt to
- N (Neutral): neutral, market weight, balanced
- MUW (Modest Underweight): cautious, slight caution, tilt away
- UW (Underweight): avoid, bearish, reduce significantly

## OUTPUT (JSON only, no markdown fences)

{
  "report_meta": {
    "report_type": "quarterly_outlook | monthly_commentary | secular_outlook | strategy_note | deep_dive",
    "primary_horizon": "tactical | strategic | secular"
  },
  "views": [
    {
      "taxonomy_slug": "us_equities",
      "stance": "MOW",
      "conviction": 0.7,
      "thesis_summary": "2-3 sentence analyst paraphrase of the positioning rationale",
      "catalysts": ["bullet 1", "bullet 2"],
      "risks": ["bullet 1", "bullet 2"],
      "time_horizon": "tactical | strategic | secular",
      "page_ref": 12,
      "quote": "Short direct quote from the report (under 20 words)"
    }
  ]
}

## RULES

1. Only use taxonomy_slug values from the list above. Unknown topics → omit.
2. thesis_summary must be paraphrased, not copied verbatim.
3. quote: one short direct citation (under 20 words) for audit.
4. conviction: 0.0–1.0 based on language intensity and emphasis.
5. Country ≠ regional equities. "US macro outlook" maps to 'us'. "US stock market" maps to 'us_equities'.
6. One view per slug. Consolidate if mentioned multiple times.
7. If no clear view is expressed, omit it. Empty views[] is OK.

## PDF CONTENT

{pdf_text}

Return JSON only.`;

async function callGemini(pdfText, apiKey, onStatus) {
  const prompt = EXTRACTION_PROMPT.replace('{pdf_text}', pdfText);
  return callGeminiRaw(prompt, apiKey, onStatus);
}

// Lower-level: send any prompt to Gemini and parse JSON response.
// Used by securities qualitative analysis, semantic search, narrative generation.
async function callGeminiRaw(prompt, apiKey, onStatus) {
  const errors = [];

  for (let m = 0; m < GEMINI_MODELS.length; m++) {
    const model = GEMINI_MODELS[m];
    if (m > 0) onStatus?.(`Modelo primário sobrecarregado, tentando ${model}...`);

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const waitMs = Math.min(30000, 2000 * Math.pow(2, attempt));
        onStatus?.(`Aguardando ${Math.round(waitMs/1000)}s antes de tentar novamente (tentativa ${attempt + 1}/3)...`);
        await new Promise(r => setTimeout(r, waitMs));
      }

      try {
        const url = `${GEMINI_URL}${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
              max_output_tokens: 8192,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error('Empty Gemini response');
          try {
            return JSON.parse(text);
          } catch {
            const cleaned = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
          }
        }

        // Transient errors: retry this model
        if (res.status === 429 || res.status === 503) {
          const body = await res.text();
          errors.push(`${model} (${res.status}): ${body.substring(0, 100)}`);
          continue; // next attempt
        }

        // Permanent errors (400, 401, 403, 404): no retry, try next model
        const body = await res.text();
        errors.push(`${model} (${res.status}): ${body.substring(0, 200)}`);
        break; // try next model in outer loop

      } catch (err) {
        // Network error — retry
        errors.push(`${model} (network): ${err.message}`);
      }
    }
  }

  throw new Error(
    `Todos os modelos/tentativas falharam.\n\n` +
    `Isso geralmente é congestionamento temporário do Gemini. ` +
    `Aguarde 5-15 minutos e tente novamente.\n\n` +
    `Detalhes técnicos:\n${errors.slice(-3).join('\n')}`
  );
}

async function _OLD_callGemini_kept_for_diff_REMOVED() { /* removed */ }

// Text-mode Gemini call (no JSON forcing, returns raw text)
async function callGeminiText(prompt, apiKey, onStatus) {
  const errors = [];
  for (let m = 0; m < GEMINI_MODELS.length; m++) {
    const model = GEMINI_MODELS[m];
    if (m > 0) onStatus?.(`Tentando modelo ${model}...`);
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const waitMs = Math.min(30000, 2000 * Math.pow(2, attempt));
        onStatus?.(`Aguardando ${Math.round(waitMs/1000)}s (tentativa ${attempt + 1}/3)...`);
        await new Promise(r => setTimeout(r, waitMs));
      }
      try {
        const url = `${GEMINI_URL}${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, max_output_tokens: 8192 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error('Empty Gemini response');
          return text;
        }
        if (res.status === 429 || res.status === 503) {
          errors.push(`${model} (${res.status})`);
          continue;
        }
        const body = await res.text();
        errors.push(`${model} (${res.status}): ${body.substring(0, 200)}`);
        break;
      } catch (err) {
        errors.push(`${model}: ${err.message}`);
      }
    }
  }
  throw new Error(`Gemini falhou: ${errors.slice(-3).join(' | ')}`);
}

function validateExtraction(data) {
  if (!data || !Array.isArray(data.views)) throw new Error("Response missing 'views'");

  const cleaned = data.views
    .filter(v => ALL_SLUGS.has(v.taxonomy_slug) && STANCE_META[v.stance])
    .map(v => ({
      taxonomy_slug: v.taxonomy_slug,
      stance: v.stance,
      conviction: Math.max(0, Math.min(1, Number(v.conviction) || 0.5)),
      thesis_summary: (v.thesis_summary || '').substring(0, 2000),
      catalysts: (v.catalysts || []).slice(0, 8),
      risks: (v.risks || []).slice(0, 8),
      time_horizon: v.time_horizon || 'strategic',
      page_ref: v.page_ref || null,
      quote: (v.quote || '').substring(0, 300),
    }));

  return { report_meta: data.report_meta || {}, views: cleaned };
}

/* ---------- 4. PDF EXTRACTION (client-side) ---------- */

async function extractPdfText(file) {
  if (typeof window.loadPdfJs === 'function') await window.loadPdfJs();
  if (!window.pdfjsLib) throw new Error('PDF.js não disponível. Recarregue a página.');
  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = pdf.numPages;
  const chunks = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(it => it.str).join(' ').trim();
    if (text) chunks.push(`[PAGE ${i}]\n${text}`);
  }

  return { text: chunks.join('\n\n'), pageCount };
}

function truncateForLLM(text, max = 500000) {
  if (text.length <= max) return text;
  const keepStart = Math.floor(max * 0.7);
  const keepEnd = max - keepStart;
  return text.substring(0, keepStart) + '\n\n[... MIDDLE TRUNCATED ...]\n\n' + text.substring(text.length - keepEnd);
}

/* ---------- 5. CONSENSUS CALCULATION ---------- */

function getLatestViews(slug = null) {
  // Returns map of { manager_slug -> latest view for that slug }
  const byMgr = {};
  for (const v of DB.views) {
    if (slug && v.taxonomy_slug !== slug) continue;
    const key = slug ? v.manager_slug : `${v.manager_slug}::${v.taxonomy_slug}`;
    const existing = byMgr[key];
    if (!existing || new Date(v.publication_date) > new Date(existing.publication_date)) {
      byMgr[key] = v;
    }
  }
  return byMgr;
}

function computeConsensus(slug, coreOnly = true) {
  const allViews = Object.values(getLatestViews(slug));
  // Filter: consensus only from core managers by default
  const coreSlugs = coreOnly ? new Set(getCoreManagers().map(m => m.slug)) : null;
  const views = coreOnly ? allViews.filter(v => coreSlugs.has(v.manager_slug)) : allViews;
  if (!views.length) return null;
  const total = views.reduce((a, v) => a + STANCE_META[v.stance].value, 0);
  const avg = total / views.length;
  const avgConv = views.reduce((a, v) => a + (v.conviction || 0), 0) / views.length;
  let stance;
  if (avg >= 1.5) stance = 'OW';
  else if (avg >= 0.5) stance = 'MOW';
  else if (avg >= -0.5) stance = 'N';
  else if (avg >= -1.5) stance = 'MUW';
  else stance = 'UW';
  return { stance, weighted: Number(avg.toFixed(2)), conviction: Number(avgConv.toFixed(2)), count: views.length };
}

function getRecentChanges(days = 30) {
  // Sort all views by manager+slug, find changes
  const byPair = {};
  for (const v of DB.views) {
    const key = `${v.manager_slug}::${v.taxonomy_slug}`;
    if (!byPair[key]) byPair[key] = [];
    byPair[key].push(v);
  }
  const changes = [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  for (const key of Object.keys(byPair)) {
    const list = byPair[key].sort((a, b) => new Date(a.publication_date) - new Date(b.publication_date));
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      const prev = list[i - 1];
      if (new Date(v.publication_date) < cutoff) continue;
      if (prev && prev.stance !== v.stance) {
        const direction = STANCE_META[v.stance].value > STANCE_META[prev.stance].value ? 'upgrade' : 'downgrade';
        changes.push({
          manager_slug: v.manager_slug,
          taxonomy_slug: v.taxonomy_slug,
          from: prev.stance,
          to: v.stance,
          direction,
          date: v.publication_date,
          note: v.thesis_summary,
        });
      } else if (!prev) {
        // First view is a "new" entry
        changes.push({
          manager_slug: v.manager_slug,
          taxonomy_slug: v.taxonomy_slug,
          from: null,
          to: v.stance,
          direction: 'new',
          date: v.publication_date,
          note: v.thesis_summary,
        });
      }
    }
  }
  return changes.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getStanceHistory(managerSlug, taxonomySlug) {
  return DB.views
    .filter(v => v.manager_slug === managerSlug && v.taxonomy_slug === taxonomySlug)
    .sort((a, b) => new Date(a.publication_date) - new Date(b.publication_date));
}

/* ---------- 6. STATE & ROUTER ---------- */

const state = {
  view: 'int_hub',
  detail: null,     // { kind, slug }
  modal: null,      // 'upload' | 'settings' | null
};

function setView(v) { state.view = v; state.detail = null; render(); }
function setDetail(kind, slug) { state.detail = { kind, slug }; render(); }
function clearDetail() { state.detail = null; render(); }
function setModal(m) { state.modal = m; render(); }

/* ---------- 7. RENDERING HELPERS ---------- */

const h = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el[k.toLowerCase()] = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (v !== null && v !== undefined && v !== false) el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    // Accept strings, numbers, booleans (as text), and DOM nodes
    if (typeof c === 'string' || typeof c === 'number' || typeof c === 'boolean') {
      el.appendChild(document.createTextNode(String(c)));
    } else if (c instanceof Node) {
      el.appendChild(c);
    } else {
      // Silently skip unknown types rather than crashing the whole render
      console.warn('h(): skipping unsupported child', c);
    }
  }
  return el;
};

const stanceBadge = (stance, size = 'sm') => {
  if (!stance) return h('span', { class: 'stance-empty' }, '—');
  return h('span', { class: `stance stance-${size} stance-${stance}` }, stance);
};

const convBar = (v) => h('div', { class: 'conv-bar' }, [
  h('div', { class: 'conv-bar-track' }, [
    h('div', { class: 'conv-bar-fill', style: { width: `${Math.round((v || 0) * 100)}%` } })
  ]),
  h('span', {}, String(Math.round((v || 0) * 100))),
]);

const pulse = (vals, w = 80, ht = 22) => {
  if (!vals?.length) return h('div', { style: { color: 'var(--text-faint)' } }, '—');
  const min = -2, max = 2;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = ht - ((v - min) / (max - min)) * ht;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', w); svg.setAttribute('height', ht); svg.classList.add('pulse-mini');
  svg.innerHTML = `
    <line x1="0" y1="${ht/2}" x2="${w}" y2="${ht/2}" stroke="#3a3631" stroke-dasharray="2 3"/>
    <polyline fill="none" stroke="#d4a574" stroke-width="1.5" points="${pts}"/>
    ${vals.map((v, i) => {
      const x = (i/(vals.length-1))*w;
      const y = ht - ((v-min)/(max-min))*ht;
      return `<circle cx="${x}" cy="${y}" r="1.8" fill="#d4a574"/>`;
    }).join('')}
  `;
  return svg;
};

const sectionHead = (num, title, caption) => h('div', { style: { marginBottom: '14px' } }, [
  h('div', { class: 'section-label' }, [
    h('span', { class: 'section-num' }, `§ ${num}`),
    h('h2', { class: 'section-title' }, title),
  ]),
  caption && h('div', { class: 'section-caption' }, caption),
]);

const pageHead = (kicker, titleHTML, desc) => h('div', { class: 'page-head' }, [
  h('div', { class: 'page-kicker' }, kicker),
  h('h1', { class: 'page-title', html: titleHTML }),
  desc && h('p', { class: 'page-desc', html: desc }),
]);

const emptyState = () => h('div', { class: 'empty' }, [
  h('div', { class: 'empty-title' }, 'Nenhum relatório ingerido ainda'),
  h('p', { class: 'empty-desc', html: 'Clique em <strong>Ingest PDF</strong> no topo para começar. Suba outlooks trimestrais das gestoras e o sistema extrai as visões automaticamente usando Gemini.' }),
  h('button', { class: 'btn-secondary', onClick: () => setModal('upload') }, 'Ingerir primeiro relatório'),
]);

function render() {
  try {
    _renderInternal();
  } catch (err) {
    console.error('Render error:', err);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="padding:40px;max-width:800px;margin:0 auto;font-family:'Geist',sans-serif;color:#1a1815">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.3em;color:#b83c3c;text-transform:uppercase;margin-bottom:12px">Render Error</div>
          <h1 style="font-family:'Fraunces',serif;font-size:32px;margin-bottom:16px">Algo quebrou nesta tela</h1>
          <p style="color:#5a564e;font-size:13px;margin-bottom:20px;line-height:1.6">
            A aplicação lançou um erro ao renderizar. Seus dados estão seguros no LocalStorage.
            Tente voltar para o Hub, recarregar a página, ou me mandar o erro abaixo.
          </p>
          <pre style="padding:16px;background:#f0ede8;border:1px solid #b83c3c;font-family:'JetBrains Mono',monospace;font-size:11px;color:#b83c3c;white-space:pre-wrap;word-break:break-word;margin-bottom:20px">${(err.stack || err.message || String(err)).replace(/</g,'&lt;')}</pre>
          <div style="display:flex;gap:12px">
            <button onclick="state.view='int_hub';state.detail=null;render()" style="padding:10px 20px;border:1px solid #b8863c;color:#b8863c;background:transparent;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer">← Voltar ao Hub</button>
            <button onclick="location.reload()" style="padding:10px 20px;border:1px solid #e0dbd4;color:#5a564e;background:transparent;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer">Recarregar página</button>
          </div>
        </div>
      `;
    }
  }
}

function renderPlaceholder(title, desc) {
  return h('div', { class: 'content fade-up' }, [
    pageHead('', title, ''),
    h('div', { style: { padding: '60px 40px', textAlign: 'center' } }, [
      h('div', { style: { fontSize: '48px', marginBottom: '16px', opacity: '0.3' } }, '🔒'),
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '22px', marginBottom: '12px', color: 'var(--text-dim)' } }, title),
      h('div', { style: { fontSize: '14px', color: 'var(--text-faint)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.7' } }, desc),
    ]),
  ]);
}

function _renderInternal() {
  // CRITICAL: remove any existing modals first (they live outside #app)
  document.querySelectorAll('.modal-bg').forEach(el => el.remove());

  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(renderHeader());

  const layout = h('div', { class: 'main-layout' }, [renderSidebar()]);

  let content;
  if (state.detail) {
    content = renderDetail();
  } else {
    switch (state.view) {
      // === Global Intelligence ===
      case 'int_hub':      content = renderIntHub(); break;
      case 'int_macro':    content = renderGrid('macro',    'Macro View',        'Consenso de outlook para países e regiões'); break;
      case 'int_assets':   content = renderGrid('asset',    'Assets View',       'Classes de ativos — equities, fixed income, alternativos'); break;
      case 'int_micro':    content = renderGrid('micro',    'MicroAssets View',  'Subclasses e fatores de investimento'); break;
      case 'int_thematic': content = renderGrid('thematic', 'Thematic View',     'Temas estruturais e tendências disruptivas'); break;
      case 'int_report':   content = renderReportBuilder(); break;
      case 'int_data':     content = renderDataView(); break;

      // === Macro Intelligence ===
      case 'mi_dashboard':  content = renderMacroDashboard(); break;
      case 'mi_brasil':     content = renderBrasilPanel(); break;
      case 'mi_us':         content = renderUSPanel(); break;
      case 'mi_analysis':   content = renderAdvancedAnalysis(); break;
      case 'mi_calendar':   content = renderEventCalendar(); break;
      case 'mi_cb_review':  content = renderCBReview(); break;
      case 'mi_research_builder': content = renderPlaceholder('Research Builder', 'Ferramenta de criação de research proprietário com blocos de dados automáticos. Em desenvolvimento.'); break;

      // === Securities ===
      case 'sec_equity':    content = renderSecSearch(); break;
      case 'sec_debt':      content = renderPlaceholder('Debt Analysis', 'Análise de títulos de dívida pública e corporativa com curvas de juros, duration e spreads. Em desenvolvimento.'); break;
      case 'sec_credit':    content = renderPlaceholder('Private Credit Analysis', 'Análise de CRIs, CRAs, debêntures e crédito privado com rating, inadimplência e indexadores. Em desenvolvimento.'); break;

      // === Asset Management ===
      case 'am_funds':      content = state._backoffice_fund ? renderFundBackoffice(state._backoffice_fund) : renderFundsList(); break;
      case 'am_risk':       content = renderRiskAnalysis(); break;
      case 'am_comite':     content = renderComite(); break;
      case 'am_product':    content = renderProductAnalysis(); break;
      case 'am_assets_analysis': content = renderAssetsAnalysis(); break;
      case 'am_credit_port': content = renderCreditPortfolio(); break;
      case 'am_realestate_port': content = renderRealEstatePortfolio(); break;
      case 'am_equity_port': content = renderEquityPortfolio(); break;
      case 'am_new':        if (!state._fund_edit) state._fund_edit = emptyFund(); content = renderFundForm(); break;
      case 'am_edit':       content = renderFundForm(); break;

      // === Global Strategy ===
      case 'str_hub':      content = renderStrHub(); break;
      case 'str_models':   content = renderPortfoliosGrid('model',    'Model Portfolios',    'Portfólios modelo com alocação sugerida.'); break;
      case 'str_thematic': content = renderPortfoliosGrid('thematic', 'Thematic Portfolios', 'Portfólios temáticos estruturais.'); break;
      case 'str_scenery':  content = renderPortfoliosGrid('scenery',  'Scenery Portfolios',  'Portfólios táticos por cenário macro.'); break;

      default:             content = renderIntHub();
    }
  }
  layout.appendChild(content);
  app.appendChild(layout);

  if (state.modal === 'upload') document.body.appendChild(renderUploadModal());
  if (state.modal === 'settings') document.body.appendChild(renderSettingsModal());
}

// Expose for error boundary buttons
window.state = state;
window.render = render;

// Boot code is in index.html (after all scripts load)
// ====== intelligence.js ======


/* ---------- 8. HEADER & SIDEBAR ---------- */

const NAV_SECTIONS = {
  intelligence: {
    label: 'Global Intelligence',
    items: [
      { id: 'int_hub',      label: 'Hub',                   num: '01' },
      { id: 'int_macro',    label: 'Macro View',            num: '02' },
      { id: 'int_assets',   label: 'Assets View',           num: '03' },
      { id: 'int_micro',    label: 'MicroAssets View',      num: '04' },
      { id: 'int_thematic', label: 'Thematic View',         num: '05' },
      { id: 'int_report',   label: 'Report Builder',        num: '06' },
      { id: 'int_data',     label: 'Data / Reports',        num: '07' },
    ]
  },
  macrointel: {
    label: 'Macro Intelligence',
    items: [
      { id: 'mi_dashboard',   label: 'Dashboard',             num: '01' },
      { id: 'mi_brasil',      label: 'Brasil',                num: '02' },
      { id: 'mi_us',          label: 'Estados Unidos',        num: '03' },
      { id: 'mi_analysis',    label: 'Global Analysis',       num: '04' },
      { id: 'mi_calendar',    label: 'Event Calendar',        num: '05' },
      { id: 'mi_research_builder', label: 'Research Builder',  num: '06' },
    ]
  },
  securities: {
    label: 'Securities',
    items: [
      { id: 'sec_equity',    label: 'Equity Analysis',       num: '01' },
      { id: 'sec_debt',      label: 'Debt Analysis',         num: '02' },
      { id: 'sec_credit',    label: 'Private Credit Analysis',num: '03' },
    ]
  },
  assetmgmt: {
    label: 'Asset Management',
    items: [
      { id: 'am_funds',       label: 'Fundos',                num: '01' },
      { id: 'am_risk',        label: 'Risk Analysis',         num: '02' },
      { id: 'am_comite',      label: 'Comitê / Trading',      num: '03' },
      { id: 'am_product',     label: 'Product Analysis',      num: '04' },
      { id: 'am_assets_analysis', label: 'Assets Analysis',   num: '05' },
      { id: 'am_credit_port', label: 'Credit Portfolio',      num: '06' },
      { id: 'am_realestate_port', label: 'Real Estate Portfolio', num: '07' },
      { id: 'am_equity_port', label: 'Equity Portfolio',      num: '08' },
      { id: 'am_new',         label: '+ Novo Fundo',          num: '09' },
    ]
  },
  strategy: {
    label: 'Global Strategy',
    items: [
      { id: 'str_hub',      label: 'Hub — Recent Shifts',   num: '01' },
      { id: 'str_models',   label: 'Model Portfolios',      num: '02' },
      { id: 'str_thematic', label: 'Thematic Portfolios',   num: '03' },
      { id: 'str_scenery',  label: 'Scenery Portfolios',    num: '04' },
    ]
  }
};

function renderHeader() {
  const activeSection = state.view.startsWith('int_') ? 'intelligence' : state.view.startsWith('mi_') ? 'macrointel' : state.view.startsWith('sec_') ? 'securities' : state.view.startsWith('am_') ? 'assetmgmt' : 'strategy';
  return h('header', { class: 'header' }, [
    h('div', { style: { display: 'flex', alignItems: 'center' } }, [
      h('div', { class: 'logo' }, [
        h('div', { class: 'logo-mark' }, 'Æ'),
        h('div', { class: 'logo-text', html: 'Aegir<span class="dot">·</span>Intel' }),
        h('div', { class: 'logo-badge' }, 'standalone · v1'),
      ]),
      h('nav', { class: 'nav-main' }, Object.entries(NAV_SECTIONS).map(([key, s]) =>
        h('button', {
          class: activeSection === key ? 'active' : '',
          onClick: () => setView(s.items[0].id),
        }, s.label)
      )),
    ]),
    h('div', { class: 'header-actions' }, [
      h('button', { class: 'btn-ingest', onClick: () => setModal('upload') }, [
        h('span', {}, '↑'), h('span', {}, 'Ingest PDF'),
      ]),
      h('button', { class: 'btn-settings', onClick: () => setModal('settings'), title: 'API Key' }, '⚙'),
    ]),
  ]);
}

function renderSidebar() {
  const activeSection = state.view.startsWith('int_') ? 'intelligence' : state.view.startsWith('mi_') ? 'macrointel' : state.view.startsWith('sec_') ? 'securities' : state.view.startsWith('am_') ? 'assetmgmt' : 'strategy';
  const section = NAV_SECTIONS[activeSection];
  const reportCount = DB.reports.length;
  const viewCount = DB.views.length;
  const lastReport = DB.reports[DB.reports.length - 1];

  return h('aside', { class: 'sidebar' }, [
    h('div', { class: 'sidebar-section' }, [
      h('div', { class: 'sidebar-label' }, section.label),
      h('div', { class: 'sidebar-nav' }, section.items.map(item =>
        h('button', {
          class: state.view === item.id ? 'active' : '',
          onClick: () => setView(item.id),
        }, [
          h('span', { class: 'num' }, item.num),
          h('span', {}, item.label),
        ])
      )),
    ]),
    h('div', { class: 'sidebar-section' }, [
      h('div', { class: 'sidebar-label' }, 'Coverage'),
      h('div', { class: 'sidebar-stats' }, [
        h('div', { class: 'stat-row' }, [
          h('span', {}, 'Core Managers'), h('span', { class: 'v' }, String(getCoreManagers().length)),
        ]),
        h('div', { class: 'stat-row' }, [
          h('span', {}, 'Reports ingested'), h('span', { class: 'v' }, String(reportCount)),
        ]),
        h('div', { class: 'stat-row' }, [
          h('span', {}, 'Views extracted'), h('span', { class: 'v' }, String(viewCount)),
        ]),
        lastReport && h('div', { class: 'stat-row' }, [
          h('span', {}, 'Last update'),
          h('span', { class: 'v' }, lastReport.ingested_at.split('T')[0]),
        ]),
      ]),
    ]),
    h('div', { class: 'sidebar-section' }, [
      h('div', { class: 'sidebar-label' }, 'Managers'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } }, getCoreManagers().map(m =>
        h('div', {
          class: 'mono',
          style: {
            fontSize: '9px', padding: '2px 6px',
            border: '1px solid var(--border)', color: 'var(--text-muted)',
          },
          title: `${m.name} · ${m.aum}`,
        }, m.short)
      )),
    ]),
  ]);
}

/* ---------- 9. VIEWS ---------- */

function renderIntHub() {
  const viewCount = DB.views.length;

  // KPIs
  const totalConsensus = [...ALL_SLUGS].map(slug => ({ slug, c: computeConsensus(slug) })).filter(x => x.c);
  const highestConv = totalConsensus.sort((a, b) => b.c.conviction - a.c.conviction).slice(0, 3);
  const changes = getRecentChanges(30);
  const upgrades = changes.filter(c => c.direction === 'upgrade').length;
  const downgrades = changes.filter(c => c.direction === 'downgrade').length;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Global Intelligence · Hub',
      'Global Intelligence <em>Hub</em>',
      viewCount > 0
        ? `Leitura consolidada · <span class="hi">${getCoreManagers().length} gestoras core</span> · <span class="mono-hi">${DB.reports.length}</span> relatórios · <span class="mono-hi">${viewCount}</span> views`
        : 'Ingira relatórios de gestoras para ativar o hub. Comece em Data / Reports → Upload.'),

    viewCount > 0 && h('div', { class: 'kpi-strip' }, [
      renderKPI('Views', String(viewCount), `${DB.reports.length} relatórios`),
      renderKPI('Maior Convicção',
        highestConv[0] ? SLUG_META[highestConv[0].slug]?.name || '—' : '—',
        highestConv[0] ? `${Math.round(highestConv[0].c.conviction*100)}% · ${highestConv[0].c.count} gest.` : ''),
      renderKPI('Upgrades (30d)', String(upgrades), 'mudanças positivas'),
      renderKPI('Downgrades (30d)', String(downgrades), 'mudanças negativas'),
    ]),

    // Row 1: Market Monitor
    renderMarketMonitor(),

    // Row 2: Week Brief (inline, compact)
    renderWeekBriefInline(),

    // Row 3: Heatmap + Recent Shifts (side by side)
    viewCount > 0 && h('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '28px' } }, [
      h('div', {}, [
        sectionHead('02', 'Heatmap de Consenso', 'Core managers × mercados e ativos'),
        h('div', { class: 'card' }, [renderHeatmap()]),
      ]),
      h('div', {}, [
        sectionHead('03', 'Mudanças Recentes', 'Últimos 30 dias'),
        renderRecentChangesList(changes.slice(0, 10)),
      ]),
    ]),

    // Row 4: Calendar + Latest Researches (side by side)
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' } }, [
      renderHubWeekCalendar(),
      renderHubLatestResearches(),
    ]),

    // Row 5: Market News
    renderHubMarketNews(),
  ]);
}

/* ---------- Week Brief (inline, compact version) ---------- */

function renderWeekBriefInline() {
  const brief = DB.morningBrief;
  const loading = state._brief_loading;
  const isStale = brief && (Date.now() - new Date(brief.generated_at).getTime()) > 7 * 24 * 60 * 60 * 1000;

  return h('div', { style: { marginBottom: '28px' } }, [
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } }, [
      sectionHead('01', 'Week Brief', 'Síntese editorial semanal via Gemini'),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
        brief && h('span', { class: 'mono', style: { fontSize: '9px', color: isStale ? 'var(--red)' : 'var(--text-faint)' } },
          `${new Date(brief.generated_at).toLocaleDateString('pt-BR')}${isStale ? ' · desatualizado' : ''}`),
        h('button', {
          class: 'btn-secondary', style: { fontSize: '10px' },
          disabled: loading ? 'disabled' : null,
          onClick: () => { if (!loading) generateMorningBrief(); },
        }, loading ? 'Gerando…' : (brief ? '↻ Regenerar' : '✨ Gerar Week Brief')),
      ]),
    ]),

    brief ? h('div', { class: 'card', style: { padding: '20px 24px' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px', marginBottom: '10px', lineHeight: '1.3' } }, brief.headline || 'Week Brief'),
      brief.sections && h('div', {}, [
        brief.sections.whats_new && h('div', { style: { fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '12px' } }, brief.sections.whats_new),
        brief.sections.implications && h('div', { style: { fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.6', paddingTop: '10px', borderTop: '1px solid var(--border)' } }, [
          h('strong', { style: { color: 'var(--amber)' } }, 'Implicações: '),
          brief.sections.implications,
        ]),
      ]),
      !brief.sections && brief.content && h('div', { style: { fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7' } }, brief.content?.substring(0, 600) + (brief.content?.length > 600 ? '…' : '')),
    ]) : h('div', { class: 'card', style: { padding: '24px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '13px' } },
      loading ? 'Gerando Week Brief…' : 'Clique em "Gerar Week Brief" para criar uma síntese semanal com base nos dados carregados.'),
  ]);
}

/* ---------- Hub: Weekly Calendar (from Finnhub eco calendar) ---------- */

function renderHubWeekCalendar() {
  const calData = state._eco_cal;

  // Trigger load if needed
  if (!calData && !state._eco_cal_loading) {
    state._eco_cal_loading = true;
    if (typeof fetchEconomicCalendar === 'function') {
      fetchEconomicCalendar().then(d => { state._eco_cal = d; state._eco_cal_loading = false; render(); })
        .catch(() => { state._eco_cal_loading = false; render(); });
    } else {
      state._eco_cal_loading = false;
    }
  }

  const today = new Date();
  const endOfWeek = new Date(today.getTime() + 7 * 86400000);
  const todayStr = today.toISOString().split('T')[0];
  const endStr = endOfWeek.toISOString().split('T')[0];

  const TRACKED = ['US', 'BR', 'EU', 'GB', 'CN', 'JP'];
  const weekEvents = (calData || [])
    .filter(ev => {
      const d = (ev.time || ev.date || '').substring(0, 10);
      return d >= todayStr && d <= endStr && ((ev.impact || 0) >= 2 || TRACKED.includes(ev.country));
    })
    .sort((a, b) => (a.time || a.date || '').localeCompare(b.time || b.date || ''))
    .slice(0, 12);

  return h('div', {}, [
    sectionHead('04', 'Calendário da Semana', 'Eventos macro dos próximos 7 dias'),
    h('div', { class: 'card', style: { padding: weekEvents.length > 0 ? '0' : '20px' } },
      weekEvents.length === 0
        ? [h('div', { style: { textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px', padding: '16px' } },
            !DB.settings.finnhub_api_key ? 'Configure Finnhub API key em Settings para ativar.' : (state._eco_cal_loading ? 'Carregando…' : 'Sem eventos na semana.'))]
        : weekEvents.map((ev, i) => {
            const d = (ev.time || ev.date || '').substring(0, 10);
            const time = (ev.time || '').substring(11, 16);
            const isToday = d === todayStr;
            return h('div', {
              style: { display: 'grid', gridTemplateColumns: '70px 30px 1fr 70px', gap: '8px', padding: '8px 14px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: '12px', alignItems: 'center', background: isToday ? 'rgba(184,134,60,0.05)' : 'transparent' },
            }, [
              h('span', { class: 'mono', style: { fontSize: '10px', color: isToday ? 'var(--amber)' : 'var(--text-faint)' } },
                isToday ? 'HOJE ' + time : d.substring(5) + ' ' + time),
              h('span', { class: 'mono', style: { fontSize: '10px', fontWeight: '600' } }, ev.country || ''),
              h('span', { style: { fontFamily: 'Fraunces, serif', fontSize: '12px' } }, ev.event || ev.indicator || ''),
              h('span', { class: 'mono', style: { textAlign: 'right', fontSize: '10px', color: ev.actual ? 'var(--text)' : 'var(--text-faint)' } },
                ev.actual ? `${ev.actual}` : (ev.estimate ? `est: ${ev.estimate}` : '—')),
            ]);
          })
    ),
  ]);
}

/* ---------- Hub: Latest Researches ---------- */

function renderHubLatestResearches() {
  const researches = (Array.isArray(DB.research) ? DB.research : [])
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
    .slice(0, 5);

  const reports = (DB.reports || [])
    .sort((a, b) => (b.publication_date || '').localeCompare(a.publication_date || ''))
    .slice(0, 5);

  return h('div', {}, [
    sectionHead('05', 'Últimos Relatórios', 'Últimos 5 relatórios ingeridos e researches criados'),
    h('div', { class: 'card', style: { padding: (reports.length + researches.length) > 0 ? '0' : '20px' } },
      (reports.length + researches.length) === 0
        ? [h('div', { style: { textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px', padding: '16px' } }, 'Nenhum relatório ingerido ainda.')]
        : [
            ...reports.map((r, i) => {
              const mgr = getManagerBySlug(r.manager_slug);
              return h('div', {
                style: { display: 'grid', gridTemplateColumns: '60px 1fr 80px', gap: '10px', padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: '12px', alignItems: 'center' },
              }, [
                h('span', { class: 'mono', style: { fontSize: '10px', fontWeight: '600', color: 'var(--amber)' } }, mgr?.short || r.manager_slug),
                h('span', { style: { fontFamily: 'Fraunces, serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.title || 'Sem título'),
                h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', textAlign: 'right' } }, r.publication_date || ''),
              ]);
            }),
            researches.length > 0 && reports.length > 0 && h('div', { style: { padding: '6px 14px', background: 'var(--bg-3)', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em' } }, 'Research Proprietário'),
            ...researches.map((r, i) => h('div', {
              style: { display: 'grid', gridTemplateColumns: '60px 1fr 80px', gap: '10px', padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: '12px', alignItems: 'center', cursor: 'pointer' },
              onClick: () => { state._active_research = r.id; setView('am_research'); },
            }, [
              h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--blue)' } }, r.status === 'final' ? 'FINAL' : 'DRAFT'),
              h('span', { style: { fontFamily: 'Fraunces, serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.title || 'Sem título'),
              h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', textAlign: 'right' } }, new Date(r.updated_at).toLocaleDateString('pt-BR')),
            ])),
          ].filter(Boolean)
    ),
  ]);
}

/* ---------- Hub: Market News (Finnhub) ---------- */

function renderHubMarketNews() {
  const news = state._hub_news;
  const loading = state._hub_news_loading;

  // Trigger load
  if (!news && !loading && DB.settings.finnhub_api_key) {
    state._hub_news_loading = true;
    fetchMarketNews().then(d => { state._hub_news = d; state._hub_news_loading = false; render(); })
      .catch(() => { state._hub_news_loading = false; render(); });
  }

  if (!DB.settings.finnhub_api_key) return null;

  return h('div', { style: { marginBottom: '28px' } }, [
    sectionHead('06', 'Market News', 'Últimas notícias de mercado via Finnhub'),
    loading && !news && h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)', padding: '16px 0' } }, 'Carregando notícias…'),
    news && news.length > 0 && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' } },
      news.slice(0, 9).map(item => h('a', {
        href: item.url, target: '_blank',
        class: 'card card-hover',
        style: { textDecoration: 'none', display: 'block', padding: '14px 16px' },
      }, [
        h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' } },
          `${item.source || ''} · ${item.category || ''} · ${item.datetime ? new Date(item.datetime * 1000).toLocaleDateString('pt-BR') : ''}`),
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px', lineHeight: '1.4', marginBottom: '6px', color: 'var(--text)' } }, item.headline || ''),
        h('div', { style: { fontSize: '11px', color: 'var(--text-faint)', lineHeight: '1.4', maxHeight: '36px', overflow: 'hidden' } }, item.summary?.substring(0, 120) || ''),
      ]))
    ),
  ]);
}

async function fetchMarketNews() {
  // Cache 30 min
  if (state._hub_news_cache && (Date.now() - state._hub_news_cache.ts) < 30 * 60 * 1000) return state._hub_news_cache.data;

  const token = DB.settings.finnhub_api_key;
  if (!token) return [];
  try {
    const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${token}`);
    if (!res.ok) return [];
    const data = await res.json();
    state._hub_news_cache = { ts: Date.now(), data: data };
    return data;
  } catch { return []; }
}

function renderKPI(label, value, sub) {
  return h('div', { class: 'kpi' }, [
    h('div', { class: 'kpi-label' }, label),
    h('div', { class: 'kpi-value' }, value),
    h('div', { class: 'kpi-sub' }, sub),
  ]);
}

function renderHeatmap() {
  // Columns: mix of macro + key assets + Brasil + thematic
  const cols = [
    { slug:'us',             label:'US'     }, { slug:'europe',         label:'EU' },
    { slug:'brazil',         label:'BR'     }, { slug:'china',          label:'CN' },
    { slug:'us_equities',    label:'US Eq'  }, { slug:'us_ig',          label:'IG' },
    { slug:'brazil_equities',label:'BR Eq'  }, { slug:'brazil_re',      label:'BR RE' },
    { slug:'gold',           label:'Gold'   }, { slug:'ai',             label:'AI' },
  ];
  const latest = getLatestViews();
  // Build manager × col lookup: latest.manager_slug::col.slug
  const getCell = (mgr, slug) => {
    const key = `${mgr}::${slug}`;
    return latest[key]?.stance || null;
  };

  return h('div', { class: 'heatmap' }, [
    h('table', {}, [
      h('thead', {}, [
        h('tr', {}, [
          h('th', {}),
          ...cols.map(c => h('th', {}, c.label)),
        ]),
      ]),
      h('tbody', {}, getCoreManagers().map(m =>
        h('tr', {}, [
          h('td', {}, m.short),
          ...cols.map(c => {
            const s = getCell(m.slug, c.slug);
            if (!s) return h('td', {}, h('div', { class: 'heat-cell', style: { color: 'var(--border-2)' } }, '—'));
            const meta = STANCE_META[s];
            return h('td', {}, h('div', {
              class: 'heat-cell',
              style: {
                background: meta.color + '26', color: meta.color,
                border: `1px solid ${meta.color}44`,
              }
            }, s));
          }),
        ])
      )),
    ]),
  ]);
}

function renderRecentChangesList(changes) {
  if (!changes.length) {
    return h('div', { class: 'card', style: { textAlign: 'center', color: 'var(--text-faint)', padding: '40px' } },
      'Sem mudanças nos últimos 30 dias');
  }
  return h('div', { class: 'changes' }, changes.map(c => {
    const mgr = MANAGER_BY_SLUG[c.manager_slug];
    const tax = SLUG_META[c.taxonomy_slug];
    return h('div', {
      class: 'change-row',
      style: { gridTemplateColumns: '70px 1fr 110px' },
      onClick: () => setDetail(tax.kind, c.taxonomy_slug),
    }, [
      h('div', {}, [
        h('div', { class: 'change-manager' }, mgr?.short || c.manager_slug),
        h('div', { class: 'change-date' }, c.date.slice(5)),
      ]),
      h('div', {}, [
        h('div', { class: 'change-target' }, tax?.name || c.taxonomy_slug),
      ]),
      h('div', { class: 'change-arrow' }, [
        c.from ? stanceBadge(c.from, 'xs') : h('span', { class: 'stance-empty' }, 'new'),
        h('span', { style: { color: 'var(--text-faint)' } }, '→'),
        stanceBadge(c.to, 'xs'),
      ]),
    ]);
  }));
}

function renderGrid(kind, title, subtitle) {
  const items = TAXONOMY[kind];
  const hasRegions = items.some(i => i.region);
  const activeRegion = state._grid_region?.[kind] || 'all';
  const [filter, setFilter] = (() => {
    return [state._filter || 'all', (f) => { state._filter = f; render(); }];
  })();

  const filteredItems = items.map(item => {
    const c = computeConsensus(item.slug);
    // Count recent views (since last visit)
    const refDate = getReferenceDate();
    const recentViews = (DB.views || []).filter(v =>
      v.taxonomy_slug === item.slug &&
      new Date(v.ingested_at || v.publication_date || 0).getTime() >= new Date(refDate).getTime()
    );
    return { ...item, consensus: c, recentCount: recentViews.length };
  });

  // Apply region filter
  let visible = activeRegion === 'all'
    ? filteredItems
    : filteredItems.filter(i => (i.region || 'global') === activeRegion);

  // Apply stance filter
  if (filter !== 'all') {
    visible = visible.filter(i => i.consensus?.stance === filter);
  }

  // Sort: items with recent views first, then by weighted score desc
  visible.sort((a, b) => {
    if (a.recentCount !== b.recentCount) return b.recentCount - a.recentCount;
    const wa = a.consensus?.weighted || 0, wb = b.consensus?.weighted || 0;
    return wb - wa;
  });

  // Build region tabs if applicable
  const regionTabs = hasRegions ? buildRegionTabs(kind, items, activeRegion) : null;

  return h('div', { class: 'content fade-up' }, [
    h('div', { class: 'page-flex' }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, `Global Intelligence · ${title}`),
        h('h1', { class: 'page-title' }, title),
        h('p', { class: 'page-desc' }, subtitle),
      ]),
      h('div', { class: 'filter-bar' }, [
        h('span', { class: 'filter-label' }, 'STANCE:'),
        ...['all','OW','MOW','N','MUW','UW'].map(f =>
          h('button', {
            class: `filter-btn ${filter === f ? 'active' : ''}`,
            onClick: () => setFilter(f),
          }, f === 'all' ? 'ALL' : f)
        ),
      ]),
    ]),

    regionTabs,

    visible.length === 0
      ? emptyState()
      : h('div', { class: 'grid-3' }, visible.map(item => renderCard(item, kind))),
  ]);
}

function buildRegionTabs(kind, items, activeRegion) {
  // Count items per region
  const regions = {};
  for (const item of items) {
    const r = item.region || 'global';
    if (!regions[r]) regions[r] = 0;
    regions[r]++;
  }

  const regionOrder = Object.entries(ASSET_REGIONS)
    .sort((a, b) => a[1].order - b[1].order)
    .filter(([key]) => regions[key]);

  return h('div', { class: 'sec-tab-row', style: { marginBottom: '20px' } }, [
    h('button', {
      class: 'sec-tab' + (activeRegion === 'all' ? ' active' : ''),
      onClick: () => { if (!state._grid_region) state._grid_region = {}; state._grid_region[kind] = 'all'; render(); },
    }, `Todos (${items.length})`),
    ...regionOrder.map(([key, meta]) =>
      h('button', {
        class: 'sec-tab' + (activeRegion === key ? ' active' : ''),
        onClick: () => { if (!state._grid_region) state._grid_region = {}; state._grid_region[kind] = key; render(); },
      }, `${meta.flag} ${meta.label} (${regions[key]})`)
    ),
  ]);
}

function renderCard(item, kind) {
  const c = item.consensus;
  const hasData = c !== null;
  const isNew = item.recentCount > 0;

  return h('button', {
    class: 'card card-hover',
    onClick: () => setDetail(kind, item.slug),
    style: { textAlign: 'left', display: 'block', width: '100%', position: 'relative' },
  }, [
    // "NEW" badge if recent views exist
    isNew && h('div', {
      style: {
        position: 'absolute', top: '8px', right: '8px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
        padding: '2px 6px', background: 'var(--amber)', color: 'var(--bg)',
        letterSpacing: '0.15em', textTransform: 'uppercase',
      },
    }, `${item.recentCount} novo${item.recentCount > 1 ? 's' : ''}`),

    h('div', { class: 'card-header' }, [
      h('div', { class: 'card-title-group' }, [
        item.flag && h('span', { class: 'card-flag' }, item.flag),
        h('div', {}, [
          h('div', { class: 'card-title' }, item.name),
          h('div', { class: 'card-sub' }, [
            item.slug,
            item.region && h('span', { style: { marginLeft: '8px', color: 'var(--text-faint)' } },
              ASSET_REGIONS[item.region]?.flag || ''),
          ]),
        ]),
      ]),
      stanceBadge(c?.stance, 'sm'),
    ]),
    h('div', { class: 'card-stats' }, [
      h('div', {}, [
        h('div', { class: 'stat-label' }, 'Conviction'),
        hasData ? convBar(c.conviction) : h('div', { class: 'stat-value', style: { color: 'var(--text-faint)' } }, '—'),
      ]),
      h('div', {}, [
        h('div', { class: 'stat-label' }, 'Gestoras'),
        h('div', { class: 'stat-value' }, hasData ? `${c.count}/${getCoreManagers().length}` : '—'),
      ]),
    ]),
    h('div', { class: 'card-footer' }, [
      h('div', { class: 'stat-label' }, 'Weighted'),
      h('div', { class: 'coverage-badge' }, hasData ? (c.weighted > 0 ? `+${c.weighted}` : String(c.weighted)) : '—'),
    ]),
  ]);
}

/* ---------- Detail pane ---------- */

function renderDetail() {
  const { kind, slug } = state.detail;

  // Security detail is a completely separate render path
  if (kind === 'security') return renderSecurityDetail();
  // Fund detail (Asset Management)
  if (kind === 'fund') return renderFundDetail();
  // Central Bank Minute detail
  if (kind === 'cbminute') return renderCBMinuteDetail();

  const item = SLUG_META[slug];
  // Get ALL views (core + secondary)
  const allViews = Object.values(getLatestViews(slug));
  const c = computeConsensus(slug); // core-only consensus

  // Sort views: most recent first
  const sortedViews = [...allViews].sort((a, b) =>
    new Date(b.publication_date || b.ingested_at || 0) - new Date(a.publication_date || a.ingested_at || 0)
  );

  // 6-month filter: only show views from last 6 months in listing
  // Older views still impact the evolution chart
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsStr = sixMonthsAgo.toISOString().split('T')[0];
  const recentViews = sortedViews.filter(v => (v.publication_date || v.ingested_at || '') >= sixMonthsStr);
  const olderCount = sortedViews.length - recentViews.length;

  // Detect which are "new since last visit"
  const refDate = getReferenceDate();
  const refTs = new Date(refDate).getTime();

  // For macro (country) detail, render enhanced mini-dashboard
  if (kind === 'macro') return renderCountryDetail(item, sortedViews, c, refTs);

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: clearDetail }, [
      h('span', {}, '←'), h('span', {}, 'Voltar'),
    ]),

    h('div', { class: 'detail-head' }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, `${kind.toUpperCase()} · Detail`),
        h('div', { class: 'detail-title-row' }, [
          item.flag && h('span', { class: 'detail-flag' }, item.flag),
          h('h1', { class: 'detail-title' }, item.name),
        ]),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' } }, [
          c && stanceBadge(c.stance, 'lg'),
          c && h('span', { class: 'detail-meta-text' }, `Consenso core · ${Math.round(c.conviction*100)}% convicção · ${c.count} gestoras`),
          item.region && h('span', { class: 'badge' }, ASSET_REGIONS[item.region]?.label || item.region),
          item.color && h('span', { style: { width: '12px', height: '12px', borderRadius: '50%', background: item.color, display: 'inline-block', verticalAlign: 'middle' } }),
        ]),
      ]),
    ]),

    sortedViews.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Sem visões extraídas'),
          h('p', { class: 'empty-desc' }, `Nenhum relatório ingerido mencionou ${item.name}. Ingira relatórios que discutam este tópico.`),
        ])
      : h('div', {}, [
          h('div', { style: { marginBottom: '32px' } }, [
            sectionHead('01', 'Distribuição de Visões', `${recentViews.length} gestoras (últimos 6m)${olderCount > 0 ? ` · ${olderCount} visão(ões) mais antiga(s) omitida(s)` : ''}`),
            h('div', { class: 'card' }, [renderConsensusSpread(recentViews)]),
          ]),

          h('div', { style: { marginBottom: '32px' } }, [
            sectionHead('02', 'Visão por Gestora', 'Últimos 6 meses · ordenado por data'),
            h('div', {}, recentViews.map(v => renderViewRow(v, refTs))),
            olderCount > 0 && h('div', { style: { padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic', borderTop: '1px dashed var(--border)', marginTop: '8px' } },
              `${olderCount} visão(ões) com mais de 6 meses omitida(s). Impactam apenas o gráfico de evolução abaixo.`),
          ]),

          renderStanceHistory(slug),
        ]),
  ]);
}

/* ---------- Enhanced Country Detail (mini-dashboard) ---------- */

function renderCountryDetail(item, views, consensus, refTs) {
  // 6-month filter for listing (evolution chart uses all data)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsStr = sixMonthsAgo.toISOString().split('T')[0];
  const recentViews = views.filter(v => (v.publication_date || v.ingested_at || '') >= sixMonthsStr);
  const olderCount = views.length - recentViews.length;
  // Find asset classes related to this country
  const countryAssetMap = {
    us:      ['us_equities', 'us_govt', 'us_ig', 'us_hy'],
    europe:  ['dm_ex_us_equities', 'eu_govt', 'eu_ig'],
    uk:      ['dm_ex_us_equities'],
    japan:   ['dm_ex_us_equities'],
    china:   ['em_equities', 'em_debt'],
    india:   ['em_equities', 'em_debt'],
    brazil:  ['brazil_equities', 'brazil_fi', 'brazil_re', 'brazil_credit', 'em_equities', 'em_debt'],
    emerging:['em_equities', 'em_debt'],
  };
  const relatedSlugs = countryAssetMap[item.slug] || [];
  const relatedAssets = relatedSlugs.map(s => ({
    item: SLUG_META[s],
    consensus: computeConsensus(s),
  })).filter(r => r.item);

  // Find micro classes for this country
  const countryMicroMap = {
    us:     ['us_small_caps', 'us_reits', 'us_tips', 'us_muni', 'value_factor', 'quality_factor', 'leveraged_loans'],
    europe: ['eu_small_caps', 'eu_reits'],
    brazil: ['brazil_small_caps', 'brazil_fiis', 'brazil_cri_cra', 'brazil_debentures'],
  };
  const relatedMicro = (countryMicroMap[item.slug] || []).map(s => ({
    item: SLUG_META[s],
    consensus: computeConsensus(s),
  })).filter(r => r.item);

  // Latest CB minute for this country
  const cbBank = item.slug === 'brazil' ? 'copom' : item.slug === 'us' ? 'fomc' : null;
  const latestCB = cbBank ? getLatestCBMinute(cbBank) : null;

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: clearDetail }, [
      h('span', {}, '←'), h('span', {}, 'Voltar'),
    ]),

    // Header
    h('div', { class: 'detail-head' }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, 'MACRO · Country Dashboard'),
        h('div', { class: 'detail-title-row' }, [
          h('span', { class: 'detail-flag' }, item.flag),
          h('h1', { class: 'detail-title' }, item.name),
        ]),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' } }, [
          consensus && stanceBadge(consensus.stance, 'lg'),
          consensus && h('span', { class: 'detail-meta-text' }, `Consenso macro · ${Math.round(consensus.conviction*100)}% convicção · ${consensus.count} gestoras core`),
        ]),
      ]),
    ]),

    // Section 1: Classes de ativo neste país
    relatedAssets.length > 0 && h('div', { style: { marginBottom: '32px' } }, [
      sectionHead('01', `Classes de Ativos — ${item.name}`, 'Stance do consenso nas classes de ativo relevantes para este país'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' } },
        relatedAssets.map(ra => h('div', {
          class: 'card card-hover',
          style: { padding: '14px 16px', cursor: 'pointer' },
          onClick: () => setDetail('asset', ra.item.slug),
        }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } }, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, ra.item.name),
            stanceBadge(ra.consensus?.stance, 'xs'),
          ]),
          ra.consensus && h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-faint)' } },
            `${ra.consensus.count} gestoras · conv. ${Math.round(ra.consensus.conviction * 100)}%`),
        ]))
      ),
    ]),

    // Section 2: Sub-classes / Micro
    relatedMicro.length > 0 && h('div', { style: { marginBottom: '32px' } }, [
      sectionHead('02', `Sub-classes & Fatores — ${item.name}`, 'Micro-assets e fatores específicos deste mercado'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' } },
        relatedMicro.map(rm => h('div', {
          class: 'card card-hover',
          style: { padding: '14px 16px', cursor: 'pointer' },
          onClick: () => setDetail('micro', rm.item.slug),
        }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } }, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, rm.item.name),
            stanceBadge(rm.consensus?.stance, 'xs'),
          ]),
          rm.consensus && h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-faint)' } },
            `${rm.consensus.count} gestoras · conv. ${Math.round(rm.consensus.conviction * 100)}%`),
        ]))
      ),
    ]),

    // Section 3: Latest central bank decision (if applicable)
    latestCB && h('div', { style: { marginBottom: '32px' } }, [
      sectionHead('03', `Último ${CB_BANKS[cbBank].label}`, 'Decisão de juros mais recente ingerida'),
      h('div', { onClick: () => setDetail('cbminute', latestCB.id), style: { cursor: 'pointer' } }, [
        renderCBWidget(cbBank, latestCB),
      ]),
    ]),

    // Section 4: Distribution & consensus (recent 6m only)
    recentViews.length > 0 && h('div', { style: { marginBottom: '32px' } }, [
      sectionHead(latestCB ? '04' : '03', 'Distribuição de Visões Macro', `${recentViews.length} gestoras (últimos 6m)${olderCount > 0 ? ` · ${olderCount} omitida(s)` : ''}`),
      h('div', { class: 'card' }, [renderConsensusSpread(recentViews)]),
    ]),

    // Section 5: Views per manager (recent 6m, sorted by recency)
    recentViews.length > 0 && h('div', { style: { marginBottom: '32px' } }, [
      sectionHead(latestCB ? '05' : '04', 'Visão por Gestora', 'Últimos 6 meses · ordenado por data'),
      h('div', {}, recentViews.map(v => renderViewRow(v, refTs))),
      olderCount > 0 && h('div', { style: { padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic', borderTop: '1px dashed var(--border)', marginTop: '8px' } },
        `${olderCount} visão(ões) com mais de 6 meses. Impactam apenas o gráfico de evolução.`),
    ]),

    // Section 6: Evolution chart
    views.length > 0 && renderStanceHistory(item.slug),

    // Empty state
    views.length === 0 && h('div', { class: 'empty' }, [
      h('div', { class: 'empty-title' }, 'Sem visões macro extraídas'),
      h('p', { class: 'empty-desc' }, `Nenhum relatório ingerido mencionou ${item.name}. Ingira relatórios que discutam este país/região.`),
    ]),
  ]);
}

function renderConsensusSpread(views) {
  const counts = { UW:0, MUW:0, N:0, MOW:0, OW:0 };
  views.forEach(v => counts[v.stance]++);
  const total = views.length;
  const order = ['UW','MUW','N','MOW','OW'];

  return h('div', {}, [
    h('div', { class: 'consensus-spread' }, order.map(k => {
      const w = (counts[k] / total) * 100;
      if (!w) return h('div', { style: { width: '0' } });
      const meta = STANCE_META[k];
      return h('div', {
        class: 'spread-seg',
        style: {
          width: `${w}%`,
          background: meta.color + '33',
          color: meta.color,
        },
      }, w >= 10 ? String(counts[k]) : '');
    })),
    h('div', {
      style: {
        display: 'flex', justifyContent: 'space-between',
        marginTop: '12px', fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px', color: 'var(--text-faint)',
      },
    }, [
      h('span', {}, 'UW ← → OW'),
      h('span', {}, `n = ${total}`),
    ]),
  ]);
}

function renderViewRow(v, refTs) {
  const mgr = getManagerBySlug(v.manager_slug) || MANAGER_BY_SLUG[v.manager_slug];
  const isSecondary = mgr?.type === 'secondary';
  const viewTs = new Date(v.ingested_at || v.publication_date || 0).getTime();
  const isNew = refTs && viewTs >= refTs;

  return h('div', { class: 'view-row', style: isNew ? { borderLeft: '3px solid var(--amber)', paddingLeft: '14px' } : {} }, [
    h('div', {}, [
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
        h('div', { class: 'view-manager' }, mgr?.name || v.manager_slug),
        isSecondary && h('span', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', padding: '1px 4px', border: '1px solid var(--border)', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' } }, 'sec.'),
        isNew && h('span', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', padding: '1px 4px', background: 'var(--amber)', color: 'var(--bg)', letterSpacing: '0.15em', textTransform: 'uppercase' } }, 'novo'),
      ]),
      h('div', { class: 'view-aum' }, `${mgr?.aum || ''} ${mgr?.aum ? 'AUM' : ''}`),
    ]),
    h('div', {}, stanceBadge(v.stance, 'md')),
    h('div', {}, [
      h('div', { class: 'view-thesis' }, v.thesis_summary),
      v.catalysts?.length > 0 && h('div', { class: 'view-catalysts' }, [
        h('b', {}, 'CATALYSTS: '),
        v.catalysts.join(' · '),
      ]),
      v.risks?.length > 0 && h('div', { class: 'view-risks' }, [
        h('b', {}, 'RISKS: '),
        v.risks.join(' · '),
      ]),
      v.quote && h('div', {
        style: {
          marginTop: '10px', padding: '8px 12px', borderLeft: '2px solid var(--amber)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: '12px',
          color: 'var(--text-muted)',
        },
      }, `"${v.quote}" ${v.page_ref ? `(p.${v.page_ref})` : ''}`),
    ]),
    h('div', { class: 'view-date' }, v.publication_date),
  ]);
}

function renderStanceHistory(taxonomySlug) {
  const allMgrs = getAllManagers();
  const mgrsWithHistory = allMgrs.filter(m => getStanceHistory(m.slug, taxonomySlug).length >= 2);
  if (mgrsWithHistory.length === 0) return null;

  const w = 900, ht = 240, pad = { l: 55, r: 20, t: 25, b: 35 };
  const plotW = w - pad.l - pad.r, plotH = ht - pad.t - pad.b;

  // Collect all dates and convert to timestamps for proportional spacing
  const allDateStrings = [...new Set(DB.views
    .filter(v => v.taxonomy_slug === taxonomySlug)
    .map(v => v.publication_date)
  )].sort();

  if (allDateStrings.length < 2) return null;

  const allTimestamps = allDateStrings.map(d => new Date(d).getTime());
  const tMin = Math.min(...allTimestamps), tMax = Math.max(...allTimestamps);
  const tRange = tMax - tMin || 1;

  // Time-proportional X positioning
  const xForDate = (dateStr) => {
    const t = new Date(dateStr).getTime();
    return pad.l + ((t - tMin) / tRange) * plotW;
  };
  const yFor = (v) => pad.t + ((2 - v) / 4) * plotH;

  const colors = ['#d4a574', '#7a9b5c', '#c89b7a', '#7a8aa5', '#b85c5c', '#a57a9b', '#8a7a5c', '#5c9b9b', '#9b5c7a', '#5c7a9b'];

  // X-axis: max 8 evenly-spaced labels
  const maxLabels = Math.min(8, allDateStrings.length);
  const labelIndices = [];
  for (let i = 0; i < maxLabels; i++) {
    labelIndices.push(Math.round(i * (allDateStrings.length - 1) / Math.max(1, maxLabels - 1)));
  }
  const uniqueLabels = [...new Set(labelIndices)];

  const formatDateLabel = (d) => {
    const parts = d.split('-');
    if (parts.length >= 2) {
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const m = parseInt(parts[1]) - 1;
      return `${months[m] || parts[1]}/${parts[0].slice(2)}`;
    }
    return d.slice(5);
  };

  const svgContent = `
    ${[-2,-1,0,1,2].map(v => `
      <line x1="${pad.l}" x2="${w-pad.r}" y1="${yFor(v)}" y2="${yFor(v)}" stroke="#2a2621" stroke-dasharray="2 3"/>
      <text x="${pad.l-8}" y="${yFor(v)+4}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" fill="#6a6258">
        ${v===2?'OW':v===1?'MOW':v===0?'N':v===-1?'MUW':'UW'}
      </text>
    `).join('')}
    ${uniqueLabels.map(i => {
      const d = allDateStrings[i];
      return `<text x="${xForDate(d)}" y="${ht-8}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="#6a6258">${formatDateLabel(d)}</text>`;
    }).join('')}
    ${mgrsWithHistory.map((mgr, idx) => {
      const hist = getStanceHistory(mgr.slug, taxonomySlug);
      const color = colors[idx % colors.length];
      const pts = hist.map(v => `${xForDate(v.publication_date)},${yFor(STANCE_META[v.stance]?.value || 0)}`).join(' ');
      const circles = hist.map(v => `<circle cx="${xForDate(v.publication_date)}" cy="${yFor(STANCE_META[v.stance]?.value || 0)}" r="4" fill="${color}" opacity="0.9"><title>${mgr.short}: ${v.stance} (${v.publication_date})</title></circle>`).join('');
      return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" opacity="0.85"/>${circles}`;
    }).join('')}
  `;

  const legend = mgrsWithHistory.map((m, i) => {
    const color = colors[i % colors.length];
    const typeLabel = m.type === 'secondary' ? ' (sec.)' : '';
    return `<span style="display:inline-flex;align-items:center;gap:8px;margin-right:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted)"><span style="display:inline-block;width:14px;height:2px;background:${color}"></span>${m.name}${typeLabel}</span>`;
  }).join('');

  return h('div', { style: { marginTop: '32px' } }, [
    sectionHead('03', 'Evolução das Visões', 'Linha do tempo de stance por gestora — eixo X proporcional ao tempo'),
    h('div', { class: 'card' }, [
      h('svg', {
        viewBox: `0 0 ${w} ${ht}`,
        style: { width: '100%', maxWidth: '100%' },
        html: svgContent,
      }),
      h('div', { style: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '10px' }, html: legend }),
    ]),
  ]);
}

/* ---------- Strategy Hub ---------- */

function renderStrHub() {
  const changes = getRecentChanges(30);
  const changes90 = getRecentChanges(90);
  const upgrades = changes.filter(c => c.direction === 'upgrade').length;
  const downgrades = changes.filter(c => c.direction === 'downgrade').length;

  if (DB.views.length === 0) {
    return h('div', { class: 'content fade-up' }, [
      pageHead('Global Strategy · Hub',
        'Recent Shifts <em>& Signals</em>',
        'Feed cronológico de mudanças de visão entre as gestoras. Ingira relatórios de diferentes datas para ativar esta tela.'),
      emptyState(),
    ]);
  }

  return h('div', { class: 'content fade-up' }, [
    pageHead('Global Strategy · Hub',
      'Recent Shifts <em>& Signals</em>',
      `Feed cronológico de mudanças de visão. Detectadas automaticamente comparando relatórios sequenciais de cada gestora.`),

    h('div', { class: 'kpi-strip' }, [
      renderKPI('Upgrades (30d)', String(upgrades), 'mudanças positivas'),
      renderKPI('Downgrades (30d)', String(downgrades), 'mudanças negativas'),
      renderKPI('Total (30d)', String(changes.length), 'mudanças de stance'),
      renderKPI('Total (90d)', String(changes90.length), 'janela maior'),
    ]),

    sectionHead('01', 'Change Feed', 'Clique em qualquer linha para ver o detalhe completo'),
    changes.length === 0
      ? h('div', { class: 'empty', style: { padding: '40px' } }, [
          h('p', { class: 'empty-desc' }, 'Nenhuma mudança detectada nos últimos 30 dias.'),
        ])
      : h('div', { class: 'changes' }, changes.map(renderChangeFullRow)),
  ]);
}

function renderChangeFullRow(c) {
  const mgr = MANAGER_BY_SLUG[c.manager_slug];
  const tax = SLUG_META[c.taxonomy_slug];
  return h('div', {
    class: 'change-row',
    onClick: () => setDetail(tax.kind, c.taxonomy_slug),
  }, [
    h('div', {}, [
      h('div', { class: 'change-manager' }, mgr?.short || c.manager_slug),
      h('div', { class: 'change-date' }, c.date),
    ]),
    h('div', {}, [
      h('div', { class: 'change-target' }, tax?.name || c.taxonomy_slug),
      h('div', { class: 'change-note' }, c.note ? c.note.substring(0, 160) + (c.note.length > 160 ? '…' : '') : ''),
    ]),
    h('div', { class: 'change-arrow' }, [
      c.from ? stanceBadge(c.from, 'xs') : h('span', { class: 'stance-empty' }, 'new'),
      h('span', { style: { color: 'var(--text-faint)' } }, '→'),
      stanceBadge(c.to, 'xs'),
    ]),
    h('div', { style: { textAlign: 'right', color: c.direction === 'upgrade' ? 'var(--green)' : c.direction === 'downgrade' ? 'var(--red)' : 'var(--text-faint)' } },
      c.direction === 'upgrade' ? '↑' : c.direction === 'downgrade' ? '↓' : '•'),
  ]);
}

/* ---------- Data / Reports admin ---------- */

function renderDataView() {
  return h('div', { class: 'content fade-up' }, [
    pageHead('Global Intelligence · Data',
      'Relatórios <em>Ingeridos</em>',
      'Gerencie os relatórios que alimentam a base de dados. Você pode deletar relatórios individuais ou limpar toda a base.'),

    h('div', { style: { marginBottom: '24px', display: 'flex', gap: '12px' } }, [
      h('button', { class: 'btn-secondary', onClick: () => setModal('upload') }, '+ Ingerir novo PDF'),
      h('button', { class: 'btn-secondary', onClick: exportData }, 'Exportar base (.json)'),
      h('label', { class: 'btn-secondary', style: { cursor: 'pointer' } }, [
        h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onChange: importData }),
        h('span', {}, 'Importar base (.json)'),
      ]),
      h('button', { class: 'btn-secondary', style: { color: 'var(--red)', borderColor: 'var(--red)' }, onClick: clearAllData }, 'Limpar tudo'),
    ]),

    DB.reports.length === 0 ? emptyState() : h('div', {}, [
      sectionHead('01', 'Relatórios', `${DB.reports.length} ingeridos`),
      h('div', { class: 'changes' }, DB.reports.slice().reverse().map(r => {
        const mgr = getManagerBySlug(r.manager_slug);
        const viewsFromReport = DB.views.filter(v => v.report_id === r.id).length;
        return h('div', { class: 'change-row', style: { gridTemplateColumns: '80px 1fr 120px 120px 60px' } }, [
          h('div', { class: 'change-manager' }, mgr?.short || r.manager_slug),
          h('div', {}, [
            h('div', { class: 'change-target' }, r.title),
            h('div', { class: 'change-note' }, `${r.report_type} · ${r.page_count || '?'} páginas`),
          ]),
          h('div', { class: 'change-date' }, r.publication_date),
          h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--amber)' } }, `${viewsFromReport} views`),
          h('button', {
            style: { color: 'var(--red)', fontSize: '16px' },
            onClick: (e) => { e.stopPropagation(); deleteReport(r.id); },
            title: 'Deletar relatório',
          }, '×'),
        ]);
      })),
    ]),

    // Section: Gestoras
    h('div', { style: { marginTop: '40px' } }, [
      sectionHead('02', 'Gestoras Tracked',
        `${getCoreManagers().length} core (consenso + heatmap) · ${(DB.custom_managers || []).length} secundárias (só views)`),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginBottom: '16px' } },
        getAllManagers().map(m => h('div', {
          style: {
            padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderLeft: m.type === 'core' ? '3px solid var(--amber)' : '3px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          },
        }, [
          h('div', {}, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, m.name),
            h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-faint)', marginTop: '3px' } },
              `${m.short} · ${m.type} · ${m.aum || '—'}`),
          ]),
          m.type !== 'core' && h('button', {
            style: { color: 'var(--text-faint)', fontSize: '14px', padding: '2px 6px' },
            onClick: () => removeCustomManager(m.slug),
            title: 'Remover gestora',
          }, '×'),
        ]))
      ),

      // Add custom manager form
      h('div', { style: { padding: '16px', background: 'var(--bg-2)', border: '1px dashed var(--amber)' } }, [
        h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px' } },
          '+ Adicionar gestora'),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px auto', gap: '8px', alignItems: 'end' } }, [
          h('div', {}, [
            h('label', { class: 'form-field-label' }, 'Nome'),
            h('input', { class: 'form-field-input', type: 'text', id: 'new-mgr-name', placeholder: 'Ex: Itaú BBA Research' }),
          ]),
          h('div', {}, [
            h('label', { class: 'form-field-label' }, 'Sigla'),
            h('input', { class: 'form-field-input', type: 'text', id: 'new-mgr-short', placeholder: 'IBBA', maxlength: '5' }),
          ]),
          h('div', {}, [
            h('label', { class: 'form-field-label' }, 'AUM (opcional)'),
            h('input', { class: 'form-field-input', type: 'text', id: 'new-mgr-aum', placeholder: 'R$ 500B' }),
          ]),
          h('div', {}, [
            h('label', { class: 'form-field-label' }, 'Tipo'),
            h('select', { class: 'form-field-select', id: 'new-mgr-type' }, [
              h('option', { value: 'secondary' }, 'Secondary'),
              h('option', { value: 'core' }, 'Core'),
            ]),
          ]),
          h('button', { class: 'btn-primary', onClick: () => {
            const name = document.getElementById('new-mgr-name')?.value?.trim();
            const short = document.getElementById('new-mgr-short')?.value?.trim();
            const aum = document.getElementById('new-mgr-aum')?.value?.trim();
            const type = document.getElementById('new-mgr-type')?.value || 'secondary';
            if (!name) { showToast('Nome é obrigatório', true); return; }
            addCustomManager({ name, short: short || name.substring(0, 3).toUpperCase(), aum, type });
            render();
          }}, 'Adicionar'),
        ]),
        h('div', { style: { fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic', marginTop: '10px' } },
          'Core = aparece no heatmap e no consenso. Secondary = views são registradas mas não afetam o consenso principal. Ideal para sell-side, newsletters, research independente.'),
      ]),
    ]),
  ]);
}

function deleteReport(id) {
  if (!confirm('Deletar este relatório e todas as visões extraídas dele?')) return;
  DB.reports = DB.reports.filter(r => r.id !== id);
  DB.views = DB.views.filter(v => v.report_id !== id);
  saveDB(DB);
  render();
  showToast('Relatório removido');
}

function clearAllData() {
  if (!confirm('Apagar TODOS os relatórios e visões? Esta ação é irreversível.')) return;
  DB.reports = [];
  DB.views = [];
  saveDB(DB);
  render();
  showToast('Base de dados limpa');
}

function exportData() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aegir-intel-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.reports || !data.views) throw new Error('Formato inválido');
      if (!confirm(`Importar ${data.reports.length} relatórios e ${data.views.length} visões? Isso SUBSTITUI a base atual.`)) return;
      DB = data;
      saveDB(DB);
      render();
      showToast('Base importada com sucesso');
    } catch (err) {
      showToast('Erro ao importar: ' + err.message, true);
    }
  };
  reader.readAsText(file);
}

/* ---------- Placeholder for portfolio views ---------- */

function renderPlaceholder(title, desc) {
  return h('div', { class: 'content fade-up' }, [
    pageHead(`Global Strategy · ${title}`, title,
      desc),
    h('div', { class: 'empty' }, [
      h('div', { class: 'empty-title' }, 'Em construção'),
      h('p', { class: 'empty-desc', html: 'Esta seção faz parte do <strong>roadmap</strong>. O MVP foco é ingestão de PDFs, extração de visões e consenso automático. Portfolios modelo/temáticos/de cenário virão numa próxima versão.' }),
    ]),
  ]);
}

/* ---------- 10. MODALS ---------- */

function renderUploadModal() {
  const apiKey = DB.settings.gemini_api_key;

  const closeModal = () => {
    if (uploadState.processing) return; // não fechar durante processamento
    resetUploadState();
    setModal(null);
  };

  return h('div', {
    class: 'modal-bg',
    onClick: (e) => {
      // só fecha se clicou DIRETO no backdrop, não em filhos
      if (e.target === e.currentTarget) closeModal();
    },
  }, [
    h('div', {
      class: 'modal',
      onClick: (e) => e.stopPropagation(),
    }, [
      h('div', { class: 'modal-head' }, [
        h('div', {}, [
          h('div', { class: 'page-kicker' }, 'Ingest · PDF'),
          h('div', { class: 'modal-title' }, 'Upload de Relatório'),
        ]),
        h('button', {
          class: 'modal-close',
          onClick: (e) => { e.stopPropagation(); closeModal(); },
          title: 'Fechar (Esc)',
        }, '×'),
      ]),
      h('div', { class: 'modal-body' }, [
        !apiKey && h('div', {
          style: {
            padding: '12px', marginBottom: '16px',
            border: '1px solid var(--red)',
            background: 'rgba(184,92,92,0.08)',
            fontSize: '12px',
          },
        }, [
          h('div', { style: { color: 'var(--red)', marginBottom: '6px' } }, '⚠ API Key não configurada'),
          h('div', { style: { color: 'var(--text-muted)' } }, 'Configure sua chave do Gemini em ⚙ no topo antes de ingerir PDFs.'),
          h('button', { class: 'btn-secondary', style: { marginTop: '10px' }, onClick: () => setModal('settings') }, 'Configurar agora'),
        ]),
        renderUploadForm(apiKey),
      ]),
    ]),
  ]);
}

let uploadState = { file: null, manager: '', reportType: 'quarterly_outlook', publicationDate: '', title: '', processing: false, progress: [], error: null };

function resetUploadState() {
  uploadState = { file: null, manager: '', reportType: 'quarterly_outlook', publicationDate: '', title: '', processing: false, progress: [], error: null };
}

// Updates just the submit button's disabled state without re-rendering the whole form
// (re-rendering kills input focus mid-typing, especially on date fields)
function updateSubmitButton() {
  const btn = document.getElementById('upload-submit-btn');
  if (!btn) return;
  const apiKey = DB.settings.gemini_api_key;
  const canSubmit = apiKey && uploadState.file && uploadState.manager && uploadState.publicationDate && !uploadState.processing;
  if (canSubmit) btn.removeAttribute('disabled');
  else btn.setAttribute('disabled', 'disabled');
}

function renderUploadForm(apiKey) {
  const canSubmit = apiKey && uploadState.file && uploadState.manager && uploadState.publicationDate && !uploadState.processing;

  // Create file input separately so we can programmatically click it
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/pdf,.pdf';
  fileInput.style.display = 'none';
  fileInput.onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      uploadState.file = f;
      uploadState.error = null;
      render();
    }
  };

  return h('div', {}, [
    fileInput,
    // Dropzone — plain div with click handler (not label, more reliable)
    h('div', {
      class: `dropzone ${uploadState.file ? 'has-file' : ''}`,
      style: { display: 'block', userSelect: 'none' },
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      },
      onDragover: (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag');
      },
      onDragleave: (e) => {
        e.currentTarget.classList.remove('drag');
      },
      onDrop: (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag');
        const f = e.dataTransfer?.files?.[0];
        if (f && f.type === 'application/pdf') {
          uploadState.file = f;
          uploadState.error = null;
          render();
        }
      },
    }, [
      h('div', { style: { fontSize: '32px', marginBottom: '12px', pointerEvents: 'none' } }, uploadState.file ? '✓' : '↑'),
      h('div', { style: { fontSize: '13px', marginBottom: '4px', pointerEvents: 'none' } },
        uploadState.file ? uploadState.file.name : 'Clique aqui ou arraste um PDF'),
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', pointerEvents: 'none' } },
        uploadState.file ? `${(uploadState.file.size/1024).toFixed(0)} KB` : 'Máximo 50MB'),
    ]),

    // Clear-file button if one is selected
    uploadState.file && !uploadState.processing && h('button', {
      class: 'btn-secondary',
      style: { width: '100%', marginBottom: '16px', fontSize: '10px' },
      onClick: () => {
        uploadState.file = null;
        render();
      },
    }, 'Trocar arquivo'),

    // Metadata
    h('div', { class: 'form-field' }, [
      h('label', { class: 'form-label' }, 'Gestora'),
      h('select', {
        class: 'form-select',
        onChange: (e) => { uploadState.manager = e.target.value; updateSubmitButton(); },
      }, [
        h('option', { value: '' }, 'Selecione...'),
        ...getAllManagers().map(m => h('option', { value: m.slug, selected: uploadState.manager === m.slug ? 'selected' : null }, m.name + (m.type === 'secondary' ? ' (sec.)' : ''))),
      ]),
    ]),

    h('div', { class: 'form-field' }, [
      h('label', { class: 'form-label' }, 'Tipo de relatório'),
      h('select', {
        class: 'form-select',
        onChange: (e) => { uploadState.reportType = e.target.value; },
      }, [
        h('option', { value: 'quarterly_outlook' }, 'Quarterly Outlook'),
        h('option', { value: 'monthly_commentary' }, 'Monthly Commentary'),
        h('option', { value: 'secular_outlook' }, 'Secular / Annual'),
        h('option', { value: 'strategy_note' }, 'Strategy Note / Flash'),
        h('option', { value: 'deep_dive' }, 'Asset Class Deep-Dive'),
      ]),
    ]),

    h('div', { class: 'form-field' }, [
      h('label', { class: 'form-label' }, 'Data de publicação'),
      h('input', {
        type: 'date', class: 'form-input',
        value: uploadState.publicationDate,
        onInput: (e) => { uploadState.publicationDate = e.target.value; updateSubmitButton(); },
      }),
    ]),

    h('div', { class: 'form-field' }, [
      h('label', { class: 'form-label' }, 'Título (opcional)'),
      h('input', {
        type: 'text', class: 'form-input',
        placeholder: 'ex: Q2 2026 Global Outlook',
        value: uploadState.title,
        onInput: (e) => { uploadState.title = e.target.value; },
      }),
    ]),

    // Progress
    uploadState.progress.length > 0 && h('div', { class: 'progress-steps' }, uploadState.progress.map(p =>
      h('div', { class: `progress-step ${p.status}` }, [
        h('div', { class: 'progress-dot' }, p.status === 'done' ? '✓' : p.status === 'error' ? '×' : ''),
        h('span', {}, p.label),
      ])
    )),

    uploadState.error && h('div', {
      style: {
        padding: '12px', marginBottom: '16px',
        border: '1px solid var(--red)', background: 'rgba(184,92,92,0.08)',
        fontSize: '12px', color: 'var(--red)',
        whiteSpace: 'pre-wrap',
      },
    }, uploadState.error),

    h('button', {
      class: 'btn-primary',
      id: 'upload-submit-btn',
      disabled: !canSubmit ? 'disabled' : null,
      onClick: runIngestion,
    }, uploadState.processing ? 'Processando...' : 'Extrair e salvar'),
  ]);
}

async function runIngestion() {
  uploadState.processing = true;
  uploadState.error = null;
  uploadState.progress = [
    { label: 'Extraindo texto do PDF', status: 'active' },
    { label: 'Enviando para Gemini', status: '' },
    { label: 'Validando estrutura', status: '' },
    { label: 'Salvando no LocalStorage', status: '' },
  ];
  render();

  try {
    // Step 1: extract text
    const { text, pageCount } = await extractPdfText(uploadState.file);
    uploadState.progress[0].status = 'done';
    uploadState.progress[1].status = 'active';
    render();

    // Step 2: Gemini (with retry + fallback status updates)
    const truncated = truncateForLLM(text);
    const result = await callGemini(truncated, DB.settings.gemini_api_key, (msg) => {
      uploadState.progress[1].label = msg;
      render();
    });
    uploadState.progress[1].label = 'Enviando para Gemini';
    uploadState.progress[1].status = 'done';
    uploadState.progress[2].status = 'active';
    render();

    // Step 3: validate
    const cleaned = validateExtraction(result);
    uploadState.progress[2].status = 'done';
    uploadState.progress[3].status = 'active';
    render();

    // Step 4: persist
    const reportId = `r_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const report = {
      id: reportId,
      manager_slug: uploadState.manager,
      title: uploadState.title || `${MANAGER_BY_SLUG[uploadState.manager].name} ${uploadState.publicationDate}`,
      report_type: uploadState.reportType,
      publication_date: uploadState.publicationDate,
      page_count: pageCount,
      ingested_at: new Date().toISOString(),
    };
    DB.reports.push(report);

    for (const v of cleaned.views) {
      DB.views.push({
        report_id: reportId,
        manager_slug: uploadState.manager,
        publication_date: uploadState.publicationDate,
        taxonomy_slug: v.taxonomy_slug,
        stance: v.stance,
        conviction: v.conviction,
        thesis_summary: v.thesis_summary,
        catalysts: v.catalysts,
        risks: v.risks,
        time_horizon: v.time_horizon,
        page_ref: v.page_ref,
        quote: v.quote,
      });
    }
    saveDB(DB);
    uploadState.progress[3].status = 'done';
    render();

    await new Promise(r => setTimeout(r, 800));
    resetUploadState();
    setModal(null);
    showToast(`✓ ${cleaned.views.length} visões extraídas de ${pageCount} páginas`);

  } catch (err) {
    console.error(err);
    const activeIdx = uploadState.progress.findIndex(p => p.status === 'active');
    if (activeIdx >= 0) uploadState.progress[activeIdx].status = 'error';
    uploadState.error = `Erro: ${err.message}`;
    uploadState.processing = false;
    render();
  }
}

function renderSettingsModal() {
  const currentKey = DB.settings.gemini_api_key;
  const currentFinnhubKey = DB.settings.finnhub_api_key;
  const currentBrapiKey = DB.settings.brapi_api_key;
  const closeModal = () => setModal(null);
  return h('div', {
    class: 'modal-bg',
    onClick: (e) => {
      if (e.target === e.currentTarget) closeModal();
    },
  }, [
    h('div', {
      class: 'modal',
      onClick: (e) => e.stopPropagation(),
    }, [
      h('div', { class: 'modal-head' }, [
        h('div', {}, [
          h('div', { class: 'page-kicker' }, 'Settings'),
          h('div', { class: 'modal-title' }, 'API Configuration'),
        ]),
        h('button', {
          class: 'modal-close',
          onClick: (e) => { e.stopPropagation(); closeModal(); },
        }, '×'),
      ]),
      h('div', { class: 'modal-body' }, [
        h('div', { class: 'settings-section' }, [
          h('div', { class: 'form-label' }, 'Gemini API Key'),
          h('input', {
            type: 'password', class: 'form-input',
            placeholder: 'AIza...',
            value: currentKey || '',
            id: 'gemini-key-input',
          }),
          h('div', { class: 'settings-help', html:
            'Para ingestão de PDFs e análises qualitativas. Crie gratuitamente em <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>.'
          }),
          currentKey && h('div', { class: 'key-preview' }, `✓ Key configurada: ${currentKey.substring(0,6)}...${currentKey.substring(currentKey.length-4)}`),
        ]),
        h('div', { class: 'settings-section' }, [
          h('div', { class: 'form-label' }, 'Finnhub API Key (ações US, ETFs, índices)'),
          h('input', {
            type: 'password', class: 'form-input',
            placeholder: 'c1a2b3...',
            value: currentFinnhubKey || '',
            id: 'finnhub-key-input',
          }),
          h('div', { class: 'settings-help', html:
            'Crie gratuitamente em <a href="https://finnhub.io/register" target="_blank">finnhub.io/register</a>. Free tier: 60 req/min.'
          }),
          currentFinnhubKey && h('div', { class: 'key-preview' }, `✓ Key configurada: ${currentFinnhubKey.substring(0,6)}...${currentFinnhubKey.substring(currentFinnhubKey.length-4)}`),
        ]),
        h('div', { class: 'settings-section' }, [
          h('div', { class: 'form-label' }, 'brapi.dev API Key (opcional — ações brasileiras)'),
          h('input', {
            type: 'password', class: 'form-input',
            placeholder: 'opcional — deixe em branco para testar apenas PETR4, VALE3, ITUB4, MGLU3',
            value: currentBrapiKey || '',
            id: 'brapi-key-input',
          }),
          h('div', { class: 'settings-help', html:
            'Para ações da B3 (PETR4, VALE3, etc). <strong>Sem token</strong>: você já consegue testar as 4 ações de demonstração. ' +
            'Para as demais: crie gratuitamente em <a href="https://brapi.dev/dashboard" target="_blank">brapi.dev/dashboard</a>.'
          }),
          currentBrapiKey && h('div', { class: 'key-preview' }, `✓ Key configurada: ${currentBrapiKey.substring(0,6)}...${currentBrapiKey.substring(currentBrapiKey.length-4)}`),
        ]),
        h('div', { class: 'settings-section' }, [
          h('div', { class: 'form-label' }, 'FRED API Key (Federal Reserve Economic Data — séries US)'),
          h('input', {
            type: 'password', class: 'form-input',
            placeholder: 'abcdefghijklmnopqrstuvwxyz123456',
            value: DB.settings.fred_api_key || '',
            id: 'fred-key-input',
          }),
          h('div', { class: 'settings-help', html:
            'Para indicadores macroeconômicos dos EUA (taxas, inflação, emprego, liquidez, spreads). ' +
            'Crie gratuitamente em <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank">fred.stlouisfed.org</a>. 120 req/min.'
          }),
          DB.settings.fred_api_key && h('div', { class: 'key-preview' }, `✓ Key configurada: ${DB.settings.fred_api_key.substring(0,6)}...${DB.settings.fred_api_key.substring(DB.settings.fred_api_key.length-4)}`),
        ]),
        h('button', {
          class: 'btn-primary',
          onClick: () => {
            const geminiVal = document.getElementById('gemini-key-input').value.trim();
            const finnhubVal = document.getElementById('finnhub-key-input').value.trim();
            const brapiVal = document.getElementById('brapi-key-input').value.trim();
            const fredVal = document.getElementById('fred-key-input').value.trim();
            DB.settings.gemini_api_key = geminiVal;
            DB.settings.finnhub_api_key = finnhubVal;
            DB.settings.brapi_api_key = brapiVal;
            DB.settings.fred_api_key = fredVal;
            saveDB(DB);
            showToast('Configurações salvas');
            setModal(null);
          },
        }, 'Salvar'),
      ]),
    ]),
  ]);
}

/* ---------- 11. TOAST ---------- */

function showToast(msg, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = h('div', { class: `toast ${isError ? 'err' : ''}` }, msg);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ============================================================
   12. PORTFOLIOS
   ============================================================ */

// Default model portfolios — seeded on first use, fully editable afterwards
const DEFAULT_MODEL_PORTFOLIOS = [
  {
    id: 'conservative',
    name: 'Conservative',
    kind: 'model',
    description: 'Capital preservation with modest growth. Low drawdown tolerance.',
    risk_level: 'Low',
    target_return: '5–7%',
    target_vol: '4–6%',
    allocation: [
      { slug: 'cash',            weight: 15, color: '#8a8578' },
      { slug: 'us_govt',         weight: 20, color: '#a5b87a' },
      { slug: 'us_ig',           weight: 30, color: '#7a9b5c' },
      { slug: 'us_equities',     weight: 15, color: '#d4a574' },
      { slug: 'dm_ex_us_equities', weight: 8,  color: '#c89b7a' },
      { slug: 'gold',            weight: 7,  color: '#b8a05c' },
      { slug: 'private_debt',    weight: 5,  color: '#7a8aa5' },
    ],
  },
  {
    id: 'moderate',
    name: 'Moderate',
    kind: 'model',
    description: 'Balanced income and growth exposure.',
    risk_level: 'Low-Medium',
    target_return: '6–8%',
    target_vol: '7–9%',
    allocation: [
      { slug: 'cash',            weight: 8,  color: '#8a8578' },
      { slug: 'us_ig',           weight: 22, color: '#7a9b5c' },
      { slug: 'em_debt',         weight: 8,  color: '#5c9b9b' },
      { slug: 'us_equities',     weight: 25, color: '#d4a574' },
      { slug: 'dm_ex_us_equities', weight: 15, color: '#c89b7a' },
      { slug: 'em_equities',     weight: 7,  color: '#b87a5c' },
      { slug: 'gold',            weight: 5,  color: '#b8a05c' },
      { slug: 'private_debt',    weight: 7,  color: '#7a8aa5' },
      { slug: 'infrastructure',  weight: 3,  color: '#9b7a9b' },
    ],
  },
  {
    id: 'balanced',
    name: 'Balanced',
    kind: 'model',
    description: 'Growth-tilted diversified core.',
    risk_level: 'Medium',
    target_return: '7–9%',
    target_vol: '10–12%',
    allocation: [
      { slug: 'cash',            weight: 5,  color: '#8a8578' },
      { slug: 'us_ig',           weight: 15, color: '#7a9b5c' },
      { slug: 'em_debt',         weight: 7,  color: '#5c9b9b' },
      { slug: 'us_equities',     weight: 32, color: '#d4a574' },
      { slug: 'dm_ex_us_equities', weight: 17, color: '#c89b7a' },
      { slug: 'em_equities',     weight: 10, color: '#b87a5c' },
      { slug: 'gold',            weight: 4,  color: '#b8a05c' },
      { slug: 'private_equity',  weight: 4,  color: '#a57a9b' },
      { slug: 'private_debt',    weight: 3,  color: '#7a8aa5' },
      { slug: 'infrastructure',  weight: 3,  color: '#9b7a9b' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    kind: 'model',
    description: 'Long-term capital appreciation focus.',
    risk_level: 'Medium-High',
    target_return: '8–11%',
    target_vol: '13–15%',
    allocation: [
      { slug: 'cash',            weight: 3,  color: '#8a8578' },
      { slug: 'us_ig',           weight: 7,  color: '#7a9b5c' },
      { slug: 'em_debt',         weight: 5,  color: '#5c9b9b' },
      { slug: 'us_equities',     weight: 38, color: '#d4a574' },
      { slug: 'dm_ex_us_equities', weight: 20, color: '#c89b7a' },
      { slug: 'em_equities',     weight: 13, color: '#b87a5c' },
      { slug: 'private_equity',  weight: 8,  color: '#a57a9b' },
      { slug: 'infrastructure',  weight: 3,  color: '#9b7a9b' },
      { slug: 'ai',              weight: 3,  color: '#d47a5c' },
    ],
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    kind: 'model',
    description: 'Maximum growth, high volatility tolerance.',
    risk_level: 'High',
    target_return: '10–14%',
    target_vol: '16–20%',
    allocation: [
      { slug: 'us_equities',     weight: 40, color: '#d4a574' },
      { slug: 'dm_ex_us_equities', weight: 20, color: '#c89b7a' },
      { slug: 'em_equities',     weight: 15, color: '#b87a5c' },
      { slug: 'us_small_caps',   weight: 6,  color: '#8a7a5c' },
      { slug: 'private_equity',  weight: 10, color: '#a57a9b' },
      { slug: 'ai',              weight: 6,  color: '#d47a5c' },
      { slug: 'crypto',          weight: 3,  color: '#5c7a9b' },
    ],
  },
];

const DEFAULT_THEMATIC_PORTFOLIOS = [
  {
    id: 'ai_stack', name: 'AI & Compute Stack', kind: 'thematic',
    description: 'Full-stack AI: semis, infrastructure, applications.',
    risk_level: 'High', target_return: '12–18%', target_vol: '20–25%',
    allocation: [
      { slug: 'ai',             weight: 55, color: '#d4a574' },
      { slug: 'robotics',       weight: 20, color: '#c89b7a' },
      { slug: 'us_equities',    weight: 15, color: '#b87a5c' },
      { slug: 'us_small_caps',  weight: 10, color: '#8a7a5c' },
    ],
  },
  {
    id: 'energy_transition', name: 'Energy Transition', kind: 'thematic',
    description: 'Grid, storage, nuclear, critical minerals.',
    risk_level: 'Medium-High', target_return: '8–12%', target_vol: '14–18%',
    allocation: [
      { slug: 'energy_trans',      weight: 45, color: '#7a9b5c' },
      { slug: 'infrastructure',    weight: 25, color: '#9b7a9b' },
      { slug: 'industrial_metals', weight: 20, color: '#b8a05c' },
      { slug: 'us_equities',       weight: 10, color: '#d4a574' },
    ],
  },
  {
    id: 'defense_security', name: 'Defense & Security', kind: 'thematic',
    description: 'Primes, cyber, space-defense, reshoring beneficiaries.',
    risk_level: 'Medium', target_return: '8–11%', target_vol: '12–16%',
    allocation: [
      { slug: 'defense',    weight: 50, color: '#8a7a5c' },
      { slug: 'onshoring',  weight: 25, color: '#d47a5c' },
      { slug: 'space',      weight: 15, color: '#7a8aa5' },
      { slug: 'us_equities', weight: 10, color: '#d4a574' },
    ],
  },
];

const DEFAULT_SCENERY_PORTFOLIOS = [
  {
    id: 'fed_cuts', name: 'Fed Cutting Cycle', kind: 'scenery',
    description: 'Fed begins aggressive rate cuts (≥75bps).',
    trigger: 'Recession fears intensify, rates cut below 3%',
    probability: '25%',
    risk_level: 'Medium', target_return: '8–11%', target_vol: '11–14%',
    allocation: [
      { slug: 'us_govt',         weight: 25, color: '#a5b87a' },
      { slug: 'us_ig',           weight: 20, color: '#7a9b5c' },
      { slug: 'us_equities',     weight: 20, color: '#d4a574' },
      { slug: 'gold',            weight: 15, color: '#b8a05c' },
      { slug: 'em_debt',         weight: 10, color: '#5c9b9b' },
      { slug: 'em_equities',     weight: 10, color: '#b87a5c' },
    ],
  },
  {
    id: 'geopolitical_escalation', name: 'Geopolitical Escalation', kind: 'scenery',
    description: 'Middle East / Taiwan / Russia flashpoint escalates.',
    trigger: 'Major conflict escalation affecting global trade',
    probability: '12%',
    risk_level: 'High', target_return: '3–7%', target_vol: '18–22%',
    allocation: [
      { slug: 'gold',            weight: 25, color: '#b8a05c' },
      { slug: 'us_govt',         weight: 20, color: '#a5b87a' },
      { slug: 'defense',         weight: 20, color: '#8a7a5c' },
      { slug: 'oil_energy',      weight: 15, color: '#d47a5c' },
      { slug: 'cash',            weight: 10, color: '#8a8578' },
      { slug: 'us_equities',     weight: 10, color: '#d4a574' },
    ],
  },
  {
    id: 'productivity_boom', name: 'Productivity Boom', kind: 'scenery',
    description: 'AI-led productivity breakthrough drives equity rerating.',
    trigger: 'Sustained earnings upside + multiple expansion',
    probability: '15%',
    risk_level: 'High', target_return: '12–18%', target_vol: '16–20%',
    allocation: [
      { slug: 'us_equities',     weight: 35, color: '#d4a574' },
      { slug: 'ai',              weight: 20, color: '#c89b7a' },
      { slug: 'robotics',        weight: 10, color: '#b87a5c' },
      { slug: 'us_small_caps',   weight: 15, color: '#8a7a5c' },
      { slug: 'dm_ex_us_equities', weight: 10, color: '#a57a9b' },
      { slug: 'em_equities',     weight: 10, color: '#b87a5c' },
    ],
  },
];

function getPortfolios(kind) {
  if (!DB.portfolios) {
    DB.portfolios = {
      model: DEFAULT_MODEL_PORTFOLIOS.map(p => ({ ...p, allocation: [...p.allocation] })),
      thematic: DEFAULT_THEMATIC_PORTFOLIOS.map(p => ({ ...p, allocation: [...p.allocation] })),
      scenery: DEFAULT_SCENERY_PORTFOLIOS.map(p => ({ ...p, allocation: [...p.allocation] })),
    };
    saveDB(DB);
  }
  return DB.portfolios[kind] || [];
}

function savePortfolio(kind, portfolio) {
  getPortfolios(kind); // ensure initialized
  const list = DB.portfolios[kind];
  const idx = list.findIndex(p => p.id === portfolio.id);
  if (idx >= 0) list[idx] = portfolio;
  else list.push(portfolio);
  saveDB(DB);
}

// Returns tilt suggestion based on consensus for this taxonomy slug
function getTiltSuggestion(taxonomySlug) {
  const c = computeConsensus(taxonomySlug);
  if (!c) return { direction: 'neutral', delta: 0, label: 'No data' };
  const map = { OW: 3, MOW: 1.5, N: 0, MUW: -1.5, UW: -3 };
  const delta = map[c.stance] || 0;
  if (delta > 0) return { direction: 'up', delta, label: `+${delta}% (${c.stance})`, stance: c.stance };
  if (delta < 0) return { direction: 'down', delta, label: `${delta}% (${c.stance})`, stance: c.stance };
  return { direction: 'neutral', delta: 0, label: `± 0 (${c.stance})`, stance: c.stance };
}

function renderPortfoliosGrid(kind, title, subtitle, numPrefix) {
  const list = getPortfolios(kind);
  const selectedId = state._portfolio_id || list[0]?.id;
  const selected = list.find(p => p.id === selectedId) || list[0];

  return h('div', { class: 'content fade-up' }, [
    pageHead(`Global Strategy · ${title}`, title, subtitle),

    h('div', { class: 'portfolio-template-grid', style: { marginBottom: '24px' } },
      list.map(p => h('button', {
        class: `portfolio-template-card ${selected?.id === p.id ? 'active' : ''}`,
        onClick: () => { state._portfolio_id = p.id; render(); },
      }, [
        h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '6px' } }, p.risk_level || p.kind),
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px', marginBottom: '6px' } }, p.name),
        h('div', { style: { fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' } },
          (p.description || '').substring(0, 70) + ((p.description || '').length > 70 ? '…' : '')),
      ]))
    ),

    selected && renderPortfolioDetail(selected, kind),
  ]);
}

function renderPortfolioDetail(p, kind) {
  const total = p.allocation.reduce((a, b) => a + Number(b.weight || 0), 0);

  return h('div', { class: 'portfolio-card' }, [
    h('div', { class: 'portfolio-card-head' }, [
      h('div', {}, [
        h('div', { class: 'portfolio-name' }, p.name),
        h('div', { class: 'portfolio-desc' }, p.description),
        h('div', { class: 'portfolio-badges' }, [
          p.risk_level && h('span', { class: 'portfolio-badge' }, `Risk: ${p.risk_level}`),
          p.target_return && h('span', { class: 'portfolio-badge' }, `Target: ${p.target_return}`),
          p.target_vol && h('span', { class: 'portfolio-badge' }, `Vol: ${p.target_vol}`),
          p.probability && h('span', { class: 'portfolio-badge' }, `Prob: ${p.probability}`),
        ]),
      ]),
      h('div', { class: 'donut-container', style: { padding: '0' } }, [renderDonut(p.allocation, 140)]),
    ]),

    // Allocation table
    h('table', { class: 'portfolio-table' }, [
      h('thead', {}, [
        h('tr', {}, [
          h('th', {}, 'Classe de ativo'),
          h('th', { class: 'center' }, 'Consenso'),
          h('th', { class: 'center' }, 'Sugestão'),
          h('th', { class: 'right' }, 'Peso (%)'),
        ]),
      ]),
      h('tbody', {}, p.allocation.map((a, idx) => {
        const meta = SLUG_META[a.slug] || { name: a.slug };
        const c = computeConsensus(a.slug);
        const tilt = getTiltSuggestion(a.slug);
        return h('tr', {}, [
          h('td', {}, [
            h('span', { style: { display: 'inline-block', width: '10px', height: '10px', background: a.color, marginRight: '10px', verticalAlign: 'middle' } }),
            meta.name || a.slug,
          ]),
          h('td', { class: 'center' }, c ? stanceBadge(c.stance, 'xs') : h('span', { class: 'stance-empty' }, '—')),
          h('td', { class: 'center' }, [
            h('button', {
              class: `tilt-suggest ${tilt.direction}`,
              title: 'Clique para aplicar ao peso',
              onClick: () => applyTilt(kind, p.id, idx, tilt.delta),
              disabled: tilt.delta === 0 ? 'disabled' : null,
            }, tilt.label),
          ]),
          h('td', { class: 'right' }, [
            h('input', {
              type: 'number', class: 'weight-input',
              min: '0', max: '100', step: '0.5',
              value: String(a.weight),
              onInput: (e) => updatePortfolioWeight(kind, p.id, idx, e.target.value),
            }),
          ]),
        ]);
      })),
      h('tfoot', {}, [
        h('tr', {}, [
          h('td', { colspan: '3' }, 'TOTAL'),
          h('td', { class: 'right' }, `${total.toFixed(1)}%`),
        ]),
      ]),
    ]),

    Math.abs(total - 100) > 0.01 && h('div', {
      style: {
        padding: '10px 14px', marginTop: '12px',
        border: '1px solid var(--red)', background: 'rgba(184,92,92,0.08)',
        fontSize: '11px', color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace',
      },
    }, `⚠ Alocação soma ${total.toFixed(1)}%. Ajuste para totalizar 100%.`),

    h('div', { class: 'portfolio-actions' }, [
      h('button', { class: 'btn-secondary', onClick: () => normalizeToHundred(kind, p.id) }, 'Normalizar para 100%'),
      h('button', { class: 'btn-secondary', onClick: () => applyAllTilts(kind, p.id) }, 'Aplicar todas sugestões'),
      h('button', { class: 'btn-secondary', onClick: () => resetPortfolioToDefault(kind, p.id) }, 'Restaurar padrão'),
      h('button', { class: 'btn-secondary', onClick: () => exportPortfolioAsCSV(p) }, 'Exportar CSV'),
    ]),
  ]);
}

function renderDonut(allocation, size = 140) {
  const r = size / 2;
  const rInner = r * 0.55;
  let cumulative = 0;
  const total = allocation.reduce((a, b) => a + Number(b.weight || 0), 0) || 1;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  let inner = '';
  for (const a of allocation) {
    const w = (Number(a.weight) || 0) / total;
    if (w === 0) continue;
    const startA = cumulative * 2 * Math.PI - Math.PI / 2;
    const endA = (cumulative + w) * 2 * Math.PI - Math.PI / 2;
    cumulative += w;
    const large = w > 0.5 ? 1 : 0;
    const x1 = r + Math.cos(startA) * r, y1 = r + Math.sin(startA) * r;
    const x2 = r + Math.cos(endA) * r,   y2 = r + Math.sin(endA) * r;
    const x3 = r + Math.cos(endA) * rInner, y3 = r + Math.sin(endA) * rInner;
    const x4 = r + Math.cos(startA) * rInner, y4 = r + Math.sin(startA) * rInner;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
    inner += `<path d="${d}" fill="${a.color}" stroke="var(--bg)" stroke-width="1"/>`;
  }
  svg.innerHTML = inner;
  return svg;
}

function updatePortfolioWeight(kind, portfolioId, idx, newValue) {
  const p = getPortfolios(kind).find(x => x.id === portfolioId);
  if (!p) return;
  p.allocation[idx].weight = Math.max(0, Math.min(100, Number(newValue) || 0));
  savePortfolio(kind, p);
  // Full re-render because total/validation depends on it
  render();
}

function applyTilt(kind, portfolioId, idx, delta) {
  if (!delta) return;
  const p = getPortfolios(kind).find(x => x.id === portfolioId);
  if (!p) return;
  p.allocation[idx].weight = Math.max(0, Math.min(100, Number(p.allocation[idx].weight) + delta));
  savePortfolio(kind, p);
  render();
  showToast(`Tilt de ${delta > 0 ? '+' : ''}${delta}% aplicado em ${SLUG_META[p.allocation[idx].slug]?.name || p.allocation[idx].slug}`);
}

function applyAllTilts(kind, portfolioId) {
  const p = getPortfolios(kind).find(x => x.id === portfolioId);
  if (!p) return;
  let applied = 0;
  p.allocation.forEach(a => {
    const tilt = getTiltSuggestion(a.slug);
    if (tilt.delta !== 0) {
      a.weight = Math.max(0, Math.min(100, Number(a.weight) + tilt.delta));
      applied++;
    }
  });
  savePortfolio(kind, p);
  render();
  showToast(`${applied} tilts aplicados com base no consenso`);
}

function normalizeToHundred(kind, portfolioId) {
  const p = getPortfolios(kind).find(x => x.id === portfolioId);
  if (!p) return;
  const total = p.allocation.reduce((a, b) => a + Number(b.weight || 0), 0);
  if (total === 0) return;
  const scale = 100 / total;
  p.allocation.forEach(a => { a.weight = Number((Number(a.weight) * scale).toFixed(1)); });
  savePortfolio(kind, p);
  render();
  showToast('Alocação normalizada para 100%');
}

function resetPortfolioToDefault(kind, portfolioId) {
  const defaults = kind === 'model' ? DEFAULT_MODEL_PORTFOLIOS
                  : kind === 'thematic' ? DEFAULT_THEMATIC_PORTFOLIOS
                  : DEFAULT_SCENERY_PORTFOLIOS;
  const def = defaults.find(x => x.id === portfolioId);
  if (!def) return;
  if (!confirm('Restaurar alocação padrão deste portfólio? Suas alterações serão perdidas.')) return;
  const list = DB.portfolios[kind];
  const idx = list.findIndex(x => x.id === portfolioId);
  list[idx] = JSON.parse(JSON.stringify(def));
  saveDB(DB);
  render();
  showToast('Portfólio restaurado para os valores padrão');
}

function exportPortfolioAsCSV(p) {
  const rows = [
    ['Classe', 'Slug', 'Peso %', 'Consenso Atual', 'Convicção'],
    ...p.allocation.map(a => {
      const c = computeConsensus(a.slug);
      return [
        SLUG_META[a.slug]?.name || a.slug,
        a.slug,
        a.weight,
        c?.stance || '—',
        c ? `${Math.round(c.conviction * 100)}%` : '—',
      ];
    }),
  ];
  const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${p.id}_allocation.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado');
}

/* ============================================================
   13. SEARCH (textual + semantic)
   ============================================================ */

function renderSearchView() {
  const query = state._search_query || '';
  const semanticResults = state._search_semantic || null;
  const semanticLoading = state._search_loading || false;

  // Textual search: match in thesis, catalysts, risks, quote, manager name, taxonomy name
  const textResults = !query.trim() ? [] : searchTextual(query);

  return h('div', { class: 'content fade-up' }, [
    pageHead('Global Intelligence · Search',
      'Search <em>Views</em>',
      'Busca textual instantânea no conteúdo extraído. Use <span class="mono-hi">Busca Semântica</span> para perguntas em linguagem natural ranqueadas pelo Gemini.'),

    h('div', { class: 'search-box' }, [
      h('span', { class: 'search-icon' }, '⌕'),
      h('input', {
        type: 'text',
        placeholder: 'Buscar por palavra-chave, gestora, tópico…',
        value: query,
        oninput: (e) => {
          state._search_query = e.target.value;
          state._search_semantic = null; // reset semantic when user types
          const input = e.target;
          const pos = input.selectionStart;
          render();
          // Restore focus after re-render
          setTimeout(() => {
            const newInput = document.querySelector('.search-box input');
            if (newInput) { newInput.focus(); newInput.setSelectionRange(pos, pos); }
          }, 0);
        },
      }),
      query && h('button', {
        style: { color: 'var(--text-dim)', fontSize: '16px', padding: '0 8px' },
        onClick: () => { state._search_query = ''; state._search_semantic = null; render(); },
      }, '×'),
      h('span', { class: 'search-count' },
        query ? (semanticResults ? `${semanticResults.length} semânticos` : `${textResults.length} matches`) : `${DB.views.length} views indexadas`),
    ]),

    // Semantic search button
    query.trim() && h('div', { style: { marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' } }, [
      h('button', {
        class: 'btn-secondary',
        disabled: semanticLoading ? 'disabled' : null,
        onClick: () => runSemanticSearch(query),
      }, semanticLoading ? 'Consultando Gemini…' : '⟡ Busca semântica (Gemini)'),
      semanticResults && h('button', {
        class: 'btn-secondary',
        onClick: () => { state._search_semantic = null; render(); },
      }, 'Voltar para textual'),
      h('span', { style: { fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' } },
        'Ex: "quem vê risco de concentração nas mag7", "consenso sobre ECB cut"'),
    ]),

    // Results
    semanticResults
      ? renderSemanticResults(semanticResults)
      : query.trim()
        ? renderTextualResults(textResults, query)
        : h('div', { class: 'empty', style: { padding: '40px' } }, [
            h('p', { class: 'empty-desc' }, 'Digite acima para buscar nas visões extraídas.'),
          ]),
  ]);
}

function searchTextual(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const results = [];
  for (const v of DB.views) {
    const mgr = MANAGER_BY_SLUG[v.manager_slug];
    const tax = SLUG_META[v.taxonomy_slug];
    const haystack = [
      v.thesis_summary,
      (v.catalysts || []).join(' '),
      (v.risks || []).join(' '),
      v.quote,
      mgr?.name || '',
      mgr?.short || '',
      tax?.name || '',
      v.taxonomy_slug,
    ].join(' ').toLowerCase();
    const allMatch = terms.every(t => haystack.includes(t));
    if (allMatch) {
      results.push({ view: v, score: terms.reduce((a, t) => a + (haystack.split(t).length - 1), 0) });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 50);
}

function renderTextualResults(results, query) {
  if (!results.length) {
    return h('div', { class: 'empty', style: { padding: '40px' } }, [
      h('div', { class: 'empty-title' }, 'Sem resultados'),
      h('p', { class: 'empty-desc' }, `Nenhuma view contém "${query}". Tente a busca semântica para resultados por significado.`),
    ]);
  }
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return h('div', {}, results.map(r => renderSearchResultRow(r.view, terms, null, null)));
}

function renderSemanticResults(results) {
  if (!results.length) {
    return h('div', { class: 'empty', style: { padding: '40px' } }, [
      h('p', { class: 'empty-desc' }, 'O Gemini não encontrou views relevantes para esta query.'),
    ]);
  }
  return h('div', {}, results.map((r, i) => renderSearchResultRow(r.view, [], i + 1, r.explain)));
}

function renderSearchResultRow(v, highlightTerms, rank, explain) {
  const mgr = MANAGER_BY_SLUG[v.manager_slug];
  const tax = SLUG_META[v.taxonomy_slug];

  const highlight = (text) => {
    if (!text) return '';
    if (!highlightTerms.length) return escapeHtml(text);
    let result = escapeHtml(text);
    for (const t of highlightTerms) {
      if (!t) continue;
      const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      result = result.replace(re, '<mark>$1</mark>');
    }
    return result;
  };

  return h('div', {
    class: 'search-result',
    onClick: () => { if (tax) setDetail(tax.kind, v.taxonomy_slug); },
  }, [
    h('div', { class: 'search-result-head' }, [
      h('div', {}, [
        rank && h('span', { class: 'search-rank' }, `#${rank}`),
        h('span', { class: 'search-result-title' }, `${mgr?.short || v.manager_slug} · ${tax?.name || v.taxonomy_slug}`),
      ]),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
        stanceBadge(v.stance, 'xs'),
        h('span', { class: 'search-result-meta' }, v.publication_date),
      ]),
    ]),
    h('div', { class: 'search-result-thesis', html: highlight(v.thesis_summary) }),
    explain && h('div', { class: 'search-explain' }, `Relevância (Gemini): ${explain}`),
  ]);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function runSemanticSearch(query) {
  const apiKey = DB.settings.gemini_api_key;
  if (!apiKey) {
    showToast('Configure a API key do Gemini primeiro', true);
    setModal('settings');
    return;
  }
  if (DB.views.length === 0) {
    showToast('Nenhuma view ingerida ainda', true);
    return;
  }

  state._search_loading = true;
  render();

  // Build corpus (cap to avoid token limits)
  const corpus = DB.views.slice(0, 200).map((v, i) => {
    const mgr = MANAGER_BY_SLUG[v.manager_slug];
    const tax = SLUG_META[v.taxonomy_slug];
    return `[${i}] ${mgr?.short || v.manager_slug} · ${tax?.name || v.taxonomy_slug} (${v.stance}, ${v.publication_date}): ${v.thesis_summary}`;
  }).join('\n\n');

  const prompt = `You are a search engine over institutional investment views. A user asked:

"${query}"

Below are indexed views from various asset managers. Each is prefixed with [index].
Return a JSON array of the top 10 MOST RELEVANT indices with a one-sentence explanation of why each is relevant to the query.

Output format (JSON only, no markdown):
{
  "results": [
    { "index": 7, "explain": "brief reason this view is relevant" },
    ...
  ]
}

If fewer than 10 views are relevant, return fewer. If none are relevant, return {"results": []}.

VIEWS:
${corpus}`;

  try {
    const result = await callGeminiRaw(prompt, apiKey, (msg) => {
      // Could show status but keep simple
    });

    const indices = (result.results || []).slice(0, 10);
    const ranked = indices.map(r => ({
      view: DB.views[r.index],
      explain: r.explain,
    })).filter(r => r.view);

    state._search_semantic = ranked;
    state._search_loading = false;
    render();
  } catch (err) {
    state._search_loading = false;
    render();
    showToast('Erro na busca semântica: ' + err.message, true);
  }
}

/* ============================================================
   14. REPORT BUILDER (PDF via window.print)
   ============================================================ */

function getReportSections() {
  return [
    {
      group: 'Cover & Summary',
      items: [
        { k: 'cover',        l: 'Capa com título e data' },
        { k: 'exec_summary', l: 'Executive Summary (KPIs)' },
        { k: 'narrative',    l: 'Narrativa Bull/Bear (via Gemini)' },
        { k: 'recent_shifts', l: 'Recent Shifts (30d)' },
      ],
    },
    {
      group: 'Macro View',
      items: TAXONOMY.macro.map(t => ({ k: `macro_${t.slug}`, l: t.name })),
    },
    {
      group: 'Assets View',
      items: TAXONOMY.asset.map(t => ({ k: `asset_${t.slug}`, l: t.name })),
    },
    {
      group: 'MicroAssets View',
      items: TAXONOMY.micro.map(t => ({ k: `micro_${t.slug}`, l: t.name })),
    },
    {
      group: 'Thematic View',
      items: TAXONOMY.thematic.map(t => ({ k: `thematic_${t.slug}`, l: t.name })),
    },
    {
      group: 'Portfolios',
      items: [
        ...(DB.portfolios?.model || []).map(p => ({ k: `port_model_${p.id}`, l: `Model: ${p.name}` })),
        ...(DB.portfolios?.thematic || []).map(p => ({ k: `port_thematic_${p.id}`, l: `Thematic: ${p.name}` })),
        ...(DB.portfolios?.scenery || []).map(p => ({ k: `port_scenery_${p.id}`, l: `Scenery: ${p.name}` })),
      ],
    },
    {
      group: 'Appendix',
      items: [
        { k: 'appendix_sources', l: 'Relatórios-fonte ingeridos' },
      ],
    },
  ];
}

function getReportDefaults() {
  return new Set(['cover', 'exec_summary', 'narrative', 'recent_shifts']);
}

function renderReportBuilder() {
  if (!state._report_sections) state._report_sections = getReportDefaults();
  if (!state._report_title) state._report_title = 'Market Intelligence Report';
  if (!state._report_period) state._report_period = `Q${Math.ceil((new Date().getMonth()+1)/3)} ${new Date().getFullYear()}`;

  const selected = state._report_sections;
  const groups = getReportSections();

  return h('div', { class: 'content fade-up' }, [
    pageHead('Global Intelligence · Report Builder',
      'Custom <em>PDF Report</em>',
      'Selecione as seções para compor um relatório em PDF. Gerado diretamente no navegador via sistema de impressão — qualidade profissional, sem dependências externas.'),

    h('div', { class: 'report-builder-layout' }, [
      // Left: sections
      h('div', {}, [
        // Meta fields
        h('div', { class: 'report-section-group' }, [
          h('div', { class: 'report-group-title', style: { marginBottom: '12px' } }, 'Metadados do Relatório'),
          h('div', { class: 'form-field' }, [
            h('label', { class: 'form-label' }, 'Título'),
            h('input', {
              type: 'text', class: 'form-input',
              value: state._report_title,
              oninput: (e) => {
                state._report_title = e.target.value;
                const pos = e.target.selectionStart;
                const v = e.target.value;
                // Don't re-render; just keep state updated. Value already synced via DOM.
              },
            }),
          ]),
          h('div', { class: 'form-field' }, [
            h('label', { class: 'form-label' }, 'Período / Subtítulo'),
            h('input', {
              type: 'text', class: 'form-input',
              value: state._report_period,
              oninput: (e) => { state._report_period = e.target.value; },
            }),
          ]),
        ]),

        // Sections
        ...groups.map(g => h('div', { class: 'report-section-group' }, [
          h('div', { class: 'report-section-group-head' }, [
            h('div', { class: 'report-group-title' }, g.group),
            h('button', {
              class: 'report-toggle-all',
              onClick: () => toggleGroupAll(g, selected),
            }, g.items.every(i => selected.has(i.k)) ? 'desmarcar todos' : 'marcar todos'),
          ]),
          g.items.length === 0
            ? h('div', { style: { fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic' } },
                g.group === 'Portfolios' ? 'Crie portfolios primeiro' : 'Nenhum item disponível')
            : h('div', { class: 'report-checkboxes' }, g.items.map(i => {
                const on = selected.has(i.k);
                return h('label', {
                  class: `report-check ${on ? 'on' : ''}`,
                  onClick: (e) => {
                    e.preventDefault();
                    if (on) selected.delete(i.k);
                    else selected.add(i.k);
                    render();
                  },
                }, [
                  h('div', { class: 'report-check-box' }, on ? '✓' : ''),
                  h('span', { style: { flex: 1, color: on ? 'var(--text)' : 'var(--text-muted)' } }, i.l),
                ]);
              })),
        ])),
      ]),

      // Right: preview
      h('div', { class: 'report-preview-panel' }, [
        h('div', { class: 'report-group-title', style: { marginBottom: '14px' } }, 'Preview'),
        h('div', { class: 'report-preview-thumb' }, [
          h('div', { class: 'report-thumb-title' }, state._report_title || 'Market Intelligence'),
          h('div', { class: 'report-thumb-sub' }, state._report_period),
          h('div', { class: 'report-thumb-lines' },
            [...selected].slice(0, 14).map((k, i) =>
              h('div', { class: 'report-thumb-line' }, [
                h('span', { class: 'n' }, `§${String(i+1).padStart(2,'0')} `),
                h('span', {}, prettifyReportKey(k)),
              ])
            ).concat(
              selected.size > 14 ? [h('div', { class: 'report-thumb-line', style: { color: 'var(--text-faint)' } }, `+ ${selected.size - 14} mais…`)] : []
            )
          ),
        ]),
        h('div', { style: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '14px', lineHeight: '1.8' } }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [h('span', {}, 'Seções'), h('span', {}, String(selected.size))]),
          h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [h('span', {}, 'Est. páginas'), h('span', {}, String(Math.max(1, Math.ceil(selected.size * 0.8))))]),
          h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [h('span', {}, 'Views na base'), h('span', {}, String(DB.views.length))]),
        ]),
        h('button', {
          class: 'btn-primary',
          onClick: generateReport,
          disabled: selected.size === 0 ? 'disabled' : null,
        }, 'Gerar PDF'),
        h('div', { style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '10px', lineHeight: '1.5' } },
          'Ao clicar em "Gerar PDF", será aberto o diálogo de impressão do navegador. Escolha "Salvar como PDF" no destino.'),
      ]),
    ]),
  ]);
}

function toggleGroupAll(group, selected) {
  const allOn = group.items.every(i => selected.has(i.k));
  group.items.forEach(i => {
    if (allOn) selected.delete(i.k);
    else selected.add(i.k);
  });
  render();
}

function prettifyReportKey(k) {
  if (k === 'cover') return 'Capa';
  if (k === 'exec_summary') return 'Executive Summary';
  if (k === 'narrative') return 'Narrativa Bull/Bear';
  if (k === 'recent_shifts') return 'Recent Shifts';
  if (k === 'appendix_sources') return 'Appendix · Fontes';
  if (k.startsWith('macro_'))    return 'Macro · ' + (SLUG_META[k.slice(6)]?.name || k);
  if (k.startsWith('asset_'))    return 'Asset · ' + (SLUG_META[k.slice(6)]?.name || k);
  if (k.startsWith('micro_'))    return 'Micro · ' + (SLUG_META[k.slice(6)]?.name || k);
  if (k.startsWith('thematic_')) return 'Theme · ' + (SLUG_META[k.slice(9)]?.name || k);
  if (k.startsWith('port_'))     return 'Portfolio · ' + k.split('_').slice(2).join('_');
  return k;
}

async function generateReport() {
  const selected = state._report_sections;
  if (!selected || selected.size === 0) return;

  showToast('Gerando relatório…');

  // If narrative is requested, pre-fetch it now (async)
  let narrativeData = null;
  if (selected.has('narrative') && DB.views.length > 0 && DB.settings.gemini_api_key) {
    try {
      narrativeData = await generateNarrativeForReport();
    } catch (err) {
      console.warn('Narrative generation failed:', err);
      narrativeData = { bull_case: 'Narrativa não pôde ser gerada (erro na API).', bear_case: '' };
    }
  }

  const container = document.getElementById('print-report');
  container.innerHTML = buildPrintHTML(selected, narrativeData);

  // Wait for layout + fonts, then trigger print
  await new Promise(r => setTimeout(r, 300));
  window.print();
}

async function generateNarrativeForReport() {
  const apiKey = DB.settings.gemini_api_key;
  if (!apiKey || DB.views.length === 0) return null;

  // Build consensus snapshot for prompt
  const consensus = [];
  for (const slug of ALL_SLUGS) {
    const c = computeConsensus(slug);
    if (!c) continue;
    consensus.push({
      topic: SLUG_META[slug].name,
      stance: c.stance,
      conviction: c.conviction,
      managers_covering: c.count,
    });
  }

  const prompt = `You are a senior macro strategist writing the executive narrative for an institutional market intelligence report.

Given the consensus data below (aggregated stances across ${MANAGERS.length} tracked asset managers), write TWO concise narrative paragraphs in English:

1. **Bull Case** — the dominant constructive reading
2. **Bear Case** — the main dissenting concerns

Style: institutional, measured (Financial Times editorial tone). 4-6 sentences per case. Flowing prose, no bullet points. No hedging language ("it seems", "might"). Cite specific asset classes and stances.

Output JSON only:
{
  "bull_case": "...",
  "bear_case": "..."
}

Consensus data:
${JSON.stringify(consensus, null, 2)}`;

  const result = await callGeminiRaw(prompt, apiKey, () => {});
  return result;
}

function buildPrintHTML(selected, narrativeData) {
  const title = state._report_title || 'Market Intelligence Report';
  const period = state._report_period || '';
  const today = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

  let html = '';
  let sectionNum = 0;

  // Cover
  if (selected.has('cover')) {
    html += `<div class="print-cover">
      <div class="print-brand">Aegir · Intel</div>
      <h1>${escapeHtml(title.split(' ').slice(0, -1).join(' ') || title)} <em>${escapeHtml(title.split(' ').slice(-1)[0] || '')}</em></h1>
      <div class="print-subtitle">${escapeHtml(period)}</div>
      <div class="print-meta">
        Gerado em ${today}<br>
        ${DB.reports.length} relatórios ingeridos · ${DB.views.length} visões extraídas<br>
        ${MANAGERS.length} gestoras monitoradas
      </div>
    </div>`;
  }

  // Executive Summary
  if (selected.has('exec_summary')) {
    sectionNum++;
    const consensuses = [...ALL_SLUGS].map(s => ({ slug: s, c: computeConsensus(s) })).filter(x => x.c);
    const topConv = consensuses.sort((a, b) => b.c.conviction - a.c.conviction).slice(0, 3);
    const changes30 = getRecentChanges(30);
    const up = changes30.filter(c => c.direction === 'upgrade').length;
    const down = changes30.filter(c => c.direction === 'downgrade').length;

    html += `<div class="print-section page-break"><div class="print-kicker">Section ${String(sectionNum).padStart(2, '0')}</div>
      <h2>Executive Summary</h2>
      <div class="p-grid">
        <div class="p-kpi"><div class="p-kpi-label">Views Totais</div><div class="p-kpi-value">${DB.views.length}</div></div>
        <div class="p-kpi"><div class="p-kpi-label">Gestoras Monitoradas</div><div class="p-kpi-value">${MANAGERS.length}</div></div>
        <div class="p-kpi"><div class="p-kpi-label">Upgrades (30d)</div><div class="p-kpi-value">${up}</div></div>
        <div class="p-kpi"><div class="p-kpi-label">Downgrades (30d)</div><div class="p-kpi-value">${down}</div></div>
      </div>
      <h3>Maior Convicção</h3>
      <table>
        <thead><tr><th>Tópico</th><th>Stance</th><th>Convicção</th><th>Gestoras</th></tr></thead>
        <tbody>
          ${topConv.map(x => `<tr>
            <td>${escapeHtml(SLUG_META[x.slug].name)}</td>
            <td><span class="p-stance">${x.c.stance}</span></td>
            <td>${Math.round(x.c.conviction * 100)}%</td>
            <td>${x.c.count}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  // Narrative (Bull/Bear)
  if (selected.has('narrative') && narrativeData) {
    sectionNum++;
    html += `<div class="print-section page-break"><div class="print-kicker">Section ${String(sectionNum).padStart(2, '0')}</div>
      <h2>Narrativa Consolidada</h2>
      <h3 style="color: #7a9b5c">Bull Case</h3>
      <p class="print-narrative">${escapeHtml(narrativeData.bull_case || '')}</p>
      <h3 style="color: #b85c5c">Bear Case</h3>
      <p class="print-narrative">${escapeHtml(narrativeData.bear_case || '')}</p>
    </div>`;
  }

  // Recent Shifts
  if (selected.has('recent_shifts')) {
    sectionNum++;
    const changes = getRecentChanges(30);
    html += `<div class="print-section page-break"><div class="print-kicker">Section ${String(sectionNum).padStart(2, '0')}</div>
      <h2>Recent Shifts (30 dias)</h2>`;
    if (changes.length === 0) {
      html += `<p>Nenhuma mudança detectada nos últimos 30 dias.</p>`;
    } else {
      html += `<table>
        <thead><tr><th>Data</th><th>Gestora</th><th>Tópico</th><th>De</th><th>Para</th><th>Nota</th></tr></thead>
        <tbody>
          ${changes.slice(0, 30).map(c => `<tr>
            <td>${c.date}</td>
            <td>${escapeHtml(MANAGER_BY_SLUG[c.manager_slug]?.short || c.manager_slug)}</td>
            <td>${escapeHtml(SLUG_META[c.taxonomy_slug]?.name || c.taxonomy_slug)}</td>
            <td>${c.from ? `<span class="p-stance">${c.from}</span>` : '<em>new</em>'}</td>
            <td><span class="p-stance">${c.to}</span></td>
            <td>${escapeHtml((c.note || '').substring(0, 100))}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    }
    html += `</div>`;
  }

  // Taxonomy sections (macro/asset/micro/thematic)
  for (const kind of ['macro', 'asset', 'micro', 'thematic']) {
    const prefix = kind + '_';
    const slugs = [...selected].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
    if (slugs.length === 0) continue;

    sectionNum++;
    const kindLabel = { macro: 'Macro View', asset: 'Assets View', micro: 'MicroAssets View', thematic: 'Thematic View' }[kind];
    html += `<div class="print-section page-break"><div class="print-kicker">Section ${String(sectionNum).padStart(2, '0')}</div>
      <h2>${kindLabel}</h2>`;

    for (const slug of slugs) {
      const meta = SLUG_META[slug];
      if (!meta) continue;
      const views = Object.values(getLatestViews(slug));
      const c = computeConsensus(slug);

      html += `<div class="no-break" style="margin-top: 28px">
        <h3>${meta.flag ? meta.flag + ' ' : ''}${escapeHtml(meta.name)}</h3>
        ${c ? `<p><strong>Consenso:</strong> <span class="p-stance">${c.stance}</span> · ${Math.round(c.conviction * 100)}% convicção · ${c.count} gestoras</p>` : '<p><em>Sem visões extraídas.</em></p>'}
        ${views.length > 0 ? `<table>
          <thead><tr><th>Gestora</th><th>Stance</th><th>Tese</th><th>Data</th></tr></thead>
          <tbody>
            ${views.map(v => `<tr>
              <td>${escapeHtml(MANAGER_BY_SLUG[v.manager_slug]?.short || v.manager_slug)}</td>
              <td><span class="p-stance">${v.stance}</span></td>
              <td class="p-view-thesis">${escapeHtml((v.thesis_summary || '').substring(0, 300))}</td>
              <td>${v.publication_date}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}
      </div>`;
    }
    html += `</div>`;
  }

  // Portfolios
  const portKeys = [...selected].filter(k => k.startsWith('port_'));
  if (portKeys.length > 0) {
    sectionNum++;
    html += `<div class="print-section page-break"><div class="print-kicker">Section ${String(sectionNum).padStart(2, '0')}</div>
      <h2>Portfolios</h2>`;

    for (const key of portKeys) {
      const [, kind, ...rest] = key.split('_');
      const pid = rest.join('_');
      const p = DB.portfolios?.[kind]?.find(x => x.id === pid);
      if (!p) continue;
      const total = p.allocation.reduce((a, b) => a + Number(b.weight || 0), 0);

      html += `<div class="no-break" style="margin-top: 28px">
        <h3>${escapeHtml(p.name)} <span style="font-size: 12px; color: #888; font-family: 'JetBrains Mono'">· ${kind}</span></h3>
        <p><em>${escapeHtml(p.description || '')}</em></p>
        ${p.risk_level ? `<p style="font-family: 'JetBrains Mono'; font-size: 11px; color: #666">Risk: ${escapeHtml(p.risk_level)} · Target: ${escapeHtml(p.target_return || '—')} · Vol: ${escapeHtml(p.target_vol || '—')}</p>` : ''}
        <table>
          <thead><tr><th>Classe</th><th>Peso %</th><th>Consenso</th></tr></thead>
          <tbody>
            ${p.allocation.map(a => {
              const cc = computeConsensus(a.slug);
              return `<tr>
                <td><span style="display:inline-block;width:8px;height:8px;background:${a.color};margin-right:8px;vertical-align:middle"></span>${escapeHtml(SLUG_META[a.slug]?.name || a.slug)}</td>
                <td>${a.weight}%</td>
                <td>${cc ? `<span class="p-stance">${cc.stance}</span>` : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot><tr><td><strong>Total</strong></td><td><strong>${total.toFixed(1)}%</strong></td><td></td></tr></tfoot>
        </table>
      </div>`;
    }
    html += `</div>`;
  }

  // Appendix
  if (selected.has('appendix_sources')) {
    sectionNum++;
    html += `<div class="print-section page-break"><div class="print-kicker">Section ${String(sectionNum).padStart(2, '0')}</div>
      <h2>Appendix — Fontes</h2>
      <p>Lista dos relatórios que alimentaram esta análise.</p>
      <table class="p-appendix">
        <thead><tr><th>Data</th><th>Gestora</th><th>Título</th><th>Tipo</th><th>Páginas</th><th>Views</th></tr></thead>
        <tbody>
          ${DB.reports.slice().sort((a,b) => new Date(b.publication_date) - new Date(a.publication_date)).map(r => {
            const views = DB.views.filter(v => v.report_id === r.id).length;
            return `<tr>
              <td>${r.publication_date}</td>
              <td>${escapeHtml(MANAGER_BY_SLUG[r.manager_slug]?.short || r.manager_slug)}</td>
              <td>${escapeHtml(r.title || '')}</td>
              <td>${escapeHtml(r.report_type)}</td>
              <td>${r.page_count || '—'}</td>
              <td>${views}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  html += `<div class="p-footer">Aegir · Intel — Market Intelligence Platform · Confidential</div>`;

  return html;
}
// ====== securities.js ======


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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Finnhub API key inválida');
      if (res.status === 429) throw new Error('Limite de requisições atingido (60/min).');
      if (res.status === 403) throw new Error('Dado não disponível no free tier');
      const text = await res.text();
      throw new Error(`Finnhub ${res.status}: ${text.substring(0, 150)}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Finnhub timeout (10s)');
    throw err;
  }
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
  // Timeout: abort after 10s to prevent hanging
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 402) {
        throw new Error('brapi requer token para esse ticker. Configure em Settings.');
      }
      throw new Error(`brapi ${res.status}: ${text.substring(0, 150)}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('brapi timeout (10s)');
    throw err;
  }
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
        h('button', {
          class: 'btn-secondary',
          onClick: () => generateStockStory(data, rating),
        }, '↓ Stock Story (.md)'),
        getPortfolios().length > 0 && h('button', {
          class: 'btn-secondary',
          onClick: () => {
            const portfolios = getPortfolios();
            if (portfolios.length === 1) {
              addPosition(portfolios[0].id, {
                ticker, name: profile.name || ticker,
                asset_class: data.isETF ? 'rv' : (isBrazilianTicker(ticker) ? 'rv' : 'rv'),
                sub_class: isBrazilianTicker(ticker) ? 'acao_br' : 'acao_us',
                target_weight: 5,
              });
            } else {
              state._port_picker = { ticker, name: profile.name || ticker };
              render();
            }
          },
        }, '+ Portfólio'),
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

    // Portfolio picker (shown when user clicks "+ Portfólio" and has multiple portfolios)
    state._port_picker && state._port_picker.ticker === ticker && h('div', {
      class: 'card', style: { padding: '14px', marginBottom: '16px', borderTop: '2px solid var(--amber)' },
    }, [
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--amber)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.15em' } },
        `Adicionar ${ticker} a qual portfólio?`),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
        ...getPortfolios().map(p => h('button', {
          class: 'btn-secondary', style: { fontSize: '12px' },
          onClick: () => {
            addPosition(p.id, {
              ticker: state._port_picker.ticker,
              name: state._port_picker.name,
              asset_class: isBrazilianTicker(ticker) ? 'rv' : 'rv',
              sub_class: isBrazilianTicker(ticker) ? 'acao_br' : 'acao_us',
              target_weight: 5,
            });
            state._port_picker = null;
            render();
          },
        }, p.name)),
        h('button', { class: 'btn-secondary', style: { fontSize: '12px', color: 'var(--text-faint)' },
          onClick: () => { state._port_picker = null; render(); },
        }, 'Cancelar'),
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
/* ============================================================
   28. PORTFOLIO BUILDER
   ============================================================ */

const ASSET_CLASSES = {
  rf:  { label: 'Renda Fixa',     color: '#7a8aa5' },
  rv:  { label: 'Renda Variável', color: '#7a9b5c' },
  re:  { label: 'Real Estate',    color: '#d4a574' },
  alt: { label: 'Alternativos',   color: '#a57a9b' },
  caixa: { label: 'Caixa',        color: '#6a6258' },
};

const SUB_CLASSES = {
  // RF
  govt_br:    { label: 'Tesouro Direto',     class: 'rf' },
  cdi:        { label: 'CDI / LCI / LCA',    class: 'rf' },
  cri:        { label: 'CRI',                class: 'rf' },
  cra:        { label: 'CRA',                class: 'rf' },
  debenture:  { label: 'Debênture',          class: 'rf' },
  ig_br:      { label: 'IG Brasil',          class: 'rf' },
  hy_br:      { label: 'HY Brasil',          class: 'rf' },
  govt_us:    { label: 'US Treasuries',       class: 'rf' },
  ig_us:      { label: 'US IG',              class: 'rf' },
  hy_us:      { label: 'US HY',             class: 'rf' },
  // RV
  acao_br:    { label: 'Ação BR',            class: 'rv' },
  acao_us:    { label: 'Ação US',            class: 'rv' },
  etf_br:     { label: 'ETF BR',             class: 'rv' },
  etf_us:     { label: 'ETF US',             class: 'rv' },
  // RE
  fii_tijolo: { label: 'FII Tijolo',         class: 're' },
  fii_papel:  { label: 'FII Papel',          class: 're' },
  fii_hibrido:{ label: 'FII Híbrido',        class: 're' },
  reit:       { label: 'REIT (US)',          class: 're' },
  // Alt
  hedge:      { label: 'Hedge Fund',         class: 'alt' },
  pe:         { label: 'Private Equity',     class: 'alt' },
  commodity:  { label: 'Commodity',          class: 'alt' },
  crypto:     { label: 'Crypto',             class: 'alt' },
  // Caixa
  cash:       { label: 'Caixa / Reserva',   class: 'caixa' },
};

const INDEXADORES = {
  cdi:       { label: 'CDI' },
  cdi_plus:  { label: 'CDI+' },
  ipca:      { label: 'IPCA+' },
  pre:       { label: 'Prefixado' },
  usd:       { label: 'USD' },
  none:      { label: 'N/A' },
};

function getPortfolios() {
  if (!Array.isArray(DB.portfolios)) DB.portfolios = [];
  return DB.portfolios;
}

function getPortfolioById(id) {
  return getPortfolios().find(p => p.id === id);
}

function createPortfolio(data) {
  const p = {
    id: 'port_' + Date.now(),
    name: data.name,
    benchmark: data.benchmark || 'CDI',
    objective: data.objective || '',
    created_at: new Date().toISOString(),
    positions: [],
  };
  getPortfolios().push(p);
  saveDB(DB);
  return p.id;
}

function deletePortfolio(id) {
  if (!confirm('Excluir portfólio? Esta ação não pode ser desfeita.')) return;
  DB.portfolios = getPortfolios().filter(p => p.id !== id);
  saveDB(DB);
  state._active_portfolio = null;
  render();
}

function addPosition(portfolioId, pos) {
  const p = getPortfolioById(portfolioId);
  if (!p) return;
  // Check duplicate
  if (p.positions.some(x => x.ticker === pos.ticker)) {
    showToast(`${pos.ticker} já está no portfólio`, true);
    return;
  }
  p.positions.push({
    ticker: pos.ticker,
    name: pos.name || pos.ticker,
    country: pos.country || (isBrazilianTicker(pos.ticker) ? 'BR' : 'US'),
    asset_class: pos.asset_class || 'rv',
    sub_class: pos.sub_class || 'acao_br',
    indexador: pos.indexador || 'none',
    target_weight: pos.target_weight || 0,
    avg_cost: pos.avg_cost || null,
    current_shares: pos.current_shares || null,
    notes: pos.notes || '',
    added_at: new Date().toISOString(),
  });
  saveDB(DB);
  showToast(`${pos.ticker} adicionado ao portfólio`);
  render();
}

function removePosition(portfolioId, ticker) {
  const p = getPortfolioById(portfolioId);
  if (!p) return;
  p.positions = p.positions.filter(x => x.ticker !== ticker);
  saveDB(DB);
  render();
}

function updatePosition(portfolioId, ticker, updates) {
  const p = getPortfolioById(portfolioId);
  if (!p) return;
  const pos = p.positions.find(x => x.ticker === ticker);
  if (!pos) return;
  Object.assign(pos, updates);
  saveDB(DB);
}

/* ---------- Portfolio Computations ---------- */

function computePortfolioStats(portfolio) {
  const positions = portfolio.positions || [];
  const totalWeight = positions.reduce((a, p) => a + (p.target_weight || 0), 0);

  // By asset class
  const byClass = {};
  for (const cls of Object.keys(ASSET_CLASSES)) byClass[cls] = { weight: 0, count: 0, positions: [] };
  for (const pos of positions) {
    const cls = pos.asset_class || 'rv';
    if (!byClass[cls]) byClass[cls] = { weight: 0, count: 0, positions: [] };
    byClass[cls].weight += pos.target_weight || 0;
    byClass[cls].count++;
    byClass[cls].positions.push(pos);
  }

  // By sub_class
  const bySub = {};
  for (const pos of positions) {
    const sc = pos.sub_class || 'other';
    if (!bySub[sc]) bySub[sc] = { weight: 0, count: 0 };
    bySub[sc].weight += pos.target_weight || 0;
    bySub[sc].count++;
  }

  // By indexador
  const byIndexador = {};
  for (const pos of positions) {
    const idx = pos.indexador || 'none';
    if (!byIndexador[idx]) byIndexador[idx] = { weight: 0, count: 0 };
    byIndexador[idx].weight += pos.target_weight || 0;
    byIndexador[idx].count++;
  }

  // By country
  const byCountry = {};
  for (const pos of positions) {
    const c = pos.country || '?';
    if (!byCountry[c]) byCountry[c] = { weight: 0, count: 0 };
    byCountry[c].weight += pos.target_weight || 0;
    byCountry[c].count++;
  }

  // Concentration risk (Herfindahl)
  const weights = positions.map(p => (p.target_weight || 0) / Math.max(1, totalWeight));
  const hhi = weights.reduce((a, w) => a + w * w, 0);
  const top5 = [...positions].sort((a, b) => (b.target_weight || 0) - (a.target_weight || 0)).slice(0, 5);
  const top5Weight = top5.reduce((a, p) => a + (p.target_weight || 0), 0);

  return { totalWeight, byClass, bySub, byIndexador, byCountry, hhi, top5, top5Weight, positionCount: positions.length };
}

/* ---------- Render: Portfolio List ---------- */

function renderPortfolios() {
  const portfolios = getPortfolios();
  const activeId = state._active_portfolio;

  if (activeId) {
    const p = getPortfolioById(activeId);
    if (p) return renderPortfolioDetail(p);
  }

  return h('div', { class: 'content fade-up' }, [
    pageHead('Securities · Portfolios', 'Portfolio <em>Builder</em>',
      'Construa e monitore portfólios de alocação. Defina pesos-alvo, classifique por classe/subclasse/indexador, e acompanhe concentração e rebalanceamento.'),

    h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' } }, [
      h('button', { class: 'btn-primary', onClick: () => {
        state._new_portfolio = true;
        render();
      }}, '+ Novo Portfólio'),
    ]),

    // Create form
    state._new_portfolio && h('div', { class: 'card', style: { padding: '20px', marginBottom: '20px', borderTop: '3px solid var(--amber)' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '16px' } }, 'Criar novo portfólio'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 150px 1fr', gap: '12px', alignItems: 'end' } }, [
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Nome'),
          h('input', { class: 'form-field-input', type: 'text', id: 'new-port-name', placeholder: 'Ex: Crédito Privado - Conservador' }),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Benchmark'),
          h('select', { class: 'form-field-select', id: 'new-port-bench' },
            ['CDI', 'IPCA+5%', 'IBOV', 'IFIX', 'S&P 500', 'Custom'].map(b => h('option', { value: b }, b))
          ),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Objetivo'),
          h('input', { class: 'form-field-input', type: 'text', id: 'new-port-obj', placeholder: 'Ex: Preservação com yield acima do CDI' }),
        ]),
      ]),
      h('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } }, [
        h('button', { class: 'btn-primary', onClick: () => {
          const name = document.getElementById('new-port-name')?.value?.trim();
          if (!name) { showToast('Nome é obrigatório', true); return; }
          const id = createPortfolio({
            name,
            benchmark: document.getElementById('new-port-bench')?.value || 'CDI',
            objective: document.getElementById('new-port-obj')?.value?.trim() || '',
          });
          state._new_portfolio = false;
          state._active_portfolio = id;
          render();
        }}, 'Criar'),
        h('button', { class: 'btn-secondary', onClick: () => { state._new_portfolio = false; render(); }}, 'Cancelar'),
      ]),
    ]),

    portfolios.length === 0 && !state._new_portfolio
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum portfólio criado'),
          h('p', { class: 'empty-desc' }, 'Crie seu primeiro portfólio para começar a organizar sua alocação.'),
        ])
      : h('div', { class: 'grid-3' }, portfolios.map(p => {
          const stats = computePortfolioStats(p);
          return h('div', {
            class: 'card card-hover',
            style: { cursor: 'pointer', textAlign: 'left', display: 'block', width: '100%' },
            onClick: () => { state._active_portfolio = p.id; render(); },
          }, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '4px' } }, p.name),
            h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginBottom: '12px' } },
              `${p.benchmark} · ${stats.positionCount} posições · criado ${new Date(p.created_at).toLocaleDateString('pt-BR')}`),
            p.objective && h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '12px' } }, p.objective),

            // Mini allocation bar
            stats.positionCount > 0 && h('div', { style: { display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' } },
              Object.entries(stats.byClass)
                .filter(([_, v]) => v.weight > 0)
                .sort((a, b) => b[1].weight - a[1].weight)
                .map(([cls, v]) => h('div', {
                  style: { width: `${(v.weight / Math.max(1, stats.totalWeight)) * 100}%`, background: ASSET_CLASSES[cls]?.color || '#666' },
                  title: `${ASSET_CLASSES[cls]?.label}: ${v.weight.toFixed(1)}%`,
                }))
            ),

            stats.positionCount > 0 && h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } },
              Object.entries(stats.byClass)
                .filter(([_, v]) => v.weight > 0)
                .map(([cls, v]) => h('span', {
                  class: 'mono', style: { fontSize: '9px', color: ASSET_CLASSES[cls]?.color || 'var(--text-faint)' }
                }, `${ASSET_CLASSES[cls]?.label}: ${v.weight.toFixed(1)}%`))
            ),

            h('div', { class: 'mono', style: { fontSize: '10px', color: stats.totalWeight > 100.5 ? 'var(--red)' : stats.totalWeight < 99.5 && stats.totalWeight > 0 ? 'var(--amber)' : 'var(--text-faint)', marginTop: '8px' } },
              `Peso total: ${stats.totalWeight.toFixed(1)}%${stats.totalWeight > 100.5 ? ' ⚠ overweight' : stats.totalWeight < 99.5 && stats.totalWeight > 0 ? ' ⚠ underweight' : ''}`),
          ]);
        })),
  ]);
}

/* ---------- Render: Portfolio Detail ---------- */

function renderPortfolioDetail(portfolio) {
  const stats = computePortfolioStats(portfolio);
  const positions = portfolio.positions || [];

  return h('div', { class: 'content fade-up' }, [
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      h('button', { class: 'back-btn', style: { margin: 0 }, onClick: () => { state._active_portfolio = null; render(); } }, [
        h('span', {}, '←'), h('span', {}, 'Todos os portfólios'),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-secondary', style: { color: 'var(--red)', fontSize: '11px' }, onClick: () => deletePortfolio(portfolio.id) }, 'Excluir'),
      ]),
    ]),

    h('div', { style: { marginBottom: '24px' } }, [
      h('h1', { class: 'page-title' }, portfolio.name),
      h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } },
        `Benchmark: ${portfolio.benchmark} · ${stats.positionCount} posições · Peso total: ${stats.totalWeight.toFixed(1)}%`),
      portfolio.objective && h('div', { style: { fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px' } }, portfolio.objective),
    ]),

    // KPIs
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' } }, [
      renderPortKPI('Posições', String(stats.positionCount), ''),
      renderPortKPI('Peso Total', `${stats.totalWeight.toFixed(1)}%`, stats.totalWeight > 100.5 ? '⚠ over' : stats.totalWeight < 99.5 && stats.totalWeight > 0 ? '⚠ under' : 'OK'),
      renderPortKPI('HHI (concentração)', stats.hhi > 0 ? (stats.hhi * 10000).toFixed(0) : '—', stats.hhi > 0.25 ? 'Concentrado' : stats.hhi > 0.15 ? 'Moderado' : 'Diversificado'),
      renderPortKPI('Top 5 Concentração', `${stats.top5Weight.toFixed(1)}%`, stats.top5.map(p => p.ticker).join(', ')),
    ]),

    // Allocation breakdown
    stats.positionCount > 0 && h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' } }, [
      renderAllocationChart('Por Classe', stats.byClass, ASSET_CLASSES),
      renderAllocationChart('Por Sub-classe', stats.bySub, SUB_CLASSES),
      renderAllocationChart('Por Indexador', stats.byIndexador, INDEXADORES),
    ]),

    // Add position form
    renderAddPositionForm(portfolio.id),

    // Positions table
    h('div', { style: { marginTop: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Posições (${positions.length})`),
      positions.length === 0
        ? h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' } }, 'Adicione posições usando o formulário acima.')
        : h('div', { class: 'card', style: { padding: 0, overflow: 'hidden' } }, [
            h('div', {
              style: { display: 'grid', gridTemplateColumns: '90px 1fr 100px 90px 80px 80px 40px', gap: '8px', padding: '8px 14px', background: 'var(--bg-3)', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' },
            }, [
              h('span', {}, 'Ticker'), h('span', {}, 'Nome'),
              h('span', {}, 'Classe'), h('span', {}, 'Subclasse'),
              h('span', { style: { textAlign: 'right' } }, 'Peso %'),
              h('span', { style: { textAlign: 'right' } }, 'Indexador'),
              h('span', {}),
            ]),
            ...positions
              .sort((a, b) => (b.target_weight || 0) - (a.target_weight || 0))
              .map(pos => {
                const cls = ASSET_CLASSES[pos.asset_class] || ASSET_CLASSES.rv;
                const sub = SUB_CLASSES[pos.sub_class] || { label: pos.sub_class };
                const idx = INDEXADORES[pos.indexador] || { label: pos.indexador };
                return h('div', {
                  style: {
                    display: 'grid', gridTemplateColumns: '90px 1fr 100px 90px 80px 80px 40px',
                    gap: '8px', padding: '10px 14px', borderTop: '1px solid var(--border)',
                    alignItems: 'center', fontSize: '12px',
                  },
                }, [
                  h('span', {
                    class: 'mono', style: { fontWeight: '600', cursor: 'pointer', color: 'var(--amber)' },
                    onClick: () => setDetail('security', pos.ticker),
                  }, pos.ticker),
                  h('span', { style: { fontFamily: 'Fraunces, serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, pos.name),
                  h('span', { style: { color: cls.color, fontSize: '10px' } }, cls.label),
                  h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, sub.label),
                  h('input', {
                    type: 'number', step: '0.1', min: '0', max: '100',
                    value: pos.target_weight || 0,
                    style: { width: '70px', textAlign: 'right', padding: '4px 6px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' },
                    onchange: (e) => { updatePosition(portfolio.id, pos.ticker, { target_weight: parseFloat(e.target.value) || 0 }); render(); },
                  }),
                  h('span', { class: 'mono', style: { textAlign: 'right', fontSize: '10px', color: 'var(--text-faint)' } }, idx.label),
                  h('button', {
                    style: { color: 'var(--text-faint)', fontSize: '14px', cursor: 'pointer', background: 'none', border: 'none', padding: '2px' },
                    onClick: () => { removePosition(portfolio.id, pos.ticker); },
                    title: 'Remover posição',
                  }, '×'),
                ]);
              }),
          ]),
    ]),
  ]);
}

function renderPortKPI(label, value, sub) {
  return h('div', { class: 'card', style: { padding: '14px 16px' } }, [
    h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-faint)', marginBottom: '4px' } }, label),
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '22px', lineHeight: '1.1' } }, value),
    sub && h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sub),
  ]);
}

function renderAllocationChart(title, data, metadata) {
  const entries = Object.entries(data)
    .filter(([_, v]) => v.weight > 0)
    .sort((a, b) => b[1].weight - a[1].weight);
  const total = entries.reduce((a, [_, v]) => a + v.weight, 0) || 1;

  return h('div', { class: 'card', style: { padding: '16px' } }, [
    h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-faint)', marginBottom: '12px' } }, title),
    // Stacked bar
    h('div', { style: { display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px', background: 'var(--bg)' } },
      entries.map(([key, v]) => h('div', {
        style: { width: `${(v.weight / total) * 100}%`, background: metadata[key]?.color || '#666', minWidth: '2px' },
        title: `${metadata[key]?.label || key}: ${v.weight.toFixed(1)}%`,
      }))
    ),
    // Legend
    ...entries.map(([key, v]) => h('div', {
      style: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px' },
    }, [
      h('span', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
        h('span', { style: { width: '8px', height: '8px', borderRadius: '2px', background: metadata[key]?.color || '#666', display: 'inline-block' } }),
        h('span', { style: { color: 'var(--text-muted)' } }, metadata[key]?.label || key),
      ]),
      h('span', { class: 'mono', style: { color: 'var(--text)' } }, `${v.weight.toFixed(1)}%`),
    ])),
  ]);
}

function renderAddPositionForm(portfolioId) {
  return h('div', { class: 'card', style: { padding: '16px', borderTop: '2px solid var(--amber)' } }, [
    h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, '+ Adicionar posição'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '120px 1fr 130px 130px 100px 90px auto', gap: '8px', alignItems: 'end' } }, [
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Ticker'),
        h('input', { class: 'form-field-input', type: 'text', id: 'pos-ticker', placeholder: 'KNCR11' }),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Nome'),
        h('input', { class: 'form-field-input', type: 'text', id: 'pos-name', placeholder: 'Kinea Rendimentos' }),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Classe'),
        h('select', { class: 'form-field-select', id: 'pos-class', onchange: () => render() },
          Object.entries(ASSET_CLASSES).map(([k, v]) => h('option', { value: k }, v.label))
        ),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Sub-classe'),
        h('select', { class: 'form-field-select', id: 'pos-sub' },
          Object.entries(SUB_CLASSES).map(([k, v]) => h('option', { value: k }, v.label))
        ),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Indexador'),
        h('select', { class: 'form-field-select', id: 'pos-idx' },
          Object.entries(INDEXADORES).map(([k, v]) => h('option', { value: k }, v.label))
        ),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Peso %'),
        h('input', { class: 'form-field-input', type: 'number', id: 'pos-weight', step: '0.5', value: '5', style: { width: '80px' } }),
      ]),
      h('button', { class: 'btn-primary', onClick: () => {
        const ticker = document.getElementById('pos-ticker')?.value?.trim()?.toUpperCase();
        const name = document.getElementById('pos-name')?.value?.trim();
        const asset_class = document.getElementById('pos-class')?.value;
        const sub_class = document.getElementById('pos-sub')?.value;
        const indexador = document.getElementById('pos-idx')?.value;
        const target_weight = parseFloat(document.getElementById('pos-weight')?.value) || 0;
        if (!ticker) { showToast('Ticker é obrigatório', true); return; }
        addPosition(portfolioId, { ticker, name: name || ticker, asset_class, sub_class, indexador, target_weight });
      }}, 'Adicionar'),
    ]),
  ]);
}

/* ============================================================
   29. STOCK STORY — Template Export (Data-driven, no AI)
   ============================================================ */

function generateStockStory(data, rating) {
  const { profile, quote, metrics, recommendations, priceTarget, news, peers } = data;
  const m = metrics?.metric || {};
  const fund = getFundamentalMetrics(m);
  const credit = getCreditMetrics(m);
  const isBR = data.source === 'brapi';
  const ticker = data.ticker;
  const date = new Date().toLocaleDateString('pt-BR');
  const curr = profile?.currency || (isBR ? 'BRL' : 'USD');

  const nd = (v, d = 2) => v != null && !isNaN(v) ? Number(v).toFixed(d) : 'N/D';
  const pct = (v) => v != null && !isNaN(v) ? (Number(v) * 100).toFixed(2) + '%' : 'N/D';
  const money = (v) => v != null ? formatCurrency(v, curr) : 'N/D';

  // ====== Build assessments ======

  // Valuation assessment
  const valSignals = [];
  let valScore = 0, valCount = 0;
  if (fund.pe != null) {
    valCount++;
    if (fund.pe < 10) { valSignals.push(`P/E de ${nd(fund.pe)} — abaixo de 10x, barato em termos absolutos`); valScore += 2; }
    else if (fund.pe < 15) { valSignals.push(`P/E de ${nd(fund.pe)} — razoável, abaixo da média histórica de mercado`); valScore += 1; }
    else if (fund.pe < 25) { valSignals.push(`P/E de ${nd(fund.pe)} — em linha com a média de mercado`); }
    else { valSignals.push(`P/E de ${nd(fund.pe)} — elevado, precifica crescimento acelerado`); valScore -= 1; }
  }
  if (fund.pb != null) {
    valCount++;
    if (fund.pb < 1) { valSignals.push(`P/B de ${nd(fund.pb)} — negocia abaixo do valor patrimonial`); valScore += 2; }
    else if (fund.pb < 3) { valSignals.push(`P/B de ${nd(fund.pb)} — faixa razoável`); valScore += 1; }
    else { valSignals.push(`P/B de ${nd(fund.pb)} — premium sobre o patrimônio`); valScore -= 1; }
  }
  if (fund.evEbitda != null) {
    valCount++;
    if (fund.evEbitda < 8) { valSignals.push(`EV/EBITDA de ${nd(fund.evEbitda)} — valuation atrativo`); valScore += 2; }
    else if (fund.evEbitda < 14) { valSignals.push(`EV/EBITDA de ${nd(fund.evEbitda)} — faixa justa`); valScore += 1; }
    else { valSignals.push(`EV/EBITDA de ${nd(fund.evEbitda)} — premium`); valScore -= 1; }
  }
  if (fund.dividendYield != null && fund.dividendYield > 0) {
    const dy = fund.dividendYield * 100;
    if (dy > 5) valSignals.push(`Dividend Yield de ${dy.toFixed(2)}% — yield atrativo, acima da renda fixa curta`);
    else if (dy > 2) valSignals.push(`Dividend Yield de ${dy.toFixed(2)}% — yield moderado`);
    else valSignals.push(`Dividend Yield de ${dy.toFixed(2)}% — yield baixo, empresa prioriza crescimento`);
  }
  const valVerdict = valCount === 0 ? 'Indeterminado' : valScore >= 3 ? 'Barato' : valScore >= 1 ? 'Justo' : 'Caro';

  // Quality assessment
  const qualSignals = [];
  let qualScore = 0, qualCount = 0;
  if (fund.netMargin != null) {
    qualCount++;
    const nm = fund.netMargin * 100;
    if (nm > 20) { qualSignals.push(`Margem líquida de ${nm.toFixed(1)}% — excelente, negócio altamente rentável`); qualScore += 2; }
    else if (nm > 10) { qualSignals.push(`Margem líquida de ${nm.toFixed(1)}% — saudável`); qualScore += 1; }
    else if (nm > 0) { qualSignals.push(`Margem líquida de ${nm.toFixed(1)}% — positiva, mas apertada`); }
    else { qualSignals.push(`Margem líquida de ${nm.toFixed(1)}% — negativa, empresa não lucrativa`); qualScore -= 2; }
  }
  if (fund.roe != null) {
    qualCount++;
    const roe = fund.roe * 100;
    if (roe > 20) { qualSignals.push(`ROE de ${roe.toFixed(1)}% — retorno sobre patrimônio forte`); qualScore += 2; }
    else if (roe > 10) { qualSignals.push(`ROE de ${roe.toFixed(1)}% — adequado`); qualScore += 1; }
    else if (roe > 0) { qualSignals.push(`ROE de ${roe.toFixed(1)}% — baixo, capital sub-utilizado`); }
    else { qualSignals.push(`ROE de ${roe.toFixed(1)}% — negativo`); qualScore -= 2; }
  }
  if (fund.grossMargin != null) {
    qualCount++;
    const gm = fund.grossMargin * 100;
    if (gm > 50) { qualSignals.push(`Margem bruta de ${gm.toFixed(1)}% — indica pricing power e/ou produto diferenciado`); qualScore += 1; }
    else if (gm > 30) { qualSignals.push(`Margem bruta de ${gm.toFixed(1)}% — em linha com média`); }
    else { qualSignals.push(`Margem bruta de ${gm.toFixed(1)}% — estreita, negócio commoditizado ou de baixa margem`); qualScore -= 1; }
  }
  if (fund.revGrowth5Y != null) {
    const rg = fund.revGrowth5Y * 100;
    if (rg > 15) qualSignals.push(`Crescimento de receita de ${rg.toFixed(1)}% em 5 anos — forte expansão`);
    else if (rg > 5) qualSignals.push(`Crescimento de receita de ${rg.toFixed(1)}% em 5 anos — moderado`);
    else if (rg > 0) qualSignals.push(`Crescimento de receita de ${rg.toFixed(1)}% em 5 anos — lento`);
    else if (rg != null) qualSignals.push(`Receita contraindo ${rg.toFixed(1)}% em 5 anos — tendência preocupante`);
  }
  const qualVerdict = qualCount === 0 ? 'Indeterminado' : qualScore >= 3 ? 'Alta Qualidade' : qualScore >= 1 ? 'Qualidade Adequada' : 'Qualidade Baixa';

  // Financial health
  const healthSignals = [];
  let healthScore = 0, healthCount = 0;
  if (credit.debtToEquity != null) {
    healthCount++;
    if (credit.debtToEquity < 0.5) { healthSignals.push(`Debt/Equity de ${nd(credit.debtToEquity)} — conservador, balanço forte`); healthScore += 2; }
    else if (credit.debtToEquity < 1.5) { healthSignals.push(`Debt/Equity de ${nd(credit.debtToEquity)} — alavancagem moderada`); healthScore += 1; }
    else { healthSignals.push(`Debt/Equity de ${nd(credit.debtToEquity)} — alavancagem elevada, risco de balanço`); healthScore -= 1; }
  }
  if (credit.currentRatio != null) {
    healthCount++;
    if (credit.currentRatio > 2) { healthSignals.push(`Current Ratio de ${nd(credit.currentRatio)} — liquidez confortável`); healthScore += 1; }
    else if (credit.currentRatio > 1) { healthSignals.push(`Current Ratio de ${nd(credit.currentRatio)} — liquidez adequada`); }
    else { healthSignals.push(`Current Ratio de ${nd(credit.currentRatio)} — liquidez apertada, risco de working capital`); healthScore -= 1; }
  }
  if (credit.interestCoverage != null) {
    healthCount++;
    if (credit.interestCoverage > 5) { healthSignals.push(`Interest Coverage de ${nd(credit.interestCoverage)}x — folga ampla para servir dívida`); healthScore += 1; }
    else if (credit.interestCoverage > 2) { healthSignals.push(`Interest Coverage de ${nd(credit.interestCoverage)}x — cobertura adequada`); }
    else { healthSignals.push(`Interest Coverage de ${nd(credit.interestCoverage)}x — cobertura apertada, risco de serviço de dívida`); healthScore -= 1; }
  }
  if (credit.fcfMargin != null) {
    const fcf = credit.fcfMargin * 100;
    if (fcf > 10) healthSignals.push(`FCF Margin de ${fcf.toFixed(1)}% — boa geração de caixa livre`);
    else if (fcf > 0) healthSignals.push(`FCF Margin de ${fcf.toFixed(1)}% — positiva mas modesta`);
    else healthSignals.push(`FCF Margin de ${fcf.toFixed(1)}% — negativa, empresa queima caixa`);
  }
  const healthVerdict = healthCount === 0 ? 'Indeterminado' : healthScore >= 3 ? 'Sólida' : healthScore >= 1 ? 'Adequada' : 'Frágil';

  // Analyst consensus
  let analystVerdict = 'Sem cobertura';
  let analystDetail = '';
  if (recommendations && recommendations.length > 0) {
    const latest = recommendations[0];
    const total = (latest.strongBuy || 0) + (latest.buy || 0) + (latest.hold || 0) + (latest.sell || 0) + (latest.strongSell || 0);
    const bullish = (latest.strongBuy || 0) + (latest.buy || 0);
    const bearish = (latest.sell || 0) + (latest.strongSell || 0);
    if (total > 0) {
      const bullPct = (bullish / total) * 100;
      if (bullPct > 70) analystVerdict = 'Consenso Compra';
      else if (bullPct > 40) analystVerdict = 'Misto (tendência positiva)';
      else if (bearish > bullish) analystVerdict = 'Consenso Venda';
      else analystVerdict = 'Neutro / Hold';
      analystDetail = `${total} analistas: ${bullish} compra, ${latest.hold || 0} hold, ${bearish} venda`;
      if (priceTarget?.targetMean && quote?.c) {
        const upside = ((priceTarget.targetMean / quote.c) - 1) * 100;
        analystDetail += `. Target médio ${money(priceTarget.targetMean)} (${upside >= 0 ? '+' : ''}${upside.toFixed(1)}% upside)`;
      }
    }
  }

  // ====== FINAL VERDICT ======
  const totalScore = valScore + qualScore + healthScore + (rating?.total ? (rating.total - 50) / 10 : 0);
  let finalVerdict, finalColor;
  if (totalScore >= 6) { finalVerdict = 'COMPRA — fundamentos sólidos, valuation atrativo'; finalColor = '🟢'; }
  else if (totalScore >= 3) { finalVerdict = 'COMPRA MODERADA — bons fundamentos com ressalvas'; finalColor = '🟡'; }
  else if (totalScore >= 0) { finalVerdict = 'NEUTRO — sem convicção clara para compra ou venda'; finalColor = '⚪'; }
  else if (totalScore >= -3) { finalVerdict = 'CAUTELA — fragilidades identificadas, evitar exposição nova'; finalColor = '🟠'; }
  else { finalVerdict = 'VENDA — fundamentos deteriorados, risco elevado'; finalColor = '🔴'; }

  // ====== BUILD MARKDOWN ======
  let md = '';
  md += `# ${finalColor} Stock Story: ${ticker}\n`;
  md += `**${profile?.name || ticker}** · ${date}\n\n`;
  md += `---\n\n`;

  // Executive Summary
  md += `## Sumário Executivo\n\n`;
  md += `**Veredicto: ${finalVerdict}**\n\n`;
  md += `| Dimensão | Avaliação | Detalhe |\n|---|---|---|\n`;
  md += `| Valuation | **${valVerdict}** | ${valSignals[0] || '—'} |\n`;
  md += `| Qualidade | **${qualVerdict}** | ${qualSignals[0] || '—'} |\n`;
  md += `| Saúde Financeira | **${healthVerdict}** | ${healthSignals[0] || '—'} |\n`;
  md += `| Analistas | **${analystVerdict}** | ${analystDetail || '—'} |\n`;
  md += `| Rating Proprietário | **${rating ? rating.total + '/100' : 'N/D'}** | ${rating?.total >= 70 ? 'Score forte' : rating?.total >= 50 ? 'Score mediano' : rating ? 'Score baixo' : '—'} |\n\n`;

  // Identification
  md += `## 1. Identificação\n\n`;
  md += `| Campo | Valor |\n|---|---|\n`;
  md += `| Ticker | ${ticker} |\n`;
  md += `| Nome | ${profile?.name || 'N/D'} |\n`;
  md += `| Setor | ${profile?.finnhubIndustry || 'N/D'} |\n`;
  md += `| País | ${profile?.country || (isBR ? 'Brazil' : 'N/D')} |\n`;
  md += `| Exchange | ${profile?.exchange || 'N/D'} |\n`;
  md += `| Market Cap | ${profile?.marketCapitalization ? formatMoney(profile.marketCapitalization * 1e6) : 'N/D'} |\n\n`;

  // Price
  md += `## 2. Cotação & Performance\n\n`;
  md += `| Métrica | Valor |\n|---|---|\n`;
  md += `| Preço Atual | ${money(quote?.c)} |\n`;
  md += `| Variação Dia | ${nd(quote?.dp)}% |\n`;
  md += `| 52W High | ${money(fund.fiftyTwoHigh)} |\n`;
  md += `| 52W Low | ${money(fund.fiftyTwoLow)} |\n`;
  md += `| Beta | ${nd(fund.beta)} |\n\n`;

  // Valuation narrative
  md += `## 3. Análise de Valuation\n\n`;
  md += `**Veredicto: ${valVerdict}**\n\n`;
  md += `| Múltiplo | Valor |\n|---|---|\n`;
  md += `| P/E (TTM) | ${nd(fund.pe)} |\n`;
  md += `| P/B | ${nd(fund.pb)} |\n`;
  md += `| P/S | ${nd(fund.ps)} |\n`;
  md += `| EV/EBITDA | ${nd(fund.evEbitda)} |\n`;
  md += `| Dividend Yield | ${pct(fund.dividendYield)} |\n\n`;
  if (valSignals.length > 0) {
    md += `**Leitura:**\n\n`;
    for (const s of valSignals) md += `- ${s}\n`;
    md += '\n';
  }

  // Quality narrative
  md += `## 4. Análise de Qualidade\n\n`;
  md += `**Veredicto: ${qualVerdict}**\n\n`;
  md += `| Métrica | Valor |\n|---|---|\n`;
  md += `| Margem Bruta | ${pct(fund.grossMargin)} |\n`;
  md += `| Margem Operacional | ${pct(fund.operMargin)} |\n`;
  md += `| Margem Líquida | ${pct(fund.netMargin)} |\n`;
  md += `| ROE | ${pct(fund.roe)} |\n`;
  md += `| Revenue Growth 5Y | ${pct(fund.revGrowth5Y)} |\n`;
  md += `| EPS Growth 5Y | ${pct(fund.epsGrowth5Y)} |\n\n`;
  if (qualSignals.length > 0) {
    md += `**Leitura:**\n\n`;
    for (const s of qualSignals) md += `- ${s}\n`;
    md += '\n';
  }

  // Health narrative
  md += `## 5. Saúde Financeira\n\n`;
  md += `**Veredicto: ${healthVerdict}**\n\n`;
  md += `| Métrica | Valor | Avaliação |\n|---|---|---|\n`;
  md += `| Debt/Equity | ${nd(credit.debtToEquity)} | ${credit.debtToEquity != null ? (credit.debtToEquity < 0.5 ? 'Conservador' : credit.debtToEquity < 1.5 ? 'Moderado' : 'Elevado') : '—'} |\n`;
  md += `| Current Ratio | ${nd(credit.currentRatio)} | ${credit.currentRatio != null ? (credit.currentRatio > 2 ? 'Forte' : credit.currentRatio > 1 ? 'Adequada' : 'Baixa') : '—'} |\n`;
  md += `| Interest Coverage | ${nd(credit.interestCoverage)} | ${credit.interestCoverage != null ? (credit.interestCoverage > 5 ? 'Confortável' : credit.interestCoverage > 2 ? 'Moderada' : 'Apertada') : '—'} |\n`;
  md += `| FCF Margin | ${pct(credit.fcfMargin)} | — |\n\n`;
  if (healthSignals.length > 0) {
    md += `**Leitura:**\n\n`;
    for (const s of healthSignals) md += `- ${s}\n`;
    md += '\n';
  }

  // Analysts
  md += `## 6. Consenso de Analistas\n\n`;
  md += `**Veredicto: ${analystVerdict}**\n\n`;
  if (recommendations && recommendations.length > 0) {
    const latest = recommendations[0];
    md += `| Recomendação | # |\n|---|---|\n`;
    md += `| Strong Buy | ${latest.strongBuy || 0} |\n`;
    md += `| Buy | ${latest.buy || 0} |\n`;
    md += `| Hold | ${latest.hold || 0} |\n`;
    md += `| Sell | ${latest.sell || 0} |\n`;
    md += `| Strong Sell | ${latest.strongSell || 0} |\n\n`;
    if (priceTarget?.targetMean) {
      const upside = ((priceTarget.targetMean / quote.c) - 1) * 100;
      md += `**Target Price:** Médio ${money(priceTarget.targetMean)} · Máximo ${money(priceTarget.targetHigh)} · Mínimo ${money(priceTarget.targetLow)} · Upside ${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%\n\n`;
    }
  } else {
    md += `Sem cobertura de analistas disponível.\n\n`;
  }

  // Rating
  md += `## 7. Rating Proprietário\n\n`;
  if (rating) {
    md += `**Score: ${rating.total}/100** — ${rating.total >= 70 ? 'Forte: fundamentos acima da média em múltiplas dimensões' : rating.total >= 50 ? 'Mediano: sem fragilidades graves mas sem brilho excepcional' : 'Fraco: múltiplas dimensões abaixo do aceitável'}\n\n`;
    md += `| Categoria | Score | Máx |\n|---|---|---|\n`;
    for (const cat of rating.categories || []) {
      md += `| ${cat.label} | ${cat.score} | ${cat.max} |\n`;
    }
    md += '\n';
  }

  // Final recommendation
  md += `## 8. Recomendação Final\n\n`;
  md += `### ${finalColor} ${finalVerdict}\n\n`;
  md += `**Score composto:** ${totalScore.toFixed(1)} (valuation: ${valScore}, qualidade: ${qualScore}, saúde: ${healthScore})\n\n`;
  md += `**Pontos fortes:**\n\n`;
  const strengths = [...valSignals, ...qualSignals, ...healthSignals].filter(s => s.includes('forte') || s.includes('excelente') || s.includes('atrativo') || s.includes('conservador') || s.includes('confortável') || s.includes('robusto'));
  if (strengths.length > 0) for (const s of strengths) md += `- ✅ ${s}\n`;
  else md += `- Nenhum ponto forte destacável identificado\n`;
  md += `\n**Pontos de atenção:**\n\n`;
  const risks = [...valSignals, ...qualSignals, ...healthSignals].filter(s => s.includes('elevad') || s.includes('negativ') || s.includes('apertad') || s.includes('risco') || s.includes('queima') || s.includes('contraindo'));
  if (risks.length > 0) for (const s of risks) md += `- ⚠️ ${s}\n`;
  else md += `- Nenhum risco relevante identificado nos dados disponíveis\n`;

  // Peers
  if (peers && peers.length > 0) {
    md += `\n## 9. Peers Comparáveis\n\n`;
    md += peers.slice(0, 10).join(', ') + '\n';
  }

  md += `\n---\n`;
  md += `*Stock Story gerado pelo Aegir·Intel em ${date}. Dados: ${isBR ? 'brapi.dev' : 'Finnhub'}.*\n`;
  md += `*Este relatório é baseado em regras quantitativas sobre dados públicos. Não constitui recomendação de investimento. O analista deve complementar com análise qualitativa, contexto setorial e tese proprietária.*\n`;

  // Download
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock-story-${ticker}-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Stock Story exportado: ${ticker}`);
}

// ====== macro.js ======


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
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        imob && h('button', { class: 'btn-secondary', style: { fontSize: '10px' }, onClick: () => {
          const names = Object.keys(imob).sort().join('\n');
          console.log('BCB Imob series found:\n' + names);
          alert('Séries encontradas (' + Object.keys(imob).length + '):\n\n' + names.substring(0, 2000));
        }}, 'Ver séries'),
        h('button', { class: 'btn-secondary', style: { fontSize: '10px' }, onClick: () => {
          state._bcb_imob = null; state._bcb_imob_loading = false;
          DB.bcbImobCache = null; saveDB(DB);
          render();
        }}, '↻ Atualizar'),
      ]),
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

// Series names — discovered from BCB OData API (pattern: section_detail_geo)
// _br = Brasil, _sp/_rj/etc = UF
const BCB_IMOB_SERIES = {
  // === Fontes de Recursos (tentative - need discovery for exact names) ===
  fontes_sbpe_br:                          { section: 'fontes', label: 'SBPE Estoque', unit: 'R$' },
  fontes_estoque_sbpe_br:                  { section: 'fontes', label: 'SBPE Estoque (alt)', unit: 'R$' },
  fontes_titulo_cri_br:                    { section: 'fontes', label: 'CRI Estoque', unit: 'R$' },
  fontes_titulo_lci_br:                    { section: 'fontes', label: 'LCI Estoque', unit: 'R$' },
  fontes_titulo_lh_br:                     { section: 'fontes', label: 'LH Estoque', unit: 'R$' },
  fontes_titulo_lig_br:                    { section: 'fontes', label: 'LIG Estoque', unit: 'R$' },
  // === Direcionamento (confirmed from API) ===
  direcionamento_aplicacao_imobiliario_br: { section: 'direcionamento', label: 'Aplicação — Total', unit: 'R$' },
  direcionamento_aplicacao_residencial_br: { section: 'direcionamento', label: 'Aplicação — Residencial', unit: 'R$' },
  direcionamento_aplicacao_comercial_br:   { section: 'direcionamento', label: 'Aplicação — Comercial', unit: 'R$' },
  direcionamento_aquisicao_imobiliario_br: { section: 'direcionamento', label: 'Aquisição — Total', unit: 'R$' },
  direcionamento_aquisicao_residencial_br: { section: 'direcionamento', label: 'Aquisição — Residencial', unit: 'R$' },
  direcionamento_aquisicao_comercial_br:   { section: 'direcionamento', label: 'Aquisição — Comercial', unit: 'R$' },
  direcionamento_construcao_imobiliario_br:{ section: 'direcionamento', label: 'Construção — Total', unit: 'R$' },
  direcionamento_construcao_residencial_br:{ section: 'direcionamento', label: 'Construção — Residencial', unit: 'R$' },
  direcionamento_construcao_comercial_br:  { section: 'direcionamento', label: 'Construção — Comercial', unit: 'R$' },
  direcionamento_reforma_ampliacao_imobiliario_br: { section: 'direcionamento', label: 'Reforma — Total', unit: 'R$' },
  direcionamento_reforma_ampliacao_residencial_br: { section: 'direcionamento', label: 'Reforma — Residencial', unit: 'R$' },
  direcionamento_reforma_ampliacao_comercial_br:   { section: 'direcionamento', label: 'Reforma — Comercial', unit: 'R$' },
  // === Contábil (tentative) ===
  contabil_financiamento_residencial_br:   { section: 'contabil', label: 'Financ. Residencial', unit: 'R$' },
  contabil_financiamento_comercial_br:     { section: 'contabil', label: 'Financ. Comercial', unit: 'R$' },
  contabil_bndu_imobiliario_br:            { section: 'contabil', label: 'BNDU Imobiliário', unit: 'R$' },
  // === Contratação PF — Valor (confirmed pattern from API, _br suffix) ===
  credito_contratacao_contratado_pf_sfh_br:         { section: 'contratacao_pf', label: 'PF SFH', unit: 'R$' },
  credito_contratacao_contratado_pf_fgts_br:        { section: 'contratacao_pf', label: 'PF FGTS', unit: 'R$' },
  credito_contratacao_contratado_pf_livre_br:       { section: 'contratacao_pf', label: 'PF Livre (SFI)', unit: 'R$' },
  credito_contratacao_contratado_pf_comercial_br:   { section: 'contratacao_pf', label: 'PF Comercial', unit: 'R$' },
  credito_contratacao_contratado_pf_home_equity_br: { section: 'contratacao_pf', label: 'PF Home Equity', unit: 'R$' },
  // === Contratação PF — Indexador ===
  credito_contratacao_indexador_pf_prefixado_br:    { section: 'contratacao_idx', label: 'PF Prefixado', unit: 'R$' },
  credito_contratacao_indexador_pf_ipca_br:         { section: 'contratacao_idx', label: 'PF IPCA', unit: 'R$' },
  credito_contratacao_indexador_pf_tr_br:           { section: 'contratacao_idx', label: 'PF TR', unit: 'R$' },
  credito_contratacao_indexador_pf_outros_br:       { section: 'contratacao_idx', label: 'PF Outros', unit: 'R$' },
  // === Contratação PF — Taxa ===
  credito_contratacao_taxa_pf_sfh_br:               { section: 'contratacao_taxa', label: 'Taxa PF SFH', unit: '% a.a.' },
  credito_contratacao_taxa_pf_fgts_br:              { section: 'contratacao_taxa', label: 'Taxa PF FGTS', unit: '% a.a.' },
  credito_contratacao_taxa_pf_livre_br:             { section: 'contratacao_taxa', label: 'Taxa PF Livre', unit: '% a.a.' },
  credito_contratacao_taxa_pf_comercial_br:         { section: 'contratacao_taxa', label: 'Taxa PF Comercial', unit: '% a.a.' },
  credito_contratacao_taxa_pf_home_equity_br:       { section: 'contratacao_taxa', label: 'Taxa PF Home Equity', unit: '% a.a.' },
  // === Contratação PF — LTV ===
  credito_contratacao_ltv_pf_sfh_br:                { section: 'contratacao_ltv', label: 'LTV PF SFH', unit: '%' },
  credito_contratacao_ltv_pf_fgts_br:               { section: 'contratacao_ltv', label: 'LTV PF FGTS', unit: '%' },
  credito_contratacao_ltv_pf_livre_br:              { section: 'contratacao_ltv', label: 'LTV PF Livre', unit: '%' },
  credito_contratacao_ltv_pf_comercial_br:          { section: 'contratacao_ltv', label: 'LTV PF Comercial', unit: '%' },
  credito_contratacao_ltv_pf_home_equity_br:        { section: 'contratacao_ltv', label: 'LTV PF Home Equity', unit: '%' },
  // === Contratação PJ ===
  credito_contratacao_contratado_pj_livre_br:       { section: 'contratacao_pj', label: 'PJ Livre', unit: 'R$' },
  credito_contratacao_taxa_pj_livre_br:             { section: 'contratacao_pj', label: 'Taxa PJ Livre', unit: '% a.a.' },
  // === Estoque — Carteira ===
  credito_estoque_carteira_credito_pf_sfh_br:       { section: 'estoque', label: 'Carteira PF SFH', unit: 'R$' },
  credito_estoque_carteira_credito_pf_fgts_br:      { section: 'estoque', label: 'Carteira PF FGTS', unit: 'R$' },
  credito_estoque_carteira_credito_pf_livre_br:     { section: 'estoque', label: 'Carteira PF Livre', unit: 'R$' },
  credito_estoque_carteira_credito_pf_comercial_br: { section: 'estoque', label: 'Carteira PF Comercial', unit: 'R$' },
  credito_estoque_carteira_credito_pf_home_equity_br: { section: 'estoque', label: 'Carteira PF Home Equity', unit: 'R$' },
  credito_estoque_carteira_credito_pj_livre_br:     { section: 'estoque', label: 'Carteira PJ Livre', unit: 'R$' },
  // === Estoque — Inadimplência ===
  credito_estoque_inadimplencia_pf_sfh_br:          { section: 'inadimplencia', label: 'Inadimpl. PF SFH', unit: '%' },
  credito_estoque_inadimplencia_pf_fgts_br:         { section: 'inadimplencia', label: 'Inadimpl. PF FGTS', unit: '%' },
  credito_estoque_inadimplencia_pf_livre_br:        { section: 'inadimplencia', label: 'Inadimpl. PF Livre', unit: '%' },
  credito_estoque_inadimplencia_pf_comercial_br:    { section: 'inadimplencia', label: 'Inadimpl. PF Comercial', unit: '%' },
  credito_estoque_inadimplencia_pf_home_equity_br:  { section: 'inadimplencia', label: 'Inadimpl. PF Home Equity', unit: '%' },
};

async function fetchBCBImobSeries(seriesName) {
  // Not used anymore — kept for compatibility
  return null;
}

async function loadBCBImobData() {
  // Cache 4 hours
  if (DB.bcbImobCache && (Date.now() - DB.bcbImobCache.ts) < 4 * 60 * 60 * 1000) {
    return DB.bcbImobCache.data;
  }

  // Strategy: fetch ALL _br series via server-side filter, paginate with $skip
  // With ~50 _br series per month and 120 months target = ~6000 rows
  const result = {};
  const batchSize = 5000;
  let totalRows = 0;

  for (let skip = 0; skip < 20000; skip += batchSize) {
    const url = `/api-proxy?source=bcb_imob&discover=1&filter_br=1&top=${batchSize}&skip=${skip}`;
    try {
      const res = await fetchWithTimeout(url, 30000);
      if (!res.ok) {
        console.warn('BCB Imob batch failed:', res.status);
        // If endswith filter not supported, fallback to unfiltered
        if (skip === 0) {
          console.log('BCB Imob: trying without server filter...');
          return loadBCBImobDataUnfiltered();
        }
        break;
      }
      const data = await res.json();
      const rows = data.value || [];
      if (rows.length === 0) break;

      for (const row of rows) {
        const info = row.Info;
        if (!info) continue;
        // Extra client-side filter in case server filter didn't work
        if (!info.endsWith('_br')) continue;
        if (!result[info]) result[info] = [];
        result[info].push({
          date: row.Data ? row.Data.substring(0, 10) : '',
          value: parseFloat(row.Valor),
        });
      }
      totalRows += rows.length;
      console.log(`BCB Imob: batch skip=${skip}, ${rows.length} rows, ${Object.keys(result).length} series`);
      if (rows.length < batchSize) break;
    } catch (err) {
      console.warn('BCB Imob batch error:', err.message);
      if (skip === 0) return loadBCBImobDataUnfiltered();
      break;
    }
  }

  // Sort each series chronologically
  for (const key of Object.keys(result)) {
    result[key].sort((a, b) => a.date.localeCompare(b.date));
  }

  console.log(`BCB Imob: loaded ${Object.keys(result).length} series, ${totalRows} total rows`);
  DB.bcbImobCache = { ts: Date.now(), data: result };
  saveDB(DB);
  return result;
}

// Fallback: if endswith filter not supported by BCB OData
async function loadBCBImobDataUnfiltered() {
  const result = {};
  const batchSize = 5000;

  for (let skip = 0; skip < 15000; skip += batchSize) {
    const url = `/api-proxy?source=bcb_imob&discover=1&top=${batchSize}&skip=${skip}`;
    try {
      const res = await fetchWithTimeout(url, 30000);
      if (!res.ok) break;
      const data = await res.json();
      const rows = data.value || [];
      if (rows.length === 0) break;

      for (const row of rows) {
        const info = row.Info;
        if (!info || !info.endsWith('_br')) continue;
        if (!result[info]) result[info] = [];
        result[info].push({
          date: row.Data ? row.Data.substring(0, 10) : '',
          value: parseFloat(row.Valor),
        });
      }
      console.log(`BCB Imob (unfiltered): batch skip=${skip}, ${rows.length} rows, ${Object.keys(result).length} _br series`);
      if (rows.length < batchSize) break;
    } catch (err) {
      console.warn('BCB Imob unfiltered error:', err.message);
      break;
    }
  }

  for (const key of Object.keys(result)) {
    result[key].sort((a, b) => a.date.localeCompare(b.date));
  }

  DB.bcbImobCache = { ts: Date.now(), data: result };
  saveDB(DB);
  return result;
}

/* ---------- Render helpers for Imob charts ---------- */

function renderImobAreaChart(title, seriesMap, imob, colors) {
  // seriesMap: [{key, label, color}]
  const allData = seriesMap.map(s => ({ ...s, data: imob?.[s.key] || [] })).filter(s => s.data.length > 0);
  if (allData.length === 0) return renderImobEmpty(title, seriesMap.map(s => s.key));

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
    svgContent += `<text x="${pad.l-6}" y="${y+4}" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="9" fill="var(--text-faint)">${val >= 1e12 ? (val/1e12).toFixed(0) + 'T' : val >= 1e9 ? (val/1e9).toFixed(0) + 'B' : val >= 1e6 ? (val/1e6).toFixed(0) + 'M' : val >= 1000 ? (val/1000).toFixed(0) + 'k' : val >= 1 ? val.toFixed(0) : val.toFixed(2)}</text>`;
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
    h('div', { html: `<svg viewBox="0 0 ${w} ${ht}" style="width:100%;display:block">${svgContent}</svg>` }),
    h('div', { style: { textAlign: 'center', marginTop: '8px' }, html: legend }),
  ]);
}

function renderImobEmpty(title, keys) {
  return h('div', { class: 'card', style: { padding: '30px', textAlign: 'center' } }, [
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px', color: 'var(--text-faint)', marginBottom: '8px' } }, title),
    h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Sem dados para estas séries'),
    keys && h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--border)', marginTop: '6px', wordBreak: 'break-all' } }, 
      `Tentativas: ${keys.join(', ')}`),
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
        { key: 'fontes_sbpe_br', label: 'SBPE', color: '#5a8a9a' },
      ], imob),
      renderImobAreaChart('Títulos', [
        { key: 'fontes_titulo_cri_br', label: 'CRI', color: '#2a5a7a' },
        { key: 'fontes_titulo_lci_br', label: 'LCI', color: '#d4a574' },
        { key: 'fontes_titulo_lh_br',  label: 'LH',  color: '#7ac5c5' },
        { key: 'fontes_titulo_lig_br', label: 'LIG', color: '#8a5a3a' },
      ], imob, ['#2a5a7a', '#d4a574', '#7ac5c5', '#8a5a3a']),
    ]),
    renderImobKPIStrip(imob, ['fontes_sbpe_br', 'fontes_titulo_cri_br', 'fontes_titulo_lci_br', 'fontes_titulo_lh_br', 'fontes_titulo_lig_br']),
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
        { key: 'direcionamento_aplicacao_imobiliario_br', label: 'Imobiliário', color: '#5a8a9a' },
      ], imob),
      renderImobAreaChart('Aquisição', [
        { key: 'direcionamento_aquisicao_imobiliario_br', label: 'Imobiliário', color: '#5a8a9a' },
      ], imob),
    ]),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' } }, [
      renderImobAreaChart('Construção', [
        { key: 'direcionamento_construcao_imobiliario_br', label: 'Imobiliário', color: '#5a8a9a' },
      ], imob),
      renderImobAreaChart('Reforma ou Ampliação', [
        { key: 'direcionamento_reforma_ampliacao_imobiliario_br', label: 'Imobiliário', color: '#5a8a9a' },
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
        { key: 'contabil_financiamento_comercial_br',   label: 'Comercial',   color: '#2a5a7a' },
        { key: 'contabil_financiamento_residencial_br', label: 'Residencial', color: '#d4a574' },
      ], imob, ['#2a5a7a', '#d4a574']),
      renderImobAreaChart('Bens não de uso próprio — BNDU', [
        { key: 'contabil_bndu_imobiliario_br', label: 'Imobiliário', color: '#5a8a9a' },
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
        { key: 'credito_contratacao_contratado_pf_comercial_br',   label: 'Comercial',   color: '#2a5a7a' },
        { key: 'credito_contratacao_contratado_pf_home_equity_br', label: 'Home Equity',  color: '#d4a574' },
        { key: 'credito_contratacao_contratado_pf_livre_br',       label: 'Livre',        color: '#7ac5c5' },
        { key: 'credito_contratacao_contratado_pf_fgts_br',        label: 'FGTS',         color: '#8a3a3a' },
        { key: 'credito_contratacao_contratado_pf_sfh_br',         label: 'SFH',          color: '#7a3a8a' },
      ], imob, ['#2a5a7a', '#d4a574', '#7ac5c5', '#8a3a3a', '#7a3a8a']),
      renderImobKPIStrip(imob, ['credito_contratacao_contratado_pf_sfh_br', 'credito_contratacao_contratado_pf_fgts_br', 'credito_contratacao_contratado_pf_livre_br', 'credito_contratacao_contratado_pf_comercial_br', 'credito_contratacao_contratado_pf_home_equity_br']),
    ]) :

    subTab === 'indexador' ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' } }, [
      renderImobAreaChart('Indexadores — PF', [
        { key: 'credito_contratacao_indexador_pf_prefixado_br', label: 'Prefixado', color: '#7a3a8a' },
        { key: 'credito_contratacao_indexador_pf_ipca_br',      label: 'IPCA',      color: '#8a5a3a' },
        { key: 'credito_contratacao_indexador_pf_outros_br',    label: 'Outros',    color: '#7ac5c5' },
        { key: 'credito_contratacao_indexador_pf_tr_br',        label: 'TR',        color: '#d4a574' },
      ], imob, ['#7a3a8a', '#8a5a3a', '#7ac5c5', '#d4a574']),
    ]) :

    subTab === 'taxa' ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' } }, [
      renderImobAreaChart('Taxa de Juros — PF (% a.a.)', [
        { key: 'credito_contratacao_taxa_pf_sfh_br',         label: 'SFH',         color: '#2a5a7a' },
        { key: 'credito_contratacao_taxa_pf_fgts_br',        label: 'FGTS',        color: '#8a3a3a' },
        { key: 'credito_contratacao_taxa_pf_livre_br',       label: 'Livre',       color: '#7ac5c5' },
        { key: 'credito_contratacao_taxa_pf_comercial_br',   label: 'Comercial',   color: '#d4a574' },
        { key: 'credito_contratacao_taxa_pf_home_equity_br', label: 'Home Equity', color: '#7a3a8a' },
      ], imob, ['#2a5a7a', '#8a3a3a', '#7ac5c5', '#d4a574', '#7a3a8a']),
    ]) :

    subTab === 'ltv' ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' } }, [
      renderImobAreaChart('Loan to Value — PF (%)', [
        { key: 'credito_contratacao_ltv_pf_sfh_br',         label: 'SFH',         color: '#2a5a7a' },
        { key: 'credito_contratacao_ltv_pf_fgts_br',        label: 'FGTS',        color: '#8a3a3a' },
        { key: 'credito_contratacao_ltv_pf_livre_br',       label: 'Livre',       color: '#7ac5c5' },
        { key: 'credito_contratacao_ltv_pf_comercial_br',   label: 'Comercial',   color: '#d4a574' },
        { key: 'credito_contratacao_ltv_pf_home_equity_br', label: 'Home Equity', color: '#7a3a8a' },
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

    // Auto-format based on unit and magnitude
    let fmtVal;
    if (meta?.unit === '% a.a.' || meta?.unit === '%') {
      fmtVal = `${last.value.toFixed(2)}%`;
    } else {
      fmtVal = formatBRL(last.value);
    }

    let fmtDelta = '';
    if (delta != null) {
      if (meta?.unit === '% a.a.' || meta?.unit === '%') {
        fmtDelta = `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(2)} p.p.`;
      } else {
        fmtDelta = `${delta >= 0 ? '▲' : '▼'} ${formatBRL(Math.abs(delta))}`;
      }
    }

    return h('div', { class: 'card', style: { padding: '12px 14px' } }, [
      h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', marginBottom: '4px' } }, meta?.label || key),
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px' } }, fmtVal),
      fmtDelta && h('div', { class: 'mono', style: { fontSize: '9px', color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-faint)', marginTop: '3px' } }, fmtDelta),
      h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', marginTop: '2px' } }, last.date?.substring(0, 7) || ''),
    ]);
  }).filter(Boolean);
  if (cards.length === 0) return null;
  return h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${Math.min(cards.length, 5)}, 1fr)`, gap: '10px', marginTop: '16px' } }, cards);
}

// Format raw BRL values intelligently
function formatBRL(v) {
  if (v == null || isNaN(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e12) return `R$ ${(v / 1e12).toFixed(1)} tri`;
  if (abs >= 1e9)  return `R$ ${(v / 1e9).toFixed(1)} bi`;
  if (abs >= 1e6)  return `R$ ${(v / 1e6).toFixed(1)} mi`;
  if (abs >= 1e3)  return `R$ ${(v / 1e3).toFixed(1)} k`;
  return `R$ ${v.toFixed(2)}`;
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

function renderCentralBanks(bankFilter) {
  const all = getCBMinutes();
  const filter = bankFilter || state._cb_filter || 'all';
  const filtered = filter === 'all' ? all : all.filter(m => m.bank === filter);
  const bankLabel = filter === 'copom' ? 'COPOM' : filter === 'fomc' ? 'FOMC' : 'Bancos Centrais';

  return h('div', {}, [
    !bankFilter && pageHead('Macro Intelligence · Bancos Centrais', 'Bancos <em>Centrais</em>',
      'Atas de COPOM e FOMC ingeridas e estruturadas. O sistema extrai decisão, tom, guidance e riscos via Gemini, com revisão editável antes de salvar.'),

    h('div', { class: 'cb-page-actions' }, [
      !bankFilter && h('div', { class: 'cb-bank-tabs' }, [
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
        (filter === 'all' || filter === 'copom') && h('button', { class: 'btn-secondary', onClick: () => triggerCBUpload('copom') }, '+ Ingerir ata COPOM'),
        (filter === 'all' || filter === 'fomc') && h('button', { class: 'btn-secondary', onClick: () => triggerCBUpload('fomc') }, '+ Ingerir ata FOMC'),
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

/* ============================================================
   34. CONSOLIDATED COUNTRY PANELS
   Brasil and US with sub-tabs aggregating existing modules
   ============================================================ */

function renderBrasilPanel() {
  const subTab = state._br_panel_tab || 'bc';
  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Brasil', '🇧🇷 <em>Brasil</em>',
      'Banco Central, indicadores econômicos, mercado imobiliário e crédito. Dados BCB SGS + OData.'),

    h('div', { class: 'sec-tab-row', style: { marginBottom: '20px' } },
      [
        ['bc',         'Banco Central'],
        ['indicadores','Indicadores Econômicos'],
        ['imobiliario','Mercado Imobiliário'],
        ['credito',    'Crédito'],
        ['setorial',   'Indicadores Setoriais'],
      ].map(([key, label]) => h('button', {
        class: 'sec-tab' + (subTab === key ? ' active' : ''),
        onClick: () => { state._br_panel_tab = key; render(); },
      }, label))
    ),

    subTab === 'bc' ? renderCentralBanks('copom') :
    subTab === 'indicadores' ? renderMacroDashboardInline() :
    subTab === 'imobiliario' ? renderRealEstateLens() :
    subTab === 'credito' ? renderCreditLens() :
    subTab === 'setorial' ? renderSectoralIndicators() : null,
  ]);
}

function renderUSPanel() {
  const subTab = state._us_panel_tab || 'bc';
  return h('div', { class: 'content fade-up' }, [
    pageHead('Macro Intelligence · Estados Unidos', '🇺🇸 <em>Estados Unidos</em>',
      'Federal Reserve, indicadores FRED e análise de ciclo econômico US.'),

    h('div', { class: 'sec-tab-row', style: { marginBottom: '20px' } },
      [
        ['bc',         'Federal Reserve'],
        ['indicadores','Indicadores FRED'],
      ].map(([key, label]) => h('button', {
        class: 'sec-tab' + (subTab === key ? ' active' : ''),
        onClick: () => { state._us_panel_tab = key; render(); },
      }, label))
    ),

    subTab === 'bc' ? renderCentralBanks('fomc') :
    subTab === 'indicadores' ? renderFEDDashboard() : null,
  ]);
}

// Inline version of macro dashboard (without page header, for embedding in Brasil panel)
function renderMacroDashboardInline() {
  const series = state._macro_series;
  if (!series) {
    if (!state._macro_loading && !state._macro_error) {
      state._macro_loading = true;
      loadAllBCBSeries().then(s => { state._macro_series = s; state._macro_loading = false; render(); })
        .catch(err => { state._macro_loading = false; state._macro_error = err.message; render(); });
    }
    return state._macro_error
      ? renderMacroError(state._macro_error)
      : h('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' } }, 'Carregando dados BCB…');
  }
  const indicators = computeMacroIndicators(series);
  const reCycle = computeRealEstateCycle(indicators);
  const credCycle = computeCreditCycle(indicators, series);
  return h('div', {}, [
    renderCycleCards(reCycle, credCycle),
    renderMacroSection('Juros & Política Monetária', [
      { key: 'selic', series }, { key: 'cdi', series },
      { key: 'ipca12m', series }, { key: 'igpm', series },
    ], indicators, ['jurosReal']),
    renderMacroSection('Câmbio & Atividade', [
      { key: 'usd_venda', series }, { key: 'ibcbr', series }, { key: 'icc', series },
    ], indicators, []),
    renderMacroSection('Crédito & Inadimplência', [
      { key: 'inadi', series }, { key: 'inadipj', series }, { key: 'spreadTot', series },
    ], indicators, []),
  ]);
}

// Wrapper: renderCentralBanks filtered by bank
function renderCentralBanksFiltered(bank) {
  // The existing renderCentralBanks renders both COPOM+FOMC
  // For country panels, we filter to show only the relevant bank
  return renderCentralBanks(bank);
}

// ====== assetmgmt.js ======


/* ============================================================
   19. REAL ESTATE — FIIs (via brapi.dev)
/* [FII module removed — replaced with Real Estate Macro Intelligence and Credit Private below] */

/* ============================================================
   20. ASSET MANAGEMENT — Funds + Investment Thesis
   ============================================================ */

const FUND_CLASSES = {
  fim:        { label: 'Multimercado',      desc: 'Multi-asset, flexível' },
  fia:        { label: 'Ações',             desc: 'Equity-focused' },
  fii:        { label: 'Imobiliário (FII)', desc: 'Real Estate' },
  fip:        { label: 'Participações',     desc: 'Private Equity' },
  fidc:       { label: 'FIDC',              desc: 'Direitos creditórios' },
  fic:        { label: 'Renda Fixa',        desc: 'Fixed Income' },
  cambial:    { label: 'Cambial',           desc: 'FX / hedge cambial' },
  prevReg:    { label: 'Previdência',       desc: 'PGBL/VGBL' },
  exclusivo:  { label: 'Exclusivo',         desc: 'Investidor qualificado/único' },
  outros:     { label: 'Outros',            desc: '—' },
};

const STRATEGY_TYPES = [
  'Long-Only Equity', 'Long-Short', 'Long-Biased', 'Macro',
  'Crédito Privado', 'CRI/CRA', 'Multiestratégia', 'Renda Fixa Ativa',
  'Sistemático/Quant', 'Income/Dividendos', 'Real Estate Tijolo',
  'Real Estate Papel', 'Distressed', 'Outros',
];

const PILLAR_STANCES = ['OW', 'MOW', 'N', 'MUW', 'UW'];

const PILLAR_STATUS = {
  confirming:  { label: 'Confirmando', desc: 'Maioria das gestoras tracked apoia esse pilar' },
  mixed:       { label: 'Misto',       desc: 'Visões divididas entre gestoras' },
  challenging: { label: 'Desafiando',  desc: 'Maioria das gestoras tracked contradiz' },
  'no-data':   { label: 'Sem dados',   desc: 'Nenhuma gestora cobriu os tópicos relacionados' },
};

/* ---------- Data layer ---------- */

function getFunds() {
  if (!DB.funds) { DB.funds = []; saveDB(DB); }
  return DB.funds;
}

function getFund(id) {
  return getFunds().find(f => f.id === id);
}

function saveFund(fund) {
  getFunds();
  fund.updated_at = new Date().toISOString();

  // Detect pillar changes vs previous version and record revisions
  if (fund.id) {
    const previous = DB.funds?.find(f => f.id === fund.id);
    if (previous) recordPillarRevisions(fund, previous);
  }

  if (!fund.id) {
    fund.id = `fund_${Date.now()}`;
    fund.created_at = fund.updated_at;
    // Record initial pillars as creation revisions
    fund.pillar_revisions = (fund.pillars || []).map((p, idx) => ({
      ts: fund.created_at,
      type: 'created',
      pillar_idx: idx,
      pillar_desc: p.desc,
      stance: p.stance,
      reason: 'Fundo criado',
    }));
    DB.funds.push(fund);
  } else {
    const idx = DB.funds.findIndex(f => f.id === fund.id);
    if (idx >= 0) DB.funds[idx] = fund;
    else DB.funds.push(fund);
  }
  saveDB(DB);
  return fund.id;
}

function recordPillarRevisions(newFund, oldFund) {
  const oldPillars = oldFund.pillars || [];
  const newPillars = newFund.pillars || [];
  const revisions = oldFund.pillar_revisions || [];
  const ts = new Date().toISOString();
  const reason = newFund._revision_reason || '';
  delete newFund._revision_reason;

  // Compare by index (simple approach — user orders matter)
  const maxLen = Math.max(oldPillars.length, newPillars.length);
  for (let i = 0; i < maxLen; i++) {
    const oldP = oldPillars[i];
    const newP = newPillars[i];
    if (!oldP && newP) {
      revisions.push({ ts, type: 'added', pillar_idx: i, pillar_desc: newP.desc, stance: newP.stance, reason });
    } else if (oldP && !newP) {
      revisions.push({ ts, type: 'removed', pillar_idx: i, pillar_desc: oldP.desc, stance: oldP.stance, reason });
    } else if (oldP && newP) {
      // Check for changes
      const stanceChanged = oldP.stance !== newP.stance;
      const descChanged = (oldP.desc || '') !== (newP.desc || '');
      const slugsChanged = JSON.stringify((oldP.slugs || []).sort()) !== JSON.stringify((newP.slugs || []).sort());
      if (stanceChanged) {
        revisions.push({ ts, type: 'stance_changed', pillar_idx: i, pillar_desc: newP.desc,
          from_stance: oldP.stance, to_stance: newP.stance, stance: newP.stance, reason });
      }
      if (descChanged) {
        revisions.push({ ts, type: 'desc_changed', pillar_idx: i,
          from_desc: oldP.desc, to_desc: newP.desc, pillar_desc: newP.desc, stance: newP.stance, reason });
      }
      if (slugsChanged) {
        revisions.push({ ts, type: 'slugs_changed', pillar_idx: i, pillar_desc: newP.desc,
          from_slugs: oldP.slugs || [], to_slugs: newP.slugs || [], stance: newP.stance, reason });
      }
    }
  }
  newFund.pillar_revisions = revisions;
}

function deleteFund(id) {
  if (!confirm('Excluir esse fundo? Não há como desfazer.')) return;
  DB.funds = getFunds().filter(f => f.id !== id);
  saveDB(DB);
  setView('am_funds');
}

function emptyFund() {
  return {
    id: null,
    name: '',
    cnpj: '',
    classification: 'fim',
    strategy: 'Multiestratégia',
    benchmark: 'CDI',
    inception_date: '',
    aum: '',
    valorcota: null,
    administrador: '',
    custodiante: '',
    liquidity: '',
    leverage_max: '',
    thesis_summary: '',
    pillars: [],          // [{ desc, slugs:[], stance, type }]
    kpi_macro: [],        // [series_key from BCB_SERIES]
    kpi_events: '',       // free text
    triggers: '',         // free text
    // Real estate specific (optional, only relevant for real estate strategies)
    re_cities: [],        // [city_key from FIPE_CITIES]
    re_segment: '',       // 'MAP' | 'MCMV' | 'Ambos' | ''
    re_type: '',          // 'Tijolo' | 'Papel' | 'Hibrido' | ''
    notes: [],            // [{ ts, text }]
    created_at: null,
    updated_at: null,
  };
}

/* ---------- View routing for editing ---------- */

function startEditFund(id) {
  state._fund_edit = id ? JSON.parse(JSON.stringify(getFund(id) || emptyFund())) : emptyFund();
  state.view = 'am_edit';
  render();
}

function cancelEditFund() {
  state._fund_edit = null;
  setView('am_funds');
}

function saveCurrentEdit() {
  const f = state._fund_edit;
  if (!f.name?.trim()) { showToast('Nome do fundo é obrigatório', true); return; }

  // If editing existing fund with pillar changes, ask for reason (optional)
  if (f.id) {
    const previous = getFunds().find(x => x.id === f.id);
    if (previous && hasPillarChanges(previous, f)) {
      const reason = prompt('Motivo desta revisão de tese (opcional, ficará no histórico):\n\nEx: "ata COPOM hawkish muda perspectiva", "dado IPCA acima do esperado", "repensar após comitê"');
      if (reason === null) return; // user cancelled
      if (reason.trim()) f._revision_reason = reason.trim();
    }
  }

  const id = saveFund(f);
  state._fund_edit = null;
  showToast('Fundo salvo');
  state.view = 'am_funds';
  state.detail = { kind: 'fund', slug: id };
  render();
}

function hasPillarChanges(oldFund, newFund) {
  const oldPs = oldFund.pillars || [];
  const newPs = newFund.pillars || [];
  if (oldPs.length !== newPs.length) return true;
  for (let i = 0; i < oldPs.length; i++) {
    const a = oldPs[i], b = newPs[i];
    if (a.stance !== b.stance) return true;
    if ((a.desc || '') !== (b.desc || '')) return true;
    if (JSON.stringify((a.slugs || []).sort()) !== JSON.stringify((b.slugs || []).sort())) return true;
  }
  return false;
}

/* ---------- Render: Funds list ---------- */

function renderFundsList() {
  const funds = getFunds();
  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Fundos', 'Fundos da <em>Casa</em>',
      'Cadastre os fundos sob gestão e suas teses de investimento. O sistema cruza automaticamente cada tese com o research global ingerido e os indicadores macro relevantes.'),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } }, [
      h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } },
        `${funds.length} fundo${funds.length !== 1 ? 's' : ''} cadastrado${funds.length !== 1 ? 's' : ''}`),
      h('button', { class: 'btn-primary', onClick: () => startEditFund(null) }, '+ Novo Fundo'),
    ]),

    funds.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum fundo cadastrado ainda'),
          h('p', { class: 'empty-desc' }, 'Comece cadastrando seu primeiro fundo. O cadastro estruturado leva ~5 minutos por fundo e habilita os cruzamentos automáticos no painel.'),
          h('button', { class: 'btn-secondary', style: { marginTop: '20px' }, onClick: () => startEditFund(null) }, '+ Cadastrar primeiro fundo'),
        ])
      : h('div', { class: 'fund-grid' }, funds.map(f => renderFundCard(f))),
  ]);
}

function renderFundCard(f) {
  const cls = FUND_CLASSES[f.classification] || { label: f.classification };
  return h('div', { class: 'fund-card', onClick: () => setDetail('fund', f.id) }, [
    h('div', { class: 'fund-card-head' }, [
      h('div', {}, [
        h('div', { class: 'fund-card-name' }, f.name),
        h('div', { class: 'fund-card-class' }, `${cls.label} · ${f.strategy || '—'}`),
      ]),
      f.benchmark && h('span', { class: 'fund-card-tag' }, `vs ${f.benchmark}`),
    ]),
    f.thesis_summary && h('p', { class: 'fund-card-thesis' }, f.thesis_summary),
    f.pillars?.length > 0 && h('div', { class: 'fund-card-pillars' },
      f.pillars.slice(0, 5).map(p => h('span', { class: 'fund-card-pillar' }, p.desc?.substring(0, 30) || `Pilar ${f.pillars.indexOf(p) + 1}`))
    ),
    renderFundAlertBadges(f),
    h('div', { class: 'fund-card-meta' }, [
      h('span', {}, `${f.pillars?.length || 0} pilares · ${f.kpi_macro?.length || 0} KPIs`),
      h('span', {}, f.aum ? `AUM ${f.aum}` : ''),
    ]),
  ]);
}

/* ---------- Render: Edit/Create fund form ---------- */

function renderFundForm() {
  const f = state._fund_edit;
  if (!f) return renderFundsList();
  const isNew = !f.id;

  return h('div', { class: 'content fade-up' }, [
    pageHead(isNew ? 'Asset Management · Novo Fundo' : `Asset Management · Editar`,
      isNew ? 'Cadastrar <em>Fundo</em>' : `Editar <em>${f.name || 'Fundo'}</em>`,
      'Preenchimento estruturado para habilitar cruzamentos automáticos. Pilares e KPIs são os campos que destravam a inteligência — o resto é metadados úteis mas opcionais.'),

    h('div', { class: 'fund-form' }, [
      // Section 1: Identificação
      renderFormSection('01', 'Identificação', 'Dados básicos do fundo.', [
        h('div', { class: 'form-row' }, [
          formField('Nome do fundo *', h('input', {
            class: 'form-field-input', type: 'text', value: f.name,
            placeholder: 'Ex: Aegir Real Income FIM CP',
            oninput: e => f.name = e.target.value,
          })),
          formField('CNPJ', h('input', {
            class: 'form-field-input', type: 'text', value: f.cnpj,
            placeholder: '00.000.000/0001-00',
            oninput: e => f.cnpj = e.target.value,
          })),
        ]),
        h('div', { class: 'form-row three' }, [
          formField('Classificação', h('select', {
            class: 'form-field-select',
            onchange: e => { f.classification = e.target.value; render(); },
          },
            Object.entries(FUND_CLASSES).map(([k, v]) =>
              h('option', { value: k, selected: f.classification === k ? 'selected' : null }, v.label)
            )
          )),
          formField('Estratégia', h('select', {
            class: 'form-field-select',
            onchange: e => f.strategy = e.target.value,
          },
            STRATEGY_TYPES.map(s =>
              h('option', { value: s, selected: f.strategy === s ? 'selected' : null }, s)
            )
          )),
          formField('Benchmark', h('input', {
            class: 'form-field-input', type: 'text', value: f.benchmark,
            placeholder: 'CDI, IPCA+5%, IBOV',
            oninput: e => f.benchmark = e.target.value,
          })),
        ]),
        h('div', { class: 'form-row three' }, [
          formField('Data de início', h('input', {
            class: 'form-field-input', type: 'date', value: f.inception_date,
            oninput: e => f.inception_date = e.target.value,
          })),
          formField('AUM (texto livre)', h('input', {
            class: 'form-field-input', type: 'text', value: f.aum,
            placeholder: 'R$ 250M, US$ 50M',
            oninput: e => f.aum = e.target.value,
          })),
          formField('Liquidez', h('input', {
            class: 'form-field-input', type: 'text', value: f.liquidity,
            placeholder: 'D+1, D+30, fechado',
            oninput: e => f.liquidity = e.target.value,
          })),
        ]),
      ]),

      // Section 2: Tese
      renderFormSection('02', 'Tese de Investimento', 'Texto livre — descreva a tese central em 2-3 parágrafos. Será exibido no painel.',
        [h('textarea', {
          class: 'form-field-textarea', rows: '6',
          placeholder: 'Ex: O fundo busca capturar prêmio de risco em crédito corporativo high-grade indexado a CDI, com viés defensivo. Aposta-se em normalização gradual da curva e descompressão de spreads em emissores de qualidade...',
          oninput: e => f.thesis_summary = e.target.value,
        }, f.thesis_summary || '')]
      ),

      // Section 3: Pilares estruturados
      renderFormSection('03', 'Pilares da Tese',
        'Cada pilar tem uma descrição + classes/temas relacionados (slugs) + viés de exposição. Esse é o componente mais importante: o sistema cruza pilares com o consenso global das gestoras tracked.',
        [
          h('div', { class: 'pillars-list' }, (f.pillars || []).map((p, idx) => renderPillarEditor(p, idx, f))),
          h('button', {
            class: 'btn-add-pillar',
            onClick: () => {
              f.pillars = f.pillars || [];
              f.pillars.push({ desc: '', slugs: [], stance: 'OW', type: 'Tático' });
              render();
            },
          }, '+ Adicionar Pilar'),
        ]
      ),

      // Section 4: KPIs Macro
      renderFormSection('04', 'KPIs Macroeconômicos',
        'Indicadores BCB que impactam diretamente a tese desse fundo. Selecione apenas os relevantes — o painel vai mostrar só esses, evitando ruído.',
        [renderKPIPicker(f)]
      ),

      // Section 5: Eventos & Triggers (texto livre)
      renderFormSection('05', 'Monitoramento — Eventos & Triggers',
        'Eventos a vigiar (livre) e condições que devem disparar revisão da tese (livre). Essas notas aparecem no painel.',
        [
          h('div', { class: 'form-row' }, [
            formField('Eventos a monitorar', h('textarea', {
              class: 'form-field-textarea', rows: '4',
              placeholder: 'Ex: Reunião COPOM, balanço trimestral dos top 5 emissores, leilões de NTN-B, ata FOMC...',
              oninput: e => f.kpi_events = e.target.value,
            }, f.kpi_events || '')),
            formField('Triggers de revisão', h('textarea', {
              class: 'form-field-textarea', rows: '4',
              placeholder: 'Ex: Inflação 12m > 6%, gestoras tracked downgrade IG corporativo, default de qualquer emissor da carteira, vacância > 15% no empreendimento âncora...',
              oninput: e => f.triggers = e.target.value,
            }, f.triggers || '')),
          ]),
        ]
      ),

      // Section 6: Real Estate (condicional — aparece se classificação ou estratégia é RE)
      (f.classification === 'fii' || (f.strategy || '').toLowerCase().includes('real estate') ||
       (f.strategy || '').toLowerCase().includes('imob') || (f.strategy || '').toLowerCase().includes('tijolo') ||
       (f.strategy || '').toLowerCase().includes('cri') || (f.strategy || '').toLowerCase().includes('cra') ||
       (f.re_cities && f.re_cities.length > 0) || f.re_segment) &&
      renderFormSection('06', 'Real Estate — Detalhamento',
        'Campos opcionais para fundos com exposição imobiliária. Permite cruzar com indicadores FipeZap e Abrainc por cidade e segmento.',
        [
          h('div', { class: 'form-row three' }, [
            formField('Segmento imobiliário', h('select', {
              class: 'form-field-select',
              onchange: e => { f.re_segment = e.target.value; render(); },
            }, [
              h('option', { value: '', selected: !f.re_segment ? 'selected' : null }, '— Não especificado —'),
              h('option', { value: 'MAP', selected: f.re_segment === 'MAP' ? 'selected' : null }, 'Médio e Alto Padrão (MAP)'),
              h('option', { value: 'MCMV', selected: f.re_segment === 'MCMV' ? 'selected' : null }, 'Minha Casa Minha Vida (MCMV)'),
              h('option', { value: 'Ambos', selected: f.re_segment === 'Ambos' ? 'selected' : null }, 'Ambos (MAP + MCMV)'),
            ])),
            formField('Tipo de fundo RE', h('select', {
              class: 'form-field-select',
              onchange: e => { f.re_type = e.target.value; render(); },
            }, [
              h('option', { value: '', selected: !f.re_type ? 'selected' : null }, '— Não especificado —'),
              h('option', { value: 'Tijolo', selected: f.re_type === 'Tijolo' ? 'selected' : null }, 'Tijolo (ativos físicos)'),
              h('option', { value: 'Papel', selected: f.re_type === 'Papel' ? 'selected' : null }, 'Papel (CRI/CRA/LCI)'),
              h('option', { value: 'Hibrido', selected: f.re_type === 'Hibrido' ? 'selected' : null }, 'Híbrido'),
              h('option', { value: 'Desenvolvimento', selected: f.re_type === 'Desenvolvimento' ? 'selected' : null }, 'Desenvolvimento / Incorporação'),
            ])),
            formField(' ', h('div', { class: 'form-field-help', style: { marginTop: '28px' } },
              'Esses campos permitem que o painel do fundo mostre automaticamente indicadores FipeZap e Abrainc relevantes.')),
          ]),
          h('div', { style: { marginTop: '14px' } }, [
            h('label', { class: 'form-field-label' }, 'Cidades foco (selecione as praças relevantes)'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)' } },
              FIPE_CITIES.map(c => {
                if (!f.re_cities) f.re_cities = [];
                const isOn = f.re_cities.includes(c.key);
                return h('span', {
                  class: 'pillar-slug-pill' + (isOn ? ' selected' : ''),
                  onClick: () => {
                    if (isOn) f.re_cities = f.re_cities.filter(x => x !== c.key);
                    else f.re_cities.push(c.key);
                    render();
                  },
                }, c.label);
              })
            ),
            h('div', { class: 'form-field-help' },
              `${(f.re_cities || []).length} cidade(s) selecionada(s). Goiânia é a sede da gestora.`),
          ]),
        ]
      ),

      // Actions
      h('div', { class: 'form-actions' }, [
        h('button', { class: 'btn-secondary', onClick: cancelEditFund }, 'Cancelar'),
        h('div', { style: { display: 'flex', gap: '8px' } }, [
          !isNew && h('button', { class: 'btn-secondary', style: { color: 'var(--red)', borderColor: 'var(--red)' }, onClick: () => deleteFund(f.id) }, 'Excluir fundo'),
          h('button', { class: 'btn-primary', onClick: saveCurrentEdit }, isNew ? 'Criar fundo' : 'Salvar alterações'),
        ]),
      ]),
    ]),
  ]);
}

function renderFormSection(num, title, help, children) {
  return h('div', { class: 'fund-form-section' }, [
    h('div', { class: 'fund-form-section-head' }, [
      h('span', { class: 'fund-form-section-num' }, '§ ' + num),
      h('div', { class: 'fund-form-section-title' }, title),
    ]),
    help && h('p', { class: 'fund-form-section-help' }, help),
    ...children,
  ]);
}

function formField(label, input) {
  return h('div', { class: 'form-field' }, [
    h('label', { class: 'form-field-label' }, label),
    input,
  ]);
}

function renderPillarEditor(p, idx, f) {
  // Build slug picker grouped by taxonomy kind
  const groups = [
    { kind: 'macro',    label: 'Macro', items: TAXONOMY.macro },
    { kind: 'asset',    label: 'Asset', items: TAXONOMY.asset },
    { kind: 'micro',    label: 'Micro', items: TAXONOMY.micro },
    { kind: 'thematic', label: 'Theme', items: TAXONOMY.thematic },
  ];

  return h('div', { class: 'pillar-row' }, [
    h('div', { class: 'pillar-row-head' }, [
      h('span', { class: 'pillar-row-num' }, `Pilar ${idx + 1}`),
      h('button', {
        class: 'pillar-row-remove',
        onClick: () => { f.pillars.splice(idx, 1); render(); },
        title: 'Remover pilar',
      }, '×'),
    ]),
    h('div', { class: 'pillar-row-grid' }, [
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Descrição do pilar'),
        h('input', {
          class: 'form-field-input', type: 'text', value: p.desc || '',
          placeholder: 'Ex: Sobrepeso em logística sudeste pelo crescimento de e-commerce',
          oninput: e => p.desc = e.target.value,
        }),
        h('div', { style: { marginTop: '12px' } }, [
          h('label', { class: 'form-field-label' }, 'Tags selecionadas (clique abaixo para adicionar)'),
          h('div', { class: 'pillar-tags-selected' },
            (p.slugs || []).length === 0
              ? [h('span', { style: { fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic', padding: '4px 8px' } }, 'Nenhuma tag selecionada')]
              : p.slugs.map(slug => h('span', { class: 'pillar-tag' }, [
                  SLUG_META[slug]?.name || slug,
                  h('span', {
                    class: 'pillar-tag-remove',
                    onClick: () => { p.slugs = p.slugs.filter(s => s !== slug); render(); },
                  }, '×'),
                ]))
          ),
        ]),
        h('div', { class: 'pillar-slug-picker', style: { marginTop: '8px' } },
          groups.map(g => h('div', { style: { marginBottom: '6px' } }, [
            h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '4px' } }, g.label),
            ...g.items.map(item => h('span', {
              class: `pillar-slug-pill ${(p.slugs || []).includes(item.slug) ? 'selected' : ''}`,
              onClick: () => {
                p.slugs = p.slugs || [];
                if (p.slugs.includes(item.slug)) p.slugs = p.slugs.filter(s => s !== item.slug);
                else p.slugs.push(item.slug);
                render();
              },
            }, (item.flag || '') + ' ' + item.name)),
          ]))
        ),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Stance / Exposição'),
        h('select', {
          class: 'form-field-select',
          onchange: e => p.stance = e.target.value,
        }, PILLAR_STANCES.map(s =>
          h('option', { value: s, selected: p.stance === s ? 'selected' : null }, s)
        )),
        h('div', { class: 'form-field-help' }, 'OW=Overweight, MOW=Mod. OW, N=Neutro, MUW=Mod. UW, UW=Underweight'),
        h('div', { style: { marginTop: '12px' } }, [
          h('label', { class: 'form-field-label' }, 'Tipo'),
          h('select', {
            class: 'form-field-select',
            onchange: e => p.type = e.target.value,
          }, ['Estrutural', 'Tático', 'Hedge', 'Oportunístico'].map(t =>
            h('option', { value: t, selected: p.type === t ? 'selected' : null }, t)
          )),
        ]),
      ]),
    ]),
  ]);
}

function renderKPIPicker(f) {
  if (!f.kpi_macro) f.kpi_macro = [];
  // Group BCB series by category
  const groups = {};
  for (const [key, meta] of Object.entries(BCB_SERIES)) {
    if (!groups[meta.group]) groups[meta.group] = [];
    groups[meta.group].push({ key, meta });
  }
  const groupLabels = {
    rates: 'Juros', inflation: 'Inflação', realestate: 'Real Estate',
    fx: 'Câmbio', activity: 'Atividade', credit: 'Crédito',
  };

  return h('div', {}, [
    h('div', { class: 'kpi-picker-grid' },
      Object.entries(groups).flatMap(([group, items]) => [
        h('div', { style: { gridColumn: '1 / -1', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' } }, groupLabels[group] || group),
        ...items.map(({ key, meta }) => {
          const isOn = f.kpi_macro.includes(key);
          return h('div', {
            class: `kpi-picker-item ${isOn ? 'on' : ''}`,
            onClick: () => {
              if (isOn) f.kpi_macro = f.kpi_macro.filter(k => k !== key);
              else f.kpi_macro.push(key);
              render();
            },
          }, [
            h('div', { class: 'kpi-picker-checkbox' }, isOn ? '✓' : ''),
            h('span', { class: 'kpi-picker-label' }, meta.name2 || meta.name),
          ]);
        }),
      ])
    ),
    h('div', { class: 'form-field-help', style: { marginTop: '8px' } },
      `${f.kpi_macro.length} indicador(es) selecionado(s)`),
  ]);
}

/* ---------- Render: Fund Detail Panel ---------- */

function renderFundDetail() {
  const id = state.detail.slug;
  const f = getFund(id);
  if (!f) {
    return h('div', { class: 'content fade-up' }, [
      h('button', { class: 'back-btn', onClick: clearDetail }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),
      h('div', { class: 'empty' }, [
        h('div', { class: 'empty-title' }, 'Fundo não encontrado'),
      ]),
    ]);
  }

  const cls = FUND_CLASSES[f.classification] || { label: f.classification };
  const macroSeries = state._macro_series;

  // Trigger macro load if relevant KPIs and no series loaded yet
  if (f.kpi_macro?.length > 0 && !macroSeries && !state._macro_loading && !state._macro_error) {
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
    // Top bar
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      h('button', { class: 'back-btn', style: { margin: '0' }, onClick: clearDetail }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),
      h('div', { class: 'fund-detail-actions' }, [
        h('button', { class: 'btn-secondary', onClick: () => startEditFund(f.id) }, '✎ Editar fundo'),
      ]),
    ]),

    // Header
    h('div', { class: 'fund-detail-head' }, [
      h('div', {}, [
        h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.2em', marginBottom: '6px' } },
          'FUNDO · ' + cls.label.toUpperCase()),
        h('div', { class: 'fund-detail-name' }, f.name),
        h('div', { class: 'fund-detail-meta' }, [
          f.strategy && h('span', { class: 'badge' }, f.strategy),
          f.benchmark && h('span', { class: 'badge' }, `vs ${f.benchmark}`),
          f.aum && h('span', { class: 'badge' }, `AUM ${f.aum}`),
          f.liquidity && h('span', { class: 'badge' }, `Liq: ${f.liquidity}`),
          f.inception_date && h('span', { class: 'badge' }, `Início: ${f.inception_date}`),
        ]),
      ]),
    ]),

    // Section A: Tese
    f.thesis_summary && h('div', { class: 'fund-section' }, [
      sectionHead('01', 'Tese de Investimento', 'Tese central cadastrada para esse fundo.'),
      h('div', { style: { background: 'var(--bg-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--amber)', padding: '20px 24px' } }, [
        h('p', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px', lineHeight: '1.75', color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 } }, f.thesis_summary),
      ]),
    ]),

    // Section B: Pillars com status (cruzando com consenso)
    f.pillars?.length > 0 && h('div', { class: 'fund-section' }, [
      sectionHead('02', 'Pilares — Status vs Consenso Global',
        'Para cada pilar, o sistema avalia se as gestoras tracked confirmam ou contradizem a tese.'),
      h('div', {}, f.pillars.map((p, idx) => renderPillarStatus(p, idx))),
    ]),

    // Section C: KPIs vigiados
    f.kpi_macro?.length > 0 && h('div', { class: 'fund-section' }, [
      sectionHead('03', 'KPIs Macroeconômicos Vigiados',
        'Indicadores BCB selecionados como relevantes para esse fundo.'),
      state._macro_error
        ? h('div', { style: { padding: '20px', background: 'var(--bg-2)', border: '1px solid var(--red)', color: 'var(--text-muted)', fontSize: '12px' } },
            'Erro ao carregar dados macro: ' + state._macro_error)
        : !macroSeries
          ? h('div', { style: { padding: '20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px' } }, 'Carregando indicadores BCB…')
          : h('div', { class: 'fund-kpi-grid' },
              f.kpi_macro.map(k => renderMacroCard(k, macroSeries))
            ),
    ]),

    // Section D: Consenso Global Relevante
    f.pillars?.length > 0 && h('div', { class: 'fund-section' }, [
      sectionHead('04', 'Consenso Global nos Slugs do Fundo',
        'Visões agregadas das gestoras tracked sobre os tópicos cobertos pelos pilares.'),
      renderFundConsensusSummary(f),
    ]),

    // Section E: Eventos & Triggers
    (f.kpi_events || f.triggers) && h('div', { class: 'fund-section' }, [
      sectionHead('05', 'Eventos & Triggers Cadastrados',
        'Notas livres de monitoramento.'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' } }, [
        f.kpi_events && h('div', { style: { padding: '16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderTop: '2px solid #d4a574' } }, [
          h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px' } }, 'Eventos a monitorar'),
          h('p', { style: { fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.7', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: 0 } }, f.kpi_events),
        ]),
        f.triggers && h('div', { style: { padding: '16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderTop: '2px solid var(--red)' } }, [
          h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px' } }, 'Triggers de revisão'),
          h('p', { style: { fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.7', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: 0 } }, f.triggers),
        ]),
      ]),
    ]),

    // Section F: Bancos Centrais — últimas decisões
    (getLatestCBMinute('copom') || getLatestCBMinute('fomc')) && h('div', { class: 'fund-section' }, [
      sectionHead('06', 'Bancos Centrais — Últimas Decisões',
        'Decisões mais recentes de COPOM e FOMC ingeridas. Contexto macro para revisitar a tese.'),
      renderCBWidgets(),
    ]),

    // Section G: Pressão sobre pilares (sinais recentes)
    f.pillars?.length > 0 && h('div', { class: 'fund-section' }, [
      sectionHead('07', 'Pressão sobre Pilares — Sinais Recentes',
        'Views novas e atas BC desde a última visita, cruzadas com os pilares. Contra = evidência contrária ao stance; pró = alinhada.'),
      renderFundPressurePanel(f),
    ]),

    // Section H: Questionamento socrático
    f.pillars?.length > 0 && h('div', { class: 'fund-section' }, [
      sectionHead('08', 'Questionamento Socrático',
        'Perguntas difíceis via Gemini para forçar revisão das premissas. Estilo "sócio cético", não "assistente simpático".'),
      renderSocraticPanel(f),
    ]),

    // Section I: Histórico de revisões de tese
    (f.pillar_revisions?.length > 0) && h('div', { class: 'fund-section' }, [
      sectionHead('09', 'Histórico de Revisões',
        'Todas as alterações nos pilares ficam registradas automaticamente. Base para post-mortem e aprendizado.'),
      renderPillarRevisions(f),
    ]),

    // Section J: Anotações
    h('div', { class: 'fund-section' }, [
      sectionHead('10', 'Anotações do Gestor',
        'Notas livres com timestamp. Compõem o histórico do pensamento.'),
      renderFundNotes(f),
    ]),
  ]);
}

function renderPillarStatus(p, idx) {
  const status = computePillarStatus(p);
  const meta = PILLAR_STATUS[status.key];

  return h('div', { class: 'pillar-card' }, [
    h('div', { class: 'pillar-card-head' }, [
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'baseline' } }, [
        h('span', { class: 'pillar-card-num' }, `Pilar ${idx + 1}`),
        h('span', { class: `pillar-card-stance ${p.stance}` }, p.stance),
        p.type && h('span', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-faint)' } }, p.type),
      ]),
      h('span', { class: `pillar-card-status ${status.key}`, title: meta.desc }, meta.label),
    ]),
    p.desc && h('div', { class: 'pillar-card-desc' }, p.desc),
    p.slugs?.length > 0 && h('div', { class: 'pillar-card-meta' },
      p.slugs.map(s => h('span', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', padding: '2px 6px', background: 'var(--bg-3)', color: 'var(--text-muted)' } },
        SLUG_META[s]?.name || s))
    ),
    status.evidence?.length > 0 && h('div', { class: 'pillar-evidence' }, [
      h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' } }, 'Evidências do consenso global'),
      ...status.evidence.map(ev => h('div', { class: 'pillar-evidence-row' }, [
        h('span', { class: 'pillar-evidence-icon' }, ev.icon),
        h('span', {}, ev.text),
      ])),
    ]),
  ]);
}

// Determines if pillar is being confirmed, mixed or challenged by global consensus
function computePillarStatus(p) {
  if (!p.slugs || p.slugs.length === 0 || !DB.views || DB.views.length === 0) {
    return { key: 'no-data', evidence: [] };
  }

  const stanceMap = { OW: 2, MOW: 1, N: 0, MUW: -1, UW: -2 };
  const targetSign = stanceMap[p.stance] || 0;

  let confirming = 0, contradicting = 0;
  const evidence = [];

  for (const slug of p.slugs) {
    const consensus = computeConsensus(slug);
    if (!consensus) continue;
    const consensusSign = stanceMap[consensus.stance] || 0;

    // If pillar is OW/MOW (positive) and consensus is positive → confirming
    // If pillar is UW/MUW (negative) and consensus is negative → confirming
    // Opposite signs → contradicting
    // N → mixed
    if (targetSign === 0 || consensusSign === 0) {
      // Neutral pillar or neutral consensus — count as mixed signal
    } else if ((targetSign > 0 && consensusSign > 0) || (targetSign < 0 && consensusSign < 0)) {
      confirming++;
      evidence.push({
        icon: '✓',
        text: `${SLUG_META[slug]?.name || slug}: consenso ${consensus.stance} (${consensus.count} gestoras, ${Math.round(consensus.conviction * 100)}% convicção) — alinhado com pilar`,
      });
    } else {
      contradicting++;
      evidence.push({
        icon: '✗',
        text: `${SLUG_META[slug]?.name || slug}: consenso ${consensus.stance} (${consensus.count} gestoras) — contrário ao pilar (${p.stance})`,
      });
    }
  }

  let key = 'mixed';
  if (confirming > 0 && contradicting === 0) key = 'confirming';
  else if (contradicting > 0 && confirming === 0) key = 'challenging';
  else if (confirming === 0 && contradicting === 0) key = 'no-data';

  return { key, evidence, confirming, contradicting };
}

function renderFundConsensusSummary(f) {
  const allSlugs = new Set();
  for (const p of f.pillars || []) {
    for (const s of (p.slugs || [])) allSlugs.add(s);
  }

  if (allSlugs.size === 0) {
    return h('div', { style: { padding: '20px', background: 'var(--bg-2)', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px' } },
      'Nenhum slug selecionado nos pilares.');
  }

  const consensusList = [...allSlugs].map(slug => ({
    slug, name: SLUG_META[slug]?.name || slug,
    consensus: computeConsensus(slug),
  })).filter(c => c.consensus);

  if (consensusList.length === 0) {
    return h('div', { style: { padding: '20px', background: 'var(--bg-2)', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px' } },
      'Nenhum dos slugs cobertos pelos pilares tem visão extraída no momento. Ingira relatórios das gestoras tracked para popular o consenso.');
  }

  return h('table', { style: { width: '100%', borderCollapse: 'collapse', background: 'var(--bg-2)', border: '1px solid var(--border)' } }, [
    h('thead', {}, [
      h('tr', {}, [
        h('th', { style: { textAlign: 'left', padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '1px solid var(--border)' } }, 'Tópico'),
        h('th', { style: { textAlign: 'center', padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '1px solid var(--border)' } }, 'Stance'),
        h('th', { style: { textAlign: 'center', padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '1px solid var(--border)' } }, 'Convicção'),
        h('th', { style: { textAlign: 'right', padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '1px solid var(--border)' } }, 'Gestoras'),
      ]),
    ]),
    h('tbody', {}, consensusList.map(c =>
      h('tr', {
        style: { cursor: 'pointer', transition: 'background 0.15s' },
        onClick: () => {
          const taxKind = SLUG_META[c.slug]?.kind;
          if (taxKind) setDetail(taxKind, c.slug);
        },
      }, [
        h('td', { style: { padding: '10px 14px', fontSize: '13px', borderBottom: '1px solid var(--border)' } }, c.name),
        h('td', { style: { padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid var(--border)' } }, stanceBadge(c.consensus.stance, 'xs')),
        h('td', { style: { padding: '10px 14px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' } },
          Math.round(c.consensus.conviction * 100) + '%'),
        h('td', { style: { padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' } },
          String(c.consensus.count)),
      ])
    )),
  ]);
}

function renderFundNotes(f) {
  if (!f.notes) f.notes = [];
  return h('div', { class: 'fund-notes' }, [
    h('div', { class: 'fund-note-add' }, [
      h('textarea', {
        id: 'fund-note-input',
        placeholder: 'Anote uma observação, decisão, dúvida ou hipótese sobre o fundo... (Ctrl+Enter para salvar)',
        onkeydown: (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') addFundNote(f.id);
        },
      }),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } }, [
        h('button', { class: 'btn-secondary', onClick: () => addFundNote(f.id) }, '+ Adicionar nota'),
      ]),
    ]),
    f.notes.length > 0 && h('div', { class: 'fund-note-list' },
      [...f.notes].reverse().map(n => h('div', { class: 'fund-note-row' }, [
        h('div', { class: 'fund-note-meta' }, [
          h('span', {}, new Date(n.ts).toLocaleString('pt-BR')),
          h('button', {
            style: { color: 'var(--text-faint)', fontSize: '11px' },
            onClick: () => removeFundNote(f.id, n.ts),
          }, '×'),
        ]),
        h('div', { class: 'fund-note-text' }, n.text),
      ]))
    ),
  ]);
}

function addFundNote(fundId) {
  const input = document.getElementById('fund-note-input');
  const text = input?.value?.trim();
  if (!text) return;
  const f = getFund(fundId);
  if (!f) return;
  if (!f.notes) f.notes = [];
  f.notes.push({ ts: Date.now(), text });
  saveFund(f);
  showToast('Nota adicionada');
  render();
}

function removeFundNote(fundId, ts) {
  const f = getFund(fundId);
  if (!f) return;
  f.notes = (f.notes || []).filter(n => n.ts !== ts);
  saveFund(f);
  render();
}


/* ============================================================
   22. ÂNGULO 3 — Applied Intelligence
   Morning Brief + Pillar Pressure + Socratic Questioning + Revision History
   ============================================================ */

/* ---------- last-visit tracking ---------- */

function getLastVisit() {
  return DB.lastVisit || null;
}

function touchLastVisit() {
  DB.previousVisit = DB.lastVisit || new Date().toISOString();
  DB.lastVisit = new Date().toISOString();
  saveDB(DB);
}

function getReferenceDate() {
  // Returns the timestamp we use to decide what's "new"
  // Uses previousVisit (the visit before current) to avoid trivial updates
  return DB.previousVisit || (() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString();
  })();
}

/* ---------- Change detection since reference date ---------- */

function detectChangesSince(refIso) {
  const refTs = new Date(refIso).getTime();
  const out = {
    newViews: [],        // views ingested after ref
    newCBMinutes: [],    // central bank minutes ingested after ref
    stanceShifts: [],    // consensus stance changes on slugs (approximation)
    newCatalysts: [],    // new catalysts mentioned recently
  };

  // New views
  const views = (DB.views || []).filter(v => {
    const vts = new Date(v.ingested_at || v.report_date || 0).getTime();
    return vts >= refTs;
  });
  out.newViews = views;

  // New CB minutes (ingested, not meeting_date)
  const cbs = (DB.cb_minutes || []).filter(m => {
    const ts = new Date(m.created_at || m.meeting_date || 0).getTime();
    return ts >= refTs;
  });
  out.newCBMinutes = cbs;

  return out;
}

/* ---------- Morning Brief ---------- */

async function generateMorningBrief() {
  if (!DB.settings.gemini_api_key) {
    showToast('Configure Gemini API key primeiro', true);
    setModal('settings');
    return;
  }

  state._brief_loading = true;
  render();

  try {
    const ref = getReferenceDate();
    const changes = detectChangesSince(ref);
    const series = state._macro_series;
    const indicators = series ? computeMacroIndicators(series) : null;
    const reCycle = indicators ? computeRealEstateCycle(indicators) : null;
    const credCycle = series && indicators ? computeCreditCycle(indicators, series) : null;

    // Build snapshot for Gemini
    const snapshot = {
      data_referencia: ref,
      novidades: {
        qtd_novos_outlooks: changes.newViews.length,
        qtd_novas_atas_bc: changes.newCBMinutes.length,
        outlooks_recentes: changes.newViews.slice(0, 15).map(v => ({
          gestora: v.manager_slug, topico: v.taxonomy_slug,
          stance: v.stance, conviccao: v.conviction,
          data: v.report_date,
        })),
        atas_recentes: changes.newCBMinutes.slice(0, 5).map(m => ({
          banco: m.bank, data: m.meeting_date,
          decisao: m.decision, magnitude_bps: m.magnitude_bps,
          taxa_pos: m.rate_after, tom: m.tone, resumo: m.summary,
        })),
      },
      macro_atual: indicators ? {
        selic: series?.selic?.slice(-1)?.[0]?.value,
        ipca_12m: indicators.ipca12m,
        juros_real: indicators.jurosReal,
        incc_12m: indicators.incc12m,
        credito_imob_yoy: indicators.credimobYoY,
        atividade_yoy: indicators.atividadeYoY,
        tendencia_inadimplencia_pp: indicators.inadimplenciaTrend,
        ciclo_imobiliario: reCycle ? `${reCycle.phase} (${reCycle.confidence}%)` : null,
        ciclo_credito: credCycle ? `${credCycle.phase} (${credCycle.confidence}%)` : null,
      } : null,
      fundos_casa: (DB.funds || []).map(f => {
        const pressures = computeFundPillarPressures(f);
        return {
          nome: f.name,
          classe: f.classification,
          estrategia: f.strategy,
          n_pilares: (f.pillars || []).length,
          pilares_sob_pressao: pressures.underPressure.length,
          pilares_confirmados: pressures.confirmed.length,
        };
      }),
    };

    const prompt = `Você é o "sócio júnior" de um gestor brasileiro focado em Real Estate e Crédito Privado. Produza um Morning Brief institucional em Português do Brasil.

Tom: editorial Financial Times, denso, direto, sem floreios. Evite jargão vago.

O brief deve ajudar o gestor a começar o dia sabendo:
1. O que mudou desde a última visita
2. O que isso implica para os fundos da casa
3. Em que ele deveria focar HOJE

Responda APENAS em JSON válido com este schema:

{
  "headline": "uma frase curta (max 15 palavras) capturando a essência do dia. Evite clichês como 'mercados em foco'.",
  "summary": "3-4 frases descrevendo o cenário atual e principais novidades. Específico, com números se relevante.",
  "whats_new": ["3-5 bullets do que mudou desde a última visita. Cada bullet específico, direto, com atribuição quando cabe."],
  "implications": ["2-4 bullets sobre implicações para os fundos da casa ou para a tese geral."],
  "focus_today": "uma frase com a recomendação do que merece atenção hoje. Prescritivo, não descritivo."
}

DADOS:
${JSON.stringify(snapshot, null, 2)}

Se houver poucos dados novos (ex: nenhum outlook novo, nenhuma ata nova, fundos sem pilares), adapte o brief para ser honesto sobre isso — não invente urgência. Um dia calmo pode ter um brief curto dizendo "poucos movimentos — bom momento para revisar teses existentes".`;

    const result = await callGeminiRaw(prompt, DB.settings.gemini_api_key, () => {});
    if (!result || !result.headline) throw new Error('Resposta inválida');

    const brief = {
      ...result,
      generated_at: new Date().toISOString(),
      reference_date: ref,
      context: {
        n_new_views: changes.newViews.length,
        n_new_cb: changes.newCBMinutes.length,
        n_funds: (DB.funds || []).length,
      },
    };

    DB.morningBrief = brief;
    saveDB(DB);
    state._brief_loading = false;
    showToast('Morning Brief gerado');
    render();
  } catch (err) {
    state._brief_loading = false;
    showToast('Erro: ' + err.message, true);
    render();
  }
}

function renderMorningBrief() {
  const brief = DB.morningBrief;
  const loading = state._brief_loading;
  const isStale = brief && (Date.now() - new Date(brief.generated_at).getTime()) > 24 * 60 * 60 * 1000;
  const isFresh = brief && (Date.now() - new Date(brief.generated_at).getTime()) < 6 * 60 * 60 * 1000;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Global Intelligence · Morning Brief', 'Morning <em>Brief</em>',
      'Síntese editorial das novidades desde sua última visita. Curadoria automática via Gemini para começar o dia sabendo onde focar.'),

    h('div', { class: 'brief-page' }, [
      h('div', { class: 'brief-actions-bar' }, [
        h('div', {}, [
          brief
            ? h('div', { class: 'brief-status ' + (isFresh ? 'fresh' : isStale ? 'stale' : '') },
                `Gerado: ${new Date(brief.generated_at).toLocaleString('pt-BR')}${isStale ? ' (desatualizado)' : ''}`)
            : h('div', { class: 'brief-status' }, 'Nenhum brief gerado ainda'),
        ]),
        h('button', {
          class: loading ? 'btn-secondary' : 'btn-primary',
          disabled: loading ? 'disabled' : null,
          onClick: () => { if (!loading) generateMorningBrief(); },
        }, loading ? 'Gerando…' : (brief ? '↻ Regenerar brief' : '✨ Gerar brief')),
      ]),

      loading && !brief && h('div', { class: 'brief-empty' }, [
        h('div', { class: 'brief-empty-icon' }, '⏳'),
        h('div', { class: 'brief-empty-title' }, 'Gerando Morning Brief…'),
        h('p', { class: 'brief-empty-desc' },
          'Analisando novidades desde a última visita, indicadores macro atuais, status dos fundos da casa.'),
      ]),

      !brief && !loading && renderBriefEmpty(),

      brief && renderBriefContent(brief),
    ]),
  ]);
}

function renderBriefEmpty() {
  return h('div', { class: 'brief-empty' }, [
    h('div', { class: 'brief-empty-icon' }, '☀'),
    h('div', { class: 'brief-empty-title' }, 'Comece o dia com um brief curado'),
    h('p', { class: 'brief-empty-desc' },
      'O Morning Brief é uma síntese editorial gerada sob demanda: novidades desde sua última visita, cenário macro atual, implicações para os fundos da casa e foco sugerido para o dia. Clique em "Gerar brief" acima.'),
  ]);
}

function renderBriefContent(brief) {
  const ctx = brief.context || {};
  const date = new Date(brief.generated_at);
  const dateLabel = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return h('div', { class: 'brief-content' }, [
    h('div', { class: 'brief-date' }, dateLabel),
    h('div', { class: 'brief-headline' }, brief.headline),

    h('div', { class: 'brief-context-badges' }, [
      h('span', { class: 'brief-badge' + (ctx.n_new_views > 0 ? ' highlight' : '') },
        `${ctx.n_new_views || 0} novos outlook(s)`),
      h('span', { class: 'brief-badge' + (ctx.n_new_cb > 0 ? ' highlight' : '') },
        `${ctx.n_new_cb || 0} nova(s) ata(s) BC`),
      h('span', { class: 'brief-badge' }, `${ctx.n_funds || 0} fundos cadastrados`),
      h('span', { class: 'brief-badge' }, `ref: desde ${new Date(brief.reference_date).toLocaleDateString('pt-BR')}`),
    ]),

    brief.summary && h('div', { class: 'brief-section' }, [
      h('div', { class: 'brief-section-title' }, 'Cenário'),
      h('p', { class: 'brief-section-text' }, brief.summary),
    ]),

    brief.whats_new?.length > 0 && h('div', { class: 'brief-section' }, [
      h('div', { class: 'brief-section-title' }, 'O que mudou'),
      h('ul', { class: 'brief-bullets' }, brief.whats_new.map(b => h('li', {}, b))),
    ]),

    brief.implications?.length > 0 && h('div', { class: 'brief-section' }, [
      h('div', { class: 'brief-section-title' }, 'Implicações'),
      h('ul', { class: 'brief-bullets' }, brief.implications.map(b => h('li', {}, b))),
    ]),

    brief.focus_today && h('div', { class: 'brief-priority' }, [
      h('div', { class: 'brief-priority-label' }, 'Foco do dia'),
      h('div', { class: 'brief-priority-text' }, brief.focus_today),
    ]),
  ]);
}

/* ---------- Pillar Pressure Detection ---------- */

// Computes pressure signals for each pillar of a fund
function computeFundPillarPressures(fund) {
  const out = { underPressure: [], confirmed: [], neutral: [], byPillar: [] };
  if (!fund.pillars || fund.pillars.length === 0) return out;

  const recentRef = getReferenceDate();
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86400 * 1000).toISOString();
  const refIso = recentRef < thirtyDaysAgo ? recentRef : thirtyDaysAgo;
  const refTs = new Date(refIso).getTime();

  fund.pillars.forEach((pillar, idx) => {
    const result = computePillarPressureSignals(pillar, refTs);
    out.byPillar.push({ pillar, idx, ...result });
    if (result.contraryCount > result.supportingCount && result.contraryCount > 0) {
      out.underPressure.push({ pillar, idx, ...result });
    } else if (result.supportingCount > result.contraryCount && result.supportingCount > 0) {
      out.confirmed.push({ pillar, idx, ...result });
    } else {
      out.neutral.push({ pillar, idx, ...result });
    }
  });

  return out;
}

function computePillarPressureSignals(pillar, refTs) {
  const signals = [];
  let contraryCount = 0;
  let supportingCount = 0;
  const slugs = pillar.slugs || [];
  const stanceMap = { OW: 2, MOW: 1, N: 0, MUW: -1, UW: -2 };
  const pillarSign = stanceMap[pillar.stance] || 0;

  // Signal source 1: Recent views on the pillar's slugs
  const recentViews = (DB.views || []).filter(v => {
    const vts = new Date(v.ingested_at || v.report_date || 0).getTime();
    return vts >= refTs && slugs.includes(v.taxonomy_slug);
  });

  recentViews.forEach(v => {
    const viewSign = stanceMap[v.stance] || 0;
    if (pillarSign === 0 || viewSign === 0) return;
    if ((pillarSign > 0 && viewSign < 0) || (pillarSign < 0 && viewSign > 0)) {
      contraryCount++;
      signals.push({
        source: v.manager_slug,
        date: v.report_date || v.ingested_at,
        type: 'view',
        kind: 'contrary',
        text: `${v.manager_slug.toUpperCase()} em ${SLUG_META[v.taxonomy_slug]?.name || v.taxonomy_slug}: ${v.stance} (convicção ${Math.round((v.conviction || 0) * 100)}%) — contrário ao pilar (${pillar.stance})`,
      });
    } else if ((pillarSign > 0 && viewSign > 0) || (pillarSign < 0 && viewSign < 0)) {
      supportingCount++;
      signals.push({
        source: v.manager_slug,
        date: v.report_date || v.ingested_at,
        type: 'view',
        kind: 'supporting',
        text: `${v.manager_slug.toUpperCase()} em ${SLUG_META[v.taxonomy_slug]?.name || v.taxonomy_slug}: ${v.stance} — alinhado com pilar (${pillar.stance})`,
      });
    }
  });

  // Signal source 2: Central Bank minutes (hawkish/dovish impact on rate-sensitive slugs)
  const rateSlugs = ['us_treasuries', 'dm_govt', 'em_bonds', 'investment_grade', 'high_yield',
                     'fixed_income_em', 'brazil', 'real_estate', 'reits'];
  const isRateSensitive = slugs.some(s => rateSlugs.includes(s));
  if (isRateSensitive) {
    const recentCBs = (DB.cb_minutes || []).filter(m => {
      const ts = new Date(m.created_at || m.meeting_date || 0).getTime();
      return ts >= refTs;
    });
    recentCBs.forEach(m => {
      const toneScore = m.tone_score != null ? m.tone_score : (m.tone === 'hawkish' ? 1 : m.tone === 'dovish' ? -1 : 0);
      if (Math.abs(toneScore) >= 1) {
        const hurts = (pillarSign > 0 && toneScore > 0) || (pillarSign < 0 && toneScore < 0 && slugs.includes('high_yield'));
        if (hurts) {
          contraryCount++;
          signals.push({
            source: CB_BANKS[m.bank]?.label || m.bank,
            date: m.meeting_date,
            type: 'cb',
            kind: 'contrary',
            text: `Ata ${CB_BANKS[m.bank]?.label || m.bank} ${formatBRDate(m.meeting_date)}: ${CB_TONES[m.tone]?.label || m.tone} — tende a pressionar pilar (${pillar.stance})`,
          });
        }
      }
    });
  }

  // Sort signals: contrary first, then most recent
  signals.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'contrary' ? -1 : 1;
    return (b.date || '').localeCompare(a.date || '');
  });

  return { signals, contraryCount, supportingCount, score: contraryCount - supportingCount };
}

function renderFundPressurePanel(fund) {
  const pressures = computeFundPillarPressures(fund);
  if (!fund.pillars || fund.pillars.length === 0) return null;

  const total = pressures.byPillar.length;
  const nPressure = pressures.underPressure.length;
  const nConfirmed = pressures.confirmed.length;

  if (nPressure === 0 && nConfirmed === 0) {
    return h('div', { class: 'pressure-panel none' }, [
      h('div', { class: 'pressure-panel-head' }, [
        h('span', { class: 'pressure-panel-title green' }, 'Pilares sem sinais relevantes'),
      ]),
      h('div', { class: 'pressure-panel-summary' },
        'Nenhuma view nova ou ata BC recente mudou materialmente o status dos pilares desse fundo desde a última visita.'),
    ]);
  }

  return h('div', {}, [
    nPressure > 0 && h('div', { class: 'pressure-panel' }, [
      h('div', { class: 'pressure-panel-head' }, [
        h('span', { class: 'pressure-panel-title red' }, `${nPressure} pilar(es) sob pressão`),
        h('span', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-faint)' } },
          `${nPressure}/${total} pilares`),
      ]),
      h('div', { class: 'pressure-panel-summary' },
        'Evidências recentes contrariam o stance desses pilares. Considere revisão.'),
      ...pressures.underPressure.map(p => renderPressurePillarCard(p, 'contra')),
    ]),

    nConfirmed > 0 && h('div', { class: 'pressure-panel none', style: { borderLeftColor: 'var(--green)' } }, [
      h('div', { class: 'pressure-panel-head' }, [
        h('span', { class: 'pressure-panel-title green' }, `${nConfirmed} pilar(es) confirmado(s) recentemente`),
      ]),
      h('div', { class: 'pressure-panel-summary' },
        'Evidências recentes apoiam esses pilares.'),
      ...pressures.confirmed.slice(0, 3).map(p => renderPressurePillarCard(p, 'pro')),
    ]),
  ]);
}

function renderPressurePillarCard(p, kind) {
  return h('div', { class: 'pressure-pillar-card ' + kind }, [
    h('div', { class: 'pressure-pillar-card-head' }, [
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'baseline' } }, [
        h('span', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.15em' } },
          `Pilar ${p.idx + 1}`),
        h('span', { class: `pillar-card-stance ${p.pillar.stance}` }, p.pillar.stance),
      ]),
      h('span', { class: 'pressure-score ' + (Math.abs(p.score) >= 3 ? 'high' : Math.abs(p.score) >= 1 ? 'medium' : 'low') },
        `score ${p.score > 0 ? '+' : ''}${p.score}`),
    ]),
    p.pillar.desc && h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '13px', color: 'var(--text)', marginBottom: '10px' } },
      p.pillar.desc),
    p.signals?.length > 0 && h('div', {},
      p.signals.slice(0, 4).map(s => h('div', { class: 'pressure-signal' }, [
        h('div', { class: 'pressure-signal-head' }, [
          h('span', { class: 'pressure-signal-source' }, s.source + (s.kind === 'contrary' ? ' ✗' : ' ✓')),
          h('span', { class: 'pressure-signal-date' }, s.date ? formatBRDate(s.date) : ''),
        ]),
        h('div', { class: 'pressure-signal-text' }, s.text),
      ]))
    ),
  ]);
}

// Compact alert badge for fund cards in the list
function renderFundAlertBadges(fund) {
  const pressures = computeFundPillarPressures(fund);
  const nP = pressures.underPressure.length;
  const nC = pressures.confirmed.length;
  if (nP === 0 && nC === 0) return null;
  return h('div', { class: 'fund-card-alerts' }, [
    nP > 0 && h('span', { class: 'pressure-alert' }, `⚠ ${nP} sob pressão`),
    nC > 0 && h('span', { class: 'pressure-score low', style: { color: 'var(--green)', borderColor: 'var(--green)' } }, `✓ ${nC} confirmado(s)`),
  ]);
}

/* ---------- Socratic Questioning ---------- */

async function generateSocraticQuestions(fundId) {
  if (!DB.settings.gemini_api_key) {
    showToast('Configure Gemini API key primeiro', true);
    setModal('settings');
    return;
  }

  const fund = getFund(fundId);
  if (!fund) return;

  state._socratic_loading = state._socratic_loading || {};
  state._socratic_loading[fundId] = true;
  render();

  try {
    const series = state._macro_series;
    const indicators = series ? computeMacroIndicators(series) : null;
    const reCycle = indicators ? computeRealEstateCycle(indicators) : null;
    const credCycle = series && indicators ? computeCreditCycle(indicators, series) : null;

    // Build context for each pillar including global consensus
    const pillarsCtx = (fund.pillars || []).map(p => ({
      descricao: p.desc,
      stance: p.stance,
      tipo: p.type,
      topicos: (p.slugs || []).map(s => {
        const c = computeConsensus(s);
        return {
          slug: s,
          nome: SLUG_META[s]?.name || s,
          consenso_global: c ? { stance: c.stance, conviccao: c.conviction, n_gestoras: c.count } : null,
        };
      }),
    }));

    const prompt = `Você é um membro sênior do comitê de investimento de uma gestora brasileira. Vou te passar um fundo com sua tese e pilares. Sua tarefa é QUESTIONAR com rigor — fazer as perguntas difíceis que um comitê faria.

Tom: direto, específico, desconfortável. Não é "assistente simpático" — é "sócio cético que te força a defender tuas premissas". Em Português do Brasil.

Produza 4-6 perguntas socráticas. Cada uma deve:
1. Ser específica (aponta um pilar, um número, um cenário)
2. Forçar o gestor a revisitar uma premissa
3. Considerar cenários adversos concretos
4. Usar dados do contexto quando couber

Responda APENAS em JSON válido:

{
  "intro": "1-2 frases de abertura (sem floreio, direto)",
  "questions": [
    {
      "question": "a pergunta, específica e cirúrgica",
      "context": "por que essa pergunta é relevante AGORA (1 frase)"
    }
  ]
}

CONTEXTO:
Fundo: ${fund.name}
Classificação: ${FUND_CLASSES[fund.classification]?.label || fund.classification}
Estratégia: ${fund.strategy}
Benchmark: ${fund.benchmark}

Tese central:
${fund.thesis_summary || '(não descrita)'}

Pilares:
${JSON.stringify(pillarsCtx, null, 2)}

Macro atual (Brasil):
${JSON.stringify({
  selic: series?.selic?.slice(-1)?.[0]?.value,
  ipca_12m: indicators?.ipca12m,
  juros_real: indicators?.jurosReal,
  ciclo_imobiliario: reCycle ? `${reCycle.phase} (${reCycle.confidence}%)` : null,
  ciclo_credito: credCycle ? `${credCycle.phase} (${credCycle.confidence}%)` : null,
}, null, 2)}

Triggers declarados para revisão:
${fund.triggers || '(não declarados)'}`;

    const result = await callGeminiRaw(prompt, DB.settings.gemini_api_key, () => {});
    if (!result || !Array.isArray(result.questions)) throw new Error('Resposta inválida');

    state._socratic_results = state._socratic_results || {};
    state._socratic_results[fundId] = {
      ...result,
      generated_at: new Date().toISOString(),
    };
    state._socratic_loading[fundId] = false;
    render();
    showToast('Perguntas geradas');
  } catch (err) {
    state._socratic_loading[fundId] = false;
    showToast('Erro: ' + err.message, true);
    render();
  }
}

function renderSocraticPanel(fund) {
  const loading = state._socratic_loading?.[fund.id];
  const result = state._socratic_results?.[fund.id];

  return h('div', { class: 'socratic-panel' }, [
    h('div', { class: 'socratic-head' }, [
      h('span', { class: 'socratic-label' }, '· Questionamento Socrático'),
      h('button', {
        class: loading ? 'btn-secondary' : 'btn-primary',
        disabled: loading ? 'disabled' : null,
        onClick: () => { if (!loading) generateSocraticQuestions(fund.id); },
      }, loading ? 'Gerando…' : (result ? '↻ Novas perguntas' : '✨ Gerar perguntas')),
    ]),

    !result && !loading && h('div', { class: 'socratic-intro' },
      'Gere 4-6 perguntas difíceis sobre a tese e os pilares do fundo. O prompt é desenhado para "sócio cético" — questiona premissas, força cenários adversos, não concorda com tudo.'),

    loading && h('div', { class: 'socratic-loading' }, 'Analisando tese, pilares e contexto macro…'),

    result && h('div', {}, [
      result.intro && h('div', { class: 'socratic-intro' }, result.intro),
      ...result.questions.map((q, idx) => h('div', { class: 'socratic-question' }, [
        h('div', { class: 'socratic-question-num' }, `Pergunta ${idx + 1}`),
        h('div', { class: 'socratic-question-text' }, q.question),
        q.context && h('div', { class: 'socratic-question-context' }, q.context),
      ])),
      h('div', { style: { marginTop: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-faint)', letterSpacing: '0.15em' } },
        'Gerado em ' + new Date(result.generated_at).toLocaleString('pt-BR')),
    ]),
  ]);
}

/* ---------- Pillar Revision History (Backtest preparation) ---------- */

function renderPillarRevisions(fund) {
  const revisions = fund.pillar_revisions || [];
  if (revisions.length === 0) {
    return h('div', { style: { padding: '24px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px', fontStyle: 'italic' } },
      'Nenhuma revisão registrada. Toda alteração nos pilares será registrada aqui automaticamente.');
  }

  // Show most recent first
  const sorted = [...revisions].reverse();

  return h('div', { class: 'revision-timeline' },
    sorted.map(r => renderRevisionRow(r))
  );
}

function renderRevisionRow(r) {
  const d = new Date(r.ts);
  const dateLabel = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeLabel = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let head = '';
  let detail = '';
  switch (r.type) {
    case 'created':
      head = `Pilar ${r.pillar_idx + 1} criado — ${r.stance}`;
      detail = r.pillar_desc || '(sem descrição)';
      break;
    case 'added':
      head = `Pilar ${r.pillar_idx + 1} adicionado — ${r.stance}`;
      detail = r.pillar_desc || '(sem descrição)';
      break;
    case 'removed':
      head = `Pilar ${r.pillar_idx + 1} removido`;
      detail = r.pillar_desc || '(sem descrição)';
      break;
    case 'stance_changed':
      head = `Pilar ${r.pillar_idx + 1}: stance ${r.from_stance} → ${r.to_stance}`;
      detail = r.pillar_desc || '';
      break;
    case 'desc_changed':
      head = `Pilar ${r.pillar_idx + 1}: descrição atualizada`;
      detail = `De: "${r.from_desc || '—'}" → Para: "${r.to_desc || '—'}"`;
      break;
    case 'slugs_changed':
      head = `Pilar ${r.pillar_idx + 1}: tags/slugs ajustados`;
      detail = r.pillar_desc || '';
      break;
    default:
      head = `Revisão: ${r.type}`;
      detail = r.pillar_desc || '';
  }

  return h('div', { class: 'revision-row' }, [
    h('div', { class: 'revision-date' }, `${dateLabel} · ${timeLabel}`),
    h('div', { class: 'revision-head' }, head),
    h('div', { class: 'revision-detail' }, detail),
    r.reason && h('div', { class: 'revision-reason' }, '"' + r.reason + '"'),
  ]);
}


/* ============================================================
   24. MARKET LIVE MONITOR
   ============================================================ */

const MKT_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Market indicators we track
const MKT_INDICATORS = [
  { key: 'ibov',    label: 'IBOVESPA',   ticker: '^BVSP',    source: 'brapi', fmt: 'pts',  region: 'br' },
  { key: 'ifix',    label: 'IFIX',       ticker: 'IFIX',     source: 'brapi', fmt: 'pts',  region: 'br' },
  { key: 'usdbrl',  label: 'USD/BRL',    ticker: 'USDBRL',   source: 'brapi', fmt: 'fx',   region: 'br' },
  { key: 'selic',   label: 'SELIC Meta', ticker: null,       source: 'bcb',   fmt: 'pct',  region: 'br', bcb_key: 'selic' },
  { key: 'ipca12m', label: 'IPCA 12m',   ticker: null,       source: 'bcb',   fmt: 'pct',  region: 'br', bcb_key: 'ipca12m' },
  { key: 'di1y',    label: 'CDI (DI)',    ticker: null,       source: 'bcb',   fmt: 'pct',  region: 'br', bcb_key: 'cdi' },
  { key: 'sp500',   label: 'S&P 500',    ticker: 'SPY',      source: 'finnhub', fmt: 'usd', region: 'us' },
];

async function loadMarketData() {
  // Check cache
  if (state._mkt_cache && (Date.now() - state._mkt_cache.ts) < MKT_CACHE_TTL) {
    return state._mkt_cache.data;
  }

  const results = {};

  // Batch 1: brapi tickers
  const brapiTickers = MKT_INDICATORS.filter(i => i.source === 'brapi');
  await Promise.all(brapiTickers.map(async (ind) => {
    try {
      const res = await brapiFetch(ind.ticker);
      const r = res.results?.[0];
      if (r) {
        results[ind.key] = {
          value: r.regularMarketPrice,
          change: r.regularMarketChange,
          changePct: r.regularMarketChangePercent,
          prevClose: r.regularMarketPreviousClose,
          time: r.regularMarketTime ? new Date(r.regularMarketTime * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null,
          source: 'brapi',
        };
      }
    } catch (err) {
      console.warn(`Market ${ind.key} failed:`, err.message);
      results[ind.key] = { error: err.message };
    }
  }));

  // Batch 2: BCB data (from already-loaded macro series)
  const bcbInds = MKT_INDICATORS.filter(i => i.source === 'bcb');
  const series = state._macro_series;
  for (const ind of bcbInds) {
    if (series && series[ind.bcb_key]) {
      const s = series[ind.bcb_key];
      const last = s[s.length - 1];
      const prev = s.length > 1 ? s[s.length - 2] : null;
      results[ind.key] = {
        value: last?.value,
        change: prev ? last.value - prev.value : null,
        changePct: prev && prev.value ? ((last.value - prev.value) / prev.value) * 100 : null,
        time: last?.date,
        source: 'bcb',
      };
    }
  }

  // Batch 3: Finnhub (only if key available)
  const finnhubInds = MKT_INDICATORS.filter(i => i.source === 'finnhub');
  if (DB.settings.finnhub_api_key) {
    await Promise.all(finnhubInds.map(async (ind) => {
      try {
        const data = await finnhubFetch('/quote', { symbol: ind.ticker });
        if (data && data.c) {
          results[ind.key] = {
            value: data.c,
            change: data.d,
            changePct: data.dp,
            prevClose: data.pc,
            time: data.t ? new Date(data.t * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null,
            source: 'finnhub',
          };
        }
      } catch (err) {
        console.warn(`Market ${ind.key} failed:`, err.message);
        results[ind.key] = { error: err.message };
      }
    }));
  }

  state._mkt_cache = { ts: Date.now(), data: results };
  return results;
}

function renderMarketMonitor() {
  const data = state._mkt_data;
  const loading = state._mkt_loading;

  // Trigger load on first render
  if (!data && !loading) {
    state._mkt_loading = true;
    loadMarketData().then(d => {
      state._mkt_data = d;
      state._mkt_loading = false;
      render();
    }).catch(err => {
      state._mkt_loading = false;
      console.warn('Market monitor error:', err);
      render();
    });
  }

  return h('div', {}, [
    h('div', { class: 'mkt-monitor-head' }, [
      h('span', { class: 'mkt-monitor-title' }, 'Market Monitor'),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
        loading && h('span', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--amber)' } }, 'carregando…'),
        state._mkt_cache && h('span', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-faint)' } },
          `atualizado ${new Date(state._mkt_cache.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`),
        h('button', { class: 'mkt-monitor-refresh', onClick: () => {
          state._mkt_cache = null;
          state._mkt_data = null;
          state._mkt_loading = false;
          render();
        }}, '↻'),
      ]),
    ]),

    h('div', { class: 'mkt-monitor' },
      MKT_INDICATORS.map(ind => renderMktCard(ind, data))
    ),
  ]);
}

function renderMktCard(ind, data) {
  const d = data?.[ind.key];
  const hasData = d && d.value != null && !d.error;
  const changeDir = d?.changePct > 0 ? 'up' : d?.changePct < 0 ? 'down' : 'flat';

  let fmtValue = '—';
  if (hasData) {
    switch (ind.fmt) {
      case 'pts':  fmtValue = d.value >= 10000 ? (d.value / 1000).toFixed(1) + 'k' : d.value.toFixed(0); break;
      case 'fx':   fmtValue = 'R$ ' + d.value.toFixed(4); break;
      case 'pct':  fmtValue = d.value.toFixed(2) + '%'; break;
      case 'usd':  fmtValue = '$' + d.value.toFixed(2); break;
      default:     fmtValue = d.value.toFixed(2);
    }
  }

  let fmtChange = '';
  if (hasData && d.changePct != null) {
    fmtChange = (d.changePct >= 0 ? '+' : '') + d.changePct.toFixed(2) + '%';
    if (d.change != null && (ind.fmt === 'pts' || ind.fmt === 'usd' || ind.fmt === 'fx')) {
      fmtChange += ` (${d.change >= 0 ? '+' : ''}${d.change.toFixed(ind.fmt === 'fx' ? 4 : 2)})`;
    }
  }

  return h('div', { class: 'mkt-card' }, [
    h('div', { class: 'mkt-card-label' }, ind.label),
    h('div', { class: 'mkt-card-value' }, fmtValue),
    hasData && d.changePct != null && h('div', { class: 'mkt-card-change ' + changeDir }, fmtChange),
    d?.error && h('div', { class: 'mkt-card-sub', style: { color: 'var(--red)' } }, 'erro'),
    !hasData && !d?.error && h('div', { class: 'mkt-card-sub' }, state._mkt_loading ? '…' : `${ind.source}`),
    d?.time && h('div', { class: 'mkt-card-sub' }, d.time),
  ]);
}


/* ============================================================
   30. CARTEIRAS MENSAIS DOS FUNDOS
   Registro, comparação e análise de posições por fundo
   ============================================================ */

/* ---------- Data Layer ---------- */

function getCarteiras(fundId) {
  if (!DB.carteiras) DB.carteiras = {};
  if (!Array.isArray(DB.carteiras[fundId])) DB.carteiras[fundId] = [];
  return DB.carteiras[fundId];
}

function getLatestCarteira(fundId) {
  const all = getCarteiras(fundId);
  return all.length > 0 ? all[all.length - 1] : null;
}

function addCarteira(fundId, snapshot) {
  if (!DB.carteiras) DB.carteiras = {};
  if (!Array.isArray(DB.carteiras[fundId])) DB.carteiras[fundId] = [];
  // Check duplicate month
  const existing = DB.carteiras[fundId].findIndex(s => s.ref_date === snapshot.ref_date);
  if (existing >= 0) {
    if (!confirm(`Já existe carteira de ${snapshot.ref_date}. Sobrescrever?`)) return null;
    DB.carteiras[fundId][existing] = snapshot;
  } else {
    DB.carteiras[fundId].push(snapshot);
    DB.carteiras[fundId].sort((a, b) => a.ref_date.localeCompare(b.ref_date));
  }
  saveDB(DB);
  return snapshot.id;
}

function deleteCarteira(fundId, snapshotId) {
  if (!confirm('Excluir este snapshot de carteira?')) return;
  DB.carteiras[fundId] = getCarteiras(fundId).filter(s => s.id !== snapshotId);
  saveDB(DB);
  render();
}

function emptySnapshot(fundId, refDate) {
  return {
    id: 'snap_' + Date.now(),
    fund_id: fundId,
    ref_date: refDate || new Date().toISOString().substring(0, 7),
    aum: null,
    positions: [],
    created_at: new Date().toISOString(),
  };
}

function emptyPosition() {
  return {
    ticker: '', name: '',
    asset_class: 'rf', sub_class: 'cdi',
    weight_pct: 0, notional: null,
    indexador: 'cdi', duration: null,
    rating: null, maturity: null, sector: '',
  };
}

/* ---------- Carteira Aggregations ---------- */

function aggregateCarteira(snapshot) {
  const positions = snapshot.positions || [];
  const totalWeight = positions.reduce((a, p) => a + (p.weight_pct || 0), 0);

  const byClass = {}, bySub = {}, byIndexador = {}, bySector = {};
  for (const pos of positions) {
    const cls = pos.asset_class || 'rf';
    const sub = pos.sub_class || 'other';
    const idx = pos.indexador || 'none';
    const sec = pos.sector || 'Outros';

    if (!byClass[cls]) byClass[cls] = { weight: 0, count: 0, notional: 0 };
    byClass[cls].weight += pos.weight_pct || 0;
    byClass[cls].count++;
    byClass[cls].notional += pos.notional || 0;

    if (!bySub[sub]) bySub[sub] = { weight: 0, count: 0 };
    bySub[sub].weight += pos.weight_pct || 0;
    bySub[sub].count++;

    if (!byIndexador[idx]) byIndexador[idx] = { weight: 0, count: 0 };
    byIndexador[idx].weight += pos.weight_pct || 0;
    byIndexador[idx].count++;

    if (!bySector[sec]) bySector[sec] = { weight: 0, count: 0 };
    bySector[sec].weight += pos.weight_pct || 0;
    bySector[sec].count++;
  }

  // Duration média ponderada (só RF)
  let durationSum = 0, durationWeightSum = 0;
  for (const pos of positions) {
    if (pos.duration != null && pos.duration > 0) {
      durationSum += pos.duration * (pos.weight_pct || 0);
      durationWeightSum += pos.weight_pct || 0;
    }
  }
  const avgDuration = durationWeightSum > 0 ? durationSum / durationWeightSum : null;

  return { totalWeight, byClass, bySub, byIndexador, bySector, avgDuration, posCount: positions.length };
}

/* ---------- MoM Comparison ---------- */

function compareMoM(current, previous) {
  if (!current || !previous) return null;
  const currMap = {};
  for (const p of current.positions) currMap[p.ticker] = p;
  const prevMap = {};
  for (const p of previous.positions) prevMap[p.ticker] = p;

  const allTickers = new Set([...Object.keys(currMap), ...Object.keys(prevMap)]);
  const changes = [];

  for (const ticker of allTickers) {
    const curr = currMap[ticker];
    const prev = prevMap[ticker];
    if (curr && !prev) {
      changes.push({ ticker, name: curr.name, type: 'ENTRADA', currWeight: curr.weight_pct, prevWeight: 0, delta: curr.weight_pct });
    } else if (!curr && prev) {
      changes.push({ ticker, name: prev.name, type: 'SAÍDA', currWeight: 0, prevWeight: prev.weight_pct, delta: -prev.weight_pct });
    } else if (curr && prev) {
      const delta = (curr.weight_pct || 0) - (prev.weight_pct || 0);
      if (Math.abs(delta) > 0.01) {
        changes.push({ ticker, name: curr.name, type: delta > 0 ? 'AUMENTO' : 'REDUÇÃO', currWeight: curr.weight_pct, prevWeight: prev.weight_pct, delta });
      }
    }
  }

  changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return changes;
}

/* ---------- Excel/CSV Parser ---------- */

function parseCarteiraExcel(file, fundId, refDate) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false, raw: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

        if (!rows || rows.length < 2) throw new Error('Planilha vazia ou sem dados suficientes');

        // Auto-detect columns by header names
        const headerRow = rows[0].map(h => String(h || '').toLowerCase().trim());
        const colMap = detectCarteiraColumns(headerRow);

        if (!colMap.ticker && !colMap.name) {
          throw new Error('Não encontrei coluna de Ticker ou Nome no cabeçalho. Colunas encontradas: ' + headerRow.filter(Boolean).join(', '));
        }

        const positions = [];
        let totalAum = null;

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.every(c => c == null || c === '')) continue;

          const ticker = colMap.ticker != null ? String(row[colMap.ticker] || '').trim().toUpperCase() : '';
          const name = colMap.name != null ? String(row[colMap.name] || '').trim() : ticker;
          if (!ticker && !name) continue;

          const weight = colMap.weight != null ? parseCarteiraNum(row[colMap.weight]) : 0;
          const notional = colMap.notional != null ? parseCarteiraNum(row[colMap.notional]) : null;
          const assetClass = colMap.class != null ? inferAssetClass(String(row[colMap.class] || '')) : inferAssetClassFromTicker(ticker);
          const subClass = colMap.subclass != null ? String(row[colMap.subclass] || '') : '';
          const indexador = colMap.indexador != null ? inferIndexador(String(row[colMap.indexador] || '')) : 'none';
          const duration = colMap.duration != null ? parseCarteiraNum(row[colMap.duration]) : null;
          const rating = colMap.rating != null ? String(row[colMap.rating] || '').trim() : null;
          const maturity = colMap.maturity != null ? String(row[colMap.maturity] || '').trim() : null;
          const sector = colMap.sector != null ? String(row[colMap.sector] || '').trim() : '';

          positions.push({
            ticker: ticker || name.substring(0, 20).toUpperCase(),
            name: name || ticker,
            asset_class: assetClass,
            sub_class: subClass || inferSubClassFromTicker(ticker, assetClass),
            weight_pct: weight,
            notional,
            indexador,
            duration,
            rating,
            maturity,
            sector,
          });

          if (notional) totalAum = (totalAum || 0) + notional;
        }

        if (positions.length === 0) throw new Error('Nenhuma posição identificada na planilha');

        const snapshot = emptySnapshot(fundId, refDate);
        snapshot.positions = positions;
        snapshot.aum = totalAum;
        resolve(snapshot);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

function detectCarteiraColumns(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if (h.includes('ticker') || h.includes('ativo') || h.includes('código') || h.includes('codigo') || h === 'cod') map.ticker = i;
    else if (h.includes('nome') || h.includes('name') || h.includes('emissor') || h.includes('descri')) map.name = i;
    else if (h.includes('peso') || h.includes('weight') || h.includes('%') || h.includes('participa') || h.includes('aloca')) map.weight = i;
    else if (h.includes('valor') || h.includes('notional') || h.includes('financeiro') || h.includes('montante') || h.includes('saldo')) map.notional = i;
    else if (h.includes('classe') || h.includes('class') || h.includes('tipo ativo')) map.class = i;
    else if (h.includes('subclasse') || h.includes('sub_class') || h.includes('segmento')) map.subclass = i;
    else if (h.includes('indexador') || h.includes('index') || h.includes('índice') || h.includes('taxa')) map.indexador = i;
    else if (h.includes('duration') || h.includes('prazo médio')) map.duration = i;
    else if (h.includes('rating') || h.includes('nota')) map.rating = i;
    else if (h.includes('vencimento') || h.includes('maturity') || h.includes('maturidade')) map.maturity = i;
    else if (h.includes('setor') || h.includes('sector') || h.includes('segmento econ')) map.sector = i;
  }
  return map;
}

function parseCarteiraNum(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return raw;
  const s = String(raw).replace(/%/g, '').replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function inferAssetClass(str) {
  const s = str.toLowerCase();
  if (s.includes('ação') || s.includes('acao') || s.includes('equity') || s.includes('rv')) return 'rv';
  if (s.includes('imob') || s.includes('fii') || s.includes('real estate') || s.includes('reit')) return 're';
  if (s.includes('caixa') || s.includes('cash') || s.includes('reserva')) return 'caixa';
  if (s.includes('altern') || s.includes('hedge') || s.includes('pe') || s.includes('commodity')) return 'alt';
  return 'rf';
}

function inferAssetClassFromTicker(ticker) {
  if (!ticker) return 'rf';
  if (/\d{2}$/.test(ticker) && ticker.length <= 6) return 're'; // FII pattern: XXXX11
  return 'rv';
}

function inferSubClassFromTicker(ticker, assetClass) {
  if (!ticker) return '';
  if (assetClass === 're') {
    if (ticker.endsWith('11') || ticker.endsWith('12')) return 'fii_tijolo';
    return 'fii_papel';
  }
  if (isBrazilianTicker(ticker)) return assetClass === 'rv' ? 'acao_br' : 'cdi';
  return assetClass === 'rv' ? 'acao_us' : 'govt_us';
}

function inferIndexador(str) {
  const s = str.toLowerCase();
  if (s.includes('ipca') || s.includes('inpc')) return 'ipca';
  if (s.includes('cdi+') || s.includes('cdi +')) return 'cdi_plus';
  if (s.includes('cdi') || s.includes('di')) return 'cdi';
  if (s.includes('pré') || s.includes('pre') || s.includes('prefixad')) return 'pre';
  if (s.includes('usd') || s.includes('dólar') || s.includes('dolar')) return 'usd';
  return 'none';
}

/* ---------- Render: Main Carteiras View ---------- */

function renderCarteiras() {
  const funds = getFunds();
  const activeFund = state._cart_fund;

  if (activeFund) {
    const fund = getFund(activeFund);
    if (fund) return renderCarteiraDetail(fund);
  }

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Carteiras Mensais', 'Carteiras <em>Mensais</em>',
      'Registro e análise das posições de cada fundo. Upload de Excel para carga mensal, edição manual para ajustes. Comparação mês a mês com detecção de entradas, saídas e mudanças de peso.'),

    funds.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum fundo cadastrado'),
          h('p', { class: 'empty-desc' }, 'Cadastre um fundo em Asset Management → + Novo Fundo para começar a registrar carteiras.'),
          h('button', { class: 'btn-primary', onClick: () => setView('am_new') }, '+ Novo Fundo'),
        ])
      : h('div', { class: 'grid-3' }, funds.map(fund => {
          const snapshots = getCarteiras(fund.id);
          const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
          const agg = latest ? aggregateCarteira(latest) : null;

          return h('div', {
            class: 'card card-hover',
            style: { cursor: 'pointer', textAlign: 'left', display: 'block', width: '100%' },
            onClick: () => { state._cart_fund = fund.id; render(); },
          }, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '4px' } }, fund.name),
            h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginBottom: '12px' } },
              `${fund.benchmark || '—'} · ${snapshots.length} snapshot${snapshots.length !== 1 ? 's' : ''}`),

            latest && agg ? h('div', {}, [
              h('div', { class: 'mono', style: { fontSize: '11px', marginBottom: '8px' } },
                `Última: ${latest.ref_date} · ${agg.posCount} posições · ${agg.totalWeight.toFixed(1)}%`),
              // Mini bar
              h('div', { style: { display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden' } },
                Object.entries(agg.byClass)
                  .filter(([_, v]) => v.weight > 0)
                  .sort((a, b) => b[1].weight - a[1].weight)
                  .map(([cls, v]) => h('div', {
                    style: { width: `${(v.weight / Math.max(1, agg.totalWeight)) * 100}%`, background: ASSET_CLASSES[cls]?.color || '#666' },
                  }))
              ),
            ]) : h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, 'Sem carteira registrada'),
          ]);
        })),
  ]);
}

/* ---------- Render: Fund Carteira Detail ---------- */

function renderCarteiraDetail(fund) {
  const snapshots = getCarteiras(fund.id);
  const activeSnap = state._cart_snap;
  const selected = activeSnap ? snapshots.find(s => s.id === activeSnap) : (snapshots.length > 0 ? snapshots[snapshots.length - 1] : null);
  const prevIdx = selected ? snapshots.findIndex(s => s.id === selected.id) - 1 : -1;
  const previous = prevIdx >= 0 ? snapshots[prevIdx] : null;
  const agg = selected ? aggregateCarteira(selected) : null;
  const mom = selected && previous ? compareMoM(selected, previous) : null;

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._cart_fund = null; state._cart_snap = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Todos os fundos'),
    ]),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' } }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, 'Carteiras Mensais'),
        h('h1', { class: 'page-title' }, fund.name),
        h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } },
          `${fund.benchmark || '—'} · ${snapshots.length} snapshots · ${fund.classification?.toUpperCase() || ''}`),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-primary', onClick: () => { state._cart_upload = fund.id; render(); } }, '↑ Upload Excel'),
        h('button', { class: 'btn-secondary', onClick: () => { state._cart_manual = fund.id; render(); } }, '+ Manual'),
      ]),
    ]),

    // Upload form
    state._cart_upload === fund.id && renderCarteiraUpload(fund.id),

    // Manual entry form
    state._cart_manual === fund.id && renderCarteiraManual(fund.id),

    // Snapshot selector
    snapshots.length > 0 && h('div', { class: 'sec-tab-row', style: { marginBottom: '20px' } },
      snapshots.slice().reverse().slice(0, 12).map(s =>
        h('button', {
          class: 'sec-tab' + ((selected && s.id === selected.id) ? ' active' : ''),
          onClick: () => { state._cart_snap = s.id; render(); },
        }, s.ref_date)
      )
    ),

    !selected
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhuma carteira registrada'),
          h('p', { class: 'empty-desc' }, 'Faça upload de um Excel com as posições do fundo ou adicione manualmente.'),
        ])
      : h('div', {}, [
          // KPIs
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' } }, [
            renderPortKPI('Posições', String(agg.posCount), ''),
            renderPortKPI('Peso Total', `${agg.totalWeight.toFixed(1)}%`, agg.totalWeight > 100.5 ? '⚠ over' : ''),
            renderPortKPI('AUM', selected.aum ? `R$ ${(selected.aum / 1e6).toFixed(1)}M` : '—', ''),
            renderPortKPI('Duration Média', agg.avgDuration != null ? `${agg.avgDuration.toFixed(2)} anos` : '—', 'ponderada por peso'),
            renderPortKPI('Ref.', selected.ref_date, new Date(selected.created_at).toLocaleDateString('pt-BR')),
          ]),

          // Allocation charts
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' } }, [
            renderAllocationChart('Por Classe', agg.byClass, ASSET_CLASSES),
            renderAllocationChart('Por Indexador', agg.byIndexador, INDEXADORES),
            renderAllocationChart('Por Setor', agg.bySector, {}),
          ]),

          // MoM changes
          mom && mom.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
            h('div', { class: 'macro-section-subhead' }, `Movimentações vs ${previous.ref_date}`),
            h('div', { class: 'card', style: { padding: 0, overflow: 'hidden' } },
              mom.slice(0, 20).map((ch, i) => {
                const color = ch.type === 'ENTRADA' ? 'var(--green)' : ch.type === 'SAÍDA' ? 'var(--red)' : ch.delta > 0 ? 'var(--green)' : 'var(--red)';
                return h('div', {
                  style: { display: 'grid', gridTemplateColumns: '90px 90px 1fr 80px 80px 80px', gap: '10px', padding: '8px 14px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: '12px', alignItems: 'center' },
                }, [
                  h('span', { class: 'mono', style: { fontWeight: '600' } }, ch.ticker),
                  h('span', { class: 'mono', style: { fontSize: '10px', color, textTransform: 'uppercase', fontWeight: '600' } }, ch.type),
                  h('span', { style: { fontFamily: 'Fraunces, serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, ch.name),
                  h('span', { class: 'mono', style: { textAlign: 'right', color: 'var(--text-faint)' } }, `${ch.prevWeight.toFixed(1)}%`),
                  h('span', { class: 'mono', style: { textAlign: 'right' } }, `${ch.currWeight.toFixed(1)}%`),
                  h('span', { class: 'mono', style: { textAlign: 'right', color } }, `${ch.delta >= 0 ? '+' : ''}${ch.delta.toFixed(1)}pp`),
                ]);
              })
            ),
          ]),

          // Positions table
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } }, [
            h('div', { class: 'macro-section-subhead', style: { margin: 0 } }, `Posições (${agg.posCount})`),
            h('button', { class: 'btn-secondary', style: { fontSize: '10px', color: 'var(--red)' }, onClick: () => deleteCarteira(fund.id, selected.id) }, 'Excluir snapshot'),
          ]),
          h('div', { class: 'card', style: { padding: 0, overflow: 'hidden', overflowX: 'auto' } }, [
            h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
              h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } }, [
                h('th', { style: { padding: '8px 12px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, 'Ticker'),
                h('th', { style: { padding: '8px 12px', textAlign: 'left' } }, 'Nome'),
                h('th', { style: { padding: '8px 12px', textAlign: 'left' } }, 'Classe'),
                h('th', { style: { padding: '8px 12px', textAlign: 'right' } }, 'Peso %'),
                h('th', { style: { padding: '8px 12px', textAlign: 'right' } }, 'Financeiro'),
                h('th', { style: { padding: '8px 12px', textAlign: 'center' } }, 'Indexador'),
                h('th', { style: { padding: '8px 12px', textAlign: 'right' } }, 'Duration'),
                h('th', { style: { padding: '8px 12px', textAlign: 'center' } }, 'Rating'),
                h('th', { style: { padding: '8px 12px', textAlign: 'center' } }, 'Vencimento'),
              ])),
              h('tbody', {},
                selected.positions
                  .sort((a, b) => (b.weight_pct || 0) - (a.weight_pct || 0))
                  .map(pos => {
                    const cls = ASSET_CLASSES[pos.asset_class] || { label: pos.asset_class, color: '#666' };
                    const idx = INDEXADORES[pos.indexador] || { label: pos.indexador || '' };
                    return h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                      h('td', { class: 'mono', style: { padding: '6px 12px', fontWeight: '500', cursor: 'pointer', color: 'var(--amber)' },
                        onClick: () => setDetail('security', pos.ticker) }, pos.ticker),
                      h('td', { style: { padding: '6px 12px', fontFamily: 'Fraunces, serif', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, pos.name),
                      h('td', { style: { padding: '6px 12px', color: cls.color, fontSize: '10px' } }, cls.label),
                      h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, (pos.weight_pct || 0).toFixed(2) + '%'),
                      h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } },
                        pos.notional ? `R$ ${(pos.notional / 1e3).toFixed(0)}k` : '—'),
                      h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'center', fontSize: '10px' } }, idx.label),
                      h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } },
                        pos.duration != null ? pos.duration.toFixed(2) : '—'),
                      h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'center', fontSize: '10px' } }, pos.rating || '—'),
                      h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'center', fontSize: '10px', color: 'var(--text-faint)' } }, pos.maturity || '—'),
                    ]);
                  })
              ),
            ]),
          ]),
        ]),
  ]);
}

/* ---------- Upload Form ---------- */

function renderCarteiraUpload(fundId) {
  const status = state._cart_upload_status;
  return h('div', { class: 'card', style: { padding: '20px', marginBottom: '20px', borderTop: '3px solid var(--amber)' } }, [
    h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, '↑ Upload de Carteira (Excel/CSV)'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '150px 1fr auto auto', gap: '12px', alignItems: 'end' } }, [
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Mês de referência'),
        h('input', { class: 'form-field-input', type: 'month', id: 'cart-ref-date', value: new Date().toISOString().substring(0, 7) }),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Arquivo Excel/CSV'),
        h('input', { class: 'form-field-input', type: 'file', id: 'cart-file', accept: '.xlsx,.xls,.csv' }),
      ]),
      h('button', { class: 'btn-primary', onClick: async () => {
        const file = document.getElementById('cart-file')?.files?.[0];
        const refDate = document.getElementById('cart-ref-date')?.value;
        if (!file) { showToast('Selecione um arquivo', true); return; }
        if (!refDate) { showToast('Selecione o mês de referência', true); return; }
        try {
          state._cart_upload_status = 'Processando…';
          render();
          const snapshot = await parseCarteiraExcel(file, fundId, refDate);
          addCarteira(fundId, snapshot);
          state._cart_upload = null;
          state._cart_upload_status = null;
          showToast(`Carteira ${refDate}: ${snapshot.positions.length} posições importadas`);
          render();
        } catch (err) {
          state._cart_upload_status = null;
          showToast('Erro: ' + err.message, true);
          render();
        }
      }}, 'Importar'),
      h('button', { class: 'btn-secondary', onClick: () => { state._cart_upload = null; render(); } }, 'Cancelar'),
    ]),
    status && h('div', { class: 'mono', style: { marginTop: '10px', fontSize: '11px', color: 'var(--amber)' } }, status),
    h('div', { style: { marginTop: '12px', fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic' } },
      'O parser detecta colunas automaticamente por nome no cabeçalho. Colunas reconhecidas: ticker/ativo/código, nome/emissor, peso/%/participação, valor/financeiro/saldo, classe, indexador, duration, rating, vencimento, setor.'),
  ]);
}

/* ---------- Manual Entry Form ---------- */

function renderCarteiraManual(fundId) {
  if (!state._cart_manual_data) {
    state._cart_manual_data = emptySnapshot(fundId, new Date().toISOString().substring(0, 7));
  }
  const snap = state._cart_manual_data;

  return h('div', { class: 'card', style: { padding: '20px', marginBottom: '20px', borderTop: '3px solid var(--amber)' } }, [
    h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, '+ Carteira Manual'),

    h('div', { style: { display: 'grid', gridTemplateColumns: '150px 200px auto', gap: '12px', alignItems: 'end', marginBottom: '16px' } }, [
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Mês de referência'),
        h('input', { class: 'form-field-input', type: 'month', value: snap.ref_date,
          onchange: e => { snap.ref_date = e.target.value; } }),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'AUM Total (R$)'),
        h('input', { class: 'form-field-input', type: 'number', placeholder: '50000000',
          value: snap.aum || '',
          onchange: e => { snap.aum = parseFloat(e.target.value) || null; } }),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-primary', onClick: () => {
          if (snap.positions.length === 0) { showToast('Adicione ao menos uma posição', true); return; }
          addCarteira(fundId, snap);
          state._cart_manual = null;
          state._cart_manual_data = null;
          showToast(`Carteira ${snap.ref_date}: ${snap.positions.length} posições salvas`);
          render();
        }}, 'Salvar Carteira'),
        h('button', { class: 'btn-secondary', onClick: () => { state._cart_manual = null; state._cart_manual_data = null; render(); } }, 'Cancelar'),
      ]),
    ]),

    // Add position row
    h('div', { style: { display: 'grid', gridTemplateColumns: '100px 1fr 100px 100px 80px 80px auto', gap: '6px', alignItems: 'end', marginBottom: '12px', padding: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)' } }, [
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Ticker'),
        h('input', { class: 'form-field-input', type: 'text', id: 'mp-ticker', placeholder: 'KNCR11' }),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Nome'),
        h('input', { class: 'form-field-input', type: 'text', id: 'mp-name', placeholder: 'Kinea Rendimentos' }),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Classe'),
        h('select', { class: 'form-field-select', id: 'mp-class' },
          Object.entries(ASSET_CLASSES).map(([k, v]) => h('option', { value: k }, v.label))),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Indexador'),
        h('select', { class: 'form-field-select', id: 'mp-idx' },
          Object.entries(INDEXADORES).map(([k, v]) => h('option', { value: k }, v.label))),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Peso %'),
        h('input', { class: 'form-field-input', type: 'number', id: 'mp-weight', step: '0.1', value: '5' }),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Duration'),
        h('input', { class: 'form-field-input', type: 'number', id: 'mp-dur', step: '0.1', placeholder: '—' }),
      ]),
      h('button', { class: 'btn-secondary', onClick: () => {
        const ticker = document.getElementById('mp-ticker')?.value?.trim()?.toUpperCase();
        if (!ticker) { showToast('Ticker obrigatório', true); return; }
        snap.positions.push({
          ticker,
          name: document.getElementById('mp-name')?.value?.trim() || ticker,
          asset_class: document.getElementById('mp-class')?.value || 'rf',
          sub_class: '',
          weight_pct: parseFloat(document.getElementById('mp-weight')?.value) || 0,
          notional: null,
          indexador: document.getElementById('mp-idx')?.value || 'none',
          duration: parseFloat(document.getElementById('mp-dur')?.value) || null,
          rating: null, maturity: null, sector: '',
        });
        document.getElementById('mp-ticker').value = '';
        document.getElementById('mp-name').value = '';
        document.getElementById('mp-weight').value = '5';
        document.getElementById('mp-dur').value = '';
        render();
      }}, '+ Add'),
    ]),

    // Current positions
    snap.positions.length > 0 && h('div', { style: { fontSize: '12px' } },
      snap.positions.map((p, i) => h('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' },
      }, [
        h('span', { class: 'mono', style: { width: '80px' } }, p.ticker),
        h('span', { style: { flex: 1, color: 'var(--text-muted)' } }, p.name),
        h('span', { class: 'mono', style: { width: '60px', textAlign: 'right' } }, p.weight_pct.toFixed(1) + '%'),
        h('span', { style: { width: '80px', textAlign: 'center', fontSize: '10px', color: ASSET_CLASSES[p.asset_class]?.color } }, ASSET_CLASSES[p.asset_class]?.label),
        h('button', { style: { color: 'var(--text-faint)', cursor: 'pointer', background: 'none', border: 'none' },
          onClick: () => { snap.positions.splice(i, 1); render(); } }, '×'),
      ]))
    ),

    snap.positions.length > 0 && h('div', { class: 'mono', style: { marginTop: '10px', fontSize: '10px', color: 'var(--text-faint)' } },
      `${snap.positions.length} posições · peso total: ${snap.positions.reduce((a, p) => a + (p.weight_pct || 0), 0).toFixed(1)}%`),
  ]);
}

/* ============================================================
   31. TESES DE INVESTIMENTO
   Tese estruturada com evidências macro, cenários, triggers
   ============================================================ */

const THESIS_STATUS = {
  active:       { label: 'Ativa',       color: 'var(--green)',      icon: '●' },
  monitoring:   { label: 'Monitorando', color: 'var(--amber)',      icon: '◆' },
  invalidated:  { label: 'Invalidada',  color: 'var(--red)',        icon: '✗' },
  realized:     { label: 'Realizada',   color: '#7a8aa5',          icon: '✓' },
};

const CONVICTION_LEVELS = {
  high:   { label: 'Alta',   color: 'var(--green)' },
  medium: { label: 'Média',  color: 'var(--amber)' },
  low:    { label: 'Baixa',  color: 'var(--text-faint)' },
};

function getTeses(fundId) {
  if (!DB.teses) DB.teses = {};
  if (fundId) {
    if (!Array.isArray(DB.teses[fundId])) DB.teses[fundId] = [];
    return DB.teses[fundId];
  }
  // All teses across funds
  const all = [];
  for (const fid of Object.keys(DB.teses)) {
    if (Array.isArray(DB.teses[fid])) {
      for (const t of DB.teses[fid]) all.push({ ...t, _fund_id: fid });
    }
  }
  return all.sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
}

function getTeseById(fundId, teseId) {
  return getTeses(fundId).find(t => t.id === teseId);
}

function saveTese(fundId, tese) {
  if (!DB.teses) DB.teses = {};
  if (!Array.isArray(DB.teses[fundId])) DB.teses[fundId] = [];
  tese.updated_at = new Date().toISOString();
  const idx = DB.teses[fundId].findIndex(t => t.id === tese.id);
  if (idx >= 0) DB.teses[fundId][idx] = tese;
  else DB.teses[fundId].push(tese);
  saveDB(DB);
}

function deleteTese(fundId, teseId) {
  if (!confirm('Excluir esta tese?')) return;
  DB.teses[fundId] = getTeses(fundId).filter(t => t.id !== teseId);
  saveDB(DB);
  state._active_tese = null;
  render();
}

function emptyTese() {
  return {
    id: 'thesis_' + Date.now(),
    title: '',
    status: 'active',
    conviction: 'medium',
    horizon: '6-12 meses',
    narrative: '',
    target_assets: [],
    macro_evidence: [],
    base_case: { description: '', probability: 60, expected_return: '' },
    bull_case: { description: '', probability: 25, expected_return: '' },
    bear_case: { description: '', probability: 15, expected_return: '' },
    revision_triggers: [],
    status_log: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/* ---------- Render: Teses List ---------- */

function renderTeses() {
  const funds = getFunds();
  const activeFund = state._tese_fund;
  const activeTese = state._active_tese;

  if (activeTese && activeFund) {
    const tese = getTeseById(activeFund, activeTese);
    if (tese) return renderTeseDetail(activeFund, tese);
  }

  if (state._tese_editing) return renderTeseForm(state._tese_editing_fund, state._tese_editing);

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Teses', 'Teses de <em>Investimento</em>',
      'Tese estruturada com narrativa, evidências macro, cenários e triggers de revisão. Vinculada a fundos e cruzada com indicadores BCB/FRED.'),

    // Fund filter
    h('div', { style: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' } }, [
      h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em' } }, 'Fundo:'),
      h('button', { class: 'sec-tab' + (!activeFund ? ' active' : ''), onClick: () => { state._tese_fund = null; render(); } }, 'Todos'),
      ...funds.map(f => h('button', {
        class: 'sec-tab' + (activeFund === f.id ? ' active' : ''),
        onClick: () => { state._tese_fund = f.id; render(); },
      }, f.name)),
    ]),

    // New thesis button
    funds.length > 0 && h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' } }, [
      h('button', { class: 'btn-primary', onClick: () => {
        const fundId = activeFund || funds[0].id;
        state._tese_editing = emptyTese();
        state._tese_editing_fund = fundId;
        render();
      }}, '+ Nova Tese'),
    ]),

    // List
    (() => {
      const teses = activeFund ? getTeses(activeFund).map(t => ({ ...t, _fund_id: activeFund })) : getTeses();
      if (teses.length === 0) return h('div', { class: 'empty' }, [
        h('div', { class: 'empty-title' }, 'Nenhuma tese cadastrada'),
        h('p', { class: 'empty-desc' }, 'Crie sua primeira tese de investimento para documentar e monitorar sua visão.'),
      ]);

      return h('div', {}, teses.map(tese => {
        const st = THESIS_STATUS[tese.status] || THESIS_STATUS.active;
        const conv = CONVICTION_LEVELS[tese.conviction] || CONVICTION_LEVELS.medium;
        const fund = getFund(tese._fund_id || tese.fund_id);
        return h('div', {
          class: 'card card-hover', style: { cursor: 'pointer', marginBottom: '10px', borderLeft: `3px solid ${st.color}` },
          onClick: () => { state._tese_fund = tese._fund_id; state._active_tese = tese.id; render(); },
        }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } }, [
            h('div', {}, [
              h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px' } }, tese.title || 'Sem título'),
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px' } },
                `${fund?.name || '?'} · ${tese.horizon || '—'} · ${tese.target_assets?.length || 0} ativos · ${tese.macro_evidence?.length || 0} evidências macro`),
            ]),
            h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
              h('span', { class: 'mono', style: { fontSize: '10px', color: conv.color } }, `Conv: ${conv.label}`),
              h('span', { class: 'mono', style: { fontSize: '10px', padding: '2px 6px', border: `1px solid ${st.color}`, color: st.color } }, `${st.icon} ${st.label}`),
            ]),
          ]),
          tese.narrative && h('div', { style: { marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', maxHeight: '48px', overflow: 'hidden', textOverflow: 'ellipsis' } }, tese.narrative),
        ]);
      }));
    })(),
  ]);
}

/* ---------- Render: Tese Detail ---------- */

function renderTeseDetail(fundId, tese) {
  const st = THESIS_STATUS[tese.status] || THESIS_STATUS.active;
  const conv = CONVICTION_LEVELS[tese.conviction] || CONVICTION_LEVELS.medium;
  const fund = getFund(fundId);

  // Check macro evidence against current data
  const macroChecks = checkMacroEvidence(tese.macro_evidence || []);

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._active_tese = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Todas as teses'),
    ]),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' } }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, `${fund?.name || '?'} · Tese de Investimento`),
        h('h1', { class: 'page-title' }, tese.title),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' } }, [
          h('span', { style: { padding: '3px 10px', border: `1px solid ${st.color}`, color: st.color, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' } }, `${st.icon} ${st.label}`),
          h('span', { class: 'mono', style: { fontSize: '11px', color: conv.color } }, `Convicção: ${conv.label}`),
          h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, `Horizonte: ${tese.horizon}`),
        ]),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-secondary', onClick: () => { state._tese_editing = JSON.parse(JSON.stringify(tese)); state._tese_editing_fund = fundId; state._active_tese = null; render(); } }, 'Editar'),
        h('button', { class: 'btn-secondary', onClick: () => exportTeseMarkdown(tese, fund) }, '↓ Exportar .md'),
        h('select', { class: 'form-field-select', style: { width: '140px', fontSize: '11px' },
          onchange: (e) => { tese.status = e.target.value; tese.status_log.push({ date: new Date().toISOString().split('T')[0], status: e.target.value, note: '' }); saveTese(fundId, tese); render(); },
        }, Object.entries(THESIS_STATUS).map(([k, v]) => h('option', { value: k, selected: tese.status === k ? 'selected' : null }, `${v.icon} ${v.label}`))),
      ]),
    ]),

    // Narrative
    tese.narrative && h('div', { style: { marginBottom: '28px' } }, [
      sectionHead('01', 'Narrativa', 'Tese central de investimento'),
      h('div', { class: 'card', style: { padding: '20px 24px', fontFamily: 'Fraunces, serif', fontSize: '14px', lineHeight: '1.75', color: 'var(--text-muted)' } }, tese.narrative),
    ]),

    // Target assets
    tese.target_assets?.length > 0 && h('div', { style: { marginBottom: '28px' } }, [
      sectionHead('02', 'Ativos-Alvo', `${tese.target_assets.length} ativo(s) vinculado(s)`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'hidden' } },
        tese.target_assets.map((a, i) => h('div', {
          style: { display: 'grid', gridTemplateColumns: '90px 1fr 100px 80px', gap: '12px', padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center', fontSize: '13px' },
        }, [
          h('span', { class: 'mono', style: { fontWeight: '600', color: 'var(--amber)', cursor: 'pointer' }, onClick: () => setDetail('security', a.ticker) }, a.ticker),
          h('span', { style: { fontFamily: 'Fraunces, serif' } }, a.name || a.ticker),
          h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, a.role || 'core'),
          h('span', { class: 'mono', style: { textAlign: 'right' } }, a.target_weight ? `${a.target_weight}%` : '—'),
        ]))
      ),
    ]),

    // Macro evidence with live check
    tese.macro_evidence?.length > 0 && h('div', { style: { marginBottom: '28px' } }, [
      sectionHead('03', 'Evidências Macro', 'Indicadores vinculados à tese — status verificado contra dados atuais'),
      h('div', { class: 'card', style: { padding: 0, overflow: 'hidden' } },
        tese.macro_evidence.map((ev, i) => {
          const check = macroChecks[i];
          const checkColor = check?.ok ? 'var(--green)' : check?.ok === false ? 'var(--red)' : 'var(--text-faint)';
          return h('div', {
            style: { display: 'grid', gridTemplateColumns: '80px 1fr 120px 120px', gap: '12px', padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center', fontSize: '12px' },
          }, [
            h('span', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-faint)' } }, ev.source?.toUpperCase() || '?'),
            h('span', { style: { fontFamily: 'Fraunces, serif' } }, ev.thesis || ''),
            h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, `Condição: ${ev.condition}`),
            h('span', { class: 'mono', style: { fontSize: '10px', color: checkColor, fontWeight: '600' } },
              check ? (check.ok ? `✓ ${check.detail}` : `✗ ${check.detail}`) : '? sem dados'),
          ]);
        })
      ),
    ]),

    // Scenarios
    (tese.base_case?.description || tese.bull_case?.description || tese.bear_case?.description) && h('div', { style: { marginBottom: '28px' } }, [
      sectionHead('04', 'Cenários', 'Base, otimista e pessimista'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } }, [
        renderScenarioCard('Cenário Base', tese.base_case, 'var(--text)'),
        renderScenarioCard('Cenário Bull', tese.bull_case, 'var(--green)'),
        renderScenarioCard('Cenário Bear', tese.bear_case, 'var(--red)'),
      ]),
    ]),

    // Revision triggers
    tese.revision_triggers?.length > 0 && h('div', { style: { marginBottom: '28px' } }, [
      sectionHead('05', 'Triggers de Revisão', 'Condições que devem disparar revisão ou invalidação da tese'),
      h('div', { class: 'card', style: { padding: '16px 20px' } },
        tese.revision_triggers.map(t => h('div', { style: { padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '13px', display: 'flex', gap: '8px' } }, [
          h('span', { style: { color: 'var(--red)' } }, '⚡'),
          h('span', { style: { color: 'var(--text-muted)' } }, t),
        ]))
      ),
    ]),

    // Status log
    tese.status_log?.length > 0 && h('div', { style: { marginBottom: '28px' } }, [
      sectionHead('06', 'Histórico de Status', 'Timeline de mudanças'),
      h('div', { class: 'card', style: { padding: '16px 20px' } },
        tese.status_log.slice().reverse().map(log => {
          const ls = THESIS_STATUS[log.status] || {};
          return h('div', { style: { display: 'flex', gap: '12px', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '12px', alignItems: 'center' } }, [
            h('span', { class: 'mono', style: { color: 'var(--text-faint)', width: '80px' } }, log.date),
            h('span', { style: { color: ls.color, width: '100px' } }, `${ls.icon || ''} ${ls.label || log.status}`),
            h('span', { style: { color: 'var(--text-muted)' } }, log.note || ''),
          ]);
        })
      ),
    ]),
  ]);
}

function renderScenarioCard(title, scenario, color) {
  if (!scenario?.description) return h('div', { class: 'card', style: { padding: '16px', opacity: '0.4' } }, [
    h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, title),
    h('div', { style: { fontSize: '12px', color: 'var(--text-faint)', marginTop: '8px' } }, 'Não definido'),
  ]);
  return h('div', { class: 'card', style: { padding: '16px', borderTop: `2px solid ${color}` } }, [
    h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color } }, title),
    h('div', { style: { display: 'flex', gap: '16px', marginTop: '8px', marginBottom: '8px' } }, [
      scenario.probability && h('span', { class: 'mono', style: { fontSize: '18px', fontWeight: '600' } }, `${scenario.probability}%`),
      scenario.expected_return && h('span', { class: 'mono', style: { fontSize: '14px', color: 'var(--text-muted)', alignSelf: 'center' } }, scenario.expected_return),
    ]),
    h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' } }, scenario.description),
  ]);
}

function checkMacroEvidence(evidence) {
  const ms = state._macro_series || {};
  const fs = state._fred_series || {};
  return evidence.map(ev => {
    const source = ev.source === 'bcb' ? ms : ev.source === 'fred' ? fs : null;
    if (!source || !source[ev.key]) return null;
    const series = source[ev.key];
    if (!series || series.length < 3) return null;
    const last = series[series.length - 1].value;
    const prev3 = series[Math.max(0, series.length - 4)].value;
    const trend = last - prev3;

    switch (ev.condition) {
      case 'falling': return { ok: trend < -0.1, detail: trend < 0 ? `Caindo (${trend.toFixed(2)})` : `Subindo (${trend.toFixed(2)})` };
      case 'rising':  return { ok: trend > 0.1, detail: trend > 0 ? `Subindo (+${trend.toFixed(2)})` : `Caindo (${trend.toFixed(2)})` };
      case 'stable':  return { ok: Math.abs(trend) < 0.3, detail: `Δ ${trend.toFixed(2)}` };
      case 'above':   return { ok: last > parseFloat(ev.threshold || 0), detail: `Atual: ${last.toFixed(2)}` };
      case 'below':   return { ok: last < parseFloat(ev.threshold || 0), detail: `Atual: ${last.toFixed(2)}` };
      default: return { ok: null, detail: `${last.toFixed(2)}` };
    }
  });
}

/* ---------- Tese Form ---------- */

function renderTeseForm(fundId, tese) {
  const funds = getFunds();
  const isNew = !getTeses(fundId).some(t => t.id === tese.id);

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._tese_editing = null; state._tese_editing_fund = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Cancelar'),
    ]),

    h('h1', { class: 'page-title' }, isNew ? 'Nova Tese de Investimento' : `Editar: ${tese.title}`),

    // Basic info
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '16px' } }, [
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px', gap: '12px', marginBottom: '16px' } }, [
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Título da tese'),
          h('input', { class: 'form-field-input', type: 'text', value: tese.title, placeholder: 'Ex: Compressão de spreads CRI logística',
            oninput: e => tese.title = e.target.value }),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Fundo'),
          h('select', { class: 'form-field-select', onchange: e => { state._tese_editing_fund = e.target.value; } },
            funds.map(f => h('option', { value: f.id, selected: fundId === f.id ? 'selected' : null }, f.name))),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Convicção'),
          h('select', { class: 'form-field-select', onchange: e => tese.conviction = e.target.value },
            Object.entries(CONVICTION_LEVELS).map(([k, v]) => h('option', { value: k, selected: tese.conviction === k ? 'selected' : null }, v.label))),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Horizonte'),
          h('select', { class: 'form-field-select', onchange: e => tese.horizon = e.target.value },
            ['1-3 meses', '3-6 meses', '6-12 meses', '12-24 meses', '24+ meses'].map(h2 =>
              h('option', { value: h2, selected: tese.horizon === h2 ? 'selected' : null }, h2))),
        ]),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Narrativa (tese central)'),
        h('textarea', { class: 'form-field-textarea', rows: '5', placeholder: 'Descreva a tese: por que investir, qual a visão central, quais as premissas-chave...',
          oninput: e => tese.narrative = e.target.value }, tese.narrative || ''),
      ]),
    ]),

    // Target assets
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber)', marginBottom: '12px' } }, 'Ativos-Alvo'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '100px 1fr 100px 80px auto', gap: '8px', alignItems: 'end', marginBottom: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Ticker'),
          h('input', { class: 'form-field-input', type: 'text', id: 'ta-ticker' }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Nome'),
          h('input', { class: 'form-field-input', type: 'text', id: 'ta-name' }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Papel'),
          h('select', { class: 'form-field-select', id: 'ta-role' },
            ['core', 'satellite', 'hedge', 'tactical'].map(r => h('option', { value: r }, r))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Peso %'),
          h('input', { class: 'form-field-input', type: 'number', id: 'ta-weight', step: '0.5', value: '5' }) ]),
        h('button', { class: 'btn-secondary', onClick: () => {
          const ticker = document.getElementById('ta-ticker')?.value?.trim()?.toUpperCase();
          if (!ticker) return;
          tese.target_assets.push({ ticker, name: document.getElementById('ta-name')?.value?.trim() || ticker, role: document.getElementById('ta-role')?.value || 'core', target_weight: parseFloat(document.getElementById('ta-weight')?.value) || 0 });
          render();
        }}, '+'),
      ]),
      ...tese.target_assets.map((a, i) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' } }, [
        h('span', { class: 'mono' }, a.ticker), h('span', {}, a.name), h('span', { class: 'mono', style: { color: 'var(--text-faint)' } }, a.role), h('span', { class: 'mono' }, a.target_weight ? a.target_weight + '%' : ''),
        h('button', { style: { color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }, onClick: () => { tese.target_assets.splice(i, 1); render(); } }, '×'),
      ])),
    ]),

    // Macro evidence
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber)', marginBottom: '12px' } }, 'Evidências Macro'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '80px 120px 100px 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Fonte'),
          h('select', { class: 'form-field-select', id: 'me-source' }, [
            h('option', { value: 'bcb' }, 'BCB'), h('option', { value: 'fred' }, 'FRED')]) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Série'),
          h('input', { class: 'form-field-input', type: 'text', id: 'me-key', placeholder: 'selic / fed_funds' }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Condição'),
          h('select', { class: 'form-field-select', id: 'me-cond' },
            ['falling', 'rising', 'stable', 'above', 'below'].map(c => h('option', { value: c }, c))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Premissa'),
          h('input', { class: 'form-field-input', type: 'text', id: 'me-thesis', placeholder: 'SELIC caindo favorece duration' }) ]),
        h('button', { class: 'btn-secondary', onClick: () => {
          tese.macro_evidence.push({ source: document.getElementById('me-source')?.value, key: document.getElementById('me-key')?.value?.trim(), condition: document.getElementById('me-cond')?.value, thesis: document.getElementById('me-thesis')?.value?.trim() });
          render();
        }}, '+'),
      ]),
      ...tese.macro_evidence.map((ev, i) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' } }, [
        h('span', { class: 'mono', style: { color: 'var(--text-faint)' } }, ev.source), h('span', { class: 'mono' }, ev.key), h('span', { class: 'mono', style: { color: 'var(--text-faint)' } }, ev.condition), h('span', {}, ev.thesis),
        h('button', { style: { color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }, onClick: () => { tese.macro_evidence.splice(i, 1); render(); } }, '×'),
      ])),
    ]),

    // Scenarios
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber)', marginBottom: '12px' } }, 'Cenários'),
      ...['base_case', 'bull_case', 'bear_case'].map(key => {
        const labels = { base_case: 'Cenário Base', bull_case: 'Cenário Bull (otimista)', bear_case: 'Cenário Bear (pessimista)' };
        if (!tese[key]) tese[key] = { description: '', probability: key === 'base_case' ? 60 : key === 'bull_case' ? 25 : 15, expected_return: '' };
        return h('div', { style: { marginBottom: '12px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)' } }, [
          h('div', { class: 'mono', style: { fontSize: '10px', marginBottom: '8px', color: key === 'bear_case' ? 'var(--red)' : key === 'bull_case' ? 'var(--green)' : 'var(--text)' } }, labels[key]),
          h('div', { style: { display: 'grid', gridTemplateColumns: '80px 120px 1fr', gap: '8px' } }, [
            h('input', { class: 'form-field-input', type: 'number', placeholder: '%', value: tese[key].probability || '', oninput: e => tese[key].probability = parseInt(e.target.value) || 0 }),
            h('input', { class: 'form-field-input', type: 'text', placeholder: 'Retorno esperado', value: tese[key].expected_return || '', oninput: e => tese[key].expected_return = e.target.value }),
            h('input', { class: 'form-field-input', type: 'text', placeholder: 'Descrição do cenário', value: tese[key].description || '', oninput: e => tese[key].description = e.target.value }),
          ]),
        ]);
      }),
    ]),

    // Triggers
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber)', marginBottom: '12px' } }, 'Triggers de Revisão'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '10px' } }, [
        h('input', { class: 'form-field-input', type: 'text', id: 'tr-text', placeholder: 'Ex: IPCA 12m > 6%, SELIC volta a subir, default de emissor' }),
        h('button', { class: 'btn-secondary', onClick: () => {
          const v = document.getElementById('tr-text')?.value?.trim();
          if (v) { tese.revision_triggers.push(v); document.getElementById('tr-text').value = ''; render(); }
        }}, '+'),
      ]),
      ...tese.revision_triggers.map((t, i) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' } }, [
        h('span', {}, `⚡ ${t}`),
        h('button', { style: { color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }, onClick: () => { tese.revision_triggers.splice(i, 1); render(); } }, '×'),
      ])),
    ]),

    // Save
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
      h('button', { class: 'btn-secondary', onClick: () => { state._tese_editing = null; state._tese_editing_fund = null; render(); } }, 'Cancelar'),
      h('button', { class: 'btn-secondary', style: { color: 'var(--red)' }, onClick: () => { deleteTese(fundId, tese.id); state._tese_editing = null; state._tese_editing_fund = null; } }, 'Excluir'),
      h('button', { class: 'btn-primary', onClick: () => {
        if (!tese.title?.trim()) { showToast('Título é obrigatório', true); return; }
        if (isNew) tese.status_log.push({ date: new Date().toISOString().split('T')[0], status: 'active', note: 'Tese criada' });
        saveTese(state._tese_editing_fund, tese);
        state._tese_editing = null; state._tese_editing_fund = null;
        showToast('Tese salva');
        render();
      }}, 'Salvar Tese'),
    ]),
  ]);
}

function exportTeseMarkdown(tese, fund) {
  const st = THESIS_STATUS[tese.status] || {};
  const conv = CONVICTION_LEVELS[tese.conviction] || {};
  let md = `# Tese: ${tese.title}\n`;
  md += `**Fundo:** ${fund?.name || '?'} · **Status:** ${st.label} · **Convicção:** ${conv.label} · **Horizonte:** ${tese.horizon}\n\n`;
  md += `## Narrativa\n${tese.narrative || '—'}\n\n`;
  if (tese.target_assets?.length > 0) {
    md += `## Ativos-Alvo\n| Ticker | Nome | Papel | Peso |\n|---|---|---|---|\n`;
    for (const a of tese.target_assets) md += `| ${a.ticker} | ${a.name} | ${a.role} | ${a.target_weight || '—'}% |\n`;
    md += '\n';
  }
  if (tese.macro_evidence?.length > 0) {
    md += `## Evidências Macro\n| Fonte | Série | Condição | Premissa |\n|---|---|---|---|\n`;
    for (const e of tese.macro_evidence) md += `| ${e.source} | ${e.key} | ${e.condition} | ${e.thesis} |\n`;
    md += '\n';
  }
  md += `## Cenários\n| Cenário | Prob. | Retorno | Descrição |\n|---|---|---|---|\n`;
  md += `| Base | ${tese.base_case?.probability || '—'}% | ${tese.base_case?.expected_return || '—'} | ${tese.base_case?.description || '—'} |\n`;
  md += `| Bull | ${tese.bull_case?.probability || '—'}% | ${tese.bull_case?.expected_return || '—'} | ${tese.bull_case?.description || '—'} |\n`;
  md += `| Bear | ${tese.bear_case?.probability || '—'}% | ${tese.bear_case?.expected_return || '—'} | ${tese.bear_case?.description || '—'} |\n\n`;
  if (tese.revision_triggers?.length > 0) {
    md += `## Triggers de Revisão\n`;
    for (const t of tese.revision_triggers) md += `- ⚡ ${t}\n`;
  }
  md += `\n---\n*Gerado pelo Aegir·Intel em ${new Date().toLocaleDateString('pt-BR')}*\n`;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `tese-${tese.title.replace(/\s+/g, '-').substring(0, 40)}.md`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Tese exportada');
}

/* ============================================================
   32. COMITÊ DE INVESTIMENTOS & PRÉ-TRADING
   Ata estruturada + parecer do gestor + tracking
   ============================================================ */

function getComites(fundId) {
  if (!DB.comites) DB.comites = {};
  if (fundId) {
    if (!Array.isArray(DB.comites[fundId])) DB.comites[fundId] = [];
    return DB.comites[fundId];
  }
  const all = [];
  for (const fid of Object.keys(DB.comites)) {
    if (Array.isArray(DB.comites[fid])) for (const c of DB.comites[fid]) all.push({ ...c, _fund_id: fid });
  }
  return all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function saveComite(fundId, comite) {
  if (!DB.comites) DB.comites = {};
  if (!Array.isArray(DB.comites[fundId])) DB.comites[fundId] = [];
  comite.updated_at = new Date().toISOString();
  const idx = DB.comites[fundId].findIndex(c => c.id === comite.id);
  if (idx >= 0) DB.comites[fundId][idx] = comite;
  else DB.comites[fundId].push(comite);
  saveDB(DB);
}

function deleteComite(fundId, comiteId) {
  if (!confirm('Excluir esta ata?')) return;
  DB.comites[fundId] = getComites(fundId).filter(c => c.id !== comiteId);
  saveDB(DB);
  state._active_comite = null;
  render();
}

const DECISION_TYPES = {
  approved:    { label: 'Aprovado',     color: 'var(--green)', icon: '✓' },
  conditional: { label: 'Condicional',  color: 'var(--amber)', icon: '◆' },
  tabled:      { label: 'Adiado',       color: 'var(--text-faint)', icon: '⏸' },
  rejected:    { label: 'Rejeitado',    color: 'var(--red)', icon: '✗' },
};

const IMPL_STATUS = {
  pending:   { label: 'Pendente',    color: 'var(--amber)' },
  executed:  { label: 'Executado',   color: 'var(--green)' },
  cancelled: { label: 'Cancelado',  color: 'var(--text-faint)' },
};

/* ---------- Render: Comitê List ---------- */

function renderComite() {
  const funds = getFunds();
  const activeFund = state._comite_fund;
  const activeComite = state._active_comite;
  const subTab = state._comite_tab || 'atas';

  if (activeComite && activeFund) {
    const comite = getComites(activeFund).find(c => c.id === activeComite);
    if (comite) return renderComiteDetail(activeFund, comite);
  }
  if (state._comite_editing) return renderComiteForm(state._comite_editing_fund, state._comite_editing);
  if (state._pretrading_editing) return renderPreTradingForm(state._pretrading_editing_fund, state._pretrading_editing);

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Comitê / Trading', 'Comitê & <em>Trading</em>',
      'Atas de comitê de investimentos e pré-trading. Registro estruturado de deliberações com acompanhamento de implementação.'),

    // Sub-tabs: Atas vs Pré-Trading
    h('div', { class: 'sec-tab-row', style: { marginBottom: '16px' } },
      [['atas', 'Atas de Comitê'], ['pretrading', 'Pré-Trading']].map(([k, l]) =>
        h('button', { class: 'sec-tab' + (subTab === k ? ' active' : ''), onClick: () => { state._comite_tab = k; render(); } }, l)
      )
    ),

    // Fund filter
    h('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' } }, [
      h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em' } }, 'Fundo:'),
      h('button', { class: 'sec-tab' + (!activeFund ? ' active' : ''), onClick: () => { state._comite_fund = null; render(); } }, 'Todos'),
      ...funds.map(f => h('button', {
        class: 'sec-tab' + (activeFund === f.id ? ' active' : ''),
        onClick: () => { state._comite_fund = f.id; render(); },
      }, f.name)),
    ]),

    subTab === 'atas' ? renderAtasList(funds, activeFund) : renderPreTradingList(funds, activeFund),
  ]);
}

/* ---------- Atas List ---------- */

function renderAtasList(funds, activeFund) {
  const comites = activeFund ? getComites(activeFund).map(c => ({ ...c, _fund_id: activeFund })) : getComites();

  return h('div', {}, [
    funds.length > 0 && h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' } }, [
      h('button', { class: 'btn-primary', onClick: () => {
        const fundId = activeFund || funds[0].id;
        state._comite_editing = {
          id: 'comite_' + Date.now(), fund_id: fundId, date: new Date().toISOString().split('T')[0],
          type: 'ordinario', attendees: [], quorum: '',
          // Structured sections
          macro_context: '', fund_status: '', agenda_items: [],
          risk_notes: '', compliance_notes: '', next_steps: '', notes: '',
          created_at: new Date().toISOString(),
        };
        state._comite_editing_fund = fundId;
        render();
      }}, '+ Nova Ata de Comitê'),
    ]),

    comites.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhuma ata registrada'),
          h('p', { class: 'empty-desc' }, 'Registre sua primeira ata de comitê de investimentos.'),
        ])
      : h('div', {}, comites.map(comite => {
          const fund = getFund(comite._fund_id);
          const approvedCount = (comite.agenda_items || []).filter(i => i.decision === 'approved').length;
          const pendingCount = (comite.agenda_items || []).filter(i => i.implementation_status === 'pending').length;
          const totalItems = (comite.agenda_items || []).length;
          return h('div', {
            class: 'card card-hover', style: { cursor: 'pointer', marginBottom: '10px' },
            onClick: () => { state._comite_fund = comite._fund_id; state._active_comite = comite.id; render(); },
          }, [
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px', gap: '12px', alignItems: 'center' } }, [
              h('div', {}, [
                h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px' } },
                  `Comitê ${comite.type === 'extraordinario' ? 'Extraordinário' : 'Ordinário'} — ${comite.date}`),
                h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '3px' } },
                  `${fund?.name || '?'} · ${(comite.attendees || []).length} participantes`),
              ]),
              h('div', { style: { textAlign: 'center' } }, [
                h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, 'Itens'),
                h('div', { class: 'mono', style: { fontSize: '14px' } }, String(totalItems)),
              ]),
              h('div', { style: { textAlign: 'center' } }, [
                h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--green)' } }, 'Aprovados'),
                h('div', { class: 'mono', style: { fontSize: '14px', color: 'var(--green)' } }, String(approvedCount)),
              ]),
              h('div', { style: { textAlign: 'center' } }, [
                h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--amber)' } }, 'Pendentes'),
                h('div', { class: 'mono', style: { fontSize: '14px', color: 'var(--amber)' } }, String(pendingCount)),
              ]),
            ]),
          ]);
        })),
  ]);
}

/* ---------- Ata Form (structured) ---------- */

function renderComiteForm(fundId, comite) {
  const funds = getFunds();
  const teses = getTeses(fundId);

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._comite_editing = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Cancelar'),
    ]),
    h('h1', { class: 'page-title' }, 'Registrar Ata de Comitê'),

    // §1 Identificação
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, '§01 Identificação'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '130px 130px 150px 1fr', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Data'), h('input', { class: 'form-field-input', type: 'date', value: comite.date, onchange: e => comite.date = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Tipo'), h('select', { class: 'form-field-select', onchange: e => comite.type = e.target.value },
          [['ordinario', 'Ordinário'], ['extraordinario', 'Extraordinário']].map(([v, l]) => h('option', { value: v, selected: comite.type === v ? 'selected' : null }, l))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Fundo'), h('select', { class: 'form-field-select', onchange: e => { state._comite_editing_fund = e.target.value; } },
          funds.map(f => h('option', { value: f.id, selected: fundId === f.id ? 'selected' : null }, f.name))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Participantes (vírgula)'), h('input', { class: 'form-field-input', type: 'text', value: (comite.attendees || []).join(', '), placeholder: 'Gestor, Analista, Risco, Compliance',
          oninput: e => comite.attendees = e.target.value.split(',').map(s => s.trim()).filter(Boolean) }) ]),
      ]),
    ]),

    // §2 Contexto Macro
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, '§02 Contexto Macroeconômico'),
      h('textarea', { class: 'form-field-textarea', rows: '3', placeholder: 'Resumo do cenário macro atual: SELIC, inflação, câmbio, cenário externo. Impacto esperado na carteira.',
        oninput: e => comite.macro_context = e.target.value }, comite.macro_context || ''),
    ]),

    // §3 Status do Fundo
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, '§03 Status do Fundo'),
      h('textarea', { class: 'form-field-textarea', rows: '3', placeholder: 'PL atual, performance recente, posição de caixa, movimentação de cotistas, aderência à política de investimento.',
        oninput: e => comite.fund_status = e.target.value }, comite.fund_status || ''),
    ]),

    // §4 Pauta — Deliberações
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, '§04 Pauta — Itens de Deliberação'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 130px 130px', gap: '8px', alignItems: 'end', marginBottom: '16px', padding: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '4px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Assunto'), h('input', { class: 'form-field-input', type: 'text', id: 'ai-title', placeholder: 'Ex: Alocação em CRI XYZ' }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Tese vinculada'), h('select', { class: 'form-field-select', id: 'ai-thesis' }, [
          h('option', { value: '' }, '— Nenhuma —'), ...teses.map(t => h('option', { value: t.id }, t.title))]) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Decisão'), h('select', { class: 'form-field-select', id: 'ai-decision' },
          Object.entries(DECISION_TYPES).map(([k, v]) => h('option', { value: k }, `${v.icon} ${v.label}`))) ]),
      ]),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '16px', padding: '0 12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Condições / Limites'), h('input', { class: 'form-field-input', type: 'text', id: 'ai-cond', placeholder: 'Ex: Limitar a 10% do PL, prazo mínimo 3 anos' }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Justificativa'), h('input', { class: 'form-field-input', type: 'text', id: 'ai-rationale', placeholder: 'Ex: Spread atrativo vs benchmark' }) ]),
        h('button', { class: 'btn-primary', onClick: () => {
          const title = document.getElementById('ai-title')?.value?.trim();
          if (!title) { showToast('Assunto obrigatório', true); return; }
          comite.agenda_items.push({
            id: 'item_' + Date.now(), title,
            thesis_id: document.getElementById('ai-thesis')?.value || null,
            decision: document.getElementById('ai-decision')?.value || 'approved',
            conditions: document.getElementById('ai-cond')?.value?.trim() || '',
            rationale: document.getElementById('ai-rationale')?.value?.trim() || '',
            implementation_status: 'pending',
            implementation_notes: '',
          });
          document.getElementById('ai-title').value = '';
          document.getElementById('ai-cond').value = '';
          document.getElementById('ai-rationale').value = '';
          render();
        }}, 'Adicionar Item'),
      ]),
      ...(comite.agenda_items || []).map((item, i) => {
        const dec = DECISION_TYPES[item.decision] || {};
        return h('div', { style: { display: 'grid', gridTemplateColumns: '30px 1fr 90px 1fr 30px', gap: '8px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: '12px' } }, [
          h('span', { class: 'mono', style: { color: 'var(--text-faint)' } }, `${i + 1}.`),
          h('span', { style: { fontFamily: 'Fraunces, serif' } }, item.title),
          h('span', { class: 'mono', style: { color: dec.color, fontSize: '10px' } }, `${dec.icon} ${dec.label}`),
          h('span', { style: { color: 'var(--text-faint)', fontSize: '11px' } }, item.conditions || item.rationale || '—'),
          h('button', { style: { color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }, onClick: () => { comite.agenda_items.splice(i, 1); render(); } }, '×'),
        ]);
      }),
    ]),

    // §5 Riscos & Compliance
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, '§05 Riscos & Compliance'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Notas de Risco'), h('textarea', { class: 'form-field-textarea', rows: '2', placeholder: 'Observações da área de risco: limites, enquadramento, alertas.',
          oninput: e => comite.risk_notes = e.target.value }, comite.risk_notes || '') ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Notas de Compliance'), h('textarea', { class: 'form-field-textarea', rows: '2', placeholder: 'Observações regulatórias: aderência à política, conflitos de interesse.',
          oninput: e => comite.compliance_notes = e.target.value }, comite.compliance_notes || '') ]),
      ]),
    ]),

    // §6 Próximos Passos & Notas
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, '§06 Próximos Passos'),
      h('textarea', { class: 'form-field-textarea', rows: '2', placeholder: 'Ações pendentes, prazos, responsáveis.',
        oninput: e => comite.next_steps = e.target.value }, comite.next_steps || ''),
      h('label', { class: 'form-field-label', style: { marginTop: '12px' } }, 'Notas gerais'),
      h('textarea', { class: 'form-field-textarea', rows: '2', placeholder: 'Outras observações relevantes.',
        oninput: e => comite.notes = e.target.value }, comite.notes || ''),
    ]),

    // Actions
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' } }, [
      h('button', { class: 'btn-secondary', onClick: () => { state._comite_editing = null; render(); } }, 'Cancelar'),
      h('button', { class: 'btn-primary', onClick: () => {
        saveComite(state._comite_editing_fund, comite);
        state._comite_editing = null; state._comite_editing_fund = null;
        showToast('Ata salva');
        render();
      }}, 'Salvar Ata'),
    ]),
  ]);
}

/* ---------- Ata Detail (structured view) ---------- */

function renderComiteDetail(fundId, comite) {
  const fund = getFund(fundId);

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._active_comite = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Todas as atas'),
    ]),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' } }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, `${fund?.name || '?'} · Ata de Comitê`),
        h('h1', { class: 'page-title' }, `Comitê ${comite.type === 'extraordinario' ? 'Extraordinário' : 'Ordinário'} — ${comite.date}`),
        h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)', marginTop: '6px' } },
          `Participantes: ${(comite.attendees || []).join(', ') || 'Não informado'}`),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-secondary', onClick: () => { state._comite_editing = JSON.parse(JSON.stringify(comite)); state._comite_editing_fund = fundId; state._active_comite = null; render(); } }, 'Editar'),
        h('button', { class: 'btn-secondary', onClick: () => exportAtaMarkdown(comite, fund) }, '↓ Exportar Ata'),
        h('button', { class: 'btn-secondary', style: { color: 'var(--red)', fontSize: '11px' }, onClick: () => deleteComite(fundId, comite.id) }, 'Excluir'),
      ]),
    ]),

    // §1 Contexto Macro
    comite.macro_context && h('div', { style: { marginBottom: '20px' } }, [
      sectionHead('01', 'Contexto Macroeconômico', ''),
      h('div', { class: 'card', style: { padding: '16px 20px', fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.7', color: 'var(--text-muted)' } }, comite.macro_context),
    ]),

    // §2 Status do Fundo
    comite.fund_status && h('div', { style: { marginBottom: '20px' } }, [
      sectionHead('02', 'Status do Fundo', ''),
      h('div', { class: 'card', style: { padding: '16px 20px', fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.7', color: 'var(--text-muted)' } }, comite.fund_status),
    ]),

    // §3 Deliberações
    h('div', { style: { marginBottom: '20px' } }, [
      sectionHead('03', 'Deliberações', `${(comite.agenda_items || []).length} item(s)`),
      ...(comite.agenda_items || []).map((item, i) => {
        const dec = DECISION_TYPES[item.decision] || {};
        const impl = IMPL_STATUS[item.implementation_status] || {};
        const linkedTese = item.thesis_id ? getTeseById(fundId, item.thesis_id) : null;
        return h('div', { class: 'card', style: { marginBottom: '10px', borderLeft: `3px solid ${dec.color}`, padding: '16px 20px' } }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } }, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px' } }, `${i + 1}. ${item.title}`),
            h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
              h('span', { class: 'mono', style: { fontSize: '10px', padding: '2px 8px', border: `1px solid ${dec.color}`, color: dec.color } }, `${dec.icon} ${dec.label}`),
              h('select', {
                class: 'form-field-select', style: { width: '110px', fontSize: '10px', padding: '4px' },
                onchange: e => { item.implementation_status = e.target.value; saveComite(fundId, comite); render(); },
              }, Object.entries(IMPL_STATUS).map(([k, v]) => h('option', { value: k, selected: item.implementation_status === k ? 'selected' : null }, v.label))),
            ]),
          ]),
          item.rationale && h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' } }, `Justificativa: ${item.rationale}`),
          item.conditions && h('div', { style: { fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' } }, `Condições: ${item.conditions}`),
          linkedTese && h('div', { style: { fontSize: '11px', color: 'var(--amber)', cursor: 'pointer', marginTop: '4px' },
            onClick: () => { state._tese_fund = fundId; state._active_tese = linkedTese.id; setView('am_teses'); } },
            `↗ Tese: ${linkedTese.title}`),
        ]);
      }),
    ]),

    // §4 Riscos & Compliance
    (comite.risk_notes || comite.compliance_notes) && h('div', { style: { marginBottom: '20px' } }, [
      sectionHead('04', 'Riscos & Compliance', ''),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } }, [
        comite.risk_notes && h('div', { class: 'card', style: { padding: '14px 18px' } }, [
          h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' } }, 'Riscos'),
          h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' } }, comite.risk_notes),
        ]),
        comite.compliance_notes && h('div', { class: 'card', style: { padding: '14px 18px' } }, [
          h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' } }, 'Compliance'),
          h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' } }, comite.compliance_notes),
        ]),
      ].filter(Boolean)),
    ]),

    // §5 Próximos passos
    comite.next_steps && h('div', { style: { marginBottom: '20px' } }, [
      sectionHead('05', 'Próximos Passos', ''),
      h('div', { class: 'card', style: { padding: '16px 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' } }, comite.next_steps),
    ]),

    // §6 Notas
    comite.notes && h('div', { style: { marginBottom: '20px' } }, [
      sectionHead('06', 'Notas', ''),
      h('div', { class: 'card', style: { padding: '16px 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' } }, comite.notes),
    ]),
  ]);
}

/* ---------- Export Ata Markdown ---------- */

function exportAtaMarkdown(comite, fund) {
  let md = `# Ata de Comitê de Investimentos\n\n`;
  md += `**Fundo:** ${fund?.name || '?'} · **Data:** ${comite.date} · **Tipo:** ${comite.type === 'extraordinario' ? 'Extraordinário' : 'Ordinário'}\n`;
  md += `**Participantes:** ${(comite.attendees || []).join(', ')}\n\n---\n\n`;
  if (comite.macro_context) md += `## §01 Contexto Macroeconômico\n\n${comite.macro_context}\n\n`;
  if (comite.fund_status) md += `## §02 Status do Fundo\n\n${comite.fund_status}\n\n`;
  md += `## §03 Deliberações\n\n`;
  for (let i = 0; i < (comite.agenda_items || []).length; i++) {
    const item = comite.agenda_items[i];
    const dec = DECISION_TYPES[item.decision] || {};
    const impl = IMPL_STATUS[item.implementation_status] || {};
    md += `### ${i + 1}. ${item.title}\n\n`;
    md += `- **Decisão:** ${dec.icon} ${dec.label}\n`;
    if (item.rationale) md += `- **Justificativa:** ${item.rationale}\n`;
    if (item.conditions) md += `- **Condições:** ${item.conditions}\n`;
    md += `- **Implementação:** ${impl.label}\n\n`;
  }
  if (comite.risk_notes) md += `## §04 Riscos\n\n${comite.risk_notes}\n\n`;
  if (comite.compliance_notes) md += `## §04b Compliance\n\n${comite.compliance_notes}\n\n`;
  if (comite.next_steps) md += `## §05 Próximos Passos\n\n${comite.next_steps}\n\n`;
  if (comite.notes) md += `## §06 Notas\n\n${comite.notes}\n\n`;
  md += `---\n*Gerado pelo Aegir·Intel em ${new Date().toLocaleDateString('pt-BR')}*\n`;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `ata-comite-${fund?.name?.replace(/\s+/g, '-') || 'fund'}-${comite.date}.md`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Ata exportada');
}

/* ============================================================
   32b. PRÉ-TRADING / PARECER DO GESTOR
   Registro de intenção de trade antes da execução
   ============================================================ */

function getPreTradings(fundId) {
  if (!DB.pretradings) DB.pretradings = {};
  if (fundId) {
    if (!Array.isArray(DB.pretradings[fundId])) DB.pretradings[fundId] = [];
    return DB.pretradings[fundId];
  }
  const all = [];
  for (const fid of Object.keys(DB.pretradings)) {
    if (Array.isArray(DB.pretradings[fid])) for (const p of DB.pretradings[fid]) all.push({ ...p, _fund_id: fid });
  }
  return all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function savePreTrading(fundId, pt) {
  if (!DB.pretradings) DB.pretradings = {};
  if (!Array.isArray(DB.pretradings[fundId])) DB.pretradings[fundId] = [];
  pt.updated_at = new Date().toISOString();
  const idx = DB.pretradings[fundId].findIndex(p => p.id === pt.id);
  if (idx >= 0) DB.pretradings[fundId][idx] = pt;
  else DB.pretradings[fundId].push(pt);
  saveDB(DB);
}

function renderPreTradingList(funds, activeFund) {
  const pts = activeFund ? getPreTradings(activeFund).map(p => ({ ...p, _fund_id: activeFund })) : getPreTradings();

  return h('div', {}, [
    funds.length > 0 && h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' } }, [
      h('button', { class: 'btn-primary', onClick: () => {
        const fundId = activeFund || funds[0].id;
        state._pretrading_editing = {
          id: 'pt_' + Date.now(), fund_id: fundId, date: new Date().toISOString().split('T')[0],
          asset_ticker: '', asset_name: '', asset_type: 'cri',
          direction: 'buy', target_weight: '', current_weight: '',
          rationale: '', macro_alignment: '', risk_assessment: '',
          target_price: '', stop_loss: '', sizing_notes: '',
          comite_ref: '', status: 'pending',
          created_at: new Date().toISOString(),
        };
        state._pretrading_editing_fund = fundId;
        render();
      }}, '+ Novo Pré-Trading'),
    ]),

    pts.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum pré-trading registrado'),
          h('p', { class: 'empty-desc' }, 'Registre a intenção de trade com justificativa e parecer antes de executar.'),
        ])
      : h('div', {}, pts.map(pt => {
          const fund = getFund(pt._fund_id);
          const dirColor = pt.direction === 'buy' ? 'var(--green)' : pt.direction === 'sell' ? 'var(--red)' : 'var(--text-faint)';
          const statusColor = pt.status === 'executed' ? 'var(--green)' : pt.status === 'cancelled' ? 'var(--text-faint)' : 'var(--amber)';
          return h('div', { class: 'card', style: { marginBottom: '10px', borderLeft: `3px solid ${dirColor}` } }, [
            h('div', { style: { display: 'grid', gridTemplateColumns: '60px 1fr 100px 80px 90px', gap: '12px', alignItems: 'center' } }, [
              h('div', { class: 'mono', style: { fontSize: '12px', fontWeight: '600', color: dirColor, textTransform: 'uppercase' } }, pt.direction === 'buy' ? 'COMPRA' : pt.direction === 'sell' ? 'VENDA' : 'HOLD'),
              h('div', {}, [
                h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, `${pt.asset_ticker || '—'} · ${pt.asset_name || ''}`),
                h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, `${fund?.name || '?'} · ${pt.date} · ${pt.asset_type?.toUpperCase() || ''}`),
              ]),
              h('div', { style: { textAlign: 'right' } }, [
                h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, 'Peso alvo'),
                h('div', { class: 'mono', style: { fontSize: '13px' } }, pt.target_weight ? `${pt.target_weight}%` : '—'),
              ]),
              h('span', { class: 'mono', style: { fontSize: '10px', padding: '2px 8px', border: `1px solid ${statusColor}`, color: statusColor, textAlign: 'center' } },
                pt.status === 'executed' ? 'Executado' : pt.status === 'cancelled' ? 'Cancelado' : 'Pendente'),
              h('select', { class: 'form-field-select', style: { fontSize: '10px', padding: '4px' },
                onchange: e => { pt.status = e.target.value; savePreTrading(pt._fund_id, pt); render(); } },
                [['pending', 'Pendente'], ['executed', 'Executado'], ['cancelled', 'Cancelado']].map(([v, l]) =>
                  h('option', { value: v, selected: pt.status === v ? 'selected' : null }, l))
              ),
            ]),
            pt.rationale && h('div', { style: { marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', maxHeight: '40px', overflow: 'hidden' } }, pt.rationale),
          ]);
        })),
  ]);
}

function renderPreTradingForm(fundId, pt) {
  const funds = getFunds();

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._pretrading_editing = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Cancelar'),
    ]),
    h('h1', { class: 'page-title' }, 'Pré-Trading / Parecer do Gestor'),

    // Identificação do trade
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, 'Identificação'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '130px 130px 100px 1fr 1fr', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Data'), h('input', { class: 'form-field-input', type: 'date', value: pt.date, onchange: e => pt.date = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Fundo'), h('select', { class: 'form-field-select', onchange: e => { state._pretrading_editing_fund = e.target.value; } },
          funds.map(f => h('option', { value: f.id, selected: fundId === f.id ? 'selected' : null }, f.name))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Direção'), h('select', { class: 'form-field-select', onchange: e => pt.direction = e.target.value },
          [['buy', 'Compra'], ['sell', 'Venda'], ['hold', 'Hold']].map(([v, l]) => h('option', { value: v, selected: pt.direction === v ? 'selected' : null }, l))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Ticker / Código'), h('input', { class: 'form-field-input', type: 'text', value: pt.asset_ticker, placeholder: 'KNCR11', oninput: e => pt.asset_ticker = e.target.value.toUpperCase() }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Nome do Ativo'), h('input', { class: 'form-field-input', type: 'text', value: pt.asset_name, placeholder: 'CRI Logística ABC', oninput: e => pt.asset_name = e.target.value }) ]),
      ]),
      h('div', { style: { display: 'grid', gridTemplateColumns: '120px 100px 100px 100px 1fr', gap: '12px', marginTop: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Tipo'), h('select', { class: 'form-field-select', onchange: e => pt.asset_type = e.target.value },
          [['cri', 'CRI'], ['cci', 'CCI'], ['debenture', 'Debênture'], ['fii', 'FII'], ['acao', 'Ação'], ['cota', 'Cota Fundo'], ['outro', 'Outro']].map(([v, l]) => h('option', { value: v, selected: pt.asset_type === v ? 'selected' : null }, l))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Peso Atual %'), h('input', { class: 'form-field-input', type: 'number', step: '0.1', value: pt.current_weight, oninput: e => pt.current_weight = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Peso Alvo %'), h('input', { class: 'form-field-input', type: 'number', step: '0.1', value: pt.target_weight, oninput: e => pt.target_weight = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Preço Alvo'), h('input', { class: 'form-field-input', type: 'text', value: pt.target_price, placeholder: 'R$ 100,00', oninput: e => pt.target_price = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Ref. Comitê'), h('input', { class: 'form-field-input', type: 'text', value: pt.comite_ref, placeholder: 'Comitê 15/03/2026, item 2', oninput: e => pt.comite_ref = e.target.value }) ]),
      ]),
    ]),

    // Parecer
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, 'Parecer do Gestor'),
      h('label', { class: 'form-field-label' }, 'Racional do Trade'),
      h('textarea', { class: 'form-field-textarea', rows: '4', placeholder: 'Por que este trade? Qual a tese? Qual o upside/spread esperado? Fundamentos do ativo.',
        oninput: e => pt.rationale = e.target.value }, pt.rationale || ''),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Alinhamento Macro'), h('textarea', { class: 'form-field-textarea', rows: '2', placeholder: 'Como o cenário macro suporta este trade? SELIC, inflação, ciclo de crédito.',
          oninput: e => pt.macro_alignment = e.target.value }, pt.macro_alignment || '') ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Avaliação de Risco'), h('textarea', { class: 'form-field-textarea', rows: '2', placeholder: 'Principais riscos: crédito do emissor, liquidez, duration, concentração.',
          oninput: e => pt.risk_assessment = e.target.value }, pt.risk_assessment || '') ]),
      ]),
      h('div', { style: { marginTop: '12px' } }, [
        h('label', { class: 'form-field-label' }, 'Notas de Sizing / Limites'),
        h('textarea', { class: 'form-field-textarea', rows: '2', placeholder: 'Tamanho da posição, limites de concentração, stop loss, prazo de execução.',
          oninput: e => pt.sizing_notes = e.target.value }, pt.sizing_notes || ''),
      ]),
    ]),

    // Actions
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
      h('button', { class: 'btn-secondary', onClick: () => { state._pretrading_editing = null; render(); } }, 'Cancelar'),
      h('button', { class: 'btn-primary', onClick: () => {
        if (!pt.asset_ticker?.trim()) { showToast('Ticker/Código é obrigatório', true); return; }
        savePreTrading(state._pretrading_editing_fund, pt);
        state._pretrading_editing = null; state._pretrading_editing_fund = null;
        showToast('Pré-Trading salvo');
        render();
      }}, 'Salvar Pré-Trading'),
    ]),
  ]);
}

/* ============================================================
   33. RESEARCH PROPRIETÁRIO
   Autoria de research com data blocks do sistema
   ============================================================ */

const RESEARCH_TEMPLATES = {
  credit:    { label: 'Credit Research',     desc: 'Análise de emissor/emissão de renda fixa', icon: '📄', sections: ['overview', 'issuer', 'structure', 'fundamentals', 'macro_context', 'risks', 'recommendation'] },
  fund_review: { label: 'Fund Review',       desc: 'Revisão periódica de fundo', icon: '📊', sections: ['summary', 'performance', 'portfolio', 'thesis_check', 'macro_context', 'outlook'] },
  market:    { label: 'Market Commentary',    desc: 'Comentário de mercado periódico', icon: '📰', sections: ['summary', 'macro_context', 'markets', 'positioning', 'outlook'] },
  sector:    { label: 'Sector Deep Dive',     desc: 'Análise setorial aprofundada', icon: '🔍', sections: ['overview', 'macro_context', 'fundamentals', 'players', 'risks', 'recommendation'] },
  custom:    { label: 'Custom',              desc: 'Template livre', icon: '✏️', sections: ['content'] },
};

const SECTION_LABELS = {
  overview: 'Visão Geral',
  summary: 'Sumário Executivo',
  issuer: 'Análise do Emissor',
  structure: 'Estrutura da Emissão',
  fundamentals: 'Fundamentos',
  macro_context: 'Contexto Macro',
  markets: 'Mercados',
  risks: 'Riscos',
  recommendation: 'Recomendação',
  performance: 'Performance',
  portfolio: 'Carteira',
  thesis_check: 'Check de Teses',
  positioning: 'Posicionamento',
  outlook: 'Perspectivas',
  players: 'Players & Competição',
  content: 'Conteúdo',
};

const DATA_BLOCK_TYPES = {
  macro_bcb:     { label: 'Indicadores BCB',        icon: '🇧🇷', desc: 'Snapshot de séries BCB carregadas' },
  macro_fred:    { label: 'Indicadores FRED',        icon: '🇺🇸', desc: 'Snapshot de séries FRED carregadas' },
  asset:         { label: 'Snapshot de Ativo',       icon: '📈', desc: 'Dados de um ativo (ticker)' },
  consensus:     { label: 'Consenso Gestoras',       icon: '🏛️', desc: 'Consenso sobre um slug da taxonomia' },
  carteira:      { label: 'Carteira do Fundo',       icon: '💼', desc: 'Alocação do último snapshot' },
  tese:          { label: 'Tese de Investimento',    icon: '🎯', desc: 'Resumo de uma tese vinculada' },
  regime:        { label: 'Regime Econômico',        icon: '⚡', desc: 'Detecção de regime US/BR' },
  fipezap:       { label: 'FipeZap',                icon: '🏠', desc: 'Indicadores imobiliários FipeZap' },
};

function getResearchDocs() {
  if (!Array.isArray(DB.research)) DB.research = [];
  return DB.research;
}

function getResearchById(id) {
  return getResearchDocs().find(r => r.id === id);
}

function saveResearchDoc(doc) {
  if (!Array.isArray(DB.research)) DB.research = [];
  doc.updated_at = new Date().toISOString();
  const idx = DB.research.findIndex(r => r.id === doc.id);
  if (idx >= 0) DB.research[idx] = doc;
  else DB.research.push(doc);
  saveDB(DB);
}

function deleteResearchDoc(id) {
  if (!confirm('Excluir este research?')) return;
  DB.research = getResearchDocs().filter(r => r.id !== id);
  saveDB(DB);
  state._active_research = null;
  render();
}

function newResearchDoc(template) {
  const tmpl = RESEARCH_TEMPLATES[template] || RESEARCH_TEMPLATES.custom;
  const sections = tmpl.sections.map(key => ({
    key,
    label: SECTION_LABELS[key] || key,
    content: '',
    data_blocks: [],
  }));
  return {
    id: 'res_' + Date.now(),
    title: '',
    template,
    status: 'draft',
    author: '',
    fund_id: null,
    tags: [],
    sections,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/* ---------- Data Block Generators ---------- */

function generateDataBlock(type, params) {
  switch (type) {
    case 'macro_bcb': return generateBCBBlock();
    case 'macro_fred': return generateFREDBlock();
    case 'asset': return generateAssetBlock(params?.ticker);
    case 'consensus': return generateConsensusBlock(params?.slug);
    case 'carteira': return generateCarteiraBlock(params?.fund_id);
    case 'tese': return generateTeseBlock(params?.fund_id, params?.tese_id);
    case 'regime': return generateRegimeBlock();
    case 'fipezap': return generateFipeZapBlock();
    default: return '*(bloco não reconhecido)*';
  }
}

function generateBCBBlock() {
  const ms = state._macro_series;
  if (!ms || Object.keys(ms).length === 0) return '*Dados BCB não carregados. Abra Dashboard BCB primeiro.*';
  const lines = ['| Indicador | Último | Data |', '|---|---|---|'];
  const labels = { selic: 'SELIC Meta (%)', ipca12m: 'IPCA 12m (%)', cdi: 'CDI (%)', cambio: 'USD/BRL', incc: 'INCC (%)', cred_imob: 'Crédito Imob. (R$ mi)', inadimplencia: 'Inadimplência (%)', ibc_br: 'IBC-Br' };
  for (const [key, label] of Object.entries(labels)) {
    const s = ms[key];
    if (s && s.length > 0) {
      const last = s[s.length - 1];
      lines.push(`| ${label} | ${last.value.toFixed(2)} | ${last.date} |`);
    }
  }
  return lines.join('\n');
}

function generateFREDBlock() {
  const fs = state._fred_series;
  if (!fs) return '*Dados FRED não carregados. Abra Fed/FRED primeiro.*';
  const lines = ['| Indicador | Último | Data |', '|---|---|---|'];
  const picks = { fed_funds: 'Fed Funds (%)', dgs10: 'Treasury 10Y (%)', t10y2y: '10Y-2Y Spread', unrate: 'Desemprego (%)', hy_spread: 'HY Spread (bps)', nfci: 'NFCI', mortgage30: 'Mortgage 30Y (%)' };
  for (const [key, label] of Object.entries(picks)) {
    const s = fs[key];
    if (s && s.length > 0) {
      const last = s[s.length - 1];
      lines.push(`| ${label} | ${last.value.toFixed(2)} | ${last.date} |`);
    }
  }
  // Computed YoYs
  const computeYoY = (s) => s && s.length >= 13 ? ((s[s.length-1].value / s[s.length-13].value) - 1) * 100 : null;
  const cpiYoY = computeYoY(fs.cpi);
  const corePceYoY = computeYoY(fs.core_pce);
  const m2YoY = computeYoY(fs.m2);
  if (cpiYoY != null) lines.push(`| CPI YoY | ${cpiYoY.toFixed(2)}% | calculado |`);
  if (corePceYoY != null) lines.push(`| Core PCE YoY | ${corePceYoY.toFixed(2)}% | calculado |`);
  if (m2YoY != null) lines.push(`| M2 YoY | ${m2YoY.toFixed(2)}% | calculado |`);
  return lines.join('\n');
}

function generateAssetBlock(ticker) {
  if (!ticker) return '*Ticker não especificado.*';
  const cached = SEC_CACHE[ticker.toUpperCase()];
  if (!cached) return `*Dados de ${ticker} não carregados. Busque o ativo em Securities primeiro.*`;
  const d = cached;
  const q = d.quote || {};
  const p = d.profile || {};
  const m = d.metrics?.metric || {};
  const fund = getFundamentalMetrics(m);
  const lines = [`### ${ticker} — ${p.name || ''}`, ''];
  lines.push(`| Métrica | Valor |`, `|---|---|`);
  lines.push(`| Preço | ${formatCurrency(q.c, p.currency)} |`);
  lines.push(`| Var. Dia | ${q.dp != null ? q.dp.toFixed(2) + '%' : '—'} |`);
  if (fund.pe != null) lines.push(`| P/E | ${fund.pe.toFixed(2)} |`);
  if (fund.pb != null) lines.push(`| P/B | ${fund.pb.toFixed(2)} |`);
  if (fund.dividendYield != null) lines.push(`| DY | ${(fund.dividendYield * 100).toFixed(2)}% |`);
  if (fund.roe != null) lines.push(`| ROE | ${(fund.roe * 100).toFixed(1)}% |`);
  if (fund.netMargin != null) lines.push(`| Margem Líq. | ${(fund.netMargin * 100).toFixed(1)}% |`);
  return lines.join('\n');
}

function generateConsensusBlock(slug) {
  if (!slug) return '*Slug não especificado.*';
  const meta = SLUG_META[slug];
  if (!meta) return `*Slug "${slug}" não encontrado na taxonomia.*`;
  const c = computeConsensus(slug);
  if (!c) return `*Sem visões para ${meta.name}.*`;
  const views = Object.values(getLatestViews(slug));
  let md = `### Consenso: ${meta.name}\n\n`;
  md += `**Stance: ${c.stance}** · Weighted: ${c.weighted} · Convicção: ${Math.round(c.conviction * 100)}% · ${c.count} gestoras\n\n`;
  if (views.length > 0) {
    md += `| Gestora | Stance | Tese |\n|---|---|---|\n`;
    for (const v of views.slice(0, 8)) {
      const mgr = getManagerBySlug(v.manager_slug);
      md += `| ${mgr?.name || v.manager_slug} | ${v.stance} | ${(v.thesis_summary || '').substring(0, 80)} |\n`;
    }
  }
  return md;
}

function generateCarteiraBlock(fundId) {
  if (!fundId) return '*Fundo não especificado.*';
  const fund = getFund(fundId);
  const latest = getLatestCarteira(fundId);
  if (!latest) return `*Sem carteira registrada para ${fund?.name || fundId}.*`;
  const agg = aggregateCarteira(latest);
  let md = `### Carteira: ${fund?.name || '?'} — ${latest.ref_date}\n\n`;
  md += `**${agg.posCount} posições** · Peso total: ${agg.totalWeight.toFixed(1)}%`;
  if (agg.avgDuration != null) md += ` · Duration média: ${agg.avgDuration.toFixed(2)}a`;
  if (latest.aum) md += ` · AUM: R$ ${(latest.aum / 1e6).toFixed(1)}M`;
  md += '\n\n';
  md += `| Classe | Peso | # |\n|---|---|---|\n`;
  for (const [cls, v] of Object.entries(agg.byClass).filter(([_, v]) => v.weight > 0).sort((a, b) => b[1].weight - a[1].weight)) {
    md += `| ${ASSET_CLASSES[cls]?.label || cls} | ${v.weight.toFixed(1)}% | ${v.count} |\n`;
  }
  md += '\n';
  md += `| Ticker | Nome | Peso | Classe |\n|---|---|---|---|\n`;
  for (const pos of latest.positions.sort((a, b) => (b.weight_pct || 0) - (a.weight_pct || 0)).slice(0, 15)) {
    md += `| ${pos.ticker} | ${pos.name} | ${(pos.weight_pct || 0).toFixed(2)}% | ${ASSET_CLASSES[pos.asset_class]?.label || ''} |\n`;
  }
  if (latest.positions.length > 15) md += `\n*... e mais ${latest.positions.length - 15} posições*\n`;
  return md;
}

function generateTeseBlock(fundId, teseId) {
  if (!fundId || !teseId) return '*Tese não especificada.*';
  const tese = getTeseById(fundId, teseId);
  if (!tese) return '*Tese não encontrada.*';
  const st = THESIS_STATUS[tese.status] || {};
  let md = `### Tese: ${tese.title}\n\n`;
  md += `**Status:** ${st.icon} ${st.label} · **Convicção:** ${tese.conviction} · **Horizonte:** ${tese.horizon}\n\n`;
  md += tese.narrative || '';
  md += '\n\n';
  if (tese.target_assets?.length > 0) {
    md += `**Ativos-alvo:** ${tese.target_assets.map(a => `${a.ticker} (${a.role})`).join(', ')}\n\n`;
  }
  if (tese.base_case?.description) {
    md += `**Cenário base (${tese.base_case.probability}%):** ${tese.base_case.description}\n`;
  }
  return md;
}

function generateRegimeBlock() {
  const fs = state._fred_series;
  const ms = state._macro_series;
  let md = '';
  if (fs) {
    const us = detectUSRegime(fs);
    if (us) {
      md += `### Regime EUA: ${us.regime} (${us.confidence}% confiança)\n\n`;
      md += `| Sinal | Valor | Direção |\n|---|---|---|\n`;
      for (const s of us.signals) md += `| ${s.name} | ${s.value} | ${s.direction} |\n`;
      md += '\n';
    }
  }
  if (ms) {
    const br = detectBRRegime(ms);
    if (br) {
      md += `### Regime Brasil: ${br.regime} (${br.confidence}% confiança)\n\n`;
      md += `| Sinal | Valor | Direção |\n|---|---|---|\n`;
      for (const s of br.signals) md += `| ${s.name} | ${s.value} | ${s.direction} |\n`;
    }
  }
  return md || '*Dados de regime não disponíveis. Carregue BCB/FRED primeiro.*';
}

function generateFipeZapBlock() {
  const data = getFipeData();
  if (!data.updated_at) return '*FipeZap não carregado. Faça upload em Indicadores Setoriais.*';
  const st = data.series.res_venda || {};
  const lines = ['### FipeZap — Residencial Venda', '', '| Cidade | Último | Δ mês | 12m acum. |', '|---|---|---|---|'];
  for (const c of FIPE_CITIES) {
    const s = st[c.key];
    if (!s || s.length === 0) continue;
    const stats = computeSeriesStats(s);
    lines.push(`| ${c.label} | ${stats.last?.value?.toFixed(2) || '—'} | ${stats.mom != null ? stats.mom.toFixed(2) : '—'} | ${stats.accum12m != null ? stats.accum12m.toFixed(2) + '%' : '—'} |`);
  }
  return lines.join('\n');
}

/* ---------- Render: Research List ---------- */

function renderResearch() {
  const docs = getResearchDocs();
  const activeId = state._active_research;

  if (activeId) {
    const doc = getResearchById(activeId);
    if (doc) {
      if (state._research_editing) return renderResearchEditor(doc);
      return renderResearchPreview(doc);
    }
  }

  if (state._research_new) return renderResearchTemplateChooser();

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Research', 'Research <em>Proprietário</em>',
      'Autoria de research com blocos de dados automáticos. Insira snapshots de indicadores BCB, FRED, ativos, consenso, carteiras e teses diretamente no documento.'),

    h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' } }, [
      h('button', { class: 'btn-primary', onClick: () => { state._research_new = true; render(); } }, '+ Novo Research'),
    ]),

    docs.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum research criado'),
          h('p', { class: 'empty-desc' }, 'Crie seu primeiro research proprietário. Escolha um template e comece a escrever, inserindo blocos de dados do sistema.'),
        ])
      : h('div', {}, docs.slice().sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).map(doc => {
          const tmpl = RESEARCH_TEMPLATES[doc.template] || RESEARCH_TEMPLATES.custom;
          const fund = doc.fund_id ? getFund(doc.fund_id) : null;
          const sectionsFilled = doc.sections.filter(s => s.content || s.data_blocks.length > 0).length;
          return h('div', {
            class: 'card card-hover', style: { cursor: 'pointer', marginBottom: '10px' },
            onClick: () => { state._active_research = doc.id; state._research_editing = false; render(); },
          }, [
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } }, [
              h('div', {}, [
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
                  h('span', {}, tmpl.icon),
                  h('span', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px' } }, doc.title || 'Sem título'),
                ]),
                h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px' } },
                  `${tmpl.label} · ${sectionsFilled}/${doc.sections.length} seções · ${fund ? fund.name + ' · ' : ''}${doc.author || 'sem autor'}`),
              ]),
              h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
                h('span', { class: 'mono', style: { fontSize: '9px', padding: '2px 6px', border: '1px solid var(--border)', color: doc.status === 'final' ? 'var(--green)' : 'var(--text-faint)', textTransform: 'uppercase' } },
                  doc.status === 'final' ? 'Final' : 'Rascunho'),
                h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } },
                  new Date(doc.updated_at).toLocaleDateString('pt-BR')),
              ]),
            ]),
            doc.tags?.length > 0 && h('div', { style: { display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' } },
              doc.tags.map(t => h('span', { class: 'mono', style: { fontSize: '9px', padding: '1px 6px', border: '1px solid var(--border)', color: 'var(--text-faint)' } }, t))
            ),
          ]);
        })),
  ]);
}

/* ---------- Template Chooser ---------- */

function renderResearchTemplateChooser() {
  const funds = getFunds();
  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._research_new = false; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Cancelar'),
    ]),
    h('h1', { class: 'page-title' }, 'Novo Research — Escolha o Template'),

    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginTop: '20px' } },
      Object.entries(RESEARCH_TEMPLATES).map(([key, tmpl]) =>
        h('div', {
          class: 'card card-hover',
          style: { cursor: 'pointer', padding: '20px', borderTop: `2px solid var(--amber)` },
          onClick: () => {
            const doc = newResearchDoc(key);
            doc.fund_id = funds.length > 0 ? funds[0].id : null;
            state._research_new = false;
            state._active_research = doc.id;
            state._research_editing = true;
            state._research_doc_temp = doc;
            render();
          },
        }, [
          h('div', { style: { fontSize: '24px', marginBottom: '8px' } }, tmpl.icon),
          h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '4px' } }, tmpl.label),
          h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' } }, tmpl.desc),
          h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } },
            `${tmpl.sections.length} seções: ${tmpl.sections.map(s => SECTION_LABELS[s] || s).join(', ')}`),
        ])
      )
    ),
  ]);
}

/* ---------- Research Editor ---------- */

function renderResearchEditor(doc) {
  // If coming from template chooser, use temp doc
  if (state._research_doc_temp && state._research_doc_temp.id === doc.id) doc = state._research_doc_temp;
  else if (!getResearchById(doc.id)) doc = state._research_doc_temp || doc;

  const tmpl = RESEARCH_TEMPLATES[doc.template] || RESEARCH_TEMPLATES.custom;
  const funds = getFunds();

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => {
      state._research_editing = false;
      if (state._research_doc_temp) { state._active_research = null; state._research_doc_temp = null; }
      render();
    }}, [ h('span', {}, '←'), h('span', {}, 'Cancelar') ]),

    h('h1', { class: 'page-title' }, doc.title ? `Editando: ${doc.title}` : 'Novo Research'),

    // Metadata
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '16px' } }, [
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Título'),
          h('input', { class: 'form-field-input', type: 'text', value: doc.title, placeholder: 'Ex: Credit Research — CRI Logística XYZ',
            oninput: e => doc.title = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Autor'),
          h('input', { class: 'form-field-input', type: 'text', value: doc.author || '', placeholder: 'Nome',
            oninput: e => doc.author = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Fundo (opcional)'),
          h('select', { class: 'form-field-select', onchange: e => doc.fund_id = e.target.value || null }, [
            h('option', { value: '' }, '— Nenhum —'),
            ...funds.map(f => h('option', { value: f.id, selected: doc.fund_id === f.id ? 'selected' : null }, f.name)),
          ]) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Status'),
          h('select', { class: 'form-field-select', onchange: e => doc.status = e.target.value }, [
            h('option', { value: 'draft', selected: doc.status === 'draft' ? 'selected' : null }, 'Rascunho'),
            h('option', { value: 'final', selected: doc.status === 'final' ? 'selected' : null }, 'Final'),
          ]) ]),
      ]),
      h('div', { style: { marginTop: '12px' } }, [
        h('label', { class: 'form-field-label' }, 'Tags (separadas por vírgula)'),
        h('input', { class: 'form-field-input', type: 'text', value: (doc.tags || []).join(', '), placeholder: 'Ex: crédito, logística, CRI',
          oninput: e => doc.tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean) }),
      ]),
    ]),

    // Sections
    ...doc.sections.map((section, sIdx) => h('div', {
      class: 'card', style: { padding: '20px', marginBottom: '12px', borderLeft: section.content || section.data_blocks.length > 0 ? '3px solid var(--amber)' : '3px solid var(--border)' },
    }, [
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } }, [
        h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber)' } },
          `§${String(sIdx + 1).padStart(2, '0')} ${section.label}`),
        // Data block inserter
        h('div', { style: { position: 'relative' } }, [
          h('button', { class: 'btn-secondary', style: { fontSize: '10px' },
            onClick: () => { state._db_picker = state._db_picker === sIdx ? null : sIdx; render(); },
          }, '+ Bloco de dados'),
        ]),
      ]),

      // Data block picker
      state._db_picker === sIdx && renderDataBlockPicker(doc, sIdx),

      // Existing data blocks
      section.data_blocks.map((db, dbIdx) => h('div', {
        style: { padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: '10px', position: 'relative' },
      }, [
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } }, [
          h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.15em' } },
            `${DATA_BLOCK_TYPES[db.type]?.icon || ''} ${DATA_BLOCK_TYPES[db.type]?.label || db.type}`),
          h('button', { style: { color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' },
            onClick: () => { section.data_blocks.splice(dbIdx, 1); render(); } }, '×'),
        ]),
        h('pre', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-faint)', whiteSpace: 'pre-wrap', lineHeight: '1.5', maxHeight: '200px', overflow: 'auto' } }, db.content),
      ])),

      // Text content
      h('textarea', {
        class: 'form-field-textarea', rows: section.key === 'content' ? '12' : '6',
        placeholder: `Escreva o conteúdo de "${section.label}"... Use Markdown para formatação.`,
        style: { fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.7' },
        oninput: e => section.content = e.target.value,
      }, section.content || ''),
    ])),

    // Actions
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' } }, [
      h('button', { class: 'btn-secondary', style: { color: 'var(--red)' }, onClick: () => {
        if (getResearchById(doc.id)) deleteResearchDoc(doc.id);
        state._research_editing = false; state._active_research = null; state._research_doc_temp = null;
        render();
      }}, 'Excluir'),
      h('button', { class: 'btn-primary', onClick: () => {
        if (!doc.title?.trim()) { showToast('Título é obrigatório', true); return; }
        saveResearchDoc(doc);
        state._research_editing = false;
        state._research_doc_temp = null;
        showToast('Research salvo');
        render();
      }}, 'Salvar Research'),
    ]),
  ]);
}

function renderDataBlockPicker(doc, sIdx) {
  const section = doc.sections[sIdx];
  const funds = getFunds();
  const allTeses = getTeses();

  return h('div', { style: { padding: '14px', background: 'var(--bg-3)', border: '1px solid var(--amber)', marginBottom: '12px' } }, [
    h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--amber)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.15em' } }, 'Inserir bloco de dados'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' } },
      Object.entries(DATA_BLOCK_TYPES).map(([key, meta]) => {
        // Some blocks need parameters
        const needsParam = ['asset', 'consensus', 'carteira', 'tese'].includes(key);
        return h('button', {
          class: 'btn-secondary', style: { textAlign: 'left', padding: '10px', fontSize: '11px' },
          onClick: () => {
            if (key === 'asset') {
              const ticker = prompt('Ticker do ativo (ex: AAPL, KNCR11):');
              if (!ticker) return;
              const content = generateDataBlock(key, { ticker: ticker.trim().toUpperCase() });
              section.data_blocks.push({ type: key, params: { ticker: ticker.trim().toUpperCase() }, content, generated_at: new Date().toISOString() });
            } else if (key === 'consensus') {
              const slug = prompt('Slug da taxonomia (ex: brazil, us_equities, ai):');
              if (!slug) return;
              const content = generateDataBlock(key, { slug: slug.trim() });
              section.data_blocks.push({ type: key, params: { slug: slug.trim() }, content, generated_at: new Date().toISOString() });
            } else if (key === 'carteira') {
              if (funds.length === 0) { showToast('Nenhum fundo cadastrado', true); return; }
              const fundId = funds.length === 1 ? funds[0].id : prompt('ID do fundo:\n' + funds.map(f => `${f.id} = ${f.name}`).join('\n'));
              if (!fundId) return;
              const content = generateDataBlock(key, { fund_id: fundId.trim() });
              section.data_blocks.push({ type: key, params: { fund_id: fundId.trim() }, content, generated_at: new Date().toISOString() });
            } else if (key === 'tese') {
              if (allTeses.length === 0) { showToast('Nenhuma tese cadastrada', true); return; }
              const choice = prompt('Teses disponíveis:\n' + allTeses.map(t => `${t._fund_id}|${t.id} = ${t.title}`).join('\n') + '\n\nCole fund_id|tese_id:');
              if (!choice) return;
              const [fid, tid] = choice.split('|');
              const content = generateDataBlock(key, { fund_id: fid, tese_id: tid });
              section.data_blocks.push({ type: key, params: { fund_id: fid, tese_id: tid }, content, generated_at: new Date().toISOString() });
            } else {
              const content = generateDataBlock(key);
              section.data_blocks.push({ type: key, params: {}, content, generated_at: new Date().toISOString() });
            }
            state._db_picker = null;
            render();
          },
        }, [ h('span', {}, `${meta.icon} ${meta.label}`), h('div', { style: { fontSize: '9px', color: 'var(--text-faint)', marginTop: '2px' } }, meta.desc) ]);
      })
    ),
    h('div', { style: { marginTop: '8px', textAlign: 'right' } }, [
      h('button', { class: 'btn-secondary', style: { fontSize: '10px' }, onClick: () => { state._db_picker = null; render(); } }, 'Fechar'),
    ]),
  ]);
}

/* ---------- Research Preview ---------- */

function renderResearchPreview(doc) {
  const tmpl = RESEARCH_TEMPLATES[doc.template] || RESEARCH_TEMPLATES.custom;
  const fund = doc.fund_id ? getFund(doc.fund_id) : null;

  // Build full markdown
  let fullMd = `# ${doc.title || 'Sem título'}\n\n`;
  fullMd += `**Template:** ${tmpl.label} · **Autor:** ${doc.author || '—'} · **Data:** ${new Date(doc.updated_at).toLocaleDateString('pt-BR')}`;
  if (fund) fullMd += ` · **Fundo:** ${fund.name}`;
  fullMd += '\n\n---\n\n';

  for (const section of doc.sections) {
    const hasContent = section.content || section.data_blocks.length > 0;
    if (!hasContent) continue;
    fullMd += `## ${section.label}\n\n`;
    for (const db of section.data_blocks) {
      fullMd += db.content + '\n\n';
    }
    if (section.content) fullMd += section.content + '\n\n';
  }

  fullMd += `---\n*Research proprietário — Aegir·Intel — ${new Date().toLocaleDateString('pt-BR')}. Confidencial.*\n`;

  // Simple markdown to HTML
  let html = fullMd
    .replace(/### (.*)/g, '<h3 style="font-family:Fraunces,serif;font-size:15px;color:var(--amber);margin:20px 0 8px">$1</h3>')
    .replace(/## (.*)/g, '<h2 style="font-family:Fraunces,serif;font-size:18px;margin:28px 0 12px;border-bottom:1px solid var(--border);padding-bottom:6px">$1</h2>')
    .replace(/# (.*)/g, '<h1 style="font-family:Fraunces,serif;font-size:24px;margin:0 0 8px;letter-spacing:-0.02em">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--amber)">$1</strong>')
    .replace(/\| (.+) \|/g, (match) => {
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      if (cells.every(c => c.match(/^[-:]+$/))) return '<tr class="table-sep"></tr>';
      const tag = cells.length > 0 && match.includes('---') ? 'td' : 'td';
      return '<tr>' + cells.map(c => `<${tag} style="padding:4px 10px;border-bottom:1px solid var(--border);font-size:12px">${c}</${tag}>`).join('') + '</tr>';
    })
    .replace(/(<tr.*<\/tr>\n?)+/g, (match) => `<table style="width:100%;border-collapse:collapse;margin:10px 0">${match}</table>`)
    .replace(/\n\n/g, '</p><p style="line-height:1.7;color:var(--text-muted);margin:0 0 10px">')
    .replace(/\n/g, '<br>');
  html = '<p style="line-height:1.7;color:var(--text-muted);margin:0 0 10px">' + html + '</p>';

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._active_research = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Todos os researches'),
    ]),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } }, [
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
        h('span', {}, tmpl.icon),
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } },
          `${tmpl.label} · ${doc.status === 'final' ? 'Final' : 'Rascunho'} · ${new Date(doc.updated_at).toLocaleDateString('pt-BR')}`),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-secondary', onClick: () => { state._research_editing = true; render(); } }, 'Editar'),
        h('button', { class: 'btn-secondary', onClick: () => {
          const blob = new Blob([fullMd], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `research-${(doc.title || 'doc').replace(/\s+/g, '-').substring(0, 40)}.md`;
          a.click(); URL.revokeObjectURL(url);
          showToast('Research exportado');
        }}, '↓ Exportar .md'),
        h('button', { class: 'btn-secondary', style: { color: 'var(--red)' }, onClick: () => deleteResearchDoc(doc.id) }, 'Excluir'),
      ]),
    ]),

    h('div', { class: 'card', style: { padding: '32px 40px', maxWidth: '900px' } }, [
      h('div', { html }),
    ]),
  ]);
}

/* ============================================================
   35. XML CVM PARSER — Universal for FII, FIDC, FIM, FIA
   Standard: arquivoposicao_4_01 (ANBIMA)
   ============================================================ */

function parseCVMXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const fundo = doc.querySelector('fundo');
  if (!fundo) throw new Error('Tag <fundo> não encontrada no XML');

  const header = fundo.querySelector('header');
  if (!header) throw new Error('Tag <header> não encontrada');

  const txt = (el, tag) => { const n = el.querySelector(tag); return n ? n.textContent.trim() : ''; };
  const num = (el, tag) => { const v = txt(el, tag); return v ? parseFloat(v) : null; };
  const fmtDate = (d) => d && d.length === 8 && d !== '00000000' ? `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}` : null;

  // Header
  const fund = {
    isin: txt(header, 'isin'),
    cnpj: txt(header, 'cnpj'),
    nome: txt(header, 'nome'),
    dtposicao: fmtDate(txt(header, 'dtposicao')),
    dtposicao_raw: txt(header, 'dtposicao'),
    nomeadm: txt(header, 'nomeadm'),
    cnpjadm: txt(header, 'cnpjadm'),
    nomegestor: txt(header, 'nomegestor'),
    cnpjgestor: txt(header, 'cnpjgestor'),
    nomecustodiante: txt(header, 'nomecustodiante'),
    cnpjcustodiante: txt(header, 'cnpjcustodiante'),
    valorcota: num(header, 'valorcota'),
    quantidade: num(header, 'quantidade'),
    patliq: num(header, 'patliq'),
    valorativos: num(header, 'valorativos'),
    valorreceber: num(header, 'valorreceber'),
    valorpagar: num(header, 'valorpagar'),
    vlcotasemitir: num(header, 'vlcotasemitir'),
    vlcotasresgatar: num(header, 'vlcotasresgatar'),
    codanbid: txt(header, 'codanbid'),
    tipofundo: txt(header, 'tipofundo'),
  };

  // Classify fund type
  const tipo = parseInt(fund.tipofundo);
  fund.tipoLabel = tipo === 431 ? 'FII' : tipo === 348 ? 'FIDC' : tipo === 555 ? 'FIM' : tipo === 501 ? 'FIA' : `Tipo ${tipo}`;

  // Parse positions by section
  const positions = { acoes: [], titprivado: [], titpublico: [], cotas: [], caixa: [], imoveis: [], despesas: null };

  // Ações (equities / FII cotas)
  for (const el of fundo.querySelectorAll('acoes')) {
    positions.acoes.push({
      type: 'acao',
      isin: txt(el, 'isin'),
      codativo: txt(el, 'codativo'),
      qtdisponivel: num(el, 'qtdisponivel'),
      qtgarantia: num(el, 'qtgarantia'),
      puposicao: num(el, 'puposicao'),
      valorfindisp: num(el, 'valorfindisp'),
      valorfinemgar: num(el, 'valorfinemgar'),
      tributos: num(el, 'tributos'),
      percprovcred: num(el, 'percprovcred'),
      classeoperacao: txt(el, 'classeoperacao'),
      cnpjinter: txt(el, 'cnpjinter'),
    });
  }

  // Títulos privados (CRI, CCI, debêntures)
  for (const el of fundo.querySelectorAll('titprivado')) {
    positions.titprivado.push({
      type: 'titprivado',
      isin: txt(el, 'isin'),
      codativo: txt(el, 'codativo'),
      dtemissao: fmtDate(txt(el, 'dtemissao')),
      dtoperacao: fmtDate(txt(el, 'dtoperacao')),
      dtvencimento: fmtDate(txt(el, 'dtvencimento')),
      cnpjemissor: txt(el, 'cnpjemissor'),
      qtdisponivel: num(el, 'qtdisponivel'),
      qtgarantia: num(el, 'qtgarantia'),
      pucompra: num(el, 'pucompra'),
      puvencimento: num(el, 'puvencimento'),
      puposicao: num(el, 'puposicao'),
      puemissao: num(el, 'puemissao'),
      principal: num(el, 'principal'),
      tributos: num(el, 'tributos'),
      valorfindisp: num(el, 'valorfindisp'),
      valorfinemgar: num(el, 'valorfinemgar'),
      coupom: num(el, 'coupom'),
      indexador: txt(el, 'indexador'),
      percindex: num(el, 'percindex'),
      caracteristica: txt(el, 'caracteristica'),
      percprovcred: num(el, 'percprovcred'),
      classeoperacao: txt(el, 'classeoperacao'),
      nivelrsc: txt(el, 'nivelrsc'),
    });
  }

  // Cotas (fund-of-fund)
  for (const el of fundo.querySelectorAll('cotas')) {
    positions.cotas.push({
      type: 'cota',
      isin: txt(el, 'isin'),
      cnpjfundo: txt(el, 'cnpjfundo'),
      qtdisponivel: num(el, 'qtdisponivel'),
      qtgarantia: num(el, 'qtgarantia'),
      puposicao: num(el, 'puposicao'),
      tributos: num(el, 'tributos'),
      valorfindisp: num(el, 'valorfindisp') || (num(el, 'qtdisponivel') && num(el, 'puposicao') ? num(el, 'qtdisponivel') * num(el, 'puposicao') : null),
    });
  }

  // Caixa
  for (const el of fundo.querySelectorAll('caixa')) {
    positions.caixa.push({
      type: 'caixa',
      isininstituicao: txt(el, 'isininstituicao'),
      tpconta: txt(el, 'tpconta'),
      saldo: num(el, 'saldo'),
    });
  }

  // Títulos Públicos (Tesouro Direto, LFT, NTN-B, etc.)
  for (const el of fundo.querySelectorAll('titpublico')) {
    positions.titpublico.push({
      type: 'titpublico',
      isin: txt(el, 'isin'),
      codativo: txt(el, 'codativo'),
      dtemissao: fmtDate(txt(el, 'dtemissao')),
      dtoperacao: fmtDate(txt(el, 'dtoperacao')),
      dtvencimento: fmtDate(txt(el, 'dtvencimento')),
      qtdisponivel: num(el, 'qtdisponivel'),
      qtgarantia: num(el, 'qtgarantia'),
      pucompra: num(el, 'pucompra'),
      puvencimento: num(el, 'puvencimento'),
      puposicao: num(el, 'puposicao'),
      principal: num(el, 'principal'),
      tributos: num(el, 'tributos'),
      valorfindisp: num(el, 'valorfindisp'),
      valorfinemgar: num(el, 'valorfinemgar'),
      coupom: num(el, 'coupom'),
      indexador: txt(el, 'indexador'),
      percindex: num(el, 'percindex'),
    });
  }

  // Imóveis (FII Tijolo)
  for (const el of fundo.querySelectorAll('imoveis')) {
    positions.imoveis.push({
      type: 'imovel',
      nomecomercial: txt(el, 'nomecomercial'),
      logradouro: txt(el, 'logradouro'),
      numero: txt(el, 'numero'),
      complemento: txt(el, 'complemento'),
      cidade: txt(el, 'cidade'),
      estado: txt(el, 'estado'),
      cep: txt(el, 'cep'),
      matricula: txt(el, 'matricula'),
      percpart: num(el, 'percpart'),
      valorcontabil: num(el, 'valorcontabil'),
      valoravaliacao: num(el, 'valoravaliacao'),
      aluguelcontratado: num(el, 'aluguelcontratado'),
      aluguelatrasado: num(el, 'aluguelatrasado'),
      tipoimovel: txt(el, 'tipoimovel'),
      tipouso: txt(el, 'tipouso'),
      opcaorecompra: txt(el, 'opcaorecompra'),
      questjur: txt(el, 'questjur'),
      motivoquestjur: txt(el, 'motivoquestjur'),
    });
  }

  // Despesas (FIDC)
  const despEl = fundo.querySelector('despesas');
  if (despEl) {
    positions.despesas = {
      txadm: num(despEl, 'txadm'),
      tributos: num(despEl, 'tributos'),
      perctaxaadm: num(despEl, 'perctaxaadm'),
      txperf: txt(despEl, 'txperf'),
      outtax: num(despEl, 'outtax'),
    };
  }

  // Provisões
  const provisoes = [];
  for (const el of fundo.querySelectorAll('provisao')) {
    provisoes.push({
      codprov: txt(el, 'codprov'),
      credeb: txt(el, 'credeb'),
      dt: fmtDate(txt(el, 'dt')),
      valor: num(el, 'valor'),
    });
  }

  // Aggregate stats
  const allPositions = [...positions.acoes, ...positions.titprivado, ...positions.titpublico, ...positions.cotas];
  const totalValorDisp = allPositions.reduce((a, p) => a + (p.valorfindisp || 0), 0);
  const totalImoveis = positions.imoveis.reduce((a, p) => a + (p.valorcontabil || 0), 0);
  const totalCaixa = positions.caixa.reduce((a, p) => a + (p.saldo || 0), 0);
  const totalProvisoes = provisoes.reduce((a, p) => a + (p.valor || 0), 0);

  // PDD total
  const pddTotal = positions.titprivado.reduce((a, p) => {
    if (p.percprovcred > 0 && p.valorfindisp) return a + (p.percprovcred / 100) * p.valorfindisp;
    return a;
  }, 0);

  return {
    fund,
    positions,
    provisoes,
    stats: {
      totalAtivos: allPositions.length + positions.imoveis.length,
      totalValorDisp: totalValorDisp + totalImoveis,
      totalCaixa,
      totalProvisoes,
      totalImoveis,
      pddTotal,
      posAcoes: positions.acoes.length,
      posTitPrivado: positions.titprivado.length,
      posTitPublico: positions.titpublico.length,
      posCotas: positions.cotas.length,
      posImoveis: positions.imoveis.length,
    },
  };
}

/* ---------- Zeragem Fund Helpers ---------- */

function getZeragemFunds() {
  if (!Array.isArray(DB.zeragemFunds)) DB.zeragemFunds = [];
  return DB.zeragemFunds;
}

function isZeragemFund(cnpjOrIsin) {
  return getZeragemFunds().includes(cnpjOrIsin);
}

function toggleZeragem(cnpjOrIsin) {
  if (!cnpjOrIsin) return;
  if (!Array.isArray(DB.zeragemFunds)) DB.zeragemFunds = [];
  const idx = DB.zeragemFunds.indexOf(cnpjOrIsin);
  if (idx >= 0) {
    DB.zeragemFunds.splice(idx, 1);
    showToast('Fundo removido da zeragem');
  } else {
    DB.zeragemFunds.push(cnpjOrIsin);
    showToast('Fundo marcado como zeragem (liquidez)');
  }
  saveDB(DB);
}

/* ---------- Carteira Storage ---------- */

function getCarteirasXML(cnpj) {
  if (!DB.carteirasXML) DB.carteirasXML = {};
  if (!Array.isArray(DB.carteirasXML[cnpj])) DB.carteirasXML[cnpj] = [];
  // Migrate old carteiras: ensure all position arrays exist
  for (const c of DB.carteirasXML[cnpj]) {
    if (c.positions) {
      if (!c.positions.titpublico) c.positions.titpublico = [];
      if (!c.positions.imoveis) c.positions.imoveis = [];
      if (!c.positions.acoes) c.positions.acoes = [];
      if (!c.positions.titprivado) c.positions.titprivado = [];
      if (!c.positions.cotas) c.positions.cotas = [];
      if (!c.positions.caixa) c.positions.caixa = [];
    }
    if (c.stats) {
      if (c.stats.posImoveis == null) c.stats.posImoveis = (c.positions?.imoveis || []).length;
      if (c.stats.posTitPublico == null) c.stats.posTitPublico = (c.positions?.titpublico || []).length;
      if (c.stats.totalImoveis == null) c.stats.totalImoveis = (c.positions?.imoveis || []).reduce((a, p) => a + (p.valorcontabil || 0), 0);
    }
  }
  return DB.carteirasXML[cnpj];
}

function saveCarteiraXML(parsed) {
  if (!DB.carteirasXML) DB.carteirasXML = {};
  const cnpj = parsed.fund.cnpj;
  if (!Array.isArray(DB.carteirasXML[cnpj])) DB.carteirasXML[cnpj] = [];

  // Check duplicate date
  const existing = DB.carteirasXML[cnpj].findIndex(c => c.fund.dtposicao === parsed.fund.dtposicao);
  if (existing >= 0) {
    DB.carteirasXML[cnpj][existing] = parsed;
  } else {
    DB.carteirasXML[cnpj].push(parsed);
    DB.carteirasXML[cnpj].sort((a, b) => (a.fund.dtposicao || '').localeCompare(b.fund.dtposicao || ''));
  }

  // Auto-register fund if not exists
  autoRegisterFundFromXML(parsed.fund);

  saveDB(DB);
  return cnpj;
}

function autoRegisterFundFromXML(fundHeader) {
  const funds = getFunds();
  const existing = funds.find(f => f.cnpj === fundHeader.cnpj);
  if (existing) {
    // Update PL and cota from latest XML
    existing.aum = fundHeader.patliq;
    existing.valorcota = fundHeader.valorcota;
    return;
  }
  // Auto-create
  const newFund = emptyFund();
  newFund.name = fundHeader.nome;
  newFund.cnpj = fundHeader.cnpj;
  newFund.classification = fundHeader.tipoLabel === 'FII' ? 'fii' : fundHeader.tipoLabel === 'FIDC' ? 'fidc' : 'fim';
  newFund.benchmark = fundHeader.tipoLabel === 'FIDC' ? 'CDI' : 'IFIX';
  newFund.aum = fundHeader.patliq;
  newFund.valorcota = fundHeader.valorcota;
  newFund.administrador = fundHeader.nomeadm;
  newFund.custodiante = fundHeader.nomecustodiante;
  saveFund(newFund);
  showToast(`Fundo "${fundHeader.nome}" cadastrado automaticamente`);
}

/* ---------- Render: Funds BackOffice ---------- */

function renderFundsList() {
  const funds = getFunds();

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Fundos', 'Fundos da <em>Gestora</em>',
      'BackOffice de fundos. Upload de XML CVM para registrar carteiras automaticamente. Clique em um fundo para detalhes.'),

    // Upload XML
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } }, [
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-primary', onClick: () => triggerXMLUpload() }, '↑ Upload XML CVM'),
        h('button', { class: 'btn-secondary', onClick: () => setView('am_new') }, '+ Cadastro Manual'),
      ]),
      state._xml_upload_status && h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--amber)' } }, state._xml_upload_status),
    ]),

    // Aggregate KPIs
    funds.length > 0 && (() => {
      const totalPL = funds.reduce((a, f) => a + (f.aum || 0), 0);
      const totalFunds = funds.length;
      const withCarteira = funds.filter(f => getCarteirasXML(f.cnpj).length > 0).length;
      return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' } }, [
        renderPortKPI('Fundos', String(totalFunds), ''),
        renderPortKPI('PL Consolidado', totalPL > 0 ? formatBRL(totalPL) : '—', 'Todos os fundos'),
        renderPortKPI('Com Carteira XML', `${withCarteira}/${totalFunds}`, 'Carteiras carregadas'),
        renderPortKPI('Última Atualização', (() => {
          const allDates = funds.flatMap(f => getCarteirasXML(f.cnpj).map(c => c.fund.dtposicao)).filter(Boolean).sort();
          return allDates.length > 0 ? allDates[allDates.length - 1] : '—';
        })(), ''),
      ]);
    })(),

    // Fund list
    funds.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum fundo cadastrado'),
          h('p', { class: 'empty-desc' }, 'Faça upload de um XML CVM para cadastrar automaticamente, ou use o cadastro manual.'),
        ])
      : h('div', {}, funds.map(fund => {
          const carteiras = getCarteirasXML(fund.cnpj);
          const latest = carteiras.length > 0 ? carteiras[carteiras.length - 1] : null;
          return h('div', {
            class: 'card card-hover',
            style: { marginBottom: '10px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px 80px', gap: '16px', alignItems: 'center' },
            onClick: () => { state._backoffice_fund = fund.cnpj || fund.id; render(); },
          }, [
            h('div', {}, [
              h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px' } }, fund.name),
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '3px' } },
                `${fund.cnpj || '—'} · ${fund.classification?.toUpperCase() || '?'} · ${fund.benchmark || '—'}`),
            ]),
            h('div', { style: { textAlign: 'right' } }, [
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'PL'),
              h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, fund.aum ? formatBRL(fund.aum) : '—'),
            ]),
            h('div', { style: { textAlign: 'right' } }, [
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Cota'),
              h('div', { class: 'mono', style: { fontSize: '13px' } }, fund.valorcota ? `R$ ${fund.valorcota.toFixed(6)}` : '—'),
            ]),
            h('div', { style: { textAlign: 'right' } }, [
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Carteiras'),
              h('div', { class: 'mono', style: { fontSize: '13px' } }, String(carteiras.length)),
            ]),
            h('div', { style: { textAlign: 'right' } }, [
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Última'),
              h('div', { class: 'mono', style: { fontSize: '11px' } }, latest?.fund?.dtposicao || '—'),
            ]),
          ]);
        })),
  ]);
}

function triggerXMLUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xml';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        state._xml_upload_status = `Processando ${file.name}…`;
        render();
        const text = await file.text();
        const parsed = parseCVMXml(text);
        saveCarteiraXML(parsed);
        showToast(`${parsed.fund.nome}: carteira ${parsed.fund.dtposicao} importada (${parsed.stats.totalAtivos} ativos)`);
      } catch (err) {
        showToast(`Erro em ${file.name}: ${err.message}`, true);
      }
    }
    state._xml_upload_status = null;
    render();
  };
  input.click();
}

/* ---------- Render: Fund BackOffice Detail ---------- */

function renderFundBackoffice(cnpj) {
  const fund = getFunds().find(f => f.cnpj === cnpj || f.id === cnpj);
  if (!fund) { state._backoffice_fund = null; return renderFundsList(); }

  const carteiras = getCarteirasXML(fund.cnpj);
  const activeDate = state._bo_date;
  const selected = activeDate ? carteiras.find(c => c.fund.dtposicao === activeDate) : (carteiras.length > 0 ? carteiras[carteiras.length - 1] : null);
  const subTab = state._bo_tab || 'panorama';

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._backoffice_fund = null; state._bo_tab = null; state._bo_date = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Todos os fundos'),
    ]),

    // Header
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' } }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, `BackOffice · ${fund.classification?.toUpperCase() || ''}`),
        h('h1', { class: 'page-title' }, fund.name),
        h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' } },
          `CNPJ: ${fund.cnpj || '—'} · Gestor: ${fund.nomegestor || selected?.fund?.nomegestor || '—'} · Adm: ${fund.administrador || selected?.fund?.nomeadm || '—'} · ${carteiras.length} carteira(s)`),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-primary', onClick: () => triggerXMLUpload() }, '↑ Upload XML'),
        h('button', { class: 'btn-secondary', onClick: () => { state._fund_edit = JSON.parse(JSON.stringify(fund)); setView('am_edit'); } }, 'Editar'),
      ]),
    ]),

    // Sub-tabs
    h('div', { class: 'sec-tab-row', style: { marginBottom: '16px' } },
      [
        ['panorama', 'Panorama'],
        ['carteira', 'Carteira'],
        ['resumo', 'Resumo & KPIs'],
        ['provisoes', 'Provisões'],
        ['imoveis', 'Imóveis'],
      ].map(([k, l]) => h('button', {
        class: 'sec-tab' + (subTab === k ? ' active' : ''),
        onClick: () => { state._bo_tab = k; render(); },
      }, l))
    ),

    // Date selector (calendar dropdown for carteira/resumo/provisoes/imoveis)
    subTab !== 'panorama' && carteiras.length > 0 && h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' } }, [
      h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em' } }, 'Data:'),
      h('select', {
        class: 'form-field-select', style: { width: '180px', fontSize: '12px' },
        onchange: e => { state._bo_date = e.target.value; render(); },
      }, carteiras.slice().reverse().map(c =>
        h('option', { value: c.fund.dtposicao, selected: selected && c.fund.dtposicao === selected.fund.dtposicao ? 'selected' : null },
          `${c.fund.dtposicao} · ${c.stats.totalAtivos} ativos`)
      )),
      selected && h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } },
        `PL: ${formatBRL(selected.fund.patliq)} · Cota: R$ ${(selected.fund.valorcota || 0).toFixed(6)}`),
    ]),

    !selected && subTab !== 'panorama'
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhuma carteira XML carregada'),
          h('p', { class: 'empty-desc' }, 'Faça upload do arquivo XML padrão CVM para visualizar a carteira deste fundo.'),
        ])
      : subTab === 'panorama' ? renderFundPanorama(fund, carteiras) :
        subTab === 'carteira' ? renderCarteiraXMLDetail(selected, fund) :
        subTab === 'resumo' ? renderCarteiraResumo(selected, fund) :
        subTab === 'provisoes' ? renderCarteiraProvisoes(selected) :
        subTab === 'imoveis' ? renderCarteiraImoveis(selected) : null,
  ]);
}

/* ---------- Panorama Temporal ---------- */

function renderFundPanorama(fund, carteiras) {
  if (carteiras.length === 0) {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'empty-title' }, 'Sem dados para panorama'),
      h('p', { class: 'empty-desc' }, 'Carregue pelo menos uma carteira XML para visualizar. Com múltiplas datas, gráficos de evolução serão gerados.'),
    ]);
  }

  const latest = carteiras[carteiras.length - 1];
  const f = latest.fund;
  const s = latest.stats;

  // Build time series from all carteiras
  const plSeries = carteiras.map(c => ({ date: c.fund.dtposicao, value: c.fund.patliq })).filter(d => d.value);
  const cotaSeries = carteiras.map(c => ({ date: c.fund.dtposicao, value: c.fund.valorcota })).filter(d => d.value);
  const ativosSeries = carteiras.map(c => ({ date: c.fund.dtposicao, value: c.stats.totalAtivos })).filter(d => d.value != null);
  const caixaSeries = carteiras.map(c => ({ date: c.fund.dtposicao, value: c.stats.totalCaixa })).filter(d => d.value != null);
  const pddSeries = carteiras.map(c => ({ date: c.fund.dtposicao, value: c.stats.pddTotal })).filter(d => d.value != null);

  // Rentabilidade (variação da cota)
  const rentSeries = [];
  for (let i = 1; i < cotaSeries.length; i++) {
    const prev = cotaSeries[i - 1].value;
    const curr = cotaSeries[i].value;
    if (prev > 0) rentSeries.push({ date: cotaSeries[i].date, value: ((curr / prev) - 1) * 100 });
  }

  return h('div', {}, [
    // KPIs atuais
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('PL Atual', formatBRL(f.patliq), f.dtposicao),
      renderPortKPI('Valor Cota', f.valorcota ? `R$ ${f.valorcota.toFixed(6)}` : '—', ''),
      renderPortKPI('Qtd Cotas', f.quantidade ? Math.round(f.quantidade).toLocaleString('pt-BR') : '—', ''),
      renderPortKPI('Carteiras', String(carteiras.length), `${carteiras[0].fund.dtposicao} → ${f.dtposicao}`),
      renderPortKPI('Total Ativos', String(s.totalAtivos), `${s.posAcoes || 0} ações · ${s.posTitPrivado || 0} tít.priv. · ${s.posImoveis || 0} imóv.`),
      renderPortKPI('Caixa', formatBRL(s.totalCaixa), f.patliq > 0 ? `${(s.totalCaixa / f.patliq * 100).toFixed(2)}% PL` : ''),
      renderPortKPI('PDD', s.pddTotal > 0 ? formatBRL(s.pddTotal) : 'R$ 0', ''),
      s.totalImoveis > 0 && renderPortKPI('Imóveis', formatBRL(s.totalImoveis), `${s.posImoveis} imóvel(is)`),
    ].filter(Boolean)),

    // Charts (only if multiple dates)
    carteiras.length >= 2 && h('div', {}, [
      h('div', { class: 'macro-section-subhead' }, 'Evolução Temporal'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' } }, [
        renderPanoramaChart('Patrimônio Líquido', plSeries, 'R$', 'var(--amber)'),
        renderPanoramaChart('Valor da Cota', cotaSeries, 'R$', 'var(--green)'),
      ]),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' } }, [
        rentSeries.length > 0 && renderPanoramaChart('Variação da Cota (%)', rentSeries, '%', 'var(--blue)', true),
        caixaSeries.length > 0 && renderPanoramaChart('Posição de Caixa', caixaSeries, 'R$', '#9a958c'),
      ].filter(Boolean)),
      pddSeries.some(p => p.value > 0) && h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } }, [
        renderPanoramaChart('PDD Total', pddSeries, 'R$', 'var(--red)'),
        renderPanoramaChart('Nº Ativos', ativosSeries, '#', 'var(--text-dim)'),
      ]),
    ]),

    // Historical table
    h('div', { style: { marginTop: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Histórico de Carteiras'),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Data', 'PL', 'Cota', 'Δ Cota', 'Ativos', 'Caixa', 'PDD'].map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'Data' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            carteiras.slice().reverse().map((c, i, arr) => {
              const prev = i < arr.length - 1 ? arr[i + 1] : null;
              const cotaChg = prev && prev.fund.valorcota > 0 ? ((c.fund.valorcota / prev.fund.valorcota) - 1) * 100 : null;
              return h('tr', {
                style: { borderTop: '1px solid var(--border)', cursor: 'pointer' },
                onClick: () => { state._bo_date = c.fund.dtposicao; state._bo_tab = 'carteira'; render(); },
              }, [
                h('td', { class: 'mono', style: { padding: '6px 12px', fontWeight: '500', color: 'var(--amber)' } }, c.fund.dtposicao),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, formatBRL(c.fund.patliq)),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, c.fund.valorcota ? `R$ ${c.fund.valorcota.toFixed(6)}` : '—'),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: cotaChg > 0 ? 'var(--green)' : cotaChg < 0 ? 'var(--red)' : 'var(--text-faint)' } },
                  cotaChg != null ? `${cotaChg >= 0 ? '+' : ''}${cotaChg.toFixed(4)}%` : '—'),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, String(c.stats.totalAtivos)),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, formatBRL(c.stats.totalCaixa)),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: c.stats.pddTotal > 0 ? 'var(--red)' : 'var(--text-faint)' } }, c.stats.pddTotal > 0 ? formatBRL(c.stats.pddTotal) : '—'),
              ]);
            })
          ),
        ]),
      ]),
    ]),
  ]);
}

/* ---------- Panorama Chart (simple line/area) ---------- */

function renderPanoramaChart(title, series, unit, color, showZeroLine) {
  if (!series || series.length < 2) return h('div', { class: 'card', style: { padding: '20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px' } }, `${title}: dados insuficientes`);

  const w = 440, ht = 180, pad = { l: 65, r: 15, t: 15, b: 30 };
  const plotW = w - pad.l - pad.r, plotH = ht - pad.t - pad.b;

  const vals = series.map(d => d.value);
  let minVal = Math.min(...vals);
  let maxVal = Math.max(...vals);
  if (showZeroLine) { minVal = Math.min(minVal, 0); maxVal = Math.max(maxVal, 0); }
  const range = maxVal - minVal || 1;
  minVal -= range * 0.05;
  maxVal += range * 0.05;
  const rangeAdj = maxVal - minVal;

  const xFor = (i) => pad.l + (i / Math.max(1, series.length - 1)) * plotW;
  const yFor = (v) => pad.t + plotH - ((v - minVal) / rangeAdj) * plotH;

  let svg = '';
  // Grid
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (g / 4) * plotH;
    const val = maxVal - (g / 4) * rangeAdj;
    svg += `<line x1="${pad.l}" x2="${w-pad.r}" y1="${y}" y2="${y}" stroke="var(--border)" stroke-width="0.5" opacity="0.4"/>`;
    const label = unit === 'R$' ? (Math.abs(val) >= 1e9 ? (val/1e9).toFixed(1) + 'B' : Math.abs(val) >= 1e6 ? (val/1e6).toFixed(1) + 'M' : Math.abs(val) >= 1e3 ? (val/1e3).toFixed(0) + 'k' : val.toFixed(2)) : val.toFixed(unit === '%' ? 2 : 0);
    svg += `<text x="${pad.l-6}" y="${y+4}" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="8" fill="var(--text-faint)">${label}</text>`;
  }
  // Zero line
  if (showZeroLine && minVal < 0 && maxVal > 0) {
    const zy = yFor(0);
    svg += `<line x1="${pad.l}" x2="${w-pad.r}" y1="${zy}" y2="${zy}" stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="4,3"/>`;
  }
  // X labels
  const labelCount = Math.min(6, series.length);
  for (let l = 0; l < labelCount; l++) {
    const idx = Math.round(l * (series.length - 1) / Math.max(1, labelCount - 1));
    svg += `<text x="${xFor(idx)}" y="${ht-6}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="var(--text-faint)">${series[idx].date.substring(5)}</text>`;
  }
  // Area + line
  const path = series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.value).toFixed(1)}`).join(' ');
  const baseY = showZeroLine && minVal < 0 ? yFor(0) : yFor(minVal);
  const area = `${path} L ${xFor(series.length-1).toFixed(1)} ${baseY.toFixed(1)} L ${xFor(0).toFixed(1)} ${baseY.toFixed(1)} Z`;
  svg += `<path d="${area}" fill="${color}" opacity="0.12"/>`;
  svg += `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
  // Last point
  const last = series[series.length - 1];
  svg += `<circle cx="${xFor(series.length-1).toFixed(1)}" cy="${yFor(last.value).toFixed(1)}" r="3" fill="${color}"/>`;

  const lastLabel = unit === 'R$' ? formatBRL(last.value) : unit === '%' ? `${last.value.toFixed(2)}%` : last.value.toFixed(0);

  return h('div', { class: 'card', style: { padding: '14px' } }, [
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, title),
      h('div', { class: 'mono', style: { fontSize: '13px', fontWeight: '600', color } }, lastLabel),
    ]),
    h('div', { html: `<svg viewBox="0 0 ${w} ${ht}" style="width:100%;display:block">${svg}</svg>` }),
  ]);
}

function renderCarteiraResumo(parsed, fund) {
  const { stats } = parsed;
  const f = parsed.fund;
  const pl = f.patliq || 1;
  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('PL', f.patliq ? formatBRL(f.patliq) : '—', ''),
      renderPortKPI('Valor Cota', f.valorcota ? `R$ ${f.valorcota.toFixed(6)}` : '—', ''),
      renderPortKPI('Qtd Cotas', f.quantidade ? Math.round(f.quantidade).toLocaleString('pt-BR') : '—', ''),
      renderPortKPI('Valor Ativos', f.valorativos ? formatBRL(f.valorativos) : '—', ''),
      renderPortKPI('A Receber', f.valorreceber ? formatBRL(f.valorreceber) : '—', ''),
      renderPortKPI('A Pagar', f.valorpagar ? formatBRL(f.valorpagar) : '—', ''),
      renderPortKPI('Total Posições', String(stats.totalAtivos),
        [stats.posAcoes && `${stats.posAcoes} ações`, stats.posTitPrivado && `${stats.posTitPrivado} tít.priv.`, stats.posTitPublico && `${stats.posTitPublico} tít.púb.`, stats.posCotas && `${stats.posCotas} cotas`, stats.posImoveis && `${stats.posImoveis} imóv.`].filter(Boolean).join(' · ')),
      renderPortKPI('PDD', stats.pddTotal > 0 ? formatBRL(stats.pddTotal) : 'R$ 0', ''),
      renderPortKPI('Caixa', formatBRL(stats.totalCaixa), ''),
      stats.totalImoveis > 0 && renderPortKPI('Imóveis', formatBRL(stats.totalImoveis), `${stats.posImoveis} imóvel(is)`),
    ].filter(Boolean)),

    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } }, [
      renderAllocationChart('Por Tipo de Ativo', (() => {
        const d = {};
        const addPct = (key, arr, valFn) => { const v = arr.reduce((a, p) => a + (valFn(p) || 0), 0); if (v > 0) d[key] = { weight: v / pl * 100, count: arr.length }; };
        addPct('acoes', parsed.positions.acoes, p => p.valorfindisp);
        addPct('titprivado', parsed.positions.titprivado, p => p.valorfindisp);
        addPct('titpublico', parsed.positions.titpublico || [], p => p.valorfindisp);
        addPct('cotas', parsed.positions.cotas, p => p.valorfindisp || ((p.qtdisponivel||0) * (p.puposicao||0)));
        if (stats.totalImoveis > 0) d.imoveis = { weight: stats.totalImoveis / pl * 100, count: stats.posImoveis };
        if (stats.totalCaixa > 0) d.caixa = { weight: stats.totalCaixa / pl * 100, count: 1 };
        return d;
      })(), {
        acoes: { label: 'Ações/FIIs', color: '#4a7a2c' }, titprivado: { label: 'Tít. Privados', color: '#b8863c' },
        titpublico: { label: 'Tít. Públicos', color: '#3a6a9a' }, cotas: { label: 'Cotas Fundos', color: '#7a4a8a' },
        imoveis: { label: 'Imóveis', color: '#d4a574' }, caixa: { label: 'Caixa', color: '#9a958c' },
      }),
      (stats.posTitPrivado > 0 || stats.posTitPublico > 0) && (() => {
        const byIdx = {};
        for (const p of [...(parsed.positions.titprivado || []), ...(parsed.positions.titpublico || [])]) {
          const idx = p.indexador || 'Outros';
          if (!byIdx[idx]) byIdx[idx] = { weight: 0, count: 0 };
          byIdx[idx].weight += (p.valorfindisp || 0) / pl * 100;
          byIdx[idx].count++;
        }
        return renderAllocationChart('Por Indexador', byIdx, {});
      })(),
    ].filter(Boolean)),
  ]);
}

function renderCarteiraXMLDetail(parsed, fund) {
  const positions = parsed.positions || {};
  const acoes = positions.acoes || [];
  const titprivado = positions.titprivado || [];
  const titpublico = positions.titpublico || [];
  const cotas = positions.cotas || [];
  const caixa = positions.caixa || [];
  const imoveis = positions.imoveis || [];
  const pl = parsed.fund.patliq || 1;

  // Get previous carteira for MoM comparison
  const carteiras = getCarteirasXML(fund.cnpj);
  const currIdx = carteiras.findIndex(c => c.fund.dtposicao === parsed.fund.dtposicao);
  const prevCarteira = currIdx > 0 ? carteiras[currIdx - 1] : null;
  const prevPositions = prevCarteira?.positions || {};
  const prevMap = {};
  for (const p of [...(prevPositions.acoes || []), ...(prevPositions.titprivado || []), ...(prevPositions.titpublico || []), ...(prevPositions.cotas || [])]) {
    prevMap[p.codativo || p.isin || p.cnpjfundo || ''] = p;
  }

  return h('div', {}, [
    prevCarteira && h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginBottom: '12px', fontStyle: 'italic' } },
      `Δ em relação a ${prevCarteira.fund.dtposicao}`),

    // Ações / FIIs
    acoes.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Ações / FIIs (${acoes.length})`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Ticker', 'Qtd', 'PU', 'Valor (R$)', '% PL', 'Prov.', prevCarteira && 'Δ Valor'].filter(Boolean).map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'Ticker' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            acoes
              .sort((a, b) => (b.valorfindisp || 0) - (a.valorfindisp || 0))
              .map(p => {
                const prev = prevMap[p.codativo || p.isin || ''];
                const delta = prev ? (p.valorfindisp || 0) - (prev.valorfindisp || 0) : null;
                const isNew = !prev && prevCarteira;
                return h('tr', { style: { borderTop: '1px solid var(--border)', background: isNew ? 'rgba(74,122,44,0.05)' : 'transparent' } }, [
                  h('td', { class: 'mono', style: { padding: '6px 12px', fontWeight: '600', color: 'var(--amber)' } }, `${p.codativo}${isNew ? ' 🆕' : ''}`),
                  h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, (p.qtdisponivel || 0).toLocaleString('pt-BR')),
                  h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, `R$ ${(p.puposicao || 0).toFixed(2)}`),
                  h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, formatBRL(p.valorfindisp)),
                  h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, `${((p.valorfindisp || 0) / pl * 100).toFixed(2)}%`),
                  h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: p.percprovcred > 0 ? 'var(--red)' : 'var(--text-faint)' } }, `${(p.percprovcred || 0).toFixed(1)}%`),
                  prevCarteira && h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-faint)', fontSize: '10px' } },
                    isNew ? 'NOVO' : delta != null ? `${delta >= 0 ? '+' : ''}${formatBRL(delta)}` : '—'),
                ].filter(Boolean));
              })
          ),
        ]),
      ]),
    ]),

    // Títulos Privados (CRI, CCI, etc.)
    titprivado.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Títulos Privados (${titprivado.length})`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Código', 'Indexador', 'Cupom', 'Vencimento', 'PU', 'Valor', '% PL', 'PDD', 'Risco', prevCarteira && 'Δ Valor'].filter(Boolean).map(col =>
              h('th', { style: { padding: '7px 10px', textAlign: col === 'Código' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            titprivado
              .sort((a, b) => (b.valorfindisp || 0) - (a.valorfindisp || 0))
              .map(p => {
                const prev = prevMap[p.codativo || p.isin || ''];
                const delta = prev ? (p.valorfindisp || 0) - (prev.valorfindisp || 0) : null;
                const isNew = !prev && prevCarteira;
                return h('tr', { style: { borderTop: '1px solid var(--border)', background: isNew ? 'rgba(74,122,44,0.05)' : 'transparent' } }, [
                  h('td', { class: 'mono', style: { padding: '6px 10px', fontWeight: '600', color: 'var(--amber)', fontSize: '10px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' } }, `${p.codativo}${isNew ? ' 🆕' : ''}`),
                  h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, `${p.indexador || '—'} ${p.percindex ? p.percindex + '%' : ''}`),
                  h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, p.coupom ? `${p.coupom.toFixed(2)}%` : '—'),
                  h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)' } }, p.dtvencimento || '—'),
                  h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, `R$ ${(p.puposicao || 0).toFixed(2)}`),
                  h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontWeight: '500' } }, formatBRL(p.valorfindisp)),
                  h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)' } }, `${((p.valorfindisp || 0) / pl * 100).toFixed(2)}%`),
                  h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: p.percprovcred > 0 ? 'var(--red)' : 'var(--text-faint)' } }, `${(p.percprovcred || 0).toFixed(1)}%`),
                  h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontSize: '9px' } }, p.nivelrsc || '—'),
                  prevCarteira && h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-faint)', fontSize: '10px' } },
                    isNew ? 'NOVO' : delta != null ? `${delta >= 0 ? '+' : ''}${formatBRL(delta)}` : '—'),
                ].filter(Boolean));
              })
          ),
        ]),
      ]),
    ]),

    // Cotas de fundos
    cotas.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Cotas de Fundos (${cotas.length})`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['CNPJ Fundo', 'Qtd', 'PU', 'Valor (R$)', '% PL', 'Zeragem'].map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'CNPJ Fundo' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            cotas.map(p => {
              const val = p.valorfindisp || ((p.qtdisponivel || 0) * (p.puposicao || 0));
              const isZeragem = isZeragemFund(p.cnpjfundo || p.isin);
              return h('tr', { style: { borderTop: '1px solid var(--border)', background: isZeragem ? 'rgba(58,106,154,0.05)' : 'transparent' } }, [
                h('td', { class: 'mono', style: { padding: '6px 12px', fontSize: '11px' } }, p.cnpjfundo || p.isin || '—'),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, (p.qtdisponivel || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, `R$ ${(p.puposicao || 0).toFixed(6)}`),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, formatBRL(val)),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, `${(val / pl * 100).toFixed(2)}%`),
                h('td', { style: { padding: '6px 12px', textAlign: 'right' } }, [
                  h('button', {
                    class: 'mono', style: { fontSize: '9px', padding: '2px 6px', border: `1px solid ${isZeragem ? 'var(--blue)' : 'var(--border)'}`, color: isZeragem ? 'var(--blue)' : 'var(--text-faint)', background: 'none', cursor: 'pointer', borderRadius: '3px' },
                    onClick: (e) => { e.stopPropagation(); toggleZeragem(p.cnpjfundo || p.isin); render(); },
                  }, isZeragem ? '💧 Zeragem' : 'Marcar'),
                ]),
              ]);
            })
          ),
        ]),
      ]),
    ]),

    // Caixa
    caixa.length > 0 && caixa.some(c => c.saldo > 0) && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Caixa'),
      h('div', { class: 'card', style: { padding: '16px' } },
        caixa.filter(c => c.saldo > 0).map(c =>
          h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } }, [
            h('span', { class: 'mono', style: { fontSize: '11px' } }, c.isininstituicao || '—'),
            h('span', { class: 'mono', style: { fontWeight: '500' } }, formatBRL(c.saldo)),
          ])
        )
      ),
    ]),

    // Liquidez imediata (caixa + zeragem)
    (() => {
      const zeragemVal = cotas.filter(p => isZeragemFund(p.cnpjfundo || p.isin)).reduce((a, p) => a + (p.valorfindisp || ((p.qtdisponivel||0)*(p.puposicao||0))), 0);
      const caixaVal = caixa.reduce((a, c) => a + (c.saldo || 0), 0);
      const totalLiquidez = caixaVal + zeragemVal;
      if (zeragemVal > 0) return h('div', { style: { marginBottom: '24px' } }, [
        h('div', { class: 'macro-section-subhead' }, 'Liquidez Imediata'),
        h('div', { class: 'card', style: { padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
          h('div', {}, [
            h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Caixa + Fundos de Zeragem'),
            h('div', { style: { display: 'flex', gap: '16px', marginTop: '4px' } }, [
              h('span', { class: 'mono', style: { fontSize: '11px' } }, `Caixa: ${formatBRL(caixaVal)}`),
              h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--blue)' } }, `Zeragem: ${formatBRL(zeragemVal)}`),
            ]),
          ]),
          h('div', { style: { textAlign: 'right' } }, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', color: 'var(--green)' } }, formatBRL(totalLiquidez)),
            h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, `${(totalLiquidez / pl * 100).toFixed(2)}% PL`),
          ]),
        ]),
      ]);
      return null;
    })(),

    // Títulos Públicos
    titpublico.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Títulos Públicos (${titpublico.length})`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Código', 'Indexador', 'Cupom', 'Vencimento', 'Qtd', 'PU', 'Valor (R$)', '% PL'].map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'Código' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            titpublico.sort((a, b) => (b.valorfindisp || 0) - (a.valorfindisp || 0)).map(p =>
              h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                h('td', { class: 'mono', style: { padding: '6px 12px', fontWeight: '600', color: 'var(--blue)' } }, p.codativo),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, `${p.indexador || '—'}`),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, p.coupom ? `${p.coupom.toFixed(2)}%` : '—'),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, p.dtvencimento || '—'),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, (p.qtdisponivel || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, `R$ ${(p.puposicao || 0).toFixed(2)}`),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, formatBRL(p.valorfindisp)),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, `${((p.valorfindisp || 0) / pl * 100).toFixed(2)}%`),
              ])
            )
          ),
        ]),
      ]),
    ]),

    // Imóveis
    imoveis.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Imóveis (${imoveis.length})`),
      ...imoveis.map(im => {
        const TIPO_IMOVEL = { '1': 'Terreno', '2': 'Prédio/Edifício', '3': 'Sala/Conjunto', '4': 'Loja', '5': 'Galpão/Depósito', '6': 'Hotel', '7': 'Hospital', '8': 'Garagem', '9': 'Shopping Center', '10': 'Residencial', '11': 'Outros' };
        const TIPO_USO = { '01': 'Alugado', '02': 'Para Renda', '03': 'Remodelação/Construção', '04': 'Vago', '05': 'Usufruto' };
        return h('div', { class: 'card', style: { marginBottom: '10px', borderLeft: '3px solid #d4a574', padding: '16px 20px' } }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } }, [
            h('div', {}, [
              h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px' } }, im.nomecomercial || 'Imóvel sem nome'),
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '3px' } },
                `${im.logradouro || ''}${im.numero ? ', ' + im.numero : ''} · ${im.cidade || ''}/${im.estado || ''} · CEP ${im.cep || '—'}`),
            ]),
            h('div', { style: { textAlign: 'right' } }, [
              h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px', color: 'var(--amber)' } }, formatBRL(im.valorcontabil)),
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, `${((im.valorcontabil || 0) / pl * 100).toFixed(2)}% PL`),
            ]),
          ]),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginTop: '12px' } }, [
            h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Tipo'), h('div', { class: 'mono', style: { fontSize: '11px' } }, TIPO_IMOVEL[im.tipoimovel] || im.tipoimovel || '—') ]),
            h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Uso'), h('div', { class: 'mono', style: { fontSize: '11px' } }, TIPO_USO[im.tipouso] || im.tipouso || '—') ]),
            h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Participação'), h('div', { class: 'mono', style: { fontSize: '11px' } }, im.percpart ? `${im.percpart}%` : '—') ]),
            h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Matrícula'), h('div', { class: 'mono', style: { fontSize: '11px' } }, im.matricula || '—') ]),
            im.valoravaliacao > 0 && h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Avaliação'), h('div', { class: 'mono', style: { fontSize: '11px' } }, formatBRL(im.valoravaliacao)) ]),
            h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Aluguel'), h('div', { class: 'mono', style: { fontSize: '11px' } }, im.aluguelcontratado > 0 ? formatBRL(im.aluguelcontratado) : '—') ]),
            im.aluguelatrasado > 0 && h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--red)', textTransform: 'uppercase' } }, 'Aluguel Atrasado'), h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--red)' } }, formatBRL(im.aluguelatrasado)) ]),
            h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Questão Jurídica'), h('div', { class: 'mono', style: { fontSize: '11px', color: im.questjur === 'S' ? 'var(--red)' : 'var(--green)' } }, im.questjur === 'S' ? 'Sim' : 'Não') ]),
          ].filter(Boolean)),
        ]);
      }),
    ]),
  ]);
}

/* ---------- Imóveis Tab ---------- */

function renderCarteiraImoveis(parsed) {
  const imoveis = parsed?.positions?.imoveis || [];
  const pl = parsed?.fund?.patliq || 1;
  if (imoveis.length === 0) {
    return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Nenhum imóvel registrado nesta carteira.');
  }
  const totalContabil = imoveis.reduce((a, im) => a + (im.valorcontabil || 0), 0);
  const totalAvaliacao = imoveis.reduce((a, im) => a + (im.valoravaliacao || 0), 0);
  const totalAluguel = imoveis.reduce((a, im) => a + (im.aluguelcontratado || 0), 0);
  const totalAtrasado = imoveis.reduce((a, im) => a + (im.aluguelatrasado || 0), 0);

  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('Imóveis', String(imoveis.length), ''),
      renderPortKPI('Valor Contábil', formatBRL(totalContabil), `${(totalContabil / pl * 100).toFixed(1)}% PL`),
      totalAvaliacao > 0 && renderPortKPI('Valor Avaliação', formatBRL(totalAvaliacao), ''),
      totalAluguel > 0 && renderPortKPI('Aluguel Total', formatBRL(totalAluguel), '/mês'),
      totalAtrasado > 0 && renderPortKPI('Aluguéis Atrasados', formatBRL(totalAtrasado), ''),
    ].filter(Boolean)),

    ...imoveis.map(im => {
      const TIPO_IMOVEL = { '1': 'Terreno', '2': 'Edifício', '3': 'Sala/Conjunto', '4': 'Loja', '5': 'Galpão', '6': 'Hotel', '7': 'Hospital', '8': 'Garagem', '9': 'Shopping', '10': 'Residencial', '11': 'Outros' };
      const TIPO_USO = { '01': 'Alugado', '02': 'Para Renda', '03': 'Construção', '04': 'Vago', '05': 'Usufruto' };
      return h('div', { class: 'card', style: { marginBottom: '12px', borderLeft: '3px solid #d4a574', padding: '18px 22px' } }, [
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' } }, [
          h('div', {}, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '17px' } }, im.nomecomercial || 'Imóvel'),
            h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' } },
              `${im.logradouro || ''}${im.numero ? ', ' + im.numero : ''}${im.complemento ? ' — ' + im.complemento : ''}`),
            h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } },
              `${im.cidade || ''}/${im.estado || ''} · CEP ${im.cep || '—'}`),
          ]),
          h('div', { style: { textAlign: 'right' } }, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', color: 'var(--amber)' } }, formatBRL(im.valorcontabil)),
            h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, `${((im.valorcontabil || 0) / pl * 100).toFixed(2)}% PL`),
          ]),
        ]),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' } }, [
          h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Tipo'), h('div', { style: { fontSize: '13px' } }, TIPO_IMOVEL[im.tipoimovel] || '—') ]),
          h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Uso'), h('div', { style: { fontSize: '13px' } }, TIPO_USO[im.tipouso] || '—') ]),
          h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Participação'), h('div', { style: { fontSize: '13px' } }, im.percpart ? `${im.percpart}%` : '—') ]),
          h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Matrícula'), h('div', { class: 'mono', style: { fontSize: '13px' } }, im.matricula || '—') ]),
          im.valoravaliacao > 0 && h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Avaliação'), h('div', { style: { fontSize: '13px' } }, formatBRL(im.valoravaliacao)) ]),
          h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Aluguel Contratado'), h('div', { style: { fontSize: '13px' } }, im.aluguelcontratado > 0 ? formatBRL(im.aluguelcontratado) : 'Sem aluguel') ]),
          im.aluguelatrasado > 0 && h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--red)', textTransform: 'uppercase' } }, 'Aluguel Atrasado'), h('div', { style: { fontSize: '13px', color: 'var(--red)' } }, formatBRL(im.aluguelatrasado)) ]),
          h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Opção Recompra'), h('div', { style: { fontSize: '13px' } }, im.opcaorecompra === 'S' ? 'Sim' : 'Não') ]),
          h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: im.questjur === 'S' ? 'var(--red)' : 'var(--text-faint)', textTransform: 'uppercase' } }, 'Questão Jurídica'), h('div', { style: { fontSize: '13px', color: im.questjur === 'S' ? 'var(--red)' : 'var(--green)' } }, im.questjur === 'S' ? `Sim — ${im.motivoquestjur || ''}` : 'Não') ]),
        ].filter(Boolean)),
      ]);
    }),
  ]);
}

function renderCarteiraProvisoes(parsed) {
  const { provisoes } = parsed;
  if (!provisoes || provisoes.length === 0) {
    return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Sem provisões registradas.');
  }

  // Get previous carteira for comparison
  const fund = getFunds().find(f => f.cnpj === parsed.fund.cnpj);
  const carteiras = fund ? getCarteirasXML(fund.cnpj) : [];
  const currIdx = carteiras.findIndex(c => c.fund.dtposicao === parsed.fund.dtposicao);
  const prevCarteira = currIdx > 0 ? carteiras[currIdx - 1] : null;
  const prevProvisoes = prevCarteira?.provisoes || [];

  // Compare
  const prevMap = {};
  for (const p of prevProvisoes) prevMap[`${p.codprov}_${p.dt}_${p.credeb}`] = p;
  const currMap = {};
  for (const p of provisoes) currMap[`${p.codprov}_${p.dt}_${p.credeb}`] = p;

  const newProvs = provisoes.filter(p => !prevMap[`${p.codprov}_${p.dt}_${p.credeb}`]);
  const removedProvs = prevProvisoes.filter(p => !currMap[`${p.codprov}_${p.dt}_${p.credeb}`]);

  const PROV_CODES = {
    '2': 'Taxa de Administração', '5': 'Taxa de Performance', '8': 'Taxa de Custódia',
    '14': 'Auditoria', '19': 'Outros Serviços', '34': 'Distribuição',
    '999': 'Outras Provisões',
  };

  const total = provisoes.reduce((a, p) => a + (p.valor || 0), 0);

  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, `Provisões (${provisoes.length}) · Total: ${formatBRL(total)}`),

    // MoM changes
    prevCarteira && (newProvs.length > 0 || removedProvs.length > 0) && h('div', { style: { marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginBottom: '8px', fontStyle: 'italic' } },
        `Comparação vs ${prevCarteira.fund.dtposicao}`),
      h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } }, [
        newProvs.length > 0 && h('div', { class: 'card', style: { padding: '10px 14px', borderLeft: '3px solid var(--green)', flex: '1', minWidth: '200px' } }, [
          h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--green)', textTransform: 'uppercase', marginBottom: '6px' } }, `${newProvs.length} nova(s) provisão(ões)`),
          ...newProvs.slice(0, 5).map(p => h('div', { class: 'mono', style: { fontSize: '10px', display: 'flex', justifyContent: 'space-between', padding: '2px 0' } }, [
            h('span', {}, PROV_CODES[p.codprov] || `Cod ${p.codprov}`),
            h('span', { style: { color: 'var(--green)' } }, formatBRL(p.valor)),
          ])),
        ]),
        removedProvs.length > 0 && h('div', { class: 'card', style: { padding: '10px 14px', borderLeft: '3px solid var(--red)', flex: '1', minWidth: '200px' } }, [
          h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--red)', textTransform: 'uppercase', marginBottom: '6px' } }, `${removedProvs.length} provisão(ões) removida(s)`),
          ...removedProvs.slice(0, 5).map(p => h('div', { class: 'mono', style: { fontSize: '10px', display: 'flex', justifyContent: 'space-between', padding: '2px 0' } }, [
            h('span', {}, PROV_CODES[p.codprov] || `Cod ${p.codprov}`),
            h('span', { style: { color: 'var(--red)' } }, formatBRL(p.valor)),
          ])),
        ]),
      ].filter(Boolean)),
    ]),

    h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
        h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
          ['Código', 'Descrição', 'D/C', 'Data', 'Valor', 'Status'].map(col =>
            h('th', { style: { padding: '8px 12px', textAlign: col === 'Descrição' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
          )
        )),
        h('tbody', {},
          provisoes.sort((a, b) => (b.valor || 0) - (a.valor || 0)).map(p => {
            const isNew = prevCarteira && newProvs.includes(p);
            return h('tr', { style: { borderTop: '1px solid var(--border)', background: isNew ? 'rgba(74,122,44,0.05)' : 'transparent' } }, [
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, p.codprov),
              h('td', { style: { padding: '6px 12px' } }, PROV_CODES[p.codprov] || `Provisão ${p.codprov}`),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: p.credeb === 'D' ? 'var(--red)' : 'var(--green)' } }, p.credeb),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, p.dt || '—'),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, formatBRL(p.valor)),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontSize: '9px', color: isNew ? 'var(--green)' : 'var(--text-faint)' } }, isNew ? '🆕 NOVA' : ''),
            ]);
          })
        ),
      ]),
    ]),
  ]);
}

/* ============================================================
   36. PRODUCT ANALYSIS — FIDC Viability (iframe wrapper)
   ============================================================ */

function renderProductAnalysis() {
  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Product Analysis', 'Estudo de <em>Viabilidade</em>',
      'Simulador de viabilidade de novos fundos FIDC. Modelo completo com projeção de PL, custos, taxas, break-even e cenários.'),
    h('div', { style: { border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', height: 'calc(100vh - 200px)' } }, [
      h('iframe', {
        src: '/viabilidade.html',
        style: { width: '100%', height: '100%', border: 'none' },
        title: 'FIDC Viabilidade',
      }),
    ]),
  ]);
}

/* ============================================================
   37b. REAL ESTATE PORTFOLIO — Consolidated real estate view
   Pulls imóveis from all fund XML carteiras
   ============================================================ */

function renderRealEstatePortfolio() {
  const funds = getFunds();
  const allImoveis = [];

  for (const fund of funds) {
    const carteiras = getCarteirasXML(fund.cnpj);
    if (carteiras.length === 0) continue;
    const latest = carteiras[carteiras.length - 1];
    const imoveis = latest.positions?.imoveis || [];
    for (const im of imoveis) {
      allImoveis.push({
        ...im,
        fundName: fund.name,
        fundCnpj: fund.cnpj,
        dtposicao: latest.fund.dtposicao,
        plFundo: latest.fund.patliq,
      });
    }
  }

  // Aggregates
  const totalContabil = allImoveis.reduce((a, im) => a + (im.valorcontabil || 0), 0);
  const totalAvaliacao = allImoveis.reduce((a, im) => a + (im.valoravaliacao || 0), 0);
  const totalAluguel = allImoveis.reduce((a, im) => a + (im.aluguelcontratado || 0), 0);
  const totalAtrasado = allImoveis.reduce((a, im) => a + (im.aluguelatrasado || 0), 0);
  const capRate = totalContabil > 0 ? (totalAluguel * 12 / totalContabil) * 100 : 0;
  const inadimPct = totalAluguel > 0 ? (totalAtrasado / totalAluguel) * 100 : 0;
  const questJurCount = allImoveis.filter(im => im.questjur === 'S').length;

  const TIPO_IMOVEL = { '1': 'Terreno', '2': 'Edifício', '3': 'Sala/Conjunto', '4': 'Loja', '5': 'Galpão', '6': 'Hotel', '7': 'Hospital', '8': 'Garagem', '9': 'Shopping', '10': 'Residencial', '11': 'Outros' };
  const TIPO_USO = { '01': 'Alugado', '02': 'Para Renda', '03': 'Construção', '04': 'Vago', '05': 'Usufruto' };

  // By type
  const byTipo = {};
  const byUso = {};
  const byCidade = {};
  const byFundo = {};
  for (const im of allImoveis) {
    const tp = TIPO_IMOVEL[im.tipoimovel] || 'Outros';
    if (!byTipo[tp]) byTipo[tp] = { weight: 0, count: 0 };
    byTipo[tp].weight += (im.valorcontabil || 0);
    byTipo[tp].count++;

    const uso = TIPO_USO[im.tipouso] || 'Outros';
    if (!byUso[uso]) byUso[uso] = { weight: 0, count: 0 };
    byUso[uso].weight += (im.valorcontabil || 0);
    byUso[uso].count++;

    const cidade = `${im.cidade || '?'}/${im.estado || '?'}`;
    if (!byCidade[cidade]) byCidade[cidade] = { weight: 0, count: 0 };
    byCidade[cidade].weight += (im.valorcontabil || 0);
    byCidade[cidade].count++;

    const fn = im.fundName || '?';
    if (!byFundo[fn]) byFundo[fn] = { weight: 0, count: 0 };
    byFundo[fn].weight += (im.valorcontabil || 0);
    byFundo[fn].count++;
  }

  // Convert to %
  const toPct = (map) => { const res = {}; for (const [k, v] of Object.entries(map)) res[k] = { weight: totalContabil > 0 ? (v.weight / totalContabil) * 100 : 0, count: v.count }; return res; };

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Real Estate Portfolio', 'Real Estate <em>Portfolio</em>',
      `Visão consolidada de todos os imóveis da gestora. ${allImoveis.length} imóvel(is) em ${Object.keys(byFundo).length} fundo(s).`),

    allImoveis.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum imóvel encontrado'),
          h('p', { class: 'empty-desc' }, 'Faça upload de XMLs CVM de FIIs de tijolo em Fundos para que os imóveis apareçam aqui automaticamente. Se já fez upload antes de esta funcionalidade existir, recarregue os XMLs.'),
          h('button', { class: 'btn-primary', onClick: () => setView('am_funds') }, 'Ir para Fundos'),
        ])
      : h('div', {}, [
          // KPIs
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
            renderPortKPI('Imóveis', String(allImoveis.length), `${Object.keys(byFundo).length} fundo(s)`),
            renderPortKPI('Valor Contábil', formatBRL(totalContabil), ''),
            totalAvaliacao > 0 && renderPortKPI('Valor Avaliação', formatBRL(totalAvaliacao), ''),
            totalAluguel > 0 && renderPortKPI('Aluguel Mensal', formatBRL(totalAluguel), `Cap Rate: ${capRate.toFixed(2)}%`),
            totalAtrasado > 0 && renderPortKPI('Inadimplência', formatBRL(totalAtrasado), `${inadimPct.toFixed(1)}%`),
            questJurCount > 0 && renderPortKPI('Questões Jurídicas', String(questJurCount), ''),
          ].filter(Boolean)),

          // Charts
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' } }, [
            Object.keys(byTipo).length > 1 && renderAllocationChart('Por Tipo', toPct(byTipo), {}),
            Object.keys(byUso).length > 1 && renderAllocationChart('Por Uso', toPct(byUso), {}),
            Object.keys(byCidade).length > 1 && renderAllocationChart('Por Cidade', toPct(byCidade), {}),
          ].filter(Boolean)),

          // Imóvel cards
          h('div', { class: 'macro-section-subhead' }, `Imóveis (${allImoveis.length})`),
          ...allImoveis.sort((a, b) => (b.valorcontabil || 0) - (a.valorcontabil || 0)).map(im => {
            const plPct = im.plFundo > 0 ? ((im.valorcontabil || 0) / im.plFundo * 100) : 0;
            const imCapRate = im.valorcontabil > 0 && im.aluguelcontratado > 0 ? (im.aluguelcontratado * 12 / im.valorcontabil * 100) : 0;
            return h('div', { class: 'card', style: { marginBottom: '12px', borderLeft: '3px solid #d4a574', padding: '18px 22px' } }, [
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' } }, [
                h('div', {}, [
                  h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '17px' } }, im.nomecomercial || 'Imóvel'),
                  h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '3px' } },
                    `${im.logradouro || ''}${im.numero ? ', ' + im.numero : ''}${im.complemento ? ' — ' + im.complemento : ''} · ${im.cidade || ''}/${im.estado || ''}`),
                  h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--amber)', marginTop: '2px' } },
                    `Fundo: ${im.fundName} · Carteira: ${im.dtposicao}`),
                ]),
                h('div', { style: { textAlign: 'right' } }, [
                  h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', color: 'var(--amber)' } }, formatBRL(im.valorcontabil)),
                  h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, `${plPct.toFixed(1)}% PL do fundo`),
                ]),
              ]),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' } }, [
                h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Tipo'), h('div', { style: { fontSize: '12px' } }, TIPO_IMOVEL[im.tipoimovel] || '—') ]),
                h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Uso'), h('div', { style: { fontSize: '12px' } }, TIPO_USO[im.tipouso] || '—') ]),
                h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Participação'), h('div', { style: { fontSize: '12px' } }, im.percpart ? `${im.percpart}%` : '—') ]),
                h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Matrícula'), h('div', { class: 'mono', style: { fontSize: '12px' } }, im.matricula || '—') ]),
                im.valoravaliacao > 0 && h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Avaliação'), h('div', { style: { fontSize: '12px' } }, formatBRL(im.valoravaliacao)) ]),
                h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Aluguel'), h('div', { style: { fontSize: '12px' } }, im.aluguelcontratado > 0 ? `${formatBRL(im.aluguelcontratado)}/mês` : 'Sem aluguel') ]),
                imCapRate > 0 && h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Cap Rate'), h('div', { style: { fontSize: '12px' } }, `${imCapRate.toFixed(2)}%`) ]),
                im.aluguelatrasado > 0 && h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--red)', textTransform: 'uppercase' } }, 'Aluguel Atrasado'), h('div', { style: { fontSize: '12px', color: 'var(--red)' } }, formatBRL(im.aluguelatrasado)) ]),
                h('div', {}, [ h('div', { class: 'mono', style: { fontSize: '8px', color: im.questjur === 'S' ? 'var(--red)' : 'var(--text-faint)', textTransform: 'uppercase' } }, 'Questão Jurídica'), h('div', { style: { fontSize: '12px', color: im.questjur === 'S' ? 'var(--red)' : 'var(--green)' } }, im.questjur === 'S' ? `Sim — ${im.motivoquestjur || ''}` : 'Não') ]),
              ].filter(Boolean)),
            ]);
          }),
        ]),
  ]);
}

/* ============================================================
   37. CREDIT PORTFOLIO — Consolidated credit assets view
   Pulls CRI/CCI/debêntures from all fund XML carteiras
   ============================================================ */

function renderCreditPortfolio() {
  const funds = getFunds();
  const allCredits = [];

  // Collect all credit assets from latest carteira of each fund
  for (const fund of funds) {
    const carteiras = getCarteirasXML(fund.cnpj);
    if (carteiras.length === 0) continue;
    const latest = carteiras[carteiras.length - 1];
    for (const tp of latest.positions.titprivado) {
      allCredits.push({
        ...tp,
        fundName: fund.name,
        fundCnpj: fund.cnpj,
        fundClassification: fund.classification,
        dtposicao: latest.fund.dtposicao,
        plFundo: latest.fund.patliq,
      });
    }
  }

  // Aggregate stats
  const totalValor = allCredits.reduce((a, c) => a + (c.valorfindisp || 0), 0);
  const totalPDD = allCredits.reduce((a, c) => {
    if (c.percprovcred > 0 && c.valorfindisp) return a + (c.percprovcred / 100) * c.valorfindisp;
    return a;
  }, 0);
  const byIndexador = {};
  const byRisco = {};
  const byFundo = {};
  for (const c of allCredits) {
    const idx = c.indexador || 'Outros';
    if (!byIndexador[idx]) byIndexador[idx] = { weight: 0, count: 0 };
    byIndexador[idx].weight += c.valorfindisp || 0;
    byIndexador[idx].count++;

    const rsc = c.nivelrsc || 'N/D';
    if (!byRisco[rsc]) byRisco[rsc] = { weight: 0, count: 0 };
    byRisco[rsc].weight += c.valorfindisp || 0;
    byRisco[rsc].count++;

    const fn = c.fundName || '?';
    if (!byFundo[fn]) byFundo[fn] = { weight: 0, count: 0 };
    byFundo[fn].weight += c.valorfindisp || 0;
    byFundo[fn].count++;
  }

  // Duration média ponderada (usando dtvencimento)
  let durationSum = 0, durationWeightSum = 0;
  const now = new Date();
  for (const c of allCredits) {
    if (c.dtvencimento && c.valorfindisp) {
      const venc = new Date(c.dtvencimento);
      const yearsToMaturity = (venc.getTime() - now.getTime()) / (365.25 * 86400000);
      if (yearsToMaturity > 0) {
        durationSum += yearsToMaturity * c.valorfindisp;
        durationWeightSum += c.valorfindisp;
      }
    }
  }
  const avgDuration = durationWeightSum > 0 ? durationSum / durationWeightSum : null;

  // Cupom médio ponderado
  let cupomSum = 0, cupomWeightSum = 0;
  for (const c of allCredits) {
    if (c.coupom > 0 && c.valorfindisp) {
      cupomSum += c.coupom * c.valorfindisp;
      cupomWeightSum += c.valorfindisp;
    }
  }
  const avgCupom = cupomWeightSum > 0 ? cupomSum / cupomWeightSum : null;

  // PDD %
  const pddPct = totalValor > 0 ? (totalPDD / totalValor) * 100 : 0;

  // Convert byIndexador to % for chart
  const byIdxPct = {};
  for (const [k, v] of Object.entries(byIndexador)) {
    byIdxPct[k] = { weight: totalValor > 0 ? (v.weight / totalValor) * 100 : 0, count: v.count };
  }
  const byRiscoPct = {};
  for (const [k, v] of Object.entries(byRisco)) {
    byRiscoPct[k] = { weight: totalValor > 0 ? (v.weight / totalValor) * 100 : 0, count: v.count };
  }
  const byFundoPct = {};
  for (const [k, v] of Object.entries(byFundo)) {
    byFundoPct[k] = { weight: totalValor > 0 ? (v.weight / totalValor) * 100 : 0, count: v.count };
  }

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Credit Portfolio', 'Credit <em>Portfolio</em>',
      `Visão consolidada de todos os ativos de crédito privado da gestora. ${allCredits.length} ativos em ${Object.keys(byFundo).length} fundo(s).`),

    allCredits.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum ativo de crédito encontrado'),
          h('p', { class: 'empty-desc' }, 'Faça upload de XMLs CVM em Fundos para que os títulos privados (CRI, CCI, debêntures) apareçam aqui automaticamente.'),
          h('button', { class: 'btn-primary', onClick: () => setView('am_funds') }, 'Ir para Fundos'),
        ])
      : h('div', {}, [
          // KPIs
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
            renderPortKPI('Ativos de Crédito', String(allCredits.length), `${Object.keys(byFundo).length} fundo(s)`),
            renderPortKPI('Valor Total', formatBRL(totalValor), ''),
            renderPortKPI('PDD Total', formatBRL(totalPDD), `${pddPct.toFixed(2)}% do portfólio`),
            renderPortKPI('Duration Média', avgDuration != null ? `${avgDuration.toFixed(1)} anos` : '—', 'Ponderada por valor'),
            renderPortKPI('Cupom Médio', avgCupom != null ? `${avgCupom.toFixed(2)}% a.a.` : '—', 'Ponderado por valor'),
            renderPortKPI('Nível Risco Predominante', (() => {
              const sorted = Object.entries(byRisco).sort((a, b) => b[1].weight - a[1].weight);
              return sorted[0] ? `${sorted[0][0]} (${sorted[0][1].count} ativos)` : '—';
            })(), ''),
          ]),

          // Charts
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' } }, [
            renderAllocationChart('Por Indexador', byIdxPct, {}),
            renderAllocationChart('Por Nível de Risco', byRiscoPct, {}),
            renderAllocationChart('Por Fundo', byFundoPct, {}),
          ]),

          // Full table
          h('div', { class: 'macro-section-subhead' }, `Ativos de Crédito (${allCredits.length})`),
          h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
            h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' } }, [
              h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
                ['Fundo', 'Código', 'Indexador', 'Cupom', 'Vencimento', 'PU', 'Valor', 'PDD %', 'Risco'].map(col =>
                  h('th', { style: { padding: '7px 10px', textAlign: col === 'Fundo' || col === 'Código' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', whiteSpace: 'nowrap' } }, col)
                )
              )),
              h('tbody', {},
                allCredits
                  .sort((a, b) => (b.valorfindisp || 0) - (a.valorfindisp || 0))
                  .map(c => h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                    h('td', { style: { padding: '6px 10px', fontSize: '10px', color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.fundName),
                    h('td', { class: 'mono', style: { padding: '6px 10px', fontWeight: '600', color: 'var(--amber)', fontSize: '10px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' } }, c.codativo),
                    h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontSize: '10px' } }, `${c.indexador || '—'}`),
                    h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, c.coupom ? `${c.coupom.toFixed(2)}%` : '—'),
                    h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)', fontSize: '10px' } }, c.dtvencimento || '—'),
                    h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, `R$ ${(c.puposicao || 0).toFixed(2)}`),
                    h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontWeight: '500' } }, formatBRL(c.valorfindisp)),
                    h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: c.percprovcred > 0 ? 'var(--red)' : 'var(--text-faint)' } }, `${(c.percprovcred || 0).toFixed(1)}%`),
                    h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontSize: '9px' } }, c.nivelrsc || '—'),
                  ]))
              ),
            ]),
          ]),
        ]),
  ]);
}

/* ============================================================
   38. RISK ANALYSIS
   Comprehensive risk metrics from XML carteira data
   ============================================================ */

function computeFundRisk(parsed) {
  if (!parsed) return null;
  const { fund, positions, provisoes, stats } = parsed;
  const pl = fund.patliq || 1;
  const allPos = [...(positions.acoes || []), ...(positions.titprivado || []), ...(positions.titpublico || []), ...(positions.cotas || [])];
  const now = new Date();

  // ===== 1. CONCENTRATION =====
  const posValues = allPos.map(p => ({ name: p.codativo || p.cnpjfundo || '?', value: p.valorfindisp || 0, pct: ((p.valorfindisp || 0) / pl) * 100 }))
    .sort((a, b) => b.value - a.value);
  const weights = posValues.map(p => p.value / pl);
  const hhi = weights.reduce((a, w) => a + w * w, 0);
  const top5 = posValues.slice(0, 5);
  const top5Pct = top5.reduce((a, p) => a + p.pct, 0);
  const top10Pct = posValues.slice(0, 10).reduce((a, p) => a + p.pct, 0);
  const maxSingle = posValues[0] || { name: '—', pct: 0 };

  // ===== 2. CREDIT RISK (PDD) =====
  const creditPositions = positions.titprivado || [];
  const totalCreditValue = creditPositions.reduce((a, p) => a + (p.valorfindisp || 0), 0);
  const pddByPosition = creditPositions.map(p => {
    const pddValue = (p.percprovcred || 0) > 0 ? ((p.percprovcred / 100) * (p.valorfindisp || 0)) : 0;
    return { name: p.codativo, pddPct: p.percprovcred || 0, pddValue, value: p.valorfindisp || 0, risco: p.nivelrsc || 'N/D' };
  });
  const totalPDD = pddByPosition.reduce((a, p) => a + p.pddValue, 0);
  const pddCoveragePct = totalCreditValue > 0 ? (totalPDD / totalCreditValue) * 100 : 0;

  // PDD by risk level
  const pddByRisco = {};
  for (const p of pddByPosition) { const r = p.risco; if (!pddByRisco[r]) pddByRisco[r] = { count: 0, value: 0, pdd: 0 }; pddByRisco[r].count++; pddByRisco[r].value += p.value; pddByRisco[r].pdd += p.pddValue; }

  // LGD — PD estimates by risk level, LGD = PDD% / PD
  const PD_EST = { 'AA': 0.005, 'A': 0.01, 'BB': 0.02, 'B': 0.03, 'CC': 0.04, 'C': 0.05, 'DD': 0.08, 'D': 0.10, 'E': 0.20, 'F': 0.40, 'G': 0.60, 'H': 1.0 };
  let lgdSum = 0, lgdWeight = 0;
  const lgdByPosition = [];
  for (const p of creditPositions) {
    const val = p.valorfindisp || 0; if (val <= 0) continue;
    const pddPct = (p.percprovcred || 0) / 100;
    const risco = (p.nivelrsc || '').toUpperCase();
    const pd = PD_EST[risco] || 0.05;
    const lgd = pd > 0 ? Math.min(1, pddPct / pd) : pddPct;
    lgdByPosition.push({ name: p.codativo, risco: p.nivelrsc, pddPct: p.percprovcred || 0, pd: pd * 100, lgd: lgd * 100, value: val, recoveryRate: (1 - lgd) * 100 });
    lgdSum += lgd * val; lgdWeight += val;
  }
  const portfolioLGD = lgdWeight > 0 ? (lgdSum / lgdWeight) * 100 : 0;

  // ===== FUND TYPE DETECTION =====
  const tipo = parseInt(fund.tipofundo);
  const isFII = tipo === 431;
  const isFIDC = tipo === 348;
  const hasCredit = creditPositions.length > 0;
  const hasImoveis = (positions.imoveis || []).length > 0;
  const hasFIICotas = (positions.acoes || []).length > 0 && isFII;
  const isFOF = isFII && hasFIICotas && !hasImoveis;
  const isTijolo = isFII && hasImoveis;
  const isClosed = isFII;
  const isOpen = !isClosed;
  const fundProfile = {
    tipo, isFII, isFIDC, isFOF, isTijolo, isClosed, isOpen, hasCredit, hasImoveis,
    label: isFOF ? 'FII FOF' : isTijolo ? 'FII Tijolo' : isFIDC ? 'FIDC' : isFII ? 'FII' : 'Fundo',
  };

  // ===== 3. LIQUIDITY =====
  const zeragem = (positions.cotas || []).filter(p => isZeragemFund(p.cnpjfundo || p.isin));
  const zeragemVal = zeragem.reduce((a, p) => a + (p.valorfindisp || ((p.qtdisponivel||0)*(p.puposicao||0))), 0);
  const effectiveCash = ((stats || {}).totalCaixa || 0) + zeragemVal;
  const cashRatio = (effectiveCash / pl) * 100;
  const maturityBuckets = { '0-1Y': 0, '1-3Y': 0, '3-5Y': 0, '5-10Y': 0, '10Y+': 0, 'N/D': 0 };
  const maturityBucketCounts = { '0-1Y': 0, '1-3Y': 0, '3-5Y': 0, '5-10Y': 0, '10Y+': 0, 'N/D': 0 };
  for (const p of creditPositions) {
    const val = p.valorfindisp || 0;
    if (!p.dtvencimento) { maturityBuckets['N/D'] += val; maturityBucketCounts['N/D']++; continue; }
    const years = (new Date(p.dtvencimento).getTime() - now.getTime()) / (365.25 * 86400000);
    const bucket = years <= 1 ? '0-1Y' : years <= 3 ? '1-3Y' : years <= 5 ? '3-5Y' : years <= 10 ? '5-10Y' : '10Y+';
    maturityBuckets[bucket] += val; maturityBucketCounts[bucket]++;
  }
  let wamSum = 0, wamWeight = 0;
  for (const p of creditPositions) { if (p.dtvencimento && p.valorfindisp) { const y = (new Date(p.dtvencimento).getTime() - now.getTime()) / (365.25 * 86400000); if (y > 0) { wamSum += y * p.valorfindisp; wamWeight += p.valorfindisp; } } }
  const wam = wamWeight > 0 ? wamSum / wamWeight : null;

  // ===== 4. INDEXADOR =====
  const idxExposure = {};
  for (const p of [...creditPositions, ...(positions.titpublico || [])]) { const idx = p.indexador || 'Outros'; if (!idxExposure[idx]) idxExposure[idx] = { value: 0, count: 0 }; idxExposure[idx].value += p.valorfindisp || 0; idxExposure[idx].count++; }

  // ===== 5. DURATION =====
  let durationSum = 0, durWeight = 0;
  for (const p of [...creditPositions, ...(positions.titpublico || [])]) { if (p.dtvencimento && p.valorfindisp) { const y = (new Date(p.dtvencimento).getTime() - now.getTime()) / (365.25 * 86400000); if (y > 0) { durationSum += y * p.valorfindisp; durWeight += p.valorfindisp; } } }
  const avgDuration = durWeight > 0 ? durationSum / durWeight : 0;
  const impact100bps = avgDuration * 0.01 * durWeight;
  const impact200bps = avgDuration * 0.02 * durWeight;

  // ===== 6. STRESS (adapted by fund type) =====
  const stressScenarios = [];
  if (durWeight > 0) stressScenarios.push({ name: 'SELIC +200 bps', desc: 'Elevação de 200bps na curva', impactValue: -impact200bps, impactPct: (-impact200bps / pl) * 100 });
  if (maxSingle.value > 0) stressScenarios.push({ name: 'Default Top 1', desc: `Inadimplência total de ${maxSingle.name}`, impactValue: -maxSingle.value, impactPct: (-maxSingle.value / pl) * 100 });
  if (hasCredit && totalPDD > 0) stressScenarios.push({ name: 'PDD +50%', desc: 'Deterioração de crédito generalizada', impactValue: -(totalPDD * 0.5), impactPct: (-(totalPDD * 0.5) / pl) * 100 });
  if (isOpen) stressScenarios.push({ name: 'Resgate 20% PL', desc: 'Necessidade de liquidar 20% do patrimônio', impactValue: -(pl * 0.2), impactPct: -20, liquidityNote: cashRatio >= 20 ? 'Liquidez imediata suficiente' : `Déficit de ${formatBRL(pl * 0.2 - effectiveCash)}` });
  if (isTijolo) { const alg = (positions.imoveis || []).reduce((a, im) => a + (im.aluguelcontratado || 0), 0); if (alg > 0) stressScenarios.push({ name: 'Vacância +30pp', desc: 'Aumento de vacância nos imóveis', impactValue: -(alg * 12 * 0.3), impactPct: (-(alg * 12 * 0.3) / pl) * 100 }); }
  if (isFOF) { const eq = (positions.acoes || []).reduce((a, p) => a + (p.valorfindisp || 0), 0); stressScenarios.push({ name: 'Cotas FII -15%', desc: 'Queda de 15% no preço dos FIIs', impactValue: -(eq * 0.15), impactPct: (-(eq * 0.15) / pl) * 100 }); }

  // ===== 7. VaR (adapted) =====
  let var95 = 0, var99 = 0, portfolioSigma = 0;
  if (hasCredit && durWeight > 0) { portfolioSigma = avgDuration * 0.0015 * Math.sqrt(21); var95 = 1.645 * portfolioSigma * durWeight; var99 = 2.326 * portfolioSigma * durWeight; }
  else if (isFOF || hasFIICotas) { const eq = (positions.acoes || []).reduce((a, p) => a + (p.valorfindisp || 0), 0); portfolioSigma = 0.015 * Math.sqrt(21); var95 = 1.645 * portfolioSigma * eq; var99 = 2.326 * portfolioSigma * eq; }

  // ===== 8. REAL ESTATE RISK =====
  let realEstateRisk = null;
  if (hasImoveis) {
    const ims = positions.imoveis || [];
    const tc = ims.reduce((a, im) => a + (im.valorcontabil || 0), 0);
    const ta = ims.reduce((a, im) => a + (im.aluguelcontratado || 0), 0);
    const tat = ims.reduce((a, im) => a + (im.aluguelatrasado || 0), 0);
    realEstateRisk = { totalContabil: tc, totalAluguel: ta, totalAtrasado: tat, capRate: tc > 0 ? (ta * 12 / tc) * 100 : 0, inadimPct: ta > 0 ? (tat / ta) * 100 : 0, questJurCount: ims.filter(im => im.questjur === 'S').length, imovelCount: ims.length };
  }

  // ===== 9. DTL CANDIDATES =====
  const dtlCandidates = (positions.acoes || []).filter(p => p.codativo).map(p => ({ ticker: p.codativo, value: p.valorfindisp || 0 }));

  return {
    fund, pl, fundProfile,
    concentration: { hhi, top5, top5Pct, top10Pct, maxSingle, totalPositions: posValues.length },
    credit: { totalCreditValue, totalPDD, pddCoveragePct, pddByRisco, pddByPosition, creditCount: creditPositions.length, lgdByPosition, portfolioLGD, portfolioRecovery: 100 - portfolioLGD, expectedLoss: totalCreditValue > 0 ? (totalPDD / totalCreditValue) * 100 : 0 },
    liquidity: { cashRatio, effectiveCash, totalCaixa: ((stats || {}).totalCaixa || 0), zeragemVal, maturityBuckets, maturityBucketCounts, wam },
    indexador: idxExposure,
    duration: { avgDuration, impact100bps, impact200bps, totalDurationExposure: durWeight },
    stress: stressScenarios,
    var: { var95, var99, portfolioSigma, horizon: 21 },
    realEstateRisk, dtlCandidates,
  };
}

/* ---------- Render: Risk Analysis ---------- */

function renderRiskAnalysis() {
  const funds = getFunds();
  const activeFund = state._risk_fund;

  // If a fund is selected, show its risk
  if (activeFund) {
    const fund = funds.find(f => f.cnpj === activeFund || f.id === activeFund);
    if (fund) {
      const carteiras = getCarteirasXML(fund.cnpj);
      const latest = carteiras.length > 0 ? carteiras[carteiras.length - 1] : null;
      const risk = latest ? computeFundRisk(latest) : null;
      return renderFundRiskDetail(fund, risk, latest);
    }
  }

  // Aggregate view — all funds
  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Risk Analysis', 'Análise de <em>Risco</em>',
      'Métricas de risco por fundo: concentração, crédito (PDD), liquidez, duration, VaR e stress tests. Baseado nos dados XML CVM carregados.'),

    funds.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum fundo cadastrado'),
          h('p', { class: 'empty-desc' }, 'Cadastre fundos e carregue XMLs em Asset Management → Fundos para ativar a análise de risco.'),
        ])
      : h('div', {}, [
          // Aggregate risk summary
          h('div', { class: 'macro-section-subhead' }, 'Visão por Fundo'),
          ...funds.map(fund => {
            const carteiras = getCarteirasXML(fund.cnpj);
            const latest = carteiras.length > 0 ? carteiras[carteiras.length - 1] : null;
            const risk = latest ? computeFundRisk(latest) : null;
            return h('div', {
              class: 'card card-hover', style: { marginBottom: '10px', cursor: 'pointer' },
              onClick: () => { state._risk_fund = fund.cnpj || fund.id; render(); },
            }, [
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px 100px 100px', gap: '12px', alignItems: 'center' } }, [
                h('div', {}, [
                  h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
                    h('span', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px' } }, fund.name),
                    risk?.fundProfile && h('span', { class: 'mono', style: { fontSize: '9px', padding: '1px 6px', border: '1px solid var(--amber)', color: 'var(--amber)' } }, risk.fundProfile.label),
                  ]),
                  h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, `${fund.classification?.toUpperCase() || '?'} · ${carteiras.length} carteira(s)`),
                ]),
                renderRiskMiniKPI('PL', risk ? formatBRL(risk.pl) : '—'),
                renderRiskMiniKPI('HHI', risk ? (risk.concentration.hhi * 10000).toFixed(0) : '—'),
                renderRiskMiniKPI(risk?.fundProfile?.hasCredit ? 'PDD %' : 'Liquidez', risk?.fundProfile?.hasCredit ? (risk?.credit?.pddCoveragePct != null ? `${risk.credit.pddCoveragePct.toFixed(1)}%` : '—') : (risk ? `${risk.liquidity.cashRatio.toFixed(1)}%` : '—')),
                renderRiskMiniKPI(risk?.fundProfile?.hasCredit ? 'LGD' : 'Top5', risk?.fundProfile?.hasCredit ? (risk?.credit?.portfolioLGD != null ? `${risk.credit.portfolioLGD.toFixed(0)}%` : '—') : (risk ? `${risk.concentration.top5Pct.toFixed(0)}%` : '—')),
                renderRiskMiniKPI('VaR 95%', risk?.var?.var95 > 0 ? formatBRL(risk.var.var95) : '—'),
              ]),
            ]);
          }),
        ]),
  ]);
}

function renderRiskMiniKPI(label, value) {
  return h('div', { style: { textAlign: 'right' } }, [
    h('div', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' } }, label),
    h('div', { class: 'mono', style: { fontSize: '12px', fontWeight: '500' } }, value),
  ]);
}

/* ---------- Fund Risk Detail ---------- */

function renderFundRiskDetail(fund, risk, carteira) {
  const subTab = state._risk_tab || 'overview';

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._risk_fund = null; state._risk_tab = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Todos os fundos'),
    ]),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' } }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, 'Risk Analysis'),
        h('h1', { class: 'page-title' }, fund.name),
        h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } },
          `${risk?.fundProfile?.label || fund.classification?.toUpperCase() || '?'} · Carteira: ${carteira?.fund?.dtposicao || '—'} · PL: ${risk ? formatBRL(risk.pl) : '—'}${risk?.fundProfile?.isClosed ? ' · Fundo Fechado' : ''}`),
      ]),
      h('button', { class: 'btn-secondary', onClick: () => exportRiskReport(fund, risk, carteira) }, '↓ Relatório .md'),
    ]),

    !risk
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Sem dados para análise'),
          h('p', { class: 'empty-desc' }, 'Carregue um XML CVM em Fundos para ativar.'),
        ])
      : h('div', {}, [
          // Tabs (adapted by fund type)
          h('div', { class: 'sec-tab-row', style: { marginBottom: '20px' } },
            [
              ['overview', 'Resumo'],
              ['concentration', 'Concentração'],
              risk.fundProfile?.hasCredit && ['credit', 'Crédito & PDD'],
              risk.fundProfile?.hasCredit && ['lgd', 'LGD'],
              ['liquidity', 'Liquidez'],
              (risk.fundProfile?.isFOF || risk.fundProfile?.hasCredit) && ['dtl', 'DTL'],
              risk.fundProfile?.isOpen && ['resgate', 'Risco de Resgate'],
              risk.realEstateRisk && ['realestate', 'Imóveis'],
              ['stress', 'Stress Test'],
              ['compliance', 'Enquadramento CVM'],
            ].filter(Boolean).map(([k, l]) =>
              h('button', { class: 'sec-tab' + (subTab === k ? ' active' : ''), onClick: () => { state._risk_tab = k; render(); } }, l)
            )
          ),

          subTab === 'overview' ? renderRiskOverview(risk) :
          subTab === 'concentration' ? renderRiskConcentration(risk) :
          subTab === 'credit' ? renderRiskCredit(risk) :
          subTab === 'lgd' ? renderRiskLGD(risk) :
          subTab === 'liquidity' ? renderRiskLiquidity(risk) :
          subTab === 'dtl' ? renderRiskDTL(risk, fund) :
          subTab === 'resgate' ? renderRiskResgate(risk, fund, carteira) :
          subTab === 'realestate' ? renderRiskRealEstate(risk) :
          subTab === 'stress' ? renderRiskStress(risk) :
          subTab === 'compliance' ? renderRiskCompliance(risk, carteira) : null,
        ]),
  ]);
}

/* ---------- Risk Overview ---------- */

function renderRiskOverview(risk) {
  const riskColor = (val, thresholds) => {
    if (val <= thresholds[0]) return 'var(--green)';
    if (val <= thresholds[1]) return 'var(--amber)';
    return 'var(--red)';
  };
  const fp = risk.fundProfile || {};

  return h('div', {}, [
    // Fund profile badge
    h('div', { style: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' } }, [
      h('span', { class: 'mono', style: { fontSize: '10px', padding: '3px 10px', border: '1px solid var(--amber)', color: 'var(--amber)' } }, fp.label || 'Fundo'),
      fp.isClosed && h('span', { class: 'mono', style: { fontSize: '10px', padding: '3px 10px', border: '1px solid var(--blue)', color: 'var(--blue)' } }, 'Fechado (Listado)'),
      fp.isOpen && h('span', { class: 'mono', style: { fontSize: '10px', padding: '3px 10px', border: '1px solid var(--green)', color: 'var(--green)' } }, 'Aberto'),
      fp.hasCredit && h('span', { class: 'mono', style: { fontSize: '10px', padding: '3px 10px', border: '1px solid var(--text-faint)', color: 'var(--text-faint)' } }, 'Crédito'),
      fp.hasImoveis && h('span', { class: 'mono', style: { fontSize: '10px', padding: '3px 10px', border: '1px solid #d4a574', color: '#d4a574' } }, 'Imóveis'),
    ]),

    // Risk scorecard (adapted)
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '28px' } }, [
      renderRiskKPI('HHI (Concentração)', (risk.concentration.hhi * 10000).toFixed(0),
        risk.concentration.hhi < 0.15 ? 'Diversificado' : risk.concentration.hhi < 0.25 ? 'Moderado' : 'Concentrado',
        riskColor(risk.concentration.hhi, [0.15, 0.25])),
      renderRiskKPI('Top 5', `${risk.concentration.top5Pct.toFixed(1)}%`, `${risk.concentration.totalPositions} posições`, riskColor(risk.concentration.top5Pct, [60, 80])),

      // Credit metrics (only for credit funds)
      fp.hasCredit && renderRiskKPI('PDD / Crédito', `${risk.credit.pddCoveragePct.toFixed(2)}%`, `${formatBRL(risk.credit.totalPDD)}`, riskColor(risk.credit.pddCoveragePct, [5, 15])),
      fp.hasCredit && renderRiskKPI('LGD Portfólio', `${risk.credit.portfolioLGD.toFixed(1)}%`, `Recovery: ${risk.credit.portfolioRecovery.toFixed(1)}%`, riskColor(risk.credit.portfolioLGD, [30, 60])),
      fp.hasCredit && renderRiskKPI('Perda Esperada', `${risk.credit.expectedLoss.toFixed(3)}%`, 'PD × LGD × EAD', riskColor(risk.credit.expectedLoss, [1, 5])),

      // Duration (only if relevant)
      risk.duration.avgDuration > 0 && renderRiskKPI('Duration Média', `${risk.duration.avgDuration.toFixed(2)}a`, risk.duration.avgDuration > 5 ? 'Longa' : risk.duration.avgDuration > 2 ? 'Média' : 'Curta', riskColor(risk.duration.avgDuration, [3, 7])),

      // Liquidity
      renderRiskKPI('Liquidez Imediata', `${risk.liquidity.cashRatio.toFixed(2)}%`, `${formatBRL(risk.liquidity.effectiveCash)}${risk.liquidity.zeragemVal > 0 ? ' (incl. zeragem)' : ''}`,
        riskColor(100 - risk.liquidity.cashRatio, [95, 99])),

      // VaR (only if calculated)
      risk.var.var95 > 0 && renderRiskKPI('VaR 95% (21d)', formatBRL(risk.var.var95), `${(risk.var.var95 / risk.pl * 100).toFixed(2)}% PL`, riskColor(risk.var.var95 / risk.pl * 100, [3, 8])),

      // Real estate (only for tijolo)
      risk.realEstateRisk && renderRiskKPI('Cap Rate', `${risk.realEstateRisk.capRate.toFixed(2)}%`, `${risk.realEstateRisk.imovelCount} imóvel(is)`, riskColor(10 - risk.realEstateRisk.capRate, [4, 7])),
      risk.realEstateRisk && risk.realEstateRisk.inadimPct > 0 && renderRiskKPI('Inadimplência Aluguel', `${risk.realEstateRisk.inadimPct.toFixed(1)}%`, formatBRL(risk.realEstateRisk.totalAtrasado), riskColor(risk.realEstateRisk.inadimPct, [5, 15])),

      renderRiskKPI('Maior Posição', risk.concentration.maxSingle.name, `${risk.concentration.maxSingle.pct.toFixed(1)}% PL`, riskColor(risk.concentration.maxSingle.pct, [15, 25])),
    ].filter(Boolean)),

    // Risk matrix (adapted)
    h('div', { class: 'macro-section-subhead' }, 'Matriz de Risco'),
    h('div', { class: 'card', style: { padding: 0, overflow: 'hidden' } },
      [
        { category: 'Concentração', level: risk.concentration.hhi < 0.15 ? 'Baixo' : risk.concentration.hhi < 0.25 ? 'Médio' : 'Alto', detail: `HHI: ${(risk.concentration.hhi * 10000).toFixed(0)} · Top5: ${risk.concentration.top5Pct.toFixed(1)}%` },
        fp.hasCredit && { category: 'Crédito (PDD)', level: risk.credit.pddCoveragePct < 5 ? 'Baixo' : risk.credit.pddCoveragePct < 15 ? 'Médio' : 'Alto', detail: `PDD: ${risk.credit.pddCoveragePct.toFixed(2)}% · LGD: ${risk.credit.portfolioLGD.toFixed(1)}%` },
        fp.hasCredit && { category: 'Perda Esperada', level: risk.credit.expectedLoss < 1 ? 'Baixo' : risk.credit.expectedLoss < 5 ? 'Médio' : 'Alto', detail: `EL: ${risk.credit.expectedLoss.toFixed(3)}% · ${risk.credit.creditCount} ativos` },
        { category: 'Liquidez', level: risk.liquidity.cashRatio > 5 ? 'Baixo' : risk.liquidity.cashRatio > 1 ? 'Médio' : 'Alto', detail: `Liquidez imediata: ${risk.liquidity.cashRatio.toFixed(2)}%${risk.liquidity.zeragemVal > 0 ? ' (incl. zeragem)' : ''}` },
        risk.duration.avgDuration > 0 && { category: 'Mercado (Duration)', level: risk.duration.avgDuration < 3 ? 'Baixo' : risk.duration.avgDuration < 7 ? 'Médio' : 'Alto', detail: `Duration: ${risk.duration.avgDuration.toFixed(2)}a` },
        risk.var.var95 > 0 && { category: 'VaR 95%', level: (risk.var.var95 / risk.pl * 100) < 3 ? 'Baixo' : (risk.var.var95 / risk.pl * 100) < 8 ? 'Médio' : 'Alto', detail: `${formatBRL(risk.var.var95)} (${(risk.var.var95 / risk.pl * 100).toFixed(2)}% PL)` },
        risk.realEstateRisk && { category: 'Imobiliário', level: risk.realEstateRisk.inadimPct < 5 && risk.realEstateRisk.questJurCount === 0 ? 'Baixo' : risk.realEstateRisk.inadimPct < 15 ? 'Médio' : 'Alto', detail: `Cap rate: ${risk.realEstateRisk.capRate.toFixed(2)}% · Inadim: ${risk.realEstateRisk.inadimPct.toFixed(1)}%` },
        !fp.isOpen && fp.isFII && { category: 'Resgate', level: 'N/A', detail: 'Fundo fechado — sem risco de resgate de cotistas' },
      ].filter(Boolean).map((row, i) => {
        const color = row.level === 'Baixo' ? 'var(--green)' : row.level === 'Médio' ? 'var(--amber)' : row.level === 'Alto' ? 'var(--red)' : 'var(--text-faint)';
        return h('div', {
          style: { display: 'grid', gridTemplateColumns: '160px 80px 1fr', gap: '12px', padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center' },
        }, [
          h('span', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, row.category),
          h('span', { class: 'mono', style: { fontSize: '11px', padding: '2px 8px', border: `1px solid ${color}`, color, textAlign: 'center', fontWeight: '600' } }, row.level),
          h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, row.detail),
        ]);
      })
    ),
  ]);
}

function renderRiskKPI(label, value, sub, color) {
  return h('div', { class: 'card', style: { padding: '14px 16px', borderTop: `3px solid ${color || 'var(--border)'}` } }, [
    h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', marginBottom: '4px' } }, label),
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', color: color || 'var(--text)' } }, value),
    sub && h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px' } }, sub),
  ]);
}

/* ---------- Risk: Concentration ---------- */

function renderRiskConcentration(risk) {
  const { concentration } = risk;
  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('HHI', (concentration.hhi * 10000).toFixed(0), concentration.hhi < 0.15 ? 'Diversificado' : concentration.hhi < 0.25 ? 'Moderado' : 'Concentrado'),
      renderPortKPI('Top 5', `${concentration.top5Pct.toFixed(1)}%`, ''),
      renderPortKPI('Top 10', `${concentration.top10Pct.toFixed(1)}%`, ''),
      renderPortKPI('Maior Posição', `${concentration.maxSingle.pct.toFixed(1)}%`, concentration.maxSingle.name),
    ]),

    h('div', { class: 'macro-section-subhead' }, 'Top 10 Posições por Peso'),
    h('div', { class: 'card', style: { padding: 0, overflow: 'hidden' } },
      concentration.top5.concat(concentration.top5.length < 10 ? [] : []).slice(0, 10).map((p, i) => {
        const barWidth = Math.max(2, Math.min(95, p.pct));
        return h('div', { style: { padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' } }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' } }, [
            h('span', { class: 'mono', style: { fontSize: '12px', fontWeight: '600' } }, p.name),
            h('span', { class: 'mono', style: { fontSize: '12px' } }, `${p.pct.toFixed(2)}% · ${formatBRL(p.value)}`),
          ]),
          h('div', { style: { height: '6px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden' } }, [
            h('div', { style: { width: `${barWidth}%`, height: '100%', background: p.pct > 20 ? 'var(--red)' : p.pct > 10 ? 'var(--amber)' : 'var(--green)', borderRadius: '3px' } }),
          ]),
        ]);
      })
    ),
  ]);
}

/* ---------- Risk: Credit & PDD ---------- */

function renderRiskCredit(risk) {
  const { credit } = risk;
  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('Ativos de Crédito', String(credit.creditCount), ''),
      renderPortKPI('Valor Total', formatBRL(credit.totalCreditValue), ''),
      renderPortKPI('PDD Total', formatBRL(credit.totalPDD), `${credit.pddCoveragePct.toFixed(2)}% do crédito`),
      renderPortKPI('Ativos com PDD > 0', String(credit.pddByPosition.filter(p => p.pddPct > 0).length), ''),
    ]),

    // PDD by risk level
    Object.keys(credit.pddByRisco).length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'PDD por Nível de Risco'),
      h('div', { class: 'card', style: { padding: 0, overflow: 'hidden' } },
        Object.entries(credit.pddByRisco).sort((a, b) => b[1].value - a[1].value).map(([nivel, data], i) => {
          const pddPct = data.value > 0 ? (data.pdd / data.value) * 100 : 0;
          return h('div', {
            style: { display: 'grid', gridTemplateColumns: '60px 50px 120px 120px 80px', gap: '12px', padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center', fontSize: '12px' },
          }, [
            h('span', { class: 'mono', style: { fontWeight: '600' } }, nivel),
            h('span', { class: 'mono', style: { color: 'var(--text-faint)' } }, `${data.count} ativo(s)`),
            h('span', { class: 'mono' }, `Valor: ${formatBRL(data.value)}`),
            h('span', { class: 'mono', style: { color: data.pdd > 0 ? 'var(--red)' : 'var(--text-faint)' } }, `PDD: ${formatBRL(data.pdd)}`),
            h('span', { class: 'mono', style: { color: pddPct > 10 ? 'var(--red)' : 'var(--text-faint)' } }, `${pddPct.toFixed(1)}%`),
          ]);
        })
      ),
    ]),

    // Positions with PDD
    credit.pddByPosition.filter(p => p.pddPct > 0).length > 0 && h('div', {}, [
      h('div', { class: 'macro-section-subhead' }, 'Ativos com Provisão de Crédito'),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Ativo', 'Risco', 'Valor', 'PDD %', 'PDD R$'].map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'Ativo' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            credit.pddByPosition.filter(p => p.pddPct > 0).sort((a, b) => b.pddValue - a.pddValue).map(p =>
              h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                h('td', { class: 'mono', style: { padding: '6px 12px', fontWeight: '600', color: 'var(--amber)' } }, p.name),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, p.risco),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, formatBRL(p.value)),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--red)', fontWeight: '600' } }, `${p.pddPct.toFixed(2)}%`),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--red)' } }, formatBRL(p.pddValue)),
              ])
            )
          ),
        ]),
      ]),
    ]),
  ]);
}

/* ---------- Risk: Liquidity ---------- */

function renderRiskLiquidity(risk) {
  const { liquidity } = risk;
  const totalMaturity = Object.values(liquidity.maturityBuckets).reduce((a, v) => a + v, 0) || 1;

  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('Caixa', formatBRL(liquidity.totalCaixa), `${liquidity.cashRatio.toFixed(2)}% do PL`),
      renderPortKPI('WAM', liquidity.wam ? `${liquidity.wam.toFixed(2)} anos` : 'N/A', 'Weighted Average Maturity'),
      renderPortKPI('Curto Prazo (0-1Y)', formatBRL(liquidity.maturityBuckets['0-1Y']), `${((liquidity.maturityBuckets['0-1Y'] / totalMaturity) * 100).toFixed(1)}% do crédito`),
      renderPortKPI('Longo Prazo (5Y+)', formatBRL(liquidity.maturityBuckets['5-10Y'] + liquidity.maturityBuckets['10Y+']),
        `${(((liquidity.maturityBuckets['5-10Y'] + liquidity.maturityBuckets['10Y+']) / totalMaturity) * 100).toFixed(1)}% do crédito`),
    ]),

    h('div', { class: 'macro-section-subhead' }, 'Escada de Vencimentos (Maturity Ladder)'),
    h('div', { class: 'card', style: { padding: '20px' } },
      Object.entries(liquidity.maturityBuckets).filter(([_, v]) => v > 0).map(([bucket, value]) => {
        const pct = (value / totalMaturity) * 100;
        const count = liquidity.maturityBucketCounts[bucket] || 0;
        return h('div', { style: { marginBottom: '12px' } }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' } }, [
            h('span', { class: 'mono', style: { fontSize: '12px', fontWeight: '500' } }, bucket),
            h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, `${formatBRL(value)} · ${count} ativo(s) · ${pct.toFixed(1)}%`),
          ]),
          h('div', { style: { height: '10px', background: 'var(--bg)', borderRadius: '5px', overflow: 'hidden' } }, [
            h('div', { style: { width: `${Math.max(2, pct)}%`, height: '100%', background: bucket === '0-1Y' ? 'var(--green)' : bucket === '1-3Y' ? '#7a9b5c' : bucket === '3-5Y' ? 'var(--amber)' : bucket === '5-10Y' ? 'var(--orange)' : 'var(--red)', borderRadius: '5px' } }),
          ]),
        ]);
      })
    ),
  ]);
}

/* ---------- Risk: Stress Test ---------- */

function renderRiskStress(risk) {
  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('VaR 95% (21d)', formatBRL(risk.var.var95), `${(risk.var.var95 / risk.pl * 100).toFixed(2)}% do PL`),
      renderPortKPI('VaR 99% (21d)', formatBRL(risk.var.var99), `${(risk.var.var99 / risk.pl * 100).toFixed(2)}% do PL`),
      renderPortKPI('σ do Portfólio', `${(risk.var.portfolioSigma * 100).toFixed(3)}%`, `Horizonte: ${risk.var.horizon} dias úteis`),
    ]),

    h('div', { class: 'macro-section-subhead' }, 'Cenários de Stress'),
    h('div', {}, risk.stress.map(scenario => {
      const severity = Math.abs(scenario.impactPct);
      const color = severity > 15 ? 'var(--red)' : severity > 5 ? 'var(--amber)' : 'var(--green)';
      return h('div', { class: 'card', style: { marginBottom: '10px', borderLeft: `3px solid ${color}`, padding: '16px 20px' } }, [
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } }, [
          h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px' } }, scenario.name),
          h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [
            h('span', { class: 'mono', style: { fontSize: '16px', fontWeight: '600', color } }, `${scenario.impactPct.toFixed(2)}%`),
            h('span', { class: 'mono', style: { fontSize: '12px', color: 'var(--text-faint)' } }, formatBRL(scenario.impactValue)),
          ]),
        ]),
        h('div', { style: { fontSize: '12px', color: 'var(--text-muted)' } }, scenario.desc),
        scenario.liquidityNote && h('div', { class: 'mono', style: { fontSize: '10px', color: scenario.liquidityNote.includes('suficiente') ? 'var(--green)' : 'var(--red)', marginTop: '6px' } }, scenario.liquidityNote),
      ]);
    })),

    // Duration sensitivity table
    h('div', { style: { marginTop: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Sensibilidade à Taxa de Juros'),
      h('div', { class: 'card', style: { padding: 0, overflow: 'hidden' } },
        [
          { label: '+50 bps', impact: risk.duration.impact100bps * 0.5 },
          { label: '+100 bps', impact: risk.duration.impact100bps },
          { label: '+200 bps', impact: risk.duration.impact200bps },
          { label: '+300 bps', impact: risk.duration.impact100bps * 3 },
          { label: '-100 bps', impact: -risk.duration.impact100bps },
          { label: '-200 bps', impact: -risk.duration.impact200bps },
        ].map((row, i) => h('div', {
          style: { display: 'grid', gridTemplateColumns: '100px 1fr 120px', gap: '12px', padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center' },
        }, [
          h('span', { class: 'mono', style: { fontWeight: '600' } }, row.label),
          h('div', { style: { height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' } }, [
            h('div', { style: { width: `${Math.min(100, Math.abs(row.impact / risk.pl) * 100 * 10)}%`, height: '100%', background: row.impact > 0 ? 'var(--green)' : 'var(--red)', borderRadius: '4px' } }),
          ]),
          h('span', { class: 'mono', style: { textAlign: 'right', fontSize: '12px', color: row.impact > 0 ? 'var(--green)' : 'var(--red)' } },
            `${row.impact > 0 ? '+' : ''}${formatBRL(row.impact)} (${row.impact > 0 ? '+' : ''}${(row.impact / risk.pl * 100).toFixed(2)}%)`),
        ]))
      ),
    ]),
  ]);
}

/* ---------- Risk: LGD (Loss Given Default) ---------- */

function renderRiskLGD(risk) {
  const { credit } = risk;
  if (!credit || credit.creditCount === 0) return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Sem ativos de crédito para análise de LGD.');

  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('LGD Portfólio', `${credit.portfolioLGD.toFixed(1)}%`, 'Perda dado default (pond. por valor)'),
      renderPortKPI('Recovery Rate', `${credit.portfolioRecovery.toFixed(1)}%`, 'Taxa de recuperação esperada'),
      renderPortKPI('Perda Esperada', `${credit.expectedLoss.toFixed(3)}%`, 'EL = PD × LGD × EAD'),
      renderPortKPI('PDD Total', formatBRL(credit.totalPDD), `${credit.pddCoveragePct.toFixed(2)}% do crédito`),
    ]),

    h('div', { style: { marginBottom: '12px', fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic' } },
      'LGD estimado: PDD% ÷ PD (probabilidade de default por nível de risco). PD: AA=0.5%, A=1%, B=3%, C=5%, D=10%, E=20%, F=40%, G=60%, H=100%.'),

    h('div', { class: 'macro-section-subhead' }, 'LGD por Ativo'),
    h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
        h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
          ['Ativo', 'Risco', 'PD (%)', 'PDD (%)', 'LGD (%)', 'Recovery (%)', 'Valor Exposto', 'Perda Esperada'].map(col =>
            h('th', { style: { padding: '8px 10px', textAlign: col === 'Ativo' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
          )
        )),
        h('tbody', {},
          (credit.lgdByPosition || [])
            .sort((a, b) => b.lgd - a.lgd)
            .map(p => {
              const el = (p.pd / 100) * (p.lgd / 100) * p.value;
              const lgdColor = p.lgd > 60 ? 'var(--red)' : p.lgd > 30 ? 'var(--amber)' : 'var(--green)';
              return h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                h('td', { class: 'mono', style: { padding: '6px 10px', fontWeight: '600', color: 'var(--amber)', fontSize: '10px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' } }, p.name),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, p.risco || '—'),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, `${p.pd.toFixed(1)}%`),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, `${p.pddPct.toFixed(2)}%`),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: lgdColor } }, `${p.lgd.toFixed(1)}%`),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--green)' } }, `${p.recoveryRate.toFixed(1)}%`),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, formatBRL(p.value)),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: el > 0 ? 'var(--red)' : 'var(--text-faint)' } }, formatBRL(el)),
              ]);
            })
        ),
      ]),
    ]),
  ]);
}

/* ---------- Risk: Days to Liquidate (DTL) ---------- */

function renderRiskDTL(risk, fund) {
  const fp = risk.fundProfile || {};
  const candidates = risk.dtlCandidates || [];
  const pl = risk.pl;

  // For FOFs: estimate DTL based on assumed daily volume
  // Without live API data, use heuristic: FII average daily volume ≈ 0.5-2% of market cap
  // Conservative: assume 0.3% daily participation rate
  const PARTICIPATION_RATE = 0.003; // 0.3% do valor como volume diário estimado
  const MAX_DAILY_PCT = 0.20; // não vender mais que 20% do volume diário

  const dtlPositions = candidates.map(c => {
    const estimatedDailyVol = c.value * PARTICIPATION_RATE;
    const maxDailySell = estimatedDailyVol * MAX_DAILY_PCT;
    const daysToLiquidate = maxDailySell > 0 ? Math.ceil(c.value / maxDailySell) : 999;
    return { ...c, estimatedDailyVol, maxDailySell, daysToLiquidate };
  }).sort((a, b) => b.daysToLiquidate - a.daysToLiquidate);

  // Build liquidation curve
  const totalValue = candidates.reduce((a, c) => a + c.value, 0);
  const maxDays = Math.max(...dtlPositions.map(p => p.daysToLiquidate), 1);
  const liquidationCurve = [];
  for (let day = 0; day <= Math.min(maxDays, 120); day++) {
    let liquidated = 0;
    for (const p of dtlPositions) {
      const sold = Math.min(p.value, p.maxDailySell * day);
      liquidated += sold;
    }
    liquidationCurve.push({ date: `D+${day}`, value: Math.min(liquidated, totalValue) });
  }

  // Milestones
  const find50 = liquidationCurve.findIndex(p => p.value >= totalValue * 0.5);
  const find75 = liquidationCurve.findIndex(p => p.value >= totalValue * 0.75);
  const find90 = liquidationCurve.findIndex(p => p.value >= totalValue * 0.9);
  const find100 = liquidationCurve.findIndex(p => p.value >= totalValue * 0.99);

  if (candidates.length === 0) {
    return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Sem posições em cotas/ações para calcular DTL.');
  }

  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('50% Liquidado', find50 >= 0 ? `D+${find50}` : '>120d', ''),
      renderPortKPI('75% Liquidado', find75 >= 0 ? `D+${find75}` : '>120d', ''),
      renderPortKPI('90% Liquidado', find90 >= 0 ? `D+${find90}` : '>120d', ''),
      renderPortKPI('100% Liquidado', find100 >= 0 ? `D+${find100}` : `>D+${Math.min(maxDays, 120)}`, ''),
    ]),

    h('div', { style: { marginBottom: '12px', fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic' } },
      `Estimativa conservadora: volume diário ≈ ${(PARTICIPATION_RATE * 100).toFixed(1)}% do valor da posição, venda limitada a ${(MAX_DAILY_PCT * 100).toFixed(0)}% do volume. Para dados reais de liquidez, integração com API de mercado seria necessária.`),

    // Liquidation curve chart
    liquidationCurve.length > 1 && h('div', { style: { marginBottom: '24px' } }, [
      renderPanoramaChart('Curva de Liquidação', liquidationCurve.filter((_, i) => i % Math.max(1, Math.floor(liquidationCurve.length / 60)) === 0 || i === liquidationCurve.length - 1), 'R$', 'var(--blue)'),
    ]),

    // Per-position DTL
    h('div', { class: 'macro-section-subhead' }, 'DTL por Posição'),
    h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
        h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
          ['Ativo', 'Valor', '% PL', 'Vol. Diário Est.', 'Max Venda/Dia', 'DTL (dias)'].map(col =>
            h('th', { style: { padding: '8px 10px', textAlign: col === 'Ativo' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
          )
        )),
        h('tbody', {},
          dtlPositions.map(p => {
            const dtlColor = p.daysToLiquidate > 60 ? 'var(--red)' : p.daysToLiquidate > 20 ? 'var(--amber)' : 'var(--green)';
            return h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
              h('td', { class: 'mono', style: { padding: '6px 10px', fontWeight: '600', color: 'var(--amber)' } }, p.ticker),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, formatBRL(p.value)),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)' } }, `${(p.value / pl * 100).toFixed(1)}%`),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, formatBRL(p.estimatedDailyVol)),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, formatBRL(p.maxDailySell)),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: dtlColor } }, `${p.daysToLiquidate}d`),
            ]);
          })
        ),
      ]),
    ]),
  ]);
}

/* ---------- Risk: Real Estate ---------- */

function renderRiskRealEstate(risk) {
  const re = risk.realEstateRisk;
  if (!re) return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Sem imóveis para análise.');

  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('Imóveis', String(re.imovelCount), ''),
      renderPortKPI('Valor Contábil', formatBRL(re.totalContabil), `${(re.totalContabil / risk.pl * 100).toFixed(1)}% PL`),
      renderPortKPI('Cap Rate', `${re.capRate.toFixed(2)}%`, 'Aluguel anual / valor contábil'),
      renderPortKPI('Aluguel Mensal', formatBRL(re.totalAluguel), ''),
      re.totalAtrasado > 0 && renderPortKPI('Aluguéis Atrasados', formatBRL(re.totalAtrasado), `${re.inadimPct.toFixed(1)}% inadimplência`),
      re.questJurCount > 0 && renderPortKPI('Questões Jurídicas', String(re.questJurCount), 'imóvel(is) com pendência'),
    ].filter(Boolean)),

    // Risk assessment
    h('div', { class: 'macro-section-subhead' }, 'Avaliação de Risco Imobiliário'),
    h('div', { class: 'card', style: { padding: 0, overflow: 'hidden' } },
      [
        { cat: 'Cap Rate', level: re.capRate > 8 ? 'Baixo' : re.capRate > 5 ? 'Médio' : 'Alto', detail: `${re.capRate.toFixed(2)}% — ${re.capRate > 8 ? 'Yield atrativo' : re.capRate > 5 ? 'Yield moderado' : 'Yield comprimido, risco de valuation'}` },
        { cat: 'Inadimplência', level: re.inadimPct < 3 ? 'Baixo' : re.inadimPct < 10 ? 'Médio' : 'Alto', detail: `${re.inadimPct.toFixed(1)}% dos aluguéis em atraso` },
        { cat: 'Concentração', level: re.imovelCount > 5 ? 'Baixo' : re.imovelCount > 2 ? 'Médio' : 'Alto', detail: `${re.imovelCount} imóvel(is) — ${re.imovelCount <= 2 ? 'concentração alta em poucos ativos' : 'diversificação adequada'}` },
        { cat: 'Jurídico', level: re.questJurCount === 0 ? 'Baixo' : 'Alto', detail: re.questJurCount === 0 ? 'Sem pendências jurídicas' : `${re.questJurCount} imóvel(is) com questão jurídica` },
      ].map((row, i) => {
        const color = row.level === 'Baixo' ? 'var(--green)' : row.level === 'Médio' ? 'var(--amber)' : 'var(--red)';
        return h('div', {
          style: { display: 'grid', gridTemplateColumns: '140px 80px 1fr', gap: '12px', padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center' },
        }, [
          h('span', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, row.cat),
          h('span', { class: 'mono', style: { fontSize: '11px', padding: '2px 8px', border: `1px solid ${color}`, color, textAlign: 'center', fontWeight: '600' } }, row.level),
          h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, row.detail),
        ]);
      })
    ),
  ]);
}

/* ---------- Risk: Risco de Resgate (open funds only) ---------- */

// === Data helpers ===
function getResgateForecasts(fundId) {
  if (!DB.resgateForecasts) DB.resgateForecasts = {};
  if (!Array.isArray(DB.resgateForecasts[fundId])) DB.resgateForecasts[fundId] = [];
  return DB.resgateForecasts[fundId];
}
function saveResgateForecast(fundId, item) {
  if (!DB.resgateForecasts) DB.resgateForecasts = {};
  if (!Array.isArray(DB.resgateForecasts[fundId])) DB.resgateForecasts[fundId] = [];
  item.updated_at = new Date().toISOString();
  const idx = DB.resgateForecasts[fundId].findIndex(f => f.id === item.id);
  if (idx >= 0) DB.resgateForecasts[fundId][idx] = item;
  else DB.resgateForecasts[fundId].push(item);
  saveDB(DB);
}
function deleteResgateForecast(fundId, id) {
  if (!DB.resgateForecasts) return;
  DB.resgateForecasts[fundId] = (DB.resgateForecasts[fundId] || []).filter(f => f.id !== id);
  saveDB(DB);
}

function getAnbimaMatrix() {
  if (!DB.anbimaMatrix) DB.anbimaMatrix = { data: [], periodo: '', uploadedAt: '' };
  return DB.anbimaMatrix;
}

function getLiquidityHaircuts(fundId) {
  if (!DB.liquidityHaircuts) DB.liquidityHaircuts = {};
  return DB.liquidityHaircuts[fundId] || {};
}
function setLiquidityHaircut(fundId, assetKey, haircut) {
  if (!DB.liquidityHaircuts) DB.liquidityHaircuts = {};
  if (!DB.liquidityHaircuts[fundId]) DB.liquidityHaircuts[fundId] = {};
  DB.liquidityHaircuts[fundId][assetKey] = haircut;
  saveDB(DB);
}

// === ANBIMA CSV Parser ===
function parseAnbimaCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV vazio');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 8) continue;
    rows.push({
      data: cols[0], periodo: cols[1], classe: cols[2], segmento: cols[3],
      tipo: cols[4], metrica: cols[5], prazo: parseInt(cols[6]), valor: parseFloat(cols[7]),
    });
  }
  return rows;
}

function triggerAnbimaUpload() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.csv';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseAnbimaCSV(text);
      DB.anbimaMatrix = { data: rows, periodo: rows[0]?.periodo || '', uploadedAt: new Date().toISOString() };
      saveDB(DB);
      showToast(`Matriz ANBIMA carregada: ${rows.length} registros (${rows[0]?.periodo || '?'})`);
      render();
    } catch (err) { showToast(`Erro: ${err.message}`, true); }
  };
  input.click();
}

// === Render ===
function renderRiskResgate(risk, fund, carteira) {
  const resgateTab = state._resgate_sub || 'forecast';

  return h('div', {}, [
    h('div', { class: 'sec-tab-row', style: { marginBottom: '20px' } },
      [['forecast', 'Previsão de Resgates'], ['anbima', 'Matriz ANBIMA']].map(([k, l]) =>
        h('button', { class: 'sec-tab' + (resgateTab === k ? ' active' : ''), onClick: () => { state._resgate_sub = k; render(); } }, l)
      )
    ),
    resgateTab === 'forecast' ? renderResgateForecast(risk, fund) :
    resgateTab === 'anbima' ? renderAnbimaMatrix(risk, fund, carteira) : null,
  ]);
}

// === PART 1: Redemption Forecast ===
function renderResgateForecast(risk, fund) {
  const forecasts = getResgateForecasts(fund.id);
  const pl = risk.pl;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calculate net projection by period
  const periods = [1, 5, 10, 21, 42, 63, 126, 252];
  const projections = periods.map(days => {
    const cutoff = new Date(today.getTime() + days * 86400000).toISOString().split('T')[0];
    let resgates = 0, aportes = 0;
    for (const f of forecasts) {
      if (f.date <= cutoff && f.date >= todayStr) {
        if (f.type === 'resgate') resgates += parseFloat(f.value) || 0;
        else aportes += parseFloat(f.value) || 0;
      }
    }
    const net = aportes - resgates;
    return { days, cutoff, resgates, aportes, net, netPct: (net / pl) * 100 };
  });

  // Regulatory redemption period (from fund config or default)
  const regPeriod = parseInt(fund.liquidity) || 30; // dias corridos

  return h('div', {}, [
    // KPIs
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' } }, [
      renderPortKPI('PL Atual', formatBRL(pl), ''),
      renderPortKPI('Liquidez Imediata', formatBRL(risk.liquidity.effectiveCash), `${risk.liquidity.cashRatio.toFixed(2)}% PL`),
      renderPortKPI('Resgates Previstos', String(forecasts.filter(f => f.type === 'resgate' && f.date >= todayStr).length), ''),
      renderPortKPI('Prazo Regulamentar', `D+${regPeriod}`, fund.liquidity ? 'Configurado' : 'Padrão D+30'),
    ]),

    // Add new entry
    h('div', { class: 'card', style: { padding: '16px', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber)', marginBottom: '10px' } }, 'Registrar Movimento'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '120px 120px 1fr 150px auto', gap: '10px', alignItems: 'end' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Tipo'), h('select', { class: 'form-field-select', id: 'rf-type' },
          [['resgate', '↓ Resgate'], ['aporte', '↑ Aporte']].map(([v, l]) => h('option', { value: v }, l))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Data Prevista'), h('input', { class: 'form-field-input', type: 'date', id: 'rf-date', value: todayStr }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Operação'), h('input', { class: 'form-field-input', type: 'text', id: 'rf-name', placeholder: 'Ex: Resgate Cotista X' }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Valor (R$)'), h('input', { class: 'form-field-input', type: 'number', step: '0.01', id: 'rf-value', placeholder: '1000000' }) ]),
        h('button', { class: 'btn-primary', onClick: () => {
          const type = document.getElementById('rf-type')?.value;
          const date = document.getElementById('rf-date')?.value;
          const name = document.getElementById('rf-name')?.value?.trim();
          const value = document.getElementById('rf-value')?.value;
          if (!date || !value) { showToast('Data e valor são obrigatórios', true); return; }
          saveResgateForecast(fund.id, { id: 'rf_' + Date.now(), type, date, name: name || (type === 'resgate' ? 'Resgate' : 'Aporte'), value });
          showToast(`${type === 'resgate' ? 'Resgate' : 'Aporte'} registrado`);
          render();
        }}, '+'),
      ]),
    ]),

    // Projection table
    h('div', { class: 'macro-section-subhead' }, 'Projeção de Saldo Líquido'),
    h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
        h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
          ['Período', 'Resgates', 'Aportes', 'Saldo Líquido', '% PL', 'Status'].map(col =>
            h('th', { style: { padding: '8px 12px', textAlign: col === 'Período' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
          )
        )),
        h('tbody', {},
          projections.map(p => {
            const isRegPeriod = p.days === periods.find(d => d >= regPeriod) || p.days === 21;
            const canCover = risk.liquidity.effectiveCash + p.net >= 0;
            const statusColor = p.net >= 0 ? 'var(--green)' : canCover ? 'var(--amber)' : 'var(--red)';
            return h('tr', { style: { borderTop: '1px solid var(--border)', background: isRegPeriod ? 'rgba(184,134,60,0.06)' : 'transparent' } }, [
              h('td', { class: 'mono', style: { padding: '8px 12px', fontWeight: isRegPeriod ? '700' : '400', color: isRegPeriod ? 'var(--amber)' : 'var(--text)' } }, `D+${p.days}${isRegPeriod ? ' ★' : ''}`),
              h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right', color: p.resgates > 0 ? 'var(--red)' : 'var(--text-faint)' } }, p.resgates > 0 ? `-${formatBRL(p.resgates)}` : '—'),
              h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right', color: p.aportes > 0 ? 'var(--green)' : 'var(--text-faint)' } }, p.aportes > 0 ? `+${formatBRL(p.aportes)}` : '—'),
              h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: p.net >= 0 ? 'var(--green)' : 'var(--red)' } }, `${p.net >= 0 ? '+' : ''}${formatBRL(p.net)}`),
              h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, `${p.netPct >= 0 ? '+' : ''}${p.netPct.toFixed(2)}%`),
              h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right', color: statusColor, fontWeight: '500' } },
                p.net >= 0 ? 'OK' : canCover ? 'Caixa cobre' : 'ATENÇÃO'),
            ]);
          })
        ),
      ]),
    ]),

    // Existing entries
    forecasts.length > 0 && h('div', { style: { marginTop: '20px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Movimentos Registrados (${forecasts.length})`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Tipo', 'Data', 'Operação', 'Valor', ''].map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'Operação' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            forecasts.sort((a, b) => a.date.localeCompare(b.date)).map(f => {
              const isPast = f.date < todayStr;
              return h('tr', { style: { borderTop: '1px solid var(--border)', opacity: isPast ? 0.5 : 1 } }, [
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: f.type === 'resgate' ? 'var(--red)' : 'var(--green)', fontWeight: '600' } }, f.type === 'resgate' ? '↓ RESGATE' : '↑ APORTE'),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, f.date),
                h('td', { style: { padding: '6px 12px' } }, f.name || '—'),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, formatBRL(parseFloat(f.value))),
                h('td', { style: { padding: '6px 12px', textAlign: 'right' } }, [
                  h('button', { style: { color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' },
                    onClick: () => { deleteResgateForecast(fund.id, f.id); render(); } }, '×'),
                ]),
              ]);
            })
          ),
        ]),
      ]),
    ]),
  ]);
}

// === PART 2: ANBIMA Matrix ===
function renderAnbimaMatrix(risk, fund, carteira) {
  const matrix = getAnbimaMatrix();
  const haircuts = getLiquidityHaircuts(fund.id);
  const positions = carteira?.positions || {};
  const pl = risk.pl;

  // Fund classification for ANBIMA
  const fundClass = state._anbima_class || detectAnbimaClass(fund);
  const fundSegment = state._anbima_segment || 'VAREJO';

  // Filter matrix data
  const matrixRows = (matrix.data || []).filter(r =>
    r.classe === fundClass && r.segmento === fundSegment && r.tipo === 'Resgate Dados Consolidados'
  );

  // Calculate liquid asset total (with haircuts)
  const allPositions = [
    ...(positions.acoes || []).map(p => ({ key: p.codativo || p.isin, name: p.codativo, value: p.valorfindisp || 0, type: 'ação' })),
    ...(positions.titprivado || []).map(p => ({ key: p.codativo || p.isin, name: p.codativo, value: p.valorfindisp || 0, type: 'tít.privado' })),
    ...(positions.titpublico || []).map(p => ({ key: p.codativo || p.isin, name: p.codativo, value: p.valorfindisp || 0, type: 'tít.público' })),
    ...(positions.cotas || []).map(p => ({ key: p.cnpjfundo || p.isin, name: p.cnpjfundo || p.isin, value: p.valorfindisp || ((p.qtdisponivel||0)*(p.puposicao||0)), type: 'cota' })),
  ].filter(p => p.value > 0);

  const caixaTotal = (positions.caixa || []).reduce((a, c) => a + (c.saldo || 0), 0);
  let totalLiquid = caixaTotal; // caixa always 100% liquid
  for (const p of allPositions) {
    const hc = haircuts[p.key] != null ? haircuts[p.key] : 100; // default 100% = fully liquid
    totalLiquid += p.value * (hc / 100);
  }
  const liquidPct = (totalLiquid / pl) * 100;

  // Build matrix table: prazo x metrica
  const prazos = [1, 2, 3, 4, 5, 10, 21, 42, 63];
  const metricas = ['media_simples', 'EWMA_94', 'EWMA_97'];
  const metricLabels = { media_simples: 'Média', EWMA_94: 'EWMA λ=0.94', EWMA_97: 'EWMA λ=0.97' };

  const matrixTable = {};
  for (const r of matrixRows) {
    if (!matrixTable[r.prazo]) matrixTable[r.prazo] = {};
    matrixTable[r.prazo][r.metrica] = r.valor;
  }

  // Calculate expected redemption vs available liquidity
  const resgateAnalysis = prazos.map(p => {
    const row = matrixTable[p] || {};
    const mediaResgate = row.media_simples || row.EWMA_97 || 0;
    const resgateExpected = mediaResgate * pl;
    const canCover = totalLiquid >= resgateExpected;
    const coverage = resgateExpected > 0 ? (totalLiquid / resgateExpected) : 999;
    return { prazo: p, mediaResgate, resgateExpected, canCover, coverage };
  });

  return h('div', {}, [
    // Status bar
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } },
        matrix.periodo ? `Matriz ANBIMA: ${matrix.periodo} · ${matrix.data?.length || 0} registros` : 'Nenhuma matriz carregada'),
      h('button', { class: 'btn-secondary', style: { fontSize: '10px' }, onClick: triggerAnbimaUpload }, '↑ Upload CSV ANBIMA'),
    ]),

    // Fund classification
    h('div', { class: 'card', style: { padding: '14px 18px', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber)', marginBottom: '10px' } }, 'Classificação do Fundo (para matriz)'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '200px 200px 1fr', gap: '12px', alignItems: 'end' } }, [
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Categoria ANBIMA'),
          h('select', { class: 'form-field-select', value: fundClass, onchange: e => { state._anbima_class = e.target.value; render(); } },
            ['Ações', 'Cambial', 'Multimercados', 'Renda Fixa', 'Renda Fixa Crédito', 'RF DI', 'Previdência Renda Fixa', 'Previdência Multimercados'].map(v =>
              h('option', { value: v, selected: fundClass === v ? 'selected' : null }, v))
          ),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Segmento Investidor'),
          h('select', { class: 'form-field-select', value: fundSegment, onchange: e => { state._anbima_segment = e.target.value; render(); } },
            ['VAREJO', 'PRIVATE', 'PJ', 'EFPC', 'INSTITUCIONAIS', 'OUTROS'].map(v =>
              h('option', { value: v, selected: fundSegment === v ? 'selected' : null }, v))
          ),
        ]),
        h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [
          renderPortKPI('Ativo Líquido', formatBRL(totalLiquid), `${liquidPct.toFixed(1)}% PL`),
        ]),
      ]),
    ]),

    // Matrix table
    matrixRows.length > 0 && h('div', { style: { marginBottom: '20px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Matriz de Probabilidade de Resgate — ${fundClass} / ${fundSegment}`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Prazo (d.u.)', ...metricas.map(m => metricLabels[m]), 'Resgate Esperado', 'Cobertura'].map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'Prazo (d.u.)' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            prazos.filter(p => matrixTable[p]).map(p => {
              const row = matrixTable[p] || {};
              const analysis = resgateAnalysis.find(a => a.prazo === p);
              const covColor = analysis?.coverage > 3 ? 'var(--green)' : analysis?.coverage > 1 ? 'var(--amber)' : 'var(--red)';
              return h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                h('td', { class: 'mono', style: { padding: '8px 12px', fontWeight: '600' } }, `D+${p}`),
                ...metricas.map(m => h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right' } }, row[m] != null ? `${(row[m] * 100).toFixed(2)}%` : '—')),
                h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right', color: 'var(--red)' } }, analysis ? formatBRL(analysis.resgateExpected) : '—'),
                h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: covColor } },
                  analysis ? `${analysis.coverage.toFixed(1)}x` : '—'),
              ]);
            })
          ),
        ]),
      ]),
    ]),

    matrixRows.length === 0 && matrix.data?.length > 0 && h('div', { class: 'card', style: { padding: '20px', textAlign: 'center', color: 'var(--text-faint)' } },
      `Sem dados para ${fundClass} / ${fundSegment}. Altere a classificação acima.`),

    matrixRows.length === 0 && !matrix.data?.length && h('div', { class: 'card', style: { padding: '20px', textAlign: 'center', color: 'var(--text-faint)' } },
      'Faça upload do CSV da matriz ANBIMA para ativar a análise.'),

    // Haircut classification
    allPositions.length > 0 && h('div', { style: { marginTop: '20px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Classificação de Liquidez dos Ativos (Haircut)'),
      h('div', { style: { fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: '10px' } },
        'Defina o percentual de cada ativo que pode ser considerado líquido. 100% = totalmente líquido, 0% = ilíquido. O total ajustado será usado como ativo disponível na análise vs a matriz.'),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Ativo', 'Tipo', 'Valor Bruto', 'Haircut %', 'Valor Líquido'].map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'Ativo' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {}, [
            h('tr', { style: { borderTop: '1px solid var(--border)', background: 'rgba(74,122,44,0.04)' } }, [
              h('td', { class: 'mono', style: { padding: '6px 12px', fontWeight: '600', color: 'var(--green)' } }, 'CAIXA'),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, 'caixa'),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, formatBRL(caixaTotal)),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--green)' } }, '100%'),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, formatBRL(caixaTotal)),
            ]),
            ...allPositions.sort((a, b) => b.value - a.value).map(p => {
              const hc = haircuts[p.key] != null ? haircuts[p.key] : 100;
              const liquidVal = p.value * (hc / 100);
              return h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                h('td', { class: 'mono', style: { padding: '6px 12px', fontWeight: '600', color: 'var(--amber)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' } }, p.name),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontSize: '10px', color: 'var(--text-faint)' } }, p.type),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, formatBRL(p.value)),
                h('td', { style: { padding: '6px 12px', textAlign: 'right' } }, [
                  h('input', {
                    type: 'number', min: '0', max: '100', step: '5', value: String(hc),
                    style: { width: '60px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', padding: '3px 6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: '3px' },
                    onchange: e => { setLiquidityHaircut(fund.id, p.key, parseInt(e.target.value) || 0); render(); },
                  }),
                ]),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500', color: hc < 50 ? 'var(--red)' : hc < 80 ? 'var(--amber)' : 'var(--green)' } }, formatBRL(liquidVal)),
              ]);
            }),
            // Total row
            h('tr', { style: { borderTop: '2px solid var(--border)', background: 'var(--bg-3)' } }, [
              h('td', { style: { padding: '8px 12px', fontFamily: 'Fraunces, serif', fontWeight: '600' } }, 'TOTAL LÍQUIDO'),
              h('td', {}, ''),
              h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right' } }, formatBRL(pl)),
              h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right' } }, `${liquidPct.toFixed(1)}%`),
              h('td', { class: 'mono', style: { padding: '8px 12px', textAlign: 'right', fontWeight: '700', fontFamily: 'Fraunces, serif', fontSize: '14px' } }, formatBRL(totalLiquid)),
            ]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

function detectAnbimaClass(fund) {
  const cl = (fund.classification || '').toLowerCase();
  if (cl.includes('fidc') || cl.includes('credito')) return 'Renda Fixa Crédito';
  if (cl.includes('fia') || cl.includes('acoes')) return 'Ações';
  if (cl.includes('fim') || cl.includes('multi')) return 'Multimercados';
  if (cl.includes('rf') || cl.includes('renda')) return 'Renda Fixa';
  return 'Multimercados';
}

/* ---------- Risk: CVM 175 Compliance Engine ---------- */

function computeCompliance(parsed) {
  const { fund, positions, stats } = parsed;
  const pl = fund.patliq || 1;
  const tipo = parseInt(fund.tipofundo);
  const isFII = tipo === 431;
  const isFIDC = tipo === 348;
  const isFIA = tipo === 501;
  const isFIM = tipo === 555;
  const isFIF = isFIA || isFIM; // RF e Cambial also, but we handle the main ones

  const acoes = positions.acoes || [];
  const titprivado = positions.titprivado || [];
  const titpublico = positions.titpublico || [];
  const cotas = positions.cotas || [];
  const imoveis = positions.imoveis || [];
  const caixa = positions.caixa || [];

  const checks = []; // { rule, ref, limit, actual, status: 'ok'|'warning'|'breach', detail }

  // === HELPER: group by issuer proxy ===
  // We use codativo / cnpjemissor / cnpjfundo as issuer proxy
  const issuerMap = {};
  for (const p of [...acoes, ...titprivado, ...titpublico]) {
    const issuer = p.cnpjemissor || p.codativo || p.isin || '?';
    if (!issuerMap[issuer]) issuerMap[issuer] = { value: 0, positions: [] };
    issuerMap[issuer].value += p.valorfindisp || 0;
    issuerMap[issuer].positions.push(p);
  }
  for (const c of cotas) {
    const issuer = c.cnpjfundo || c.isin || '?';
    if (!issuerMap[issuer]) issuerMap[issuer] = { value: 0, positions: [] };
    issuerMap[issuer].value += c.valorfindisp || ((c.qtdisponivel || 0) * (c.puposicao || 0));
    issuerMap[issuer].positions.push(c);
  }

  // === FIF (FIM/FIA) checks - Anexo Normativo I ===
  if (isFIF) {
    // Bloco 1: Concentration per issuer
    for (const [issuer, data] of Object.entries(issuerMap)) {
      const pct = (data.value / pl) * 100;
      // Conservative: apply 20% IF limit (most common)
      // We can't distinguish IF vs cia aberta from XML alone, so use 20% as general limit
      if (pct > 20) {
        checks.push({ rule: 'Concentração por emissor', ref: 'Art. 44, AN I', limit: '20% PL', actual: `${pct.toFixed(2)}%`, status: 'breach', detail: `Emissor ${issuer}: ${formatBRL(data.value)} (${pct.toFixed(2)}% PL). Limite: 20% IF / 10% Cia Aberta / 5% PJ Privada.` });
      } else if (pct > 10) {
        checks.push({ rule: 'Concentração por emissor', ref: 'Art. 44, AN I', limit: '10% (Cia Aberta)', actual: `${pct.toFixed(2)}%`, status: 'warning', detail: `Emissor ${issuer}: ${pct.toFixed(2)}% PL. OK se IF (≤20%), alerta se Cia Aberta (>10%).` });
      }
    }

    // Bloco 2: Asset class limits (Grupo I)
    const grupoIValue = titprivado.reduce((a, p) => a + (p.valorfindisp || 0), 0) + cotas.filter(c => !isZeragemFund(c.cnpjfundo || c.isin)).reduce((a, c) => a + (c.valorfindisp || ((c.qtdisponivel||0)*(c.puposicao||0))), 0);
    const grupoIPct = (grupoIValue / pl) * 100;
    checks.push({ rule: 'Grupo I (FIDC/FII/CRI/CRA/Deb.)', ref: 'Art. 45, I, AN I', limit: '20% PL', actual: `${grupoIPct.toFixed(2)}%`, status: grupoIPct > 20 ? 'breach' : grupoIPct > 15 ? 'warning' : 'ok', detail: `Inclui títulos privados + cotas de fundos. Limite ampliável a 40% com formador de mercado.` });

    // FIA specific: minimum 67% in equities
    if (isFIA) {
      const rvValue = acoes.reduce((a, p) => a + (p.valorfindisp || 0), 0);
      const rvPct = (rvValue / pl) * 100;
      checks.push({ rule: 'Mínimo em Renda Variável', ref: 'Art. 56, §1º, AN I', limit: '≥67% PL', actual: `${rvPct.toFixed(2)}%`, status: rvPct < 67 ? 'breach' : rvPct < 70 ? 'warning' : 'ok', detail: `Ativos elegíveis: ações, BDR, ETF ações, cotas de classes Ações.` });
    }

    // Credit Private suffix
    const privateValue = titprivado.reduce((a, p) => a + (p.valorfindisp || 0), 0);
    const privatePct = (privateValue / pl) * 100;
    if (privatePct > 50) {
      checks.push({ rule: 'Sufixo "Crédito Privado"', ref: 'Art. 70, AN I', limit: '>50% → obrigatório', actual: `${privatePct.toFixed(2)}%`, status: 'warning', detail: `O fundo possui ${privatePct.toFixed(1)}% em ativos privados. Deve incluir o sufixo "Crédito Privado" e alerta no termo de adesão.` });
    }

    // Margin limits (FIM: 70%)
    if (isFIM) {
      checks.push({ rule: 'Margem bruta máxima', ref: 'Art. 73, III, AN I', limit: '70% PL', actual: 'N/D (sem dados de derivativos)', status: 'ok', detail: 'Verificação requer dados de margem depositada (não disponível no XML padrão).' });
    }
  }

  // === FIDC checks - Anexo Normativo II ===
  if (isFIDC) {
    // Minimum 50% in DC
    const dcValue = titprivado.reduce((a, p) => a + (p.valorfindisp || 0), 0);
    const dcPct = (dcValue / pl) * 100;
    checks.push({ rule: 'Mínimo em Direitos Creditórios', ref: 'Art. 44, AN II', limit: '> 50% PL', actual: `${dcPct.toFixed(2)}%`, status: dcPct < 50 ? 'breach' : dcPct < 55 ? 'warning' : 'ok', detail: `Direitos creditórios: ${formatBRL(dcValue)} (${dcPct.toFixed(1)}% PL).` });

    // Concentration per debtor (20% using cnpjemissor)
    const debtorMap = {};
    for (const p of titprivado) {
      const debtor = p.cnpjemissor || p.codativo || '?';
      if (!debtorMap[debtor]) debtorMap[debtor] = 0;
      debtorMap[debtor] += p.valorfindisp || 0;
    }
    for (const [debtor, value] of Object.entries(debtorMap)) {
      const pct = (value / pl) * 100;
      if (pct > 20) {
        checks.push({ rule: 'Concentração por devedor', ref: 'Art. 45, AN II', limit: '20% PL', actual: `${pct.toFixed(2)}%`, status: 'breach', detail: `Devedor ${debtor}: ${formatBRL(value)} (${pct.toFixed(1)}% PL).` });
      } else if (pct > 15) {
        checks.push({ rule: 'Concentração por devedor', ref: 'Art. 45, AN II', limit: '20% PL', actual: `${pct.toFixed(2)}%`, status: 'warning', detail: `Devedor ${debtor} próximo do limite: ${pct.toFixed(1)}% PL.` });
      }
    }

    // Cotas de mesma classe: 25%
    for (const c of cotas) {
      const val = c.valorfindisp || ((c.qtdisponivel || 0) * (c.puposicao || 0));
      const pct = (val / pl) * 100;
      if (pct > 25) {
        checks.push({ rule: 'Cotas de mesma classe investida', ref: 'Art. 47, AN II', limit: '25% PL', actual: `${pct.toFixed(2)}%`, status: 'breach', detail: `Cota ${c.cnpjfundo || c.isin}: ${pct.toFixed(1)}% PL.` });
      }
    }

    // No exterior: vedado
    checks.push({ rule: 'Ativos no Exterior', ref: 'Art. 44, §3º, AN II', limit: 'Vedado', actual: 'N/D', status: 'ok', detail: 'Verificação manual: FIDC não pode investir em ativos no exterior.' });

    // Derivativos: somente proteção
    checks.push({ rule: 'Derivativos', ref: 'Art. 44, §2º, AN II', limit: 'Somente proteção', actual: 'N/D', status: 'ok', detail: 'Verificação manual: derivativos somente para proteção patrimonial ou troca de indexador.' });
  }

  // === FII checks - Anexo Normativo III ===
  if (isFII) {
    // Closed fund
    checks.push({ rule: 'Regime de Cotas', ref: 'Art. 3º, AN III', limit: 'Fechado (obrigatório)', actual: 'Fechado', status: 'ok', detail: 'FII obrigatoriamente regime fechado. Liquidez via mercado secundário.' });

    // Distribution: 95% of semester result (from Law 8.668)
    checks.push({ rule: 'Distribuição de Rendimentos', ref: 'Lei 8.668, Art. 10', limit: '95% resultado semestral', actual: 'Verificação manual', status: 'warning', detail: '95% do resultado semestral deve ser distribuído em dinheiro. Prazo: 60 dias após o semestre. Verificação requer dados de resultado.' });

    // If FII invests predominantly in VM: follows Anexo I limits
    const vmValue = [...acoes, ...titprivado].reduce((a, p) => a + (p.valorfindisp || 0), 0);
    const vmPct = (vmValue / pl) * 100;
    const imoveisPct = imoveis.reduce((a, im) => a + (im.valorcontabil || 0), 0) / pl * 100;

    if (vmPct > 50 && imoveisPct < 50) {
      checks.push({ rule: 'FII c/ preponderância em VM', ref: 'Art. 40, §4º, AN III', limit: 'Observar AN I', actual: `${vmPct.toFixed(1)}% em VM`, status: 'warning', detail: 'FII com maioria do PL em valores mobiliários deve observar limites do Anexo Normativo I (concentração por emissor e modalidade).' });

      // Apply AN I issuer concentration checks
      for (const [issuer, data] of Object.entries(issuerMap)) {
        const pct = (data.value / pl) * 100;
        if (pct > 20) {
          checks.push({ rule: 'Concentração por emissor (AN I aplicável)', ref: 'Art. 44, AN I via Art. 40, §4º', limit: '20% PL', actual: `${pct.toFixed(2)}%`, status: 'breach', detail: `Emissor ${issuer}: ${pct.toFixed(1)}% PL.` });
        }
      }
    }

    // Real estate risk checks
    if (imoveis.length > 0) {
      const totalAluguel = imoveis.reduce((a, im) => a + (im.aluguelcontratado || 0), 0);
      const totalAtrasado = imoveis.reduce((a, im) => a + (im.aluguelatrasado || 0), 0);
      if (totalAluguel > 0 && totalAtrasado > 0) {
        const inadimPct = (totalAtrasado / totalAluguel) * 100;
        checks.push({ rule: 'Inadimplência de aluguéis', ref: 'Análise prudencial', limit: 'Monitorar', actual: `${inadimPct.toFixed(1)}%`, status: inadimPct > 10 ? 'breach' : inadimPct > 5 ? 'warning' : 'ok', detail: `Aluguéis atrasados: ${formatBRL(totalAtrasado)} de ${formatBRL(totalAluguel)} (${inadimPct.toFixed(1)}%).` });
      }
      const questJur = imoveis.filter(im => im.questjur === 'S');
      if (questJur.length > 0) {
        checks.push({ rule: 'Questões jurídicas em imóveis', ref: 'Análise prudencial', limit: 'Monitorar', actual: `${questJur.length} imóvel(is)`, status: 'warning', detail: `${questJur.length} imóvel(is) com questão jurídica ativa.` });
      }
    }
  }

  // === GENERAL RULES - Parte Geral ===
  // Enquadramento timing
  checks.push({ rule: 'Prazo de enquadramento inicial', ref: isFIDC ? 'Art. 44, AN II' : isFII ? 'Art. 47, II, AN I' : 'Art. 47, I, AN I', limit: isFII || isFIDC ? '180 dias' : '60 dias', actual: 'Verificação manual', status: 'ok', detail: `${isFII || isFIDC ? '180 dias do encerramento da distribuição/início atividades' : '60 dias da 1ª integralização'}.` });

  // Desenquadramento passivo
  checks.push({ rule: 'Comunicação de desenquadramento', ref: 'Art. 46, §1º, AN I / Art. 90, Parte Geral', limit: '10 dias úteis', actual: 'Verificação contínua', status: 'ok', detail: 'Após 10 dias úteis consecutivos de desenquadramento, administrador deve informar CVM. Gestor envia plano de ação.' });

  // Verificação frequency
  checks.push({ rule: 'Frequência de verificação', ref: isFIDC ? 'Art. 45, §5º, AN II' : 'Art. 46, AN I', limit: isFIDC ? 'Mensal (devedores)' : 'Diária (implícita)', actual: 'Automática', status: 'ok', detail: isFIDC ? 'Limites por devedor: verificação mensal com base no PL do mês anterior.' : 'Limites verificados diariamente pelo cálculo de cota.' });

  return { checks, fundType: isFII ? 'FII' : isFIDC ? 'FIDC' : isFIA ? 'FIA' : isFIM ? 'FIM' : 'Fundo' };
}

/* ---------- Render: Compliance CVM 175 ---------- */

function renderRiskCompliance(risk, carteira) {
  if (!carteira) return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Sem carteira para verificar enquadramento.');

  const { checks, fundType } = computeCompliance(carteira);

  const breaches = checks.filter(c => c.status === 'breach');
  const warnings = checks.filter(c => c.status === 'warning');
  const oks = checks.filter(c => c.status === 'ok');

  const overallStatus = breaches.length > 0 ? 'breach' : warnings.length > 0 ? 'warning' : 'ok';
  const overallColor = overallStatus === 'breach' ? 'var(--red)' : overallStatus === 'warning' ? 'var(--amber)' : 'var(--green)';
  const overallLabel = overallStatus === 'breach' ? 'DESENQUADRADO' : overallStatus === 'warning' ? 'ATENÇÃO' : 'ENQUADRADO';

  return h('div', {}, [
    // Overall status
    h('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' } }, [
      h('div', { style: { padding: '12px 24px', border: `2px solid ${overallColor}`, color: overallColor, fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: '700', letterSpacing: '0.1em' } }, overallLabel),
      h('div', {}, [
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px' } }, `Resolução CVM nº 175/2022`),
        h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' } },
          `${fundType} · Carteira ${carteira.fund.dtposicao} · ${checks.length} regra(s) verificada(s)`),
      ]),
    ]),

    // KPIs
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('Total Regras', String(checks.length), ''),
      h('div', { class: 'card', style: { padding: '14px 16px', borderTop: '3px solid var(--red)' } }, [
        h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', marginBottom: '4px' } }, 'Violações'),
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', color: breaches.length > 0 ? 'var(--red)' : 'var(--green)' } }, String(breaches.length)),
      ]),
      h('div', { class: 'card', style: { padding: '14px 16px', borderTop: '3px solid var(--amber)' } }, [
        h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', marginBottom: '4px' } }, 'Alertas'),
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', color: warnings.length > 0 ? 'var(--amber)' : 'var(--green)' } }, String(warnings.length)),
      ]),
      h('div', { class: 'card', style: { padding: '14px 16px', borderTop: '3px solid var(--green)' } }, [
        h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', marginBottom: '4px' } }, 'Conforme'),
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', color: 'var(--green)' } }, String(oks.length)),
      ]),
    ]),

    // Breaches
    breaches.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead', style: { color: 'var(--red)' } }, `Violações (${breaches.length})`),
      ...breaches.map(c => renderComplianceCard(c)),
    ]),

    // Warnings
    warnings.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead', style: { color: 'var(--amber)' } }, `Alertas (${warnings.length})`),
      ...warnings.map(c => renderComplianceCard(c)),
    ]),

    // OK
    oks.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Conforme (${oks.length})`),
      ...oks.map(c => renderComplianceCard(c)),
    ]),

    // Legal note
    h('div', { style: { padding: '16px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-faint)', lineHeight: '1.6', marginTop: '16px' } },
      'Nota: Esta verificação é baseada nos dados disponíveis no arquivo XML CVM e nos parâmetros da Resolução CVM nº 175/2022 (consolidada até Res. 240/2026). Alguns limites dependem de informações não presentes no XML (tipo de emissor, qualificação do investidor, regulamento do fundo) e são apresentados como alertas para verificação manual. Esta ferramenta não substitui o parecer jurídico e de compliance do administrador.'),
  ]);
}

function renderComplianceCard(check) {
  const color = check.status === 'breach' ? 'var(--red)' : check.status === 'warning' ? 'var(--amber)' : 'var(--green)';
  const icon = check.status === 'breach' ? '✗' : check.status === 'warning' ? '◆' : '✓';

  return h('div', { class: 'card', style: { marginBottom: '8px', borderLeft: `3px solid ${color}`, padding: '12px 16px' } }, [
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } }, [
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
        h('span', { style: { color, fontWeight: '700', fontSize: '14px' } }, icon),
        h('span', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, check.rule),
      ]),
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [
        h('span', { class: 'mono', style: { fontSize: '10px', padding: '2px 8px', border: `1px solid var(--border)`, color: 'var(--text-faint)' } }, check.ref),
        h('div', { style: { textAlign: 'right' } }, [
          h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, `Limite: ${check.limit}`),
          h('div', { class: 'mono', style: { fontSize: '12px', fontWeight: '600', color } }, check.actual),
        ]),
      ]),
    ]),
    h('div', { style: { fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' } }, check.detail),
  ]);
}

/* ---------- Risk Report Export ---------- */

function exportRiskReport(fund, risk, carteira) {
  if (!risk) { showToast('Sem dados de risco', true); return; }
  const d = new Date().toLocaleDateString('pt-BR');
  const fp = risk.fundProfile || {};
  let md = `# Relatório de Risco: ${fund.name}\n`;
  md += `**Data:** ${d} · **PL:** ${formatBRL(risk.pl)} · **Tipo:** ${fp.label || '?'} · **Carteira:** ${risk.fund.dtposicao}${fp.isClosed ? ' · Fundo Fechado' : ''}\n\n---\n\n`;

  md += `## Matriz de Risco\n\n| Categoria | Nível | Detalhe |\n|---|---|---|\n`;
  md += `| Concentração | ${risk.concentration.hhi < 0.15 ? 'Baixo' : risk.concentration.hhi < 0.25 ? 'Médio' : 'Alto'} | HHI: ${(risk.concentration.hhi * 10000).toFixed(0)} · Top5: ${risk.concentration.top5Pct.toFixed(1)}% |\n`;
  if (fp.hasCredit) {
    md += `| Crédito (PDD) | ${risk.credit.pddCoveragePct < 5 ? 'Baixo' : risk.credit.pddCoveragePct < 15 ? 'Médio' : 'Alto'} | PDD: ${risk.credit.pddCoveragePct.toFixed(2)}% · LGD: ${risk.credit.portfolioLGD.toFixed(1)}% · Recovery: ${risk.credit.portfolioRecovery.toFixed(1)}% |\n`;
    md += `| Perda Esperada | ${risk.credit.expectedLoss < 1 ? 'Baixo' : risk.credit.expectedLoss < 5 ? 'Médio' : 'Alto'} | EL: ${risk.credit.expectedLoss.toFixed(3)}% |\n`;
  }
  md += `| Liquidez | ${risk.liquidity.cashRatio > 5 ? 'Baixo' : risk.liquidity.cashRatio > 1 ? 'Médio' : 'Alto'} | ${risk.liquidity.cashRatio.toFixed(2)}%${risk.liquidity.zeragemVal > 0 ? ' (incl. zeragem)' : ''} |\n`;
  if (risk.duration.avgDuration > 0) md += `| Mercado | ${risk.duration.avgDuration < 3 ? 'Baixo' : risk.duration.avgDuration < 7 ? 'Médio' : 'Alto'} | Duration: ${risk.duration.avgDuration.toFixed(2)}a |\n`;
  if (risk.var.var95 > 0) md += `| VaR 95% | ${(risk.var.var95 / risk.pl * 100) < 3 ? 'Baixo' : (risk.var.var95 / risk.pl * 100) < 8 ? 'Médio' : 'Alto'} | ${formatBRL(risk.var.var95)} (${(risk.var.var95 / risk.pl * 100).toFixed(2)}% PL) |\n`;
  if (risk.realEstateRisk) md += `| Imobiliário | ${risk.realEstateRisk.inadimPct < 5 ? 'Baixo' : 'Médio/Alto'} | Cap rate: ${risk.realEstateRisk.capRate.toFixed(2)}% · Inadim: ${risk.realEstateRisk.inadimPct.toFixed(1)}% |\n`;
  if (fp.isClosed) md += `| Resgate | N/A | Fundo fechado — sem risco de resgate |\n`;

  md += `\n## Top 5 Posições\n\n| Posição | % PL | Valor |\n|---|---|---|\n`;
  for (const p of risk.concentration.top5) md += `| ${p.name} | ${p.pct.toFixed(2)}% | ${formatBRL(p.value)} |\n`;

  if (fp.hasCredit && risk.credit.lgdByPosition?.length > 0) {
    md += `\n## LGD por Ativo\n\n| Ativo | Risco | PD | PDD | LGD | Recovery |\n|---|---|---|---|---|---|\n`;
    for (const p of risk.credit.lgdByPosition.sort((a, b) => b.lgd - a.lgd).slice(0, 10)) {
      md += `| ${p.name} | ${p.risco || '—'} | ${p.pd.toFixed(1)}% | ${p.pddPct.toFixed(2)}% | ${p.lgd.toFixed(1)}% | ${p.recoveryRate.toFixed(1)}% |\n`;
    }
  }

  md += `\n## Stress Tests\n\n| Cenário | Impacto R$ | Impacto % |\n|---|---|---|\n`;
  for (const s of risk.stress) md += `| ${s.name} | ${formatBRL(s.impactValue)} | ${s.impactPct.toFixed(2)}% |\n`;

  // Compliance
  if (carteira) {
    const { checks } = computeCompliance(carteira);
    const breaches = checks.filter(c => c.status === 'breach');
    const warnings = checks.filter(c => c.status === 'warning');
    md += `\n## Enquadramento CVM 175\n\n`;
    md += `**Status:** ${breaches.length > 0 ? 'DESENQUADRADO' : warnings.length > 0 ? 'ATENÇÃO' : 'ENQUADRADO'} · ${breaches.length} violação(ões) · ${warnings.length} alerta(s)\n\n`;
    if (breaches.length > 0) {
      md += `### Violações\n\n| Regra | Limite | Atual | Ref. |\n|---|---|---|---|\n`;
      for (const c of breaches) md += `| ${c.rule} | ${c.limit} | ${c.actual} | ${c.ref} |\n`;
      md += '\n';
    }
    if (warnings.length > 0) {
      md += `### Alertas\n\n| Regra | Limite | Atual | Ref. |\n|---|---|---|---|\n`;
      for (const c of warnings) md += `| ${c.rule} | ${c.limit} | ${c.actual} | ${c.ref} |\n`;
      md += '\n';
    }
  }

  md += `\n---\n*Gerado por Aegir·Intel em ${d}. Não constitui recomendação.*\n`;

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `risk-report-${fund.name.replace(/\s+/g, '-').substring(0, 30)}-${new Date().toISOString().split('T')[0]}.md`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Relatório de risco exportado');
}

/* ============================================================
   39. ASSETS ANALYSIS
   Análise de ativos para decisão de investimento
   CRI, FII, Debênture — com relatório de investimento
   ============================================================ */

const ASSET_ANALYSIS_TYPES = {
  cri:       { label: 'CRI',        icon: '📄', fields: ['emissor', 'cedente', 'devedor', 'indexador', 'cupom', 'duration', 'rating_ext', 'garantias', 'ltv', 'saldo_devedor'] },
  cci:       { label: 'CCI',        icon: '📋', fields: ['emissor', 'cedente', 'devedor', 'indexador', 'cupom', 'duration', 'garantias', 'saldo_devedor'] },
  debenture: { label: 'Debênture',  icon: '📑', fields: ['emissor', 'indexador', 'cupom', 'duration', 'rating_ext', 'covenants', 'saldo_devedor'] },
  fii:       { label: 'FII',        icon: '🏢', fields: ['segmento', 'tipo_fii', 'pvp', 'dy_12m', 'vacancia', 'inadimplencia_fii', 'num_imoveis', 'abv'] },
  cra:       { label: 'CRA',        icon: '🌾', fields: ['emissor', 'cedente', 'devedor', 'indexador', 'cupom', 'duration', 'rating_ext', 'garantias'] },
};

const ANALYSIS_RATINGS = {
  invest:    { label: 'Investir',     color: 'var(--green)',  icon: '✓' },
  hold:      { label: 'Manter',       color: 'var(--amber)',  icon: '◆' },
  avoid:     { label: 'Não Investir', color: 'var(--red)',    icon: '✗' },
  monitoring:{ label: 'Monitorar',    color: 'var(--blue)',   icon: '◉' },
};

function getAssetAnalyses() {
  if (!Array.isArray(DB.assetAnalyses)) DB.assetAnalyses = [];
  return DB.assetAnalyses;
}

function saveAssetAnalysis(analysis) {
  if (!Array.isArray(DB.assetAnalyses)) DB.assetAnalyses = [];
  analysis.updated_at = new Date().toISOString();
  const idx = DB.assetAnalyses.findIndex(a => a.id === analysis.id);
  if (idx >= 0) DB.assetAnalyses[idx] = analysis;
  else DB.assetAnalyses.push(analysis);
  saveDB(DB);
}

function deleteAssetAnalysis(id) {
  if (!confirm('Excluir esta análise?')) return;
  DB.assetAnalyses = getAssetAnalyses().filter(a => a.id !== id);
  saveDB(DB);
  state._active_asset_analysis = null;
  render();
}

function emptyAssetAnalysis(type) {
  return {
    id: 'aa_' + Date.now(), type: type || 'cri', ticker: '', name: '',
    rating: 'monitoring', analyst: '', fund_target: '',
    // Common fields
    emissor: '', cedente: '', devedor: '', indexador: '', cupom: '', duration: '',
    rating_ext: '', garantias: '', ltv: '', saldo_devedor: '', covenants: '',
    // FII fields
    segmento: '', tipo_fii: '', pvp: '', dy_12m: '', vacancia: '', inadimplencia_fii: '', num_imoveis: '', abv: '',
    // Report sections
    summary: '', credit_analysis: '', structure_analysis: '', market_context: '',
    risk_factors: '', recommendation: '',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

/* ---------- Render: Assets Analysis List ---------- */

function renderAssetsAnalysis() {
  const analyses = getAssetAnalyses();
  const activeId = state._active_asset_analysis;

  if (activeId) {
    const a = analyses.find(x => x.id === activeId);
    if (a) {
      if (state._aa_editing) return renderAssetAnalysisForm(a);
      return renderAssetAnalysisDetail(a);
    }
  }
  if (state._aa_new) return renderAssetAnalysisForm(state._aa_new);

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Assets Analysis', 'Análise de <em>Ativos</em>',
      'Sistema de análise individual de ativos para decisão de investimento. CRI, CCI, FII, Debêntures, CRA — com relatório estruturado e rating proprietário.'),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } }, [
      h('div', { style: { display: 'flex', gap: '6px' } },
        Object.entries(ASSET_ANALYSIS_TYPES).map(([k, v]) =>
          h('button', { class: 'btn-secondary', style: { fontSize: '11px' }, onClick: () => {
            state._aa_new = emptyAssetAnalysis(k);
            render();
          }}, `+ ${v.label}`)
        )
      ),
    ]),

    analyses.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhuma análise de ativo'),
          h('p', { class: 'empty-desc' }, 'Crie uma nova análise para começar a documentar a avaliação de ativos de investimento.'),
        ])
      : h('div', {}, analyses.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).map(a => {
          const type = ASSET_ANALYSIS_TYPES[a.type] || {};
          const rating = ANALYSIS_RATINGS[a.rating] || {};
          return h('div', {
            class: 'card card-hover', style: { cursor: 'pointer', marginBottom: '10px', borderLeft: `3px solid ${rating.color}` },
            onClick: () => { state._active_asset_analysis = a.id; state._aa_editing = false; render(); },
          }, [
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px', gap: '12px', alignItems: 'center' } }, [
              h('div', {}, [
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
                  h('span', {}, type.icon || '📄'),
                  h('span', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px' } }, a.name || a.ticker || 'Sem nome'),
                ]),
                h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '3px' } },
                  `${type.label} · ${a.ticker || '—'} · ${a.emissor || '—'} · ${a.analyst || ''}`),
              ]),
              h('div', { style: { textAlign: 'right' } }, [
                h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, 'Indexador'),
                h('div', { class: 'mono', style: { fontSize: '12px' } }, `${a.indexador || '—'} ${a.cupom ? '+' + a.cupom + '%' : ''}`),
              ]),
              h('span', { class: 'mono', style: { fontSize: '10px', padding: '3px 8px', border: `1px solid ${rating.color}`, color: rating.color, textAlign: 'center' } }, `${rating.icon} ${rating.label}`),
              h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', textAlign: 'right' } }, new Date(a.updated_at).toLocaleDateString('pt-BR')),
            ]),
          ]);
        })),
  ]);
}

/* ---------- Asset Analysis Form ---------- */

function renderAssetAnalysisForm(analysis) {
  const isNew = !getAssetAnalyses().some(a => a.id === analysis.id);
  const type = ASSET_ANALYSIS_TYPES[analysis.type] || {};
  const isFII = analysis.type === 'fii';
  const isCredit = ['cri', 'cci', 'debenture', 'cra'].includes(analysis.type);

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._aa_new = null; state._aa_editing = false; state._active_asset_analysis = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Cancelar'),
    ]),
    h('h1', { class: 'page-title' }, `${isNew ? 'Nova' : 'Editar'} Análise — ${type.icon} ${type.label}`),

    // Identificação
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, 'Identificação'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '100px 1fr 130px 130px 130px', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Ticker'), h('input', { class: 'form-field-input', value: analysis.ticker, oninput: e => analysis.ticker = e.target.value.toUpperCase() }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Nome'), h('input', { class: 'form-field-input', value: analysis.name, placeholder: 'CRI Logística ABC', oninput: e => analysis.name = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Rating'), h('select', { class: 'form-field-select', onchange: e => analysis.rating = e.target.value },
          Object.entries(ANALYSIS_RATINGS).map(([k, v]) => h('option', { value: k, selected: analysis.rating === k ? 'selected' : null }, `${v.icon} ${v.label}`))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Analista'), h('input', { class: 'form-field-input', value: analysis.analyst, oninput: e => analysis.analyst = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Fundo Alvo'), h('select', { class: 'form-field-select', onchange: e => analysis.fund_target = e.target.value }, [
          h('option', { value: '' }, '— Nenhum —'), ...getFunds().map(f => h('option', { value: f.id, selected: analysis.fund_target === f.id ? 'selected' : null }, f.name))]) ]),
      ]),
    ]),

    // Dados do Ativo (credit)
    isCredit && h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, 'Dados da Operação'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Emissor'), h('input', { class: 'form-field-input', value: analysis.emissor, oninput: e => analysis.emissor = e.target.value }) ]),
        analysis.type !== 'debenture' && h('div', {}, [ h('label', { class: 'form-field-label' }, 'Cedente'), h('input', { class: 'form-field-input', value: analysis.cedente, oninput: e => analysis.cedente = e.target.value }) ]),
        analysis.type !== 'debenture' && h('div', {}, [ h('label', { class: 'form-field-label' }, 'Devedor'), h('input', { class: 'form-field-input', value: analysis.devedor, oninput: e => analysis.devedor = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Indexador'), h('select', { class: 'form-field-select', onchange: e => analysis.indexador = e.target.value },
          ['', 'CDI', 'CDI+', 'IPCA+', 'Prefixado', 'IGP-M+', 'TR+'].map(v => h('option', { value: v, selected: analysis.indexador === v ? 'selected' : null }, v || '—'))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Cupom (% a.a.)'), h('input', { class: 'form-field-input', type: 'number', step: '0.01', value: analysis.cupom, oninput: e => analysis.cupom = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Duration (anos)'), h('input', { class: 'form-field-input', type: 'number', step: '0.1', value: analysis.duration, oninput: e => analysis.duration = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Rating Externo'), h('input', { class: 'form-field-input', value: analysis.rating_ext, placeholder: 'Ex: AA (S&P)', oninput: e => analysis.rating_ext = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Saldo Devedor'), h('input', { class: 'form-field-input', value: analysis.saldo_devedor, placeholder: 'R$ 50.000.000', oninput: e => analysis.saldo_devedor = e.target.value }) ]),
        analysis.type === 'cri' && h('div', {}, [ h('label', { class: 'form-field-label' }, 'LTV (%)'), h('input', { class: 'form-field-input', type: 'number', step: '0.1', value: analysis.ltv, oninput: e => analysis.ltv = e.target.value }) ]),
      ].filter(Boolean)),
      h('div', { style: { marginTop: '12px' } }, [ h('label', { class: 'form-field-label' }, 'Garantias'), h('textarea', { class: 'form-field-textarea', rows: '2', value: analysis.garantias, placeholder: 'Alienação fiduciária de imóvel, cessão fiduciária de recebíveis, aval...', oninput: e => analysis.garantias = e.target.value }) ]),
      analysis.type === 'debenture' && h('div', { style: { marginTop: '12px' } }, [ h('label', { class: 'form-field-label' }, 'Covenants'), h('textarea', { class: 'form-field-textarea', rows: '2', value: analysis.covenants, placeholder: 'Dívida Líquida/EBITDA ≤ 3.5x, cobertura de juros ≥ 2.0x...', oninput: e => analysis.covenants = e.target.value }) ]),
    ]),

    // Dados do Ativo (FII)
    isFII && h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, 'Dados do FII'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Segmento'), h('select', { class: 'form-field-select', onchange: e => analysis.segmento = e.target.value },
          ['', 'Logística', 'Lajes Corporativas', 'Shopping', 'Educação', 'Hospitalar', 'Agro', 'Residencial', 'Híbrido', 'Papel', 'Fundo de Fundos', 'Outros'].map(v => h('option', { value: v, selected: analysis.segmento === v ? 'selected' : null }, v || '—'))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Tipo'), h('select', { class: 'form-field-select', onchange: e => analysis.tipo_fii = e.target.value },
          ['', 'Tijolo', 'Papel', 'Híbrido', 'FOF', 'Desenvolvimento'].map(v => h('option', { value: v, selected: analysis.tipo_fii === v ? 'selected' : null }, v || '—'))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'P/VP'), h('input', { class: 'form-field-input', type: 'number', step: '0.01', value: analysis.pvp, oninput: e => analysis.pvp = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'DY 12m (%)'), h('input', { class: 'form-field-input', type: 'number', step: '0.01', value: analysis.dy_12m, oninput: e => analysis.dy_12m = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Vacância (%)'), h('input', { class: 'form-field-input', type: 'number', step: '0.1', value: analysis.vacancia, oninput: e => analysis.vacancia = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Inadimplência (%)'), h('input', { class: 'form-field-input', type: 'number', step: '0.1', value: analysis.inadimplencia_fii, oninput: e => analysis.inadimplencia_fii = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Nº Imóveis'), h('input', { class: 'form-field-input', type: 'number', value: analysis.num_imoveis, oninput: e => analysis.num_imoveis = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'ABL/ABV (m²)'), h('input', { class: 'form-field-input', type: 'number', value: analysis.abv, oninput: e => analysis.abv = e.target.value }) ]),
      ]),
    ]),

    // Relatório de Investimento
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, 'Relatório de Investimento'),
      ...['summary', 'credit_analysis', 'structure_analysis', 'market_context', 'risk_factors', 'recommendation'].map(key => {
        const labels = {
          summary: 'Sumário Executivo', credit_analysis: 'Análise de Crédito / Fundamentos',
          structure_analysis: 'Análise da Estrutura / Operação', market_context: 'Contexto de Mercado',
          risk_factors: 'Fatores de Risco', recommendation: 'Recomendação & Sizing',
        };
        const placeholders = {
          summary: 'Visão geral do ativo: o que é, por que analisar, conclusão preliminar.',
          credit_analysis: isFII ? 'Qualidade dos ativos, histórico de receita, gestão, governança.' : 'Qualidade de crédito do emissor/devedor. Histórico, setor, balanço, capacidade de pagamento.',
          structure_analysis: isFII ? 'Tipo de gestão, política de dividendos, liquidez, diversificação.' : 'Estrutura da operação: subordinação, cascata de pagamentos, triggers, garantias.',
          market_context: 'Cenário macro relevante: taxas de juros, ciclo de crédito, setor do ativo.',
          risk_factors: 'Principais riscos identificados: crédito, liquidez, mercado, operacional, regulatório.',
          recommendation: 'Recomendação final: investir/manter/evitar. Sizing sugerido, condições, preço-alvo.',
        };
        return h('div', { style: { marginBottom: '12px' } }, [
          h('label', { class: 'form-field-label' }, labels[key]),
          h('textarea', { class: 'form-field-textarea', rows: '3', placeholder: placeholders[key],
            style: { fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.6' },
            oninput: e => analysis[key] = e.target.value }, analysis[key] || ''),
        ]);
      }),
    ]),

    // Actions
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
      h('button', { class: 'btn-secondary', onClick: () => { state._aa_new = null; state._aa_editing = false; render(); } }, 'Cancelar'),
      !isNew && h('button', { class: 'btn-secondary', style: { color: 'var(--red)' }, onClick: () => { deleteAssetAnalysis(analysis.id); state._aa_new = null; state._aa_editing = false; } }, 'Excluir'),
      h('button', { class: 'btn-primary', onClick: () => {
        if (!analysis.name?.trim() && !analysis.ticker?.trim()) { showToast('Nome ou ticker é obrigatório', true); return; }
        saveAssetAnalysis(analysis);
        state._aa_new = null; state._aa_editing = false;
        state._active_asset_analysis = analysis.id;
        showToast('Análise salva');
        render();
      }}, 'Salvar Análise'),
    ]),
  ]);
}

/* ---------- Asset Analysis Detail ---------- */

function renderAssetAnalysisDetail(a) {
  const type = ASSET_ANALYSIS_TYPES[a.type] || {};
  const rating = ANALYSIS_RATINGS[a.rating] || {};
  const isCredit = ['cri', 'cci', 'debenture', 'cra'].includes(a.type);
  const isFII = a.type === 'fii';
  const fund = a.fund_target ? getFund(a.fund_target) : null;

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._active_asset_analysis = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Todas as análises'),
    ]),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' } }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, `${type.icon} ${type.label} · Assets Analysis`),
        h('h1', { class: 'page-title' }, a.name || a.ticker || 'Sem nome'),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' } }, [
          h('span', { style: { padding: '3px 10px', border: `1px solid ${rating.color}`, color: rating.color, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' } }, `${rating.icon} ${rating.label}`),
          a.ticker && h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, a.ticker),
          a.analyst && h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, `Analista: ${a.analyst}`),
          fund && h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, `Fundo: ${fund.name}`),
        ]),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-secondary', onClick: () => { state._aa_editing = true; render(); } }, 'Editar'),
        h('button', { class: 'btn-secondary', onClick: () => exportAssetAnalysisReport(a) }, '↓ Relatório .md'),
      ]),
    ]),

    // Data card
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
      isCredit && a.emissor && renderPortKPI('Emissor', a.emissor, ''),
      isCredit && a.indexador && renderPortKPI('Indexador', `${a.indexador}${a.cupom ? ' +' + a.cupom + '%' : ''}`, ''),
      isCredit && a.duration && renderPortKPI('Duration', `${a.duration} anos`, ''),
      isCredit && a.rating_ext && renderPortKPI('Rating Externo', a.rating_ext, ''),
      isCredit && a.ltv && renderPortKPI('LTV', `${a.ltv}%`, ''),
      isCredit && a.saldo_devedor && renderPortKPI('Saldo Devedor', a.saldo_devedor, ''),
      isFII && a.segmento && renderPortKPI('Segmento', a.segmento, a.tipo_fii || ''),
      isFII && a.pvp && renderPortKPI('P/VP', a.pvp, ''),
      isFII && a.dy_12m && renderPortKPI('DY 12m', `${a.dy_12m}%`, ''),
      isFII && a.vacancia && renderPortKPI('Vacância', `${a.vacancia}%`, ''),
      isFII && a.num_imoveis && renderPortKPI('Nº Imóveis', a.num_imoveis, a.abv ? `${a.abv} m² ABL` : ''),
    ].filter(Boolean)),

    // Garantias/Covenants
    (a.garantias || a.covenants) && h('div', { style: { display: 'grid', gridTemplateColumns: a.garantias && a.covenants ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '24px' } }, [
      a.garantias && h('div', { class: 'card', style: { padding: '14px 18px' } }, [
        h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' } }, 'Garantias'),
        h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' } }, a.garantias),
      ]),
      a.covenants && h('div', { class: 'card', style: { padding: '14px 18px' } }, [
        h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' } }, 'Covenants'),
        h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' } }, a.covenants),
      ]),
    ].filter(Boolean)),

    // Report sections
    ...['summary', 'credit_analysis', 'structure_analysis', 'market_context', 'risk_factors', 'recommendation'].map((key, i) => {
      if (!a[key]) return null;
      const labels = { summary: 'Sumário Executivo', credit_analysis: 'Análise de Crédito', structure_analysis: 'Estrutura da Operação', market_context: 'Contexto de Mercado', risk_factors: 'Fatores de Risco', recommendation: 'Recomendação' };
      return h('div', { style: { marginBottom: '20px' } }, [
        sectionHead(String(i + 1).padStart(2, '0'), labels[key], ''),
        h('div', { class: 'card', style: { padding: '20px 24px', fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.75', color: 'var(--text-muted)' } }, a[key]),
      ]);
    }).filter(Boolean),
  ]);
}

function exportAssetAnalysisReport(a) {
  const type = ASSET_ANALYSIS_TYPES[a.type] || {};
  const rating = ANALYSIS_RATINGS[a.rating] || {};
  let md = `# Relatório de Investimento: ${a.name || a.ticker}\n\n`;
  md += `**Tipo:** ${type.label} · **Rating:** ${rating.icon} ${rating.label} · **Analista:** ${a.analyst || '—'} · **Data:** ${new Date(a.updated_at).toLocaleDateString('pt-BR')}\n\n---\n\n`;
  if (a.emissor) md += `**Emissor:** ${a.emissor}\n`;
  if (a.indexador) md += `**Indexador:** ${a.indexador}${a.cupom ? ' +' + a.cupom + '%' : ''}\n`;
  if (a.duration) md += `**Duration:** ${a.duration} anos\n`;
  if (a.rating_ext) md += `**Rating Externo:** ${a.rating_ext}\n`;
  if (a.garantias) md += `**Garantias:** ${a.garantias}\n`;
  md += '\n';
  const sections = { summary: 'Sumário Executivo', credit_analysis: 'Análise de Crédito', structure_analysis: 'Estrutura', market_context: 'Contexto de Mercado', risk_factors: 'Riscos', recommendation: 'Recomendação' };
  for (const [key, label] of Object.entries(sections)) {
    if (a[key]) md += `## ${label}\n\n${a[key]}\n\n`;
  }
  md += `---\n*Gerado por Aegir·Intel em ${new Date().toLocaleDateString('pt-BR')}. Confidencial.*\n`;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `relatorio-${a.type}-${(a.name || a.ticker || 'ativo').replace(/\s+/g, '-').substring(0, 30)}.md`;
  anchor.click(); URL.revokeObjectURL(url);
  showToast('Relatório exportado');
}

/* ============================================================
   40. EQUITY PORTFOLIO
   Cadastro manual de empreendimentos imobiliários
   ============================================================ */

const EQUITY_STAGES = {
  prospection:   { label: 'Prospecção',     color: 'var(--blue)' },
  due_diligence: { label: 'Due Diligence',  color: 'var(--amber)' },
  approved:      { label: 'Aprovado',       color: 'var(--green)' },
  construction:  { label: 'Em Construção',  color: '#d4a574' },
  delivered:     { label: 'Entregue',       color: 'var(--green)' },
  sold:          { label: 'Vendido/Saída',  color: 'var(--text-faint)' },
};

const EQUITY_TYPES = {
  residential: 'Residencial', commercial: 'Comercial', logistics: 'Logística',
  mixed: 'Uso Misto', land: 'Terreno', hotel: 'Hotel', other: 'Outro',
};

function getEquityAssets() {
  if (!Array.isArray(DB.equityAssets)) DB.equityAssets = [];
  return DB.equityAssets;
}

function saveEquityAsset(asset) {
  if (!Array.isArray(DB.equityAssets)) DB.equityAssets = [];
  asset.updated_at = new Date().toISOString();
  const idx = DB.equityAssets.findIndex(a => a.id === asset.id);
  if (idx >= 0) DB.equityAssets[idx] = asset;
  else DB.equityAssets.push(asset);
  saveDB(DB);
}

function deleteEquityAsset(id) {
  if (!confirm('Excluir este empreendimento?')) return;
  DB.equityAssets = getEquityAssets().filter(a => a.id !== id);
  saveDB(DB); state._active_equity = null; render();
}

function renderEquityPortfolio() {
  const assets = getEquityAssets();
  const activeId = state._active_equity;

  if (activeId) {
    const a = assets.find(x => x.id === activeId);
    if (a) {
      if (state._eq_editing) return renderEquityForm(a);
      return renderEquityDetail(a);
    }
  }
  if (state._eq_new) return renderEquityForm(state._eq_new);

  // Aggregate stats
  const totalVGV = assets.reduce((a, e) => a + (parseFloat(e.vgv) || 0), 0);
  const totalInvested = assets.reduce((a, e) => a + (parseFloat(e.invested) || 0), 0);
  const totalUnits = assets.reduce((a, e) => a + (parseInt(e.total_units) || 0), 0);
  const byStage = {};
  for (const a of assets) { const s = a.stage || 'prospection'; byStage[s] = (byStage[s] || 0) + 1; }

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Equity Portfolio', 'Equity <em>Portfolio</em>',
      'Portfólio de empreendimentos imobiliários da gestora. Cadastro, acompanhamento de fase e indicadores de cada projeto.'),

    h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' } }, [
      h('button', { class: 'btn-primary', onClick: () => {
        state._eq_new = {
          id: 'eq_' + Date.now(), name: '', type: 'residential', stage: 'prospection',
          fund_id: '', city: '', state_uf: '', address: '',
          total_units: '', total_area: '', vgv: '', invested: '', equity_pct: '',
          expected_return: '', expected_irr: '', construction_start: '', delivery_date: '',
          developer: '', architect: '', sales_pct: '',
          description: '', notes: '',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        render();
      }}, '+ Novo Empreendimento'),
    ]),

    // KPIs
    assets.length > 0 && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('Empreendimentos', String(assets.length), ''),
      renderPortKPI('VGV Total', totalVGV > 0 ? formatBRL(totalVGV) : '—', 'Valor Geral de Venda'),
      renderPortKPI('Investido', totalInvested > 0 ? formatBRL(totalInvested) : '—', ''),
      renderPortKPI('Unidades Total', totalUnits > 0 ? totalUnits.toLocaleString('pt-BR') : '—', ''),
      ...Object.entries(byStage).map(([stage, count]) => {
        const st = EQUITY_STAGES[stage] || {};
        return renderPortKPI(st.label || stage, String(count), '');
      }),
    ]),

    assets.length === 0
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhum empreendimento cadastrado'),
          h('p', { class: 'empty-desc' }, 'Cadastre empreendimentos imobiliários investidos pela gestora.'),
        ])
      : h('div', {}, assets.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).map(a => {
          const st = EQUITY_STAGES[a.stage] || {};
          const tp = EQUITY_TYPES[a.type] || a.type;
          const fund = a.fund_id ? getFund(a.fund_id) : null;
          return h('div', {
            class: 'card card-hover', style: { cursor: 'pointer', marginBottom: '10px', borderLeft: `3px solid ${st.color || 'var(--border)'}` },
            onClick: () => { state._active_equity = a.id; state._eq_editing = false; render(); },
          }, [
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px', gap: '12px', alignItems: 'center' } }, [
              h('div', {}, [
                h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px' } }, a.name || 'Sem nome'),
                h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '3px' } },
                  `${tp} · ${a.city || '—'}/${a.state_uf || '—'} · ${fund ? fund.name : '—'} · ${a.developer || ''}`),
              ]),
              h('div', { style: { textAlign: 'right' } }, [
                h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, 'VGV'),
                h('div', { class: 'mono', style: { fontSize: '13px' } }, a.vgv ? formatBRL(parseFloat(a.vgv)) : '—'),
              ]),
              h('div', { style: { textAlign: 'right' } }, [
                h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, 'Vendas'),
                h('div', { class: 'mono', style: { fontSize: '13px' } }, a.sales_pct ? `${a.sales_pct}%` : '—'),
              ]),
              h('span', { class: 'mono', style: { fontSize: '10px', padding: '3px 8px', border: `1px solid ${st.color}`, color: st.color, textAlign: 'center' } }, st.label || a.stage),
            ]),
          ]);
        })),
  ]);
}

function renderEquityForm(asset) {
  const isNew = !getEquityAssets().some(a => a.id === asset.id);

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._eq_new = null; state._eq_editing = false; state._active_equity = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Cancelar'),
    ]),
    h('h1', { class: 'page-title' }, isNew ? 'Novo Empreendimento' : `Editar: ${asset.name}`),

    // Identificação
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, 'Identificação'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Nome'), h('input', { class: 'form-field-input', value: asset.name, placeholder: 'Residencial Aurora', oninput: e => asset.name = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Tipo'), h('select', { class: 'form-field-select', onchange: e => asset.type = e.target.value },
          Object.entries(EQUITY_TYPES).map(([k, v]) => h('option', { value: k, selected: asset.type === k ? 'selected' : null }, v))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Fase'), h('select', { class: 'form-field-select', onchange: e => asset.stage = e.target.value },
          Object.entries(EQUITY_STAGES).map(([k, v]) => h('option', { value: k, selected: asset.stage === k ? 'selected' : null }, v.label))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Fundo'), h('select', { class: 'form-field-select', onchange: e => asset.fund_id = e.target.value }, [
          h('option', { value: '' }, '— Nenhum —'), ...getFunds().map(f => h('option', { value: f.id, selected: asset.fund_id === f.id ? 'selected' : null }, f.name))]) ]),
      ]),
    ]),

    // Localização
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, 'Localização'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 150px 1fr', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Cidade'), h('input', { class: 'form-field-input', value: asset.city, oninput: e => asset.city = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'UF'), h('input', { class: 'form-field-input', value: asset.state_uf, maxLength: '2', placeholder: 'GO', oninput: e => asset.state_uf = e.target.value.toUpperCase() }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Endereço'), h('input', { class: 'form-field-input', value: asset.address, oninput: e => asset.address = e.target.value }) ]),
      ]),
    ]),

    // Dados financeiros & físicos
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--amber)', marginBottom: '12px' } }, 'Dados do Empreendimento'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Total de Unidades'), h('input', { class: 'form-field-input', type: 'number', value: asset.total_units, oninput: e => asset.total_units = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Área Total (m²)'), h('input', { class: 'form-field-input', type: 'number', value: asset.total_area, oninput: e => asset.total_area = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'VGV (R$)'), h('input', { class: 'form-field-input', type: 'number', value: asset.vgv, placeholder: '50000000', oninput: e => asset.vgv = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Investido (R$)'), h('input', { class: 'form-field-input', type: 'number', value: asset.invested, oninput: e => asset.invested = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, '% Equity'), h('input', { class: 'form-field-input', type: 'number', step: '0.1', value: asset.equity_pct, oninput: e => asset.equity_pct = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, '% Vendas'), h('input', { class: 'form-field-input', type: 'number', step: '0.1', value: asset.sales_pct, oninput: e => asset.sales_pct = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Retorno Esperado'), h('input', { class: 'form-field-input', value: asset.expected_return, placeholder: 'Ex: CDI + 5%', oninput: e => asset.expected_return = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'TIR Esperada (%)'), h('input', { class: 'form-field-input', type: 'number', step: '0.1', value: asset.expected_irr, oninput: e => asset.expected_irr = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Início Obra'), h('input', { class: 'form-field-input', type: 'date', value: asset.construction_start, onchange: e => asset.construction_start = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Previsão Entrega'), h('input', { class: 'form-field-input', type: 'date', value: asset.delivery_date, onchange: e => asset.delivery_date = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Incorporador'), h('input', { class: 'form-field-input', value: asset.developer, oninput: e => asset.developer = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Arquiteto'), h('input', { class: 'form-field-input', value: asset.architect, oninput: e => asset.architect = e.target.value }) ]),
      ]),
    ]),

    // Descrição
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '12px' } }, [
      h('label', { class: 'form-field-label' }, 'Descrição do Empreendimento'),
      h('textarea', { class: 'form-field-textarea', rows: '3', placeholder: 'Descrição geral: localização, diferencial, público-alvo, tipologia.', oninput: e => asset.description = e.target.value }, asset.description || ''),
      h('label', { class: 'form-field-label', style: { marginTop: '12px' } }, 'Notas / Observações'),
      h('textarea', { class: 'form-field-textarea', rows: '2', placeholder: 'Anotações internas.', oninput: e => asset.notes = e.target.value }, asset.notes || ''),
    ]),

    // Actions
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
      h('button', { class: 'btn-secondary', onClick: () => { state._eq_new = null; state._eq_editing = false; render(); } }, 'Cancelar'),
      !isNew && h('button', { class: 'btn-secondary', style: { color: 'var(--red)' }, onClick: () => { deleteEquityAsset(asset.id); state._eq_new = null; state._eq_editing = false; } }, 'Excluir'),
      h('button', { class: 'btn-primary', onClick: () => {
        if (!asset.name?.trim()) { showToast('Nome é obrigatório', true); return; }
        saveEquityAsset(asset);
        state._eq_new = null; state._eq_editing = false;
        state._active_equity = asset.id;
        showToast('Empreendimento salvo'); render();
      }}, 'Salvar'),
    ]),
  ]);
}

function renderEquityDetail(a) {
  const st = EQUITY_STAGES[a.stage] || {};
  const tp = EQUITY_TYPES[a.type] || a.type;
  const fund = a.fund_id ? getFund(a.fund_id) : null;

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._active_equity = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Todos os empreendimentos'),
    ]),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' } }, [
      h('div', {}, [
        h('div', { class: 'page-kicker' }, `${tp} · Equity Portfolio`),
        h('h1', { class: 'page-title' }, a.name),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' } }, [
          h('span', { style: { padding: '3px 10px', border: `1px solid ${st.color}`, color: st.color, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' } }, st.label),
          h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, `${a.city || '—'}/${a.state_uf || '—'}`),
          fund && h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, `Fundo: ${fund.name}`),
        ]),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-secondary', onClick: () => { state._eq_editing = true; render(); } }, 'Editar'),
        h('button', { class: 'btn-secondary', style: { color: 'var(--red)', fontSize: '11px' }, onClick: () => deleteEquityAsset(a.id) }, 'Excluir'),
        // Stage changer
        h('select', { class: 'form-field-select', style: { width: '140px', fontSize: '11px' },
          onchange: e => { a.stage = e.target.value; saveEquityAsset(a); render(); },
        }, Object.entries(EQUITY_STAGES).map(([k, v]) => h('option', { value: k, selected: a.stage === k ? 'selected' : null }, v.label))),
      ]),
    ]),

    // KPIs
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
      a.vgv && renderPortKPI('VGV', formatBRL(parseFloat(a.vgv)), 'Valor Geral de Venda'),
      a.invested && renderPortKPI('Investido', formatBRL(parseFloat(a.invested)), a.equity_pct ? `${a.equity_pct}% equity` : ''),
      a.total_units && renderPortKPI('Unidades', a.total_units, a.total_area ? `${parseInt(a.total_area).toLocaleString('pt-BR')} m²` : ''),
      a.sales_pct && renderPortKPI('Vendas', `${a.sales_pct}%`, a.total_units ? `${Math.round(a.sales_pct / 100 * a.total_units)} de ${a.total_units}` : ''),
      a.expected_irr && renderPortKPI('TIR Esperada', `${a.expected_irr}%`, a.expected_return || ''),
      a.construction_start && renderPortKPI('Início Obra', a.construction_start, ''),
      a.delivery_date && renderPortKPI('Entrega', a.delivery_date, ''),
      a.developer && renderPortKPI('Incorporador', a.developer, a.architect ? `Arq: ${a.architect}` : ''),
    ].filter(Boolean)),

    // Description
    a.description && h('div', { style: { marginBottom: '20px' } }, [
      sectionHead('01', 'Descrição', ''),
      h('div', { class: 'card', style: { padding: '20px 24px', fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.75', color: 'var(--text-muted)' } }, a.description),
    ]),

    a.address && h('div', { style: { marginBottom: '20px' } }, [
      sectionHead('02', 'Localização', ''),
      h('div', { class: 'card', style: { padding: '16px 20px' } }, [
        h('div', { class: 'mono', style: { fontSize: '12px' } }, a.address),
        h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' } }, `${a.city || ''}${a.state_uf ? '/' + a.state_uf : ''}`),
      ]),
    ]),

    a.notes && h('div', { style: { marginBottom: '20px' } }, [
      sectionHead('03', 'Notas', ''),
      h('div', { class: 'card', style: { padding: '16px 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' } }, a.notes),
    ]),
  ]);
}

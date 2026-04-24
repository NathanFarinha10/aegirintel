
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
        <div style="padding:40px;max-width:800px;margin:0 auto;font-family:'Geist',sans-serif;color:#e8e0d0">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.3em;color:#b85c5c;text-transform:uppercase;margin-bottom:12px">Render Error</div>
          <h1 style="font-family:'Fraunces',serif;font-size:32px;margin-bottom:16px">Algo quebrou nesta tela</h1>
          <p style="color:#a89e8f;font-size:13px;margin-bottom:20px;line-height:1.6">
            A aplicação lançou um erro ao renderizar. Seus dados estão seguros no LocalStorage.
            Tente voltar para o Hub, recarregar a página, ou me mandar o erro abaixo.
          </p>
          <pre style="padding:16px;background:#141210;border:1px solid #b85c5c;font-family:'JetBrains Mono',monospace;font-size:11px;color:#c89b7a;white-space:pre-wrap;word-break:break-word;margin-bottom:20px">${(err.stack || err.message || String(err)).replace(/</g,'&lt;')}</pre>
          <div style="display:flex;gap:12px">
            <button onclick="state.view='int_hub';state.detail=null;render()" style="padding:10px 20px;border:1px solid #d4a574;color:#d4a574;background:transparent;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer">← Voltar ao Hub</button>
            <button onclick="location.reload()" style="padding:10px 20px;border:1px solid #2a2621;color:#a89e8f;background:transparent;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer">Recarregar página</button>
          </div>
        </div>
      `;
    }
  }
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
      case 'int_brief':    content = renderMorningBrief(); break;
      case 'int_hub':      content = renderIntHub(); break;
      case 'int_macro':    content = renderGrid('macro',    'Macro View',        'Consenso de outlook para países e regiões'); break;
      case 'int_assets':   content = renderGrid('asset',    'Assets View',       'Classes de ativos — equities, fixed income, alternativos'); break;
      case 'int_micro':    content = renderGrid('micro',    'MicroAssets View',  'Subclasses e fatores de investimento'); break;
      case 'int_thematic': content = renderGrid('thematic', 'Thematic View',     'Temas estruturais e tendências disruptivas'); break;
      case 'int_scenery':  content = renderGrid('scenery',  'Scenery View',      'Cenários macroeconômicos — como as gestoras estão posicionadas para cada eventualidade'); break;
      case 'int_search':   content = renderSearchView(); break;
      case 'int_report':   content = renderReportBuilder(); break;
      case 'int_data':     content = renderDataView(); break;
      case 'sec_search':    content = renderSecSearch(); break;
      case 'sec_watchlist': content = renderWatchlistView(); break;
      case 'sec_compare':   content = renderSecurityCompare(); break;
      case 'mi_dashboard':  content = renderMacroDashboard(); break;
      case 'mi_realestate': content = renderRealEstateLens(); break;
      case 'mi_credit':     content = renderCreditLens(); break;
      case 'mi_sectoral':     content = renderSectoralIndicators(); break;
      case 'mi_fed':           content = renderFEDDashboard(); break;
      case 'mi_analysis':      content = renderAdvancedAnalysis(); break;
      case 'mi_report':        content = renderMacroReport(); break;
      case 'mi_centralbanks': content = renderCentralBanks(); break;
      case 'mi_cb_review':    content = renderCBReview(); break;
      case 'mi_calendar':   content = renderEventCalendar(); break;
      case 'am_funds':      content = renderFundsList(); break;
      case 'am_new':        if (!state._fund_edit) state._fund_edit = emptyFund(); content = renderFundForm(); break;
      case 'am_edit':       content = renderFundForm(); break;
      case 'str_hub':      content = renderStrHub(); break;
      case 'str_models':   content = renderPortfoliosGrid('model',    'Model Portfolios',    'Portfólios modelo com alocação sugerida. Tilts baseados no consenso são aplicáveis com um clique.'); break;
      case 'str_thematic': content = renderPortfoliosGrid('thematic', 'Thematic Portfolios', 'Portfólios construídos em torno de temas de investimento estruturais.'); break;
      case 'str_scenery':  content = renderPortfoliosGrid('scenery',  'Scenery Portfolios',  'Portfólios táticos disparados por cenários macroeconômicos específicos.'); break;
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
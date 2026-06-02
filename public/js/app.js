/* Aegir·Intel Lite — Asset Management Only */

// ========== CORE HELPERS ==========
const DB_KEY = 'aegir_intel_v1';

// Supabase
const SB_URL = 'https://gvozgtxkrspmzvvzxomb.supabase.co';
const SB_KEY = 'sb_publishable_OKjBqNDUynNhm9_FnR-M3A_x3NQLu0I';

// Auth state
let _session = JSON.parse(localStorage.getItem('aegir_session') || 'null');
let _user = null; // { id, email, name, role }
let _allUsers = [];
let _dbReady = false;

function sbHeaders() {
  const h = { 'apikey': SB_KEY, 'Content-Type': 'application/json' };
  if (_session?.access_token) h['Authorization'] = 'Bearer ' + _session.access_token;
  else h['Authorization'] = 'Bearer ' + SB_KEY;
  return h;
}

// === Auth Functions ===
async function authSignUp(email, password, name) {
  const resp = await fetch(SB_URL + '/auth/v1/signup', {
    method: 'POST', headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!resp.ok) { const e = await resp.json(); throw new Error(e.error_description || e.msg || e.error?.message || 'Erro no cadastro'); }
  const data = await resp.json();
  if (!data.access_token) throw new Error('Cadastro falhou — verifique se a confirmação de email está desativada no Supabase');
  _session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
  localStorage.setItem('aegir_session', JSON.stringify(_session));
  // Create profile manually
  await fetch(SB_URL + '/rest/v1/profiles', {
    method: 'POST', headers: { ...sbHeaders(), 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: data.user.id, email, name, role: 'analista' }),
  });
  return data;
}

async function authLogin(email, password) {
  const resp = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!resp.ok) { const e = await resp.json(); throw new Error(e.error_description || e.msg || 'Email ou senha inválidos'); }
  const data = await resp.json();
  if (!data.access_token) throw new Error('Login falhou');
  _session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
  localStorage.setItem('aegir_session', JSON.stringify(_session));
  return data;
}

async function validateSession() {
  if (!_session?.access_token) { _session = null; return false; }
  try {
    const resp = await fetch(SB_URL + '/auth/v1/user', {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + _session.access_token },
    });
    if (!resp.ok) {
      // Try refresh
      if (_session.refresh_token) {
        const rr = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: _session.refresh_token }),
        });
        if (rr.ok) {
          const rd = await rr.json();
          _session = { access_token: rd.access_token, refresh_token: rd.refresh_token, user: rd.user };
          localStorage.setItem('aegir_session', JSON.stringify(_session));
          return true;
        }
      }
      _session = null; localStorage.removeItem('aegir_session'); return false;
    }
    return true;
  } catch { _session = null; localStorage.removeItem('aegir_session'); return false; }
}

function authLogout() {
  _session = null; _user = null;
  localStorage.removeItem('aegir_session');
  render();
}

async function loadUserProfile() {
  if (!_session?.user?.id) return null;
  try {
    const resp = await fetch(SB_URL + '/rest/v1/profiles?id=eq.' + _session.user.id + '&select=*', { headers: sbHeaders() });
    if (!resp.ok) return null;
    const rows = await resp.json();
    _user = rows[0] || { id: _session.user.id, email: _session.user.email, name: _session.user.email.split('@')[0], role: 'analista' };
    return _user;
  } catch { return null; }
}

async function loadAllUsers() {
  try {
    const resp = await fetch(SB_URL + '/rest/v1/profiles?select=id,email,name,role&order=name', { headers: sbHeaders() });
    if (!resp.ok) return [];
    _allUsers = await resp.json();
    return _allUsers;
  } catch { return []; }
}

async function updateUserRole(userId, newRole) {
  await fetch(SB_URL + '/rest/v1/profiles?id=eq.' + userId, {
    method: 'PATCH', headers: sbHeaders(),
    body: JSON.stringify({ role: newRole }),
  });
  await loadAllUsers();
}

// Role definitions
const ROLES = {
  admin:      { label: 'Administrador', level: 4, desc: 'Acesso total + gestão de usuários' },
  gestor:     { label: 'Gestor',        level: 3, desc: 'Aprovar trades, comitês, todas as funções' },
  analista:   { label: 'Analista',      level: 2, desc: 'Análises, carteiras, tarefas' },
  compliance: { label: 'Compliance',    level: 1, desc: 'Compliance, risco, leitura geral' },
  viewer:     { label: 'Viewer',        level: 0, desc: 'Somente leitura' },
};

function userCan(action) {
  const role = _user?.role || 'viewer';
  const level = ROLES[role]?.level || 0;
  switch(action) {
    case 'manage_users': return level >= 4;
    case 'approve_trade': return level >= 3;
    case 'create_comite': return level >= 3;
    case 'edit_fund': return level >= 2;
    case 'upload_xml': return level >= 2;
    case 'create_task': return level >= 2;
    case 'edit_task': return level >= 2;
    case 'create_analysis': return level >= 2;
    case 'view_risk': return level >= 1;
    case 'view_compliance': return level >= 1;
    case 'view': return level >= 0;
    default: return level >= 2;
  }
}

// === Local DB ===
function loadLocalDB() {
  try { const raw = localStorage.getItem(DB_KEY); if (!raw) return { reports:[], views:[], settings:{}, funds:[], carteirasXML:{} }; return JSON.parse(raw); } catch { return { reports:[], views:[], settings:{}, funds:[], carteirasXML:{} }; }
}
function saveLocalDB() { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch(e) {} }
let DB = loadLocalDB();

// === Supabase Data ===
function sbUpsert(key, value) {
  return fetch(SB_URL + '/rest/v1/shared_data', {
    method: 'POST', headers: { ...sbHeaders(), 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  }).catch(e => console.warn('[SB] upsert error:', key, e.message));
}
function sbDelete(key) {
  return fetch(SB_URL + '/rest/v1/shared_data?key=eq.' + encodeURIComponent(key), {
    method: 'DELETE', headers: sbHeaders(),
  }).catch(e => console.warn('[SB] delete error:', key, e.message));
}
async function sbGetAll() {
  const resp = await fetch(SB_URL + '/rest/v1/shared_data?select=key,value&order=key', { headers: sbHeaders() });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return resp.json();
}

async function dbLoadAll() {
  try {
    const rows = await sbGetAll();
    const funds=[], carteirasXML={}, comites={}, research=[], resgateForecasts={}, assetAnalyses=[], equityPortfolio=[], tasks=[];
    for (const row of rows) {
      if (!row.key || row.value == null) continue;
      const k=row.key, v=row.value;
      if (k.startsWith('fund:')) funds.push(v);
      else if (k.startsWith('carteira:')) { const cnpj=k.split(':')[1]; if(!carteirasXML[cnpj])carteirasXML[cnpj]=[]; carteirasXML[cnpj].push(v); }
      else if (k.startsWith('comite:')) { const fid=k.split(':')[1]; if(!comites[fid])comites[fid]=[]; comites[fid].push(v); }
      else if (k.startsWith('research:')) research.push(v);
      else if (k.startsWith('resgate:')) { const fid=k.split(':')[1]; if(!resgateForecasts[fid])resgateForecasts[fid]=[]; resgateForecasts[fid].push(v); }
      else if (k.startsWith('haircut:')) { if(!DB.liquidityHaircuts)DB.liquidityHaircuts={}; DB.liquidityHaircuts[k.split(':')[1]]=v; }
      else if (k.startsWith('asset:')) assetAnalyses.push(v);
      else if (k.startsWith('equity:')) equityPortfolio.push(v);
      else if (k.startsWith('task:')) tasks.push(v);
      else if (k.startsWith('pipeline:')) { if(!DB._dailyPipeline)DB._dailyPipeline={}; const parts=k.split(':'); DB._dailyPipeline[parts[1]+':'+parts[2]]=v; }
      else if (k.startsWith('funddates:')) { if(!DB._fundDates)DB._fundDates={}; DB._fundDates[k.split(':')[1]]=v; }
      else if (k.startsWith('creditnote:')) { if(!DB._creditNotes)DB._creditNotes={}; DB._creditNotes[k.slice(11)]=v; }
      else if (k.startsWith('renote:')) { if(!DB._reNotes)DB._reNotes={}; DB._reNotes[k.slice(7)]=v; }
      else if (k.startsWith('misc:')) DB[k.slice(5)]=v;
    }
    for (const cnpj of Object.keys(carteirasXML)) carteirasXML[cnpj].sort((a,b)=>(a.fund?.dtposicao||'').localeCompare(b.fund?.dtposicao||''));
    for (const fid of Object.keys(comites)) comites[fid].sort((a,b)=>(a.updated_at||'').localeCompare(b.updated_at||''));
    DB.funds=funds; DB.carteirasXML=carteirasXML; DB.comites=comites; DB.research=research;
    DB.resgateForecasts=resgateForecasts;
    if(assetAnalyses.length>0)DB.assetAnalyses=assetAnalyses;
    if(equityPortfolio.length>0)DB.equityAssets=equityPortfolio;
    if(tasks.length>0)DB.tasks=tasks;
    saveLocalDB(); _dbReady=true; render();
    return true;
  } catch(e) { console.warn('[SB] load failed:',e.message); return false; }
}

function saveDB(db) { saveLocalDB(); }
function getSyncStatus() { return { status: _dbReady ? 'ok' : 'local' }; }

// High-level save helpers
function saveFundToServer(fund) { sbUpsert('fund:' + fund.id, fund); }
function deleteFundFromServer(fundId) { sbDelete('fund:' + fundId); }
function saveCarteiraToServer(cnpj, carteira) { const d = carteira.fund?.dtposicao || 'unknown'; sbUpsert('carteira:' + cnpj + ':' + d, carteira); }

// === Notifications ===
function getNotifications() {
  if (!_user) return [];
  const tasks = getTasks();
  const notifs = [];
  const myName = _user.name;
  for (const t of tasks) {
    if (t.assignee === myName && t.status === 'pending') notifs.push({ type: 'task', text: 'Nova tarefa: ' + t.title, id: t.id, priority: t.priority });
    if (t.assignee === myName && t.due_date && t.due_date <= new Date().toISOString().split('T')[0] && t.status !== 'done' && t.status !== 'cancelled')
      notifs.push({ type: 'overdue', text: 'Tarefa atrasada: ' + t.title, id: t.id, priority: 'urgent' });
  }
  return notifs;
}

const state = { topTab: 'gestao', view: 'am_funds', detail: null, modal: null };
function setView(v) { state.view = v; state.detail = null; state._backoffice_fund = null; state._active_task = null; state._fund_edit = null; state._editing_task = null; state._bo_tab = null; state._credit_detail = null; state._re_detail = null; render(); }
function setDetail(kind, slug) { state.detail = { kind, slug }; render(); }
function clearDetail() { state.detail = null; render(); }
function setModal(m) { state.modal = m; render(); }

function formatBRL(v) { if (v == null || isNaN(v)) return '—'; const abs = Math.abs(v); if (abs >= 1e9) return `R$ ${(v/1e9).toFixed(2)} bi`; if (abs >= 1e6) return `R$ ${(v/1e6).toFixed(1)} mi`; if (abs >= 1e3) return `R$ ${(v/1e3).toFixed(1)} k`; return `R$ ${v.toFixed(2)}`; }
function showToast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }

const h = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  if (typeof attrs.html === 'string') { el.innerHTML = attrs.html; delete attrs.html; }
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null || c === false) continue;
    if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(c));
    else if (c instanceof HTMLElement) el.appendChild(c);
  }
  return el;
};

const sectionHead = (num, title, caption) => h('div', { style: { marginBottom: '14px' } }, [
  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px' } }, [
    num && h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.15em' } }, num),
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '17px' } }, title),
    caption && h('span', { style: { fontSize: '12px', color: 'var(--text-faint)' } }, caption),
  ]),
]);

const pageHead = (kicker, titleHTML, desc) => h('div', { class: 'page-head' }, [
  h('div', { class: 'page-kicker' }, kicker),
  h('h1', { class: 'page-title', html: titleHTML }),
  desc && h('p', { class: 'page-desc', html: desc }),
]);

function renderPortKPI(label, value, sub) {
  return h('div', { class: 'card', style: { padding: '14px 16px' } }, [
    h('div', { class: 'mono', style: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', marginBottom: '4px' } }, label),
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px' } }, String(value)),
    sub && h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' } }, sub),
  ]);
}

function renderAllocationChart(title, data, metadata) {
  const entries = Object.entries(data).sort((a,b) => b[1].weight - a[1].weight);
  const colors = ['#b8863c','#7a9b5c','#5c7a9b','#9b5c7a','#c4956a','#6b8f71','#8b6f8b','#a0845c'];
  return h('div', { class: 'card', style: { padding: '16px' } }, [
    h('div', { style: { fontSize: '13px', fontFamily: 'Fraunces, serif', marginBottom: '12px' } }, title),
    ...entries.slice(0,8).map(([name, val], i) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } }, [
      h('div', { style: { width: '10px', height: '10px', borderRadius: '2px', background: colors[i % colors.length], flexShrink: '0' } }),
      h('span', { style: { fontSize: '11px', flex: '1' } }, name),
      h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, `${val.weight.toFixed(1)}%`),
    ]))
  ]);
}

// Gemini stub (keep functional)
async function callGeminiRaw(systemPrompt, userPrompt) {
  const key = DB.settings?.gemini_api_key;
  if (!key) throw new Error('Configure a Gemini API key em Settings');
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }], generationConfig: { temperature: 0.3 } })
  });
  if (!res.ok) throw new Error('Gemini ' + res.status);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Stubs for functions referenced by AM but not needed
function computeConsensus() { return null; }
function getLatestViews() { return []; }
function getManagerBySlug() { return null; }
function stanceBadge() { return h('span', {}, ''); }
function brapiFetch() { return Promise.reject(new Error('API não disponível nesta versão')); }
function finnhubFetch() { return Promise.reject(new Error('API não disponível nesta versão')); }
function renderMarketMonitor() { return h('div', {}); }
function renderWeekBriefInline() { return h('div', {}); }
function renderHubWeekCalendar() { return h('div', {}); }
function renderHubLatestResearches() { return h('div', {}); }
function renderHubMarketNews() { return h('div', {}); }
function isBrazilianTicker(t) { return /^[A-Z]{4}\d{1,2}F?$/.test(t.toUpperCase().replace(/\.SA$/i,'')); }
function isZeragemFund(cnpj) { return (DB.zeragemFunds || []).includes(cnpj); }
const MANAGERS = [];
const ALL_SLUGS = new Set();
const SLUG_META = {};
function getAllManagers() { return []; }
function getCoreManagers() { return []; }
function touchLastVisit() { DB.previousVisit = DB.lastVisit || new Date().toISOString(); DB.lastVisit = new Date().toISOString(); saveDB(DB); }
function pulse() { return h('span', { style: { display:'inline-block', width:'8px', height:'8px', borderRadius:'50%', background:'var(--amber)', animation:'pulse 1.5s infinite' } }); }

// PDF.js lazy loader
window.loadPdfJs = async function() {
  if (window.pdfjsLib) return window.pdfjsLib;
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
  window.pdfjsLib = pdfjsLib;
  return pdfjsLib;
};

// ========== NAVIGATION ==========
const TOP_TABS = [
  { id: 'hub',        label: 'Hub' },
  { id: 'gestao',     label: 'Gestão' },
  { id: 'analise',    label: 'Análise' },
  { id: 'atividades', label: 'Atividades' },
];

const SIDE_NAV = {
  hub: [
    { id: 'hub_geral',     label: 'Panorama',        num: '01' },
    { id: 'hub_operac',    label: 'Operacional',     num: '02' },
    { id: 'hub_operadores', label: 'Operadores',     num: '03' },
    { id: 'hub_admin',     label: 'Sistema',         num: '04' },
  ],
  gestao: [
    { group: 'Gestão de Fundos' },
    { id: 'am_funds',           label: 'Fundos',              num: '01' },
    { id: 'am_comite',          label: 'Comitê / Trading',    num: '02' },
    { id: 'am_new',             label: '+ Novo Fundo',        num: '03' },
    { group: 'Gestão de Ativos' },
    { id: 'am_credit_port',     label: 'Crédito',             num: '01' },
    { id: 'am_realestate_port', label: 'Real Estate Equity',  num: '02' },
    { id: 'am_asset_fundos',    label: 'Fundos',              num: '03' },
    { id: 'am_asset_liquid',    label: 'Liquid Assets',       num: '04' },
  ],
  analise: [
    { id: 'an_products', label: 'Novos Produtos',  num: '01' },
    { id: 'an_assets',   label: 'Novos Ativos',    num: '02' },
  ],
  atividades: [
    { id: 'wf_board', label: 'Painel de Tarefas', num: '01' },
    { id: 'wf_my',    label: 'Minhas Tarefas',    num: '02' },
    { id: 'wf_new',   label: '+ Nova Tarefa',     num: '03' },
  ],
};

function renderHeader() {
  const syncInfo = getSyncStatus();
  const notifs = getNotifications();
  return h('header', { class: 'header' }, [
    h('div', { style: { display:'flex', alignItems:'center', gap:'20px' } }, [
      h('div', { class: 'logo', style: { display:'flex', alignItems:'center' } }, [
        _cachedLogo
          ? h('img', { src: _cachedLogo, style: { height:'34px', borderRadius:'4px' } })
          : h('div', { class: 'logo-mark' }, 'Æ'),
      ]),
      // Top navigation tabs
      h('nav', { style: { display:'flex', gap:'2px' } },
        TOP_TABS.map(t => h('button', {
          style: { padding:'6px 14px', fontSize:'11px', fontWeight: state.topTab === t.id ? '700' : '400', color: state.topTab === t.id ? 'var(--amber)' : 'var(--text-faint)', background: state.topTab === t.id ? 'var(--bg-3)' : 'transparent', border:'none', borderBottom: state.topTab === t.id ? '2px solid var(--amber)' : '2px solid transparent', cursor:'pointer', fontFamily:'Geist,sans-serif', letterSpacing:'0.02em' },
          onClick: () => {
            state.topTab = t.id;
            const first = SIDE_NAV[t.id]?.[0];
            if (first) state.view = first.id;
            state._backoffice_fund = null; state._active_task = null; state._fund_edit = null;
            state._credit_detail = null; state._re_detail = null;
            render();
          }
        }, t.label))
      ),
    ]),
    h('div', { style: { display:'flex', gap:'10px', alignItems:'center' } }, [
      h('div', { class:'mono', style: { fontSize:'9px', color: syncInfo.status==='ok'?'var(--green)':'var(--amber)', cursor:'pointer', padding:'4px 8px', border:'1px solid '+(syncInfo.status==='ok'?'var(--green)':'var(--amber)'), borderRadius:'4px' }, onClick:()=>{dbLoadAll()} }, syncInfo.status==='ok'?'✓ Online':'○ Local'),
      notifs.length > 0 && h('div', { style:{position:'relative',cursor:'pointer'}, onClick:()=>{state._showNotifs=!state._showNotifs;render()} }, [
        h('span', { style:{fontSize:'16px'} }, '🔔'),
        h('span', { class:'mono', style:{position:'absolute',top:'-5px',right:'-8px',background:'var(--red)',color:'#fff',fontSize:'8px',padding:'1px 4px',borderRadius:'8px',fontWeight:'700'} }, String(notifs.length)),
      ]),
      _user && h('div', { class:'mono', style:{fontSize:'10px',color:'var(--text-faint)',display:'flex',alignItems:'center',gap:'6px'} }, [
        h('span', { style:{color:'var(--amber)'} }, _user.name),
        h('span', { style:{fontSize:'8px',padding:'1px 5px',border:'1px solid var(--border)',borderRadius:'3px'} }, ROLES[_user.role]?.label || _user.role),
      ]),
      h('button', { class:'header-btn', onClick:()=>setModal('settings') }, '⚙'),
      _session && h('button', { class:'header-btn', style:{fontSize:'10px',color:'var(--text-faint)'}, onClick:authLogout }, 'Sair'),
    ].filter(Boolean)),
  ]);
}

function renderSidebar() {
  const items = SIDE_NAV[state.topTab] || [];
  const elements = [];
  let currentGroup = null;

  for (const it of items) {
    if (it.group) {
      currentGroup = it.group;
      elements.push(h('div', { class: 'sidebar-label', style: { marginTop: elements.length > 0 ? '16px' : '0' } }, currentGroup));
      continue;
    }
    if (it.id === 'am_new' && !userCan('edit_fund')) continue;
    if (it.id === 'wf_new' && !userCan('create_task')) continue;
    elements.push(h('button', {
      class: state.view === it.id ? 'active' : '',
      onClick: () => setView(it.id),
    }, [h('span', { class: 'num' }, it.num), h('span', {}, it.label)]));
  }

  return h('aside', { class: 'sidebar' }, [
    h('div', { class: 'sidebar-section' }, [
      // Show top-level label only if no groups exist
      !items.some(i => i.group) && h('div', { class: 'sidebar-label' }, (TOP_TABS.find(t => t.id === state.topTab)?.label || '').toUpperCase()),
      h('div', { class: 'sidebar-nav' }, elements),
    ].filter(Boolean)),
  ]);
}

function renderLoginScreen() {
  const isRegister = state._authMode === 'register';
  return h('div', { style: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Geist,sans-serif' } }, [
    h('div', { style: { width:'360px', padding:'40px' } }, [
      h('div', { style: { textAlign:'center', marginBottom:'32px' } }, [
        _cachedLogo
          ? h('img', { src: _cachedLogo, style: { height:'56px', borderRadius:'6px', marginBottom:'8px' } })
          : h('div', { style: { fontSize:'36px', fontFamily:'Fraunces,serif', marginBottom:'4px' } }, 'Æ'),
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'20px' }, html: 'Aegir<span style="color:var(--amber)">·</span>Intel' }),
        h('div', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)', marginTop:'4px' } }, 'Asset Management ERP'),
      ]),
      h('div', { style: { marginBottom:'16px' } }, [
        h('label', { class:'form-field-label' }, 'Email'),
        h('input', { class:'form-field-input', type:'email', id:'auth-email', placeholder:'seu@email.com' }),
      ]),
      isRegister && h('div', { style: { marginBottom:'16px' } }, [
        h('label', { class:'form-field-label' }, 'Seu Nome'),
        h('input', { class:'form-field-input', id:'auth-name', placeholder:'Nome completo' }),
      ]),
      h('div', { style: { marginBottom:'20px' } }, [
        h('label', { class:'form-field-label' }, 'Senha'),
        h('input', { class:'form-field-input', type:'password', id:'auth-pass', placeholder:'Mínimo 6 caracteres' }),
      ]),
      state._authError && h('div', { class:'mono', style: { fontSize:'11px', color:'var(--red)', marginBottom:'12px', padding:'8px 12px', background:'rgba(183,60,60,0.08)', borderRadius:'4px' } }, state._authError),
      h('button', { class:'btn-primary', style: { width:'100%', padding:'10px', marginBottom:'12px' }, onClick: async () => {
        const email = document.getElementById('auth-email')?.value?.trim();
        const pass = document.getElementById('auth-pass')?.value;
        const name = document.getElementById('auth-name')?.value?.trim();
        if (!email || !pass) { state._authError = 'Preencha email e senha'; render(); return; }
        if (isRegister && !name) { state._authError = 'Preencha seu nome'; render(); return; }
        try {
          state._authError = null;
          if (isRegister) { await authSignUp(email, pass, name); }
          else { await authLogin(email, pass); }
          await loadUserProfile();
          await loadAllUsers();
          dbLoadAll();
          render();
        } catch(e) { state._authError = e.message; render(); }
      }}, isRegister ? 'Criar Conta' : 'Entrar'),
      h('div', { style: { textAlign:'center' } }, [
        h('span', { class:'mono', style: { fontSize:'11px', color:'var(--text-faint)' } }, isRegister ? 'Já tem conta? ' : 'Primeira vez? '),
        h('a', { href:'#', style: { fontSize:'11px', color:'var(--amber)' }, onClick: (e) => { e.preventDefault(); state._authMode = isRegister ? null : 'register'; state._authError = null; render(); }}, isRegister ? 'Fazer login' : 'Criar conta'),
      ]),
    ]),
  ]);
}

function renderSettingsModal() {
  const bg = h('div', { class: 'modal-bg', onClick: e => { if (e.target === bg) setModal(null); } });
  const syncInfo = getSyncStatus();
  const isAdmin = userCan('manage_users');
  bg.appendChild(h('div', { class: 'modal', style: { maxWidth: isAdmin ? '600px' : '420px' } }, [
    h('div', { class: 'modal-head' }, [
      h('div', { class: 'modal-title' }, 'Settings'),
      h('button', { class: 'modal-close', onClick: () => setModal(null) }, '×'),
    ]),
    h('div', { class: 'modal-body' }, [
      // Profile
      _user && h('div', { style: { marginBottom: '20px' } }, [
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'15px', marginBottom:'8px' } }, 'Meu Perfil'),
        h('div', { class:'mono', style: { fontSize:'11px', color:'var(--text-faint)', marginBottom:'8px' } },
          _user.email + ' · ' + (ROLES[_user.role]?.label || _user.role)),
        h('div', { style: { display:'flex', gap:'8px', alignItems:'center' } }, [
          h('input', { class:'form-field-input', style: { flex:1 }, id:'set-name', value: _user.name }),
          h('button', { class:'btn-secondary', onClick: async () => {
            const newName = document.getElementById('set-name')?.value?.trim();
            if (!newName) return;
            await fetch(SB_URL + '/rest/v1/profiles?id=eq.' + _user.id, {
              method: 'PATCH', headers: sbHeaders(), body: JSON.stringify({ name: newName }),
            });
            _user.name = newName; await loadAllUsers(); showToast('Nome atualizado'); setModal(null);
          }}, 'Salvar'),
        ]),
      ]),
      // Logo
      h('div', { style: { borderTop:'1px solid var(--border)', paddingTop:'16px', marginBottom:'16px' } }, [
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'15px', marginBottom:'8px' } }, 'Logo da Gestora (PDF)'),
        h('div', { style: { display:'flex', gap:'10px', alignItems:'center' } }, [
          getLogo() && h('img', { src: getLogo(), style: { height:'32px', borderRadius:'4px', border:'1px solid var(--border)' } }),
          h('button', { class:'btn-secondary', style: { fontSize:'10px' }, onClick: () => {
            const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
            input.onchange = e => {
              const file = e.target.files[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = () => { if (!DB.settings) DB.settings = {}; DB.settings.companyLogo = reader.result; saveDB(DB); showToast('Logo salva'); render(); };
              reader.readAsDataURL(file);
            }; input.click();
          }}, getLogo() ? 'Trocar Logo' : '+ Upload Logo'),
          getLogo() && h('button', { class:'btn-secondary', style: { fontSize:'10px', color:'var(--red)' }, onClick: () => { DB.settings.companyLogo = null; saveDB(DB); render(); }}, '✕'),
        ]),
      ]),
      // Sync
      h('div', { style: { borderTop:'1px solid var(--border)', paddingTop:'16px', marginBottom:'16px' } }, [
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'15px', marginBottom:'8px' } }, 'Dados'),
        h('button', { class:'btn-primary', onClick: () => { dbLoadAll().then(() => { showToast('Dados atualizados'); setModal(null); }); }}, '↓ Atualizar do Servidor'),
      ]),
      // User management (admin only)
      isAdmin && h('div', { style: { borderTop:'1px solid var(--border)', paddingTop:'16px' } }, [
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'15px', marginBottom:'12px' } }, 'Gestão de Usuários'),
        h('div', { style: { maxHeight:'250px', overflow:'auto' } },
          _allUsers.map(u => h('div', { style: { display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderTop:'1px solid var(--border)' } }, [
            h('div', { style: { flex:1 } }, [
              h('div', { style: { fontSize:'13px', fontWeight:'500' } }, u.name),
              h('div', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)' } }, u.email),
            ]),
            h('select', { class:'form-field-select', style: { width:'130px', fontSize:'11px' }, value: u.role,
              onchange: e => { updateUserRole(u.id, e.target.value).then(() => { showToast('Papel atualizado'); render(); }); }
            }, Object.entries(ROLES).map(([k,v]) => h('option', { value: k, selected: u.role === k ? 'selected' : null }, v.label))),
          ]))
        ),
      ]),
    ]),
  ]));
  return bg;
}

// Notification panel
function renderNotificationPanel() {
  const notifs = getNotifications();
  if (!state._showNotifs || notifs.length === 0) return null;
  return h('div', { style: { position:'fixed', top:'52px', right:'20px', width:'320px', maxHeight:'400px', overflow:'auto', background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.3)', zIndex:'200', padding:'8px' } }, [
    h('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px 8px', borderBottom:'1px solid var(--border)', marginBottom:'4px' } }, [
      h('div', { class:'mono', style: { fontSize:'10px', textTransform:'uppercase', color:'var(--text-faint)' } }, 'Notificações'),
      h('button', { class:'mono', style: { fontSize:'10px', color:'var(--amber)', background:'none', border:'none', cursor:'pointer' }, onClick: () => { state._showNotifs = false; render(); }}, '✕ Fechar'),
    ]),
    ...notifs.map(n => h('div', { class:'card', style: { padding:'10px 12px', marginBottom:'4px', cursor:'pointer', borderLeft:'3px solid '+(n.priority==='urgent'?'var(--red)':n.priority==='high'?'var(--amber)':'var(--blue)') },
      onClick: () => { state._showNotifs = false; state._active_task = n.id; render(); }
    }, [
      h('div', { style: { fontSize:'12px' } }, n.text),
      h('div', { class:'mono', style: { fontSize:'9px', color:'var(--text-faint)', marginTop:'2px' } }, n.type === 'overdue' ? '⚠ Atrasada' : '📋 Pendente'),
    ])),
  ]);
}


function render() {
  try { _renderInternal(); } catch(err) {
    console.error('Render error:', err);
    const app = document.getElementById('app');
    if (app) app.innerHTML = '<div style="padding:40px;font-family:monospace;color:#b83c3c"><h2>Erro</h2><pre>' + (err.stack||err.message||err) + '</pre></div>';
  }
}

function _renderInternal() {
  document.querySelectorAll('.modal-bg').forEach(el => el.remove());
  document.querySelectorAll('.notif-panel').forEach(el => el.remove());
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Auth gate
  if (!_session) { app.appendChild(renderLoginScreen()); return; }

  app.appendChild(renderHeader());

  // Notification panel
  const notifPanel = renderNotificationPanel();
  if (notifPanel) app.appendChild(notifPanel);

  const layout = h('div', { class: 'main-layout' }, [renderSidebar()]);
  let content;

  // Fund detail view (backoffice)
  if (state._active_task) {
    content = renderTaskDetail(state._active_task);
  }
  else if (state._credit_detail) {
    content = renderCreditAssetDetail(state._credit_detail);
  }
  else if (state._re_detail) {
    content = renderREAssetDetail(state._re_detail);
  }
  else if (state._backoffice_fund) {
    content = renderFundBackoffice(state._backoffice_fund);
  }
  // Fund edit form
  else if (state._fund_edit || state.view === 'am_edit') {
    if (!state._fund_edit) state._fund_edit = emptyFund();
    content = renderFundForm();
  }
  // Fund detail (from setDetail)
  else if (state.detail && state.detail.kind === 'fund') {
    content = renderFundDetail();
  }
  // Normal view routing
  else {
    const v = state.view;
    switch(v) {
      case 'am_funds':    content = renderFundsList(); break;
      case 'am_comite':   content = renderComite(); break;
      case 'am_product':  content = renderProductAnalysis(); break;
      case 'am_assets':   content = renderAssetsAnalysis(); break;
      case 'am_credit_port': content = renderCreditPortfolio(); break;
      case 'am_realestate_port': content = renderRealEstateEquity(); break;
      case 'am_new':      state._fund_edit = emptyFund(); content = renderFundForm(); break;
      case 'wf_board':    content = renderWorkflowBoard(); break;
      case 'wf_my':       content = renderMyTasks(); break;
      case 'wf_new':      content = renderNewTask(); break;
      case 'hub_geral':   content = renderHubGeral(); break;
      case 'hub_operac':  content = renderHubOperacional(); break;
      case 'hub_operadores': content = renderHubOperadores(); break;
      case 'hub_admin':   content = renderHubAdmin(); break;
      case 'am_asset_fundos': content = renderAssetFundosWIP(); break;
      case 'am_asset_liquid': content = renderAssetLiquidWIP(); break;
      case 'an_products': content = renderAnaliseProducts(); break;
      case 'an_assets':   content = renderAnaliseAssets(); break;
      default:            content = renderFundsList(); break;
    }
  }
  layout.appendChild(content || h('div', { class: 'content' }, 'Carregando...'));
  app.appendChild(layout);
  if (state.modal === 'settings') document.body.appendChild(renderSettingsModal());
}

window.state = state;
window.render = render;

// ========== ASSET MANAGEMENT MODULE ==========

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
  saveFundToServer(fund); // push to Supabase
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
  deleteFundFromServer(id); // remove from Supabase
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
  // Get latest carteira PL
  const carteiras = getCarteirasXML(f.cnpj);
  const latest = carteiras.length > 0 ? carteiras[carteiras.length - 1] : null;
  const latestPL = latest?.fund?.patliq;
  const latestDate = latest?.fund?.dtposicao;
  const latestCota = latest?.fund?.valorcota;
  return h('div', { class: 'fund-card', onClick: () => { state._backoffice_fund = f.cnpj || f.id; render(); } }, [
    h('div', { class: 'fund-card-head' }, [
      h('div', {}, [
        h('div', { class: 'fund-card-name' }, f.name),
        h('div', { class: 'fund-card-class' }, `${cls.label} · ${f.strategy || '—'}`),
      ]),
      f.benchmark && h('span', { class: 'fund-card-tag' }, `vs ${f.benchmark}`),
    ]),
    latestPL && h('div', { style: { display:'flex', gap:'16px', margin:'8px 0', flexWrap:'wrap' } }, [
      h('div', {}, [
        h('div', { class:'mono', style: { fontSize:'8px', textTransform:'uppercase', color:'var(--text-faint)', letterSpacing:'0.1em' } }, 'PL'),
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'18px', color:'var(--amber)' } }, formatBRL(latestPL)),
      ]),
      latestCota && h('div', {}, [
        h('div', { class:'mono', style: { fontSize:'8px', textTransform:'uppercase', color:'var(--text-faint)', letterSpacing:'0.1em' } }, 'Cota'),
        h('div', { class:'mono', style: { fontSize:'13px' } }, 'R$ ' + latestCota.toFixed(6)),
      ]),
      h('div', {}, [
        h('div', { class:'mono', style: { fontSize:'8px', textTransform:'uppercase', color:'var(--text-faint)', letterSpacing:'0.1em' } }, 'Data'),
        h('div', { class:'mono', style: { fontSize:'12px' } }, latestDate || '—'),
      ]),
    ]),
    !latestPL && f.thesis_summary && h('p', { class: 'fund-card-thesis' }, f.thesis_summary),
    renderFundAlertBadges(f),
    h('div', { class: 'fund-card-meta' }, [
      h('span', {}, carteiras.length > 0 ? carteiras.length + ' carteira(s)' : 'Sem carteiras'),
      h('span', {}, f.cnpj || ''),
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

const BCB_SERIES = {};
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
        h('button', { class: 'btn-secondary', onClick: () => exportTesePDF(tese, fund) }, '↓ Exportar PDF'),
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
  sbUpsert('comite:' + fundId + ':' + comite.id, comite);
}

function deleteComite(fundId, comiteId) {
  if (!confirm('Excluir esta ata?')) return;
  DB.comites[fundId] = getComites(fundId).filter(c => c.id !== comiteId);
  saveDB(DB);
  sbDelete('comite:' + fundId + ':' + comiteId);
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
        h('button', { class: 'btn-secondary', onClick: () => exportAtaPDF(comite, fund) }, '↓ Exportar PDF'),
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
  sbUpsert('research:' + doc.id, doc);
}

function deleteResearchDoc(id) {
  if (!confirm('Excluir este research?')) return;
  DB.research = getResearchDocs().filter(r => r.id !== id);
  saveDB(DB);
  sbDelete('research:' + id);
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
        }}, '↓ Exportar PDF'),
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
  sbUpsert('misc:zeragemFunds', DB.zeragemFunds);
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
  // Push carteira and fund to Supabase individually
  saveCarteiraToServer(cnpj, parsed);
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
      const totalPL = funds.reduce((a, f) => { const cs = getCarteirasXML(f.cnpj); const lt = cs.length > 0 ? cs[cs.length-1] : null; return a + (lt?.fund?.patliq || 0); }, 0);
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
    funds.length > 0 && renderOperationalHeatmap(funds),

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
              h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, latest?.fund?.patliq ? formatBRL(latest.fund.patliq) : '—'),
            ]),
            h('div', { style: { textAlign: 'right' } }, [
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Cota'),
              h('div', { class: 'mono', style: { fontSize: '13px' } }, latest?.fund?.valorcota ? `R$ ${latest.fund.valorcota.toFixed(6)}` : '—'),
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
        selected && h('button', { class: 'btn-secondary', onClick: () => exportCarteiraPDF(selected, fund) }, '↓ PDF Carteira'),
        state._bo_risk && h('button', { class: 'btn-secondary', onClick: () => exportRiskReportPDF(fund, state._bo_risk, selected) }, '↓ PDF Risco'),
        h('button', { class: 'btn-secondary', onClick: () => exportFundOverviewPDF(fund) }, '↓ PDF Fundo'),
        h('button', { class: 'btn-secondary', onClick: () => { state._backoffice_fund = null; state._fund_edit = JSON.parse(JSON.stringify(fund)); state.view = 'am_edit'; render(); } }, 'Editar'),
      ].filter(Boolean)),
    ]),

    // Compute risk for this fund (use latest carteira if none selected)
    (() => { try {
      const riskCarteira = selected || (carteiras.length > 0 ? carteiras[carteiras.length - 1] : null);
      state._bo_risk = riskCarteira ? computeFundRisk(riskCarteira) : null;
    } catch(e) { console.warn('Risk compute error:', e); state._bo_risk = null; } })(),

    // Sub-tabs (Gestão + Risco)
    h('div', { style: { marginBottom: '16px' } }, [
      h('div', { style: { display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' } }, [
        h('span', { class:'mono', style: { fontSize:'7px', color:'var(--amber)', textTransform:'uppercase', letterSpacing:'0.15em', marginRight:'4px' } }, 'Gestão'),
        ...['panorama', 'carteira', 'performance', 'provisoes', 'eventos'].map(k => {
          const labels = { panorama:'Panorama', carteira:'Carteira', performance:'Performance', provisoes:'Provisões', eventos:'Eventos' };
          return h('button', { class:'sec-tab' + (subTab === k ? ' active' : ''), onClick: () => { state._bo_tab = k; render(); } }, labels[k]);
        }),
        h('span', { style: { width:'1px', height:'16px', background:'var(--border)', margin:'0 6px' } }),
        h('span', { class:'mono', style: { fontSize:'7px', color:'var(--red)', textTransform:'uppercase', letterSpacing:'0.15em', marginRight:'4px' } }, 'Risco'),
        ...(() => {
          return [
            ['r_overview', 'Resumo'],
            ['r_regulatory', 'Regulatório'],
            ['r_concentration', 'Concentração'],
            ['r_liquidity', 'Liquidez'],
            ['r_resgate', 'Resgate'],
            ['r_stress', 'Stress'],
          ].map(([k, l]) => h('button', { class:'sec-tab' + (subTab === k ? ' active' : ''), onClick: () => { state._bo_tab = k; render(); } }, l));
        })(),
      ]),
    ]),

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
        subTab === 'carteira' ? renderCarteiraConsolidada(selected, fund, carteiras) :
        subTab === 'performance' ? renderRentabilidade(fund, carteiras) :
        subTab === 'provisoes' ? renderCarteiraProvisoes(selected) :
        subTab === 'eventos' ? renderFundDates(fund) :
        subTab === 'r_overview' ? (state._bo_risk ? renderRiskOverview(state._bo_risk) : h('div',{class:'empty'},[h('div',{class:'empty-title'},'Carregue um XML para análise de risco')])) :
        subTab === 'r_regulatory' ? (state._bo_risk ? renderRiskCompliance(state._bo_risk, selected) : null) :
        subTab === 'r_concentration' ? (state._bo_risk ? renderRiskConcentration(state._bo_risk) : null) :
        subTab === 'r_liquidity' ? (state._bo_risk ? renderRiskLiquidity(state._bo_risk) : null) :
        subTab === 'r_resgate' ? (state._bo_risk ? renderRiskResgate(state._bo_risk, fund, selected) : null) :
        subTab === 'r_stress' ? (state._bo_risk ? renderRiskStress(state._bo_risk) : null) :
        null,
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

  const fmtVal = (v) => unit === 'R$' ? formatBRL(v) : unit === '%' ? `${v.toFixed(2)}%` : v.toFixed(0);

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
  svg += `<circle cx="${xFor(series.length-1).toFixed(1)}" cy="${yFor(series[series.length-1].value).toFixed(1)}" r="3" fill="${color}"/>`;

  // Tooltip hover points (invisible wider circles with <title>)
  for (let i = 0; i < series.length; i++) {
    const d = series[i];
    const cx = xFor(i).toFixed(1);
    const cy = yFor(d.value).toFixed(1);
    svg += `<circle cx="${cx}" cy="${cy}" r="8" fill="transparent" stroke="none" style="cursor:crosshair"><title>${d.date}: ${fmtVal(d.value)}</title></circle>`;
    svg += `<circle cx="${cx}" cy="${cy}" r="2" fill="${color}" opacity="0"><title>${d.date}: ${fmtVal(d.value)}</title></circle>`;
  }

  const lastLabel = fmtVal(series[series.length - 1].value);

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
  const pl = parsed.fund.patliq || 1;
  const stats = parsed.stats || {};
  const f = parsed.fund;

  // Previous carteira for MoM
  const carteiras = getCarteirasXML(fund.cnpj);
  const currIdx = carteiras.findIndex(c => c.fund.dtposicao === f.dtposicao);
  const prevCarteira = currIdx > 0 ? carteiras[currIdx - 1] : null;
  const prevPositions = prevCarteira?.positions || {};
  const prevMap = {};
  for (const p of [...(prevPositions.acoes||[]),...(prevPositions.titprivado||[]),...(prevPositions.titpublico||[]),...(prevPositions.cotas||[])]) {
    prevMap[p.codativo || p.isin || p.cnpjfundo || ''] = p;
  }

  // First carteira for inception P&L
  const firstCarteira = carteiras.length > 1 ? carteiras[0] : null;
  const firstMap = {};
  if (firstCarteira && firstCarteira !== parsed) {
    for (const p of [...(firstCarteira.positions?.acoes||[]),...(firstCarteira.positions?.titprivado||[]),...(firstCarteira.positions?.titpublico||[]),...(firstCarteira.positions?.cotas||[])]) {
      firstMap[p.codativo || p.isin || p.cnpjfundo || ''] = p;
    }
  }

  // Caixa + zeragem
  const zeragemVal = cotas.filter(p => isZeragemFund(p.cnpjfundo || p.isin)).reduce((a, p) => a + (p.valorfindisp || ((p.qtdisponivel||0)*(p.puposicao||0))), 0);
  const caixaTotal = stats.totalCaixa || 0;
  const caixaDisp = caixaTotal + zeragemVal;
  const hasPrev = !!prevCarteira;
  const hasInception = Object.keys(firstMap).length > 0;

  function getDeltas(p) {
    const key = p.codativo || p.isin || p.cnpjfundo || '';
    const val = p.valorfindisp || ((p.qtdisponivel||0)*(p.puposicao||0));
    const prev = prevMap[key];
    const first = firstMap[key];
    const prevVal = prev ? (prev.valorfindisp || ((prev.qtdisponivel||0)*(prev.puposicao||0))) : null;
    const firstVal = first ? (first.valorfindisp || ((first.qtdisponivel||0)*(first.puposicao||0))) : null;
    const delta = prevVal != null ? val - prevVal : null;
    const deltaPct = prevVal && prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : null;
    const incDelta = firstVal != null ? val - firstVal : null;
    const incPct = firstVal && firstVal > 0 ? ((val - firstVal) / firstVal) * 100 : null;
    const isNew = !prev && hasPrev;
    const prevPDD = prev?.percprovcred || 0;
    const deltaPDD = hasPrev ? (p.percprovcred || 0) - prevPDD : null;
    return { val, delta, deltaPct, incDelta, incPct, isNew, deltaPDD };
  }

  const dcol = (d, dp, isNew) => {
    if (isNew) return h('td', { class:'mono', style:{padding:'5px 8px',textAlign:'right',color:'var(--green)',fontSize:'9px'}}, 'NOVO');
    if (d == null) return h('td', { class:'mono', style:{padding:'5px 8px',textAlign:'right',color:'var(--text-faint)'}}, '—');
    const c = d > 0 ? 'var(--green)' : d < 0 ? 'var(--red)' : 'var(--text-faint)';
    return h('td', { class:'mono', style:{padding:'5px 8px',textAlign:'right',color:c,fontSize:'9px'}}, (d>=0?'+':'')+formatBRL(d)+' ('+(dp>=0?'+':'')+((dp||0).toFixed(1))+'%)');
  };
  const icol = (d, p) => {
    if (d == null) return h('td', { class:'mono', style:{padding:'5px 8px',textAlign:'right',color:'var(--text-faint)',fontSize:'9px'}}, '—');
    const c = d > 0 ? 'var(--green)' : d < 0 ? 'var(--red)' : 'var(--text-faint)';
    return h('td', { class:'mono', style:{padding:'5px 8px',textAlign:'right',color:c,fontSize:'9px'}}, (d>=0?'+':'')+formatBRL(d)+' ('+(p>=0?'+':'')+((p||0).toFixed(1))+'%)');
  };
  const thStyle = (left) => ({ padding:'6px 8px', textAlign:left?'left':'right', fontFamily:'JetBrains Mono,monospace', fontSize:'8px', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-faint)' });

  return h('div', {}, [
    // KPIs
    h('div', { style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginBottom:'20px'} }, [
      renderPortKPI('PL', formatBRL(f.patliq), ''),
      renderPortKPI('Cota', f.valorcota ? 'R$ '+f.valorcota.toFixed(6) : '—', ''),
      renderPortKPI('Caixa', formatBRL(caixaTotal), (caixaTotal/pl*100).toFixed(1)+'% PL'),
      renderPortKPI('Caixa + Disp.', formatBRL(caixaDisp), zeragemVal > 0 ? 'incl. '+formatBRL(zeragemVal)+' zeragem' : 'sem zeragem'),
      renderPortKPI('PDD', stats.pddTotal > 0 ? formatBRL(stats.pddTotal) : 'R$ 0', stats.pddTotal > 0 ? (stats.pddTotal/pl*100).toFixed(2)+'% PL' : ''),
      renderPortKPI('Posições', String(stats.totalAtivos), [stats.posAcoes&&stats.posAcoes+' ações',stats.posTitPrivado&&stats.posTitPrivado+' priv.',stats.posCotas&&stats.posCotas+' cotas'].filter(Boolean).join(' · ')),
    ]),
    // Allocation
    h('div', { style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'} }, [
      renderAllocationChart('Por Tipo', (()=>{const d={};const add=(k,arr,fn)=>{const v=arr.reduce((a,p)=>a+(fn(p)||0),0);if(v>0)d[k]={weight:v/pl*100,count:arr.length}};add('Ações/FIIs',acoes,p=>p.valorfindisp);add('Tít.Privados',titprivado,p=>p.valorfindisp);add('Tít.Públicos',titpublico,p=>p.valorfindisp);add('Cotas',cotas,p=>p.valorfindisp||((p.qtdisponivel||0)*(p.puposicao||0)));if(stats.totalImoveis>0)d['Imóveis']={weight:stats.totalImoveis/pl*100,count:stats.posImoveis};if(caixaTotal>0)d['Caixa']={weight:caixaTotal/pl*100,count:1};return d})(),{}),
      (stats.posTitPrivado>0||stats.posTitPublico>0)&&(()=>{const b={};for(const p of[...titprivado,...titpublico]){const i=p.indexador||'Outros';if(!b[i])b[i]={weight:0,count:0};b[i].weight+=(p.valorfindisp||0)/pl*100;b[i].count++}return renderAllocationChart('Por Indexador',b,{})})(),
    ].filter(Boolean)),

    hasPrev && h('div', { class:'mono', style:{fontSize:'10px',color:'var(--text-faint)',marginBottom:'12px',fontStyle:'italic'} },
      'Δ Dia: vs '+prevCarteira.fund.dtposicao+(hasInception?' · Δ Início: vs '+firstCarteira.fund.dtposicao:'')),

    // Ações
    acoes.length > 0 && h('div', { style:{marginBottom:'24px'} }, [
      h('div', { class:'macro-section-subhead' }, 'Ações / FIIs ('+acoes.length+')'),
      h('div', { class:'card', style:{padding:0,overflow:'auto'} },
        h('table', { style:{width:'100%',borderCollapse:'collapse',fontSize:'11px'} }, [
          h('thead', {}, h('tr', { style:{background:'var(--bg-3)'} },
            ['Ticker','Qtd','PU','Valor','%PL','Prov.',hasPrev&&'Δ Dia',hasInception&&'Δ Início'].filter(Boolean).map((c,i)=>h('th',{style:thStyle(i===0)},c)))),
          h('tbody', {}, acoes.sort((a,b)=>(b.valorfindisp||0)-(a.valorfindisp||0)).map(p=>{
            const d=getDeltas(p);
            return h('tr',{style:{borderTop:'1px solid var(--border)',background:d.isNew?'rgba(74,122,44,0.05)':'transparent'}},[
              h('td',{class:'mono',style:{padding:'5px 8px',fontWeight:'600',color:'var(--amber)'}},p.codativo+(d.isNew?' 🆕':'')),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right'}},(p.qtdisponivel||0).toLocaleString('pt-BR')),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right'}},'R$ '+(p.puposicao||0).toFixed(2)),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',fontWeight:'500'}},formatBRL(d.val)),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',color:'var(--text-faint)'}},(d.val/pl*100).toFixed(2)+'%'),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',color:p.percprovcred>0?'var(--red)':'var(--text-faint)'}},(p.percprovcred||0).toFixed(1)+'%'),
              hasPrev&&dcol(d.delta,d.deltaPct,d.isNew), hasInception&&icol(d.incDelta,d.incPct),
            ].filter(Boolean))})),
        ])),
    ]),

    // Títulos Privados
    titprivado.length > 0 && h('div', { style:{marginBottom:'24px'} }, [
      h('div', { class:'macro-section-subhead' }, 'Títulos Privados ('+titprivado.length+')'),
      h('div', { class:'card', style:{padding:0,overflow:'auto'} },
        h('table', { style:{width:'100%',borderCollapse:'collapse',fontSize:'10px'} }, [
          h('thead', {}, h('tr', { style:{background:'var(--bg-3)'} },
            ['Código','Idx','Cupom','Venc.','PU','Valor','%PL','PDD','Risco',hasPrev&&'Δ Dia',hasInception&&'Δ Início'].filter(Boolean).map((c,i)=>h('th',{style:thStyle(i===0)},c)))),
          h('tbody', {}, titprivado.sort((a,b)=>(b.valorfindisp||0)-(a.valorfindisp||0)).map(p=>{
            const d=getDeltas(p);
            const pddC=d.deltaPDD>0?'var(--red)':d.deltaPDD<0?'var(--green)':p.percprovcred>0?'var(--red)':'var(--text-faint)';
            const pddT=(p.percprovcred||0).toFixed(1)+'%'+(d.deltaPDD!=null&&d.deltaPDD!==0?' ('+(d.deltaPDD>0?'+':'')+d.deltaPDD.toFixed(1)+')':'');
            return h('tr',{style:{borderTop:'1px solid var(--border)',background:d.isNew?'rgba(74,122,44,0.05)':'transparent'}},[
              h('td',{class:'mono',style:{padding:'5px 8px',fontWeight:'600',color:'var(--amber)',fontSize:'9px',maxWidth:'110px',overflow:'hidden',textOverflow:'ellipsis'}},p.codativo+(d.isNew?' 🆕':'')),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right'}},p.indexador||'—'),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right'}},p.coupom?p.coupom.toFixed(2)+'%':'—'),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',color:'var(--text-faint)'}},(p.dtvencimento||'—').substring(5)),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right'}},'R$ '+(p.puposicao||0).toFixed(2)),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',fontWeight:'500'}},formatBRL(d.val)),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',color:'var(--text-faint)'}},(d.val/pl*100).toFixed(2)+'%'),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',color:pddC}},pddT),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right'}},p.nivelrsc||'—'),
              hasPrev&&dcol(d.delta,d.deltaPct,d.isNew), hasInception&&icol(d.incDelta,d.incPct),
            ].filter(Boolean))})),
        ])),
    ]),

    // Títulos Públicos
    titpublico.length > 0 && h('div', { style:{marginBottom:'24px'} }, [
      h('div', { class:'macro-section-subhead' }, 'Títulos Públicos ('+titpublico.length+')'),
      h('div', { class:'card', style:{padding:0,overflow:'auto'} },
        h('table', { style:{width:'100%',borderCollapse:'collapse',fontSize:'11px'} }, [
          h('thead', {}, h('tr', { style:{background:'var(--bg-3)'} },
            ['Código','Vencimento','PU','Valor','%PL',hasPrev&&'Δ Dia',hasInception&&'Δ Início'].filter(Boolean).map((c,i)=>h('th',{style:thStyle(i===0)},c)))),
          h('tbody', {}, titpublico.sort((a,b)=>(b.valorfindisp||0)-(a.valorfindisp||0)).map(p=>{
            const d=getDeltas(p);
            return h('tr',{style:{borderTop:'1px solid var(--border)'}},[
              h('td',{class:'mono',style:{padding:'5px 8px',fontWeight:'600',color:'var(--amber)'}},p.codativo||'—'),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',color:'var(--text-faint)'}},p.dtvencimento||'—'),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right'}},'R$ '+(p.puposicao||0).toFixed(2)),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',fontWeight:'500'}},formatBRL(d.val)),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',color:'var(--text-faint)'}},(d.val/pl*100).toFixed(2)+'%'),
              hasPrev&&dcol(d.delta,d.deltaPct,d.isNew), hasInception&&icol(d.incDelta,d.incPct),
            ].filter(Boolean))})),
        ])),
    ]),

    // Cotas
    cotas.length > 0 && h('div', { style:{marginBottom:'24px'} }, [
      h('div', { class:'macro-section-subhead' }, 'Cotas de Fundos ('+cotas.length+')'),
      h('div', { class:'card', style:{padding:0,overflow:'auto'} },
        h('table', { style:{width:'100%',borderCollapse:'collapse',fontSize:'11px'} }, [
          h('thead', {}, h('tr', { style:{background:'var(--bg-3)'} },
            ['CNPJ Fundo','Qtd','PU','Valor','%PL','Zeragem',hasPrev&&'Δ Dia'].filter(Boolean).map((c,i)=>h('th',{style:thStyle(i===0)},c)))),
          h('tbody', {}, cotas.map(p=>{
            const val=p.valorfindisp||((p.qtdisponivel||0)*(p.puposicao||0));
            const isZ=isZeragemFund(p.cnpjfundo||p.isin);
            const d=getDeltas(p);
            return h('tr',{style:{borderTop:'1px solid var(--border)',background:isZ?'rgba(58,106,154,0.05)':'transparent'}},[
              h('td',{class:'mono',style:{padding:'5px 8px',fontSize:'10px'}},p.cnpjfundo||p.isin||'—'),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right'}},(p.qtdisponivel||0).toLocaleString('pt-BR',{maximumFractionDigits:2})),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right'}},'R$ '+(p.puposicao||0).toFixed(6)),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',fontWeight:'500'}},formatBRL(val)),
              h('td',{class:'mono',style:{padding:'5px 8px',textAlign:'right',color:'var(--text-faint)'}},(val/pl*100).toFixed(2)+'%'),
              h('td',{style:{padding:'5px 8px',textAlign:'right'}},[
                h('button',{class:'mono',style:{fontSize:'9px',padding:'2px 6px',border:'1px solid '+(isZ?'var(--blue)':'var(--border)'),color:isZ?'var(--blue)':'var(--text-faint)',background:'none',cursor:'pointer',borderRadius:'3px'},
                  onClick:(e)=>{e.stopPropagation();toggleZeragem(p.cnpjfundo||p.isin);render()}},isZ?'✓ Zeragem':'Marcar'),
              ]),
              hasPrev&&dcol(d.delta,d.deltaPct,d.isNew),
            ].filter(Boolean))})),
        ])),
    ]),

    // Caixa
    caixa.length > 0 && h('div', { style:{marginBottom:'24px'} }, [
      h('div', { class:'macro-section-subhead' }, 'Caixa ('+caixa.length+')'),
      h('div', { class:'card', style:{padding:0,overflow:'auto'} },
        h('table', { style:{width:'100%',borderCollapse:'collapse',fontSize:'12px'} },
          h('tbody', {}, caixa.map(c=>h('tr',{style:{borderTop:'1px solid var(--border)'}},[
            h('td',{class:'mono',style:{padding:'6px 12px'}},c.descricao||'Caixa'),
            h('td',{class:'mono',style:{padding:'6px 12px',textAlign:'right',fontWeight:'500'}},formatBRL(c.saldo)),
          ]))))),
    ]),
  ]);
}


function renderCarteiraProvisoes(parsed) {
  const { provisoes } = parsed;
  if (!provisoes || provisoes.length === 0) {
    return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Sem provisões registradas.');
  }

  const fund = getFunds().find(f => f.cnpj === parsed.fund.cnpj);
  const carteiras = fund ? getCarteirasXML(fund.cnpj) : [];
  const currIdx = carteiras.findIndex(c => c.fund.dtposicao === parsed.fund.dtposicao);
  const prevCarteira = currIdx > 0 ? carteiras[currIdx - 1] : null;
  const prevProvisoes = prevCarteira?.provisoes || [];
  const hasPrev = !!prevCarteira;

  const prevMap = {};
  for (const p of prevProvisoes) prevMap[`${p.codprov}_${p.credeb}`] = (prevMap[`${p.codprov}_${p.credeb}`] || 0) + (p.valor || 0);
  const currMap = {};
  for (const p of provisoes) currMap[`${p.codprov}_${p.credeb}`] = (currMap[`${p.codprov}_${p.credeb}`] || 0) + (p.valor || 0);

  const newProvKeys = Object.keys(currMap).filter(k => !prevMap[k]);
  const removedProvKeys = Object.keys(prevMap).filter(k => !currMap[k]);

  const PROV_CODES = {
    '2': 'Taxa de Administração', '5': 'Taxa de Performance', '8': 'Taxa de Custódia',
    '14': 'Auditoria', '19': 'Outros Serviços', '34': 'Distribuição', '999': 'Outras Provisões',
  };

  const total = provisoes.reduce((a, p) => a + (p.valor || 0), 0);
  const prevTotal = prevProvisoes.reduce((a, p) => a + (p.valor || 0), 0);
  const deltaTotal = hasPrev ? total - prevTotal : null;

  // Group by code for summary
  const byCode = {};
  for (const p of provisoes) {
    const key = p.codprov;
    if (!byCode[key]) byCode[key] = { valor: 0, count: 0, credeb: p.credeb };
    byCode[key].valor += p.valor || 0;
    byCode[key].count++;
  }
  const prevByCode = {};
  for (const p of prevProvisoes) {
    const key = p.codprov;
    if (!prevByCode[key]) prevByCode[key] = { valor: 0 };
    prevByCode[key].valor += p.valor || 0;
  }

  return h('div', {}, [
    // KPIs
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' } }, [
      renderPortKPI('Total Provisões', formatBRL(total), provisoes.length + ' provisão(ões)'),
      hasPrev && renderPortKPI('Δ vs Anterior', deltaTotal != null ? (deltaTotal >= 0 ? '+' : '') + formatBRL(deltaTotal) : '—',
        deltaTotal > 0 ? 'Aumento' : deltaTotal < 0 ? 'Redução' : 'Sem variação'),
      hasPrev && renderPortKPI('Novas', String(newProvKeys.length), ''),
      hasPrev && renderPortKPI('Removidas', String(removedProvKeys.length), ''),
    ].filter(Boolean)),

    // Summary by code with variation
    hasPrev && h('div', { style: { marginBottom: '20px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Resumo por Tipo — Δ vs ' + prevCarteira.fund.dtposicao),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Tipo', 'Atual', 'Anterior', 'Δ Valor', 'Δ %'].map((c, i) =>
              h('th', { style: { padding: '7px 10px', textAlign: i === 0 ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, c))
          )),
          h('tbody', {}, Object.entries(byCode).sort((a, b) => b[1].valor - a[1].valor).map(([code, data]) => {
            const prevVal = prevByCode[code]?.valor || 0;
            const delta = data.valor - prevVal;
            const deltaPct = prevVal > 0 ? (delta / prevVal) * 100 : (data.valor > 0 ? 100 : 0);
            const color = delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--green)' : 'var(--text-faint)';
            return h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
              h('td', { style: { padding: '6px 10px' } }, PROV_CODES[code] || 'Provisão ' + code),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontWeight: '500' } }, formatBRL(data.valor)),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)' } }, formatBRL(prevVal)),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color, fontWeight: '500' } }, (delta >= 0 ? '+' : '') + formatBRL(delta)),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color, fontSize: '10px' } }, (deltaPct >= 0 ? '+' : '') + deltaPct.toFixed(1) + '%'),
            ]);
          })),
        ]),
      ]),
    ]),

    // Full table
    h('div', { class: 'macro-section-subhead' }, 'Detalhamento (' + provisoes.length + ')'),
    h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
        h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
          ['Código', 'Descrição', 'D/C', 'Data', 'Valor', 'Status'].map((c, i) =>
            h('th', { style: { padding: '7px 10px', textAlign: i === 1 ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, c))
        )),
        h('tbody', {}, provisoes.sort((a, b) => (b.valor || 0) - (a.valor || 0)).map(p => {
          const key = `${p.codprov}_${p.credeb}`;
          const isNew = hasPrev && newProvKeys.includes(key);
          return h('tr', { style: { borderTop: '1px solid var(--border)', background: isNew ? 'rgba(74,122,44,0.05)' : 'transparent' } }, [
            h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, p.codprov),
            h('td', { style: { padding: '6px 10px' } }, PROV_CODES[p.codprov] || 'Provisão ' + p.codprov),
            h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: p.credeb === 'D' ? 'var(--red)' : 'var(--green)' } }, p.credeb),
            h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)' } }, p.dt || '—'),
            h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontWeight: '500' } }, formatBRL(p.valor)),
            h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontSize: '9px', color: isNew ? 'var(--green)' : 'var(--text-faint)' } }, isNew ? '🆕 NOVA' : ''),
          ]);
        })),
      ]),
    ]),
  ]);
}

/* ---------- Carteira: Imóveis ---------- */

function renderCarteiraImoveis(parsed) {
  const imoveis = parsed.positions?.imoveis || [];
  if (imoveis.length === 0) return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Sem imóveis nesta carteira.');

  const TIPO_IMOVEL = { '1':'Terreno','2':'Edifício','3':'Sala/Conjunto','4':'Loja','5':'Galpão','6':'Hotel','7':'Hospital','8':'Garagem','9':'Shopping','10':'Residencial','11':'Outros' };
  const TIPO_USO = { '01':'Alugado','02':'Para Renda','03':'Construção','04':'Vago','05':'Usufruto' };
  const pl = parsed.fund.patliq || 1;
  const totalContabil = imoveis.reduce((a, im) => a + (im.valorcontabil || 0), 0);
  const totalAluguel = imoveis.reduce((a, im) => a + (im.aluguelcontratado || 0), 0);
  const totalAtrasado = imoveis.reduce((a, im) => a + (im.aluguelatrasado || 0), 0);
  const capRate = totalContabil > 0 ? (totalAluguel * 12 / totalContabil * 100) : 0;

  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' } }, [
      renderPortKPI('Imóveis', String(imoveis.length), ''),
      renderPortKPI('Valor Contábil', formatBRL(totalContabil), (totalContabil / pl * 100).toFixed(1) + '% PL'),
      totalAluguel > 0 && renderPortKPI('Aluguel Mensal', formatBRL(totalAluguel), 'Cap Rate: ' + capRate.toFixed(2) + '%'),
      totalAtrasado > 0 && renderPortKPI('Inadimplência', formatBRL(totalAtrasado), (totalAtrasado / totalAluguel * 100).toFixed(1) + '%'),
    ].filter(Boolean)),

    ...imoveis.sort((a, b) => (b.valorcontabil || 0) - (a.valorcontabil || 0)).map(im => {
      const imCap = im.valorcontabil > 0 && im.aluguelcontratado > 0 ? (im.aluguelcontratado * 12 / im.valorcontabil * 100) : 0;
      return h('div', { class: 'card', style: { marginBottom: '10px', borderLeft: '3px solid #d4a574', padding: '14px 18px' } }, [
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' } }, [
          h('div', {}, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px' } }, im.nomecomercial || 'Imóvel'),
            h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' } },
              [im.logradouro, im.numero, im.cidade, im.estado].filter(Boolean).join(', ')),
          ]),
          h('div', { style: { textAlign: 'right' } }, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '17px', color: 'var(--amber)' } }, formatBRL(im.valorcontabil)),
            h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, (im.valorcontabil / pl * 100).toFixed(1) + '% PL'),
          ]),
        ]),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', fontSize: '11px' } }, [
          h('div', {}, [h('span', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Tipo'), h('div', {}, TIPO_IMOVEL[im.tipoimovel] || '—')]),
          h('div', {}, [h('span', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Uso'), h('div', {}, TIPO_USO[im.tipouso] || '—')]),
          im.percpart && h('div', {}, [h('span', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Participação'), h('div', {}, im.percpart + '%')]),
          im.aluguelcontratado > 0 && h('div', {}, [h('span', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Aluguel'), h('div', {}, formatBRL(im.aluguelcontratado) + '/mês')]),
          imCap > 0 && h('div', {}, [h('span', { class: 'mono', style: { fontSize: '8px', color: 'var(--text-faint)', textTransform: 'uppercase' } }, 'Cap Rate'), h('div', {}, imCap.toFixed(2) + '%')]),
          im.aluguelatrasado > 0 && h('div', {}, [h('span', { class: 'mono', style: { fontSize: '8px', color: 'var(--red)', textTransform: 'uppercase' } }, 'Atrasado'), h('div', { style: { color: 'var(--red)' } }, formatBRL(im.aluguelatrasado))]),
          h('div', {}, [h('span', { class: 'mono', style: { fontSize: '8px', color: im.questjur === 'S' ? 'var(--red)' : 'var(--text-faint)', textTransform: 'uppercase' } }, 'Questão Jurídica'), h('div', { style: { color: im.questjur === 'S' ? 'var(--red)' : 'var(--green)' } }, im.questjur === 'S' ? 'Sim' : 'Não')]),
        ].filter(Boolean)),
      ]);
    }),
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
            return h('div', { class: 'card', style: { marginBottom: '12px', borderLeft: '3px solid #d4a574', padding: '18px 22px', cursor: 'pointer' }, onClick: () => { state._re_detail = im; render(); } }, [
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
                  .map(c => h('tr', { style: { borderTop: '1px solid var(--border)', cursor: 'pointer' }, onClick: () => { state._credit_detail = c; render(); } }, [
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
      h('button', { class: 'btn-secondary', onClick: () => exportRiskReportPDF(fund, risk, carteira) }, '↓ Relatório PDF'),
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

    // Methodology
    h('div', { class: 'card', style: { padding: '18px', marginBottom: '24px', background: 'var(--bg-3)' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '15px', marginBottom: '12px' } }, 'Metodologias Utilizadas'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' } }, [
        renderMethodCard('HHI — Herfindahl-Hirschman', 'Concentração do portfólio. Soma dos quadrados dos pesos de cada posição.', 'HHI = Σ(wi²)', [['< 0.15', 'Diversificado', 'var(--green)'], ['0.15–0.25', 'Moderado', 'var(--amber)'], ['> 0.25', 'Concentrado', 'var(--red)']]),
        fp.hasCredit && renderMethodCard('PDD — Provisão p/ Devedores Duvidosos', 'Percentual provisionado sobre o valor do ativo de crédito como expectativa de perda.', 'PDD% = Provisão / Valor do Ativo', [['< 5%', 'Baixo risco', 'var(--green)'], ['5–15%', 'Atenção', 'var(--amber)'], ['> 15%', 'Alto risco', 'var(--red)']]),
        fp.hasCredit && renderMethodCard('LGD — Loss Given Default', 'Perda estimada em caso de inadimplência, ponderada por recovery rate e colateral.', 'LGD = 1 - Recovery Rate', [['< 30%', 'Baixa', 'var(--green)'], ['30–60%', 'Média', 'var(--amber)'], ['> 60%', 'Alta', 'var(--red)']]),
        renderMethodCard('VaR — Value at Risk (paramétrico)', 'Perda máxima esperada com 95% de confiança em 21 dias úteis, baseado na volatilidade das cotas.', 'VaR = Cota × σ × z(95%) × √21', [['< 3% PL', 'Baixo', 'var(--green)'], ['3–8% PL', 'Moderado', 'var(--amber)'], ['> 8% PL', 'Alto', 'var(--red)']]),
        renderMethodCard('Duration — Prazo Médio Ponderado', 'Prazo médio até vencimento dos ativos, ponderado pelo valor de cada posição.', 'D = Σ(wi × Ti)', [['< 2 anos', 'Curta', 'var(--green)'], ['2–5 anos', 'Média', 'var(--amber)'], ['> 5 anos', 'Longa', 'var(--red)']]),
        fp.hasImoveis && renderMethodCard('Cap Rate — Taxa de Capitalização', 'Retorno anualizado dos aluguéis sobre o valor contábil dos imóveis.', 'Cap Rate = (Aluguel × 12) / Valor Contábil', [['> 8%', 'Alto retorno', 'var(--green)'], ['5–8%', 'Médio', 'var(--amber)'], ['< 5%', 'Baixo', 'var(--red)']]),
      ].filter(Boolean)),
    ]),

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
  sbUpsert('resgate:' + fundId + ':' + item.id, item);
}
function deleteResgateForecast(fundId, id) {
  if (!DB.resgateForecasts) return;
  DB.resgateForecasts[fundId] = (DB.resgateForecasts[fundId] || []).filter(f => f.id !== id);
  saveDB(DB);
  sbDelete('resgate:' + fundId + ':' + id);
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
  sbUpsert('haircut:' + fundId, DB.liquidityHaircuts[fundId]);
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
      sbUpsert('misc:anbimaMatrix', DB.anbimaMatrix);
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

    // Concentration panels
    carteira && h('div', { style: { marginTop: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Painel de Concentração'),
      (() => {
        const positions = carteira.positions || {};
        const all = [...(positions.acoes||[]),...(positions.titprivado||[]),...(positions.titpublico||[]),...(positions.cotas||[])];
        const pl = carteira.fund.patliq || 1;

        // By asset class
        const byClass = {};
        const addClass = (label, arr, fn) => { const v = arr.reduce((a,p) => a + (fn(p)||0), 0); if (v > 0) byClass[label] = { value: v, pct: v/pl*100, count: arr.length }; };
        addClass('Ações/FIIs', positions.acoes||[], p => p.valorfindisp);
        addClass('Títulos Privados', positions.titprivado||[], p => p.valorfindisp);
        addClass('Títulos Públicos', positions.titpublico||[], p => p.valorfindisp);
        addClass('Cotas de Fundos', positions.cotas||[], p => p.valorfindisp||((p.qtdisponivel||0)*(p.puposicao||0)));
        if ((positions.imoveis||[]).length > 0) { const v = (positions.imoveis||[]).reduce((a,p) => a+(p.valorcontabil||0), 0); byClass['Imóveis'] = { value: v, pct: v/pl*100, count: (positions.imoveis||[]).length }; }

        // By issuer (top emitters for tit privado)
        const byEmissor = {};
        for (const p of (positions.titprivado||[])) {
          const key = (p.codativo||'').split(/[_-]/)[0] || p.codativo || 'Outros';
          if (!byEmissor[key]) byEmissor[key] = { value: 0, count: 0 };
          byEmissor[key].value += p.valorfindisp || 0;
          byEmissor[key].count++;
        }

        // By indexer
        const byIdx = {};
        for (const p of [...(positions.titprivado||[]),...(positions.titpublico||[])]) {
          const idx = p.indexador || 'Outros';
          if (!byIdx[idx]) byIdx[idx] = { value: 0, count: 0 };
          byIdx[idx].value += p.valorfindisp || 0;
          byIdx[idx].count++;
        }

        // By maturity bucket
        const now = new Date();
        const byVenc = { '< 1 ano': 0, '1–3 anos': 0, '3–5 anos': 0, '> 5 anos': 0, 'Sem venc.': 0 };
        for (const p of [...(positions.titprivado||[]),...(positions.titpublico||[])]) {
          const v = p.valorfindisp || 0;
          if (!p.dtvencimento) { byVenc['Sem venc.'] += v; continue; }
          const years = (new Date(p.dtvencimento) - now) / (365.25*86400000);
          if (years < 1) byVenc['< 1 ano'] += v;
          else if (years < 3) byVenc['1–3 anos'] += v;
          else if (years < 5) byVenc['3–5 anos'] += v;
          else byVenc['> 5 anos'] += v;
        }

        const renderConcentrationTable = (title, data, limit) => {
          const entries = Object.entries(data).sort((a,b) => (b[1].value||b[1]) - (a[1].value||a[1]));
          return h('div', { class: 'card', style: { padding: 0, overflow: 'auto', marginBottom: '12px' } }, [
            h('div', { class: 'mono', style: { fontSize: '10px', padding: '8px 14px', background: 'var(--bg-3)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, title),
            ...entries.map(([name, d], i) => {
              const val = typeof d === 'number' ? d : d.value;
              const pct = val / pl * 100;
              const barW = Math.max(2, Math.min(95, pct));
              const overLimit = limit && pct > limit;
              return h('div', { style: { padding: '8px 14px', borderTop: '1px solid var(--border)' } }, [
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '3px' } }, [
                  h('span', { class: 'mono', style: { fontSize: '11px', fontWeight: '500' } }, name + (d.count ? ' (' + d.count + ')' : '')),
                  h('span', { class: 'mono', style: { fontSize: '11px', color: overLimit ? 'var(--red)' : 'var(--text-faint)' } }, pct.toFixed(1) + '% · ' + formatBRL(val) + (overLimit ? ' ⚠' : '')),
                ]),
                h('div', { style: { height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' } }, [
                  h('div', { style: { width: barW + '%', height: '100%', background: overLimit ? 'var(--red)' : pct > 15 ? 'var(--amber)' : 'var(--green)', borderRadius: '2px' } }),
                ]),
              ]);
            }),
          ]);
        };

        return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } }, [
          renderConcentrationTable('Concentração por Classe de Ativo', byClass, 50),
          renderConcentrationTable('Concentração por Emissor (Tít. Privados)', byEmissor, 20),
          renderConcentrationTable('Concentração por Indexador', byIdx, 40),
          renderConcentrationTable('Concentração por Prazo de Vencimento', byVenc),
        ]);
      })(),
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
  sbUpsert('asset:' + analysis.id, analysis);
}

function deleteAssetAnalysis(id) {
  if (!confirm('Excluir esta análise?')) return;
  DB.assetAnalyses = getAssetAnalyses().filter(a => a.id !== id);
  saveDB(DB);
  sbDelete('asset:' + id);
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
        h('button', { class: 'btn-secondary', onClick: () => exportAssetAnalysisPDF(a) }, '↓ Relatório PDF'),
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
  sbUpsert('equity:' + asset.id, asset);
}

function deleteEquityAsset(id) {
  if (!confirm('Excluir este empreendimento?')) return;
  DB.equityAssets = getEquityAssets().filter(a => a.id !== id);
  saveDB(DB);
  sbDelete('equity:' + id); state._active_equity = null; render();
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

/* ============================================================
   WORKFLOW — Task Management & ERP
   ============================================================ */

// === Task Templates ===
const TASK_TEMPLATES = {
  comite: {
    label: 'Solicitação de Comitê',
    icon: '📋',
    defaultPriority: 'high',
    checklist: [
      'Preparar contexto macroeconômico',
      'Analisar carteira atual do fundo',
      'Elaborar proposta de movimentação',
      'Anexar análise de risco',
      'Convocar membros do comitê',
      'Realizar reunião',
      'Registrar ata e deliberações',
    ],
  },
  analise: {
    label: 'Análise de Ativo',
    icon: '🔍',
    defaultPriority: 'medium',
    checklist: [
      'Identificar ativo e coletar dados',
      'Analisar estrutura e garantias',
      'Avaliar risco de crédito / mercado',
      'Calcular pricing / spread justo',
      'Elaborar parecer de investimento',
      'Submeter para revisão',
    ],
  },
  trading: {
    label: 'Pré-Trading',
    icon: '📈',
    defaultPriority: 'urgent',
    checklist: [
      'Confirmar deliberação do comitê',
      'Definir sizing e limites',
      'Verificar enquadramento regulatório',
      'Contatar contraparte / mesa',
      'Registrar operação',
      'Confirmar liquidação',
    ],
  },
  validacao: {
    label: 'Validação Diária de Carteira',
    icon: '✅',
    defaultPriority: 'high',
    checklist: [
      'Receber XML CVM do administrador',
      'Upload no sistema',
      'Verificar PL e valor de cota',
      'Conferir variações de posição',
      'Validar provisões e PDD',
      'Verificar enquadramento CVM 175',
      'Reportar divergências (se houver)',
    ],
  },
  rebalanceamento: {
    label: 'Rebalanceamento de Carteira',
    icon: '⚖️',
    defaultPriority: 'medium',
    checklist: [
      'Revisar alocação atual vs alvo',
      'Identificar desvios de enquadramento',
      'Propor movimentações de rebalanceamento',
      'Submeter ao comitê',
      'Executar trades aprovados',
    ],
  },
  relatorio: {
    label: 'Relatório Mensal / Trimestral',
    icon: '📄',
    defaultPriority: 'medium',
    checklist: [
      'Consolidar dados de performance',
      'Elaborar comentário do gestor',
      'Revisar atribuição de performance',
      'Atualizar lâmina e material',
      'Enviar para compliance',
      'Publicar / distribuir',
    ],
  },
  compliance: {
    label: 'Revisão de Compliance',
    icon: '🛡️',
    defaultPriority: 'high',
    checklist: [
      'Verificar enquadramento regulatório',
      'Revisar limites de concentração',
      'Verificar adequação de suitability',
      'Validar documentação',
      'Emitir parecer',
    ],
  },
  custom: {
    label: 'Tarefa Personalizada',
    icon: '📌',
    defaultPriority: 'medium',
    checklist: [],
  },
};

const TASK_STATUS = {
  pending:     { label: 'Pendente',     color: 'var(--text-faint)', icon: '○' },
  in_progress: { label: 'Em Andamento', color: 'var(--blue)',       icon: '◐' },
  review:      { label: 'Em Revisão',   color: 'var(--amber)',      icon: '◑' },
  done:        { label: 'Concluída',    color: 'var(--green)',      icon: '●' },
  cancelled:   { label: 'Cancelada',    color: 'var(--red)',        icon: '✕' },
};

const TASK_PRIORITY = {
  low:    { label: 'Baixa',   color: 'var(--text-faint)' },
  medium: { label: 'Média',   color: 'var(--blue)' },
  high:   { label: 'Alta',    color: 'var(--amber)' },
  urgent: { label: 'Urgente', color: 'var(--red)' },
};

// === Data ===
function getTasks() { if (!Array.isArray(DB.tasks)) DB.tasks = []; return DB.tasks; }

function saveTask(task) {
  if (!Array.isArray(DB.tasks)) DB.tasks = [];
  task.updated_at = new Date().toISOString();
  const idx = DB.tasks.findIndex(t => t.id === task.id);
  if (idx >= 0) DB.tasks[idx] = task;
  else DB.tasks.push(task);
  saveDB(DB);
  sbUpsert('task:' + task.id, task);
}

function deleteTask(id) {
  DB.tasks = getTasks().filter(t => t.id !== id);
  saveDB(DB);
  sbDelete('task:' + id);
}

function getAnalystName() {
  return _user?.name || 'Analista';
}

// === Board View (Kanban) ===
function renderWorkflowBoard() {
  const tasks = getTasks();
  const columns = ['pending', 'in_progress', 'review', 'done'];

  // Stats
  const total = tasks.filter(t => t.status !== 'cancelled').length;
  const overdue = tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().split('T')[0] && t.status !== 'done' && t.status !== 'cancelled').length;
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done' && t.status !== 'cancelled').length;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Workflow', 'Painel de <em>Tarefas</em>', total + ' tarefa(s) ativa(s)' + (overdue > 0 ? ' · ' + overdue + ' atrasada(s)' : '')),

    // KPIs
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '24px' } }, [
      renderPortKPI('Pendentes', String(tasks.filter(t => t.status === 'pending').length), ''),
      renderPortKPI('Em Andamento', String(tasks.filter(t => t.status === 'in_progress').length), ''),
      renderPortKPI('Em Revisão', String(tasks.filter(t => t.status === 'review').length), ''),
      renderPortKPI('Concluídas', String(tasks.filter(t => t.status === 'done').length), ''),
      overdue > 0 && renderPortKPI('Atrasadas', String(overdue), 'Atenção!'),
      urgent > 0 && renderPortKPI('Urgentes', String(urgent), ''),
    ].filter(Boolean)),

    // Quick add
    h('div', { style: { marginBottom: '24px' } }, [
      h('button', { class: 'btn-primary', onClick: () => setView('wf_new') }, '+ Nova Tarefa'),
    ]),

    // Kanban columns
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', alignItems: 'start' } },
      columns.map(status => {
        const st = TASK_STATUS[status];
        const colTasks = tasks.filter(t => t.status === status).sort((a, b) => {
          const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
        });
        return h('div', { style: { minHeight: '200px' } }, [
          h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: st.color, marginBottom: '10px', fontWeight: '600' } },
            st.icon + ' ' + st.label + ' (' + colTasks.length + ')'),
          ...colTasks.map(t => renderTaskCard(t)),
        ]);
      })
    ),
  ]);
}

function renderTaskCard(task) {
  const tmpl = TASK_TEMPLATES[task.type] || TASK_TEMPLATES.custom;
  const pr = TASK_PRIORITY[task.priority] || TASK_PRIORITY.medium;
  const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'done' && task.status !== 'cancelled';
  const checkDone = (task.checklist || []).filter(c => c.done).length;
  const checkTotal = (task.checklist || []).length;
  const fund = task.fund_id ? getFunds().find(f => f.id === task.fund_id) : null;

  return h('div', { class: 'card', style: { padding: '12px 14px', marginBottom: '8px', borderLeft: '3px solid ' + pr.color, cursor: 'pointer' },
    onClick: () => { state._active_task = task.id; render(); }
  }, [
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } }, [
      h('span', { style: { fontSize: '11px' } }, tmpl.icon + ' ' + tmpl.label),
      h('span', { class: 'mono', style: { fontSize: '9px', padding: '1px 5px', border: '1px solid ' + pr.color, color: pr.color } }, pr.label),
    ]),
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px', marginBottom: '4px' } }, task.title),
    h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', display: 'flex', gap: '10px', flexWrap: 'wrap' } }, [
      task.assignee && h('span', {}, '→ ' + task.assignee),
      fund && h('span', {}, '📁 ' + fund.name),
      task.due_date && h('span', { style: { color: isOverdue ? 'var(--red)' : 'var(--text-faint)' } }, '📅 ' + task.due_date + (isOverdue ? ' ⚠' : '')),
      checkTotal > 0 && h('span', {}, '☑ ' + checkDone + '/' + checkTotal),
    ]),
  ]);
}

// === My Tasks ===
function renderMyTasks() {
  const name = getAnalystName();
  const tasks = getTasks().filter(t => t.assignee === name && t.status !== 'cancelled');

  return h('div', { class: 'content fade-up' }, [
    pageHead('Workflow', 'Minhas <em>Tarefas</em>', tasks.length + ' tarefa(s) atribuída(s) a ' + name),

    tasks.length === 0
      ? h('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Nenhuma tarefa atribuída a você.')
      : h('div', {}, tasks.sort((a, b) => {
          const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
        }).map(t => renderTaskCard(t))),
  ]);
}

// === New Task ===
function renderNewTask() {
  const funds = getFunds();
  const today = new Date().toISOString().split('T')[0];

  return h('div', { class: 'content fade-up' }, [
    pageHead('Workflow', 'Nova <em>Tarefa</em>', 'Selecione um tipo ou crie uma tarefa personalizada'),

    // Template picker
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' } },
      Object.entries(TASK_TEMPLATES).map(([key, tmpl]) =>
        h('div', { class: 'card', style: { padding: '16px', cursor: 'pointer', borderLeft: '3px solid var(--amber)' },
          onClick: () => {
            const task = {
              id: 'task_' + Date.now(),
              type: key,
              title: tmpl.label,
              description: '',
              status: 'pending',
              priority: tmpl.defaultPriority,
              assignee: getAnalystName(),
              requester: getAnalystName(),
              fund_id: '',
              due_date: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              comments: [],
              checklist: tmpl.checklist.map(item => ({ item, done: false })),
            };
            state._editing_task = task;
            render();
          }
        }, [
          h('div', { style: { fontSize: '24px', marginBottom: '8px' } }, tmpl.icon),
          h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px', marginBottom: '4px' } }, tmpl.label),
          h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, tmpl.checklist.length + ' etapa(s)'),
        ])
      )
    ),

    // Edit form (if template selected)
    state._editing_task && renderTaskForm(state._editing_task),
  ]);
}

// === Task Form ===
function renderTaskForm(task) {
  const funds = getFunds();
  return h('div', { style: { borderTop: '2px solid var(--amber)', paddingTop: '20px', marginTop: '12px' } }, [
    h('div', { class: 'macro-section-subhead' }, 'Configurar Tarefa'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' } }, [
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Título'),
        h('input', { class: 'form-field-input', id: 'tf-title', value: task.title }),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Fundo Relacionado'),
        h('select', { class: 'form-field-select', id: 'tf-fund' }, [
          h('option', { value: '' }, '— Nenhum —'),
          ...funds.map(f => h('option', { value: f.id, selected: task.fund_id === f.id ? 'selected' : null }, f.name)),
        ]),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Responsável'),
        h('select', { class: 'form-field-select', id: 'tf-assignee' }, [
          ..._allUsers.map(u => h('option', { value: u.name, selected: (task.assignee || getAnalystName()) === u.name ? 'selected' : null }, u.name + ' (' + (ROLES[u.role]?.label || u.role) + ')')),
          _allUsers.length === 0 && h('option', { value: getAnalystName() }, getAnalystName()),
        ]),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Prazo'),
        h('input', { class: 'form-field-input', type: 'date', id: 'tf-due', value: task.due_date }),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Prioridade'),
        h('select', { class: 'form-field-select', id: 'tf-priority' },
          Object.entries(TASK_PRIORITY).map(([k, v]) => h('option', { value: k, selected: task.priority === k ? 'selected' : null }, v.label))
        ),
      ]),
      h('div', {}, [
        h('label', { class: 'form-field-label' }, 'Status'),
        h('select', { class: 'form-field-select', id: 'tf-status' },
          Object.entries(TASK_STATUS).map(([k, v]) => h('option', { value: k, selected: task.status === k ? 'selected' : null }, v.label))
        ),
      ]),
    ]),
    h('div', { style: { marginBottom: '16px' } }, [
      h('label', { class: 'form-field-label' }, 'Descrição / Contexto'),
      h('textarea', { class: 'form-field-input', id: 'tf-desc', rows: '3', style: { resize: 'vertical' } }, task.description || ''),
    ]),

    h('div', { style: { display: 'flex', gap: '10px' } }, [
      h('button', { class: 'btn-primary', onClick: () => {
        task.title = document.getElementById('tf-title')?.value || task.title;
        task.fund_id = document.getElementById('tf-fund')?.value || '';
        task.assignee = document.getElementById('tf-assignee')?.value || '';
        task.due_date = document.getElementById('tf-due')?.value || '';
        task.priority = document.getElementById('tf-priority')?.value || 'medium';
        task.status = document.getElementById('tf-status')?.value || 'pending';
        task.description = document.getElementById('tf-desc')?.value || '';
        saveTask(task);
        state._editing_task = null;
        state._active_task = task.id;
        showToast('Tarefa salva');
        render();
      }}, 'Salvar Tarefa'),
      h('button', { class: 'btn-secondary', onClick: () => { state._editing_task = null; setView('wf_board'); }}, 'Cancelar'),
    ]),
  ]);
}

// === Task Detail ===
function renderTaskDetail(taskId) {
  const task = getTasks().find(t => t.id === taskId);
  if (!task) { state._active_task = null; return renderWorkflowBoard(); }

  const tmpl = TASK_TEMPLATES[task.type] || TASK_TEMPLATES.custom;
  const pr = TASK_PRIORITY[task.priority] || TASK_PRIORITY.medium;
  const st = TASK_STATUS[task.status] || TASK_STATUS.pending;
  const fund = task.fund_id ? getFunds().find(f => f.id === task.fund_id) : null;
  const checkDone = (task.checklist || []).filter(c => c.done).length;
  const checkTotal = (task.checklist || []).length;
  const progress = checkTotal > 0 ? (checkDone / checkTotal * 100) : 0;

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._active_task = null; render(); } }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' } }, [
      h('div', {}, [
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' } }, tmpl.icon + ' ' + tmpl.label),
        h('h1', { style: { fontFamily: 'Fraunces, serif', fontSize: '24px', margin: 0 } }, task.title),
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '6px' } },
          'Criada por ' + task.requester + ' em ' + (task.created_at || '').split('T')[0] + (fund ? ' · 📁 ' + fund.name : '')),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-secondary', onClick: () => { state._editing_task = JSON.parse(JSON.stringify(task)); setView('wf_new'); }}, 'Editar'),
        h('button', { class: 'btn-secondary', style: { color: 'var(--red)' }, onClick: () => { if (confirm('Excluir tarefa?')) { deleteTask(task.id); state._active_task = null; showToast('Tarefa excluída'); setView('wf_board'); } }}, 'Excluir'),
      ]),
    ]),

    // Status + Priority + Assignee
    h('div', { style: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' } }, [
      h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
        h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, 'Status:'),
        ...Object.entries(TASK_STATUS).filter(([k]) => k !== 'cancelled').map(([k, v]) =>
          h('button', { class: 'mono', style: { fontSize: '9px', padding: '3px 8px', border: '1px solid ' + (task.status === k ? v.color : 'var(--border)'), color: task.status === k ? v.color : 'var(--text-faint)', background: task.status === k ? v.color + '11' : 'transparent', cursor: 'pointer', borderRadius: '3px', fontWeight: task.status === k ? '600' : '400' },
            onClick: () => { task.status = k; saveTask(task); render(); }
          }, v.icon + ' ' + v.label)
        ),
      ]),
      h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, [
        h('span', {}, '→ ' + (task.assignee || '?')),
        task.due_date && h('span', {}, ' · 📅 ' + task.due_date),
        h('span', { style: { color: pr.color } }, ' · ' + pr.label),
      ]),
    ]),

    // Progress bar
    checkTotal > 0 && h('div', { style: { marginBottom: '20px' } }, [
      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' } }, [
        h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Progresso'),
        h('span', { class: 'mono', style: { fontSize: '10px', color: progress === 100 ? 'var(--green)' : 'var(--amber)' } }, checkDone + '/' + checkTotal + ' (' + progress.toFixed(0) + '%)'),
      ]),
      h('div', { style: { height: '6px', background: 'var(--bg-3)', borderRadius: '3px', overflow: 'hidden' } }, [
        h('div', { style: { height: '100%', width: progress + '%', background: progress === 100 ? 'var(--green)' : 'var(--amber)', borderRadius: '3px', transition: 'width 0.3s' } }),
      ]),
    ]),

    // Description
    task.description && h('div', { class: 'card', style: { padding: '14px 18px', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '6px' } }, 'Descrição'),
      h('div', { style: { fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' } }, task.description),
    ]),

    // Checklist
    checkTotal > 0 && h('div', { style: { marginBottom: '20px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Checklist'),
      h('div', { class: 'card', style: { padding: 0 } },
        (task.checklist || []).map((item, i) =>
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer' },
            onClick: () => { task.checklist[i].done = !task.checklist[i].done; saveTask(task); render(); }
          }, [
            h('div', { style: { width: '18px', height: '18px', border: '2px solid ' + (item.done ? 'var(--green)' : 'var(--border)'), borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', background: item.done ? 'var(--green)' : 'transparent', color: '#fff', fontSize: '12px' } }, item.done ? '✓' : ''),
            h('span', { style: { fontSize: '13px', textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-faint)' : 'var(--text)' } }, item.item),
          ])
        )
      ),
    ]),

    // Comments
    h('div', { style: { marginBottom: '20px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Comentários (' + (task.comments || []).length + ')'),
      ...(task.comments || []).map(c =>
        h('div', { class: 'card', style: { padding: '10px 14px', marginBottom: '6px' } }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' } }, [
            h('span', { class: 'mono', style: { fontSize: '10px', fontWeight: '600', color: 'var(--amber)' } }, c.author),
            h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, (c.date || '').split('T')[0]),
          ]),
          h('div', { style: { fontSize: '12px', lineHeight: '1.5' } }, c.text),
        ])
      ),
      h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } }, [
        h('input', { class: 'form-field-input', id: 'wf-comment', style: { flex: 1 }, placeholder: 'Adicionar comentário...' }),
        h('button', { class: 'btn-primary', onClick: () => {
          const text = document.getElementById('wf-comment')?.value?.trim();
          if (!text) return;
          if (!task.comments) task.comments = [];
          task.comments.push({ author: getAnalystName(), text, date: new Date().toISOString() });
          saveTask(task);
          render();
        }}, 'Enviar'),
      ]),
    ]),
  ]);
}

/* ============================================================
   DAILY CASH FLOW WATERFALL
   ============================================================ */
function renderCarteiraFluxo(parsed, fund) {
  const carteiras = getCarteirasXML(fund.cnpj);
  const currIdx = carteiras.findIndex(c => c.fund.dtposicao === parsed.fund.dtposicao);
  const prev = currIdx > 0 ? carteiras[currIdx - 1] : null;

  if (!prev) return h('div', { style: { padding:'30px', textAlign:'center', color:'var(--text-faint)' } }, 'Necessário ao menos 2 carteiras para calcular o fluxo. Suba a carteira do dia anterior.');

  const plPrev = prev.fund.patliq || 0;
  const plCurr = parsed.fund.patliq || 0;
  const deltaPL = plCurr - plPrev;

  // Calculate components
  const prevAll = [...(prev.positions?.acoes||[]),...(prev.positions?.titprivado||[]),...(prev.positions?.titpublico||[]),...(prev.positions?.cotas||[])];
  const currAll = [...(parsed.positions?.acoes||[]),...(parsed.positions?.titprivado||[]),...(parsed.positions?.titpublico||[]),...(parsed.positions?.cotas||[])];
  const prevMap = {}; for (const p of prevAll) prevMap[p.codativo||p.isin||p.cnpjfundo||'']=p;
  const currMap = {}; for (const p of currAll) currMap[p.codativo||p.isin||p.cnpjfundo||'']=p;

  let valorization = 0, newAssets = 0, exitedAssets = 0;
  const newList = [], exitList = [], topGains = [], topLosses = [];

  for (const p of currAll) {
    const key = p.codativo||p.isin||p.cnpjfundo||'';
    const val = p.valorfindisp||((p.qtdisponivel||0)*(p.puposicao||0));
    const pv = prevMap[key];
    if (pv) {
      const prevVal = pv.valorfindisp||((pv.qtdisponivel||0)*(pv.puposicao||0));
      const d = val - prevVal;
      valorization += d;
      if (d > 0) topGains.push({ name: key, delta: d });
      else if (d < 0) topLosses.push({ name: key, delta: d });
    } else {
      newAssets += val;
      newList.push({ name: key, val });
    }
  }
  for (const p of prevAll) {
    const key = p.codativo||p.isin||p.cnpjfundo||'';
    if (!currMap[key]) {
      const val = p.valorfindisp||((p.qtdisponivel||0)*(p.puposicao||0));
      exitedAssets -= val;
      exitList.push({ name: key, val });
    }
  }

  const caixaPrev = prev.stats?.totalCaixa || 0;
  const caixaCurr = parsed.stats?.totalCaixa || 0;
  const deltaCaixa = caixaCurr - caixaPrev;
  const provPrev = prev.provisoes?.reduce((a,p) => a+(p.valor||0), 0) || 0;
  const provCurr = parsed.provisoes?.reduce((a,p) => a+(p.valor||0), 0) || 0;
  const deltaProv = provCurr - provPrev;
  const residual = deltaPL - valorization - newAssets - exitedAssets - deltaCaixa - deltaProv;

  topGains.sort((a,b) => b.delta - a.delta);
  topLosses.sort((a,b) => a.delta - b.delta);

  const flowItems = [
    { label: 'PL Anterior (' + prev.fund.dtposicao + ')', value: plPrev, type: 'base' },
    { label: 'Valorização de Ativos', value: valorization, type: 'delta' },
    newAssets !== 0 && { label: 'Novos Ativos (' + newList.length + ')', value: newAssets, type: 'delta' },
    exitedAssets !== 0 && { label: 'Ativos que Saíram (' + exitList.length + ')', value: exitedAssets, type: 'delta' },
    deltaCaixa !== 0 && { label: 'Δ Caixa', value: deltaCaixa, type: 'delta' },
    deltaProv !== 0 && { label: 'Δ Provisões', value: deltaProv, type: 'delta' },
    Math.abs(residual) > 1 && { label: 'Aportes/Resgates/Outros', value: residual, type: 'delta' },
    { label: 'PL Atual (' + parsed.fund.dtposicao + ')', value: plCurr, type: 'result' },
  ].filter(Boolean);

  return h('div', {}, [
    h('div', { class:'macro-section-subhead' }, 'Fluxo do PL: ' + prev.fund.dtposicao + ' → ' + parsed.fund.dtposicao),

    // Waterfall
    h('div', { class:'card', style: { padding:'20px', marginBottom:'20px' } },
      flowItems.map((item, i) => {
        const c = item.type === 'base' ? 'var(--text-faint)' : item.type === 'result' ? 'var(--amber)' : item.value >= 0 ? 'var(--green)' : 'var(--red)';
        const isLast = item.type === 'result';
        return h('div', { style: { display:'flex', alignItems:'center', gap:'12px', padding:'8px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', borderTopWidth: isLast ? '2px' : '1px' } }, [
          h('div', { style: { flex:1, fontSize: isLast ? '14px' : '12px', fontWeight: isLast ? '600' : '400' } }, item.label),
          h('div', { class:'mono', style: { fontSize: isLast ? '16px' : '13px', fontWeight:'600', color: c, textAlign:'right', minWidth:'140px' } },
            (item.type === 'delta' && item.value >= 0 ? '+' : '') + formatBRL(item.value)),
        ]);
      })
    ),

    // Top movers
    h('div', { style: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' } }, [
      topGains.length > 0 && h('div', {}, [
        h('div', { class:'mono', style: { fontSize:'9px', color:'var(--green)', textTransform:'uppercase', marginBottom:'6px' } }, 'Maiores Valorizações'),
        h('div', { class:'card', style: { padding:0 } },
          topGains.slice(0,5).map((g,i) => h('div', { class:'mono', style: { display:'flex', justifyContent:'space-between', padding:'6px 12px', borderTop: i>0?'1px solid var(--border)':'none', fontSize:'11px' } }, [
            h('span', {}, g.name), h('span', { style: { color:'var(--green)' } }, '+' + formatBRL(g.delta)),
          ]))
        ),
      ]),
      topLosses.length > 0 && h('div', {}, [
        h('div', { class:'mono', style: { fontSize:'9px', color:'var(--red)', textTransform:'uppercase', marginBottom:'6px' } }, 'Maiores Desvalorizações'),
        h('div', { class:'card', style: { padding:0 } },
          topLosses.slice(0,5).map((g,i) => h('div', { class:'mono', style: { display:'flex', justifyContent:'space-between', padding:'6px 12px', borderTop: i>0?'1px solid var(--border)':'none', fontSize:'11px' } }, [
            h('span', {}, g.name), h('span', { style: { color:'var(--red)' } }, formatBRL(g.delta)),
          ]))
        ),
      ]),
    ].filter(Boolean)),
  ]);
}

/* ============================================================
   DAILY VERIFICATION PIPELINE
   ============================================================ */
const DAILY_PIPELINE = [
  { id: 'xml_recebido', label: 'XML CVM recebido do administrador' },
  { id: 'xml_upload', label: 'XML carregado no sistema' },
  { id: 'pl_conferido', label: 'PL e cota conferidos' },
  { id: 'posicoes_validadas', label: 'Variações de posição validadas' },
  { id: 'provisoes_ok', label: 'Provisões e PDD verificados' },
  { id: 'enquadramento_ok', label: 'Enquadramento CVM 175 verificado' },
  { id: 'divergencias', label: 'Divergências reportadas (se houver)' },
  { id: 'aprovado', label: 'Carteira aprovada pelo gestor' },
];

function getDailyPipeline(cnpj, date) {
  if (!DB._dailyPipeline) DB._dailyPipeline = {};
  const key = cnpj + ':' + date;
  if (!DB._dailyPipeline[key]) DB._dailyPipeline[key] = { items: DAILY_PIPELINE.map(p => ({ ...p, done: false, analyst: '' })) };
  return DB._dailyPipeline[key];
}

function saveDailyPipeline(cnpj, date) {
  saveDB(DB);
  sbUpsert('pipeline:' + cnpj + ':' + date, DB._dailyPipeline[cnpj + ':' + date]);
}

function renderDailyPipeline(parsed, fund) {
  const date = parsed.fund.dtposicao;
  const pipeline = getDailyPipeline(fund.cnpj, date);
  const done = pipeline.items.filter(i => i.done).length;
  const total = pipeline.items.length;
  const pct = total > 0 ? (done / total * 100) : 0;
  const analystName = _user?.name || 'Analista';

  return h('div', {}, [
    h('div', { class:'macro-section-subhead' }, 'Pipeline Diário — ' + date),
    h('div', { style: { display:'flex', justifyContent:'space-between', marginBottom:'4px' } }, [
      h('span', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)' } }, 'Progresso'),
      h('span', { class:'mono', style: { fontSize:'10px', color: pct===100?'var(--green)':'var(--amber)' } }, done+'/'+total+' ('+pct.toFixed(0)+'%)'),
    ]),
    h('div', { style: { height:'6px', background:'var(--bg-3)', borderRadius:'3px', overflow:'hidden', marginBottom:'16px' } }, [
      h('div', { style: { height:'100%', width:pct+'%', background: pct===100?'var(--green)':'var(--amber)', borderRadius:'3px', transition:'width 0.3s' } }),
    ]),
    h('div', { class:'card', style: { padding:0 } },
      pipeline.items.map((item, i) =>
        h('div', { style: { display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderTop: i>0?'1px solid var(--border)':'none', cursor:'pointer' },
          onClick: () => {
            if (!item.done) { item.done = true; item.analyst = analystName; item.done_at = new Date().toISOString(); }
            else { item.done = false; item.analyst = ''; item.done_at = ''; }
            saveDailyPipeline(fund.cnpj, date);
            render();
          }
        }, [
          h('div', { style: { width:'20px', height:'20px', border:'2px solid '+(item.done?'var(--green)':'var(--border)'), borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:'0', background:item.done?'var(--green)':'transparent', color:'#fff', fontSize:'12px' } }, item.done?'✓':''),
          h('div', { style: { flex:1 } }, [
            h('span', { style: { fontSize:'13px', textDecoration:item.done?'line-through':'none', color:item.done?'var(--text-faint)':'var(--text)' } }, item.label),
            item.done && item.analyst && h('div', { class:'mono', style: { fontSize:'9px', color:'var(--text-faint)', marginTop:'2px' } }, '✓ ' + item.analyst + ' · ' + (item.done_at||'').split('T')[0]),
          ]),
        ])
      )
    ),
  ]);
}

/* ============================================================
   IMPORTANT FUND DATES
   ============================================================ */
function getFundDates(fundId) {
  if (!DB._fundDates) DB._fundDates = {};
  if (!DB._fundDates[fundId]) DB._fundDates[fundId] = [];
  return DB._fundDates[fundId];
}

function saveFundDate(fundId, dateEntry) {
  if (!DB._fundDates) DB._fundDates = {};
  if (!DB._fundDates[fundId]) DB._fundDates[fundId] = [];
  dateEntry.updated_at = new Date().toISOString();
  const idx = DB._fundDates[fundId].findIndex(d => d.id === dateEntry.id);
  if (idx >= 0) DB._fundDates[fundId][idx] = dateEntry;
  else DB._fundDates[fundId].push(dateEntry);
  saveDB(DB);
  sbUpsert('funddates:' + fundId, DB._fundDates[fundId]);
}

function deleteFundDate(fundId, dateId) {
  if (!DB._fundDates?.[fundId]) return;
  DB._fundDates[fundId] = DB._fundDates[fundId].filter(d => d.id !== dateId);
  saveDB(DB);
  sbUpsert('funddates:' + fundId, DB._fundDates[fundId]);
}

function renderFundDates(fund) {
  const dates = getFundDates(fund.id);
  const today = new Date().toISOString().split('T')[0];
  const upcoming = dates.filter(d => d.date >= today).sort((a,b) => a.date.localeCompare(b.date));
  const past = dates.filter(d => d.date < today).sort((a,b) => b.date.localeCompare(a.date));

  return h('div', {}, [
    h('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' } }, [
      h('div', { class:'macro-section-subhead', style: { marginBottom:0 } }, 'Datas Importantes'),
      h('button', { class:'btn-secondary', style: { fontSize:'10px' }, onClick: () => { state._addingDate = fund.id; render(); }}, '+ Adicionar Data'),
    ]),

    state._addingDate === fund.id && h('div', { class:'card', style: { padding:'14px', marginBottom:'12px', borderLeft:'3px solid var(--amber)' } }, [
      h('div', { style: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'10px' } }, [
        h('div', {}, [ h('label', { class:'form-field-label' }, 'Descrição'), h('input', { class:'form-field-input', id:'fd-desc', placeholder:'Ex: Auditoria anual' }) ]),
        h('div', {}, [ h('label', { class:'form-field-label' }, 'Data'), h('input', { class:'form-field-input', type:'date', id:'fd-date' }) ]),
        h('div', {}, [ h('label', { class:'form-field-label' }, 'Tipo'),
          h('select', { class:'form-field-select', id:'fd-type' }, [
            h('option', { value:'unica' }, 'Única'), h('option', { value:'mensal' }, 'Mensal'),
            h('option', { value:'trimestral' }, 'Trimestral'), h('option', { value:'semestral' }, 'Semestral'), h('option', { value:'anual' }, 'Anual'),
          ]),
        ]),
      ]),
      h('div', { style: { display:'flex', gap:'8px' } }, [
        h('button', { class:'btn-primary', onClick: () => {
          const desc = document.getElementById('fd-desc')?.value?.trim();
          const date = document.getElementById('fd-date')?.value;
          const type = document.getElementById('fd-type')?.value || 'unica';
          if (!desc || !date) { showToast('Preencha descrição e data', true); return; }
          saveFundDate(fund.id, { id: 'fd_'+Date.now(), desc, date, type, created_by: _user?.name || '' });
          state._addingDate = null; showToast('Data adicionada'); render();
        }}, 'Salvar'),
        h('button', { class:'btn-secondary', onClick: () => { state._addingDate = null; render(); }}, 'Cancelar'),
      ]),
    ]),

    upcoming.length > 0 && h('div', { style: { marginBottom:'16px' } }, [
      h('div', { class:'mono', style: { fontSize:'9px', textTransform:'uppercase', color:'var(--amber)', marginBottom:'6px' } }, 'Próximas'),
      ...upcoming.map(d => {
        const daysUntil = Math.ceil((new Date(d.date) - new Date(today)) / 86400000);
        const urgency = daysUntil <= 7 ? 'var(--red)' : daysUntil <= 30 ? 'var(--amber)' : 'var(--text-faint)';
        const TIPO = { unica:'Única', mensal:'Mensal', trimestral:'Trim.', semestral:'Sem.', anual:'Anual' };
        return h('div', { class:'card', style: { padding:'10px 14px', marginBottom:'4px', borderLeft:'3px solid '+urgency, display:'flex', justifyContent:'space-between', alignItems:'center' } }, [
          h('div', {}, [
            h('div', { style: { fontSize:'13px' } }, d.desc),
            h('div', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)' } }, TIPO[d.type] || d.type),
          ]),
          h('div', { style: { textAlign:'right' } }, [
            h('div', { class:'mono', style: { fontSize:'12px', fontWeight:'600', color: urgency } }, d.date),
            h('div', { class:'mono', style: { fontSize:'9px', color: urgency } }, daysUntil === 0 ? 'HOJE' : daysUntil === 1 ? 'Amanhã' : 'em ' + daysUntil + ' dias'),
          ]),
          h('button', { class:'mono', style: { fontSize:'10px', color:'var(--red)', background:'none', border:'none', cursor:'pointer', padding:'4px' }, onClick: (e) => { e.stopPropagation(); deleteFundDate(fund.id, d.id); render(); }}, '✕'),
        ]);
      }),
    ]),

    past.length > 0 && h('div', {}, [
      h('div', { class:'mono', style: { fontSize:'9px', textTransform:'uppercase', color:'var(--text-faint)', marginBottom:'6px' } }, 'Passadas (' + past.length + ')'),
      ...past.slice(0,5).map(d => h('div', { class:'mono', style: { fontSize:'11px', color:'var(--text-faint)', padding:'4px 0', display:'flex', justifyContent:'space-between' } }, [
        h('span', {}, d.desc), h('span', {}, d.date),
      ])),
    ]),
  ]);
}

/* ============================================================
   OPERATIONAL HEATMAP (funds list)
   ============================================================ */
function renderOperationalHeatmap(funds) {
  const tasks = getTasks().filter(t => t.status !== 'done' && t.status !== 'cancelled');
  const today = new Date().toISOString().split('T')[0];

  const fundData = funds.map(f => {
    const fundTasks = tasks.filter(t => t.fund_id === f.id);
    const overdue = fundTasks.filter(t => t.due_date && t.due_date < today);
    const urgent = fundTasks.filter(t => t.priority === 'urgent');
    const carteiras = getCarteirasXML(f.cnpj);
    const latest = carteiras.length > 0 ? carteiras[carteiras.length - 1] : null;
    const lastDate = latest?.fund?.dtposicao;
    const daysSince = lastDate ? Math.ceil((new Date(today) - new Date(lastDate)) / 86400000) : 999;
    const pipeline = latest ? getDailyPipeline(f.cnpj, lastDate) : null;
    const pipelineDone = pipeline ? pipeline.items.filter(i => i.done).length : 0;
    const pipelineTotal = pipeline ? pipeline.items.length : 0;
    const dates = getFundDates(f.id);
    const upcomingDates = dates.filter(d => d.date >= today && d.date <= new Date(Date.now() + 7*86400000).toISOString().split('T')[0]);

    // Severity: 0=ok, 1=attention, 2=warning, 3=critical
    let severity = 0;
    if (overdue.length > 0) severity = 3;
    else if (urgent.length > 0 || daysSince > 5) severity = 2;
    else if (fundTasks.length > 0 || upcomingDates.length > 0) severity = 1;

    return { fund: f, tasks: fundTasks, overdue, urgent, daysSince, lastDate, pipelineDone, pipelineTotal, upcomingDates, severity };
  }).sort((a, b) => b.severity - a.severity);

  if (fundData.every(f => f.severity === 0)) return null;

  const sevColors = ['var(--green)', 'var(--blue)', 'var(--amber)', 'var(--red)'];
  const sevLabels = ['OK', 'Atenção', 'Alerta', 'Crítico'];

  return h('div', { style: { marginBottom: '24px' } }, [
    h('div', { class: 'macro-section-subhead' }, 'Heatmap Operacional'),
    h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' } }, [
        h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
          ['Fundo', 'Status', 'Tarefas', 'Atrasadas', 'Pipeline', 'Última Cart.', 'Próx. Datas'].map((c, i) =>
            h('th', { style: { padding: '7px 10px', textAlign: i === 0 ? 'left' : 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, c))
        )),
        h('tbody', {}, fundData.map(fd =>
          h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
            h('td', { style: { padding: '8px 10px', fontWeight: '500' } }, fd.fund.name),
            h('td', { style: { textAlign: 'center' } }, [
              h('span', { class: 'mono', style: { fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: sevColors[fd.severity] + '18', color: sevColors[fd.severity], border: '1px solid ' + sevColors[fd.severity] } }, sevLabels[fd.severity]),
            ]),
            h('td', { class: 'mono', style: { textAlign: 'center', color: fd.tasks.length > 0 ? 'var(--amber)' : 'var(--text-faint)' } }, String(fd.tasks.length)),
            h('td', { class: 'mono', style: { textAlign: 'center', color: fd.overdue.length > 0 ? 'var(--red)' : 'var(--text-faint)', fontWeight: fd.overdue.length > 0 ? '700' : '400' } }, String(fd.overdue.length)),
            h('td', { class: 'mono', style: { textAlign: 'center' } }, fd.pipelineTotal > 0 ? fd.pipelineDone + '/' + fd.pipelineTotal : '—'),
            h('td', { class: 'mono', style: { textAlign: 'center', color: fd.daysSince > 5 ? 'var(--red)' : fd.daysSince > 2 ? 'var(--amber)' : 'var(--text-faint)' } }, fd.lastDate ? fd.daysSince + 'd atrás' : '—'),
            h('td', { class: 'mono', style: { textAlign: 'center', color: fd.upcomingDates.length > 0 ? 'var(--amber)' : 'var(--text-faint)' } }, fd.upcomingDates.length > 0 ? fd.upcomingDates.length + ' em 7d' : '—'),
          ])
        )),
      ]),
    ]),
  ]);
}

/* ============================================================
   PERFORMANCE / RENTABILIDADE ANALYSIS
   ============================================================ */
function renderRentabilidade(fund, carteiras) {
  if (carteiras.length < 2) return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Necessário ao menos 2 carteiras para análise de rentabilidade.');

  const sorted = [...carteiras].sort((a, b) => (a.fund.dtposicao || '').localeCompare(b.fund.dtposicao || ''));
  const latest = sorted[sorted.length - 1];
  const latestCota = latest.fund.valorcota;
  const latestDate = latest.fund.dtposicao;

  if (!latestCota) return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Sem dados de cota disponíveis.');

  // Calculate returns for different periods
  function findCotaAtOffset(days) {
    const target = new Date(new Date(latestDate).getTime() - days * 86400000).toISOString().split('T')[0];
    // Find closest carteira to target date
    let best = null, bestDist = Infinity;
    for (const c of sorted) {
      if (!c.fund.valorcota) continue;
      const dist = Math.abs(new Date(c.fund.dtposicao).getTime() - new Date(target).getTime());
      if (dist < bestDist) { bestDist = dist; best = c; }
    }
    return best && bestDist < days * 86400000 * 0.5 ? best : null;
  }

  const periods = [
    { label: 'Diária', days: 1 },
    { label: 'Semanal', days: 7 },
    { label: '1 Mês', days: 30 },
    { label: '3 Meses', days: 90 },
    { label: '6 Meses', days: 180 },
    { label: '12 Meses', days: 365 },
    { label: 'YTD', days: Math.ceil((new Date(latestDate) - new Date(latestDate.substring(0, 4) + '-01-01')) / 86400000) },
    { label: 'Desde Início', days: Math.ceil((new Date(latestDate) - new Date(sorted[0].fund.dtposicao)) / 86400000) },
  ];

  const returns = periods.map(p => {
    const ref = p.label === 'Desde Início' ? sorted[0] : findCotaAtOffset(p.days);
    if (!ref || !ref.fund.valorcota) return { ...p, ret: null };
    const ret = ((latestCota - ref.fund.valorcota) / ref.fund.valorcota) * 100;
    return { ...p, ret, refDate: ref.fund.dtposicao, refCota: ref.fund.valorcota };
  });

  // Cota time series for chart
  const cotaSeries = sorted.filter(c => c.fund.valorcota).map(c => ({ date: c.fund.dtposicao, value: c.fund.valorcota }));
  // PL series
  const plSeries = sorted.filter(c => c.fund.patliq).map(c => ({ date: c.fund.dtposicao, value: c.fund.patliq }));
  // Variation series (% daily)
  const varSeries = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i-1].fund.valorcota;
    const curr = sorted[i].fund.valorcota;
    if (prev && curr) varSeries.push({ date: sorted[i].fund.dtposicao, value: ((curr - prev) / prev) * 100 });
  }

  // Top positive and negative days
  const sortedVar = [...varSeries].sort((a, b) => b.value - a.value);
  const topUp = sortedVar.slice(0, 5);
  const topDown = sortedVar.slice(-5).reverse();

  // Performance attribution (by asset type)
  const attrData = [];
  if (sorted.length >= 2) {
    const prev = sorted[sorted.length - 2];
    const curr = latest;
    const types = [
      { label: 'Ações/FIIs', curr: curr.positions?.acoes || [], prev: prev.positions?.acoes || [] },
      { label: 'Tít. Privados', curr: curr.positions?.titprivado || [], prev: prev.positions?.titprivado || [] },
      { label: 'Tít. Públicos', curr: curr.positions?.titpublico || [], prev: prev.positions?.titpublico || [] },
      { label: 'Cotas', curr: curr.positions?.cotas || [], prev: prev.positions?.cotas || [] },
    ];
    for (const t of types) {
      const currVal = t.curr.reduce((a, p) => a + (p.valorfindisp || (p.qtdisponivel || 0) * (p.puposicao || 0)), 0);
      const prevVal = t.prev.reduce((a, p) => a + (p.valorfindisp || (p.qtdisponivel || 0) * (p.puposicao || 0)), 0);
      if (currVal > 0 || prevVal > 0) attrData.push({ label: t.label, currVal, prevVal, delta: currVal - prevVal });
    }
  }

  return h('div', {}, [
    // Returns KPIs
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '24px' } },
      returns.map(r => {
        const c = r.ret == null ? 'var(--text-faint)' : r.ret > 0 ? 'var(--green)' : r.ret < 0 ? 'var(--red)' : 'var(--text-faint)';
        return renderPortKPI(r.label, r.ret != null ? (r.ret >= 0 ? '+' : '') + r.ret.toFixed(2) + '%' : '—', r.refDate ? 'vs ' + r.refDate : '');
      })
    ),

    // Cota chart
    cotaSeries.length > 1 && h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' } }, [
      renderPanoramaChart('Evolução da Cota', cotaSeries, 'R$', 'var(--amber)', false),
      varSeries.length > 1 && renderPanoramaChart('Variação Diária (%)', varSeries, '%', 'var(--blue)', true),
    ].filter(Boolean)),

    // Performance Attribution
    attrData.length > 0 && h('div', { style: { marginBottom: '20px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Atribuição de Performance (última carteira)'),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Tipo de Ativo', 'Valor Anterior', 'Valor Atual', 'Δ Valor', 'Contribuição'].map((c, i) =>
              h('th', { style: { padding: '7px 10px', textAlign: i === 0 ? 'left' : 'right', fontFamily: 'JetBrains Mono,monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, c))
          )),
          h('tbody', {}, [
            ...attrData.map(a => {
              const totalDelta = attrData.reduce((s, x) => s + x.delta, 0);
              const contrib = totalDelta !== 0 ? (a.delta / Math.abs(totalDelta)) * 100 : 0;
              const c = a.delta > 0 ? 'var(--green)' : a.delta < 0 ? 'var(--red)' : 'var(--text-faint)';
              return h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                h('td', { style: { padding: '6px 10px' } }, a.label),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)' } }, formatBRL(a.prevVal)),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, formatBRL(a.currVal)),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: c, fontWeight: '600' } }, (a.delta >= 0 ? '+' : '') + formatBRL(a.delta)),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: c } }, (contrib >= 0 ? '+' : '') + contrib.toFixed(1) + '%'),
              ]);
            }),
            h('tr', { style: { borderTop: '2px solid var(--border)', fontWeight: '600' } }, [
              h('td', { style: { padding: '6px 10px' } }, 'Total'),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)' } }, formatBRL(attrData.reduce((s, x) => s + x.prevVal, 0))),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, formatBRL(attrData.reduce((s, x) => s + x.currVal, 0))),
              h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--amber)' } }, (attrData.reduce((s, x) => s + x.delta, 0) >= 0 ? '+' : '') + formatBRL(attrData.reduce((s, x) => s + x.delta, 0))),
              h('td', {}),
            ]),
          ]),
        ]),
      ]),
    ]),

    // Top/Bottom days
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } }, [
      topUp.length > 0 && h('div', {}, [
        h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--green)', textTransform: 'uppercase', marginBottom: '6px' } }, 'Melhores Dias'),
        h('div', { class: 'card', style: { padding: 0 } },
          topUp.map((d, i) => h('div', { class: 'mono', style: { display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: '11px' } }, [
            h('span', {}, d.date), h('span', { style: { color: 'var(--green)', fontWeight: '600' } }, '+' + d.value.toFixed(2) + '%'),
          ]))
        ),
      ]),
      topDown.length > 0 && h('div', {}, [
        h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--red)', textTransform: 'uppercase', marginBottom: '6px' } }, 'Piores Dias'),
        h('div', { class: 'card', style: { padding: 0 } },
          topDown.map((d, i) => h('div', { class: 'mono', style: { display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontSize: '11px' } }, [
            h('span', {}, d.date), h('span', { style: { color: 'var(--red)', fontWeight: '600' } }, d.value.toFixed(2) + '%'),
          ]))
        ),
      ]),
    ].filter(Boolean)),
  ]);
}

/* ============================================================
   CREDIT ASSET DETAIL PAGE
   ============================================================ */
function getCreditAssetNotes(assetKey) {
  if (!DB._creditNotes) DB._creditNotes = {};
  if (!DB._creditNotes[assetKey]) DB._creditNotes[assetKey] = { comments: [], dates: [], demands: [], rating: '', analystNotes: '' };
  return DB._creditNotes[assetKey];
}

function saveCreditAssetNotes(assetKey) {
  saveDB(DB);
  sbUpsert('creditnote:' + assetKey.replace(/[^a-zA-Z0-9_-]/g, '_'), DB._creditNotes[assetKey]);
}

function renderCreditAssetDetail(asset) {
  const key = asset.codativo || asset.isin || '';
  const notes = getCreditAssetNotes(key);
  const today = new Date().toISOString().split('T')[0];
  const analystName = _user?.name || 'Analista';

  // Asset type detection
  const isCRI = /CRI|^2[12]/.test(asset.codativo || '');
  const isCRA = /CRA/.test(asset.codativo || '');
  const isDeb = /DEB|^1[0-5]/.test(asset.codativo || '');
  const isCCB = /CCB/.test(asset.codativo || '');
  const typeLabel = isCRI ? 'CRI' : isCRA ? 'CRA' : isDeb ? 'Debênture' : isCCB ? 'CCB' : 'Título Privado';

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._credit_detail = null; render(); } }, [h('span', {}, '←'), h('span', {}, 'Voltar ao Portfólio')]),

    h('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' } }, [
      h('div', {}, [
        h('div', { class:'mono', style: { fontSize:'10px', color:'var(--amber)', textTransform:'uppercase', letterSpacing:'0.15em' } }, typeLabel),
        h('h1', { style: { fontFamily:'Fraunces,serif', fontSize:'22px', margin:'4px 0' } }, asset.codativo || asset.isin),
        h('div', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)' } }, 'Fundo: ' + (asset.fundName || '—') + ' · Carteira: ' + (asset.dtposicao || '—')),
      ]),
      h('div', { style: { textAlign:'right' } }, [
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'24px', color:'var(--amber)' } }, formatBRL(asset.valorfindisp)),
        h('div', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)' } }, (asset.valorfindisp / (asset.plFundo || 1) * 100).toFixed(2) + '% PL'),
      ]),
    ]),

    // KPIs
    h('div', { style: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'10px', marginBottom:'24px' } }, [
      renderPortKPI('Indexador', (asset.indexador || '—') + (asset.percindex ? ' ' + asset.percindex + '%' : ''), ''),
      asset.coupom && renderPortKPI('Cupom', asset.coupom.toFixed(2) + '%', 'a.a.'),
      renderPortKPI('PU', 'R$ ' + (asset.puposicao || 0).toFixed(4), ''),
      renderPortKPI('Quantidade', (asset.qtdisponivel || 0).toLocaleString('pt-BR'), ''),
      renderPortKPI('Vencimento', asset.dtvencimento || '—', asset.dtvencimento ? (() => { const d = Math.ceil((new Date(asset.dtvencimento) - new Date()) / 86400000); return d > 0 ? d + ' dias' : 'Vencido'; })() : ''),
      renderPortKPI('PDD', (asset.percprovcred || 0).toFixed(1) + '%', asset.percprovcred > 0 ? 'Provisionado' : 'Sem provisão'),
      renderPortKPI('Risco', asset.nivelrsc || '—', ''),
    ].filter(Boolean)),

    // Analyst Notes
    h('div', { class:'card', style: { padding:'16px', marginBottom:'16px' } }, [
      h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'15px', marginBottom:'8px' } }, 'Notas do Analista'),
      h('textarea', { class:'form-field-input', id:'cn-notes', rows:'3', style: { resize:'vertical', width:'100%' } }, notes.analystNotes || ''),
      h('div', { style: { display:'flex', gap:'8px', marginTop:'8px', alignItems:'center' } }, [
        h('label', { class:'form-field-label', style: { margin:0 } }, 'Rating interno:'),
        h('select', { class:'form-field-select', id:'cn-rating', style: { width:'120px' } }, ['', 'AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'].map(r =>
          h('option', { value: r, selected: notes.rating === r ? 'selected' : null }, r || '— Sem rating —'))),
        h('button', { class:'btn-primary', style: { marginLeft:'auto' }, onClick: () => {
          notes.analystNotes = document.getElementById('cn-notes')?.value || '';
          notes.rating = document.getElementById('cn-rating')?.value || '';
          saveCreditAssetNotes(key);
          showToast('Notas salvas');
        }}, 'Salvar Notas'),
      ]),
    ]),

    // Important Dates
    h('div', { style: { marginBottom:'20px' } }, [
      h('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' } }, [
        h('div', { class:'macro-section-subhead', style: { marginBottom:0 } }, 'Datas Importantes'),
        h('button', { class:'btn-secondary', style: { fontSize:'10px' }, onClick: () => { state._addCreditDate = key; render(); }}, '+ Data'),
      ]),
      state._addCreditDate === key && h('div', { class:'card', style: { padding:'12px', marginBottom:'8px', borderLeft:'3px solid var(--amber)' } }, [
        h('div', { style: { display:'flex', gap:'8px' } }, [
          h('input', { class:'form-field-input', id:'cd-desc', placeholder:'Ex: Pagamento cupom', style: { flex:1 } }),
          h('input', { class:'form-field-input', type:'date', id:'cd-date', style: { width:'150px' } }),
          h('button', { class:'btn-primary', onClick: () => {
            const desc = document.getElementById('cd-desc')?.value?.trim();
            const date = document.getElementById('cd-date')?.value;
            if (desc && date) { notes.dates.push({ id:'cd_'+Date.now(), desc, date }); saveCreditAssetNotes(key); state._addCreditDate = null; render(); }
          }}, 'Salvar'),
          h('button', { class:'btn-secondary', onClick: () => { state._addCreditDate = null; render(); }}, '✕'),
        ]),
      ]),
      ...(notes.dates || []).sort((a,b) => a.date.localeCompare(b.date)).map(d => {
        const isPast = d.date < today;
        return h('div', { class:'mono', style: { fontSize:'11px', display:'flex', justifyContent:'space-between', padding:'6px 0', color: isPast ? 'var(--text-faint)' : 'var(--text)' } }, [
          h('span', {}, d.desc), h('span', {}, d.date),
        ]);
      }),
    ]),

    // Comments
    h('div', { style: { marginBottom:'20px' } }, [
      h('div', { class:'macro-section-subhead' }, 'Comentários (' + (notes.comments || []).length + ')'),
      ...(notes.comments || []).map(c =>
        h('div', { class:'card', style: { padding:'10px 14px', marginBottom:'4px' } }, [
          h('div', { style: { display:'flex', justifyContent:'space-between', marginBottom:'4px' } }, [
            h('span', { class:'mono', style: { fontSize:'10px', fontWeight:'600', color:'var(--amber)' } }, c.author),
            h('span', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)' } }, (c.date||'').split('T')[0]),
          ]),
          h('div', { style: { fontSize:'12px', lineHeight:'1.5' } }, c.text),
        ])
      ),
      h('div', { style: { display:'flex', gap:'8px', marginTop:'8px' } }, [
        h('input', { class:'form-field-input', id:'cn-comment', style: { flex:1 }, placeholder:'Adicionar comentário...' }),
        h('button', { class:'btn-primary', onClick: () => {
          const text = document.getElementById('cn-comment')?.value?.trim();
          if (!text) return;
          notes.comments.push({ author: analystName, text, date: new Date().toISOString() });
          saveCreditAssetNotes(key); render();
        }}, 'Enviar'),
      ]),
    ]),

    // Demands
    h('div', {}, [
      h('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' } }, [
        h('div', { class:'macro-section-subhead', style: { marginBottom:0 } }, 'Demandas'),
        h('button', { class:'btn-secondary', style: { fontSize:'10px' }, onClick: () => { state._addCreditDemand = key; render(); }}, '+ Demanda'),
      ]),
      state._addCreditDemand === key && h('div', { class:'card', style: { padding:'12px', marginBottom:'8px', borderLeft:'3px solid var(--blue)' } }, [
        h('div', { style: { display:'flex', gap:'8px' } }, [
          h('input', { class:'form-field-input', id:'cdm-desc', placeholder:'Descrição da demanda', style: { flex:1 } }),
          h('input', { class:'form-field-input', type:'date', id:'cdm-due', style: { width:'150px' } }),
          h('button', { class:'btn-primary', onClick: () => {
            const desc = document.getElementById('cdm-desc')?.value?.trim();
            const due = document.getElementById('cdm-due')?.value || '';
            if (desc) { notes.demands.push({ id:'dm_'+Date.now(), desc, due, status:'pending', created_by: analystName }); saveCreditAssetNotes(key); state._addCreditDemand = null; render(); }
          }}, 'Criar'),
          h('button', { class:'btn-secondary', onClick: () => { state._addCreditDemand = null; render(); }}, '✕'),
        ]),
      ]),
      ...(notes.demands || []).map(d => {
        const isOverdue = d.due && d.due < today && d.status !== 'done';
        return h('div', { class:'card', style: { padding:'10px 14px', marginBottom:'4px', borderLeft:'3px solid '+(d.status==='done'?'var(--green)':isOverdue?'var(--red)':'var(--blue)'), cursor:'pointer' },
          onClick: () => { d.status = d.status === 'done' ? 'pending' : 'done'; d.done_by = analystName; saveCreditAssetNotes(key); render(); }
        }, [
          h('div', { style: { display:'flex', justifyContent:'space-between' } }, [
            h('span', { style: { fontSize:'12px', textDecoration: d.status==='done'?'line-through':'none' } }, d.desc),
            h('span', { class:'mono', style: { fontSize:'10px', color: isOverdue?'var(--red)':'var(--text-faint)' } }, d.due || ''),
          ]),
          d.status === 'done' && h('div', { class:'mono', style: { fontSize:'9px', color:'var(--green)' } }, '✓ ' + (d.done_by || '') ),
        ]);
      }),
    ]),
  ]);
}

/* ============================================================
   REAL ESTATE ASSET DETAIL PAGE
   ============================================================ */
function getREAssetNotes(assetKey) {
  if (!DB._reNotes) DB._reNotes = {};
  if (!DB._reNotes[assetKey]) DB._reNotes[assetKey] = { comments: [], dates: [], demands: [], analystNotes: '' };
  return DB._reNotes[assetKey];
}

function saveREAssetNotes(assetKey) {
  saveDB(DB);
  sbUpsert('renote:' + assetKey.replace(/[^a-zA-Z0-9_-]/g, '_'), DB._reNotes[assetKey]);
}

function renderREAssetDetail(asset) {
  const key = (asset.nomecomercial || '') + '_' + (asset.logradouro || '');
  const notes = getREAssetNotes(key);
  const today = new Date().toISOString().split('T')[0];
  const TIPO_IMOVEL = { '1':'Terreno','2':'Edifício','3':'Sala/Conjunto','4':'Loja','5':'Galpão','6':'Hotel','7':'Hospital','8':'Garagem','9':'Shopping','10':'Residencial','11':'Outros' };
  const capRate = asset.valorcontabil > 0 && asset.aluguelcontratado > 0 ? (asset.aluguelcontratado * 12 / asset.valorcontabil * 100) : 0;

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._re_detail = null; render(); } }, [h('span', {}, '←'), h('span', {}, 'Voltar ao Portfólio')]),

    h('div', { style: { marginBottom:'20px' } }, [
      h('div', { class:'mono', style: { fontSize:'10px', color:'var(--amber)', textTransform:'uppercase' } }, TIPO_IMOVEL[asset.tipoimovel] || 'Imóvel'),
      h('h1', { style: { fontFamily:'Fraunces,serif', fontSize:'22px', margin:'4px 0' } }, asset.nomecomercial || 'Imóvel'),
      h('div', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)' } }, [asset.logradouro, asset.numero, asset.cidade, asset.estado].filter(Boolean).join(', ')),
    ]),

    h('div', { style: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'10px', marginBottom:'24px' } }, [
      renderPortKPI('Valor Contábil', formatBRL(asset.valorcontabil), ''),
      asset.aluguelcontratado > 0 && renderPortKPI('Aluguel', formatBRL(asset.aluguelcontratado) + '/mês', ''),
      capRate > 0 && renderPortKPI('Cap Rate', capRate.toFixed(2) + '%', 'a.a.'),
      asset.aluguelatrasado > 0 && renderPortKPI('Inadimplência', formatBRL(asset.aluguelatrasado), ''),
      asset.percpart && renderPortKPI('Participação', asset.percpart + '%', ''),
      renderPortKPI('Questão Jurídica', asset.questjur === 'S' ? 'Sim' : 'Não', ''),
    ].filter(Boolean)),

    // Analyst Notes
    h('div', { class:'card', style: { padding:'16px', marginBottom:'16px' } }, [
      h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'15px', marginBottom:'8px' } }, 'Notas do Analista'),
      h('textarea', { class:'form-field-input', id:'rn-notes', rows:'3', style: { resize:'vertical', width:'100%' } }, notes.analystNotes || ''),
      h('button', { class:'btn-primary', style: { marginTop:'8px' }, onClick: () => {
        notes.analystNotes = document.getElementById('rn-notes')?.value || '';
        saveREAssetNotes(key); showToast('Notas salvas');
      }}, 'Salvar'),
    ]),

    // Dates (avaliação, vistoria, etc.)
    h('div', { style: { marginBottom:'20px' } }, [
      h('div', { style: { display:'flex', justifyContent:'space-between', marginBottom:'8px' } }, [
        h('div', { class:'macro-section-subhead', style: { marginBottom:0 } }, 'Datas Importantes'),
        h('button', { class:'btn-secondary', style: { fontSize:'10px' }, onClick: () => { state._addREDate = key; render(); }}, '+ Data'),
      ]),
      state._addREDate === key && h('div', { class:'card', style: { padding:'12px', marginBottom:'8px', borderLeft:'3px solid var(--amber)' } }, [
        h('div', { style: { display:'flex', gap:'8px' } }, [
          h('input', { class:'form-field-input', id:'rd-desc', placeholder:'Ex: Reavaliação, Vistoria', style: { flex:1 } }),
          h('input', { class:'form-field-input', type:'date', id:'rd-date', style: { width:'150px' } }),
          h('button', { class:'btn-primary', onClick: () => {
            const desc = document.getElementById('rd-desc')?.value?.trim();
            const date = document.getElementById('rd-date')?.value;
            if (desc && date) { notes.dates.push({ id:'rd_'+Date.now(), desc, date }); saveREAssetNotes(key); state._addREDate = null; render(); }
          }}, 'Salvar'),
          h('button', { class:'btn-secondary', onClick: () => { state._addREDate = null; render(); }}, '✕'),
        ]),
      ]),
      ...(notes.dates || []).sort((a,b) => a.date.localeCompare(b.date)).map(d =>
        h('div', { class:'mono', style: { fontSize:'11px', display:'flex', justifyContent:'space-between', padding:'6px 0', color: d.date < today ? 'var(--text-faint)' : 'var(--text)' } }, [
          h('span', {}, d.desc), h('span', {}, d.date),
        ])
      ),
    ]),

    // Comments + Demands (same pattern as credit)
    h('div', { style: { marginBottom:'20px' } }, [
      h('div', { class:'macro-section-subhead' }, 'Comentários'),
      ...(notes.comments || []).map(c =>
        h('div', { class:'card', style: { padding:'10px 14px', marginBottom:'4px' } }, [
          h('div', { style: { display:'flex', justifyContent:'space-between', marginBottom:'4px' } }, [
            h('span', { class:'mono', style: { fontSize:'10px', fontWeight:'600', color:'var(--amber)' } }, c.author),
            h('span', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)' } }, (c.date||'').split('T')[0]),
          ]),
          h('div', { style: { fontSize:'12px' } }, c.text),
        ])
      ),
      h('div', { style: { display:'flex', gap:'8px', marginTop:'8px' } }, [
        h('input', { class:'form-field-input', id:'rn-comment', style: { flex:1 }, placeholder:'Adicionar comentário...' }),
        h('button', { class:'btn-primary', onClick: () => {
          const text = document.getElementById('rn-comment')?.value?.trim();
          if (!text) return;
          notes.comments.push({ author: _user?.name || 'Analista', text, date: new Date().toISOString() });
          saveREAssetNotes(key); render();
        }}, 'Enviar'),
      ]),
    ]),
  ]);
}

/* ============================================================
   METHODOLOGY VISUAL CARD
   ============================================================ */
function renderMethodCard(title, description, formula, thresholds) {
  return h('div', { class: 'card', style: { padding: '14px', borderTop: '2px solid var(--amber)' } }, [
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '13px', marginBottom: '6px', color: 'var(--amber)' } }, title),
    h('div', { style: { fontSize: '11px', lineHeight: '1.5', color: 'var(--text-faint)', marginBottom: '8px' } }, description),
    h('div', { class: 'mono', style: { fontSize: '11px', padding: '6px 10px', background: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '8px', textAlign: 'center', letterSpacing: '0.05em' } }, formula),
    thresholds && h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      thresholds.map(([range, label, color]) =>
        h('span', { class: 'mono', style: { fontSize: '9px', padding: '2px 6px', border: '1px solid ' + color, color: color, borderRadius: '3px' } }, range + ' → ' + label)
      )
    ),
  ]);
}

/* ============================================================
   PDF REPORT ENGINE (via Print)
   ============================================================ */
const BRAND_CSS = `
  @page { size: A4; margin: 12mm 16mm; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Segoe UI', sans-serif; color: #1a1815; font-size: 10.5px; line-height: 1.65; background: #fff; }

  .pdf-header { background: linear-gradient(135deg, #1a1815 0%, #2a2520 100%); color: #fff; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #b8863c; }
  .pdf-header .left { display: flex; align-items: center; gap: 16px; }
  .pdf-header img { height: 40px; border-radius: 4px; }
  .pdf-header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .pdf-header .sub { font-size: 11px; color: #b8863c; margin-top: 3px; font-weight: 500; }
  .pdf-header .brand { text-align: right; }
  .pdf-header .brand .ae { font-size: 22px; color: #b8863c; font-weight: 800; letter-spacing: -0.05em; }
  .pdf-header .brand .date { font-size: 9px; color: #9a958c; margin-top: 2px; }

  .pdf-body { padding: 24px 32px; }

  .pdf-divider { height: 1px; background: linear-gradient(to right, #b8863c, #e8e5e0, transparent); margin: 20px 0; }

  .pdf-section { position: relative; padding: 0 0 0 14px; margin: 22px 0 12px; font-size: 14px; font-weight: 700; color: #1a1815; letter-spacing: -0.01em; }
  .pdf-section::before { content: ''; position: absolute; left: 0; top: 2px; width: 4px; height: 100%; background: #b8863c; border-radius: 2px; }

  .pdf-kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 20px; margin: 8px 0 14px; }
  .pdf-kv { display: flex; gap: 8px; padding: 4px 0; font-size: 10.5px; border-bottom: 1px dotted #e8e5e0; }
  .pdf-kv .label { color: #9a958c; min-width: 120px; font-weight: 500; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.06em; padding-top: 1px; }
  .pdf-kv .val { font-weight: 600; color: #1a1815; }

  .pdf-text { font-size: 10.5px; line-height: 1.75; margin: 8px 0 14px; white-space: pre-wrap; color: #333; }

  .pdf-kpis { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0 18px; }
  .pdf-kpi { border: 1px solid #e0ddd8; border-radius: 8px; padding: 12px 16px; min-width: 110px; flex: 1; background: #faf9f7; }
  .pdf-kpi .kl { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.12em; color: #9a958c; font-weight: 600; }
  .pdf-kpi .kv { font-size: 18px; font-weight: 700; margin-top: 4px; color: #1a1815; }
  .pdf-kpi .ks { font-size: 9px; color: #9a958c; margin-top: 2px; }
  .pdf-kpi.amber .kv { color: #b8863c; }
  .pdf-kpi.green .kv { color: #4a7a2c; }
  .pdf-kpi.red .kv { color: #b73c3c; }

  table { width: 100%; border-collapse: collapse; margin: 10px 0 18px; font-size: 9.5px; border: 1px solid #e0ddd8; border-radius: 6px; overflow: hidden; }
  thead { background: #1a1815; }
  th { color: #d4cfca; padding: 8px 12px; text-align: left; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
  th.r { text-align: right; }
  td { padding: 7px 12px; border-bottom: 1px solid #eee; }
  td.r { text-align: right; font-family: 'Courier New', monospace; font-size: 9px; }
  td.b { font-weight: 700; }
  td.amber { color: #b8863c; font-weight: 600; }
  tr:nth-child(even) { background: #faf9f7; }
  tr:hover { background: #f5f3f0; }
  tfoot td { font-weight: 700; border-top: 2px solid #1a1815; background: #f5f3f0; }

  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  .badge.green { background: #e8f5e0; color: #2d6611; }
  .badge.amber { background: #fef3e0; color: #8a6020; }
  .badge.red { background: #fde8e8; color: #8a1d1d; }

  .bar-container { height: 6px; background: #e8e5e0; border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .bar-fill.green { background: #4a7a2c; }
  .bar-fill.amber { background: #b8863c; }
  .bar-fill.red { background: #b73c3c; }

  .pdf-footer { margin-top: 32px; padding: 12px 0; border-top: 2px solid #1a1815; display: flex; justify-content: space-between; align-items: center; }
  .pdf-footer .left { font-size: 8px; color: #999; }
  .pdf-footer .right { font-size: 7px; color: #bbb; }
  .pdf-footer .conf { font-weight: 700; color: #b8863c; text-transform: uppercase; letter-spacing: 0.1em; font-size: 7px; }

  .green { color: #4a7a2c; } .red { color: #b73c3c; } .amber { color: #b8863c; }
  .highlight-box { background: #faf9f7; border: 1px solid #e0ddd8; border-radius: 8px; padding: 14px 18px; margin: 10px 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pdf-header { -webkit-print-color-adjust: exact; }
    thead { -webkit-print-color-adjust: exact; }
  }
`;

function openPrintReport(title, subtitle, bodyHTML) {
  const logo = getLogo();
  const logoImg = logo ? '<img src="' + logo + '">' : '';
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + '</title><style>' + BRAND_CSS + '</style></head><body>' +
    '<div class="pdf-header">' +
      '<div class="left">' + logoImg +
        '<div><h1>' + title + '</h1><div class="sub">' + (subtitle || '') + '</div></div>' +
      '</div>' +
      '<div class="brand"><div class="ae">Aegir·Intel</div><div class="date">' + dateStr + ' · ' + timeStr + '</div></div>' +
    '</div>' +
    '<div class="pdf-body">' + bodyHTML + '</div>' +
    '<div class="pdf-footer"><div class="left"><span class="conf">Confidencial</span> — Documento gerado automaticamente pelo Aegir·Intel. Não substitui parecer formal.</div><div class="right">Gerado em ' + dateStr + ' às ' + timeStr + '</div></div>' +
    '<script>setTimeout(function(){window.print()},400);<\/script>' +
    '</body></html>';
  const win = window.open('', '_blank');
  if (!win) { showToast('Permita pop-ups para gerar o relatório', true); return; }
  win.document.write(html);
  win.document.close();
}

// Helpers
function pSec(t) { return '<div class="pdf-divider"></div><div class="pdf-section">' + t + '</div>'; }
function pKV(l, v) { return '<div class="pdf-kv"><span class="label">' + l + '</span><span class="val">' + (v||'—') + '</span></div>'; }
function pKVGrid(pairs) { return '<div class="pdf-kv-grid">' + pairs.map(([l,v]) => pKV(l,v)).join('') + '</div>'; }
function pText(t) { return '<div class="pdf-text">' + (t||'').replace(/</g,'&lt;') + '</div>'; }
function pKPI(label, value, sub, color) { return '<div class="pdf-kpi' + (color ? ' ' + color : '') + '"><div class="kl">' + label + '</div><div class="kv">' + value + '</div>' + (sub ? '<div class="ks">' + sub + '</div>' : '') + '</div>'; }
function pBadge(text, color) { return '<span class="badge ' + (color||'') + '">' + text + '</span>'; }
function pBar(pct, color) { return '<div class="bar-container"><div class="bar-fill ' + (color||'amber') + '" style="width:' + Math.min(100,Math.max(0,pct)) + '%"></div></div>'; }
function pBox(content) { return '<div class="highlight-box">' + content + '</div>'; }
function pTable(headers, rows, opts) {
  const hasFooter = opts?.footer;
  let html = '<table><thead><tr>' + headers.map((h,i) => '<th' + (i>0?' class="r"':'') + '>' + h + '</th>').join('') + '</tr></thead><tbody>';
  for (const row of rows) html += '<tr>' + row.map((c,i) => '<td' + (i>0?' class="r"':'') + '>' + (c||'—') + '</td>').join('') + '</tr>';
  if (hasFooter) html += '<tfoot><tr>' + hasFooter.map((c,i) => '<td' + (i>0?' class="r"':'') + '>' + (c||'') + '</td>').join('') + '</tr></tfoot>';
  return html + '</tbody></table>';
}

// === SPECIFIC REPORTS ===

async function exportTesePDF(tese, fund) {
  const st = THESIS_STATUS[tese.status] || {};
  const conv = CONVICTION_LEVELS[tese.conviction] || {};
  let b = '';
  b += pKV('Fundo', fund?.name) + pKV('Status', st.label || tese.status) + pKV('Convicção', conv.label || tese.conviction) + pKV('Horizonte', tese.horizon);
  b += pSec('Narrativa') + pText(tese.narrative);
  if (tese.target_assets?.length > 0) {
    b += pSec('Ativos-Alvo');
    b += pTable(['Ticker', 'Nome', 'Papel', 'Peso %'], tese.target_assets.map(a => [a.ticker, a.name, a.role, a.target_weight || '—']));
  }
  b += pSec('Cenários');
  b += pTable(['Cenário', 'Prob.', 'Retorno', 'Descrição'], [
    ['Base', (tese.base_case?.probability||'—')+'%', tese.base_case?.expected_return||'—', tese.base_case?.description||'—'],
    ['Bull', (tese.bull_case?.probability||'—')+'%', tese.bull_case?.expected_return||'—', tese.bull_case?.description||'—'],
    ['Bear', (tese.bear_case?.probability||'—')+'%', tese.bear_case?.expected_return||'—', tese.bear_case?.description||'—'],
  ]);
  if (tese.revision_triggers?.length > 0) {
    b += pSec('Triggers de Revisão');
    tese.revision_triggers.forEach(t => { b += '<div style="padding:2px 0">• ' + t + '</div>'; });
  }
  openPrintReport('Tese: ' + tese.title, fund?.name || '', b);
}

async function exportAtaPDF(comite, fund) {
  let b = '';
  b += pKV('Fundo', fund?.name) + pKV('Data', comite.date) + pKV('Tipo', comite.type) + pKV('Participantes', (comite.participants||[]).join(', '));
  b += pSec('Pauta') + pText(comite.agenda);
  if (comite.proposals?.length > 0) {
    b += pSec('Propostas');
    comite.proposals.forEach((p, i) => { b += '<div style="margin:8px 0"><strong>' + (i+1) + '. ' + p.description + '</strong>' + pKV('Tipo', p.type) + pKV('Valor', p.value) + pKV('Decisão', p.decision || 'Pendente') + '</div>'; });
  }
  b += pSec('Deliberações') + pText(comite.deliberations);
  if (comite.gestorParecer) b += pSec('Parecer do Gestor') + pText(comite.gestorParecer);
  openPrintReport('Ata de Comitê', fund?.name + ' · ' + comite.date, b);
}

async function exportCarteiraPDF(parsed, fund) {
  const f = parsed.fund; const stats = parsed.stats || {}; const pos = parsed.positions || {}; const pl = f.patliq || 1;
  const zeragemVal = (pos.cotas||[]).filter(p => isZeragemFund(p.cnpjfundo||p.isin)).reduce((a,p) => a + (p.valorfindisp||((p.qtdisponivel||0)*(p.puposicao||0))), 0);
  let b = '<div class="pdf-kpis">' + pKPI('PL', formatBRL(f.patliq), '', 'amber') + pKPI('Cota', f.valorcota ? 'R$ ' + f.valorcota.toFixed(6) : '—') + pKPI('Caixa', formatBRL(stats.totalCaixa), (stats.totalCaixa/pl*100).toFixed(1) + '% PL') + pKPI('Caixa + Disp.', formatBRL(stats.totalCaixa + zeragemVal), zeragemVal > 0 ? 'incl. zeragem' : '') + pKPI('PDD', stats.pddTotal > 0 ? formatBRL(stats.pddTotal) : 'R$ 0', stats.pddTotal > 0 ? (stats.pddTotal/pl*100).toFixed(2)+'% PL' : '', stats.pddTotal > 0 ? 'red' : '') + pKPI('Posições', String(stats.totalAtivos||0)) + '</div>';
  b += pKVGrid([['CNPJ', f.cnpj], ['Data Posição', f.dtposicao], ['Classificação', fund?.classification||'—'], ['Benchmark', fund?.benchmark||'—']]);
  if ((pos.acoes||[]).length > 0) {
    b += pSec('Ações / FIIs (' + pos.acoes.length + ')');
    b += pTable(['Ticker','Qtd','PU','Valor','%PL','PDD'], pos.acoes.sort((a,c)=>(c.valorfindisp||0)-(a.valorfindisp||0)).map(p => [p.codativo, (p.qtdisponivel||0).toLocaleString('pt-BR'), 'R$ '+(p.puposicao||0).toFixed(2), formatBRL(p.valorfindisp), ((p.valorfindisp||0)/pl*100).toFixed(2)+'%', (p.percprovcred||0).toFixed(1)+'%']));
  }
  if ((pos.titprivado||[]).length > 0) {
    b += pSec('Títulos Privados (' + pos.titprivado.length + ')');
    b += pTable(['Código','Idx','Cupom','Venc.','Valor','%PL','PDD','Risco'], pos.titprivado.sort((a,c)=>(c.valorfindisp||0)-(a.valorfindisp||0)).map(p => [p.codativo, p.indexador||'—', p.coupom?p.coupom.toFixed(2)+'%':'—', p.dtvencimento||'—', formatBRL(p.valorfindisp), ((p.valorfindisp||0)/pl*100).toFixed(2)+'%', (p.percprovcred||0).toFixed(1)+'%', p.nivelrsc||'—']));
  }
  if ((pos.cotas||[]).length > 0) {
    b += pSec('Cotas de Fundos (' + pos.cotas.length + ')');
    b += pTable(['CNPJ','Qtd','PU','Valor','%PL'], pos.cotas.map(p => { const v=p.valorfindisp||((p.qtdisponivel||0)*(p.puposicao||0)); return [p.cnpjfundo||'—',(p.qtdisponivel||0).toLocaleString('pt-BR'),'R$ '+(p.puposicao||0).toFixed(6),formatBRL(v),(v/pl*100).toFixed(2)+'%']; }));
  }
  openPrintReport('Carteira — ' + (fund?.name || f.cnpj), f.dtposicao, b);
}

async function exportFundOverviewPDF(fund) {
  const carteiras = getCarteirasXML(fund.cnpj);
  const latest = carteiras.length > 0 ? carteiras[carteiras.length-1] : null;
  let b = '';
  if (latest) b += '<div class="pdf-kpis">' + pKPI('PL', formatBRL(latest.fund.patliq), '', 'amber') + pKPI('Cota', latest.fund.valorcota ? 'R$ ' + latest.fund.valorcota.toFixed(6) : '—') + pKPI('Carteiras', String(carteiras.length)) + pKPI('Última Data', latest.fund.dtposicao) + '</div>';
  b += pKVGrid([['CNPJ', fund.cnpj], ['Classificação', fund.classification], ['Estratégia', fund.strategy], ['Benchmark', fund.benchmark]]);
  if (carteiras.length >= 2) {
    const sorted = [...carteiras].sort((a,c)=>(a.fund.dtposicao||'').localeCompare(c.fund.dtposicao||''));
    const lc = sorted[sorted.length-1].fund.valorcota;
    b += pSec('Rentabilidade');
    const rows = [];
    for (const [label, days] of [['1 Mês',30],['3 Meses',90],['6 Meses',180],['12 Meses',365],['Desde Início',9999]]) {
      const ref = days===9999 ? sorted[0] : (()=>{const t=new Date(new Date(sorted[sorted.length-1].fund.dtposicao).getTime()-days*86400000);let b=null,bd=Infinity;for(const c of sorted){if(!c.fund.valorcota)continue;const d=Math.abs(new Date(c.fund.dtposicao)-t);if(d<bd){bd=d;b=c}}return b})();
      if (ref?.fund?.valorcota && lc) { const r=((lc-ref.fund.valorcota)/ref.fund.valorcota)*100; rows.push([label, ref.fund.dtposicao, '<span class="'+(r>=0?'green':'red')+'">'+(r>=0?'+':'')+r.toFixed(2)+'%</span>']); }
    }
    if (rows.length > 0) b += pTable(['Período','Referência','Retorno'], rows);
  }
  if (fund.thesis_summary) b += pSec('Tese de Investimento') + pText(fund.thesis_summary);
  openPrintReport(fund.name, fund.cnpj + ' · ' + (fund.classification||''), b);
}

async function exportRiskReportPDF(fund, risk, carteira) {
  if (!risk) { showToast('Sem dados de risco', true); return; }
  const fp = risk.fundProfile || {};
  const hhi = risk.concentration.hhi;
  const hhiLevel = hhi < 0.15 ? 'green' : hhi < 0.25 ? 'amber' : 'red';
  const hhiLabel = hhi < 0.15 ? 'Diversificado' : hhi < 0.25 ? 'Moderado' : 'Concentrado';
  let b = '<div class="pdf-kpis">' + pKPI('PL', formatBRL(risk.pl), '', 'amber') + pKPI('Tipo', fp.label||'—') + pKPI('HHI', (hhi*10000).toFixed(0), hhiLabel, hhiLevel) + pKPI('Top 5', risk.concentration.top5Pct.toFixed(1)+'%', '', risk.concentration.top5Pct > 50 ? 'red' : '') + pKPI('Caixa', risk.liquidity.cashRatio.toFixed(2) + '% PL') + '</div>';
  b += pKVGrid([['Fundo', fund.name], ['Classificação', fund.classification||'—'], ['Data', risk.fund.dtposicao], ['Benchmark', fund.benchmark||'—']]);
  b += pSec('Matriz de Risco');
  const rows = [['Concentração', pBadge(hhi<0.15?'Baixo':hhi<0.25?'Médio':'Alto', hhiLevel), 'HHI: '+(hhi*10000).toFixed(0)+' · Top5: '+risk.concentration.top5Pct.toFixed(1)+'%'], ['Liquidez', pBadge(risk.liquidity.cashRatio>5?'Baixo':risk.liquidity.cashRatio>1?'Médio':'Alto', risk.liquidity.cashRatio>5?'green':risk.liquidity.cashRatio>1?'amber':'red'), 'Caixa: '+risk.liquidity.cashRatio.toFixed(2)+'% PL']];
  if (risk.fundProfile?.hasCredit) { rows.push(['Crédito (PDD)', risk.credit.pddCoveragePct<5?'Baixo':risk.credit.pddCoveragePct<15?'Médio':'Alto', 'PDD: '+risk.credit.pddCoveragePct.toFixed(2)+'%']); rows.push(['LGD', risk.credit.portfolioLGD<30?'Baixo':risk.credit.portfolioLGD<60?'Médio':'Alto', risk.credit.portfolioLGD.toFixed(1)+'%']); }
  if (risk.duration.avgDuration>0) rows.push(['Duration', risk.duration.avgDuration<3?'Baixo':risk.duration.avgDuration<7?'Médio':'Alto', risk.duration.avgDuration.toFixed(2)+' anos']);
  b += pTable(['Categoria','Nível','Detalhe'], rows);
  b += pSec('Top 5 Posições');
  b += pTable(['Posição','% PL','Valor'], risk.concentration.top5.map(p => [p.name, p.pct.toFixed(2)+'%', formatBRL(p.value)]));
  if (risk.stress?.length>0) { b += pSec('Stress Tests'); b += pTable(['Cenário','Impacto R$','Impacto %'], risk.stress.map(s => [s.name, formatBRL(s.impactValue), s.impactPct.toFixed(2)+'%'])); }
  openPrintReport('Relatório de Risco', fund.name + ' · ' + risk.fund.dtposicao, b);
}

async function exportAssetAnalysisPDF(a) {
  if (!a) return;
  const TIPOS = { cri:'CRI', cra:'CRA', debenture:'Debênture', fii:'FII', fidc:'FIDC', lci_lca:'LCI/LCA', custom:'Outro' };
  let b = pKV('Tipo', TIPOS[a.type]||a.type) + pKV('Ticker', a.ticker) + pKV('Emissor', a.issuer) + pKV('Rating', a.rating) + pKV('Indexador', a.indexer) + pKV('Spread', a.spread?a.spread+'%':'—') + pKV('Vencimento', a.maturity) + pKV('Status', a.status);
  if (a.thesis) b += pSec('Tese / Parecer') + pText(a.thesis);
  if (a.risks) b += pSec('Riscos') + pText(a.risks);
  if (a.guarantees) b += pSec('Garantias') + pText(a.guarantees);
  openPrintReport('Análise: ' + (a.name||a.ticker||'Ativo'), (TIPOS[a.type]||'') + ' · ' + (a.updated_at||'').split('T')[0], b);
}

function renderMethodCard(title, description, formula, thresholds) {
  return h('div', { class: 'card', style: { padding: '14px', borderTop: '2px solid var(--amber)' } }, [
    h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '13px', marginBottom: '6px', color: 'var(--amber)' } }, title),
    h('div', { style: { fontSize: '11px', lineHeight: '1.5', color: 'var(--text-faint)', marginBottom: '8px' } }, description),
    h('div', { class: 'mono', style: { fontSize: '11px', padding: '6px 10px', background: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '8px', textAlign: 'center' } }, formula),
    thresholds && h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      thresholds.map(([range, label, color]) =>
        h('span', { class: 'mono', style: { fontSize: '9px', padding: '2px 6px', border: '1px solid ' + color, color, borderRadius: '3px' } }, range + ' → ' + label))),
  ]);
}


/* ============================================================
   PDF REPORT ENGINE
   ============================================================ */
const BRAND = {
  primary: [180, 134, 60],    // #b8863c amber
  dark: [26, 24, 21],         // #1a1815
  gray: [154, 149, 140],      // #9a958c
  green: [74, 122, 44],
  red: [183, 60, 60],
  white: [255, 255, 255],
};

let _cachedLogo = null;
function getLogo() { return _cachedLogo || DB.settings?.companyLogo || null; }
// Preload logo from static file
(function() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    _cachedLogo = c.toDataURL('image/png');
  };
  img.src = '/logo.png';
})();



/* ============================================================
   HUB VIEWS
   ============================================================ */
function renderHubGeral() {
  const funds = getFunds();
  const fundData = funds.map(f => {
    const cs = getCarteirasXML(f.cnpj);
    const lt = cs.length > 0 ? cs[cs.length-1] : null;
    return { fund: f, carteiras: cs, latest: lt, pl: lt?.fund?.patliq || 0 };
  });
  const totalPL = fundData.reduce((a, d) => a + d.pl, 0);

  // Aggregations
  const byClass = {}; const byAdmin = {}; const byAssetType = {};
  for (const d of fundData) {
    if (d.pl <= 0) continue;
    // By classification
    const cls = d.fund.classification?.toUpperCase() || 'OUTROS';
    if (!byClass[cls]) byClass[cls] = { pl: 0, count: 0 };
    byClass[cls].pl += d.pl; byClass[cls].count++;
    // By administrator
    const adm = d.fund.administrador || 'Não informado';
    if (!byAdmin[adm]) byAdmin[adm] = { pl: 0, count: 0 };
    byAdmin[adm].pl += d.pl; byAdmin[adm].count++;
    // By asset type (from latest carteira)
    if (d.latest?.positions) {
      const pos = d.latest.positions;
      const add = (type, arr, fn) => { const v = arr.reduce((a,p) => a + (fn(p)||0), 0); if (v > 0) { if (!byAssetType[type]) byAssetType[type] = 0; byAssetType[type] += v; } };
      add('Ações/FIIs', pos.acoes||[], p => p.valorfindisp);
      add('Tít. Privados', pos.titprivado||[], p => p.valorfindisp);
      add('Tít. Públicos', pos.titpublico||[], p => p.valorfindisp);
      add('Cotas de Fundos', pos.cotas||[], p => p.valorfindisp||((p.qtdisponivel||0)*(p.puposicao||0)));
      add('Imóveis', pos.imoveis||[], p => p.valorcontabil||0);
      if (d.latest.stats?.totalCaixa > 0) { if (!byAssetType['Caixa']) byAssetType['Caixa'] = 0; byAssetType['Caixa'] += d.latest.stats.totalCaixa; }
    }
  }

  // SVG donut chart helper
  function svgDonut(title, data, total) {
    const entries = Object.entries(data).sort((a,b) => (b[1].pl||b[1]) - (a[1].pl||a[1]));
    if (entries.length === 0) return null;
    const colors = ['#b8863c','#7a9b5c','#5c7a9b','#9b5c7a','#c4956a','#6b8f71','#8b6f8b','#a0845c','#6a8b9b','#9b8b5c'];
    const size = 140, cx = 70, cy = 70, r = 55, rInner = 35;
    let startAngle = -Math.PI/2;
    let paths = '';
    entries.forEach(([name, d], i) => {
      const val = typeof d === 'number' ? d : d.pl;
      const pct = val / total;
      if (pct <= 0) return;
      const endAngle = startAngle + pct * Math.PI * 2;
      const largeArc = pct > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
      const ix1 = cx + rInner * Math.cos(endAngle), iy1 = cy + rInner * Math.sin(endAngle);
      const ix2 = cx + rInner * Math.cos(startAngle), iy2 = cy + rInner * Math.sin(startAngle);
      paths += `<path d="M${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} L${ix1},${iy1} A${rInner},${rInner} 0 ${largeArc},0 ${ix2},${iy2} Z" fill="${colors[i%colors.length]}" opacity="0.85"><title>${name}: ${(pct*100).toFixed(1)}%</title></path>`;
      startAngle = endAngle;
    });
    // Center text
    paths += `<text x="${cx}" y="${cy-4}" text-anchor="middle" font-family="Fraunces,serif" font-size="14" fill="var(--text)">${formatBRL(total)}</text>`;
    paths += `<text x="${cx}" y="${cy+10}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="7" fill="var(--text-faint)">TOTAL</text>`;

    return h('div', { class: 'card', style: { padding: '16px' } }, [
      h('div', { style: { fontSize:'13px', fontFamily:'Fraunces,serif', marginBottom:'12px', textAlign:'center' } }, title),
      h('div', { style: { display:'flex', alignItems:'center', gap:'16px', justifyContent:'center' } }, [
        h('div', { html: `<svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px">${paths}</svg>` }),
        h('div', {}, entries.slice(0,8).map(([name, d], i) => {
          const val = typeof d === 'number' ? d : d.pl;
          const pct = (val/total*100).toFixed(1);
          const cnt = typeof d === 'object' && d.count ? ` (${d.count})` : '';
          return h('div', { style: { display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' } }, [
            h('div', { style: { width:'8px', height:'8px', borderRadius:'2px', background: colors[i%colors.length], flexShrink:'0' } }),
            h('div', { class:'mono', style: { fontSize:'9px' } }, `${name}${cnt}`),
            h('div', { class:'mono', style: { fontSize:'9px', color:'var(--text-faint)', marginLeft:'auto', paddingLeft:'8px' } }, `${pct}%`),
          ]);
        })),
      ]),
    ]);
  }

  return h('div', { class: 'content fade-up' }, [
    pageHead('Hub', '<em>Panorama</em>', 'Visão consolidada da gestora'),

    // Main KPIs
    h('div', { style: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'12px', marginBottom:'28px' } }, [
      h('div', { class:'card', style: { padding:'18px 22px', borderTop:'3px solid var(--amber)' } }, [
        h('div', { class:'mono', style: { fontSize:'8px', textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--text-faint)' } }, 'Fundos sob Gestão'),
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'32px', color:'var(--amber)', margin:'4px 0' } }, String(funds.length)),
      ]),
      h('div', { class:'card', style: { padding:'18px 22px', borderTop:'3px solid var(--amber)' } }, [
        h('div', { class:'mono', style: { fontSize:'8px', textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--text-faint)' } }, 'PL Consolidado'),
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'32px', color:'var(--amber)', margin:'4px 0' } }, formatBRL(totalPL)),
        h('div', { class:'mono', style: { fontSize:'9px', color:'var(--text-faint)' } }, fundData.filter(d => d.pl > 0).length + ' fundo(s) com carteira'),
      ]),
    ]),

    // Charts row
    h('div', { style: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'24px' } }, [
      svgDonut('PL por Classificação', byClass, totalPL),
      svgDonut('PL por Administrador', byAdmin, totalPL),
      svgDonut('PL por Tipo de Ativo', Object.fromEntries(Object.entries(byAssetType).map(([k,v])=>[k,{pl:v}])), Object.values(byAssetType).reduce((a,b)=>a+b,0) || 1),
    ].filter(Boolean)),

    // Fund table
    h('div', { class:'macro-section-subhead' }, 'Resumo por Fundo'),
    h('div', { class:'card', style: { padding:0, overflow:'auto' } },
      h('table', { style: { width:'100%', borderCollapse:'collapse', fontSize:'11px' } }, [
        h('thead', {}, h('tr', { style: { background:'var(--bg-3)' } },
          ['Fundo','Class.','Administrador','PL','Cota','Carteiras','Última'].map((c,i) =>
            h('th', { style: { padding:'7px 10px', textAlign: i<3?'left':'right', fontFamily:'JetBrains Mono,monospace', fontSize:'8px', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-faint)' } }, c)))),
        h('tbody', {}, fundData.sort((a,b) => b.pl - a.pl).map(d => {
          const pctPL = totalPL > 0 ? (d.pl / totalPL * 100) : 0;
          return h('tr', { style: { borderTop:'1px solid var(--border)', cursor:'pointer' }, onClick: () => { state.topTab='gestao'; state.view='am_funds'; state._backoffice_fund=d.fund.cnpj||d.fund.id; render(); } }, [
            h('td', { style: { padding:'6px 10px' } }, [
              h('div', { style: { fontWeight:'500' } }, d.fund.name),
              h('div', { class:'mono', style: { fontSize:'9px', color:'var(--text-faint)' } }, d.fund.cnpj || ''),
            ]),
            h('td', { class:'mono', style: { padding:'6px 10px', fontSize:'10px', color:'var(--text-faint)' } }, (d.fund.classification||'').toUpperCase()),
            h('td', { class:'mono', style: { padding:'6px 10px', fontSize:'10px', color:'var(--text-faint)' } }, d.fund.administrador || '—'),
            h('td', { style: { padding:'6px 10px', textAlign:'right' } }, [
              h('div', { class:'mono', style: { fontWeight:'600' } }, d.pl > 0 ? formatBRL(d.pl) : '—'),
              d.pl > 0 && h('div', { style: { display:'flex', alignItems:'center', gap:'4px', justifyContent:'flex-end' } }, [
                h('div', { style: { width:'40px', height:'4px', background:'var(--bg-3)', borderRadius:'2px', overflow:'hidden' } }, [
                  h('div', { style: { width: pctPL+'%', height:'100%', background:'var(--amber)', borderRadius:'2px' } }),
                ]),
                h('span', { class:'mono', style: { fontSize:'8px', color:'var(--text-faint)' } }, pctPL.toFixed(1)+'%'),
              ]),
            ]),
            h('td', { class:'mono', style: { padding:'6px 10px', textAlign:'right' } }, d.latest?.fund?.valorcota ? 'R$ '+d.latest.fund.valorcota.toFixed(6) : '—'),
            h('td', { class:'mono', style: { padding:'6px 10px', textAlign:'right' } }, String(d.carteiras.length)),
            h('td', { class:'mono', style: { padding:'6px 10px', textAlign:'right', color:'var(--text-faint)' } }, d.latest?.fund?.dtposicao || '—'),
          ]);
        })),
      ])
    ),
  ]);
}

function renderHubOperacional() {
  const funds = getFunds();
  const tasks = getTasks().filter(t => t.status !== 'done' && t.status !== 'cancelled');
  const today = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter(t => t.due_date && t.due_date < today);

  return h('div', { class: 'content fade-up' }, [
    pageHead('Hub', 'Painel <em>Operacional</em>', 'Tarefas, prazos e alertas'),
    h('div', { style: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'10px', marginBottom:'24px' } }, [
      renderPortKPI('Tarefas Ativas', String(tasks.length), ''),
      renderPortKPI('Atrasadas', String(overdue.length), overdue.length > 0 ? 'Atenção!' : ''),
      renderPortKPI('Urgentes', String(tasks.filter(t => t.priority === 'urgent').length), ''),
      renderPortKPI('Em Revisão', String(tasks.filter(t => t.status === 'review').length), ''),
    ]),
    funds.length > 0 && renderOperationalHeatmap(funds),
    overdue.length > 0 && h('div', { style: { marginTop:'16px' } }, [
      h('div', { class:'macro-section-subhead' }, '⚠ Tarefas Atrasadas'),
      ...overdue.map(t => renderTaskCard(t)),
    ]),
    // Upcoming important dates (funds + credit + RE)
    (() => {
      const today = new Date().toISOString().split('T')[0];
      const in30d = new Date(Date.now() + 30*86400000).toISOString().split('T')[0];
      const allDates = [];
      // Fund dates
      const funds = getFunds();
      for (const f of funds) {
        const dates = getFundDates(f.id);
        for (const d of dates) {
          if (d.date >= today && d.date <= in30d) allDates.push({ ...d, source: f.name, type: 'fund', icon: '📁' });
        }
      }
      // Credit asset dates
      if (DB._creditNotes) {
        for (const [key, notes] of Object.entries(DB._creditNotes)) {
          for (const d of (notes.dates||[])) {
            if (d.date >= today && d.date <= in30d) allDates.push({ ...d, source: key, type: 'credit', icon: '💳' });
          }
        }
      }
      // RE dates
      if (DB._reNotes) {
        for (const [key, notes] of Object.entries(DB._reNotes)) {
          for (const d of (notes.dates||[])) {
            if (d.date >= today && d.date <= in30d) allDates.push({ ...d, source: key, type: 're', icon: '🏢' });
          }
        }
      }
      allDates.sort((a,b) => a.date.localeCompare(b.date));
      if (allDates.length === 0) return null;
      const daysUntil = (d) => Math.ceil((new Date(d) - new Date(today)) / 86400000);
      return h('div', { style: { marginTop:'20px' } }, [
        h('div', { class:'macro-section-subhead' }, '📅 Próximas Datas (30 dias) — ' + allDates.length + ' evento(s)'),
        h('div', { class:'card', style: { padding:0 } },
          allDates.map((d, i) => {
            const days = daysUntil(d.date);
            const urgency = days <= 3 ? 'var(--red)' : days <= 7 ? 'var(--amber)' : 'var(--text-faint)';
            return h('div', { style: { display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', borderTop: i>0?'1px solid var(--border)':'none' } }, [
              h('div', { style: { fontSize:'16px', flexShrink:'0' } }, d.icon),
              h('div', { style: { flex:1 } }, [
                h('div', { style: { fontSize:'12px', fontWeight:'500' } }, d.desc),
                h('div', { class:'mono', style: { fontSize:'9px', color:'var(--text-faint)' } }, d.source),
              ]),
              h('div', { style: { textAlign:'right', flexShrink:'0' } }, [
                h('div', { class:'mono', style: { fontSize:'11px', fontWeight:'600', color: urgency } }, d.date),
                h('div', { class:'mono', style: { fontSize:'9px', color: urgency } }, days === 0 ? 'HOJE' : days === 1 ? 'Amanhã' : 'em ' + days + ' dias'),
              ]),
            ]);
          })
        ),
      ]);
    })(),

    // Recent tasks
    h('div', { style: { marginTop:'16px' } }, [
      h('div', { class:'macro-section-subhead' }, 'Tarefas Recentes'),
      ...tasks.sort((a,b) => (b.updated_at||'').localeCompare(a.updated_at||'')).slice(0,8).map(t => renderTaskCard(t)),
    ]),
  ]);
}

function renderHubAdmin() {
  return h('div', { class: 'content fade-up' }, [
    pageHead('Hub', '<em>Administração</em>', 'Gestão de usuários e configurações'),
    h('div', { style: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'10px', marginBottom:'24px' } }, [
      renderPortKPI('Usuários', String(_allUsers.length), ''),
      renderPortKPI('Meu Papel', ROLES[_user?.role]?.label || '—', ''),
    ]),
    // User list
    h('div', { class:'macro-section-subhead' }, 'Equipe'),
    h('div', { class:'card', style: { padding:0 } },
      _allUsers.map((u, i) =>
        h('div', { style: { display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' } }, [
          h('div', { style: { width:'32px', height:'32px', borderRadius:'50%', background:'var(--amber)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'13px' } }, (u.name||'?')[0].toUpperCase()),
          h('div', { style: { flex:1 } }, [
            h('div', { style: { fontSize:'13px', fontWeight:'500' } }, u.name),
            h('div', { class:'mono', style: { fontSize:'10px', color:'var(--text-faint)' } }, u.email),
          ]),
          h('div', { class:'mono', style: { fontSize:'10px', padding:'3px 8px', border:'1px solid var(--border)', borderRadius:'4px' } }, ROLES[u.role]?.label || u.role),
          userCan('manage_users') && h('select', { class:'form-field-select', style: { width:'130px', fontSize:'10px' }, value: u.role,
            onchange: e => { updateUserRole(u.id, e.target.value).then(() => { showToast('Papel atualizado'); render(); }); }
          }, Object.entries(ROLES).map(([k,v]) => h('option', { value: k, selected: u.role === k ? 'selected' : null }, v.label))),
        ])
      )
    ),
    // Settings
    h('div', { style: { marginTop:'24px' } }, [
      h('div', { class:'macro-section-subhead' }, 'Dados'),
      h('div', { style: { display:'flex', gap:'10px' } }, [
        h('button', { class:'btn-primary', onClick: () => { dbLoadAll().then(() => showToast('Dados sincronizados')); }}, '↓ Sincronizar Dados'),
      ]),
    ]),
  ]);
}

/* ============================================================
   ANÁLISE VIEWS
   ============================================================ */
function renderAnaliseProducts() { return renderProductAnalysis(); }
function renderAnaliseAssets() { return renderAssetsAnalysis(); }

function renderHubOperadores() {
  return h('div', { class: 'content fade-up' }, [
    pageHead('Hub', '<em>Operadores</em>', 'Gestão de operadores e contrapartes'),
    h('div', { class: 'card', style: { padding: '40px', textAlign: 'center' } }, [
      h('div', { style: { fontSize: '40px', marginBottom: '12px' } }, '🚧'),
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px', marginBottom: '8px' } }, 'Em Desenvolvimento'),
      h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' } },
        'O módulo de Operadores permitirá cadastrar e gerenciar contrapartes, corretoras, custodiantes e prestadores de serviço. Em breve.'),
    ]),
  ]);
}

/* ============================================================
   CARTEIRA CONSOLIDADA (Carteira + Imóveis + Fluxo)
   ============================================================ */
function renderCarteiraConsolidada(parsed, fund, carteiras) {
  if (!parsed) return h('div', { class: 'empty' }, [h('div', { class: 'empty-title' }, 'Nenhuma carteira carregada')]);

  const parts = [];

  // 1. Carteira detail (KPIs + allocation + asset tables)
  parts.push(renderCarteiraXMLDetail(parsed, fund));

  // 2. Imóveis section (if any)
  const imoveis = parsed.positions?.imoveis || [];
  if (imoveis.length > 0) {
    parts.push(h('div', { style: { marginTop: '8px' } }, [renderCarteiraImoveis(parsed)]));
  }

  // 3. Fluxo Diário (if previous carteira exists)
  const currIdx = carteiras.findIndex(c => c.fund.dtposicao === parsed.fund.dtposicao);
  if (currIdx > 0) {
    parts.push(h('div', { style: { marginTop: '24px', paddingTop: '20px', borderTop: '2px solid var(--border)' } }, [
      renderCarteiraFluxo(parsed, fund),
    ]));
  }

  return h('div', {}, parts);
}

function renderAssetFundosWIP() {
  return h('div', { class: 'content fade-up' }, [
    pageHead('Gestão de Ativos', '<em>Fundos</em>', 'Gestão de cotas de fundos investidos'),
    h('div', { class: 'card', style: { padding: '40px', textAlign: 'center' } }, [
      h('div', { style: { fontSize: '40px', marginBottom: '12px' } }, '🚧'),
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px', marginBottom: '8px' } }, 'Em Desenvolvimento'),
      h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' } },
        'O módulo de gestão de fundos investidos permitirá acompanhar as cotas de fundos na carteira, performance, resgates e aportes. Em breve.'),
    ]),
  ]);
}

function renderAssetLiquidWIP() {
  return h('div', { class: 'content fade-up' }, [
    pageHead('Gestão de Ativos', '<em>Liquid Assets</em>', 'Gestão de ativos líquidos'),
    h('div', { class: 'card', style: { padding: '40px', textAlign: 'center' } }, [
      h('div', { style: { fontSize: '40px', marginBottom: '12px' } }, '🚧'),
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '18px', marginBottom: '8px' } }, 'Em Desenvolvimento'),
      h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' } },
        'O módulo de Liquid Assets permitirá gestão de caixa, títulos públicos e outros ativos de alta liquidez. Em breve.'),
    ]),
  ]);
}

function renderRealEstateEquity() {
  // Combined view: Real Estate Portfolio + Equity Portfolio
  const reContent = renderRealEstatePortfolio();
  const eqContent = renderEquityPortfolio();
  
  return h('div', { class: 'content fade-up' }, [
    pageHead('Gestão de Ativos', 'Real Estate <em>Equity</em>', 'Portfólio consolidado de imóveis e empreendimentos'),
    
    // RE section
    h('div', { style: { marginBottom: '32px' } }, [
      h('div', { style: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' } }, [
        h('div', { style: { width:'4px', height:'20px', background:'var(--amber)', borderRadius:'2px' } }),
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'16px' } }, 'Imóveis dos Fundos'),
      ]),
      reContent,
    ]),
    
    // Equity section
    h('div', {}, [
      h('div', { style: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px', paddingTop:'24px', borderTop:'2px solid var(--border)' } }, [
        h('div', { style: { width:'4px', height:'20px', background:'var(--green)', borderRadius:'2px' } }),
        h('div', { style: { fontFamily:'Fraunces,serif', fontSize:'16px' } }, 'Empreendimentos (Equity)'),
      ]),
      eqContent,
    ]),
  ]);
}

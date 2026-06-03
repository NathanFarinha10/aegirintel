// Aegir·Intel — Credit Rating Engine
// Separated for maintainability

/* ============================================================
   CREDIT RATING ENGINE
   Professional credit analysis for CRI, CCI, Debêntures
   ============================================================ */

const RATING_SCALE = [
  { rating: 'AAA', min: 90, color: '#1a6b3c', desc: 'Qualidade excepcional. Capacidade extremamente forte de honrar compromissos.' },
  { rating: 'AA+', min: 85, color: '#2d8a4e', desc: 'Qualidade muito alta. Diferença marginal em relação ao AAA.' },
  { rating: 'AA',  min: 80, color: '#3a9b5c', desc: 'Qualidade muito alta. Capacidade muito forte.' },
  { rating: 'AA-', min: 76, color: '#4aaa6a', desc: 'Qualidade muito alta.' },
  { rating: 'A+',  min: 72, color: '#5cb85c', desc: 'Qualidade alta. Suscetível a condições adversas.' },
  { rating: 'A',   min: 68, color: '#7ab85c', desc: 'Qualidade alta.' },
  { rating: 'A-',  min: 64, color: '#8ab85c', desc: 'Qualidade alta, com sensibilidade moderada.' },
  { rating: 'BBB+',min: 60, color: '#b8a83c', desc: 'Grau de investimento. Adequada capacidade de pagamento.' },
  { rating: 'BBB', min: 55, color: '#b8963c', desc: 'Grau de investimento. Parâmetros adequados.' },
  { rating: 'BBB-',min: 50, color: '#b8863c', desc: 'Limítrofe de grau de investimento.' },
  { rating: 'BB+', min: 45, color: '#c47a3c', desc: 'Grau especulativo. Vulnerável a condições adversas.' },
  { rating: 'BB',  min: 40, color: '#c46a3c', desc: 'Grau especulativo.' },
  { rating: 'BB-', min: 35, color: '#b85c3c', desc: 'Grau especulativo. Maior vulnerabilidade.' },
  { rating: 'B+',  min: 30, color: '#b84c3c', desc: 'Altamente especulativo.' },
  { rating: 'B',   min: 25, color: '#b83c3c', desc: 'Altamente especulativo. Risco material.' },
  { rating: 'CCC', min: 15, color: '#8a1d1d', desc: 'Risco substancial de inadimplência.' },
  { rating: 'CC',  min: 8,  color: '#6a1515', desc: 'Inadimplência provável.' },
  { rating: 'C',   min: 1,  color: '#4a0e0e', desc: 'Inadimplência iminente.' },
  { rating: 'D',   min: 0,  color: '#2a0808', desc: 'Em inadimplência.' },
];

function scoreToRating(score) {
  for (const r of RATING_SCALE) { if (score >= r.min) return r; }
  return RATING_SCALE[RATING_SCALE.length - 1];
}

// Rating criteria per instrument type
const RATING_CRITERIA = {
  cri: {
    label: 'CRI — Certificado de Recebíveis Imobiliários',
    sections: [
      { id: 'devedor', label: 'Risco do Devedor / Cedente', weight: 25, criteria: [
        { id: 'dev_qualidade', label: 'Qualidade creditícia do devedor/cedente', desc: 'Histórico, porte, solidez financeira', options: [['Excelente — grande empresa, histórico impecável', 10],['Bom — empresa sólida, histórico positivo', 7],['Adequado — empresa mediana, sem eventos negativos', 5],['Fraco — empresa pequena ou com ressalvas', 3],['Crítico — histórico de inadimplência ou reestruturação', 1]] },
        { id: 'dev_concentracao', label: 'Concentração de devedores', desc: 'Pulverização vs concentração dos recebíveis', options: [['Altamente pulverizado (>100 devedores)', 10],['Pulverizado (20-100 devedores)', 8],['Moderado (5-20 devedores)', 5],['Concentrado (2-5 devedores)', 3],['Devedor único', 1]] },
        { id: 'dev_setor', label: 'Risco setorial', desc: 'Setor de atividade e ciclo econômico', options: [['Resiliente (utilities, governo, saúde)', 10],['Estável (alimentos, varejo essencial)', 8],['Cíclico moderado (serviços, indústria)', 5],['Cíclico agressivo (construção, commodities)', 3],['Alto risco (startups, cripto)', 1]] },
      ]},
      { id: 'colateral', label: 'Garantias e Colateral', weight: 25, criteria: [
        { id: 'col_tipo', label: 'Tipo de garantia real', desc: 'Natureza e qualidade da garantia imobiliária', options: [['Alienação fiduciária de imóvel — tier 1 (comercial prime)', 10],['Alienação fiduciária — tier 2 (residencial urbano)', 8],['Cessão fiduciária de recebíveis + AF imóvel', 7],['Cessão fiduciária de recebíveis apenas', 5],['Aval/fiança ou quirografária', 2]] },
        { id: 'col_ltv', label: 'LTV (Loan-to-Value)', desc: 'Relação entre dívida e valor do colateral', options: [['LTV < 50%', 10],['LTV 50-65%', 8],['LTV 65-80%', 5],['LTV 80-100%', 3],['LTV > 100% ou sem avaliação', 1]] },
        { id: 'col_avaliacao', label: 'Avaliação do colateral', desc: 'Qualidade e recência da avaliação', options: [['Laudo < 6 meses, avaliador tier 1', 10],['Laudo < 12 meses, avaliador reconhecido', 7],['Laudo > 12 meses ou avaliador não reconhecido', 4],['Sem laudo de avaliação independente', 1]] },
      ]},
      { id: 'estrutura', label: 'Estrutura da Operação', weight: 25, criteria: [
        { id: 'est_subordinacao', label: 'Subordinação', desc: 'Nível de proteção por subordinação', options: [['Sênior com subordinação > 30%', 10],['Sênior com subordinação 15-30%', 8],['Sênior com subordinação 5-15%', 5],['Sênior com subordinação < 5%', 3],['Mezanino ou subordinada', 1]] },
        { id: 'est_covenants', label: 'Covenants e gatilhos', desc: 'Mecanismos de proteção contratual', options: [['Covenants robustos com gatilhos de amortização acelerada', 10],['Covenants adequados', 7],['Covenants básicos', 4],['Sem covenants relevantes', 1]] },
        { id: 'est_fluxo', label: 'Previsibilidade do fluxo', desc: 'Estabilidade e previsibilidade dos recebíveis', options: [['Fluxo contratado, indexado, com histórico > 3 anos', 10],['Fluxo contratado com histórico 1-3 anos', 7],['Fluxo parcialmente contratado', 4],['Fluxo dependente de performance futura', 2]] },
      ]},
      { id: 'juridico', label: 'Risco Jurídico e Regulatório', weight: 15, criteria: [
        { id: 'jur_registro', label: 'Formalização e registro', desc: 'Registro CRI na CVM, custódia, escrituração', options: [['Totalmente formalizado, CVM, B3, custódia tier 1', 10],['Formalizado, securitizadora reconhecida', 7],['Parcialmente formalizado', 4],['Irregularidades ou pendências', 1]] },
        { id: 'jur_tributario', label: 'Risco tributário', desc: 'Benefícios fiscais e estabilidade tributária', options: [['Isento IR PF (Lei 12.431), sem risco tributário', 10],['Tributação padrão, sem contingências', 7],['Contingências tributárias identificadas', 3],['Risco tributário material', 1]] },
      ]},
      { id: 'mercado', label: 'Risco de Mercado', weight: 10, criteria: [
        { id: 'mkt_liquidez', label: 'Liquidez secundária', desc: 'Capacidade de negociação no mercado secundário', options: [['Alta liquidez, negociação frequente', 10],['Liquidez moderada', 6],['Baixa liquidez, buy-and-hold', 3],['Ilíquido', 1]] },
        { id: 'mkt_duration', label: 'Duration / prazo', desc: 'Exposição a risco de taxa de juros', options: [['Curto prazo (< 2 anos)', 10],['Médio prazo (2-5 anos)', 7],['Longo prazo (5-10 anos)', 4],['Muito longo (> 10 anos)', 2]] },
      ]},
    ],
  },
  cci: {
    label: 'CCI — Cédula de Crédito Imobiliário',
    sections: [
      { id: 'devedor', label: 'Risco do Devedor', weight: 30, criteria: [
        { id: 'dev_qualidade', label: 'Qualidade creditícia', desc: 'Capacidade de pagamento do devedor', options: [['PJ grande porte, rating investment grade', 10],['PJ médio porte, bom histórico', 7],['PF alta renda com comprovação', 5],['PJ/PF sem histórico relevante', 3],['Histórico negativo', 1]] },
        { id: 'dev_renda', label: 'Comprometimento de renda', desc: 'Parcela vs renda do devedor', options: [['Parcela < 20% da renda', 10],['Parcela 20-30% da renda', 7],['Parcela 30-40% da renda', 4],['Parcela > 40% da renda', 2]] },
      ]},
      { id: 'colateral', label: 'Garantia Imobiliária', weight: 35, criteria: [
        { id: 'col_tipo', label: 'Tipo de imóvel', desc: 'Classificação e localização do imóvel', options: [['Comercial prime (AAA) em localização premium', 10],['Residencial urbano em região valorizada', 8],['Comercial secundário ou residencial médio', 5],['Terreno ou imóvel rural', 3],['Imóvel com restrições ou irregular', 1]] },
        { id: 'col_ltv', label: 'LTV', options: [['< 50%', 10],['50-65%', 8],['65-80%', 5],['80-100%', 3],['>100%', 1]] },
        { id: 'col_avaliacao', label: 'Avaliação', options: [['Laudo recente, avaliador tier 1', 10],['Laudo < 12m', 7],['Laudo antigo', 4],['Sem laudo', 1]] },
      ]},
      { id: 'estrutura', label: 'Estrutura e Formalização', weight: 20, criteria: [
        { id: 'est_registro', label: 'Registro e custódia', options: [['Registrado, escriturado, custódia tier 1', 10],['Registrado, escrituração adequada', 7],['Pendências de registro', 3],['Sem registro', 1]] },
        { id: 'est_seguro', label: 'Seguros', options: [['Seguro MIP + DFI contratados', 10],['Seguro parcial', 5],['Sem seguros', 1]] },
      ]},
      { id: 'mercado', label: 'Risco de Mercado', weight: 15, criteria: [
        { id: 'mkt_prazo', label: 'Prazo remanescente', options: [['< 3 anos', 10],['3-7 anos', 7],['7-15 anos', 4],['> 15 anos', 2]] },
        { id: 'mkt_indexador', label: 'Indexador', options: [['IPCA + spread', 10],['CDI + spread', 8],['TR + spread', 6],['Prefixado longo', 3]] },
      ]},
    ],
  },
  debenture: {
    label: 'Debênture',
    sections: [
      { id: 'emissor', label: 'Risco do Emissor', weight: 35, criteria: [
        { id: 'em_porte', label: 'Porte e solidez', desc: 'Tamanho, histórico e governança do emissor', options: [['Grande empresa listada, governance excelente', 10],['Grande empresa, boa governança', 8],['Média empresa, governança adequada', 5],['Pequena empresa ou SPE', 3],['Startup ou empresa em dificuldade', 1]] },
        { id: 'em_financeiro', label: 'Saúde financeira', desc: 'Alavancagem, cobertura de juros, geração de caixa', options: [['Dívida Líq/EBITDA < 1.5x, ICSD > 3x', 10],['DL/EBITDA 1.5-2.5x, ICSD 2-3x', 8],['DL/EBITDA 2.5-3.5x, ICSD 1.5-2x', 5],['DL/EBITDA 3.5-5x, ICSD 1-1.5x', 3],['DL/EBITDA > 5x ou ICSD < 1x', 1]] },
        { id: 'em_setor', label: 'Risco setorial', options: [['Utilities regulado, concessões', 10],['Infraestrutura, saneamento', 8],['Indústria estável, agro', 5],['Varejo, serviços cíclicos', 3],['Alto risco setorial', 1]] },
        { id: 'em_esg', label: 'ESG e sustentabilidade', options: [['Framework ESG robusto, certificações', 10],['Práticas ESG adequadas', 7],['ESG incipiente', 4],['Sem práticas ESG', 2]] },
      ]},
      { id: 'garantias', label: 'Garantias', weight: 20, criteria: [
        { id: 'gar_tipo', label: 'Tipo de garantia', options: [['Real (AF imóvel, penhor de ações, cessão fiduciária)', 10],['Fidejussória forte (fiança bancária, aval grupo AA+)', 8],['Fidejussória (aval controlador)', 5],['Quirografária com covenants', 3],['Subordinada', 1]] },
        { id: 'gar_cobertura', label: 'Cobertura das garantias', options: [['> 150% do saldo devedor', 10],['120-150%', 8],['100-120%', 5],['< 100%', 2]] },
      ]},
      { id: 'estrutura', label: 'Estrutura e Covenants', weight: 25, criteria: [
        { id: 'est_cov_fin', label: 'Covenants financeiros', options: [['Robustos (DL/EBITDA, ICSD, restrição dividendos)', 10],['Adequados (2+ covenants)', 7],['Básicos (1 covenant)', 4],['Sem covenants', 1]] },
        { id: 'est_amort', label: 'Perfil de amortização', desc: 'Estrutura de pagamento e refinanciamento', options: [['Amortização regular, sem bullet', 10],['Amortização parcial com bullet moderado', 7],['Bullet com put option', 5],['Bullet longo sem proteção', 2]] },
        { id: 'est_cross', label: 'Cross-default e vencimento antecipado', options: [['Cláusulas amplas e bem definidas', 10],['Cláusulas adequadas', 7],['Cláusulas limitadas', 3],['Sem proteção', 1]] },
      ]},
      { id: 'mercado', label: 'Risco de Mercado e Liquidez', weight: 20, criteria: [
        { id: 'mkt_liquidez', label: 'Liquidez', options: [['Negociação frequente, formador de mercado', 10],['Liquidez moderada', 6],['Baixa liquidez', 3],['Ilíquido', 1]] },
        { id: 'mkt_spread', label: 'Spread vs benchmark', options: [['Spread justo/apertado vs peers', 10],['Spread adequado', 7],['Spread acima dos peers', 4],['Spread muito elevado (distressed)', 1]] },
        { id: 'mkt_duration', label: 'Duration', options: [['< 2 anos', 10],['2-5 anos', 7],['5-10 anos', 4],['> 10 anos', 2]] },
      ]},
    ],
  },
};

// Data functions
function getCreditRatings() { if (!Array.isArray(DB.creditRatings)) DB.creditRatings = []; return DB.creditRatings; }
function saveCreditRating(r) {
  if (!Array.isArray(DB.creditRatings)) DB.creditRatings = [];
  r.updated_at = new Date().toISOString();
  const idx = DB.creditRatings.findIndex(x => x.id === r.id);
  if (idx >= 0) DB.creditRatings[idx] = r; else DB.creditRatings.push(r);
  saveDB(DB); sbUpsert('crating:' + r.id, r);
}
function deleteCreditRating(id) {
  DB.creditRatings = getCreditRatings().filter(x => x.id !== id);
  saveDB(DB); sbDelete('crating:' + id);
}

function computeRatingScore(type, scores) {
  const criteria = RATING_CRITERIA[type];
  if (!criteria) return 0;
  let totalScore = 0, totalWeight = 0;
  for (const sec of criteria.sections) {
    let secScore = 0, secCount = 0;
    for (const c of sec.criteria) {
      const val = scores[c.id];
      if (val != null) { secScore += val; secCount++; }
    }
    if (secCount > 0) {
      totalScore += (secScore / secCount) * (sec.weight / 100) * 10;
      totalWeight += sec.weight;
    }
  }
  return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
}

// Main engine view
function renderCreditRatingEngine() {
  const ratings = getCreditRatings();

  // Detail view
  if (state._rating_detail) {
    const r = ratings.find(x => x.id === state._rating_detail);
    if (!r) { state._rating_detail = null; return renderCreditRatingEngine(); }
    return renderCreditRatingDetail(r);
  }

  // Get portfolio assets for linking
  const portfolioAssets = [];
  for (const f of getFunds()) {
    const cs = getCarteirasXML(f.cnpj);
    const lt = cs.length > 0 ? cs[cs.length-1] : null;
    if (!lt) continue;
    for (const p of (lt.positions?.titprivado || [])) {
      portfolioAssets.push({ ...p, fundName: f.name, fundCnpj: f.cnpj });
    }
  }

  return h('div', { class: 'content fade-up' }, [
    pageHead('Análise de Crédito', 'Rating de <em>Operações</em>', 'Motor de rating para CRI, CCI e Debêntures'),

    // New rating picker
    h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Nova Análise de Rating'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' } },
        Object.entries(RATING_CRITERIA).map(([key, cfg]) =>
          h('div', { class: 'card', style: { padding: '16px', cursor: 'pointer', borderTop: '3px solid var(--amber)', textAlign: 'center' },
            onClick: () => {
              const r = { id: 'cr_'+Date.now(), type: key, name: 'Nova análise ' + cfg.label.split('—')[0].trim(), status: 'draft', scores: {}, commentary: '', linkedAsset: '', analyst: _user?.name||'', comments: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
              saveCreditRating(r);
              state._rating_detail = r.id;
              render();
            }
          }, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '4px' } }, cfg.label.split('—')[0].trim()),
            h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, cfg.sections.length + ' dimensões · ' + cfg.sections.reduce((a,s) => a + s.criteria.length, 0) + ' critérios'),
          ])
        )
      ),
    ]),

    // Existing ratings
    ratings.length > 0 && h('div', {}, [
      h('div', { class: 'macro-section-subhead' }, 'Análises de Rating (' + ratings.length + ')'),
      h('div', { class: 'card', style: { padding: 0 } },
        ratings.sort((a,b) => (b.updated_at||'').localeCompare(a.updated_at||'')).map((r, i) => {
          const score = computeRatingScore(r.type, r.scores);
          const rt = scoreToRating(score);
          const cfg = RATING_CRITERIA[r.type] || {};
          return h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: i>0?'1px solid var(--border)':'none', cursor: 'pointer' },
            onClick: () => { state._rating_detail = r.id; render(); }
          }, [
            h('div', { style: { width: '42px', height: '42px', borderRadius: '6px', background: rt.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', flexShrink: '0' } }, rt.rating),
            h('div', { style: { flex: 1 } }, [
              h('div', { style: { fontSize: '13px', fontWeight: '500' } }, r.name),
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, (cfg.label||'').split('—')[0].trim() + ' · ' + (r.analyst||'—') + ' · ' + (r.updated_at||'').split('T')[0]),
            ]),
            h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, score.toFixed(0) + '/100'),
            r.linkedAsset && h('div', { class: 'mono', style: { fontSize: '9px', padding: '2px 6px', background: 'var(--bg-3)', borderRadius: '3px' } }, '📎 Vinculado'),
          ]);
        })
      ),
    ]),
  ]);
}

// Rating detail with scoring form
function renderCreditRatingDetail(r) {
  const cfg = RATING_CRITERIA[r.type];
  if (!cfg) return h('div', {}, 'Tipo de rating não encontrado');
  const score = computeRatingScore(r.type, r.scores);
  const rt = scoreToRating(score);
  const filled = Object.keys(r.scores).length;
  const totalCriteria = cfg.sections.reduce((a,s) => a + s.criteria.length, 0);
  const pct = totalCriteria > 0 ? (filled / totalCriteria * 100) : 0;

  // Portfolio assets for linking
  const portfolioAssets = [];
  for (const f of getFunds()) {
    const cs = getCarteirasXML(f.cnpj);
    const lt = cs.length > 0 ? cs[cs.length-1] : null;
    if (lt) for (const p of (lt.positions?.titprivado||[])) portfolioAssets.push({ key: p.codativo||p.isin, label: (p.codativo||p.isin) + ' — ' + f.name, fundName: f.name });
  }

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._rating_detail = null; render(); } }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),

    // Header with rating badge
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' } }, [
      h('div', { style: { flex: 1 } }, [
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--amber)', textTransform: 'uppercase' } }, cfg.label),
        h('input', { class: 'form-field-input', style: { fontFamily: 'Fraunces, serif', fontSize: '20px', border: 'none', padding: '4px 0', background: 'transparent', width: '100%' }, id: 'cr-name', value: r.name, onchange: e => { r.name = e.target.value; saveCreditRating(r); } }),
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Por ' + (r.analyst||'—') + ' · Preenchido: ' + filled + '/' + totalCriteria + ' critérios'),
      ]),
      h('div', { style: { textAlign: 'center', flexShrink: '0', marginLeft: '20px' } }, [
        h('div', { style: { width: '64px', height: '64px', borderRadius: '10px', background: rt.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '22px', fontFamily: 'JetBrains Mono, monospace', margin: '0 auto 4px' } }, rt.rating),
        h('div', { class: 'mono', style: { fontSize: '11px', fontWeight: '600' } }, score.toFixed(1) + ' / 100'),
        h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)', maxWidth: '140px' } }, rt.desc),
      ]),
    ]),

    // Progress bar
    h('div', { style: { marginBottom: '20px' } }, [
      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' } }, [
        h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Preenchimento'),
        h('span', { class: 'mono', style: { fontSize: '10px', color: pct === 100 ? 'var(--green)' : 'var(--amber)' } }, pct.toFixed(0) + '%'),
      ]),
      h('div', { style: { height: '6px', background: 'var(--bg-3)', borderRadius: '3px' } }, [
        h('div', { style: { width: pct + '%', height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--amber)', borderRadius: '3px' } }),
      ]),
    ]),

    // Link to portfolio
    h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' } }, [
      h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Vincular a ativo:'),
      h('select', { class: 'form-field-select', style: { flex: 1, fontSize: '11px' }, value: r.linkedAsset || '', onchange: e => { r.linkedAsset = e.target.value; saveCreditRating(r); } }, [
        h('option', { value: '' }, '— Nenhum (análise independente) —'),
        ...portfolioAssets.map(a => h('option', { value: a.key, selected: r.linkedAsset === a.key ? 'selected' : null }, a.label)),
      ]),
    ]),

    // Scoring sections
    ...cfg.sections.map(sec => {
      const secScores = sec.criteria.map(c => r.scores[c.id]).filter(v => v != null);
      const secAvg = secScores.length > 0 ? (secScores.reduce((a,b)=>a+b,0) / secScores.length) : 0;
      return h('div', { class: 'card', style: { padding: '18px', marginBottom: '12px' } }, [
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } }, [
          h('div', {}, [
            h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px' } }, sec.label),
            h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, 'Peso: ' + sec.weight + '% · ' + secScores.length + '/' + sec.criteria.length + ' avaliados'),
          ]),
          h('div', { class: 'mono', style: { fontSize: '14px', fontWeight: '700', color: secAvg >= 7 ? 'var(--green)' : secAvg >= 4 ? 'var(--amber)' : 'var(--red)' } }, secAvg.toFixed(1) + '/10'),
        ]),
        ...sec.criteria.map(c =>
          h('div', { style: { marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' } }, [
            h('div', { style: { fontSize: '12px', fontWeight: '500', marginBottom: '2px' } }, c.label),
            c.desc && h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)', marginBottom: '6px' } }, c.desc),
            h('select', { class: 'form-field-select', style: { width: '100%', fontSize: '11px' }, value: r.scores[c.id] != null ? String(r.scores[c.id]) : '',
              onchange: e => { r.scores[c.id] = e.target.value ? parseInt(e.target.value) : undefined; saveCreditRating(r); render(); }
            }, [
              h('option', { value: '' }, '— Selecione —'),
              ...c.options.map(([label, val]) => h('option', { value: String(val), selected: r.scores[c.id] === val ? 'selected' : null }, val + '/10 — ' + label)),
            ]),
          ])
        ),
      ]);
    }),

    // Commentary
    h('div', { class: 'card', style: { padding: '16px', marginBottom: '16px' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px', marginBottom: '8px' } }, 'Parecer do Analista'),
      h('textarea', { class: 'form-field-input', id: 'cr-commentary', rows: '4', style: { resize: 'vertical', width: '100%' } }, r.commentary || ''),
      h('button', { class: 'btn-primary', style: { marginTop: '8px' }, onClick: () => { r.commentary = document.getElementById('cr-commentary')?.value||''; saveCreditRating(r); showToast('Parecer salvo'); }}, 'Salvar Parecer'),
    ]),

    // Actions
    h('div', { style: { display: 'flex', gap: '10px' } }, [
      h('button', { class: 'btn-secondary', onClick: () => exportCreditRatingPDF(r) }, '↓ Exportar PDF'),
      h('button', { class: 'btn-secondary', style: { color: 'var(--red)' }, onClick: () => { if (confirm('Excluir rating?')) { deleteCreditRating(r.id); state._rating_detail = null; render(); } }}, 'Excluir'),
    ]),
  ]);
}

// PDF export for credit rating
async function exportCreditRatingPDF(r) {
  const cfg = RATING_CRITERIA[r.type]; if (!cfg) return;
  const score = computeRatingScore(r.type, r.scores);
  const rt = scoreToRating(score);
  let b = '<div class="pdf-kpis">' + pKPI('Rating', rt.rating, rt.desc, score >= 50 ? 'green' : 'red') + pKPI('Score', score.toFixed(1) + '/100') + pKPI('Tipo', cfg.label.split('—')[0].trim()) + pKPI('Analista', r.analyst || '—') + '</div>';
  if (r.linkedAsset) b += pKV('Ativo Vinculado', r.linkedAsset);
  b += pKVGrid([['Status', r.status || 'draft'], ['Data', (r.updated_at||'').split('T')[0]]]);
  for (const sec of cfg.sections) {
    b += pSec(sec.label + ' (Peso: ' + sec.weight + '%)');
    const rows = sec.criteria.map(c => {
      const val = r.scores[c.id];
      const opt = val != null ? c.options.find(o => o[1] === val) : null;
      return [c.label, val != null ? val + '/10' : '—', opt ? opt[0] : 'Não avaliado'];
    });
    b += pTable(['Critério', 'Nota', 'Avaliação'], rows);
  }
  if (r.commentary) { b += pSec('Parecer do Analista'); b += pText(r.commentary); }
  openPrintReport('Rating: ' + r.name, cfg.label + ' · ' + rt.rating, b);
}
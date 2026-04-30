
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
   32. COMITÊ & ATAS DE INVESTIMENTO
   Registro semiformal de reuniões e deliberações
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

  if (activeComite && activeFund) {
    const comite = getComites(activeFund).find(c => c.id === activeComite);
    if (comite) return renderComiteDetail(activeFund, comite);
  }

  if (state._comite_editing) return renderComiteForm(state._comite_editing_fund, state._comite_editing);

  return h('div', { class: 'content fade-up' }, [
    pageHead('Asset Management · Comitê', 'Comitê & <em>Atas</em>',
      'Registro de reuniões de investimento com deliberações, condições e acompanhamento de implementação. Exportável como documento.'),

    // Fund filter
    h('div', { style: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' } }, [
      h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.15em' } }, 'Fundo:'),
      h('button', { class: 'sec-tab' + (!activeFund ? ' active' : ''), onClick: () => { state._comite_fund = null; render(); } }, 'Todos'),
      ...funds.map(f => h('button', {
        class: 'sec-tab' + (activeFund === f.id ? ' active' : ''),
        onClick: () => { state._comite_fund = f.id; render(); },
      }, f.name)),
    ]),

    funds.length > 0 && h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' } }, [
      h('button', { class: 'btn-primary', onClick: () => {
        const fundId = activeFund || funds[0].id;
        state._comite_editing = {
          id: 'comite_' + Date.now(), fund_id: fundId, date: new Date().toISOString().split('T')[0],
          type: 'ordinario', attendees: [], agenda_items: [], notes: '', created_at: new Date().toISOString(),
        };
        state._comite_editing_fund = fundId;
        render();
      }}, '+ Nova Reunião'),
    ]),

    (() => {
      const comites = activeFund ? getComites(activeFund).map(c => ({ ...c, _fund_id: activeFund })) : getComites();
      if (comites.length === 0) return h('div', { class: 'empty' }, [
        h('div', { class: 'empty-title' }, 'Nenhuma ata registrada'),
        h('p', { class: 'empty-desc' }, 'Registre sua primeira reunião de comitê de investimentos.'),
      ]);
      return h('div', {}, comites.map(comite => {
        const fund = getFund(comite._fund_id);
        const approvedCount = (comite.agenda_items || []).filter(i => i.decision === 'approved').length;
        const totalItems = (comite.agenda_items || []).length;
        return h('div', {
          class: 'card card-hover', style: { cursor: 'pointer', marginBottom: '10px' },
          onClick: () => { state._comite_fund = comite._fund_id; state._active_comite = comite.id; render(); },
        }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
            h('div', {}, [
              h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px' } }, `Comitê ${comite.type === 'extraordinario' ? 'Extraordinário' : 'Ordinário'} — ${comite.date}`),
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px' } },
                `${fund?.name || '?'} · ${totalItems} item(s) · ${approvedCount} aprovado(s) · ${(comite.attendees || []).length} participante(s)`),
            ]),
            h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--text-faint)' } }, comite.date),
          ]),
        ]);
      }));
    })(),
  ]);
}

/* ---------- Render: Comitê Form ---------- */

function renderComiteForm(fundId, comite) {
  const funds = getFunds();
  const teses = getTeses(fundId);

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._comite_editing = null; render(); } }, [
      h('span', {}, '←'), h('span', {}, 'Cancelar'),
    ]),
    h('h1', { class: 'page-title' }, 'Registrar Reunião de Comitê'),

    // Basic info
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '16px' } }, [
      h('div', { style: { display: 'grid', gridTemplateColumns: '150px 150px 150px 1fr', gap: '12px', marginBottom: '16px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Data'),
          h('input', { class: 'form-field-input', type: 'date', value: comite.date, onchange: e => comite.date = e.target.value }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Tipo'),
          h('select', { class: 'form-field-select', onchange: e => comite.type = e.target.value },
            [['ordinario', 'Ordinário'], ['extraordinario', 'Extraordinário']].map(([v, l]) => h('option', { value: v, selected: comite.type === v ? 'selected' : null }, l))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Fundo'),
          h('select', { class: 'form-field-select', onchange: e => { state._comite_editing_fund = e.target.value; } },
            funds.map(f => h('option', { value: f.id, selected: fundId === f.id ? 'selected' : null }, f.name))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Participantes (separados por vírgula)'),
          h('input', { class: 'form-field-input', type: 'text', value: (comite.attendees || []).join(', '), placeholder: 'Gestor, Analista, Risco, Compliance',
            oninput: e => comite.attendees = e.target.value.split(',').map(s => s.trim()).filter(Boolean) }) ]),
      ]),
    ]),

    // Agenda items
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '16px' } }, [
      h('div', { class: 'mono', style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber)', marginBottom: '12px' } }, 'Itens de Pauta'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 150px 120px 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '16px' } }, [
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Assunto'),
          h('input', { class: 'form-field-input', type: 'text', id: 'ai-title', placeholder: 'Ex: Alocação em CRI Logística' }) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Tese vinculada'),
          h('select', { class: 'form-field-select', id: 'ai-thesis' }, [
            h('option', { value: '' }, '— Nenhuma —'),
            ...teses.map(t => h('option', { value: t.id }, t.title)),
          ]) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Decisão'),
          h('select', { class: 'form-field-select', id: 'ai-decision' },
            Object.entries(DECISION_TYPES).map(([k, v]) => h('option', { value: k }, `${v.icon} ${v.label}`))) ]),
        h('div', {}, [ h('label', { class: 'form-field-label' }, 'Condições / Observações'),
          h('input', { class: 'form-field-input', type: 'text', id: 'ai-cond', placeholder: 'Ex: Limitar a 10% do PL' }) ]),
        h('button', { class: 'btn-secondary', onClick: () => {
          const title = document.getElementById('ai-title')?.value?.trim();
          if (!title) { showToast('Assunto obrigatório', true); return; }
          comite.agenda_items.push({
            id: 'item_' + Date.now(), title,
            thesis_id: document.getElementById('ai-thesis')?.value || null,
            decision: document.getElementById('ai-decision')?.value || 'approved',
            conditions: document.getElementById('ai-cond')?.value?.trim() || '',
            implementation_status: 'pending',
          });
          document.getElementById('ai-title').value = '';
          document.getElementById('ai-cond').value = '';
          render();
        }}, '+'),
      ]),
      ...(comite.agenda_items || []).map((item, i) => {
        const dec = DECISION_TYPES[item.decision] || {};
        return h('div', { style: { display: 'grid', gridTemplateColumns: '30px 1fr 100px 1fr 30px', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: '12px' } }, [
          h('span', { class: 'mono', style: { color: 'var(--text-faint)' } }, `${i + 1}.`),
          h('span', { style: { fontFamily: 'Fraunces, serif' } }, item.title),
          h('span', { class: 'mono', style: { color: dec.color, fontSize: '10px' } }, `${dec.icon} ${dec.label}`),
          h('span', { style: { color: 'var(--text-faint)', fontSize: '11px' } }, item.conditions || '—'),
          h('button', { style: { color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }, onClick: () => { comite.agenda_items.splice(i, 1); render(); } }, '×'),
        ]);
      }),
    ]),

    // Notes
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '16px' } }, [
      h('label', { class: 'form-field-label' }, 'Notas gerais da reunião'),
      h('textarea', { class: 'form-field-textarea', rows: '4', placeholder: 'Discussões relevantes, pontos de atenção, próximos passos...',
        oninput: e => comite.notes = e.target.value }, comite.notes || ''),
    ]),

    // Actions
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
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

/* ---------- Render: Comitê Detail ---------- */

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

    // Deliberations
    h('div', { style: { marginBottom: '28px' } }, [
      sectionHead('01', 'Deliberações', `${(comite.agenda_items || []).length} item(s) de pauta`),
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
                class: 'form-field-select', style: { width: '120px', fontSize: '10px', padding: '4px' },
                onchange: e => { item.implementation_status = e.target.value; saveComite(fundId, comite); render(); },
              }, Object.entries(IMPL_STATUS).map(([k, v]) => h('option', { value: k, selected: item.implementation_status === k ? 'selected' : null }, v.label))),
            ]),
          ]),
          item.conditions && h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' } }, `Condições: ${item.conditions}`),
          linkedTese && h('div', { style: { fontSize: '11px', color: 'var(--amber)', cursor: 'pointer', marginTop: '4px' },
            onClick: () => { state._tese_fund = fundId; state._active_tese = linkedTese.id; setView('am_teses'); } },
            `↗ Tese vinculada: ${linkedTese.title}`),
        ]);
      }),
    ]),

    // Notes
    comite.notes && h('div', { style: { marginBottom: '28px' } }, [
      sectionHead('02', 'Notas da Reunião', ''),
      h('div', { class: 'card', style: { padding: '20px 24px', fontFamily: 'Fraunces, serif', fontSize: '13px', lineHeight: '1.75', color: 'var(--text-muted)' } }, comite.notes),
    ]),
  ]);
}

function exportAtaMarkdown(comite, fund) {
  let md = `# Ata de Comitê de Investimentos\n\n`;
  md += `**Fundo:** ${fund?.name || '?'}\n`;
  md += `**Data:** ${comite.date}\n`;
  md += `**Tipo:** ${comite.type === 'extraordinario' ? 'Extraordinário' : 'Ordinário'}\n`;
  md += `**Participantes:** ${(comite.attendees || []).join(', ')}\n\n`;
  md += `---\n\n`;
  md += `## Deliberações\n\n`;
  for (let i = 0; i < (comite.agenda_items || []).length; i++) {
    const item = comite.agenda_items[i];
    const dec = DECISION_TYPES[item.decision] || {};
    const impl = IMPL_STATUS[item.implementation_status] || {};
    md += `### ${i + 1}. ${item.title}\n\n`;
    md += `- **Decisão:** ${dec.icon} ${dec.label}\n`;
    if (item.conditions) md += `- **Condições:** ${item.conditions}\n`;
    md += `- **Implementação:** ${impl.label}\n\n`;
  }
  if (comite.notes) { md += `## Notas\n\n${comite.notes}\n\n`; }
  md += `---\n*Ata gerada pelo Aegir·Intel em ${new Date().toLocaleDateString('pt-BR')}*\n`;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `ata-comite-${fund?.name?.replace(/\s+/g, '-') || 'fund'}-${comite.date}.md`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Ata exportada');
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
  const positions = { acoes: [], titprivado: [], cotas: [], caixa: [], despesas: null };

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
  const allPositions = [...positions.acoes, ...positions.titprivado, ...positions.cotas];
  const totalValorDisp = allPositions.reduce((a, p) => a + (p.valorfindisp || 0), 0);
  const totalCaixa = positions.caixa.reduce((a, p) => a + (p.saldo || 0), 0);
  const totalProvisoes = provisoes.reduce((a, p) => a + (p.valor || 0), 0);

  // PDD total (soma de percprovcred * valorfindisp para tit privados)
  const pddTotal = positions.titprivado.reduce((a, p) => {
    if (p.percprovcred > 0 && p.valorfindisp) return a + (p.percprovcred / 100) * p.valorfindisp;
    return a;
  }, 0);

  return {
    fund,
    positions,
    provisoes,
    stats: {
      totalAtivos: allPositions.length,
      totalValorDisp,
      totalCaixa,
      totalProvisoes,
      pddTotal,
      posAcoes: positions.acoes.length,
      posTitPrivado: positions.titprivado.length,
      posCotas: positions.cotas.length,
    },
  };
}

/* ---------- Carteira Storage ---------- */

function getCarteirasXML(cnpj) {
  if (!DB.carteirasXML) DB.carteirasXML = {};
  if (!Array.isArray(DB.carteirasXML[cnpj])) DB.carteirasXML[cnpj] = [];
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
  if (!fund) {
    state._backoffice_fund = null;
    return renderFundsList();
  }

  const carteiras = getCarteirasXML(fund.cnpj);
  const activeDate = state._bo_date;
  const selected = activeDate ? carteiras.find(c => c.fund.dtposicao === activeDate) : (carteiras.length > 0 ? carteiras[carteiras.length - 1] : null);
  const subTab = state._bo_tab || 'carteira';

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
          `CNPJ: ${fund.cnpj || '—'} · Gestor: ${fund.nomegestor || selected?.fund?.nomegestor || '—'} · Adm: ${fund.administrador || selected?.fund?.nomeadm || '—'}`),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-primary', onClick: () => triggerXMLUpload() }, '↑ Upload XML'),
        h('button', { class: 'btn-secondary', onClick: () => { state._fund_edit = JSON.parse(JSON.stringify(fund)); setView('am_edit'); } }, 'Editar Cadastro'),
      ]),
    ]),

    // Date selector
    carteiras.length > 0 && h('div', { class: 'sec-tab-row', style: { marginBottom: '16px' } },
      carteiras.slice().reverse().slice(0, 12).map(c =>
        h('button', {
          class: 'sec-tab' + ((selected && c.fund.dtposicao === selected.fund.dtposicao) ? ' active' : ''),
          onClick: () => { state._bo_date = c.fund.dtposicao; render(); },
        }, c.fund.dtposicao)
      )
    ),

    // Sub-tabs
    h('div', { style: { display: 'flex', gap: '6px', marginBottom: '16px' } },
      [['carteira', 'Carteira'], ['resumo', 'Resumo & KPIs'], ['provisoes', 'Provisões']].map(([k, l]) =>
        h('button', {
          class: 'sec-tab' + (subTab === k ? ' active' : ''),
          style: { fontSize: '11px', padding: '4px 12px' },
          onClick: () => { state._bo_tab = k; render(); },
        }, l)
      )
    ),

    !selected
      ? h('div', { class: 'empty' }, [
          h('div', { class: 'empty-title' }, 'Nenhuma carteira XML carregada'),
          h('p', { class: 'empty-desc' }, 'Faça upload do arquivo XML padrão CVM (ANBIMA posicao_4_01) para visualizar a carteira deste fundo.'),
        ])
      : subTab === 'carteira' ? renderCarteiraXMLDetail(selected, fund) :
        subTab === 'resumo' ? renderCarteiraResumo(selected, fund) :
        subTab === 'provisoes' ? renderCarteiraProvisoes(selected) : null,
  ]);
}

function renderCarteiraResumo(parsed, fund) {
  const { stats } = parsed;
  const f = parsed.fund;
  return h('div', {}, [
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
      renderPortKPI('PL', f.patliq ? formatBRL(f.patliq) : '—', ''),
      renderPortKPI('Valor Cota', f.valorcota ? `R$ ${f.valorcota.toFixed(6)}` : '—', ''),
      renderPortKPI('Qtd Cotas', f.quantidade ? f.quantidade.toLocaleString('pt-BR') : '—', ''),
      renderPortKPI('Valor Ativos', f.valorativos ? formatBRL(f.valorativos) : '—', ''),
      renderPortKPI('A Receber', f.valorreceber ? formatBRL(f.valorreceber) : '—', ''),
      renderPortKPI('A Pagar', f.valorpagar ? formatBRL(f.valorpagar) : '—', ''),
      renderPortKPI('Total Posições', String(stats.totalAtivos), `${stats.posAcoes} ações · ${stats.posTitPrivado} tít.priv. · ${stats.posCotas} cotas`),
      renderPortKPI('PDD Total', stats.pddTotal > 0 ? formatBRL(stats.pddTotal) : 'R$ 0', 'Provisão para devedores duvidosos'),
      renderPortKPI('Caixa', formatBRL(stats.totalCaixa), ''),
    ]),

    // Allocation by type
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } }, [
      renderAllocationChart('Por Tipo de Ativo', {
        acoes: { weight: stats.posAcoes > 0 ? parsed.positions.acoes.reduce((a, p) => a + (p.valorfindisp || 0), 0) / (f.patliq || 1) * 100 : 0, count: stats.posAcoes },
        titprivado: { weight: stats.posTitPrivado > 0 ? parsed.positions.titprivado.reduce((a, p) => a + (p.valorfindisp || 0), 0) / (f.patliq || 1) * 100 : 0, count: stats.posTitPrivado },
        cotas: { weight: stats.posCotas > 0 ? parsed.positions.cotas.reduce((a, p) => a + (p.valorfindisp || 0), 0) / (f.patliq || 1) * 100 : 0, count: stats.posCotas },
        caixa: { weight: stats.totalCaixa > 0 ? stats.totalCaixa / (f.patliq || 1) * 100 : 0, count: 1 },
      }, {
        acoes: { label: 'Ações/FIIs', color: '#4a7a2c' },
        titprivado: { label: 'Tít. Privados', color: '#b8863c' },
        cotas: { label: 'Cotas Fundos', color: '#3a6a9a' },
        caixa: { label: 'Caixa', color: '#9a958c' },
      }),
      // Indexador breakdown (for FIDC)
      stats.posTitPrivado > 0 && (() => {
        const byIdx = {};
        for (const p of parsed.positions.titprivado) {
          const idx = p.indexador || 'Outros';
          if (!byIdx[idx]) byIdx[idx] = { weight: 0, count: 0 };
          byIdx[idx].weight += (p.valorfindisp || 0) / (f.patliq || 1) * 100;
          byIdx[idx].count++;
        }
        return renderAllocationChart('Por Indexador', byIdx, {});
      })(),
    ].filter(Boolean)),
  ]);
}

function renderCarteiraXMLDetail(parsed, fund) {
  const { positions } = parsed;
  const pl = parsed.fund.patliq || 1;

  return h('div', {}, [
    // Ações / FIIs
    positions.acoes.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Ações / FIIs (${positions.acoes.length})`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Ticker', 'Qtd', 'PU', 'Valor (R$)', '% PL', 'Prov. Créd.'].map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'Ticker' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            positions.acoes
              .sort((a, b) => (b.valorfindisp || 0) - (a.valorfindisp || 0))
              .map(p => h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                h('td', { class: 'mono', style: { padding: '6px 12px', fontWeight: '600', color: 'var(--amber)' } }, p.codativo),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, (p.qtdisponivel || 0).toLocaleString('pt-BR')),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, `R$ ${(p.puposicao || 0).toFixed(2)}`),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, formatBRL(p.valorfindisp)),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, `${((p.valorfindisp || 0) / pl * 100).toFixed(2)}%`),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: p.percprovcred > 0 ? 'var(--red)' : 'var(--text-faint)' } }, `${(p.percprovcred || 0).toFixed(1)}%`),
              ]))
          ),
        ]),
      ]),
    ]),

    // Títulos Privados (CRI, CCI, etc.)
    positions.titprivado.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Títulos Privados (${positions.titprivado.length})`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Código', 'Indexador', 'Cupom', 'Vencimento', 'PU Posição', 'Valor (R$)', '% PL', 'PDD %', 'Risco'].map(col =>
              h('th', { style: { padding: '7px 10px', textAlign: col === 'Código' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            positions.titprivado
              .sort((a, b) => (b.valorfindisp || 0) - (a.valorfindisp || 0))
              .map(p => h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                h('td', { class: 'mono', style: { padding: '6px 10px', fontWeight: '600', color: 'var(--amber)', fontSize: '10px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' } }, p.codativo),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, `${p.indexador || '—'} ${p.percindex ? p.percindex + '%' : ''}`),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, p.coupom ? `${p.coupom.toFixed(2)}%` : '—'),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)' } }, p.dtvencimento || '—'),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right' } }, `R$ ${(p.puposicao || 0).toFixed(2)}`),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontWeight: '500' } }, formatBRL(p.valorfindisp)),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: 'var(--text-faint)' } }, `${((p.valorfindisp || 0) / pl * 100).toFixed(2)}%`),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', color: p.percprovcred > 0 ? 'var(--red)' : 'var(--text-faint)' } }, `${(p.percprovcred || 0).toFixed(1)}%`),
                h('td', { class: 'mono', style: { padding: '6px 10px', textAlign: 'right', fontSize: '9px' } }, p.nivelrsc || '—'),
              ]))
          ),
        ]),
      ]),
    ]),

    // Cotas de fundos
    positions.cotas.length > 0 && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, `Cotas de Fundos (${positions.cotas.length})`),
      h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['CNPJ Fundo', 'Qtd', 'PU', 'Valor (R$)', '% PL'].map(col =>
              h('th', { style: { padding: '8px 12px', textAlign: col === 'CNPJ Fundo' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
            )
          )),
          h('tbody', {},
            positions.cotas.map(p => {
              const val = p.valorfindisp || ((p.qtdisponivel || 0) * (p.puposicao || 0));
              return h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
                h('td', { class: 'mono', style: { padding: '6px 12px', fontSize: '11px' } }, p.cnpjfundo || p.isin || '—'),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, (p.qtdisponivel || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, `R$ ${(p.puposicao || 0).toFixed(6)}`),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, formatBRL(val)),
                h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, `${(val / pl * 100).toFixed(2)}%`),
              ]);
            })
          ),
        ]),
      ]),
    ]),

    // Caixa
    positions.caixa.length > 0 && positions.caixa.some(c => c.saldo > 0) && h('div', { style: { marginBottom: '24px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Caixa'),
      h('div', { class: 'card', style: { padding: '16px' } },
        positions.caixa.filter(c => c.saldo > 0).map(c =>
          h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } }, [
            h('span', { class: 'mono', style: { fontSize: '11px' } }, c.isininstituicao || '—'),
            h('span', { class: 'mono', style: { fontWeight: '500' } }, formatBRL(c.saldo)),
          ])
        )
      ),
    ]),
  ]);
}

function renderCarteiraProvisoes(parsed) {
  const { provisoes } = parsed;
  if (!provisoes || provisoes.length === 0) {
    return h('div', { style: { padding: '30px', textAlign: 'center', color: 'var(--text-faint)' } }, 'Sem provisões registradas.');
  }

  const PROV_CODES = {
    '2': 'Taxa de Administração', '5': 'Taxa de Performance', '8': 'Taxa de Custódia',
    '14': 'Auditoria', '19': 'Outros Serviços', '34': 'Distribuição',
    '999': 'Outras Provisões',
  };

  const total = provisoes.reduce((a, p) => a + (p.valor || 0), 0);

  return h('div', {}, [
    h('div', { class: 'macro-section-subhead' }, `Provisões (${provisoes.length}) · Total: ${formatBRL(total)}`),
    h('div', { class: 'card', style: { padding: 0, overflow: 'auto' } }, [
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
        h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
          ['Código', 'Descrição', 'D/C', 'Data', 'Valor'].map(col =>
            h('th', { style: { padding: '8px 12px', textAlign: col === 'Descrição' ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, col)
          )
        )),
        h('tbody', {},
          provisoes.sort((a, b) => (b.valor || 0) - (a.valor || 0)).map(p =>
            h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right' } }, p.codprov),
              h('td', { style: { padding: '6px 12px' } }, PROV_CODES[p.codprov] || `Provisão ${p.codprov}`),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: p.credeb === 'D' ? 'var(--red)' : 'var(--green)' } }, p.credeb),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, p.dt || '—'),
              h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '500' } }, formatBRL(p.valor)),
            ])
          )
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


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

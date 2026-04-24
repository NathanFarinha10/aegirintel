
/* ---------- 8. HEADER & SIDEBAR ---------- */

const NAV_SECTIONS = {
  intelligence: {
    label: 'Global Intelligence',
    items: [
      { id: 'int_brief',    label: 'Morning Brief',         num: '01' },
      { id: 'int_hub',      label: 'Hub — Nutshell',        num: '02' },
      { id: 'int_macro',    label: 'Macro View',            num: '03' },
      { id: 'int_assets',   label: 'Assets View',           num: '04' },
      { id: 'int_micro',    label: 'MicroAssets View',      num: '05' },
      { id: 'int_thematic', label: 'Thematic View',         num: '06' },
      { id: 'int_scenery', label: 'Scenery View',          num: '07' },
      { id: 'int_search',   label: 'Search',                num: '08' },
      { id: 'int_report',   label: 'Report Builder',        num: '09' },
      { id: 'int_data',     label: 'Data / Reports',        num: '10' },
    ]
  },
  macrointel: {
    label: 'Macro Intelligence',
    items: [
      { id: 'mi_dashboard',   label: 'Dashboard',              num: '01' },
      { id: 'mi_realestate',  label: 'Lens — Real Estate',     num: '02' },
      { id: 'mi_credit',      label: 'Lens — Crédito',         num: '03' },
      { id: 'mi_sectoral',    label: 'Indicadores Setoriais', num: '04' },
      { id: 'mi_fed',          label: 'Fed / FRED (EUA)',      num: '05' },
      { id: 'mi_analysis',     label: 'Análise Avançada',       num: '06' },
      { id: 'mi_report',       label: 'Relatório Macro',        num: '07' },
      { id: 'mi_centralbanks',label: 'Bancos Centrais',        num: '08' },
      { id: 'mi_calendar',    label: 'Event Calendar',         num: '09' },
    ]
  },
  securities: {
    label: 'Securities',
    items: [
      { id: 'sec_search',    label: 'Buscar Ativo',          num: '01' },
      { id: 'sec_watchlist', label: 'Watchlist',             num: '02' },
      { id: 'sec_compare',   label: 'Comparador',            num: '03' },
      { id: 'sec_portfolios',label: 'Portfolios',            num: '04' },
    ]
  },
  assetmgmt: {
    label: 'Asset Management',
    items: [
      { id: 'am_funds',      label: 'Fundos',                 num: '01' },
      { id: 'am_new',        label: '+ Novo Fundo',           num: '02' },
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
  if (viewCount === 0) {
    return h('div', { class: 'content fade-up' }, [
      pageHead('Global Intelligence · Hub',
        'Global Scenery <em>in a Nutshell</em>',
        'Quando você ingerir relatórios, este hub mostrará o consenso consolidado, heatmap cruzado de gestoras × ativos, mudanças recentes e uma narrativa sintetizada.'),
      emptyState(),
    ]);
  }

  // KPIs
  const totalConsensus = [...ALL_SLUGS].map(slug => ({ slug, c: computeConsensus(slug) })).filter(x => x.c);
  const highestConv = totalConsensus.sort((a, b) => b.c.conviction - a.c.conviction).slice(0, 3);
  const changes = getRecentChanges(30);
  const upgrades = changes.filter(c => c.direction === 'upgrade').length;
  const downgrades = changes.filter(c => c.direction === 'downgrade').length;

  return h('div', { class: 'content fade-up' }, [
    pageHead('Global Intelligence · Hub',
      'Global Scenery <em>in a Nutshell</em>',
      `Leitura consolidada sobre <span class="hi">${getCoreManagers().length} gestoras core</span> e <span class="mono-hi">${DB.reports.length}</span> relatórios ingeridos.`),

    h('div', { class: 'kpi-strip' }, [
      renderKPI('Views Totais', String(viewCount), `${DB.reports.length} relatórios`),
      renderKPI('Maior Convicção',
        highestConv[0] ? SLUG_META[highestConv[0].slug].name : '—',
        highestConv[0] ? `${Math.round(highestConv[0].c.conviction*100)}% · ${highestConv[0].c.count} gestoras` : ''),
      renderKPI('Upgrades (30d)', String(upgrades), 'mudanças positivas'),
      renderKPI('Downgrades (30d)', String(downgrades), 'mudanças negativas'),
    ]),

    // Market Monitor
    renderMarketMonitor(),

    h('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' } }, [
      h('div', {}, [
        sectionHead('01', 'Heatmap de Consenso', 'Matriz gestoras × principais mercados e ativos'),
        h('div', { class: 'card' }, [renderHeatmap()]),
      ]),
      h('div', {}, [
        sectionHead('02', 'Mudanças Recentes', 'Últimos 30 dias'),
        renderRecentChangesList(changes.slice(0, 8)),
      ]),
    ]),
  ]);
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
  // Get ALL views (core + secondary) for display
  const allViews = Object.values(getLatestViews(slug));
  const c = computeConsensus(slug); // core-only consensus

  // Sort views: most recent first
  const sortedViews = [...allViews].sort((a, b) =>
    new Date(b.publication_date || b.ingested_at || 0) - new Date(a.publication_date || a.ingested_at || 0)
  );

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
            sectionHead('01', 'Distribuição de Visões', `${sortedViews.length} gestoras cobrem (${allViews.filter(v => getCoreManagers().some(m => m.slug === v.manager_slug)).length} core + ${allViews.length - allViews.filter(v => getCoreManagers().some(m => m.slug === v.manager_slug)).length} secondary)`),
            h('div', { class: 'card' }, [renderConsensusSpread(sortedViews)]),
          ]),

          h('div', { style: { marginBottom: '32px' } }, [
            sectionHead('02', 'Visão por Gestora', 'Ordenado por data (mais recente primeiro). Badge "NOVO" = ingerido desde sua última visita.'),
            h('div', {}, sortedViews.map(v => renderViewRow(v, refTs))),
          ]),

          renderStanceHistory(slug),
        ]),
  ]);
}

/* ---------- Enhanced Country Detail (mini-dashboard) ---------- */

function renderCountryDetail(item, views, consensus, refTs) {
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

    // Section 4: Distribution & consensus
    views.length > 0 && h('div', { style: { marginBottom: '32px' } }, [
      sectionHead(latestCB ? '04' : '03', 'Distribuição de Visões Macro', `${views.length} gestoras cobrem ${item.name}`),
      h('div', { class: 'card' }, [renderConsensusSpread(views)]),
    ]),

    // Section 5: Views per manager (sorted by recency)
    views.length > 0 && h('div', { style: { marginBottom: '32px' } }, [
      sectionHead(latestCB ? '05' : '04', 'Visão por Gestora', 'Ordenado por data. Badge "NOVO" = ingerido desde sua última visita.'),
      h('div', {}, views.map(v => renderViewRow(v, refTs))),
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
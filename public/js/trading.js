// Aegir·Intel — Pre-Trading Simulation Engine

/* ============================================================
   TRADING SIMULATOR
   Professional pre-trade impact analysis
   ============================================================ */

function renderTradingSimulator() {
  const funds = getFunds();
  const sim = state._tradeSim || null;

  // List of saved simulations
  const saved = getTradingSimulations();

  if (sim && sim._active) return renderTradeSimDetail(sim);

  return h('div', { class: 'content fade-up' }, [
    pageHead('Comitê / Trading', 'Simulador de <em>Operações</em>', 'Projete o impacto de movimentações antes de executar'),

    // New simulation
    h('div', { class: 'card', style: { padding: '20px', marginBottom: '24px', borderTop: '3px solid var(--amber)' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '16px', marginBottom: '16px' } }, 'Nova Simulação'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } }, [
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Fundo'),
          h('select', { class: 'form-field-select', id: 'ts-fund' },
            [h('option', { value: '' }, '— Selecione —'), ...funds.map(f => {
              const cs = getCarteirasXML(f.cnpj);
              const lt = cs.length > 0 ? cs[cs.length-1] : null;
              return h('option', { value: f.id }, f.name + (lt ? ' · PL ' + formatBRL(lt.fund.patliq) : ''));
            })]),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Tipo de Operação'),
          h('select', { class: 'form-field-select', id: 'ts-direction' },
            [['buy', '⬆️ Compra'], ['sell', '⬇️ Venda'], ['swap', '🔄 Swap (vende + compra)']].map(([v, l]) => h('option', { value: v }, l))),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Nome da Simulação'),
          h('input', { class: 'form-field-input', id: 'ts-name', placeholder: 'Ex: Alocação CRI Construtora XYZ' }),
        ]),
      ]),
      h('button', { class: 'btn-primary', style: { marginTop: '12px' }, onClick: () => {
        const fundId = document.getElementById('ts-fund')?.value;
        const direction = document.getElementById('ts-direction')?.value || 'buy';
        const name = document.getElementById('ts-name')?.value?.trim() || 'Simulação ' + new Date().toLocaleDateString('pt-BR');
        if (!fundId) { showToast('Selecione um fundo', true); return; }
        const fund = getFund(fundId);
        const cs = getCarteirasXML(fund.cnpj);
        const latest = cs.length > 0 ? cs[cs.length-1] : null;
        if (!latest) { showToast('Fundo sem carteira carregada', true); return; }
        state._tradeSim = {
          _active: true, id: 'sim_' + Date.now(), name, fundId, direction,
          operations: [], status: 'draft', analyst: _user?.name || '',
          created_at: new Date().toISOString(),
        };
        render();
      }}, 'Criar Simulação →'),
    ]),

    // Saved simulations
    saved.length > 0 && h('div', {}, [
      h('div', { class: 'macro-section-subhead' }, 'Simulações Salvas (' + saved.length + ')'),
      h('div', { class: 'card', style: { padding: 0 } },
        saved.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).map((s, i) => {
          const fund = getFund(s.fundId);
          const dirIcon = s.direction === 'buy' ? '⬆️' : s.direction === 'sell' ? '⬇️' : '🔄';
          return h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer' },
            onClick: () => { state._tradeSim = { ...s, _active: true }; render(); }
          }, [
            h('div', { style: { fontSize: '20px' } }, dirIcon),
            h('div', { style: { flex: 1 } }, [
              h('div', { style: { fontSize: '13px', fontWeight: '500' } }, s.name),
              h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, (fund?.name || '?') + ' · ' + s.operations.length + ' operação(ões) · ' + (s.analyst || '') + ' · ' + (s.created_at || '').split('T')[0]),
            ]),
            h('span', { class: 'mono', style: { fontSize: '9px', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '4px', color: s.status === 'approved' ? 'var(--green)' : s.status === 'rejected' ? 'var(--red)' : 'var(--amber)' } },
              s.status === 'approved' ? 'Aprovada' : s.status === 'rejected' ? 'Rejeitada' : 'Rascunho'),
          ]);
        })
      ),
    ]),
  ]);
}

function renderTradeSimDetail(sim) {
  const fund = getFund(sim.fundId);
  if (!fund) { state._tradeSim = null; return renderTradingSimulator(); }
  const cs = getCarteirasXML(fund.cnpj);
  const latest = cs.length > 0 ? cs[cs.length - 1] : null;
  if (!latest) { state._tradeSim = null; return renderTradingSimulator(); }

  const pl = latest.fund.patliq || 1;
  const positions = latest.positions || {};
  const allPos = [...(positions.acoes||[]), ...(positions.titprivado||[]), ...(positions.titpublico||[]), ...(positions.cotas||[])];

  // Build projected portfolio
  const projected = {};
  for (const p of allPos) {
    const key = p.codativo || p.isin || p.cnpjfundo || '';
    projected[key] = { name: key, currentValue: p.valorfindisp || ((p.qtdisponivel||0) * (p.puposicao||0)), type: p.indexador ? 'tit.privado' : 'ação' };
  }

  // Apply operations
  let totalTradeValue = 0;
  for (const op of sim.operations) {
    const key = op.asset;
    if (!projected[key]) projected[key] = { name: key, currentValue: 0, type: op.assetType || 'novo' };
    if (op.direction === 'buy') {
      projected[key].projectedValue = (projected[key].projectedValue ?? projected[key].currentValue) + (op.value || 0);
      totalTradeValue += op.value || 0;
    } else {
      projected[key].projectedValue = (projected[key].projectedValue ?? projected[key].currentValue) - (op.value || 0);
      totalTradeValue -= op.value || 0;
    }
  }

  // Calculate projected metrics
  const projPL = pl + totalTradeValue;
  const caixaAtual = latest.stats?.totalCaixa || 0;
  const caixaProj = caixaAtual - totalTradeValue; // compra reduz caixa, venda aumenta

  // Concentration metrics
  const projValues = Object.values(projected).map(p => ({ name: p.name, value: p.projectedValue ?? p.currentValue })).filter(p => p.value > 0).sort((a, b) => b.value - a.value);
  const projTotal = projValues.reduce((a, p) => a + p.value, 0) || 1;
  const projHHI = projValues.reduce((a, p) => a + Math.pow(p.value / projTotal, 2), 0);
  const projTop5 = projValues.slice(0, 5).reduce((a, p) => a + p.value, 0) / projTotal * 100;
  const projMaxSingle = projValues.length > 0 ? (projValues[0].value / projTotal * 100) : 0;

  // Current metrics for comparison
  const currValues = allPos.map(p => ({ name: p.codativo||p.isin||'', value: p.valorfindisp||0 })).filter(p => p.value > 0).sort((a, b) => b.value - a.value);
  const currTotal = currValues.reduce((a, p) => a + p.value, 0) || 1;
  const currHHI = currValues.reduce((a, p) => a + Math.pow(p.value / currTotal, 2), 0);
  const currTop5 = currValues.slice(0, 5).reduce((a, p) => a + p.value, 0) / currTotal * 100;
  const currMaxSingle = currValues.length > 0 ? (currValues[0].value / currTotal * 100) : 0;

  // Compliance check
  const complianceAlerts = [];
  if (projMaxSingle > 20) complianceAlerts.push('Concentração em emissor único acima de 20% PL (' + projMaxSingle.toFixed(1) + '%)');
  if (caixaProj < 0) complianceAlerts.push('Caixa projetado negativo: ' + formatBRL(caixaProj));
  if (projHHI > 0.25) complianceAlerts.push('HHI projetado acima de 0.25 (concentrado): ' + (projHHI * 10000).toFixed(0));

  return h('div', { class: 'content fade-up' }, [
    h('button', { class: 'back-btn', onClick: () => { state._tradeSim = null; render(); } }, [h('span', {}, '←'), h('span', {}, 'Voltar')]),

    // Header
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' } }, [
      h('div', {}, [
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--amber)', textTransform: 'uppercase' } }, 'Simulação de ' + (sim.direction === 'buy' ? 'Compra' : sim.direction === 'sell' ? 'Venda' : 'Swap')),
        h('h1', { style: { fontFamily: 'Fraunces, serif', fontSize: '22px', margin: '4px 0' } }, sim.name),
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, fund.name + ' · PL atual: ' + formatBRL(pl) + ' · ' + (sim.analyst || '')),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', { class: 'btn-primary', onClick: () => { saveTradingSimulation(sim); showToast('Simulação salva'); }}, 'Salvar'),
        h('button', { class: 'btn-secondary', onClick: () => { exportTradeSimPDF(sim, fund, latest); }}, '↓ PDF'),
        h('button', { class: 'btn-secondary', style: { color: 'var(--red)' }, onClick: () => { if (confirm('Excluir?')) { deleteTradingSimulation(sim.id); state._tradeSim = null; render(); } }}, 'Excluir'),
      ]),
    ]),

    // Add operation
    h('div', { class: 'card', style: { padding: '16px', marginBottom: '20px' } }, [
      h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px', marginBottom: '12px' } }, '+ Adicionar Operação'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '100px 1fr 1fr 140px 80px', gap: '10px', alignItems: 'end' } }, [
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Direção'),
          h('select', { class: 'form-field-select', id: 'op-dir' },
            [['buy', 'Compra'], ['sell', 'Venda']].map(([v, l]) => h('option', { value: v }, l))),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Ativo (existente ou novo)'),
          h('input', { class: 'form-field-input', id: 'op-asset', list: 'dl-assets', placeholder: 'Código do ativo' }),
          h('datalist', { id: 'dl-assets' }, allPos.map(p => h('option', { value: p.codativo || p.isin || '' }))),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Tipo'),
          h('select', { class: 'form-field-select', id: 'op-type' },
            [['cri', 'CRI'], ['cci', 'CCI'], ['debenture', 'Debênture'], ['acao', 'Ação/FII'], ['cota', 'Cota Fundo'], ['titpublico', 'Tít. Público'], ['outro', 'Outro']].map(([v, l]) => h('option', { value: v }, l))),
        ]),
        h('div', {}, [
          h('label', { class: 'form-field-label' }, 'Valor (R$)'),
          h('input', { class: 'form-field-input', type: 'number', id: 'op-value', placeholder: '0.00' }),
        ]),
        h('button', { class: 'btn-primary', style: { height: '34px' }, onClick: () => {
          const asset = document.getElementById('op-asset')?.value?.trim();
          const value = parseFloat(document.getElementById('op-value')?.value) || 0;
          const dir = document.getElementById('op-dir')?.value || 'buy';
          const assetType = document.getElementById('op-type')?.value || 'outro';
          if (!asset || !value) { showToast('Preencha ativo e valor', true); return; }
          sim.operations.push({ id: 'op_' + Date.now(), asset, value, direction: dir, assetType });
          render();
        }}, 'Adicionar'),
      ]),
    ]),

    // Operations list
    sim.operations.length > 0 && h('div', { style: { marginBottom: '20px' } }, [
      h('div', { class: 'macro-section-subhead' }, 'Operações (' + sim.operations.length + ')'),
      h('div', { class: 'card', style: { padding: 0 } },
        sim.operations.map((op, i) => {
          const dirC = op.direction === 'buy' ? 'var(--green)' : 'var(--red)';
          return h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' } }, [
            h('span', { class: 'mono', style: { fontSize: '11px', fontWeight: '700', color: dirC, width: '60px' } }, op.direction === 'buy' ? 'COMPRA' : 'VENDA'),
            h('span', { style: { flex: 1, fontSize: '12px', fontWeight: '500' } }, op.asset),
            h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, (op.assetType || '').toUpperCase()),
            h('span', { class: 'mono', style: { fontSize: '13px', fontWeight: '600', color: dirC } }, (op.direction === 'buy' ? '+' : '-') + formatBRL(op.value)),
            h('button', { class: 'mono', style: { fontSize: '10px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' },
              onClick: () => { sim.operations.splice(i, 1); render(); }}, '✕'),
          ]);
        })
      ),
    ]),

    // Impact Analysis
    sim.operations.length > 0 && h('div', {}, [
      h('div', { class: 'macro-section-subhead' }, 'Análise de Impacto'),

      // KPIs: before vs after
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' } }, [
        h('div', { class: 'card', style: { padding: '12px 16px' } }, [
          h('div', { class: 'mono', style: { fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.1em' } }, 'PL Projetado'),
          h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', color: 'var(--amber)' } }, formatBRL(projPL)),
          h('div', { class: 'mono', style: { fontSize: '9px', color: totalTradeValue >= 0 ? 'var(--green)' : 'var(--red)' } }, (totalTradeValue >= 0 ? '+' : '') + formatBRL(totalTradeValue)),
        ]),
        h('div', { class: 'card', style: { padding: '12px 16px' } }, [
          h('div', { class: 'mono', style: { fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.1em' } }, 'Caixa Projetado'),
          h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px', color: caixaProj < 0 ? 'var(--red)' : 'var(--text)' } }, formatBRL(caixaProj)),
          h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, 'Atual: ' + formatBRL(caixaAtual)),
        ]),
        h('div', { class: 'card', style: { padding: '12px 16px' } }, [
          h('div', { class: 'mono', style: { fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.1em' } }, 'Peso da Operação'),
          h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '20px' } }, (Math.abs(totalTradeValue) / pl * 100).toFixed(2) + '%'),
          h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--text-faint)' } }, 'do PL atual'),
        ]),
      ]),

      // Before vs After comparison
      h('div', { class: 'card', style: { padding: '16px', marginBottom: '20px' } }, [
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px', marginBottom: '12px' } }, 'Comparação: Atual vs Projetado'),
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }, [
          h('thead', {}, h('tr', { style: { background: 'var(--bg-3)' } },
            ['Métrica', 'Atual', 'Projetado', 'Δ'].map((c, i) =>
              h('th', { style: { padding: '7px 12px', textAlign: i === 0 ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)' } }, c))
          )),
          h('tbody', {}, [
            compRow('PL', formatBRL(pl), formatBRL(projPL), totalTradeValue),
            compRow('Caixa', formatBRL(caixaAtual), formatBRL(caixaProj), caixaProj - caixaAtual),
            compRow('Caixa % PL', (caixaAtual / pl * 100).toFixed(2) + '%', (caixaProj / projPL * 100).toFixed(2) + '%', null),
            compRow('HHI', (currHHI * 10000).toFixed(0), (projHHI * 10000).toFixed(0), (projHHI - currHHI) * 10000),
            compRow('Top 5 %', currTop5.toFixed(1) + '%', projTop5.toFixed(1) + '%', projTop5 - currTop5),
            compRow('Maior Posição %', currMaxSingle.toFixed(1) + '%', projMaxSingle.toFixed(1) + '%', projMaxSingle - currMaxSingle),
          ]),
        ]),
      ]),

      // Top projected positions
      h('div', { class: 'card', style: { padding: '16px', marginBottom: '20px' } }, [
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px', marginBottom: '12px' } }, 'Top 10 Posições Projetadas'),
        h('div', {}, projValues.slice(0, 10).map((p, i) => {
          const pct = (p.value / projTotal * 100);
          const curr = projected[p.name];
          const changed = curr && (curr.projectedValue != null) && (curr.projectedValue !== curr.currentValue);
          return h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' } }, [
            h('span', { class: 'mono', style: { fontSize: '10px', width: '20px', color: 'var(--text-faint)' } }, '#' + (i + 1)),
            h('span', { style: { flex: 1, fontSize: '12px', fontWeight: changed ? '600' : '400', color: changed ? 'var(--amber)' : 'var(--text)' } }, p.name + (changed ? ' ★' : '')),
            h('span', { class: 'mono', style: { fontSize: '11px', fontWeight: '500' } }, formatBRL(p.value)),
            h('div', { style: { width: '60px' } }, [
              h('div', { style: { height: '4px', background: 'var(--bg-3)', borderRadius: '2px' } }, [
                h('div', { style: { width: Math.min(100, pct * 2) + '%', height: '100%', background: pct > 15 ? 'var(--amber)' : 'var(--green)', borderRadius: '2px' } }),
              ]),
            ]),
            h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)', width: '50px', textAlign: 'right' } }, pct.toFixed(1) + '%'),
          ]);
        })),
      ]),

      // Compliance alerts
      complianceAlerts.length > 0 && h('div', { class: 'card', style: { padding: '16px', borderLeft: '3px solid var(--red)', marginBottom: '20px' } }, [
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px', color: 'var(--red)', marginBottom: '8px' } }, '⚠ Alertas de Compliance'),
        ...complianceAlerts.map(a => h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--red)', padding: '4px 0' } }, '• ' + a)),
      ]),

      complianceAlerts.length === 0 && h('div', { class: 'card', style: { padding: '16px', borderLeft: '3px solid var(--green)', marginBottom: '20px' } }, [
        h('div', { style: { fontFamily: 'Fraunces, serif', fontSize: '14px', color: 'var(--green)' } }, '✓ Sem alertas de compliance'),
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--text-faint)' } }, 'Operação dentro dos limites regulatórios verificados'),
      ]),
    ]),
  ]);
}

function compRow(label, curr, proj, delta) {
  const dc = delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-faint)';
  return h('tr', { style: { borderTop: '1px solid var(--border)' } }, [
    h('td', { style: { padding: '6px 12px', fontWeight: '500' } }, label),
    h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: 'var(--text-faint)' } }, curr),
    h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', fontWeight: '600' } }, proj),
    h('td', { class: 'mono', style: { padding: '6px 12px', textAlign: 'right', color: dc, fontSize: '10px' } }, delta != null ? ((delta >= 0 ? '+' : '') + (typeof delta === 'number' ? (Math.abs(delta) > 100 ? formatBRL(delta) : delta.toFixed(1)) : delta)) : '—'),
  ]);
}

// CRUD
function getTradingSimulations() { if (!Array.isArray(DB.tradingSims)) DB.tradingSims = []; return DB.tradingSims; }
function saveTradingSimulation(sim) {
  if (!Array.isArray(DB.tradingSims)) DB.tradingSims = [];
  sim.updated_at = new Date().toISOString();
  const copy = { ...sim }; delete copy._active;
  const idx = DB.tradingSims.findIndex(s => s.id === sim.id);
  if (idx >= 0) DB.tradingSims[idx] = copy; else DB.tradingSims.push(copy);
  saveDB(DB); sbUpsert('tradesim:' + sim.id, copy);
}
function deleteTradingSimulation(id) {
  DB.tradingSims = getTradingSimulations().filter(s => s.id !== id);
  saveDB(DB); sbDelete('tradesim:' + id);
}

// PDF
async function exportTradeSimPDF(sim, fund, latest) {
  const pl = latest.fund.patliq || 1;
  let totalVal = sim.operations.reduce((a, op) => a + (op.direction === 'buy' ? op.value : -op.value), 0);
  let b = pKVGrid([['Fundo', fund.name], ['PL Atual', formatBRL(pl)], ['Operação', sim.direction === 'buy' ? 'Compra' : sim.direction === 'sell' ? 'Venda' : 'Swap'], ['Analista', sim.analyst || '—']]);
  b += '<div class="pdf-kpis">' + pKPI('PL Projetado', formatBRL(pl + totalVal), '', 'amber') + pKPI('Impacto', (totalVal >= 0 ? '+' : '') + formatBRL(totalVal)) + pKPI('% PL', (Math.abs(totalVal) / pl * 100).toFixed(2) + '%') + '</div>';
  if (sim.operations.length > 0) {
    b += pSec('Operações');
    b += pTable(['Direção', 'Ativo', 'Tipo', 'Valor'], sim.operations.map(op => [op.direction === 'buy' ? 'COMPRA' : 'VENDA', op.asset, (op.assetType || '').toUpperCase(), formatBRL(op.value)]));
  }
  openPrintReport('Simulação: ' + sim.name, fund.name + ' · ' + (sim.created_at || '').split('T')[0], b);
}

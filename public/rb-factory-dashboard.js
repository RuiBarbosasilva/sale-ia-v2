(() => {
  'use strict';

  window.__rbFactoryMainReady = true;

  const API = '/api';
  const $ = (id) => document.getElementById(id);
  const key = () => sessionStorage.getItem('saleIaAdminKey') || '';

  function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    window.clearTimeout(window.__rbFactoryToastTimer);
    window.__rbFactoryToastTimer = window.setTimeout(() => { el.style.display = 'none'; }, 2600);
  }

  let adminKeyPromptPromise = null;

  async function requestAdminKey(force) {
    const current = key();
    if (!force && current) return current;
    if (adminKeyPromptPromise) return adminKeyPromptPromise;

    adminKeyPromptPromise = Promise.resolve().then(() => {
      const latest = key();
      const entered = window.prompt('Chave administrativa do SALE-IA:', latest);
      if (entered !== null && entered.trim()) {
        const normalized = entered.trim();
        sessionStorage.setItem('saleIaAdminKey', normalized);
        return normalized;
      }
      if (force) sessionStorage.removeItem('saleIaAdminKey');
      return key();
    }).finally(() => {
      adminKeyPromptPromise = null;
    });

    return adminKeyPromptPromise;
  }

  async function apiFetch(path, options = {}) {
    const headers = Object.assign({}, options.headers || {});
    const k = key();
    if (k) headers['x-sale-ia-admin-key'] = k;

    let response = await fetch(path, Object.assign({}, options, { headers }));

    if (response.status === 401) {
      const entered = await requestAdminKey(true);
      if (!entered) throw new Error('ADMIN_UNAUTHORIZED');
      headers['x-sale-ia-admin-key'] = entered;
      response = await fetch(path, Object.assign({}, options, { headers }));
    }
    return response;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function setAdminKey() {
    const value = window.prompt('Chave administrativa do SALE-IA:', key());
    if (value === null) return;
    if (value.trim()) sessionStorage.setItem('saleIaAdminKey', value.trim());
    else sessionStorage.removeItem('saleIaAdminKey');
    refreshAll();
  }

  function startProspecting() {
    const modal = $('prospectModal');
    if (!modal) return;
    modal.classList.add('open');
    const result = $('prospectResult');
    if (result) {
      result.className = 'prospect-result';
      result.textContent = '';
    }
    window.setTimeout(() => { if ($('pfNiche')) $('pfNiche').focus(); }, 0);
  }

  function closeProspecting() {
    const modal = $('prospectModal');
    if (modal) modal.classList.remove('open');
  }

  async function runProspecting(event) {
    if (event) event.preventDefault();
    const button = $('prospectSubmit');
    const output = $('prospectResult');
    if (!button || !output) return;

    button.disabled = true;
    button.textContent = 'Pesquisando…';
    output.className = 'prospect-result show';
    output.textContent = 'Consultando a base de prospecção…';

    try {
      const payload = {
        city: $('pfCity').value.trim(),
        state: $('pfState').value.trim().toUpperCase(),
        niche: $('pfNiche').value.trim(),
        subniche: $('pfSubniche').value.trim() || undefined,
        maxResults: Number($('pfMax').value)
      };

      const response = await apiFetch(API + '/websites/prospecting/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || ('HTTP ' + response.status));
      }

      output.className = 'prospect-result show ok';
      output.innerHTML =
        '<b>Pesquisa concluída.</b><br>' +
        'Encontrados: ' + escapeHtml(data.totalFound || 0) +
        ' · Qualificados: ' + escapeHtml(data.totalQualified || 0) +
        ' · Criados: ' + escapeHtml(data.totalCreated || 0) +
        ' · Auditados: ' + escapeHtml(data.totalAudited || 0);

      toast('Prospecção concluída');
      await refreshAll();
    } catch (error) {
      output.className = 'prospect-result show err';
      output.textContent = 'Não foi possível concluir: ' + error.message;
      toast('Falha na prospecção');
    } finally {
      button.disabled = false;
      button.textContent = 'Pesquisar agora';
    }
  }

  function openProspects() {
    const modal = $('prospectsBrowser');
    if (!modal) return;
    modal.classList.add('open');
    loadProspectBrowser();
  }

  function closeProspects() {
    const modal = $('prospectsBrowser');
    if (modal) modal.classList.remove('open');
  }

  async function loadProspectBrowser() {
    const box = $('prospectBrowserTable');
    if (!box) return;
    box.innerHTML = '<div class="empty">Carregando…</div>';

    try {
      const response = await apiFetch(API + '/websites/prospecting/prospects?limit=50');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || ('HTTP ' + response.status));

      const rows = Array.isArray(data.prospects) ? data.prospects : [];
      if (!rows.length) {
        box.innerHTML = '<div class="empty">Nenhum prospect encontrado.</div>';
        return;
      }

      box.innerHTML =
        '<table><thead><tr><th>Empresa</th><th>Cidade</th><th>Segmento</th><th>Score</th><th>Oportunidade</th><th>Ação</th></tr></thead><tbody>' +
        rows.map((p) =>
          '<tr>' +
          '<td><b>' + escapeHtml(p.companyName || '—') + '</b><br><span style="color:#9299a3">' + escapeHtml(p.phone || p.whatsapp || '') + '</span></td>' +
          '<td>' + escapeHtml(p.city || '—') + '</td>' +
          '<td>' + escapeHtml(p.segment || p.category || '—') + '</td>' +
          '<td>' + escapeHtml(p.websiteOpportunityScore == null ? (p.websiteScore == null ? (p.score == null ? '—' : p.score) : p.websiteScore) : p.websiteOpportunityScore) + '</td>' +
          '<td><span class="badge">' + escapeHtml(p.websiteOpportunityStatus || p.status || '—') + '</span></td>' +
          '<td><button class="btn" data-rb-action="process-prospect" data-id="' + escapeHtml(p.id) + '" style="padding:6px 8px;font-size:9px">⚙ Processar</button></td>' +
          '</tr>'
        ).join('') +
        '</tbody></table>';
    } catch (error) {
      box.innerHTML = '<div class="empty">Falha ao carregar prospects: ' + escapeHtml(error.message) + '</div>';
    }
  }

  function openDemos() {
    const table = $('demosTable');
    if (table) table.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function overview() {
    try {
      const response = await apiFetch(API + '/site-factory-dashboard/overview');
      const json = await response.json();
      const data = json.data || {};
      if ($('kProspects')) $('kProspects').textContent = data.totalProspects == null ? 0 : data.totalProspects;
      if ($('kDemos')) $('kDemos').textContent = data.totalDemos == null ? 0 : data.totalDemos;
      if ($('kProposals')) $('kProposals').textContent = data.totalProposals == null ? 0 : data.totalProposals;
      if ($('kSales')) $('kSales').textContent = data.totalSales == null ? 0 : data.totalSales;
      if ($('kModels')) $('kModels').textContent = data.totalModels == null ? 0 : data.totalModels;
      if ($('sProspects')) $('sProspects').textContent = (data.totalProspects == null ? 0 : data.totalProspects) + ' cadastrados';
      if ($('sDemos')) $('sDemos').textContent = (data.totalDemos == null ? 0 : data.totalDemos) + ' prontos';
    } catch (error) {
      if ($('sProspects')) $('sProspects').textContent = 'API indisponível';
      if ($('sDemos')) $('sDemos').textContent = 'verifique a chave';
    }
  }

  async function prospects() {
    try {
      const [prospectsResponse, pipelineResponse] = await Promise.all([
        apiFetch(API + '/websites/prospecting/prospects?limit=50'),
        apiFetch(API + '/rb-factory-sales/pipeline')
      ]);
      const pd = await prospectsResponse.json();
      const pl = await pipelineResponse.json();
      const rows = Array.isArray(pd.prospects) ? pd.prospects : [];
      const pipelines = Array.isArray(pl.pipelines) ? pl.pipelines : [];
      const stages = ['DISCOVERED','AUDITED','DEMO_READY','PROPOSAL_READY','CONTACTED','NEGOTIATION','WON','LOST'];
      const counts = {};
      stages.forEach((stage) => { counts[stage] = 0; });
      pipelines.forEach((item) => {
        const stage = String(item.stage || '').toUpperCase();
        if (Object.prototype.hasOwnProperty.call(counts, stage)) counts[stage] += 1;
      });

      if ($('prospectState')) $('prospectState').textContent = rows.length + ' encontrados';
      if ($('pipeline')) {
        $('pipeline').innerHTML = stages.map((stage) => {
          const count = counts[stage];
          const pct = pipelines.length ? Math.max(count ? 4 : 0, Math.round(count / pipelines.length * 100)) : 0;
          return '<div class="stage"><span class="stage-name">' + stage.replaceAll('_', ' ') + '</span><div class="bar"><div class="fill" style="width:' + pct + '%"></div></div><span class="count">' + count + '</span></div>';
        }).join('');
      }

      const recent = rows.slice(0, 8);
      if ($('prospectsTable')) {
        $('prospectsTable').innerHTML = recent.length
          ? '<table><thead><tr><th>Empresa</th><th>Cidade</th><th>Segmento</th><th>Score</th><th>Status</th><th>Ações</th></tr></thead><tbody>' +
            recent.map((p) =>
              '<tr><td><b>' + escapeHtml(p.companyName || '—') + '</b></td>' +
              '<td>' + escapeHtml(p.city || '—') + '</td>' +
              '<td>' + escapeHtml(p.segment || p.category || '—') + '</td>' +
              '<td>' + escapeHtml(p.websiteScore == null ? (p.score == null ? '—' : p.score) : p.websiteScore) + '</td>' +
              '<td><span class="badge">' + escapeHtml(p.websiteOpportunityStatus || p.status || '—') + '</span></td>' +
              '<td><button class="btn" data-rb-action="process-prospect" data-id="' + escapeHtml(p.id) + '" style="padding:6px 8px;font-size:9px">⚙ Processar</button></td></tr>'
            ).join('') +
            '</tbody></table>'
          : '<div class="empty">Nenhum prospect encontrado.</div>';
      }
    } catch (error) {
      if ($('prospectState')) $('prospectState').textContent = 'indisponível';
      if ($('pipeline')) $('pipeline').innerHTML = '<div class="empty">Não foi possível carregar o funil.</div>';
      if ($('prospectsTable')) $('prospectsTable').innerHTML = '<div class="empty">Não foi possível carregar os prospects.</div>';
    }
  }

  async function processProspect(id) {
    try {
      for (const step of ['enrich', 'audit', 'score']) {
        const response = await apiFetch(API + '/websites/prospecting/prospects/' + encodeURIComponent(id) + '/' + step, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(step + ' HTTP ' + response.status);
      }

      const response = await apiFetch(API + '/websites/prospecting/prospects/' + encodeURIComponent(id) + '/generate-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAI: true })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || ('demo HTTP ' + response.status));

      toast('Demo enviada para geração');
      await refreshAll();
    } catch (error) {
      toast('Falha: ' + error.message);
    }
  }

  async function sellerStatus() {
    try {
      const response = await apiFetch(API + '/rb-factory-sales-autonomy/status');
      const data = await response.json();
      const state = data.result || {};
      const running = state.status === 'RUNNING';

      if ($('sellerStatus')) $('sellerStatus').textContent = running ? 'TRABALHANDO' : 'PARADO';
      if ($('sellerToggle')) $('sellerToggle').textContent = running ? '■ DESLIGAR VENDEDOR IA' : '▶ VENDEDOR IA';
      if ($('sellerCommandTitle')) $('sellerCommandTitle').textContent = running ? 'Vendedor IA está LIGADO' : 'Vendedor IA está DESLIGADO';
      if ($('sellerCommandText')) $('sellerCommandText').textContent = running ? 'O vendedor está trabalhando a fila comercial.' : 'Clique em LIGAR para iniciar o trabalho comercial da Factory.';
      if ($('sellerCommandStatus')) $('sellerCommandStatus').textContent = running ? '● LIGADO' : '● DESLIGADO';
      if ($('sellerCommandToggle')) {
        $('sellerCommandToggle').textContent = running ? '■ DESLIGAR VENDEDOR IA' : '▶ LIGAR VENDEDOR IA';
        $('sellerCommandToggle').className = running ? 'btn seller-off' : 'btn seller-on';
      }
      if ($('sellerStart')) $('sellerStart').style.display = running ? 'none' : 'inline-block';
      if ($('sellerStop')) $('sellerStop').style.display = running ? 'inline-block' : 'none';
    } catch (error) {
      if ($('sellerStatus')) $('sellerStatus').textContent = 'INDISPONÍVEL';
    }
  }

  async function toggleSeller() {
    try {
      const statusResponse = await apiFetch(API + '/rb-factory-sales-autonomy/status');
      const statusData = await statusResponse.json();
      if (statusData.result && statusData.result.status === 'RUNNING') {
        return stopSeller();
      }

      const response = await apiFetch(API + '/rb-factory-sales-autonomy/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Poços de Caldas',
          state: 'MG',
          niches: ['clínicas', 'hamburguerias', 'restaurantes', 'advogados', 'odontologia'],
          maxResults: 10,
          batchSize: 10
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || ('HTTP ' + response.status));
      toast('Vendedor IA iniciado');
      await sellerStatus();
    } catch (error) {
      toast('Não foi possível iniciar: ' + error.message);
    }
  }

  async function stopSeller() {
    try {
      const response = await apiFetch(API + '/rb-factory-sales-autonomy/stop', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || ('HTTP ' + response.status));
      toast('Vendedor IA parado');
      await sellerStatus();
    } catch (error) {
      toast('Não foi possível parar: ' + error.message);
    }
  }

  async function refreshAll() {
    if ($('updated')) $('updated').textContent = 'Atualizando…';
    await Promise.allSettled([overview(), prospects(), sellerStatus()]);
    if ($('updated')) $('updated').textContent = 'Atualizado em ' + new Date().toLocaleString('pt-BR');
    toast('Dashboard atualizado');
  }

  function bind(id, handler) {
    const element = $(id);
    if (element) {
      element.addEventListener('click', handler);
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest ? event.target.closest('[data-rb-action]') : null;
    if (!target) return;
    const action = target.getAttribute('data-rb-action');
    const id = target.getAttribute('data-id');
    if (action === 'process-prospect' && id) processProspect(id);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProspecting();
      closeProspects();
    }
  });

  bind('btnAdminKey', setAdminKey);
  bind('btnProspect', startProspecting);
  bind('btnRefresh', refreshAll);
  bind('sellerToggle', toggleSeller);
  bind('sellerCommandToggle', toggleSeller);
  bind('sellerStart', toggleSeller);
  bind('sellerStop', stopSeller);
  bind('navProspects', (event) => { event.preventDefault(); openProspects(); });
  bind('navDemos', (event) => { event.preventDefault(); openDemos(); });

  window.setAdminKey = setAdminKey;
  window.startProspecting = startProspecting;
  window.closeProspecting = closeProspecting;
  window.runProspecting = runProspecting;
  window.openProspects = openProspects;
  window.closeProspects = closeProspects;
  window.loadProspectBrowser = loadProspectBrowser;
  window.processProspect = processProspect;
  window.openDemos = openDemos;
  window.toggleSeller = toggleSeller;
  window.stopSeller = stopSeller;
  window.refreshAll = refreshAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAll, { once: true });
  } else {
    refreshAll();
  }
})();
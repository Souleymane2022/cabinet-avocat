/**
 * CFORI - Consulting | Module Tableau de Bord
 */

const DashboardModule = {
    async render(container) {
        const user = Auth.getUser();
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">🏠 Tableau de bord</div>
                    <div class="page-subtitle">Bienvenue, ${user.prenom} ${user.nom} — ${new Date().toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</div>
                </div>
                <button class="btn btn-outline btn-sm" id="btnRefresh">🔄 Actualiser</button>
            </div>

            <div id="dashboardContent">
                <div class="loading-overlay"><div class="loader"></div></div>
            </div>`;

        document.getElementById('btnRefresh').onclick = () => this.loadData(document.getElementById('dashboardContent'));
        await this.loadData(document.getElementById('dashboardContent'));
    },

    async loadData(container) {
        container.innerHTML = '<div class="loading-overlay"><div class="loader"></div></div>';
        try {
            const res = await window.cfori.dashboard.getStats();
            if (!res.success) throw new Error(res.message);
            const stats = res.data;
            this.renderContent(container, stats);
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Erreur de chargement</div><div class="empty-desc">${err.message}</div></div>`;
        }
    },

    renderContent(container, stats) {
        const maxVal = Math.max(...stats.stats_mois.map(m => Math.max(m.recettes, m.depenses)), 1);

        container.innerHTML = `
            <!-- KPI Cards -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon teal">🎓</div>
                    <div>
                        <div class="kpi-value">${stats.formations_actives}</div>
                        <div class="kpi-label">Formations actives</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon blue">👥</div>
                    <div>
                        <div class="kpi-value">${stats.participants_mois}</div>
                        <div class="kpi-label">Participants ce mois</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon green">🤝</div>
                    <div>
                        <div class="kpi-value">${stats.clients_actifs}</div>
                        <div class="kpi-label">Clients actifs</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon ${stats.solde_mois >= 0 ? 'green' : 'orange'}">💰</div>
                    <div>
                        <div class="kpi-value" style="font-size:18px;color:${stats.solde_mois >= 0 ? 'var(--success)' : 'var(--error)'}">
                            ${Utils.formatMontant(stats.solde_mois)}
                        </div>
                        <div class="kpi-label">Solde global</div>
                    </div>
                </div>
            </div>

            <!-- Ligne du bas: événements + graphique -->
            <div class="grid-2" style="gap:20px;align-items:start">
                <!-- Prochains événements -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">📅 Prochains événements</span>
                        <button class="btn btn-sm btn-outline" onclick="Router.navigate('planning')">Voir tout</button>
                    </div>
                    <div class="card-body" style="padding:0">
                        ${stats.prochains_evenements.length === 0
                            ? '<div class="empty-state" style="padding:24px"><div class="empty-icon">📅</div><div class="empty-desc">Aucun événement à venir</div></div>'
                            : stats.prochains_evenements.map(e => `
                                <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border-light)">
                                    <div style="width:4px;height:48px;border-radius:2px;background:${e.couleur || 'var(--primary)'}"></div>
                                    <div style="flex:1;min-width:0">
                                        <div style="font-weight:600;font-size:13px">${Utils.truncate(e.titre, 40)}</div>
                                        <div style="font-size:11px;color:var(--text-light)">${Utils.formatDateTime(e.date_debut)}</div>
                                    </div>
                                    ${Utils.statutBadge(e.statut)}
                                </div>`).join('')}
                    </div>
                </div>

                <!-- Graphique recettes/dépenses -->
                <div class="chart-container">
                    <div class="chart-title">📊 Recettes vs Dépenses (6 derniers mois)</div>
                    ${stats.stats_mois.length === 0
                        ? '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-desc">Aucune donnée financière</div></div>'
                        : `<div class="bar-chart">
                            ${stats.stats_mois.map(m => `
                                <div class="bar-group">
                                    <div class="bar-values">
                                        <div class="bar recette" style="height:${Math.round((m.recettes/maxVal)*100)}%" title="Recettes: ${Utils.formatMontant(m.recettes)}"></div>
                                        <div class="bar depense" style="height:${Math.round((m.depenses/maxVal)*100)}%" title="Dépenses: ${Utils.formatMontant(m.depenses)}"></div>
                                    </div>
                                    <div class="bar-label">${m.mois ? m.mois.substring(5) : ''}</div>
                                </div>`).join('')}
                        </div>
                        <div style="display:flex;gap:16px;margin-top:12px;font-size:12px">
                            <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:2px;background:var(--primary);display:inline-block"></span>Recettes</span>
                            <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;border-radius:2px;background:var(--error);display:inline-block"></span>Dépenses</span>
                        </div>`}
                </div>
            </div>`;
    }
};

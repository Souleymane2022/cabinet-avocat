/**
 * CFORI - Consulting | Module Comptabilité
 */

const ComptabiliteModule = {
    data: [],

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">💰 Comptabilité</div>
                    <div class="page-subtitle">Gestion des recettes et dépenses</div>
                </div>
                ${Auth.hasPermission('create_transaction') ? '<button class="btn btn-primary" id="btnNewTransaction">+ Nouvelle transaction</button>' : ''}
            </div>

            <!-- Solde résumé -->
            <div class="kpi-grid" id="soldeCards">
                <div class="loading-overlay"><div class="loader"></div></div>
            </div>

            <div class="filters-bar">
                <div class="search-box">
                    <span>📅</span>
                    <input type="date" id="filterDateDebut">
                </div>
                <div class="search-box">
                    <span>→</span>
                    <input type="date" id="filterDateFin">
                </div>
                <select class="filter-select" id="filterTypeTransaction">
                    <option value="">Toutes</option>
                    <option value="recette">Recettes</option>
                    <option value="depense">Dépenses</option>
                </select>
                <select class="filter-select" id="filterStatutTransaction">
                    <option value="">Tous statuts</option>
                    <option value="validé">Validé</option>
                    <option value="en_attente">En attente</option>
                    <option value="annulé">Annulé</option>
                </select>
                <select class="filter-select" id="filterCategorie">
                    <option value="">Toutes catégories</option>
                    ${['formation','conseil','salaire','loyer','materiel','autre'].map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>

            <div class="table-card" id="transactionsTable">
                <div class="loading-overlay"><div class="loader"></div></div>
            </div>`;

        if (Auth.hasPermission('create_transaction')) {
            document.getElementById('btnNewTransaction').onclick = () => this.showForm();
        }

        ['filterDateDebut','filterDateFin','filterTypeTransaction','filterStatutTransaction','filterCategorie'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.loadData());
        });

        await Promise.all([this.loadSolde(), this.loadData()]);
    },

    async loadSolde() {
        const res = await window.cfori.transactions.getSolde();
        if (!res.success) return;
        const s = res.data;
        document.getElementById('soldeCards').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon green">📈</div>
                <div><div class="kpi-value" style="font-size:18px;color:var(--success)">${Utils.formatMontant(s.recettes)}</div><div class="kpi-label">Total recettes validées</div></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon orange">📉</div>
                <div><div class="kpi-value" style="font-size:18px;color:var(--error)">${Utils.formatMontant(s.depenses)}</div><div class="kpi-label">Total dépenses validées</div></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon ${s.solde >= 0 ? 'teal' : 'orange'}">💼</div>
                <div><div class="kpi-value" style="font-size:18px;color:${s.solde >= 0 ? 'var(--success)' : 'var(--error)'}">${Utils.formatMontant(s.solde)}</div><div class="kpi-label">Solde global</div></div>
            </div>`;
    },

    async loadData() {
        const filters = {
            date_debut: document.getElementById('filterDateDebut')?.value || '',
            date_fin: document.getElementById('filterDateFin')?.value || '',
            type_transaction: document.getElementById('filterTypeTransaction')?.value || '',
            statut: document.getElementById('filterStatutTransaction')?.value || '',
            categorie: document.getElementById('filterCategorie')?.value || ''
        };
        Object.keys(filters).forEach(k => { if (!filters[k]) delete filters[k]; });

        const res = await window.cfori.transactions.getAll(filters);
        if (!res.success) { Toast.error(res.message); return; }
        this.data = res.data;
        this.renderTable(document.getElementById('transactionsTable'));
    },

    renderTable(container) {
        const totalRecettes = this.data.filter(t => t.type_transaction === 'recette' && t.statut === 'validé').reduce((s, t) => s + t.montant, 0);
        const totalDepenses = this.data.filter(t => t.type_transaction === 'depense' && t.statut === 'validé').reduce((s, t) => s + t.montant, 0);

        if (this.data.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">Aucune transaction</div><div class="empty-desc">Enregistrez votre première transaction</div></div>`;
            return;
        }

        container.innerHTML = `
            <div class="table-header">
                <span class="table-title">${this.data.length} transaction(s)</span>
                <div style="display:flex;gap:16px;font-size:12px">
                    <span style="color:var(--success)">Recettes validées: ${Utils.formatMontant(totalRecettes)}</span>
                    <span style="color:var(--error)">Dépenses validées: ${Utils.formatMontant(totalDepenses)}</span>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Catégorie</th>
                        <th>Description</th>
                        <th>Montant</th>
                        <th>Mode paiement</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.data.map(t => `
                        <tr>
                            <td style="font-size:12px">${Utils.formatDate(t.date_transaction)}</td>
                            <td>
                                <span class="badge ${t.type_transaction === 'recette' ? 'badge-success' : 'badge-error'}">
                                    ${t.type_transaction === 'recette' ? '📈' : '📉'} ${t.type_transaction}
                                </span>
                            </td>
                            <td><span class="badge badge-gray">${t.categorie}</span></td>
                            <td style="font-size:12px">${Utils.truncate(t.description || '-', 35)}</td>
                            <td style="font-weight:700;color:${t.type_transaction === 'recette' ? 'var(--success)' : 'var(--error)'}">
                                ${Utils.formatMontant(t.montant, t.devise)}
                            </td>
                            <td style="font-size:12px">${t.mode_paiement || '-'}</td>
                            <td>${Utils.statutBadge(t.statut)}</td>
                            <td>
                                <div class="action-buttons">
                                    ${t.statut === 'en_attente' && Auth.isDG() ? `
                                        <button class="btn btn-sm btn-success" onclick="ComptabiliteModule.validerTransaction(${t.id}, ${t.montant})" title="Valider">✅</button>
                                        <button class="btn btn-sm btn-ghost" onclick="ComptabiliteModule.annulerTransaction(${t.id}, ${t.montant})" title="Annuler" style="color:var(--error)">❌</button>
                                    ` : ''}
                                    ${t.statut === 'en_attente' && !Auth.isDG() && t.montant <= 100000 ? `
                                        <button class="btn btn-sm btn-success" onclick="ComptabiliteModule.validerTransaction(${t.id}, ${t.montant})">✅</button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    },

    async validerTransaction(id, montant) {
        if (montant > 100000 && !Auth.isDG()) {
            Toast.error('Validation des transactions > 100 000 XAF réservée au DG');
            return;
        }
        const res = await window.cfori.transactions.updateStatut(Auth.getUser(), id, 'validé', montant);
        if (res.success) {
            Toast.success('Transaction validée');
            await Promise.all([this.loadSolde(), this.loadData()]);
        } else {
            Toast.error(res.message);
        }
    },

    async annulerTransaction(id, montant) {
        Modal.confirm('Annuler cette transaction ?', async () => {
            const res = await window.cfori.transactions.updateStatut(Auth.getUser(), id, 'annulé', montant);
            if (res.success) {
                Toast.success('Transaction annulée');
                await Promise.all([this.loadSolde(), this.loadData()]);
            } else {
                Toast.error(res.message);
            }
        });
    },

    async showForm() {
        const clientsRes = await window.cfori.clients.getAll({});
        const clients = clientsRes.success ? clientsRes.data : [];
        const formationsRes = await window.cfori.formations.getAll({});
        const formations = formationsRes.success ? formationsRes.data : [];

        const overlay = Modal.create('+ Nouvelle transaction', `
            <div class="form-grid">
                <div class="form-group">
                    <label>Type *</label>
                    <select id="t_type">
                        <option value="recette">📈 Recette</option>
                        <option value="depense">📉 Dépense</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Catégorie</label>
                    <select id="t_categorie">
                        ${['formation','conseil','salaire','loyer','materiel','autre'].map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Montant (XAF) *</label>
                    <input type="number" id="t_montant" min="0" step="100" placeholder="0">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="t_date" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Mode de paiement</label>
                    <select id="t_mode">
                        <option value="">-- Sélectionner --</option>
                        ${['Espèces','Virement','Chèque','Mobile Money','Autre'].map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Référence externe</label>
                    <input type="text" id="t_ref" placeholder="N° de bordereau, reçu...">
                </div>
                <div class="form-group">
                    <label>Client (optionnel)</label>
                    <select id="t_client">
                        <option value="">-- Aucun --</option>
                        ${clients.map(c => `<option value="${c.id}">${c.prenom ? c.prenom + ' ' : ''}${c.nom}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Formation (optionnel)</label>
                    <select id="t_formation">
                        <option value="">-- Aucune --</option>
                        ${formations.map(f => `<option value="${f.id}">${Utils.truncate(f.titre, 40)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group form-full">
                    <label>Description</label>
                    <textarea id="t_description" rows="2" placeholder="Description de la transaction"></textarea>
                </div>
            </div>
            <div style="background:rgba(245,158,11,0.08);border:1px solid var(--warning);border-radius:8px;padding:10px;margin-top:8px;font-size:12px;color:#92400e">
                ⚠️ Les transactions supérieures à 100 000 XAF nécessitent une validation par le DG.
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnSaveTransaction">💾 Enregistrer</button>
            </div>`);

        overlay.querySelector('#btnSaveTransaction').onclick = async () => {
            const montant = parseFloat(document.getElementById('t_montant').value);
            if (!montant || montant <= 0) { Toast.warning('Le montant doit être supérieur à 0'); return; }

            const data = {
                type_transaction: document.getElementById('t_type').value,
                categorie: document.getElementById('t_categorie').value,
                montant,
                date_transaction: document.getElementById('t_date').value,
                mode_paiement: document.getElementById('t_mode').value,
                reference_externe: document.getElementById('t_ref').value,
                client_id: document.getElementById('t_client').value || null,
                formation_id: document.getElementById('t_formation').value || null,
                description: document.getElementById('t_description').value,
                statut: 'en_attente'
            };

            const res = await window.cfori.transactions.create(Auth.getUser(), data);
            if (res.success) {
                Toast.success('Transaction enregistrée' + (montant > 100000 ? ' — En attente de validation DG' : ''));
                overlay.remove();
                await Promise.all([this.loadSolde(), this.loadData()]);
                SyncClient.emit('data:changed', { type: 'transactions', action: 'create' });
            } else {
                Toast.error(res.message);
            }
        };
    }
};

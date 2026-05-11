/**
 * CFORI - Consulting | Module Formations
 */

const FormationsModule = {
    data: [],

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">🎓 Formations</div>
                    <div class="page-subtitle">Gestion des formations et programmes</div>
                </div>
                ${Auth.hasPermission('create_formation') ? '<button class="btn btn-primary" id="btnNewFormation">+ Nouvelle formation</button>' : ''}
            </div>

            <div class="filters-bar">
                <div class="search-box">
                    <span>🔍</span>
                    <input type="text" id="searchFormation" placeholder="Rechercher...">
                </div>
                <select class="filter-select" id="filterStatut">
                    <option value="">Tous les statuts</option>
                    <option value="planifié">Planifié</option>
                    <option value="en_cours">En cours</option>
                    <option value="terminé">Terminé</option>
                    <option value="annulé">Annulé</option>
                </select>
                <select class="filter-select" id="filterCategorie">
                    <option value="">Toutes catégories</option>
                    <option value="Management">Management</option>
                    <option value="Informatique">Informatique</option>
                    <option value="Finance">Finance</option>
                    <option value="RH">Ressources Humaines</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Juridique">Juridique</option>
                    <option value="Autre">Autre</option>
                </select>
            </div>

            <div class="table-card" id="formationsTable">
                <div class="loading-overlay"><div class="loader"></div></div>
            </div>`;

        if (Auth.hasPermission('create_formation')) {
            document.getElementById('btnNewFormation').onclick = () => this.showForm();
        }

        document.getElementById('searchFormation').addEventListener('input', Utils.debounce(() => this.loadData(), 400));
        document.getElementById('filterStatut').addEventListener('change', () => this.loadData());
        document.getElementById('filterCategorie').addEventListener('change', () => this.loadData());

        await this.loadData();
    },

    async loadData() {
        const search = document.getElementById('searchFormation')?.value || '';
        const statut = document.getElementById('filterStatut')?.value || '';
        const categorie = document.getElementById('filterCategorie')?.value || '';

        const res = await window.cfori.formations.getAll({ search, statut, categorie });
        if (!res.success) { Toast.error('Erreur: ' + res.message); return; }

        this.data = res.data;
        this.renderTable(document.getElementById('formationsTable'));
    },

    renderTable(container) {
        if (this.data.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎓</div><div class="empty-title">Aucune formation</div><div class="empty-desc">Créez votre première formation</div></div>`;
            return;
        }

        container.innerHTML = `
            <div class="table-header">
                <span class="table-title">${this.data.length} formation(s)</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Titre</th>
                        <th>Catégorie</th>
                        <th>Formateur</th>
                        <th>Dates</th>
                        <th>Durée</th>
                        <th>Prix</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.data.map(f => `
                        <tr>
                            <td><strong>${Utils.truncate(f.titre, 35)}</strong></td>
                            <td>${f.categorie || '-'}</td>
                            <td>${f.formateur || '-'}</td>
                            <td style="font-size:12px">${Utils.formatDate(f.date_debut)}<br>${Utils.formatDate(f.date_fin)}</td>
                            <td>${f.duree_heures ? f.duree_heures + 'h' : '-'}</td>
                            <td>${f.prix ? Utils.formatMontant(f.prix) : 'Gratuit'}</td>
                            <td>${Utils.statutBadge(f.statut)}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-outline" onclick="FormationsModule.showDetail(${f.id})">👁 Voir</button>
                                    ${Auth.hasPermission('edit_formation') ? `<button class="btn btn-sm btn-ghost" onclick="FormationsModule.showForm(${f.id})">✏️</button>` : ''}
                                    ${Auth.isDG() ? `<button class="btn btn-sm btn-ghost" onclick="FormationsModule.deleteFormation(${f.id})" style="color:var(--error)">🗑</button>` : ''}
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    },

    async showDetail(id) {
        const res = await window.cfori.formations.getById(id);
        if (!res.success) return;
        const f = res.data;

        const partRes = await window.cfori.participants.getAll({ formation_id: id });
        const participants = partRes.success ? partRes.data : [];

        const overlay = Modal.create(`🎓 ${f.titre}`, `
            <div class="grid-2" style="gap:20px">
                <div>
                    <div class="form-group"><label>Catégorie</label><div>${f.categorie || '-'}</div></div>
                    <div class="form-group"><label>Formateur</label><div>${f.formateur || '-'}</div></div>
                    <div class="form-group"><label>Lieu</label><div>${f.lieu || '-'}</div></div>
                    <div class="form-group"><label>Durée</label><div>${f.duree_heures ? f.duree_heures + ' heures' : '-'}</div></div>
                </div>
                <div>
                    <div class="form-group"><label>Date début</label><div>${Utils.formatDate(f.date_debut)}</div></div>
                    <div class="form-group"><label>Date fin</label><div>${Utils.formatDate(f.date_fin)}</div></div>
                    <div class="form-group"><label>Prix</label><div>${f.prix ? Utils.formatMontant(f.prix) : 'Gratuit'}</div></div>
                    <div class="form-group"><label>Capacité</label><div>${f.capacite_max || '-'} places</div></div>
                </div>
            </div>
            <div class="form-group"><label>Description</label><div>${f.description || '-'}</div></div>
            <div class="form-group"><label>Statut</label><div>${Utils.statutBadge(f.statut)}</div></div>

            <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <strong>Participants inscrits (${participants.length})</strong>
                <button class="btn btn-sm btn-primary" onclick="RapportsModule.genererListeParticipants(${f.id}, '${f.titre.replace(/'/g,"\\'")}')">📄 Export PDF</button>
            </div>
            <table style="font-size:12px">
                <thead><tr><th>Nom</th><th>Email</th><th>Organisation</th><th>Paiement</th></tr></thead>
                <tbody>
                    ${participants.length === 0
                        ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px">Aucun participant inscrit</td></tr>'
                        : participants.map(p => `<tr>
                            <td>${p.prenom} ${p.nom}</td>
                            <td>${p.email || '-'}</td>
                            <td>${p.organisation || '-'}</td>
                            <td>${Utils.statutBadge(p.statut_paiement)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>`, 'modal-lg');
    },

    async showForm(id = null) {
        let formation = null;
        if (id) {
            const res = await window.cfori.formations.getById(id);
            if (res.success) formation = res.data;
        }

        const overlay = Modal.create(id ? '✏️ Modifier la formation' : '+ Nouvelle formation', `
            <div class="form-grid">
                <div class="form-group form-full">
                    <label>Titre *</label>
                    <input type="text" id="f_titre" value="${formation?.titre || ''}" placeholder="Titre de la formation">
                </div>
                <div class="form-group">
                    <label>Catégorie</label>
                    <select id="f_categorie">
                        <option value="">-- Sélectionner --</option>
                        ${['Management','Informatique','Finance','RH','Commercial','Juridique','Autre'].map(c =>
                            `<option value="${c}" ${formation?.categorie === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Formateur</label>
                    <input type="text" id="f_formateur" value="${formation?.formateur || ''}" placeholder="Nom du formateur">
                </div>
                <div class="form-group">
                    <label>Date début</label>
                    <input type="date" id="f_date_debut" value="${formation?.date_debut || ''}">
                </div>
                <div class="form-group">
                    <label>Date fin</label>
                    <input type="date" id="f_date_fin" value="${formation?.date_fin || ''}">
                </div>
                <div class="form-group">
                    <label>Durée (heures)</label>
                    <input type="number" id="f_duree" value="${formation?.duree_heures || ''}" min="1">
                </div>
                <div class="form-group">
                    <label>Lieu</label>
                    <input type="text" id="f_lieu" value="${formation?.lieu || ''}" placeholder="Lieu de formation">
                </div>
                <div class="form-group">
                    <label>Capacité maximale</label>
                    <input type="number" id="f_capacite" value="${formation?.capacite_max || ''}" min="1">
                </div>
                <div class="form-group">
                    <label>Prix (XAF)</label>
                    <input type="number" id="f_prix" value="${formation?.prix || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>Statut</label>
                    <select id="f_statut">
                        ${['planifié','en_cours','terminé','annulé'].map(s =>
                            `<option value="${s}" ${(formation?.statut || 'planifié') === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group form-full">
                    <label>Description</label>
                    <textarea id="f_description" rows="3" placeholder="Description de la formation">${formation?.description || ''}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnSaveFormation">💾 Enregistrer</button>
            </div>`, 'modal-lg');

        overlay.querySelector('#btnSaveFormation').onclick = async () => {
            const titre = document.getElementById('f_titre').value.trim();
            if (!titre) { Toast.warning('Le titre est obligatoire'); return; }

            const data = {
                titre,
                categorie: document.getElementById('f_categorie').value,
                formateur: document.getElementById('f_formateur').value,
                date_debut: document.getElementById('f_date_debut').value,
                date_fin: document.getElementById('f_date_fin').value,
                duree_heures: parseInt(document.getElementById('f_duree').value) || null,
                lieu: document.getElementById('f_lieu').value,
                capacite_max: parseInt(document.getElementById('f_capacite').value) || null,
                prix: parseFloat(document.getElementById('f_prix').value) || 0,
                statut: document.getElementById('f_statut').value,
                description: document.getElementById('f_description').value
            };

            const user = Auth.getUser();
            let res;
            if (id) {
                res = await window.cfori.formations.update(user, id, data);
            } else {
                res = await window.cfori.formations.create(user, data);
            }

            if (res.success) {
                Toast.success(id ? 'Formation modifiée' : 'Formation créée avec succès');
                overlay.remove();
                this.loadData();
                SyncClient.emit('data:changed', { type: 'formations', action: id ? 'update' : 'create' });
            } else {
                Toast.error(res.message);
            }
        };
    },

    async deleteFormation(id) {
        Modal.confirm('Supprimer cette formation ? Cette action est irréversible.', async () => {
            const res = await window.cfori.formations.delete(Auth.getUser(), id);
            if (res.success) {
                Toast.success('Formation supprimée');
                this.loadData();
            } else {
                Toast.error(res.message);
            }
        });
    }
};

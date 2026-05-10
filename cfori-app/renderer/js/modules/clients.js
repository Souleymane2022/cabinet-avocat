/**
 * CFORI - Consulting | Module Clients & Dossiers
 */

const ClientsModule = {
    data: [],
    currentClientId: null,

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">🤝 Clients & Dossiers</div>
                    <div class="page-subtitle">Gestion des clients et de leurs dossiers</div>
                </div>
                ${Auth.hasPermission('create_client') ? '<button class="btn btn-primary" id="btnNewClient">+ Nouveau client</button>' : ''}
            </div>

            <div class="filters-bar">
                <div class="search-box">
                    <span>🔍</span>
                    <input type="text" id="searchClient" placeholder="Nom, organisation, référence...">
                </div>
                <select class="filter-select" id="filterStatutClient">
                    <option value="">Tous les statuts</option>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="prospect">Prospect</option>
                </select>
                <select class="filter-select" id="filterTypeClient">
                    <option value="">Tous types</option>
                    <option value="particulier">Particulier</option>
                    <option value="entreprise">Entreprise</option>
                    <option value="organisation">Organisation</option>
                </select>
            </div>

            <div class="table-card" id="clientsTable">
                <div class="loading-overlay"><div class="loader"></div></div>
            </div>`;

        if (Auth.hasPermission('create_client')) {
            document.getElementById('btnNewClient').onclick = () => this.showForm();
        }
        document.getElementById('searchClient').addEventListener('input', Utils.debounce(() => this.loadData(), 400));
        document.getElementById('filterStatutClient').addEventListener('change', () => this.loadData());
        document.getElementById('filterTypeClient').addEventListener('change', () => this.loadData());

        await this.loadData();
    },

    async loadData() {
        const search = document.getElementById('searchClient')?.value || '';
        const statut = document.getElementById('filterStatutClient')?.value || '';
        const type_client = document.getElementById('filterTypeClient')?.value || '';

        const res = await window.cfori.clients.getAll({ search, statut, type_client });
        if (!res.success) { Toast.error(res.message); return; }
        this.data = res.data;
        this.renderTable(document.getElementById('clientsTable'));
    },

    renderTable(container) {
        if (this.data.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">🤝</div><div class="empty-title">Aucun client</div><div class="empty-desc">Ajoutez votre premier client</div></div>`;
            return;
        }

        container.innerHTML = `
            <div class="table-header">
                <span class="table-title">${this.data.length} client(s)</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Référence</th>
                        <th>Client</th>
                        <th>Type</th>
                        <th>Contact</th>
                        <th>Ville</th>
                        <th>Secteur</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.data.map(c => `
                        <tr>
                            <td><code style="font-size:11px;background:var(--bg);padding:2px 6px;border-radius:4px">${c.dossier_ref || '-'}</code></td>
                            <td>
                                <div style="font-weight:600">${c.prenom ? c.prenom + ' ' : ''}${c.nom}</div>
                                ${c.raison_sociale ? `<div style="font-size:11px;color:var(--text-muted)">${c.raison_sociale}</div>` : ''}
                            </td>
                            <td><span class="badge badge-teal">${c.type_client}</span></td>
                            <td>
                                <div style="font-size:12px">${c.email || '-'}</div>
                                <div style="font-size:12px;color:var(--text-muted)">${c.telephone || ''}</div>
                            </td>
                            <td style="font-size:12px">${c.ville || '-'}, ${c.pays || 'Tchad'}</td>
                            <td style="font-size:12px">${c.secteur_activite || '-'}</td>
                            <td>${Utils.statutBadge(c.statut)}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-outline" onclick="ClientsModule.showFiche(${c.id})">📋 Fiche</button>
                                    ${Auth.hasPermission('edit_client') ? `<button class="btn btn-sm btn-ghost" onclick="ClientsModule.showForm(${c.id})">✏️</button>` : ''}
                                    ${Auth.isDG() ? `<button class="btn btn-sm btn-ghost" onclick="ClientsModule.deleteClient(${c.id})" style="color:var(--error)">🗑</button>` : ''}
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    },

    async showFiche(clientId) {
        const c = this.data.find(x => x.id === clientId);
        if (!c) return;

        const dosRes = await window.cfori.dossiers.getAll(clientId);
        const dossiers = dosRes.success ? dosRes.data : [];

        const overlay = Modal.create(`📋 Fiche Client — ${c.prenom ? c.prenom + ' ' : ''}${c.nom}`, `
            <div class="grid-2" style="gap:20px;margin-bottom:20px">
                <div>
                    <div class="form-group"><label>Référence</label><code>${c.dossier_ref || '-'}</code></div>
                    <div class="form-group"><label>Type</label><span class="badge badge-teal">${c.type_client}</span></div>
                    ${c.raison_sociale ? `<div class="form-group"><label>Raison sociale</label><div>${c.raison_sociale}</div></div>` : ''}
                    <div class="form-group"><label>Secteur</label><div>${c.secteur_activite || '-'}</div></div>
                </div>
                <div>
                    <div class="form-group"><label>Email</label><div>${c.email || '-'}</div></div>
                    <div class="form-group"><label>Téléphone</label><div>${c.telephone || '-'}</div></div>
                    <div class="form-group"><label>Adresse</label><div>${c.adresse || '-'}</div></div>
                    <div class="form-group"><label>Ville / Pays</label><div>${c.ville || '-'}, ${c.pays || 'Tchad'}</div></div>
                </div>
            </div>
            ${c.notes ? `<div class="form-group"><label>Notes</label><div style="background:var(--bg);padding:10px;border-radius:6px;font-size:13px">${c.notes}</div></div>` : ''}

            <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <strong>Dossiers (${dossiers.length})</strong>
                ${Auth.hasPermission('create_dossier') ? `<button class="btn btn-sm btn-primary" onclick="ClientsModule.showDossierForm(${c.id}, null, this.closest('.modal-overlay'))">+ Nouveau dossier</button>` : ''}
            </div>
            <div id="dossiersList">
                ${dossiers.length === 0
                    ? '<div class="empty-state" style="padding:16px"><div class="empty-icon">📂</div><div class="empty-desc">Aucun dossier</div></div>'
                    : dossiers.map(d => `
                        <div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
                            <div>
                                <div style="font-weight:600;font-size:13px">${d.titre}</div>
                                <div style="font-size:11px;color:var(--text-muted)">${d.type_service} — Ouvert le ${Utils.formatDate(d.date_ouverture)}</div>
                            </div>
                            <div style="display:flex;gap:8px;align-items:center">
                                ${Utils.statutBadge(d.statut)}
                                ${Auth.hasPermission('edit_dossier') ? `<button class="btn btn-sm btn-ghost" onclick="ClientsModule.showDossierForm(${c.id}, ${d.id}, this.closest('.modal-overlay'))">✏️</button>` : ''}
                            </div>
                        </div>`).join('')}
            </div>`, 'modal-lg');
    },

    async showDossierForm(clientId, dossierId = null, parentOverlay = null) {
        let dossier = null;
        if (dossierId) {
            const res = await window.cfori.dossiers.getAll(clientId);
            dossier = res.data?.find(d => d.id === dossierId);
        }

        const usersRes = await window.cfori.users.getAll(Auth.getUser());
        const users = usersRes.success ? usersRes.data : [];

        const overlay = Modal.create(dossierId ? '✏️ Modifier le dossier' : '+ Nouveau dossier', `
            <div class="form-grid">
                <div class="form-group form-full">
                    <label>Titre *</label>
                    <input type="text" id="d_titre" value="${dossier?.titre || ''}">
                </div>
                <div class="form-group">
                    <label>Type de service</label>
                    <select id="d_type">
                        ${['conseil','orientation','insertion','formation'].map(t =>
                            `<option value="${t}" ${dossier?.type_service === t ? 'selected':''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Statut</label>
                    <select id="d_statut">
                        ${['ouvert','en_cours','clôturé','suspendu'].map(s =>
                            `<option value="${s}" ${(dossier?.statut || 'ouvert') === s ? 'selected':''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date d'ouverture</label>
                    <input type="date" id="d_date_ouverture" value="${dossier?.date_ouverture || new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Date de clôture</label>
                    <input type="date" id="d_date_cloture" value="${dossier?.date_cloture || ''}">
                </div>
                <div class="form-group">
                    <label>Responsable</label>
                    <select id="d_responsable">
                        <option value="">-- Sélectionner --</option>
                        ${users.map(u => `<option value="${u.id}" ${dossier?.responsable_id == u.id ? 'selected':''}>${u.prenom} ${u.nom}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group form-full">
                    <label>Description</label>
                    <textarea id="d_description" rows="2">${dossier?.description || ''}</textarea>
                </div>
                <div class="form-group form-full">
                    <label>Notes</label>
                    <textarea id="d_notes" rows="2">${dossier?.notes || ''}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnSaveDossier">💾 Enregistrer</button>
            </div>`);

        overlay.querySelector('#btnSaveDossier').onclick = async () => {
            const titre = document.getElementById('d_titre').value.trim();
            if (!titre) { Toast.warning('Le titre est obligatoire'); return; }

            const data = {
                client_id: clientId,
                titre,
                type_service: document.getElementById('d_type').value,
                statut: document.getElementById('d_statut').value,
                date_ouverture: document.getElementById('d_date_ouverture').value,
                date_cloture: document.getElementById('d_date_cloture').value || null,
                responsable_id: document.getElementById('d_responsable').value || null,
                description: document.getElementById('d_description').value,
                notes: document.getElementById('d_notes').value
            };

            const user = Auth.getUser();
            const res = dossierId
                ? await window.cfori.dossiers.update(user, dossierId, data)
                : await window.cfori.dossiers.create(user, data);

            if (res.success) {
                Toast.success(dossierId ? 'Dossier modifié' : 'Dossier créé');
                overlay.remove();
                if (parentOverlay) { parentOverlay.remove(); this.showFiche(clientId); }
                SyncClient.emit('data:changed', { type: 'dossiers', action: dossierId ? 'update' : 'create' });
            } else {
                Toast.error(res.message);
            }
        };
    },

    async showForm(id = null) {
        let c = null;
        if (id) c = this.data.find(x => x.id === id);

        const overlay = Modal.create(id ? '✏️ Modifier le client' : '+ Nouveau client', `
            <div class="form-grid">
                <div class="form-group">
                    <label>Nom *</label>
                    <input type="text" id="c_nom" value="${c?.nom || ''}">
                </div>
                <div class="form-group">
                    <label>Prénom</label>
                    <input type="text" id="c_prenom" value="${c?.prenom || ''}">
                </div>
                <div class="form-group">
                    <label>Raison sociale</label>
                    <input type="text" id="c_raison_sociale" value="${c?.raison_sociale || ''}" placeholder="Pour entreprises/organisations">
                </div>
                <div class="form-group">
                    <label>Type de client</label>
                    <select id="c_type">
                        ${['particulier','entreprise','organisation'].map(t =>
                            `<option value="${t}" ${(c?.type_client || 'particulier') === t ? 'selected':''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="c_email" value="${c?.email || ''}">
                </div>
                <div class="form-group">
                    <label>Téléphone</label>
                    <input type="tel" id="c_telephone" value="${c?.telephone || ''}">
                </div>
                <div class="form-group form-full">
                    <label>Adresse</label>
                    <input type="text" id="c_adresse" value="${c?.adresse || ''}">
                </div>
                <div class="form-group">
                    <label>Ville</label>
                    <input type="text" id="c_ville" value="${c?.ville || ''}" placeholder="N'Djamena">
                </div>
                <div class="form-group">
                    <label>Pays</label>
                    <input type="text" id="c_pays" value="${c?.pays || 'Tchad'}">
                </div>
                <div class="form-group">
                    <label>Secteur d'activité</label>
                    <input type="text" id="c_secteur" value="${c?.secteur_activite || ''}">
                </div>
                <div class="form-group">
                    <label>Statut</label>
                    <select id="c_statut">
                        ${['actif','inactif','prospect'].map(s =>
                            `<option value="${s}" ${(c?.statut || 'actif') === s ? 'selected':''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group form-full">
                    <label>Notes</label>
                    <textarea id="c_notes" rows="2">${c?.notes || ''}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnSaveClient">💾 Enregistrer</button>
            </div>`, 'modal-lg');

        overlay.querySelector('#btnSaveClient').onclick = async () => {
            const nom = document.getElementById('c_nom').value.trim();
            if (!nom) { Toast.warning('Le nom est obligatoire'); return; }

            const data = {
                nom,
                prenom: document.getElementById('c_prenom').value,
                raison_sociale: document.getElementById('c_raison_sociale').value,
                type_client: document.getElementById('c_type').value,
                email: document.getElementById('c_email').value,
                telephone: document.getElementById('c_telephone').value,
                adresse: document.getElementById('c_adresse').value,
                ville: document.getElementById('c_ville').value,
                pays: document.getElementById('c_pays').value || 'Tchad',
                secteur_activite: document.getElementById('c_secteur').value,
                statut: document.getElementById('c_statut').value,
                notes: document.getElementById('c_notes').value
            };

            const user = Auth.getUser();
            const res = id
                ? await window.cfori.clients.update(user, id, data)
                : await window.cfori.clients.create(user, data);

            if (res.success) {
                Toast.success(id ? 'Client modifié' : 'Client créé');
                overlay.remove();
                this.loadData();
                SyncClient.emit('data:changed', { type: 'clients', action: id ? 'update' : 'create' });
            } else {
                Toast.error(res.message);
            }
        };
    },

    async deleteClient(id) {
        Modal.confirm('Supprimer ce client et tous ses dossiers ?', async () => {
            const res = await window.cfori.clients.delete(Auth.getUser(), id);
            if (res.success) {
                Toast.success('Client supprimé');
                this.loadData();
            } else {
                Toast.error(res.message);
            }
        });
    }
};

/**
 * CFORI - Consulting | Module Participants
 */

const ParticipantsModule = {
    data: [],
    formations: [],

    async render(container) {
        // Charger la liste des formations pour le filtre
        const fRes = await window.cfori.formations.getAll({});
        this.formations = fRes.success ? fRes.data : [];

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">👥 Participants</div>
                    <div class="page-subtitle">Gestion des participants aux formations</div>
                </div>
                ${Auth.hasPermission('create_participant') ? '<button class="btn btn-primary" id="btnNewParticipant">+ Nouveau participant</button>' : ''}
            </div>

            <div class="filters-bar">
                <div class="search-box">
                    <span>🔍</span>
                    <input type="text" id="searchParticipant" placeholder="Nom, email, organisation...">
                </div>
                <select class="filter-select" id="filterFormation">
                    <option value="">Toutes les formations</option>
                    ${this.formations.map(f => `<option value="${f.id}">${Utils.truncate(f.titre, 40)}</option>`).join('')}
                </select>
                <select class="filter-select" id="filterPaiement">
                    <option value="">Tout statut paiement</option>
                    <option value="payé">Payé</option>
                    <option value="en_attente">En attente</option>
                    <option value="annulé">Annulé</option>
                </select>
            </div>

            <div class="table-card" id="participantsTable">
                <div class="loading-overlay"><div class="loader"></div></div>
            </div>`;

        if (Auth.hasPermission('create_participant')) {
            document.getElementById('btnNewParticipant').onclick = () => this.showForm();
        }
        document.getElementById('searchParticipant').addEventListener('input', Utils.debounce(() => this.loadData(), 400));
        document.getElementById('filterFormation').addEventListener('change', () => this.loadData());
        document.getElementById('filterPaiement').addEventListener('change', () => this.loadData());

        await this.loadData();
    },

    async loadData() {
        const search = document.getElementById('searchParticipant')?.value || '';
        const formation_id = document.getElementById('filterFormation')?.value || '';
        const statut_paiement = document.getElementById('filterPaiement')?.value || '';

        const res = await window.cfori.participants.getAll({
            search,
            formation_id: formation_id || null,
            statut_paiement: statut_paiement || null
        });
        if (!res.success) { Toast.error(res.message); return; }
        this.data = res.data;
        this.renderTable(document.getElementById('participantsTable'));
    },

    renderTable(container) {
        if (this.data.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Aucun participant</div><div class="empty-desc">Inscrivez votre premier participant</div></div>`;
            return;
        }

        container.innerHTML = `
            <div class="table-header">
                <span class="table-title">${this.data.length} participant(s)</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Participant</th>
                        <th>Contact</th>
                        <th>Organisation</th>
                        <th>Formation</th>
                        <th>Inscription</th>
                        <th>Paiement</th>
                        <th>Montant</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.data.map(p => `
                        <tr>
                            <td>
                                <div style="font-weight:600">${p.prenom} ${p.nom}</div>
                                <div style="font-size:11px;color:var(--text-muted)">${p.poste || ''}</div>
                            </td>
                            <td>
                                <div style="font-size:12px">${p.email || '-'}</div>
                                <div style="font-size:12px;color:var(--text-muted)">${p.telephone || ''}</div>
                            </td>
                            <td>${p.organisation || '-'}</td>
                            <td style="font-size:12px">${p.formation_titre ? Utils.truncate(p.formation_titre, 30) : '-'}</td>
                            <td style="font-size:12px">${Utils.formatDate(p.date_inscription)}</td>
                            <td>${Utils.statutBadge(p.statut_paiement)}</td>
                            <td>${p.montant_paye ? Utils.formatMontant(p.montant_paye) : '-'}</td>
                            <td>
                                <div class="action-buttons">
                                    ${Auth.hasPermission('edit_participant') ? `<button class="btn btn-sm btn-ghost" onclick="ParticipantsModule.showForm(${p.id})">✏️</button>` : ''}
                                    <button class="btn btn-sm btn-outline" onclick="ParticipantsModule.genererAttestation(${p.id})" title="Attestation PDF">📄</button>
                                    ${Auth.isDG() ? `<button class="btn btn-sm btn-ghost" onclick="ParticipantsModule.deleteParticipant(${p.id})" style="color:var(--error)">🗑</button>` : ''}
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    },

    async showForm(id = null) {
        let p = null;
        if (id) {
            const res = await window.cfori.participants.getAll({ search: '' });
            p = res.data?.find(x => x.id === id);
        }

        const overlay = Modal.create(id ? '✏️ Modifier le participant' : '+ Nouveau participant', `
            <div class="form-grid">
                <div class="form-group">
                    <label>Nom *</label>
                    <input type="text" id="p_nom" value="${p?.nom || ''}" placeholder="Nom de famille">
                </div>
                <div class="form-group">
                    <label>Prénom *</label>
                    <input type="text" id="p_prenom" value="${p?.prenom || ''}" placeholder="Prénom">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="p_email" value="${p?.email || ''}" placeholder="email@exemple.com">
                </div>
                <div class="form-group">
                    <label>Téléphone</label>
                    <input type="tel" id="p_telephone" value="${p?.telephone || ''}" placeholder="+235 ...">
                </div>
                <div class="form-group">
                    <label>Organisation</label>
                    <input type="text" id="p_organisation" value="${p?.organisation || ''}" placeholder="Entreprise / Institution">
                </div>
                <div class="form-group">
                    <label>Poste</label>
                    <input type="text" id="p_poste" value="${p?.poste || ''}" placeholder="Poste occupé">
                </div>
                <div class="form-group">
                    <label>Formation</label>
                    <select id="p_formation">
                        <option value="">-- Aucune --</option>
                        ${this.formations.map(f => `<option value="${f.id}" ${p?.formation_id == f.id ? 'selected' : ''}>${Utils.truncate(f.titre, 45)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Statut paiement</label>
                    <select id="p_statut_paiement">
                        ${['en_attente','payé','annulé'].map(s => `<option value="${s}" ${(p?.statut_paiement || 'en_attente') === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Montant payé (XAF)</label>
                    <input type="number" id="p_montant" value="${p?.montant_paye || 0}" min="0">
                </div>
                <div class="form-group form-full">
                    <label>Notes</label>
                    <textarea id="p_notes" rows="2">${p?.notes || ''}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnSaveParticipant">💾 Enregistrer</button>
            </div>`);

        overlay.querySelector('#btnSaveParticipant').onclick = async () => {
            const nom = document.getElementById('p_nom').value.trim();
            const prenom = document.getElementById('p_prenom').value.trim();
            if (!nom || !prenom) { Toast.warning('Nom et prénom sont obligatoires'); return; }

            const data = {
                nom, prenom,
                email: document.getElementById('p_email').value,
                telephone: document.getElementById('p_telephone').value,
                organisation: document.getElementById('p_organisation').value,
                poste: document.getElementById('p_poste').value,
                formation_id: document.getElementById('p_formation').value || null,
                statut_paiement: document.getElementById('p_statut_paiement').value,
                montant_paye: parseFloat(document.getElementById('p_montant').value) || 0,
                notes: document.getElementById('p_notes').value
            };

            const user = Auth.getUser();
            const res = id
                ? await window.cfori.participants.update(user, id, data)
                : await window.cfori.participants.create(user, data);

            if (res.success) {
                Toast.success(id ? 'Participant modifié' : 'Participant inscrit');
                overlay.remove();
                this.loadData();
                SyncClient.emit('data:changed', { type: 'participants', action: id ? 'update' : 'create' });
            } else {
                Toast.error(res.message);
            }
        };
    },

    async genererAttestation(id) {
        const p = this.data.find(x => x.id === id);
        if (!p) return;
        await RapportsModule.genererAttestation(p);
    },

    async deleteParticipant(id) {
        Modal.confirm('Supprimer ce participant ?', async () => {
            const res = await window.cfori.participants.delete(Auth.getUser(), id);
            if (res.success) {
                Toast.success('Participant supprimé');
                this.loadData();
            } else {
                Toast.error(res.message);
            }
        });
    }
};

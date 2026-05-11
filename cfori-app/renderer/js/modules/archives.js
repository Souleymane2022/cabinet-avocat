/**
 * CFORI - Consulting | Module Archives
 */

const ArchivesModule = {
    data: [],

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">📁 Archives</div>
                    <div class="page-subtitle">Gestionnaire de documents et archives</div>
                </div>
                ${Auth.hasPermission('create_archive') ? '<button class="btn btn-primary" id="btnNewArchive">+ Ajouter un document</button>' : ''}
            </div>

            <div class="filters-bar">
                <div class="search-box">
                    <span>🔍</span>
                    <input type="text" id="searchArchive" placeholder="Titre, référence, tags...">
                </div>
                <select class="filter-select" id="filterTypeDoc">
                    <option value="">Tous types</option>
                    <option value="rapport">Rapport</option>
                    <option value="contrat">Contrat</option>
                    <option value="cv">CV</option>
                    <option value="certificat">Certificat</option>
                    <option value="autre">Autre</option>
                </select>
                <select class="filter-select" id="filterCategorie">
                    <option value="">Toutes catégories</option>
                    <option value="Formations">Formations</option>
                    <option value="Clients">Clients</option>
                    <option value="Administratif">Administratif</option>
                    <option value="RH">Ressources Humaines</option>
                    <option value="Finance">Finance</option>
                </select>
                ${Auth.isDG() ? `
                    <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="filterConfidentiel"> Confidentiel uniquement
                    </label>` : ''}
            </div>

            <div class="table-card" id="archivesTable">
                <div class="loading-overlay"><div class="loader"></div></div>
            </div>`;

        if (Auth.hasPermission('create_archive')) {
            document.getElementById('btnNewArchive').onclick = () => this.showForm();
        }
        document.getElementById('searchArchive').addEventListener('input', Utils.debounce(() => this.loadData(), 400));
        document.getElementById('filterTypeDoc').addEventListener('change', () => this.loadData());
        document.getElementById('filterCategorie').addEventListener('change', () => this.loadData());
        if (Auth.isDG()) {
            document.getElementById('filterConfidentiel').addEventListener('change', () => this.loadData());
        }

        await this.loadData();
    },

    async loadData() {
        const search = document.getElementById('searchArchive')?.value || '';
        const type_document = document.getElementById('filterTypeDoc')?.value || '';
        const categorie = document.getElementById('filterCategorie')?.value || '';
        const confidentielEl = document.getElementById('filterConfidentiel');
        const confidentiel = confidentielEl?.checked ? 1 : undefined;

        const res = await window.cfori.archives.getAll(Auth.getUser(), {
            search, type_document, categorie,
            confidentiel: confidentiel !== undefined ? confidentiel : undefined
        });
        if (!res.success) { Toast.error(res.message); return; }
        this.data = res.data;
        this.renderTable(document.getElementById('archivesTable'));
    },

    renderTable(container) {
        if (this.data.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-title">Aucune archive</div><div class="empty-desc">Ajoutez votre premier document</div></div>`;
            return;
        }

        const typeIcons = { rapport:'📊', contrat:'📝', cv:'👤', certificat:'🏆', autre:'📄' };

        container.innerHTML = `
            <div class="table-header">
                <span class="table-title">${this.data.length} document(s)</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Document</th>
                        <th>Type</th>
                        <th>Catégorie</th>
                        <th>Référence</th>
                        <th>Date</th>
                        <th>Taille</th>
                        <th>Tags</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.data.map(a => `
                        <tr>
                            <td>
                                <div style="display:flex;align-items:center;gap:8px">
                                    <span style="font-size:20px">${typeIcons[a.type_document] || '📄'}</span>
                                    <div>
                                        <div style="font-weight:600;font-size:13px">${Utils.truncate(a.titre, 35)}</div>
                                        <div style="font-size:11px;color:var(--text-muted)">${a.fichier_nom || '-'}</div>
                                    </div>
                                    ${a.confidentiel ? '<span class="badge badge-error" style="font-size:10px">🔒 Confidentiel</span>' : ''}
                                </div>
                            </td>
                            <td><span class="badge badge-info">${a.type_document}</span></td>
                            <td>${a.categorie || '-'}</td>
                            <td><code style="font-size:11px;background:var(--bg);padding:2px 6px;border-radius:4px">${a.reference || '-'}</code></td>
                            <td style="font-size:12px">${Utils.formatDate(a.date_document)}</td>
                            <td style="font-size:12px">${Utils.formatFileSize(a.fichier_taille)}</td>
                            <td style="font-size:11px">${a.tags ? a.tags.split(',').map(t => `<span class="badge badge-gray" style="margin:1px">${t.trim()}</span>`).join('') : '-'}</td>
                            <td>
                                <div class="action-buttons">
                                    ${a.fichier_path ? `<button class="btn btn-sm btn-outline" onclick="ArchivesModule.openFile('${a.fichier_path.replace(/'/g,"\\'")}')">📂 Ouvrir</button>` : ''}
                                    ${Auth.hasPermission('delete_archives') || Auth.isDG() ? `<button class="btn btn-sm btn-ghost" onclick="ArchivesModule.deleteArchive(${a.id})" style="color:var(--error)">🗑</button>` : ''}
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    },

    async openFile(filePath) {
        const res = await window.cfori.file.open(filePath);
        if (!res.success) Toast.error('Impossible d\'ouvrir le fichier');
    },

    async showForm() {
        const overlay = Modal.create('+ Ajouter un document', `
            <div class="form-grid">
                <div class="form-group form-full">
                    <label>Titre *</label>
                    <input type="text" id="a_titre" placeholder="Titre du document">
                </div>
                <div class="form-group">
                    <label>Type de document</label>
                    <select id="a_type">
                        ${['rapport','contrat','cv','certificat','autre'].map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Catégorie</label>
                    <select id="a_categorie">
                        <option value="">-- Sélectionner --</option>
                        ${['Formations','Clients','Administratif','RH','Finance'].map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date du document</label>
                    <input type="date" id="a_date" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Tags (séparés par virgule)</label>
                    <input type="text" id="a_tags" placeholder="formation, 2025, N'Djamena">
                </div>
                <div class="form-group form-full">
                    <label>Description</label>
                    <textarea id="a_description" rows="2"></textarea>
                </div>
                ${Auth.isDG() ? `
                <div class="form-group form-full">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                        <input type="checkbox" id="a_confidentiel">
                        Document confidentiel (visible DG uniquement)
                    </label>
                </div>` : ''}
                <div class="form-group form-full">
                    <label>Fichier</label>
                    <div style="display:flex;gap:8px;align-items:center">
                        <button class="btn btn-outline" id="btnSelectFile" type="button">📂 Sélectionner un fichier</button>
                        <span id="selectedFileName" style="font-size:12px;color:var(--text-muted)">Aucun fichier sélectionné</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnSaveArchive">💾 Enregistrer</button>
            </div>`);

        let fileData = null;

        overlay.querySelector('#btnSelectFile').onclick = async () => {
            const result = await window.cfori.dialog.openFile();
            if (result.success) {
                fileData = result;
                overlay.querySelector('#selectedFileName').textContent = result.fileName;
            }
        };

        overlay.querySelector('#btnSaveArchive').onclick = async () => {
            const titre = document.getElementById('a_titre').value.trim();
            if (!titre) { Toast.warning('Le titre est obligatoire'); return; }

            const data = {
                titre,
                type_document: document.getElementById('a_type').value,
                categorie: document.getElementById('a_categorie').value,
                date_document: document.getElementById('a_date').value,
                tags: document.getElementById('a_tags').value,
                description: document.getElementById('a_description').value,
                confidentiel: Auth.isDG() && document.getElementById('a_confidentiel')?.checked ? 1 : 0,
                fichier_nom: fileData?.fileName || null,
                fichier_path: fileData?.filePath || null,
                fichier_taille: fileData?.fileSize || 0
            };

            const res = await window.cfori.archives.create(Auth.getUser(), data);
            if (res.success) {
                Toast.success('Document archivé avec succès');
                overlay.remove();
                this.loadData();
                SyncClient.emit('data:changed', { type: 'archives', action: 'create' });
            } else {
                Toast.error(res.message);
            }
        };
    },

    async deleteArchive(id) {
        Modal.confirm('Supprimer ce document des archives ?', async () => {
            const res = await window.cfori.archives.delete(Auth.getUser(), id);
            if (res.success) {
                Toast.success('Document supprimé');
                this.loadData();
            } else {
                Toast.error(res.message);
            }
        });
    }
};

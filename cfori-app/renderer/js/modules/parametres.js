/**
 * CFORI - Consulting | Module Paramètres (DG uniquement)
 */

const ParametresModule = {
    async render(container) {
        if (!Auth.isDG()) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔒</div>
                    <div class="empty-title">Accès refusé</div>
                    <div class="empty-desc">Cette section est réservée au Directeur Général</div>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">⚙️ Paramètres</div>
                    <div class="page-subtitle">Gestion des utilisateurs, configuration réseau et journaux</div>
                </div>
            </div>

            <div class="grid-2" style="gap:20px;align-items:start">
                <!-- Gestion utilisateurs -->
                <div>
                    <div class="card mb-16">
                        <div class="card-header">
                            <span class="card-title">👤 Gestion des utilisateurs</span>
                            <button class="btn btn-primary btn-sm" id="btnNewUser">+ Nouvel utilisateur</button>
                        </div>
                        <div id="usersList">
                            <div class="loading-overlay"><div class="loader"></div></div>
                        </div>
                    </div>

                    <!-- Logs d'audit -->
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">📋 Journal d'audit</span>
                            <button class="btn btn-sm btn-outline" id="btnRefreshLogs">🔄</button>
                        </div>
                        <div style="max-height:300px;overflow-y:auto" id="auditLogs">
                            <div class="loading-overlay"><div class="loader"></div></div>
                        </div>
                    </div>
                </div>

                <!-- Configuration réseau -->
                <div>
                    <div class="card mb-16">
                        <div class="card-header">
                            <span class="card-title">🌐 Synchronisation réseau LAN</span>
                        </div>
                        <div class="card-body" id="syncConfig">
                            <div class="loading-overlay"><div class="loader"></div></div>
                        </div>
                    </div>

                    <!-- Informations application -->
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">ℹ️ Informations</span>
                        </div>
                        <div class="card-body">
                            <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
                                <div style="display:flex;justify-content:space-between"><span class="text-light">Application</span><span>CFORI - Consulting</span></div>
                                <div style="display:flex;justify-content:space-between"><span class="text-light">Version</span><span>1.0.0</span></div>
                                <div style="display:flex;justify-content:space-between"><span class="text-light">Base de données</span><span>SQLite (locale)</span></div>
                                <div style="display:flex;justify-content:space-between"><span class="text-light">Synchronisation</span><span>Socket.IO LAN</span></div>
                                <div style="display:flex;justify-content:space-between"><span class="text-light">Utilisateur</span><span>${Auth.getUser().prenom} ${Auth.getUser().nom}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        document.getElementById('btnNewUser').onclick = () => this.showUserForm();
        document.getElementById('btnRefreshLogs').onclick = () => this.loadAuditLogs();

        await Promise.all([this.loadUsers(), this.loadSyncConfig(), this.loadAuditLogs()]);
    },

    async loadUsers() {
        const res = await window.cfori.users.getAll(Auth.getUser());
        if (!res.success) {
            document.getElementById('usersList').innerHTML = `<div class="empty-state"><div class="empty-desc">${res.message}</div></div>`;
            return;
        }

        const users = res.data;
        document.getElementById('usersList').innerHTML = users.map(u => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border-light)">
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${u.role === 'DG' ? 'var(--primary),var(--secondary)' : 'var(--accent),var(--secondary)'});display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px">
                        ${(u.prenom[0] + u.nom[0]).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight:600;font-size:13px">${u.prenom} ${u.nom}</div>
                        <div style="font-size:11px;color:var(--text-muted)">${u.email}</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="badge ${u.role === 'DG' ? 'badge-teal' : 'badge-purple'}">${u.role}</span>
                    <span class="badge ${u.actif ? 'badge-success' : 'badge-error'}">${u.actif ? 'Actif' : 'Inactif'}</span>
                    ${u.id !== Auth.getUser().id ? `<button class="btn btn-sm btn-ghost" onclick="ParametresModule.showUserForm(${u.id})">✏️</button>` : ''}
                </div>
            </div>`).join('');
    },

    async loadSyncConfig() {
        const res = await window.cfori.config.get();
        const config = res.success ? res.data : {};

        document.getElementById('syncConfig').innerHTML = `
            <div style="display:flex;flex-direction:column;gap:16px">
                <div class="form-group">
                    <label>Serveur de synchronisation (ce PC)</label>
                    <div style="display:flex;gap:8px">
                        <button class="btn btn-primary" id="btnStartServer">▶ Démarrer le serveur</button>
                        <span id="serverStatus" style="font-size:12px;align-self:center;color:var(--text-muted)">Serveur non démarré</span>
                    </div>
                </div>
                <hr style="border:none;border-top:1px solid var(--border)">
                <div class="form-group">
                    <label>IP du serveur DG (pour le Secrétaire)</label>
                    <input type="text" id="syncIp" value="${config.syncServerIp || ''}" placeholder="ex: 192.168.1.10">
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-outline" id="btnTestSync">🔌 Tester la connexion</button>
                    <button class="btn btn-primary" id="btnSaveSync">💾 Sauvegarder</button>
                </div>
                <div id="syncTestResult" style="font-size:12px;"></div>
            </div>`;

        document.getElementById('btnStartServer').onclick = async () => {
            const res = await window.cfori.sync.startServer();
            document.getElementById('serverStatus').textContent = res.success
                ? `✅ Serveur actif sur le port ${res.port}`
                : `❌ ${res.message}`;
        };

        document.getElementById('btnSaveSync').onclick = async () => {
            const ip = document.getElementById('syncIp').value.trim();
            await window.cfori.config.set({ ...config, syncServerIp: ip });
            Toast.success('Configuration sauvegardée');
            SyncClient.reconnect(ip);
        };

        document.getElementById('btnTestSync').onclick = () => {
            const ip = document.getElementById('syncIp').value.trim();
            if (!ip) { Toast.warning('Entrez une IP'); return; }
            const result = document.getElementById('syncTestResult');
            result.textContent = '⏳ Test en cours...';
            SyncClient.testConnection(ip, (success) => {
                result.textContent = success ? '✅ Connexion réussie !' : '❌ Impossible de se connecter';
                result.style.color = success ? 'var(--success)' : 'var(--error)';
            });
        };
    },

    async loadAuditLogs() {
        const res = await window.cfori.audit.getLogs(Auth.getUser(), 50);
        const container = document.getElementById('auditLogs');
        if (!res.success) {
            container.innerHTML = `<div class="empty-state" style="padding:16px"><div class="empty-desc">${res.message}</div></div>`;
            return;
        }

        const logs = res.data;
        container.innerHTML = logs.map(l => `
            <div style="padding:8px 16px;border-bottom:1px solid var(--border-light);font-size:12px">
                <div style="display:flex;justify-content:space-between">
                    <span style="font-weight:600;color:var(--text)">${l.action}</span>
                    <span style="color:var(--text-muted)">${Utils.formatDateTime(l.created_at)}</span>
                </div>
                <div style="color:var(--text-light)">${l.user_nom || 'Système'} → ${l.table_cible || '-'}</div>
            </div>`).join('');
    },

    async showUserForm(id = null) {
        let u = null;
        if (id) {
            const res = await window.cfori.users.getAll(Auth.getUser());
            u = res.data?.find(x => x.id === id);
        }

        const overlay = Modal.create(id ? '✏️ Modifier l\'utilisateur' : '+ Nouvel utilisateur', `
            <div class="form-grid">
                <div class="form-group">
                    <label>Prénom *</label>
                    <input type="text" id="u_prenom" value="${u?.prenom || ''}">
                </div>
                <div class="form-group">
                    <label>Nom *</label>
                    <input type="text" id="u_nom" value="${u?.nom || ''}">
                </div>
                <div class="form-group form-full">
                    <label>Email *</label>
                    <input type="email" id="u_email" value="${u?.email || ''}">
                </div>
                <div class="form-group">
                    <label>Rôle *</label>
                    <select id="u_role">
                        <option value="SECRETAIRE" ${u?.role === 'SECRETAIRE' ? 'selected' : ''}>Secrétaire</option>
                        <option value="DG" ${u?.role === 'DG' ? 'selected' : ''}>Directeur Général</option>
                    </select>
                </div>
                ${id ? `
                <div class="form-group">
                    <label>Statut</label>
                    <select id="u_actif">
                        <option value="1" ${u?.actif ? 'selected' : ''}>Actif</option>
                        <option value="0" ${!u?.actif ? 'selected' : ''}>Inactif</option>
                    </select>
                </div>` : ''}
                <div class="form-group form-full">
                    <label>${id ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</label>
                    <input type="password" id="u_password" placeholder="${id ? '••••••••' : 'Mot de passe (min. 8 caractères)'}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnSaveUser">💾 Enregistrer</button>
            </div>`, 'modal-sm');

        overlay.querySelector('#btnSaveUser').onclick = async () => {
            const prenom = document.getElementById('u_prenom').value.trim();
            const nom = document.getElementById('u_nom').value.trim();
            const email = document.getElementById('u_email').value.trim();
            const password = document.getElementById('u_password').value;

            if (!prenom || !nom || !email) { Toast.warning('Prénom, nom et email sont obligatoires'); return; }
            if (!id && !password) { Toast.warning('Le mot de passe est obligatoire pour un nouvel utilisateur'); return; }
            if (password && password.length < 8) { Toast.warning('Le mot de passe doit contenir au moins 8 caractères'); return; }

            const data = {
                prenom, nom, email,
                role: document.getElementById('u_role').value,
                actif: id ? parseInt(document.getElementById('u_actif').value) : 1
            };
            if (password) data.password = password;

            const user = Auth.getUser();
            const res = id
                ? await window.cfori.users.update(user, id, data)
                : await window.cfori.users.create(user, data);

            if (res.success) {
                Toast.success(id ? 'Utilisateur modifié' : 'Utilisateur créé');
                overlay.remove();
                this.loadUsers();
            } else {
                Toast.error(res.message);
            }
        };
    }
};

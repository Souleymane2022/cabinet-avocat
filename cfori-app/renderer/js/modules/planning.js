/**
 * CFORI - Consulting | Module Planning & Agenda
 */

const PlanningModule = {
    events: [],
    currentDate: new Date(),
    view: 'month',

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">📅 Planning & Agenda</div>
                    <div class="page-subtitle">Gestion du calendrier et des événements</div>
                </div>
                ${Auth.hasPermission('create_planning') ? '<button class="btn btn-primary" id="btnNewEvent">+ Nouvel événement</button>' : ''}
            </div>

            <div class="grid-2" style="gap:20px;align-items:start">
                <!-- Calendrier -->
                <div class="card" style="grid-column:1/2">
                    <div class="card-header">
                        <div class="calendar-nav" style="width:100%">
                            <button class="btn btn-sm btn-ghost" id="btnPrevMonth">◀</button>
                            <span class="calendar-title" id="calendarTitle"></span>
                            <button class="btn btn-sm btn-ghost" id="btnNextMonth">▶</button>
                        </div>
                    </div>
                    <div class="card-body" id="calendarContainer"></div>
                </div>

                <!-- Liste des événements -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Événements à venir</span>
                        <select class="filter-select" id="filterTypeEvenement" style="font-size:12px">
                            <option value="">Tous types</option>
                            <option value="formation">Formation</option>
                            <option value="réunion">Réunion</option>
                            <option value="consultation">Consultation</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>
                    <div style="max-height:500px;overflow-y:auto" id="eventsList"></div>
                </div>
            </div>`;

        if (Auth.hasPermission('create_planning')) {
            document.getElementById('btnNewEvent').onclick = () => this.showForm();
        }

        document.getElementById('btnPrevMonth').onclick = () => {
            this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
            this.renderCalendar();
        };
        document.getElementById('btnNextMonth').onclick = () => {
            this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
            this.renderCalendar();
        };

        document.getElementById('filterTypeEvenement').addEventListener('change', () => this.loadData());

        await this.loadData();
    },

    async loadData() {
        const typeFilter = document.getElementById('filterTypeEvenement')?.value;
        const res = await window.cfori.planning.getAll({ type_evenement: typeFilter || undefined });
        if (!res.success) { Toast.error(res.message); return; }
        this.events = res.data;
        this.renderCalendar();
        this.renderList();
    },

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const today = new Date();

        document.getElementById('calendarTitle').textContent =
            this.currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOffset = (firstDay + 6) % 7; // Lundi premier

        const jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        let html = `<div class="calendar-grid">
            ${jours.map(j => `<div class="calendar-day-header">${j}</div>`).join('')}`;

        // Cases vides avant le 1er
        for (let i = 0; i < startOffset; i++) {
            html += '<div class="calendar-day other-month"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayEvents = this.events.filter(e => e.date_debut && e.date_debut.startsWith(dateStr));

            html += `<div class="calendar-day${isToday ? ' today' : ''}" onclick="PlanningModule.showDayEvents('${dateStr}')">
                <div class="calendar-day-num">${day}</div>
                ${dayEvents.slice(0,2).map(e => `<div class="calendar-event" style="background:${e.couleur || 'var(--primary)'}">${Utils.truncate(e.titre, 15)}</div>`).join('')}
                ${dayEvents.length > 2 ? `<div style="font-size:9px;color:var(--text-muted)">+${dayEvents.length - 2} autre(s)</div>` : ''}
            </div>`;
        }

        html += '</div>';
        document.getElementById('calendarContainer').innerHTML = html;
    },

    renderList() {
        const now = new Date().toISOString();
        const upcoming = this.events
            .filter(e => e.date_debut >= now && e.statut !== 'annulé')
            .slice(0, 20);

        const container = document.getElementById('eventsList');
        if (upcoming.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-icon">📅</div><div class="empty-desc">Aucun événement à venir</div></div>`;
            return;
        }

        container.innerHTML = upcoming.map(e => `
            <div style="padding:12px 20px;border-bottom:1px solid var(--border-light);display:flex;gap:12px;align-items:center">
                <div style="width:4px;min-height:44px;border-radius:2px;background:${e.couleur || 'var(--primary)'}"></div>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:13px">${Utils.truncate(e.titre, 35)}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${Utils.formatDateTime(e.date_debut)} — ${e.lieu || 'Lieu non défini'}</div>
                    <div style="margin-top:4px">${Utils.statutBadge(e.statut)} <span class="badge badge-gray">${e.type_evenement}</span></div>
                </div>
                ${Auth.hasPermission('edit_planning') ? `<button class="btn btn-sm btn-ghost" onclick="PlanningModule.showForm(${e.id})">✏️</button>` : ''}
                ${Auth.isDG() ? `<button class="btn btn-sm btn-ghost" onclick="PlanningModule.deleteEvent(${e.id})" style="color:var(--error)">🗑</button>` : ''}
            </div>`).join('');
    },

    showDayEvents(dateStr) {
        const dayEvents = this.events.filter(e => e.date_debut && e.date_debut.startsWith(dateStr));
        const date = new Date(dateStr).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

        Modal.create(`📅 ${date}`, `
            ${dayEvents.length === 0
                ? '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-desc">Aucun événement ce jour</div></div>'
                : dayEvents.map(e => `
                    <div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:8px;border-left:4px solid ${e.couleur || 'var(--primary)'}">
                        <div style="font-weight:600">${e.titre}</div>
                        <div style="font-size:12px;color:var(--text-muted)">${Utils.formatDateTime(e.date_debut)} → ${Utils.formatDateTime(e.date_fin)}</div>
                        ${e.lieu ? `<div style="font-size:12px">📍 ${e.lieu}</div>` : ''}
                        ${e.description ? `<div style="font-size:12px;margin-top:4px">${e.description}</div>` : ''}
                        <div style="margin-top:6px">${Utils.statutBadge(e.statut)}</div>
                    </div>`).join('')}
            ${Auth.hasPermission('create_planning') ? `
                <div style="margin-top:16px;text-align:center">
                    <button class="btn btn-primary btn-sm" onclick="this.closest('.modal-overlay').remove();PlanningModule.showForm(null,'${dateStr}')">+ Ajouter un événement ce jour</button>
                </div>` : ''}`);
    },

    async showForm(id = null, defaultDate = null) {
        let e = null;
        if (id) {
            const res = await window.cfori.planning.getAll({});
            e = res.data?.find(x => x.id === id);
        }

        const usersRes = await window.cfori.users.getAll(Auth.getUser());
        const users = usersRes.success ? usersRes.data : [];

        const defDate = defaultDate || new Date().toISOString().slice(0,16);

        const overlay = Modal.create(id ? '✏️ Modifier l\'événement' : '+ Nouvel événement', `
            <div class="form-grid">
                <div class="form-group form-full">
                    <label>Titre *</label>
                    <input type="text" id="ev_titre" value="${e?.titre || ''}" placeholder="Titre de l'événement">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="ev_type">
                        ${['formation','réunion','consultation','autre'].map(t =>
                            `<option value="${t}" ${(e?.type_evenement || 'autre') === t ? 'selected':''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Statut</label>
                    <select id="ev_statut">
                        ${['planifié','confirmé','annulé','terminé'].map(s =>
                            `<option value="${s}" ${(e?.statut || 'planifié') === s ? 'selected':''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Début *</label>
                    <input type="datetime-local" id="ev_debut" value="${e?.date_debut?.slice(0,16) || defDate}">
                </div>
                <div class="form-group">
                    <label>Fin *</label>
                    <input type="datetime-local" id="ev_fin" value="${e?.date_fin?.slice(0,16) || defDate}">
                </div>
                <div class="form-group">
                    <label>Lieu</label>
                    <input type="text" id="ev_lieu" value="${e?.lieu || ''}" placeholder="Salle, bâtiment...">
                </div>
                <div class="form-group">
                    <label>Responsable</label>
                    <select id="ev_responsable">
                        <option value="">-- Sélectionner --</option>
                        ${users.map(u => `<option value="${u.id}" ${e?.responsable_id == u.id ? 'selected':''}>${u.prenom} ${u.nom}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Couleur</label>
                    <input type="color" id="ev_couleur" value="${e?.couleur || '#01696f'}" style="height:38px;cursor:pointer">
                </div>
                <div class="form-group">
                    <label>Rappel (minutes avant)</label>
                    <input type="number" id="ev_rappel" value="${e?.rappel_minutes || 30}" min="0">
                </div>
                <div class="form-group form-full">
                    <label>Description</label>
                    <textarea id="ev_description" rows="2">${e?.description || ''}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnSaveEvent">💾 Enregistrer</button>
            </div>`);

        overlay.querySelector('#btnSaveEvent').onclick = async () => {
            const titre = document.getElementById('ev_titre').value.trim();
            const debut = document.getElementById('ev_debut').value;
            const fin = document.getElementById('ev_fin').value;
            if (!titre) { Toast.warning('Le titre est obligatoire'); return; }
            if (!debut || !fin) { Toast.warning('Les dates de début et fin sont obligatoires'); return; }

            const data = {
                titre,
                type_evenement: document.getElementById('ev_type').value,
                statut: document.getElementById('ev_statut').value,
                date_debut: debut,
                date_fin: fin,
                lieu: document.getElementById('ev_lieu').value,
                responsable_id: document.getElementById('ev_responsable').value || null,
                couleur: document.getElementById('ev_couleur').value,
                rappel_minutes: parseInt(document.getElementById('ev_rappel').value) || 30,
                description: document.getElementById('ev_description').value
            };

            const user = Auth.getUser();
            const res = id
                ? await window.cfori.planning.update(user, id, data)
                : await window.cfori.planning.create(user, data);

            if (res.success) {
                Toast.success(id ? 'Événement modifié' : 'Événement créé');
                overlay.remove();
                this.loadData();
                SyncClient.emit('data:changed', { type: 'planning', action: id ? 'update' : 'create' });
                SyncClient.emit('notification:send', {
                    message: `Nouvel événement: ${data.titre} le ${Utils.formatDateTime(data.date_debut)}`
                });
            } else {
                Toast.error(res.message);
            }
        };
    },

    async deleteEvent(id) {
        Modal.confirm('Supprimer cet événement ?', async () => {
            const res = await window.cfori.planning.delete(Auth.getUser(), id);
            if (res.success) {
                Toast.success('Événement supprimé');
                this.loadData();
            } else {
                Toast.error(res.message);
            }
        });
    }
};

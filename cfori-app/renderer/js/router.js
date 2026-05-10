/**
 * CFORI - Consulting | Routeur de navigation entre modules
 */

const Router = {
    currentModule: null,
    modules: {},

    register(name, module) {
        this.modules[name] = module;
    },

    async navigate(moduleName, params = {}) {
        // Masquer le module courant
        if (this.currentModule && this.modules[this.currentModule]) {
            const prev = this.modules[this.currentModule];
            if (prev.onLeave) prev.onLeave();
        }

        // Mettre à jour la navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.module === moduleName);
        });

        // Afficher la zone de contenu
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = '<div class="loading-overlay"><div class="loader"></div></div>';

        // Mettre à jour le breadcrumb
        const labels = {
            dashboard: 'Tableau de bord',
            planning: 'Planning & Agenda',
            formations: 'Formations',
            participants: 'Participants',
            clients: 'Clients & Dossiers',
            archives: 'Archives',
            comptabilite: 'Comptabilité',
            rapports: 'Rapports PDF',
            parametres: 'Paramètres'
        };
        document.getElementById('breadcrumbCurrent').textContent = labels[moduleName] || moduleName;

        // Charger le nouveau module
        this.currentModule = moduleName;
        const module = this.modules[moduleName];
        if (module && module.render) {
            try {
                await module.render(contentArea, params);
            } catch (error) {
                contentArea.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <div class="empty-title">Erreur de chargement</div>
                        <div class="empty-desc">${error.message}</div>
                    </div>`;
            }
        }
    }
};

// ============================================================
// SYSTÈME DE TOASTS (NOTIFICATIONS)
// ============================================================

const Toast = {
    show(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    },

    success(msg, duration) { this.show(msg, 'success', duration); },
    error(msg, duration) { this.show(msg, 'error', duration); },
    warning(msg, duration) { this.show(msg, 'warning', duration); },
    info(msg, duration) { this.show(msg, 'info', duration); }
};

// ============================================================
// MODAL UTILITAIRE
// ============================================================

const Modal = {
    create(title, bodyHtml, size = '') {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal ${size}">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="btn-close" id="modalClose">✕</button>
                </div>
                <div class="modal-body">${bodyHtml}</div>
            </div>`;
        document.body.appendChild(overlay);

        overlay.querySelector('#modalClose').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        return overlay;
    },

    confirm(message, onConfirm) {
        const overlay = this.create(
            'Confirmation',
            `<p>${message}</p>
             <div class="modal-footer" style="padding-top:16px;">
                 <button class="btn btn-outline" id="cancelBtn">Annuler</button>
                 <button class="btn btn-danger" id="confirmBtn">Confirmer</button>
             </div>`,
            'modal-sm'
        );
        overlay.querySelector('#cancelBtn').onclick = () => overlay.remove();
        overlay.querySelector('#confirmBtn').onclick = () => {
            overlay.remove();
            onConfirm();
        };
    }
};

// ============================================================
// UTILITAIRES
// ============================================================

const Utils = {
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    formatMontant(montant, devise = 'XAF') {
        return new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(montant || 0) + ' ' + devise;
    },

    formatFileSize(bytes) {
        if (!bytes) return '-';
        if (bytes < 1024) return bytes + ' o';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko';
        return (bytes / 1048576).toFixed(1) + ' Mo';
    },

    statutBadge(statut) {
        const map = {
            'planifié': 'info', 'en_cours': 'warning', 'terminé': 'success', 'annulé': 'error',
            'actif': 'success', 'inactif': 'gray', 'prospect': 'purple',
            'payé': 'success', 'en_attente': 'warning',
            'ouvert': 'info', 'clôturé': 'success', 'suspendu': 'warning',
            'validé': 'success', 'confirmé': 'success'
        };
        const cls = map[statut] || 'gray';
        return `<span class="badge badge-${cls}">${statut}</span>`;
    },

    escapeSql(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "''");
    },

    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    truncate(str, max = 40) {
        if (!str) return '-';
        return str.length > max ? str.substring(0, max) + '…' : str;
    }
};

/**
 * CFORI - Consulting | Gestion de l'authentification (côté renderer)
 */

const Auth = {
    currentUser: null,
    sessionTimeout: null,
    SESSION_DURATION: 2 * 60 * 60 * 1000, // 2 heures

    init() {
        // Récupérer l'utilisateur de la session
        const stored = sessionStorage.getItem('cfori_user');
        if (stored) {
            this.currentUser = JSON.parse(stored);
            this.resetTimeout();
        } else {
            // Pas de session, rediriger vers login
            window.location.href = 'index.html';
            return false;
        }
        // Écouter les événements pour réinitialiser le timeout
        document.addEventListener('mousemove', () => this.resetTimeout());
        document.addEventListener('keydown', () => this.resetTimeout());
        return true;
    },

    resetTimeout() {
        if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
        this.sessionTimeout = setTimeout(() => {
            this.logout('Votre session a expiré après 2 heures d\'inactivité.');
        }, this.SESSION_DURATION);
    },

    async logout(message = null) {
        if (this.currentUser) {
            await window.cfori.auth.logout(this.currentUser.id);
        }
        sessionStorage.removeItem('cfori_user');
        if (message) {
            sessionStorage.setItem('cfori_logout_message', message);
        }
        window.location.href = 'index.html';
    },

    getUser() {
        return this.currentUser;
    },

    hasPermission(action) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'DG') return true;

        const permissionsSecretaire = [
            'create_formation', 'edit_formation',
            'create_participant', 'edit_participant',
            'create_client', 'edit_client',
            'create_dossier', 'edit_dossier',
            'create_planning', 'edit_planning',
            'create_archive', 'view_comptabilite',
            'create_transaction', 'view_rapports'
        ];
        return permissionsSecretaire.includes(action);
    },

    isDG() {
        return this.currentUser && this.currentUser.role === 'DG';
    },

    isSecretaire() {
        return this.currentUser && this.currentUser.role === 'SECRETAIRE';
    },

    getUserInitials() {
        if (!this.currentUser) return '?';
        return (this.currentUser.prenom[0] + this.currentUser.nom[0]).toUpperCase();
    }
};

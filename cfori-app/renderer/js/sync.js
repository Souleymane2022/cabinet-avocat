/**
 * CFORI - Consulting | Client de synchronisation Socket.IO
 * Gère la connexion LAN entre le PC DG et le PC Secrétaire
 */

const SyncClient = {
    socket: null,
    serverIp: null,
    connected: false,
    reconnectTimer: null,
    RECONNECT_DELAY: 5000,

    async init(user) {
        // Charger la configuration
        const configRes = await window.cfori.config.get();
        const config = configRes.success ? configRes.data : {};
        this.currentUser = user;

        if (config.syncServerIp) {
            this.serverIp = config.syncServerIp;
            this.connect();
        } else if (user.role === 'DG') {
            // Le DG se connecte à son propre serveur local
            this.serverIp = 'localhost';
            this.connect();
        }
    },

    connect() {
        if (!this.serverIp) return;

        try {
            // Socket.IO est chargé via CDN dans app.html
            if (typeof io === 'undefined') return;

            const url = `http://${this.serverIp}:3001`;
            this.socket = io(url, {
                timeout: 5000,
                reconnection: true,
                reconnectionDelay: this.RECONNECT_DELAY,
                reconnectionAttempts: Infinity,
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                this.connected = true;
                this.updateUI(true);

                // Enregistrer l'utilisateur
                this.socket.emit('user:register', {
                    id: this.currentUser.id,
                    nom: this.currentUser.nom,
                    prenom: this.currentUser.prenom,
                    role: this.currentUser.role,
                    email: this.currentUser.email
                });
            });

            this.socket.on('disconnect', () => {
                this.connected = false;
                this.updateUI(false);
            });

            this.socket.on('connect_error', () => {
                this.connected = false;
                this.updateUI(false);
            });

            // Réception de changements de données
            this.socket.on('data:changed', (event) => {
                this.handleDataChange(event);
            });

            // Réception de notifications
            this.socket.on('notification:new', (notif) => {
                this.showNotification(notif);
            });

            // Connexion d'un utilisateur
            this.socket.on('user:connected', (user) => {
                Toast.info(`${user.prenom} ${user.nom} (${user.role}) s'est connecté`);
            });

            // Déconnexion d'un utilisateur
            this.socket.on('user:disconnected', (user) => {
                Toast.warning(`${user.prenom} ${user.nom} s'est déconnecté`);
            });

        } catch (err) {
            console.error('[SYNC CLIENT] Erreur connexion:', err.message);
        }
    },

    reconnect(newIp) {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.serverIp = newIp;
        this.connect();
    },

    testConnection(ip, callback) {
        if (typeof io === 'undefined') { callback(false); return; }

        const testSocket = io(`http://${ip}:3001`, {
            timeout: 3000,
            reconnection: false
        });

        const timer = setTimeout(() => {
            testSocket.disconnect();
            callback(false);
        }, 4000);

        testSocket.on('connect', () => {
            clearTimeout(timer);
            testSocket.disconnect();
            callback(true);
        });

        testSocket.on('connect_error', () => {
            clearTimeout(timer);
            callback(false);
        });
    },

    emit(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
        }
    },

    updateUI(connected) {
        const dot = document.getElementById('syncDot');
        const status = document.getElementById('syncStatus');
        if (dot && status) {
            if (connected) {
                dot.classList.add('connected');
                status.textContent = 'Synchronisé';
            } else {
                dot.classList.remove('connected');
                status.textContent = 'Hors ligne';
            }
        }
    },

    handleDataChange(event) {
        // Recharger le module courant si les données changées le concernent
        const moduleMap = {
            'formations': 'formations',
            'participants': 'participants',
            'clients': 'clients',
            'dossiers': 'clients',
            'planning': 'planning',
            'archives': 'archives',
            'transactions': 'comptabilite'
        };

        const currentModule = Router.currentModule;
        const affectedModule = moduleMap[event.type];

        if (affectedModule && currentModule === affectedModule) {
            // Recharger les données du module actuel
            const module = Router.modules[currentModule];
            if (module && module.loadData) {
                module.loadData();
            }
        }

        // Toujours mettre à jour le dashboard si on y est
        if (currentModule === 'dashboard') {
            const module = Router.modules['dashboard'];
            if (module && module.loadData) {
                const container = document.getElementById('dashboardContent');
                if (container) module.loadData(container);
            }
        }
    },

    showNotification(notif) {
        const sender = notif.from ? `${notif.from.prenom} ${notif.from.nom}` : 'Système';
        Toast.info(`📩 ${sender}: ${notif.message}`, 6000);
    }
};

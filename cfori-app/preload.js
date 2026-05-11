/**
 * CFORI - Consulting | Bridge sécurisé contextBridge
 * Expose les API du main process au renderer de façon sécurisée
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cfori', {
    // Authentification
    auth: {
        login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
        logout: (userId) => ipcRenderer.invoke('auth:logout', userId),
        changePassword: (data) => ipcRenderer.invoke('auth:changePassword', data)
    },

    // Utilisateurs
    users: {
        getAll: (currentUser) => ipcRenderer.invoke('users:getAll', currentUser),
        create: (currentUser, data) => ipcRenderer.invoke('users:create', { currentUser, data }),
        update: (currentUser, id, data) => ipcRenderer.invoke('users:update', { currentUser, id, data })
    },

    // Formations
    formations: {
        getAll: (filters) => ipcRenderer.invoke('formations:getAll', filters),
        getById: (id) => ipcRenderer.invoke('formations:getById', id),
        create: (currentUser, data) => ipcRenderer.invoke('formations:create', { currentUser, data }),
        update: (currentUser, id, data) => ipcRenderer.invoke('formations:update', { currentUser, id, data }),
        delete: (currentUser, id) => ipcRenderer.invoke('formations:delete', { currentUser, id })
    },

    // Participants
    participants: {
        getAll: (filters) => ipcRenderer.invoke('participants:getAll', filters),
        create: (currentUser, data) => ipcRenderer.invoke('participants:create', { currentUser, data }),
        update: (currentUser, id, data) => ipcRenderer.invoke('participants:update', { currentUser, id, data }),
        delete: (currentUser, id) => ipcRenderer.invoke('participants:delete', { currentUser, id })
    },

    // Clients
    clients: {
        getAll: (filters) => ipcRenderer.invoke('clients:getAll', filters),
        getById: (id) => ipcRenderer.invoke('clients:getById', id),
        create: (currentUser, data) => ipcRenderer.invoke('clients:create', { currentUser, data }),
        update: (currentUser, id, data) => ipcRenderer.invoke('clients:update', { currentUser, id, data }),
        delete: (currentUser, id) => ipcRenderer.invoke('clients:delete', { currentUser, id })
    },

    // Dossiers clients
    dossiers: {
        getAll: (clientId) => ipcRenderer.invoke('dossiers:getAll', clientId),
        create: (currentUser, data) => ipcRenderer.invoke('dossiers:create', { currentUser, data }),
        update: (currentUser, id, data) => ipcRenderer.invoke('dossiers:update', { currentUser, id, data })
    },

    // Planning
    planning: {
        getAll: (filters) => ipcRenderer.invoke('planning:getAll', filters),
        create: (currentUser, data) => ipcRenderer.invoke('planning:create', { currentUser, data }),
        update: (currentUser, id, data) => ipcRenderer.invoke('planning:update', { currentUser, id, data }),
        delete: (currentUser, id) => ipcRenderer.invoke('planning:delete', { currentUser, id })
    },

    // Archives
    archives: {
        getAll: (currentUser, filters) => ipcRenderer.invoke('archives:getAll', { currentUser, filters }),
        create: (currentUser, data) => ipcRenderer.invoke('archives:create', { currentUser, data }),
        delete: (currentUser, id) => ipcRenderer.invoke('archives:delete', { currentUser, id })
    },

    // Transactions
    transactions: {
        getAll: (filters) => ipcRenderer.invoke('transactions:getAll', filters),
        create: (currentUser, data) => ipcRenderer.invoke('transactions:create', { currentUser, data }),
        updateStatut: (currentUser, id, statut, montant) => ipcRenderer.invoke('transactions:updateStatut', { currentUser, id, statut, montant }),
        getSolde: () => ipcRenderer.invoke('transactions:getSolde'),
        getStatsParMois: (mois) => ipcRenderer.invoke('transactions:getStatsParMois', mois)
    },

    // Tableau de bord
    dashboard: {
        getStats: () => ipcRenderer.invoke('dashboard:getStats')
    },

    // Audit
    audit: {
        getLogs: (currentUser, limit) => ipcRenderer.invoke('audit:getLogs', { currentUser, limit })
    },

    // Rapports
    rapports: {
        log: (currentUser, data) => ipcRenderer.invoke('rapports:log', { currentUser, data })
    },

    // Fichiers et dialogs
    dialog: {
        openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
        saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options)
    },

    file: {
        open: (filePath) => ipcRenderer.invoke('file:open', filePath),
        save: (filePath, data) => ipcRenderer.invoke('file:save', { filePath, data })
    },

    // Configuration
    config: {
        get: () => ipcRenderer.invoke('config:get'),
        set: (config) => ipcRenderer.invoke('config:set', config)
    },

    // Synchronisation
    sync: {
        startServer: () => ipcRenderer.invoke('sync:startServer')
    }
});

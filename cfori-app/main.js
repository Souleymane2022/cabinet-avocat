/**
 * CFORI - Consulting | Processus principal Electron
 * Conseils Formations Orientations et Insertions
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');

let mainWindow = null;
let syncServer = null;

// Chemin des données utilisateur
const userDataPath = app.getPath('userData');
const uploadsPath = path.join(userDataPath, 'uploads');

// Créer le dossier uploads si nécessaire
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

// ============================================================
// GESTION DES PRIVILÈGES
// ============================================================

function checkPermission(user, action) {
    if (!user) return false;
    const permissionsDG = [
        'manage_users', 'view_logs', 'validate_transactions_large',
        'view_confidential', 'delete_archives', 'all'
    ];
    const permissionsSECRETAIRE = [
        'create_formation', 'edit_formation', 'create_participant',
        'edit_participant', 'create_client', 'edit_client',
        'create_dossier', 'edit_dossier', 'create_planning',
        'edit_planning', 'create_archive', 'view_comptabilite',
        'create_transaction', 'view_rapports'
    ];
    if (user.role === 'DG') return true;
    if (user.role === 'SECRETAIRE') return permissionsSECRETAIRE.includes(action);
    return false;
}

// ============================================================
// CRÉATION DE LA FENÊTRE PRINCIPALE
// ============================================================

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        title: 'CFORI - Consulting | Système de Gestion Interne',
        icon: path.join(__dirname, 'assets', 'logo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false,
        backgroundColor: '#f7f6f2'
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (syncServer) syncServer.close();
    });
}

// ============================================================
// INITIALISATION DE L'APPLICATION
// ============================================================

app.whenReady().then(async () => {
    // Initialiser la base de données
    await db.initDatabase(userDataPath);

    // Créer la fenêtre
    createWindow();

    // Démarrer le serveur de synchronisation si l'utilisateur est DG
    // (sera démarré après la connexion via IPC)

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ============================================================
// IPC - AUTHENTIFICATION
// ============================================================

ipcMain.handle('auth:login', async (event, { email, password }) => {
    try {
        const user = db.getUserByEmail(email);
        if (!user) return { success: false, message: 'Email ou mot de passe incorrect' };
        if (!user.actif) return { success: false, message: 'Compte désactivé' };

        const valid = db.verifyPassword(password, user.password_hash);
        if (!valid) return { success: false, message: 'Email ou mot de passe incorrect' };

        // Démarrer le serveur Socket.IO si DG
        if (user.role === 'DG' && !syncServer) {
            try {
                syncServer = require('./server/sync-server').startServer();
            } catch (e) {
                console.error('Erreur démarrage serveur sync:', e.message);
            }
        }

        db.logAudit(user.id, 'LOGIN', 'users', user.id);

        return {
            success: true,
            user: {
                id: user.id,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                role: user.role
            }
        };
    } catch (error) {
        return { success: false, message: 'Erreur interne: ' + error.message };
    }
});

ipcMain.handle('auth:logout', async (event, userId) => {
    db.logAudit(userId, 'LOGOUT', 'users', userId);
    return { success: true };
});

ipcMain.handle('auth:changePassword', async (event, { userId, oldPassword, newPassword }) => {
    try {
        const user = db.getUserById(userId);
        const fullUser = db.getUserByEmail(user.email);
        if (!db.verifyPassword(oldPassword, fullUser.password_hash)) {
            return { success: false, message: 'Ancien mot de passe incorrect' };
        }
        db.updateUser(userId, { password: newPassword }, userId);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ============================================================
// IPC - UTILISATEURS
// ============================================================

ipcMain.handle('users:getAll', async (event, currentUser) => {
    if (!checkPermission(currentUser, 'manage_users')) {
        return { success: false, message: 'Accès refusé' };
    }
    return { success: true, data: db.getUsers() };
});

ipcMain.handle('users:create', async (event, { currentUser, data }) => {
    if (!checkPermission(currentUser, 'manage_users')) {
        return { success: false, message: 'Accès refusé - Réservé au DG' };
    }
    try {
        const id = db.createUser(data, currentUser.id);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('users:update', async (event, { currentUser, id, data }) => {
    if (!checkPermission(currentUser, 'manage_users')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        db.updateUser(id, data, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ============================================================
// IPC - FORMATIONS
// ============================================================

ipcMain.handle('formations:getAll', async (event, filters) => {
    return { success: true, data: db.getFormations(filters || {}) };
});

ipcMain.handle('formations:getById', async (event, id) => {
    return { success: true, data: db.getFormationById(id) };
});

ipcMain.handle('formations:create', async (event, { currentUser, data }) => {
    if (!checkPermission(currentUser, 'create_formation')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        const id = db.createFormation(data, currentUser.id);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('formations:update', async (event, { currentUser, id, data }) => {
    if (!checkPermission(currentUser, 'edit_formation')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        db.updateFormation(id, data, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('formations:delete', async (event, { currentUser, id }) => {
    if (currentUser.role !== 'DG') {
        return { success: false, message: 'Suppression réservée au DG' };
    }
    try {
        db.deleteFormation(id, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ============================================================
// IPC - PARTICIPANTS
// ============================================================

ipcMain.handle('participants:getAll', async (event, filters) => {
    return { success: true, data: db.getParticipants(filters || {}) };
});

ipcMain.handle('participants:create', async (event, { currentUser, data }) => {
    if (!checkPermission(currentUser, 'create_participant')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        const id = db.createParticipant(data, currentUser.id);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('participants:update', async (event, { currentUser, id, data }) => {
    if (!checkPermission(currentUser, 'edit_participant')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        db.updateParticipant(id, data, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('participants:delete', async (event, { currentUser, id }) => {
    if (currentUser.role !== 'DG') {
        return { success: false, message: 'Suppression réservée au DG' };
    }
    try {
        db.deleteParticipant(id, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ============================================================
// IPC - CLIENTS
// ============================================================

ipcMain.handle('clients:getAll', async (event, filters) => {
    return { success: true, data: db.getClients(filters || {}) };
});

ipcMain.handle('clients:getById', async (event, id) => {
    return { success: true, data: db.getClientById(id) };
});

ipcMain.handle('clients:create', async (event, { currentUser, data }) => {
    if (!checkPermission(currentUser, 'create_client')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        const id = db.createClient(data, currentUser.id);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('clients:update', async (event, { currentUser, id, data }) => {
    if (!checkPermission(currentUser, 'edit_client')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        db.updateClient(id, data, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('clients:delete', async (event, { currentUser, id }) => {
    if (currentUser.role !== 'DG') {
        return { success: false, message: 'Suppression réservée au DG' };
    }
    try {
        db.deleteClient(id, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('dossiers:getAll', async (event, clientId) => {
    return { success: true, data: db.getDossiers(clientId) };
});

ipcMain.handle('dossiers:create', async (event, { currentUser, data }) => {
    if (!checkPermission(currentUser, 'create_dossier')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        const id = db.createDossier(data, currentUser.id);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('dossiers:update', async (event, { currentUser, id, data }) => {
    if (!checkPermission(currentUser, 'edit_dossier')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        db.updateDossier(id, data, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ============================================================
// IPC - PLANNING
// ============================================================

ipcMain.handle('planning:getAll', async (event, filters) => {
    return { success: true, data: db.getPlanningEvents(filters || {}) };
});

ipcMain.handle('planning:create', async (event, { currentUser, data }) => {
    if (!checkPermission(currentUser, 'create_planning')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        const id = db.createPlanningEvent(data, currentUser.id);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('planning:update', async (event, { currentUser, id, data }) => {
    if (!checkPermission(currentUser, 'edit_planning')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        db.updatePlanningEvent(id, data, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('planning:delete', async (event, { currentUser, id }) => {
    if (currentUser.role !== 'DG') {
        return { success: false, message: 'Suppression réservée au DG' };
    }
    try {
        db.deletePlanningEvent(id, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ============================================================
// IPC - ARCHIVES
// ============================================================

ipcMain.handle('archives:getAll', async (event, { currentUser, filters }) => {
    const f = filters || {};
    // Seul le DG peut voir les archives confidentielles
    if (currentUser.role !== 'DG') f.confidentiel = 0;
    return { success: true, data: db.getArchives(f) };
});

ipcMain.handle('archives:create', async (event, { currentUser, data }) => {
    if (!checkPermission(currentUser, 'create_archive')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        const id = db.createArchive(data, currentUser.id);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('archives:delete', async (event, { currentUser, id }) => {
    if (!checkPermission(currentUser, 'delete_archives')) {
        return { success: false, message: 'Suppression d\'archives réservée au DG' };
    }
    try {
        db.deleteArchive(id, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ============================================================
// IPC - TRANSACTIONS
// ============================================================

ipcMain.handle('transactions:getAll', async (event, filters) => {
    return { success: true, data: db.getTransactions(filters || {}) };
});

ipcMain.handle('transactions:create', async (event, { currentUser, data }) => {
    if (!checkPermission(currentUser, 'create_transaction')) {
        return { success: false, message: 'Accès refusé' };
    }
    try {
        const id = db.createTransaction(data, currentUser.id);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('transactions:updateStatut', async (event, { currentUser, id, statut, montant }) => {
    // Vérifier si la validation est autorisée
    if (montant > 100000 && currentUser.role !== 'DG') {
        return { success: false, message: 'Validation des transactions > 100 000 XAF réservée au DG' };
    }
    try {
        db.updateTransactionStatut(id, statut, currentUser.id);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('transactions:getSolde', async () => {
    return { success: true, data: db.getSoldeGlobal() };
});

ipcMain.handle('transactions:getStatsParMois', async (event, mois) => {
    return { success: true, data: db.getStatsParMois(mois || 6) };
});

// ============================================================
// IPC - TABLEAU DE BORD
// ============================================================

ipcMain.handle('dashboard:getStats', async () => {
    return { success: true, data: db.getDashboardStats() };
});

// ============================================================
// IPC - LOGS D'AUDIT
// ============================================================

ipcMain.handle('audit:getLogs', async (event, { currentUser, limit }) => {
    if (currentUser.role !== 'DG') {
        return { success: false, message: 'Accès aux logs réservé au DG' };
    }
    return { success: true, data: db.getAuditLogs(limit || 100) };
});

// ============================================================
// IPC - RAPPORTS
// ============================================================

ipcMain.handle('rapports:log', async (event, { currentUser, data }) => {
    try {
        const id = db.logRapport(data, currentUser.id);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ============================================================
// IPC - FICHIERS & DIALOGS
// ============================================================

ipcMain.handle('dialog:openFile', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: options?.filters || [
            { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'] },
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
            { name: 'Tous les fichiers', extensions: ['*'] }
        ]
    });
    if (result.canceled) return { success: false };

    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;

    // Copier dans le dossier uploads
    const destPath = path.join(uploadsPath, Date.now() + '_' + fileName);
    fs.copyFileSync(filePath, destPath);

    return { success: true, fileName, filePath: destPath, fileSize };
});

ipcMain.handle('dialog:saveFile', async (event, { defaultName, content }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName || 'rapport.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (result.canceled) return { success: false };
    return { success: true, filePath: result.filePath };
});

ipcMain.handle('file:open', async (event, filePath) => {
    try {
        await shell.openPath(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('file:save', async (event, { filePath, data }) => {
    try {
        const buffer = Buffer.from(data);
        fs.writeFileSync(filePath, buffer);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ============================================================
// IPC - CONFIGURATION
// ============================================================

const configPath = path.join(userDataPath, 'config.json');

ipcMain.handle('config:get', async () => {
    try {
        if (fs.existsSync(configPath)) {
            return { success: true, data: JSON.parse(fs.readFileSync(configPath, 'utf8')) };
        }
        return { success: true, data: { syncServerIp: '', syncEnabled: false } };
    } catch (e) {
        return { success: true, data: {} };
    }
});

ipcMain.handle('config:set', async (event, config) => {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('sync:startServer', async () => {
    try {
        if (!syncServer) {
            syncServer = require('./server/sync-server').startServer();
        }
        return { success: true, port: 3001 };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

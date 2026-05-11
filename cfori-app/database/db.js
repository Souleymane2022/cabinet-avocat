/**
 * CFORI - Consulting | Base de données SQLite via sql.js
 * (pur JavaScript/WebAssembly, aucune compilation C++ requise)
 */

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db = null;
let dbFilePath = null;

function saveDb() {
    if (db && dbFilePath) {
        const data = db.export();
        fs.writeFileSync(dbFilePath, Buffer.from(data));
    }
}

function dbRun(sql, params) {
    db.run(sql, params || []);
    saveDb();
}

function dbGet(sql, params) {
    const stmt = db.prepare(sql);
    if (params && params.length > 0) stmt.bind(params);
    let result = null;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    return result;
}

function dbAll(sql, params) {
    const stmt = db.prepare(sql);
    if (params && params.length > 0) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

function dbRunGetId(sql, params) {
    db.run(sql, params || []);
    const idResult = db.exec('SELECT last_insert_rowid()');
    const id = idResult[0].values[0][0];
    saveDb();
    return id;
}

async function initDatabase(userDataPath) {
    const initSqlJs = require('sql.js');
    const wasmDir = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist');
    const SQL = await initSqlJs({ locateFile: file => path.join(wasmDir, file) });

    dbFilePath = path.join(userDataPath, 'cfori.db');
    const schemaPath = path.join(__dirname, 'schema.sql');

    if (fs.existsSync(dbFilePath)) {
        const fileBuffer = fs.readFileSync(dbFilePath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');

    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    const row = dbGet('SELECT COUNT(*) as count FROM users', []);
    if (!row || row.count === 0) {
        const hash = bcrypt.hashSync('Admin@2025', 12);
        db.run(
            'INSERT INTO users (nom, prenom, email, password_hash, role, actif) VALUES (?, ?, ?, ?, ?, ?)',
            ['CFORI', 'Administrateur', 'admin@cfori.td', hash, 'DG', 1]
        );
    }

    saveDb();
}

function getDb() {
    if (!db) throw new Error('Base de données non initialisée');
    return db;
}

// ============================================================
// UTILISATEURS
// ============================================================

function getUsers() {
    return dbAll('SELECT id, nom, prenom, email, role, actif, created_at FROM users ORDER BY nom', []);
}

function getUserByEmail(email) {
    return dbGet('SELECT * FROM users WHERE email = ? AND actif = 1', [email]);
}

function getUserById(id) {
    return dbGet('SELECT id, nom, prenom, email, role, actif, created_at FROM users WHERE id = ?', [id]);
}

function createUser(data, createdBy) {
    const hash = bcrypt.hashSync(data.password, 12);
    const id = dbRunGetId(
        'INSERT INTO users (nom, prenom, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [data.nom, data.prenom, data.email, hash, data.role, createdBy]
    );
    logAudit(createdBy, 'CREATE_USER', 'users', id);
    return id;
}

function updateUser(id, data, updatedBy) {
    const setClauses = [];
    const values = [];
    if (data.nom !== undefined) { setClauses.push('nom = ?'); values.push(data.nom); }
    if (data.prenom !== undefined) { setClauses.push('prenom = ?'); values.push(data.prenom); }
    if (data.email !== undefined) { setClauses.push('email = ?'); values.push(data.email); }
    if (data.role !== undefined) { setClauses.push('role = ?'); values.push(data.role); }
    if (data.actif !== undefined) { setClauses.push('actif = ?'); values.push(data.actif); }
    if (data.password) { setClauses.push('password_hash = ?'); values.push(bcrypt.hashSync(data.password, 12)); }
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    dbRun(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, values);
    logAudit(updatedBy, 'UPDATE_USER', 'users', id);
}

function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

// ============================================================
// FORMATIONS
// ============================================================

function getFormations(filters = {}) {
    let query = 'SELECT f.*, u.nom || " " || u.prenom as createur FROM formations f LEFT JOIN users u ON f.created_by = u.id WHERE 1=1';
    const params = [];
    if (filters.statut) { query += ' AND f.statut = ?'; params.push(filters.statut); }
    if (filters.categorie) { query += ' AND f.categorie = ?'; params.push(filters.categorie); }
    if (filters.search) { query += ' AND (f.titre LIKE ? OR f.formateur LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`); }
    query += ' ORDER BY f.date_debut DESC';
    return dbAll(query, params);
}

function getFormationById(id) {
    return dbGet('SELECT * FROM formations WHERE id = ?', [id]);
}

function createFormation(data, createdBy) {
    const id = dbRunGetId(
        'INSERT INTO formations (titre, description, categorie, duree_heures, date_debut, date_fin, lieu, capacite_max, prix, formateur, statut, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.titre, data.description, data.categorie, data.duree_heures, data.date_debut, data.date_fin, data.lieu, data.capacite_max, data.prix, data.formateur, data.statut || 'planifié', createdBy]
    );
    logAudit(createdBy, 'CREATE_FORMATION', 'formations', id);
    return id;
}

function updateFormation(id, data, updatedBy) {
    dbRun(
        'UPDATE formations SET titre=?, description=?, categorie=?, duree_heures=?, date_debut=?, date_fin=?, lieu=?, capacite_max=?, prix=?, formateur=?, statut=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [data.titre, data.description, data.categorie, data.duree_heures, data.date_debut, data.date_fin, data.lieu, data.capacite_max, data.prix, data.formateur, data.statut, id]
    );
    logAudit(updatedBy, 'UPDATE_FORMATION', 'formations', id);
}

function deleteFormation(id, deletedBy) {
    dbRun('DELETE FROM formations WHERE id = ?', [id]);
    logAudit(deletedBy, 'DELETE_FORMATION', 'formations', id);
}

// ============================================================
// PARTICIPANTS
// ============================================================

function getParticipants(filters = {}) {
    let query = `SELECT p.*, f.titre as formation_titre, u.nom || ' ' || u.prenom as createur
                 FROM participants p LEFT JOIN formations f ON p.formation_id = f.id
                 LEFT JOIN users u ON p.created_by = u.id WHERE 1=1`;
    const params = [];
    if (filters.formation_id) { query += ' AND p.formation_id = ?'; params.push(filters.formation_id); }
    if (filters.statut_paiement) { query += ' AND p.statut_paiement = ?'; params.push(filters.statut_paiement); }
    if (filters.search) {
        query += ' AND (p.nom LIKE ? OR p.prenom LIKE ? OR p.email LIKE ? OR p.organisation LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    query += ' ORDER BY p.nom';
    return dbAll(query, params);
}

function getParticipantById(id) {
    return dbGet('SELECT * FROM participants WHERE id = ?', [id]);
}

function createParticipant(data, createdBy) {
    const id = dbRunGetId(
        'INSERT INTO participants (nom, prenom, email, telephone, organisation, poste, formation_id, statut_paiement, montant_paye, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.nom, data.prenom, data.email, data.telephone, data.organisation, data.poste, data.formation_id, data.statut_paiement || 'en_attente', data.montant_paye || 0, data.notes, createdBy]
    );
    logAudit(createdBy, 'CREATE_PARTICIPANT', 'participants', id);
    return id;
}

function updateParticipant(id, data, updatedBy) {
    dbRun(
        'UPDATE participants SET nom=?, prenom=?, email=?, telephone=?, organisation=?, poste=?, formation_id=?, statut_paiement=?, montant_paye=?, notes=? WHERE id=?',
        [data.nom, data.prenom, data.email, data.telephone, data.organisation, data.poste, data.formation_id, data.statut_paiement, data.montant_paye, data.notes, id]
    );
    logAudit(updatedBy, 'UPDATE_PARTICIPANT', 'participants', id);
}

function deleteParticipant(id, deletedBy) {
    dbRun('DELETE FROM participants WHERE id = ?', [id]);
    logAudit(deletedBy, 'DELETE_PARTICIPANT', 'participants', id);
}

// ============================================================
// CLIENTS
// ============================================================

function getClients(filters = {}) {
    let query = 'SELECT * FROM clients WHERE 1=1';
    const params = [];
    if (filters.statut) { query += ' AND statut = ?'; params.push(filters.statut); }
    if (filters.type_client) { query += ' AND type_client = ?'; params.push(filters.type_client); }
    if (filters.search) {
        query += ' AND (nom LIKE ? OR prenom LIKE ? OR raison_sociale LIKE ? OR email LIKE ? OR dossier_ref LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    query += ' ORDER BY nom';
    return dbAll(query, params);
}

function getClientById(id) {
    return dbGet('SELECT * FROM clients WHERE id = ?', [id]);
}

function createClient(data, createdBy) {
    const ref = data.dossier_ref || ('DOS-' + Date.now());
    const id = dbRunGetId(
        'INSERT INTO clients (nom, prenom, raison_sociale, type_client, email, telephone, adresse, ville, pays, secteur_activite, notes, dossier_ref, statut, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.nom, data.prenom, data.raison_sociale, data.type_client, data.email, data.telephone, data.adresse, data.ville, data.pays || 'Tchad', data.secteur_activite, data.notes, ref, data.statut || 'actif', createdBy]
    );
    logAudit(createdBy, 'CREATE_CLIENT', 'clients', id);
    return id;
}

function updateClient(id, data, updatedBy) {
    dbRun(
        'UPDATE clients SET nom=?, prenom=?, raison_sociale=?, type_client=?, email=?, telephone=?, adresse=?, ville=?, pays=?, secteur_activite=?, notes=?, statut=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [data.nom, data.prenom, data.raison_sociale, data.type_client, data.email, data.telephone, data.adresse, data.ville, data.pays, data.secteur_activite, data.notes, data.statut, id]
    );
    logAudit(updatedBy, 'UPDATE_CLIENT', 'clients', id);
}

function deleteClient(id, deletedBy) {
    dbRun('DELETE FROM clients WHERE id = ?', [id]);
    logAudit(deletedBy, 'DELETE_CLIENT', 'clients', id);
}

// ============================================================
// DOSSIERS CLIENTS
// ============================================================

function getDossiers(clientId = null) {
    let query = `SELECT d.*, c.nom || ' ' || COALESCE(c.prenom,'') as client_nom, u.nom || ' ' || u.prenom as responsable_nom
                 FROM dossiers_clients d LEFT JOIN clients c ON d.client_id = c.id LEFT JOIN users u ON d.responsable_id = u.id WHERE 1=1`;
    const params = [];
    if (clientId) { query += ' AND d.client_id = ?'; params.push(clientId); }
    query += ' ORDER BY d.created_at DESC';
    return dbAll(query, params);
}

function createDossier(data, createdBy) {
    const id = dbRunGetId(
        'INSERT INTO dossiers_clients (client_id, titre, description, type_service, date_ouverture, statut, responsable_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [data.client_id, data.titre, data.description, data.type_service, data.date_ouverture || new Date().toISOString().split('T')[0], data.statut || 'ouvert', data.responsable_id, data.notes]
    );
    logAudit(createdBy, 'CREATE_DOSSIER', 'dossiers_clients', id);
    return id;
}

function updateDossier(id, data, updatedBy) {
    dbRun(
        'UPDATE dossiers_clients SET titre=?, description=?, type_service=?, date_cloture=?, statut=?, responsable_id=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [data.titre, data.description, data.type_service, data.date_cloture, data.statut, data.responsable_id, data.notes, id]
    );
    logAudit(updatedBy, 'UPDATE_DOSSIER', 'dossiers_clients', id);
}

// ============================================================
// PLANNING
// ============================================================

function getPlanningEvents(filters = {}) {
    let query = `SELECT p.*, u.nom || ' ' || u.prenom as responsable_nom FROM planning p LEFT JOIN users u ON p.responsable_id = u.id WHERE 1=1`;
    const params = [];
    if (filters.date_debut) { query += ' AND p.date_fin >= ?'; params.push(filters.date_debut); }
    if (filters.date_fin) { query += ' AND p.date_debut <= ?'; params.push(filters.date_fin); }
    if (filters.type_evenement) { query += ' AND p.type_evenement = ?'; params.push(filters.type_evenement); }
    query += ' ORDER BY p.date_debut';
    return dbAll(query, params);
}

function createPlanningEvent(data, createdBy) {
    const id = dbRunGetId(
        'INSERT INTO planning (titre, description, type_evenement, date_debut, date_fin, lieu, responsable_id, participants_ids, statut, rappel_minutes, couleur, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.titre, data.description, data.type_evenement, data.date_debut, data.date_fin, data.lieu, data.responsable_id, JSON.stringify(data.participants_ids || []), data.statut || 'planifié', data.rappel_minutes || 30, data.couleur || '#01696f', createdBy]
    );
    logAudit(createdBy, 'CREATE_EVENT', 'planning', id);
    return id;
}

function updatePlanningEvent(id, data, updatedBy) {
    dbRun(
        'UPDATE planning SET titre=?, description=?, type_evenement=?, date_debut=?, date_fin=?, lieu=?, responsable_id=?, participants_ids=?, statut=?, rappel_minutes=?, couleur=? WHERE id=?',
        [data.titre, data.description, data.type_evenement, data.date_debut, data.date_fin, data.lieu, data.responsable_id, JSON.stringify(data.participants_ids || []), data.statut, data.rappel_minutes, data.couleur, id]
    );
    logAudit(updatedBy, 'UPDATE_EVENT', 'planning', id);
}

function deletePlanningEvent(id, deletedBy) {
    dbRun('DELETE FROM planning WHERE id = ?', [id]);
    logAudit(deletedBy, 'DELETE_EVENT', 'planning', id);
}

// ============================================================
// ARCHIVES
// ============================================================

function getArchives(filters = {}) {
    let query = `SELECT a.*, c.nom as client_nom, f.titre as formation_titre FROM archives a LEFT JOIN clients c ON a.client_id = c.id LEFT JOIN formations f ON a.formation_id = f.id WHERE 1=1`;
    const params = [];
    if (filters.categorie) { query += ' AND a.categorie = ?'; params.push(filters.categorie); }
    if (filters.type_document) { query += ' AND a.type_document = ?'; params.push(filters.type_document); }
    if (filters.confidentiel !== undefined) { query += ' AND a.confidentiel = ?'; params.push(filters.confidentiel); }
    if (filters.search) {
        query += ' AND (a.titre LIKE ? OR a.reference LIKE ? OR a.tags LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    query += ' ORDER BY a.created_at DESC';
    return dbAll(query, params);
}

function createArchive(data, createdBy) {
    const ref = data.reference || ('ARC-' + Date.now());
    const id = dbRunGetId(
        'INSERT INTO archives (titre, description, categorie, type_document, fichier_nom, fichier_path, fichier_taille, date_document, reference, tags, client_id, formation_id, confidentiel, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.titre, data.description, data.categorie, data.type_document, data.fichier_nom, data.fichier_path, data.fichier_taille || 0, data.date_document, ref, data.tags, data.client_id, data.formation_id, data.confidentiel || 0, createdBy]
    );
    logAudit(createdBy, 'CREATE_ARCHIVE', 'archives', id);
    return id;
}

function deleteArchive(id, deletedBy) {
    dbRun('DELETE FROM archives WHERE id = ?', [id]);
    logAudit(deletedBy, 'DELETE_ARCHIVE', 'archives', id);
}

// ============================================================
// TRANSACTIONS
// ============================================================

function getTransactions(filters = {}) {
    let query = `SELECT t.*, c.nom as client_nom, f.titre as formation_titre, u.nom || ' ' || u.prenom as createur
                 FROM transactions t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN formations f ON t.formation_id = f.id LEFT JOIN users u ON t.created_by = u.id WHERE 1=1`;
    const params = [];
    if (filters.type_transaction) { query += ' AND t.type_transaction = ?'; params.push(filters.type_transaction); }
    if (filters.statut) { query += ' AND t.statut = ?'; params.push(filters.statut); }
    if (filters.date_debut) { query += ' AND t.date_transaction >= ?'; params.push(filters.date_debut); }
    if (filters.date_fin) { query += ' AND t.date_transaction <= ?'; params.push(filters.date_fin); }
    if (filters.categorie) { query += ' AND t.categorie = ?'; params.push(filters.categorie); }
    query += ' ORDER BY t.date_transaction DESC';
    return dbAll(query, params);
}

function createTransaction(data, createdBy) {
    const id = dbRunGetId(
        'INSERT INTO transactions (type_transaction, categorie, montant, devise, description, reference_externe, date_transaction, mode_paiement, client_id, formation_id, statut, piece_justificative, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.type_transaction, data.categorie, data.montant, data.devise || 'XAF', data.description, data.reference_externe, data.date_transaction || new Date().toISOString().split('T')[0], data.mode_paiement, data.client_id, data.formation_id, data.statut || 'en_attente', data.piece_justificative, createdBy]
    );
    logAudit(createdBy, 'CREATE_TRANSACTION', 'transactions', id);
    return id;
}

function updateTransactionStatut(id, statut, updatedBy) {
    dbRun('UPDATE transactions SET statut = ? WHERE id = ?', [statut, id]);
    logAudit(updatedBy, 'UPDATE_TRANSACTION_STATUT', 'transactions', id);
}

function getSoldeGlobal() {
    const result = dbGet(`
        SELECT
            SUM(CASE WHEN type_transaction = 'recette' AND statut = 'validé' THEN montant ELSE 0 END) as total_recettes,
            SUM(CASE WHEN type_transaction = 'depense' AND statut = 'validé' THEN montant ELSE 0 END) as total_depenses
        FROM transactions
    `, []);
    return {
        recettes: result ? (result.total_recettes || 0) : 0,
        depenses: result ? (result.total_depenses || 0) : 0,
        solde: result ? ((result.total_recettes || 0) - (result.total_depenses || 0)) : 0
    };
}

function getStatsParMois(mois = 6) {
    return dbAll(`
        SELECT
            strftime('%Y-%m', date_transaction) as mois,
            SUM(CASE WHEN type_transaction = 'recette' THEN montant ELSE 0 END) as recettes,
            SUM(CASE WHEN type_transaction = 'depense' THEN montant ELSE 0 END) as depenses
        FROM transactions
        WHERE date_transaction >= date('now', '-${mois} months') AND statut = 'validé'
        GROUP BY mois ORDER BY mois
    `, []);
}

// ============================================================
// RAPPORTS
// ============================================================

function logRapport(data, generePar) {
    const id = dbRunGetId(
        'INSERT INTO rapports_logs (type_rapport, titre, parametres, genere_par, fichier_path) VALUES (?, ?, ?, ?, ?)',
        [data.type_rapport, data.titre, JSON.stringify(data.parametres || {}), generePar, data.fichier_path]
    );
    return id;
}

// ============================================================
// TABLEAU DE BORD
// ============================================================

function getDashboardStats() {
    const formations_actives = (dbGet("SELECT COUNT(*) as count FROM formations WHERE statut IN ('planifié','en_cours')", []) || {}).count || 0;
    const participants_mois = (dbGet("SELECT COUNT(*) as count FROM participants WHERE strftime('%Y-%m', date_inscription) = strftime('%Y-%m', 'now')", []) || {}).count || 0;
    const clients_actifs = (dbGet("SELECT COUNT(*) as count FROM clients WHERE statut = 'actif'", []) || {}).count || 0;
    const solde = getSoldeGlobal();
    const prochains_evenements = dbAll("SELECT * FROM planning WHERE date_debut >= datetime('now') AND statut != 'annulé' ORDER BY date_debut LIMIT 5", []);
    const stats_mois = getStatsParMois(6);
    return { formations_actives, participants_mois, clients_actifs, solde_mois: solde.solde, prochains_evenements, stats_mois };
}

// ============================================================
// AUDIT
// ============================================================

function logAudit(userId, action, table, recordId) {
    try {
        db.run(
            'INSERT INTO audit_logs (user_id, action, table_cible, enregistrement_id) VALUES (?, ?, ?, ?)',
            [userId, action, table, recordId]
        );
        saveDb();
    } catch (e) { /* ne pas bloquer les opérations principales */ }
}

function getAuditLogs(limit = 100) {
    return dbAll(
        `SELECT a.*, u.nom || ' ' || u.prenom as user_nom FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ?`,
        [limit]
    );
}

module.exports = {
    initDatabase, getDb,
    getUsers, getUserByEmail, getUserById, createUser, updateUser, verifyPassword,
    getFormations, getFormationById, createFormation, updateFormation, deleteFormation,
    getParticipants, getParticipantById, createParticipant, updateParticipant, deleteParticipant,
    getClients, getClientById, createClient, updateClient, deleteClient,
    getDossiers, createDossier, updateDossier,
    getPlanningEvents, createPlanningEvent, updatePlanningEvent, deletePlanningEvent,
    getArchives, createArchive, deleteArchive,
    getTransactions, createTransaction, updateTransactionStatut, getSoldeGlobal, getStatsParMois,
    logRapport, getDashboardStats, logAudit, getAuditLogs
};

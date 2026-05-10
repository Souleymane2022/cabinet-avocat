/**
 * CFORI - Consulting | Initialisation de la base de données SQLite
 */

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db = null;

function initDatabase(userDataPath) {
    const Database = require('better-sqlite3');
    const dbPath = path.join(userDataPath, 'cfori.db');
    const schemaPath = path.join(__dirname, 'schema.sql');

    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    // Lire et exécuter le schéma SQL
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    // Créer le compte DG par défaut si aucun utilisateur n'existe
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        const hash = bcrypt.hashSync('Admin@2025', 12);
        db.prepare(`
            INSERT INTO users (nom, prenom, email, password_hash, role, actif)
            VALUES ('CFORI', 'Administrateur', 'admin@cfori.td', ?, 'DG', 1)
        `).run(hash);
    }

    return db;
}

function getDb() {
    if (!db) throw new Error('Base de données non initialisée');
    return db;
}

// ============================================================
// FONCTIONS UTILISATEURS
// ============================================================

function getUsers() {
    return getDb().prepare('SELECT id, nom, prenom, email, role, actif, created_at FROM users ORDER BY nom').all();
}

function getUserByEmail(email) {
    return getDb().prepare('SELECT * FROM users WHERE email = ? AND actif = 1').get(email);
}

function getUserById(id) {
    return getDb().prepare('SELECT id, nom, prenom, email, role, actif, created_at FROM users WHERE id = ?').get(id);
}

function createUser(data, createdBy) {
    const hash = bcrypt.hashSync(data.password, 12);
    const result = getDb().prepare(`
        INSERT INTO users (nom, prenom, email, password_hash, role, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.nom, data.prenom, data.email, hash, data.role, createdBy);
    logAudit(createdBy, 'CREATE_USER', 'users', result.lastInsertRowid);
    return result.lastInsertRowid;
}

function updateUser(id, data, updatedBy) {
    const setClauses = [];
    const values = [];
    if (data.nom !== undefined) { setClauses.push('nom = ?'); values.push(data.nom); }
    if (data.prenom !== undefined) { setClauses.push('prenom = ?'); values.push(data.prenom); }
    if (data.email !== undefined) { setClauses.push('email = ?'); values.push(data.email); }
    if (data.role !== undefined) { setClauses.push('role = ?'); values.push(data.role); }
    if (data.actif !== undefined) { setClauses.push('actif = ?'); values.push(data.actif); }
    if (data.password) {
        setClauses.push('password_hash = ?');
        values.push(bcrypt.hashSync(data.password, 12));
    }
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    getDb().prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    logAudit(updatedBy, 'UPDATE_USER', 'users', id);
}

function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

// ============================================================
// FONCTIONS FORMATIONS
// ============================================================

function getFormations(filters = {}) {
    let query = 'SELECT f.*, u.nom || " " || u.prenom as createur FROM formations f LEFT JOIN users u ON f.created_by = u.id WHERE 1=1';
    const params = [];
    if (filters.statut) { query += ' AND f.statut = ?'; params.push(filters.statut); }
    if (filters.categorie) { query += ' AND f.categorie = ?'; params.push(filters.categorie); }
    if (filters.search) { query += ' AND (f.titre LIKE ? OR f.formateur LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`); }
    query += ' ORDER BY f.date_debut DESC';
    return getDb().prepare(query).all(...params);
}

function getFormationById(id) {
    return getDb().prepare('SELECT * FROM formations WHERE id = ?').get(id);
}

function createFormation(data, createdBy) {
    const result = getDb().prepare(`
        INSERT INTO formations (titre, description, categorie, duree_heures, date_debut, date_fin, lieu, capacite_max, prix, formateur, statut, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.titre, data.description, data.categorie, data.duree_heures, data.date_debut, data.date_fin, data.lieu, data.capacite_max, data.prix, data.formateur, data.statut || 'planifié', createdBy);
    logAudit(createdBy, 'CREATE_FORMATION', 'formations', result.lastInsertRowid);
    return result.lastInsertRowid;
}

function updateFormation(id, data, updatedBy) {
    getDb().prepare(`
        UPDATE formations SET titre=?, description=?, categorie=?, duree_heures=?, date_debut=?, date_fin=?, lieu=?, capacite_max=?, prix=?, formateur=?, statut=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(data.titre, data.description, data.categorie, data.duree_heures, data.date_debut, data.date_fin, data.lieu, data.capacite_max, data.prix, data.formateur, data.statut, id);
    logAudit(updatedBy, 'UPDATE_FORMATION', 'formations', id);
}

function deleteFormation(id, deletedBy) {
    getDb().prepare('DELETE FROM formations WHERE id = ?').run(id);
    logAudit(deletedBy, 'DELETE_FORMATION', 'formations', id);
}

// ============================================================
// FONCTIONS PARTICIPANTS
// ============================================================

function getParticipants(filters = {}) {
    let query = `SELECT p.*, f.titre as formation_titre, u.nom || ' ' || u.prenom as createur
                 FROM participants p
                 LEFT JOIN formations f ON p.formation_id = f.id
                 LEFT JOIN users u ON p.created_by = u.id WHERE 1=1`;
    const params = [];
    if (filters.formation_id) { query += ' AND p.formation_id = ?'; params.push(filters.formation_id); }
    if (filters.statut_paiement) { query += ' AND p.statut_paiement = ?'; params.push(filters.statut_paiement); }
    if (filters.search) {
        query += ' AND (p.nom LIKE ? OR p.prenom LIKE ? OR p.email LIKE ? OR p.organisation LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    query += ' ORDER BY p.nom';
    return getDb().prepare(query).all(...params);
}

function getParticipantById(id) {
    return getDb().prepare('SELECT * FROM participants WHERE id = ?').get(id);
}

function createParticipant(data, createdBy) {
    const result = getDb().prepare(`
        INSERT INTO participants (nom, prenom, email, telephone, organisation, poste, formation_id, statut_paiement, montant_paye, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.nom, data.prenom, data.email, data.telephone, data.organisation, data.poste, data.formation_id, data.statut_paiement || 'en_attente', data.montant_paye || 0, data.notes, createdBy);
    logAudit(createdBy, 'CREATE_PARTICIPANT', 'participants', result.lastInsertRowid);
    return result.lastInsertRowid;
}

function updateParticipant(id, data, updatedBy) {
    getDb().prepare(`
        UPDATE participants SET nom=?, prenom=?, email=?, telephone=?, organisation=?, poste=?, formation_id=?, statut_paiement=?, montant_paye=?, notes=? WHERE id=?
    `).run(data.nom, data.prenom, data.email, data.telephone, data.organisation, data.poste, data.formation_id, data.statut_paiement, data.montant_paye, data.notes, id);
    logAudit(updatedBy, 'UPDATE_PARTICIPANT', 'participants', id);
}

function deleteParticipant(id, deletedBy) {
    getDb().prepare('DELETE FROM participants WHERE id = ?').run(id);
    logAudit(deletedBy, 'DELETE_PARTICIPANT', 'participants', id);
}

// ============================================================
// FONCTIONS CLIENTS
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
    return getDb().prepare(query).all(...params);
}

function getClientById(id) {
    return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(id);
}

function createClient(data, createdBy) {
    const ref = 'DOS-' + Date.now();
    const result = getDb().prepare(`
        INSERT INTO clients (nom, prenom, raison_sociale, type_client, email, telephone, adresse, ville, pays, secteur_activite, notes, dossier_ref, statut, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.nom, data.prenom, data.raison_sociale, data.type_client, data.email, data.telephone, data.adresse, data.ville, data.pays || 'Tchad', data.secteur_activite, data.notes, data.dossier_ref || ref, data.statut || 'actif', createdBy);
    logAudit(createdBy, 'CREATE_CLIENT', 'clients', result.lastInsertRowid);
    return result.lastInsertRowid;
}

function updateClient(id, data, updatedBy) {
    getDb().prepare(`
        UPDATE clients SET nom=?, prenom=?, raison_sociale=?, type_client=?, email=?, telephone=?, adresse=?, ville=?, pays=?, secteur_activite=?, notes=?, statut=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(data.nom, data.prenom, data.raison_sociale, data.type_client, data.email, data.telephone, data.adresse, data.ville, data.pays, data.secteur_activite, data.notes, data.statut, id);
    logAudit(updatedBy, 'UPDATE_CLIENT', 'clients', id);
}

function deleteClient(id, deletedBy) {
    getDb().prepare('DELETE FROM clients WHERE id = ?').run(id);
    logAudit(deletedBy, 'DELETE_CLIENT', 'clients', id);
}

// ============================================================
// FONCTIONS DOSSIERS CLIENTS
// ============================================================

function getDossiers(clientId = null) {
    let query = `SELECT d.*, c.nom || ' ' || COALESCE(c.prenom,'') as client_nom, u.nom || ' ' || u.prenom as responsable_nom
                 FROM dossiers_clients d LEFT JOIN clients c ON d.client_id = c.id LEFT JOIN users u ON d.responsable_id = u.id WHERE 1=1`;
    const params = [];
    if (clientId) { query += ' AND d.client_id = ?'; params.push(clientId); }
    query += ' ORDER BY d.created_at DESC';
    return getDb().prepare(query).all(...params);
}

function createDossier(data, createdBy) {
    const result = getDb().prepare(`
        INSERT INTO dossiers_clients (client_id, titre, description, type_service, date_ouverture, statut, responsable_id, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.client_id, data.titre, data.description, data.type_service, data.date_ouverture || new Date().toISOString().split('T')[0], data.statut || 'ouvert', data.responsable_id, data.notes, createdBy);
    logAudit(createdBy, 'CREATE_DOSSIER', 'dossiers_clients', result.lastInsertRowid);
    return result.lastInsertRowid;
}

function updateDossier(id, data, updatedBy) {
    getDb().prepare(`
        UPDATE dossiers_clients SET titre=?, description=?, type_service=?, date_cloture=?, statut=?, responsable_id=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(data.titre, data.description, data.type_service, data.date_cloture, data.statut, data.responsable_id, data.notes, id);
    logAudit(updatedBy, 'UPDATE_DOSSIER', 'dossiers_clients', id);
}

// ============================================================
// FONCTIONS PLANNING
// ============================================================

function getPlanningEvents(filters = {}) {
    let query = `SELECT p.*, u.nom || ' ' || u.prenom as responsable_nom FROM planning p LEFT JOIN users u ON p.responsable_id = u.id WHERE 1=1`;
    const params = [];
    if (filters.date_debut) { query += ' AND p.date_fin >= ?'; params.push(filters.date_debut); }
    if (filters.date_fin) { query += ' AND p.date_debut <= ?'; params.push(filters.date_fin); }
    if (filters.type_evenement) { query += ' AND p.type_evenement = ?'; params.push(filters.type_evenement); }
    query += ' ORDER BY p.date_debut';
    return getDb().prepare(query).all(...params);
}

function createPlanningEvent(data, createdBy) {
    const result = getDb().prepare(`
        INSERT INTO planning (titre, description, type_evenement, date_debut, date_fin, lieu, responsable_id, participants_ids, statut, rappel_minutes, couleur, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.titre, data.description, data.type_evenement, data.date_debut, data.date_fin, data.lieu, data.responsable_id, JSON.stringify(data.participants_ids || []), data.statut || 'planifié', data.rappel_minutes || 30, data.couleur || '#01696f', createdBy);
    logAudit(createdBy, 'CREATE_EVENT', 'planning', result.lastInsertRowid);
    return result.lastInsertRowid;
}

function updatePlanningEvent(id, data, updatedBy) {
    getDb().prepare(`
        UPDATE planning SET titre=?, description=?, type_evenement=?, date_debut=?, date_fin=?, lieu=?, responsable_id=?, participants_ids=?, statut=?, rappel_minutes=?, couleur=? WHERE id=?
    `).run(data.titre, data.description, data.type_evenement, data.date_debut, data.date_fin, data.lieu, data.responsable_id, JSON.stringify(data.participants_ids || []), data.statut, data.rappel_minutes, data.couleur, id);
    logAudit(updatedBy, 'UPDATE_EVENT', 'planning', id);
}

function deletePlanningEvent(id, deletedBy) {
    getDb().prepare('DELETE FROM planning WHERE id = ?').run(id);
    logAudit(deletedBy, 'DELETE_EVENT', 'planning', id);
}

// ============================================================
// FONCTIONS ARCHIVES
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
    return getDb().prepare(query).all(...params);
}

function createArchive(data, createdBy) {
    const ref = 'ARC-' + Date.now();
    const result = getDb().prepare(`
        INSERT INTO archives (titre, description, categorie, type_document, fichier_nom, fichier_path, fichier_taille, date_document, reference, tags, client_id, formation_id, confidentiel, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.titre, data.description, data.categorie, data.type_document, data.fichier_nom, data.fichier_path, data.fichier_taille || 0, data.date_document, data.reference || ref, data.tags, data.client_id, data.formation_id, data.confidentiel || 0, createdBy);
    logAudit(createdBy, 'CREATE_ARCHIVE', 'archives', result.lastInsertRowid);
    return result.lastInsertRowid;
}

function deleteArchive(id, deletedBy) {
    getDb().prepare('DELETE FROM archives WHERE id = ?').run(id);
    logAudit(deletedBy, 'DELETE_ARCHIVE', 'archives', id);
}

// ============================================================
// FONCTIONS TRANSACTIONS
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
    return getDb().prepare(query).all(...params);
}

function createTransaction(data, createdBy) {
    const result = getDb().prepare(`
        INSERT INTO transactions (type_transaction, categorie, montant, devise, description, reference_externe, date_transaction, mode_paiement, client_id, formation_id, statut, piece_justificative, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.type_transaction, data.categorie, data.montant, data.devise || 'XAF', data.description, data.reference_externe, data.date_transaction || new Date().toISOString().split('T')[0], data.mode_paiement, data.client_id, data.formation_id, data.statut || 'en_attente', data.piece_justificative, createdBy);
    logAudit(createdBy, 'CREATE_TRANSACTION', 'transactions', result.lastInsertRowid);
    return result.lastInsertRowid;
}

function updateTransactionStatut(id, statut, updatedBy) {
    getDb().prepare('UPDATE transactions SET statut = ? WHERE id = ?').run(statut, id);
    logAudit(updatedBy, 'UPDATE_TRANSACTION_STATUT', 'transactions', id);
}

function getSoldeGlobal() {
    const result = getDb().prepare(`
        SELECT
            SUM(CASE WHEN type_transaction = 'recette' AND statut = 'validé' THEN montant ELSE 0 END) as total_recettes,
            SUM(CASE WHEN type_transaction = 'depense' AND statut = 'validé' THEN montant ELSE 0 END) as total_depenses
        FROM transactions
    `).get();
    return {
        recettes: result.total_recettes || 0,
        depenses: result.total_depenses || 0,
        solde: (result.total_recettes || 0) - (result.total_depenses || 0)
    };
}

function getStatsParMois(mois = 6) {
    return getDb().prepare(`
        SELECT
            strftime('%Y-%m', date_transaction) as mois,
            SUM(CASE WHEN type_transaction = 'recette' THEN montant ELSE 0 END) as recettes,
            SUM(CASE WHEN type_transaction = 'depense' THEN montant ELSE 0 END) as depenses
        FROM transactions
        WHERE date_transaction >= date('now', '-${mois} months') AND statut = 'validé'
        GROUP BY mois
        ORDER BY mois
    `).all();
}

// ============================================================
// FONCTIONS RAPPORTS
// ============================================================

function logRapport(data, generePar) {
    const result = getDb().prepare(`
        INSERT INTO rapports_logs (type_rapport, titre, parametres, genere_par, fichier_path)
        VALUES (?, ?, ?, ?, ?)
    `).run(data.type_rapport, data.titre, JSON.stringify(data.parametres || {}), generePar, data.fichier_path);
    return result.lastInsertRowid;
}

// ============================================================
// FONCTIONS TABLEAU DE BORD
// ============================================================

function getDashboardStats() {
    const db = getDb();
    const formations_actives = db.prepare("SELECT COUNT(*) as count FROM formations WHERE statut IN ('planifié','en_cours')").get().count;
    const participants_mois = db.prepare("SELECT COUNT(*) as count FROM participants WHERE strftime('%Y-%m', date_inscription) = strftime('%Y-%m', 'now')").get().count;
    const clients_actifs = db.prepare("SELECT COUNT(*) as count FROM clients WHERE statut = 'actif'").get().count;
    const solde = getSoldeGlobal();
    const prochains_evenements = db.prepare("SELECT * FROM planning WHERE date_debut >= datetime('now') AND statut != 'annulé' ORDER BY date_debut LIMIT 5").all();
    const stats_mois = getStatsParMois(6);

    return {
        formations_actives,
        participants_mois,
        clients_actifs,
        solde_mois: solde.solde,
        prochains_evenements,
        stats_mois
    };
}

// ============================================================
// AUDIT LOG
// ============================================================

function logAudit(userId, action, table, recordId, oldValues = null, newValues = null) {
    try {
        getDb().prepare(`
            INSERT INTO audit_logs (user_id, action, table_cible, enregistrement_id, anciennes_valeurs, nouvelles_valeurs)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, action, table, recordId, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null);
    } catch (e) {
        // Ignorer les erreurs d'audit pour ne pas bloquer les opérations principales
    }
}

function getAuditLogs(limit = 100) {
    return getDb().prepare(`
        SELECT a.*, u.nom || ' ' || u.prenom as user_nom
        FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC LIMIT ?
    `).all(limit);
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

-- ============================================================
-- CFORI - Consulting | Schéma de base de données SQLite
-- Conseils Formations Orientations et Insertions
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('DG', 'SECRETAIRE')),
    actif INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des formations
CREATE TABLE IF NOT EXISTS formations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    description TEXT,
    categorie TEXT,
    duree_heures INTEGER,
    date_debut DATE,
    date_fin DATE,
    lieu TEXT,
    capacite_max INTEGER,
    prix REAL DEFAULT 0,
    formateur TEXT,
    statut TEXT DEFAULT 'planifié' CHECK(statut IN ('planifié','en_cours','terminé','annulé')),
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des participants
CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    telephone TEXT,
    organisation TEXT,
    poste TEXT,
    formation_id INTEGER REFERENCES formations(id) ON DELETE SET NULL,
    statut_paiement TEXT DEFAULT 'en_attente' CHECK(statut_paiement IN ('payé','en_attente','annulé')),
    montant_paye REAL DEFAULT 0,
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT,
    raison_sociale TEXT,
    type_client TEXT DEFAULT 'particulier' CHECK(type_client IN ('particulier','entreprise','organisation')),
    email TEXT,
    telephone TEXT,
    adresse TEXT,
    ville TEXT,
    pays TEXT DEFAULT 'Tchad',
    secteur_activite TEXT,
    notes TEXT,
    dossier_ref TEXT UNIQUE,
    statut TEXT DEFAULT 'actif' CHECK(statut IN ('actif','inactif','prospect')),
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des dossiers clients
CREATE TABLE IF NOT EXISTS dossiers_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    titre TEXT NOT NULL,
    description TEXT,
    type_service TEXT CHECK(type_service IN ('conseil','orientation','insertion','formation')),
    date_ouverture DATE DEFAULT (date('now')),
    date_cloture DATE,
    statut TEXT DEFAULT 'ouvert' CHECK(statut IN ('ouvert','en_cours','clôturé','suspendu')),
    responsable_id INTEGER REFERENCES users(id),
    notes TEXT,
    documents_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table du planning
CREATE TABLE IF NOT EXISTS planning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    description TEXT,
    type_evenement TEXT DEFAULT 'autre' CHECK(type_evenement IN ('formation','réunion','consultation','autre')),
    date_debut DATETIME NOT NULL,
    date_fin DATETIME NOT NULL,
    lieu TEXT,
    responsable_id INTEGER REFERENCES users(id),
    participants_ids TEXT DEFAULT '[]',
    statut TEXT DEFAULT 'planifié' CHECK(statut IN ('planifié','confirmé','annulé','terminé')),
    rappel_minutes INTEGER DEFAULT 30,
    couleur TEXT DEFAULT '#01696f',
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des archives
CREATE TABLE IF NOT EXISTS archives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    description TEXT,
    categorie TEXT,
    type_document TEXT DEFAULT 'autre' CHECK(type_document IN ('rapport','contrat','cv','certificat','autre')),
    fichier_nom TEXT,
    fichier_path TEXT,
    fichier_taille INTEGER DEFAULT 0,
    date_document DATE,
    reference TEXT UNIQUE,
    tags TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    formation_id INTEGER REFERENCES formations(id) ON DELETE SET NULL,
    confidentiel INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des transactions financières
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_transaction TEXT NOT NULL CHECK(type_transaction IN ('recette','depense')),
    categorie TEXT DEFAULT 'autre' CHECK(categorie IN ('formation','conseil','salaire','loyer','materiel','autre')),
    montant REAL NOT NULL,
    devise TEXT DEFAULT 'XAF',
    description TEXT,
    reference_externe TEXT,
    date_transaction DATE DEFAULT (date('now')),
    mode_paiement TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    formation_id INTEGER REFERENCES formations(id) ON DELETE SET NULL,
    statut TEXT DEFAULT 'en_attente' CHECK(statut IN ('validé','en_attente','annulé')),
    piece_justificative TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des logs de rapports
CREATE TABLE IF NOT EXISTS rapports_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_rapport TEXT NOT NULL,
    titre TEXT NOT NULL,
    parametres TEXT DEFAULT '{}',
    genere_par INTEGER REFERENCES users(id),
    genere_le DATETIME DEFAULT CURRENT_TIMESTAMP,
    fichier_path TEXT
);

-- Table des logs d'audit (sécurité)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    table_cible TEXT,
    enregistrement_id INTEGER,
    anciennes_valeurs TEXT,
    nouvelles_valeurs TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_participants_formation ON participants(formation_id);
CREATE INDEX IF NOT EXISTS idx_participants_statut ON participants(statut_paiement);
CREATE INDEX IF NOT EXISTS idx_dossiers_client ON dossiers_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_statut ON dossiers_clients(statut);
CREATE INDEX IF NOT EXISTS idx_planning_dates ON planning(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date_transaction);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type_transaction);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);

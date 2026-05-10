# CFORI - Consulting | Système de Gestion Interne

> **Conseils • Formations • Orientations • Insertions**  
> Application desktop Electron.js — 100% hors ligne, synchronisation LAN

---

## Prérequis

- **Node.js** v18 ou supérieur : https://nodejs.org
- **npm** v8 ou supérieur (inclus avec Node.js)
- **Windows 10/11** (build Windows) ou Linux/macOS (développement)

---

## Installation rapide

```bash
# 1. Cloner ou copier le dossier cfori-app
cd cfori-app

# 2. Installer les dépendances
npm install

# 3. Lancer l'application
npm start
```

---

## Connexion par défaut (première utilisation)

| Champ | Valeur |
|-------|--------|
| Email | `admin@cfori.td` |
| Mot de passe | `Admin@2025` |
| Rôle | Directeur Général |

> **Important :** Changez le mot de passe lors de la première connexion.

---

## Configuration réseau LAN (2 PCs)

### Architecture

```
PC Directeur Général (DG)          PC Secrétaire
┌─────────────────────┐            ┌──────────────────────┐
│  CFORI App          │            │  CFORI App           │
│  + Serveur Socket.IO│ ←── LAN ──→│  + Client Socket.IO  │
│  Port: 3001         │            │  IP: 192.168.x.x     │
└─────────────────────┘            └──────────────────────┘
```

### Étape 1 — Configuration du PC DG

1. Ouvrir CFORI sur le PC du DG
2. Se connecter avec le compte DG
3. Aller dans **Paramètres → Synchronisation réseau LAN**
4. Cliquer sur **▶ Démarrer le serveur**
5. Trouver l'adresse IP locale du PC DG :
   - Windows : `Win + R` → `cmd` → taper `ipconfig`
   - Chercher "Adresse IPv4" (ex: `192.168.1.10`)

### Étape 2 — Configuration du PC Secrétaire

1. Ouvrir CFORI sur le PC du Secrétaire
2. Se connecter avec le compte Secrétaire
3. Aller dans **Paramètres → Synchronisation réseau LAN**
4. Dans le champ **"IP du serveur DG"**, entrer l'IP du DG (ex: `192.168.1.10`)
5. Cliquer sur **🔌 Tester la connexion**
6. Si le test est positif ✅, cliquer sur **💾 Sauvegarder**

### Vérification

- Un **point vert** en haut à droite indique que la synchronisation est active
- Les modifications effectuées sur un PC sont visibles en temps réel sur l'autre

### Dépannage réseau

| Problème | Solution |
|----------|----------|
| Point rouge (hors ligne) | Vérifier que les 2 PCs sont sur le même réseau Wi-Fi/LAN |
| Connexion refusée | Vérifier que le serveur est démarré sur le PC DG |
| Pare-feu Windows | Autoriser Node.js dans le pare-feu Windows (port 3001) |
| IP incorrecte | Revérifier l'IP avec `ipconfig` sur le PC DG |

---

## Créer un compte Secrétaire

1. Se connecter avec le compte DG
2. Aller dans **Paramètres → Gestion des utilisateurs**
3. Cliquer sur **+ Nouvel utilisateur**
4. Remplir les informations et choisir le rôle **Secrétaire**
5. Définir un mot de passe provisoire
6. Communiquer les identifiants au Secrétaire

---

## Compilation pour Windows (exécutable)

```bash
# Installation d'electron-builder (si pas déjà fait)
npm install

# Compilation
npm run build

# Le fichier .exe se trouve dans le dossier dist/
```

### Redistribution

Le dossier `dist/` contient un installateur `.exe` (NSIS) pour Windows.  
L'application est autonome — **pas de connexion Internet requise** en utilisation normale.

---

## Structure des fichiers

```
cfori-app/
├── main.js              → Processus principal Electron (IPC, sécurité)
├── preload.js           → Bridge sécurisé contextBridge
├── package.json         → Dépendances et scripts npm
├── database/
│   ├── schema.sql       → Schéma SQLite (tables, index)
│   └── db.js            → Fonctions d'accès aux données
├── server/
│   └── sync-server.js   → Serveur Socket.IO (PC DG)
├── renderer/
│   ├── index.html       → Écran de connexion
│   ├── app.html         → Interface principale
│   ├── css/
│   │   └── style.css    → Styles CFORI
│   └── js/
│       ├── auth.js      → Gestion session et permissions
│       ├── router.js    → Navigation + toasts + modals
│       ├── sync.js      → Client Socket.IO
│       └── modules/
│           ├── dashboard.js    → Tableau de bord
│           ├── formations.js   → Gestion formations
│           ├── participants.js → Gestion participants
│           ├── clients.js      → Clients & dossiers
│           ├── planning.js     → Agenda calendrier
│           ├── archives.js     → Gestion documents
│           ├── comptabilite.js → Transactions financières
│           ├── rapports.js     → Génération PDF
│           └── parametres.js   → Configuration (DG)
└── assets/
    └── logo.png         → Logo CFORI
```

---

## Données et base de données

- La base de données SQLite est stockée localement dans le dossier de données utilisateur :
  - **Windows** : `%APPDATA%\cfori-app\cfori.db`
  - **Linux** : `~/.config/cfori-app/cfori.db`
- Les fichiers uploadés (archives) sont dans le sous-dossier `uploads/`
- **Sauvegarde recommandée** : copier régulièrement le fichier `cfori.db`

---

## Rôles et permissions

### Directeur Général (DG)
- ✅ Accès complet à tous les modules
- ✅ Création/modification des comptes utilisateurs
- ✅ Validation des transactions > 100 000 XAF
- ✅ Accès aux documents confidentiels
- ✅ Suppression des archives
- ✅ Consultation des logs d'audit
- ✅ Démarrage du serveur de synchronisation

### Secrétaire
- ✅ Créer/modifier : formations, participants, clients, dossiers, planning
- ✅ Ajouter des archives
- ✅ Enregistrer des transactions (validation si ≤ 100 000 XAF)
- ✅ Générer des rapports PDF
- ❌ Créer des comptes utilisateurs
- ❌ Voir les logs d'audit
- ❌ Documents confidentiels
- ❌ Supprimer des archives
- ❌ Valider transactions > 100 000 XAF

---

## Génération PDF

L'application génère 6 types de rapports :

| Rapport | Description |
|---------|-------------|
| Rapport mensuel | Synthèse complète de l'activité |
| Liste participants | Export d'une formation avec ses participants |
| Bilan financier | Recettes/dépenses sur une période |
| Fiche client | Profil complet + dossiers |
| Attestation | Certificat de formation individuel |
| Planning mensuel | Calendrier des événements |

Tous les PDF incluent :
- En-tête CFORI avec logo et coordonnées
- Corps du rapport formaté
- Pied de page avec numéro de page et date

---

## Sécurité

- Mots de passe hashés avec **bcrypt** (12 rounds)
- Session expirée après **2 heures** d'inactivité
- Validation des permissions côté **main process** (pas uniquement renderer)
- **Journalisation** de toutes les actions sensibles (audit_logs)
- **contextIsolation** activé dans Electron

---

## Support

Pour toute question ou assistance :  
**CFORI - Consulting** | Réseau International CFORI  
*la solution contemporaine*

/**
 * CFORI - Consulting | Module Rapports PDF
 * Utilise jsPDF + jspdf-autotable (chargés via CDN dans app.html)
 */

const RapportsModule = {
    // En-tête CFORI en base64 (logo simplifié SVG encodé)
    LOGO_B64: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" rx="12" fill="#01696f"/><text x="30" y="38" font-size="28" text-anchor="middle" fill="white" font-family="Arial">🏛</text></svg>`),

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">📊 Rapports PDF</div>
                    <div class="page-subtitle">Génération de rapports et documents officiels CFORI</div>
                </div>
            </div>

            <div class="grid-2" style="gap:20px">
                ${this.renderRapportCard('📋', 'Rapport mensuel d\'activité', 'Synthèse des activités du mois : formations, participants, clients, événements.', 'rapport-mensuel')}
                ${this.renderRapportCard('👥', 'Liste des participants', 'Export PDF de la liste des participants pour une formation donnée.', 'liste-participants')}
                ${this.renderRapportCard('💰', 'Bilan financier', 'Synthèse des recettes et dépenses sur une période choisie.', 'bilan-financier')}
                ${this.renderRapportCard('🤝', 'Fiche client', 'Fiche complète d\'un client avec ses dossiers.', 'fiche-client')}
                ${this.renderRapportCard('🏆', 'Attestation de formation', 'Certificat individuel de participation pour un participant.', 'attestation')}
                ${this.renderRapportCard('📅', 'Planning mensuel', 'Export du planning des événements du mois en cours.', 'planning-mensuel')}
            </div>`;

        // Attacher les gestionnaires
        document.querySelectorAll('[data-rapport]').forEach(btn => {
            btn.addEventListener('click', () => this.showRapportForm(btn.dataset.rapport));
        });
    },

    renderRapportCard(icon, titre, desc, type) {
        return `
            <div class="card" style="transition:transform 0.2s;cursor:pointer" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
                <div class="card-body" style="padding:24px">
                    <div style="font-size:36px;margin-bottom:12px">${icon}</div>
                    <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">${titre}</div>
                    <div style="font-size:12px;color:var(--text-light);margin-bottom:16px">${desc}</div>
                    <button class="btn btn-primary w-full" data-rapport="${type}">📄 Générer le rapport</button>
                </div>
            </div>`;
    },

    async showRapportForm(type) {
        const forms = {
            'rapport-mensuel': this.formRapportMensuel.bind(this),
            'liste-participants': this.formListeParticipants.bind(this),
            'bilan-financier': this.formBilanFinancier.bind(this),
            'fiche-client': this.formFicheClient.bind(this),
            'attestation': this.formAttestation.bind(this),
            'planning-mensuel': this.formPlanningMensuel.bind(this)
        };
        if (forms[type]) forms[type]();
    },

    // ---- Formulaires de paramétrage ----

    formRapportMensuel() {
        const now = new Date();
        const overlay = Modal.create('📋 Rapport mensuel d\'activité', `
            <div class="form-group">
                <label>Mois</label>
                <input type="month" id="r_mois" value="${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnGenRapport">📄 Générer PDF</button>
            </div>`, 'modal-sm');

        overlay.querySelector('#btnGenRapport').onclick = async () => {
            const mois = document.getElementById('r_mois').value;
            overlay.remove();
            await this.genererRapportMensuel(mois);
        };
    },

    formListeParticipants() {
        window.cfori.formations.getAll({}).then(res => {
            const formations = res.success ? res.data : [];
            const overlay = Modal.create('👥 Liste des participants', `
                <div class="form-group">
                    <label>Formation *</label>
                    <select id="r_formation">
                        <option value="">-- Sélectionner une formation --</option>
                        ${formations.map(f => `<option value="${f.id}" data-titre="${f.titre}">${Utils.truncate(f.titre, 50)}</option>`).join('')}
                    </select>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                    <button class="btn btn-primary" id="btnGenListe">📄 Générer PDF</button>
                </div>`, 'modal-sm');

            overlay.querySelector('#btnGenListe').onclick = async () => {
                const sel = document.getElementById('r_formation');
                const formationId = sel.value;
                if (!formationId) { Toast.warning('Veuillez sélectionner une formation'); return; }
                const titre = sel.options[sel.selectedIndex].dataset.titre;
                overlay.remove();
                await this.genererListeParticipants(formationId, titre);
            };
        });
    },

    formBilanFinancier() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];

        const overlay = Modal.create('💰 Bilan financier', `
            <div class="form-grid">
                <div class="form-group">
                    <label>Date début</label>
                    <input type="date" id="r_debut" value="${firstDay}">
                </div>
                <div class="form-group">
                    <label>Date fin</label>
                    <input type="date" id="r_fin" value="${lastDay}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnGenBilan">📄 Générer PDF</button>
            </div>`, 'modal-sm');

        overlay.querySelector('#btnGenBilan').onclick = async () => {
            const debut = document.getElementById('r_debut').value;
            const fin = document.getElementById('r_fin').value;
            overlay.remove();
            await this.genererBilanFinancier(debut, fin);
        };
    },

    formFicheClient() {
        window.cfori.clients.getAll({}).then(res => {
            const clients = res.success ? res.data : [];
            const overlay = Modal.create('🤝 Fiche client', `
                <div class="form-group">
                    <label>Client *</label>
                    <select id="r_client">
                        <option value="">-- Sélectionner un client --</option>
                        ${clients.map(c => `<option value="${c.id}">${c.prenom ? c.prenom + ' ' : ''}${c.nom} ${c.raison_sociale ? '(' + c.raison_sociale + ')' : ''}</option>`).join('')}
                    </select>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                    <button class="btn btn-primary" id="btnGenFiche">📄 Générer PDF</button>
                </div>`, 'modal-sm');

            overlay.querySelector('#btnGenFiche').onclick = async () => {
                const clientId = document.getElementById('r_client').value;
                if (!clientId) { Toast.warning('Veuillez sélectionner un client'); return; }
                overlay.remove();
                await this.genererFicheClient(clientId);
            };
        });
    },

    formAttestation() {
        window.cfori.participants.getAll({}).then(res => {
            const participants = res.success ? res.data : [];
            const overlay = Modal.create('🏆 Attestation de formation', `
                <div class="form-group">
                    <label>Participant *</label>
                    <select id="r_participant">
                        <option value="">-- Sélectionner un participant --</option>
                        ${participants.map(p => `<option value="${p.id}">${p.prenom} ${p.nom} ${p.formation_titre ? '— ' + Utils.truncate(p.formation_titre, 30) : ''}</option>`).join('')}
                    </select>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                    <button class="btn btn-primary" id="btnGenAttestation">📄 Générer PDF</button>
                </div>`, 'modal-sm');

            overlay.querySelector('#btnGenAttestation').onclick = async () => {
                const participantId = parseInt(document.getElementById('r_participant').value);
                if (!participantId) { Toast.warning('Veuillez sélectionner un participant'); return; }
                const participant = participants.find(p => p.id === participantId);
                overlay.remove();
                await this.genererAttestation(participant);
            };
        });
    },

    formPlanningMensuel() {
        const now = new Date();
        const overlay = Modal.create('📅 Planning mensuel', `
            <div class="form-group">
                <label>Mois</label>
                <input type="month" id="r_planning_mois" value="${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button class="btn btn-primary" id="btnGenPlanning">📄 Générer PDF</button>
            </div>`, 'modal-sm');

        overlay.querySelector('#btnGenPlanning').onclick = async () => {
            const mois = document.getElementById('r_planning_mois').value;
            overlay.remove();
            await this.genererPlanningMensuel(mois);
        };
    },

    // ---- Fonctions de génération PDF ----

    creerDoc() {
        // jsPDF chargé via CDN
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        return doc;
    },

    ajouterEntete(doc, titre, sousTitre = '') {
        const couleurPrimaire = [1, 105, 111];
        const couleurSecondaire = [74, 74, 138];

        // Bande colorée en haut
        doc.setFillColor(...couleurPrimaire);
        doc.rect(0, 0, 210, 30, 'F');

        // Titre organisation
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('CFORI - Consulting', 20, 13);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Conseils • Formations • Orientations • Insertions', 20, 20);

        // Date à droite
        doc.setFontSize(8);
        doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 150, 13);

        // Ligne de séparation
        doc.setFillColor(...couleurSecondaire);
        doc.rect(0, 30, 210, 3, 'F');

        // Titre du rapport
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...couleurSecondaire);
        doc.text(titre, 20, 45);

        if (sousTitre) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(sousTitre, 20, 52);
        }

        return sousTitre ? 58 : 52;
    },

    ajouterPiedPage(doc, pageNum) {
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFillColor(1, 105, 111);
            doc.rect(0, 285, 210, 12, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(255, 255, 255);
            doc.text('Réseau International CFORI — la solution contemporaine', 20, 292);
            doc.text(`Page ${i} / ${totalPages}`, 175, 292);
        }
    },

    async sauvegarderEtTelecharger(doc, nomFichier, typeRapport, titre) {
        const result = await window.cfori.dialog.saveFile({ defaultName: nomFichier });
        if (result.success) {
            const pdfData = doc.output('arraybuffer');
            await window.cfori.file.save(result.filePath, Array.from(new Uint8Array(pdfData)));
            Toast.success(`PDF sauvegardé : ${nomFichier}`);

            // Logger le rapport
            await window.cfori.rapports.log(Auth.getUser(), {
                type_rapport: typeRapport,
                titre,
                parametres: { nomFichier },
                fichier_path: result.filePath
            });
        } else {
            // Téléchargement direct
            doc.save(nomFichier);
            Toast.success('PDF généré avec succès');
        }
    },

    // ---- Rapport mensuel ----
    async genererRapportMensuel(mois) {
        Toast.info('Génération du rapport mensuel en cours...');
        try {
            const [annee, moisNum] = mois.split('-');
            const dateDebut = `${mois}-01`;
            const dateFin = new Date(annee, moisNum, 0).toISOString().split('T')[0];

            const [statsRes, formationsRes, participantsRes, transactionsRes] = await Promise.all([
                window.cfori.dashboard.getStats(),
                window.cfori.formations.getAll({}),
                window.cfori.participants.getAll({}),
                window.cfori.transactions.getAll({ date_debut: dateDebut, date_fin: dateFin })
            ]);

            const doc = this.creerDoc();
            const nomMois = new Date(annee, moisNum - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            let y = this.ajouterEntete(doc, 'Rapport mensuel d\'activité', nomMois);

            // Statistiques
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(1, 105, 111);
            doc.text('RÉSUMÉ DE L\'ACTIVITÉ', 20, y + 8);
            y += 12;

            const stats = statsRes.data;
            const tableData = [
                ['Formations actives', stats.formations_actives],
                ['Participants ce mois', stats.participants_mois],
                ['Clients actifs', stats.clients_actifs],
                ['Solde global', Utils.formatMontant(stats.solde_mois)]
            ];

            doc.autoTable({
                startY: y,
                head: [['Indicateur', 'Valeur']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [1, 105, 111], textColor: 255 },
                margin: { left: 20, right: 20 }
            });
            y = doc.lastAutoTable.finalY + 10;

            // Formations du mois
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 74, 138);
            doc.text('FORMATIONS', 20, y + 6);
            y += 10;

            const formations = formationsRes.data || [];
            doc.autoTable({
                startY: y,
                head: [['Titre', 'Formateur', 'Dates', 'Statut']],
                body: formations.slice(0, 15).map(f => [
                    f.titre?.substring(0, 40) || '-',
                    f.formateur || '-',
                    `${Utils.formatDate(f.date_debut)} → ${Utils.formatDate(f.date_fin)}`,
                    f.statut
                ]),
                theme: 'striped',
                headStyles: { fillColor: [74, 74, 138], textColor: 255 },
                margin: { left: 20, right: 20 }
            });

            // Transactions
            if (transactionsRes.success && transactionsRes.data.length > 0) {
                y = doc.lastAutoTable.finalY + 10;
                doc.addPage();
                y = 20;
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(74, 74, 138);
                doc.text('TRANSACTIONS DU MOIS', 20, y);
                y += 8;

                doc.autoTable({
                    startY: y,
                    head: [['Date', 'Type', 'Description', 'Montant', 'Statut']],
                    body: transactionsRes.data.map(t => [
                        Utils.formatDate(t.date_transaction),
                        t.type_transaction,
                        (t.description || '-').substring(0, 35),
                        Utils.formatMontant(t.montant),
                        t.statut
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [1, 105, 111], textColor: 255 },
                    margin: { left: 20, right: 20 }
                });
            }

            this.ajouterPiedPage(doc);
            await this.sauvegarderEtTelecharger(doc, `rapport-mensuel-${mois}.pdf`, 'rapport-mensuel', `Rapport ${nomMois}`);
        } catch (err) {
            Toast.error('Erreur génération: ' + err.message);
        }
    },

    // ---- Liste participants ----
    async genererListeParticipants(formationId, formationTitre) {
        Toast.info('Génération de la liste en cours...');
        try {
            const res = await window.cfori.participants.getAll({ formation_id: formationId });
            const participants = res.data || [];

            const doc = this.creerDoc();
            let y = this.ajouterEntete(doc, 'Liste des participants', formationTitre);

            doc.autoTable({
                startY: y + 6,
                head: [['#', 'Nom complet', 'Organisation', 'Poste', 'Email', 'Téléphone', 'Paiement']],
                body: participants.map((p, i) => [
                    i + 1,
                    `${p.prenom} ${p.nom}`,
                    p.organisation || '-',
                    p.poste || '-',
                    p.email || '-',
                    p.telephone || '-',
                    p.statut_paiement
                ]),
                theme: 'grid',
                headStyles: { fillColor: [1, 105, 111], textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                margin: { left: 10, right: 10 },
                columnStyles: { 0: { cellWidth: 8 } }
            });

            this.ajouterPiedPage(doc);
            await this.sauvegarderEtTelecharger(doc, `participants-${formationId}.pdf`, 'liste-participants', `Participants — ${formationTitre}`);
        } catch (err) {
            Toast.error('Erreur: ' + err.message);
        }
    },

    // ---- Bilan financier ----
    async genererBilanFinancier(dateDebut, dateFin) {
        Toast.info('Génération du bilan en cours...');
        try {
            const res = await window.cfori.transactions.getAll({ date_debut: dateDebut, date_fin: dateFin });
            const transactions = res.data || [];

            const recettes = transactions.filter(t => t.type_transaction === 'recette' && t.statut === 'validé');
            const depenses = transactions.filter(t => t.type_transaction === 'depense' && t.statut === 'validé');
            const totalRecettes = recettes.reduce((s, t) => s + t.montant, 0);
            const totalDepenses = depenses.reduce((s, t) => s + t.montant, 0);

            const doc = this.creerDoc();
            let y = this.ajouterEntete(doc, 'Bilan financier', `Du ${Utils.formatDate(dateDebut)} au ${Utils.formatDate(dateFin)}`);

            // Synthèse
            doc.autoTable({
                startY: y + 8,
                head: [['Indicateur', 'Montant (XAF)']],
                body: [
                    ['Total recettes', Utils.formatMontant(totalRecettes)],
                    ['Total dépenses', Utils.formatMontant(totalDepenses)],
                    ['Solde net', Utils.formatMontant(totalRecettes - totalDepenses)]
                ],
                theme: 'grid',
                headStyles: { fillColor: [74, 74, 138], textColor: 255 },
                margin: { left: 20, right: 20 }
            });
            y = doc.lastAutoTable.finalY + 10;

            // Détail transactions
            doc.autoTable({
                startY: y,
                head: [['Date', 'Type', 'Catégorie', 'Description', 'Montant', 'Statut']],
                body: transactions.map(t => [
                    Utils.formatDate(t.date_transaction),
                    t.type_transaction,
                    t.categorie,
                    (t.description || '-').substring(0, 30),
                    Utils.formatMontant(t.montant),
                    t.statut
                ]),
                theme: 'striped',
                headStyles: { fillColor: [1, 105, 111], textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                margin: { left: 10, right: 10 }
            });

            this.ajouterPiedPage(doc);
            await this.sauvegarderEtTelecharger(doc, `bilan-${dateDebut}-${dateFin}.pdf`, 'bilan-financier', 'Bilan financier');
        } catch (err) {
            Toast.error('Erreur: ' + err.message);
        }
    },

    // ---- Fiche client ----
    async genererFicheClient(clientId) {
        Toast.info('Génération de la fiche client...');
        try {
            const [clientRes, dossiersRes] = await Promise.all([
                window.cfori.clients.getById(clientId),
                window.cfori.dossiers.getAll(clientId)
            ]);
            const c = clientRes.data;
            const dossiers = dossiersRes.data || [];

            const doc = this.creerDoc();
            const nomClient = `${c.prenom ? c.prenom + ' ' : ''}${c.nom}`;
            let y = this.ajouterEntete(doc, 'Fiche client', nomClient);

            doc.autoTable({
                startY: y + 6,
                head: [['Champ', 'Valeur']],
                body: [
                    ['Référence dossier', c.dossier_ref || '-'],
                    ['Type', c.type_client],
                    ['Raison sociale', c.raison_sociale || '-'],
                    ['Email', c.email || '-'],
                    ['Téléphone', c.telephone || '-'],
                    ['Adresse', `${c.adresse || '-'}, ${c.ville || ''}, ${c.pays || 'Tchad'}`],
                    ['Secteur', c.secteur_activite || '-'],
                    ['Statut', c.statut]
                ],
                theme: 'grid',
                headStyles: { fillColor: [1, 105, 111], textColor: 255 },
                margin: { left: 20, right: 20 }
            });

            if (dossiers.length > 0) {
                y = doc.lastAutoTable.finalY + 10;
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(74, 74, 138);
                doc.text('DOSSIERS', 20, y);
                doc.autoTable({
                    startY: y + 4,
                    head: [['Titre', 'Service', 'Ouverture', 'Statut', 'Responsable']],
                    body: dossiers.map(d => [
                        d.titre?.substring(0, 30) || '-',
                        d.type_service || '-',
                        Utils.formatDate(d.date_ouverture),
                        d.statut,
                        d.responsable_nom || '-'
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [74, 74, 138], textColor: 255 },
                    margin: { left: 20, right: 20 }
                });
            }

            this.ajouterPiedPage(doc);
            await this.sauvegarderEtTelecharger(doc, `fiche-client-${c.id}.pdf`, 'fiche-client', `Fiche — ${nomClient}`);
        } catch (err) {
            Toast.error('Erreur: ' + err.message);
        }
    },

    // ---- Attestation de formation ----
    async genererAttestation(participant) {
        Toast.info('Génération de l\'attestation...');
        try {
            const doc = this.creerDoc();
            doc.setFillColor(1, 105, 111);
            doc.rect(0, 0, 210, 297, 'F');
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(10, 10, 190, 277, 8, 8, 'F');

            // Logo / Titre
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(1, 105, 111);
            doc.text('CFORI - Consulting', 105, 35, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(74, 74, 138);
            doc.text('Conseils • Formations • Orientations • Insertions', 105, 43, { align: 'center' });

            doc.setFillColor(1, 105, 111);
            doc.rect(30, 47, 150, 1, 'F');

            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 74, 138);
            doc.text('ATTESTATION', 105, 70, { align: 'center' });
            doc.setFontSize(16);
            doc.text('DE FORMATION', 105, 82, { align: 'center' });

            doc.setFillColor(74, 74, 138);
            doc.rect(30, 86, 150, 1, 'F');

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 37, 29);
            doc.text('Nous soussignés, CFORI - Consulting, certifions que :', 105, 105, { align: 'center' });

            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(1, 105, 111);
            doc.text(`${participant.prenom} ${participant.nom}`.toUpperCase(), 105, 125, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 37, 29);
            if (participant.organisation) {
                doc.text(`de ${participant.organisation}${participant.poste ? ', ' + participant.poste : ''}`, 105, 135, { align: 'center' });
            }

            doc.text('a participé avec succès à la formation :', 105, 150, { align: 'center' });

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 74, 138);
            const titre = participant.formation_titre || 'Formation CFORI';
            doc.text(`"${titre}"`, 105, 165, { align: 'center', maxWidth: 160 });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 37, 29);
            doc.text(`En foi de quoi, la présente attestation lui est délivrée`, 105, 200, { align: 'center' });
            doc.text(`pour servir et valoir ce que de droit.`, 105, 208, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Délivrée le ${new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}`, 105, 225, { align: 'center' });

            // Signature
            doc.setFillColor(1, 105, 111);
            doc.rect(125, 240, 60, 0.5, 'F');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(1, 105, 111);
            doc.text('Le Directeur Général', 155, 250, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(74, 74, 138);
            doc.text('CFORI - Consulting', 155, 258, { align: 'center' });

            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Réseau International CFORI — la solution contemporaine', 105, 278, { align: 'center' });

            await this.sauvegarderEtTelecharger(doc,
                `attestation-${participant.nom}-${participant.prenom}.pdf`,
                'attestation',
                `Attestation — ${participant.prenom} ${participant.nom}`);
        } catch (err) {
            Toast.error('Erreur: ' + err.message);
        }
    },

    // ---- Planning mensuel ----
    async genererPlanningMensuel(mois) {
        Toast.info('Génération du planning en cours...');
        try {
            const [annee, moisNum] = mois.split('-');
            const dateDebut = `${mois}-01`;
            const dateFin = new Date(annee, moisNum, 0).toISOString().split('T')[0];

            const res = await window.cfori.planning.getAll({ date_debut: dateDebut, date_fin: dateFin + 'T23:59:59' });
            const events = res.data || [];
            const nomMois = new Date(annee, moisNum - 1).toLocaleDateString('fr-FR', { month:'long', year:'numeric' });

            const doc = this.creerDoc();
            let y = this.ajouterEntete(doc, 'Planning mensuel', nomMois);

            doc.autoTable({
                startY: y + 6,
                head: [['Date début', 'Titre', 'Type', 'Lieu', 'Responsable', 'Statut']],
                body: events.map(e => [
                    Utils.formatDateTime(e.date_debut),
                    e.titre?.substring(0, 35) || '-',
                    e.type_evenement || '-',
                    e.lieu || '-',
                    e.responsable_nom || '-',
                    e.statut
                ]),
                theme: 'striped',
                headStyles: { fillColor: [1, 105, 111], textColor: 255 },
                margin: { left: 10, right: 10 }
            });

            this.ajouterPiedPage(doc);
            await this.sauvegarderEtTelecharger(doc, `planning-${mois}.pdf`, 'planning-mensuel', `Planning ${nomMois}`);
        } catch (err) {
            Toast.error('Erreur: ' + err.message);
        }
    }
};

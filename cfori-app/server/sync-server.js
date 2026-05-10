/**
 * CFORI - Consulting | Serveur de synchronisation Socket.IO
 * Permet la synchronisation en temps réel entre le PC DG et le PC Secrétaire
 */

const http = require('http');
const { Server } = require('socket.io');

let server = null;
let io = null;
const PORT = 3001;

const utilisateursConnectes = new Map();

function startServer() {
    if (server) return server;

    server = http.createServer();
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('[SYNC] Nouveau client connecté:', socket.id);

        // Enregistrement de l'utilisateur
        socket.on('user:register', (userData) => {
            utilisateursConnectes.set(socket.id, {
                ...userData,
                socketId: socket.id,
                connectedAt: new Date().toISOString()
            });

            // Notifier tous les autres clients
            socket.broadcast.emit('user:connected', {
                ...userData,
                socketId: socket.id
            });

            // Envoyer la liste des utilisateurs connectés au nouveau client
            socket.emit('users:list', Array.from(utilisateursConnectes.values()));

            console.log(`[SYNC] Utilisateur enregistré: ${userData.nom} ${userData.prenom} (${userData.role})`);
        });

        // Synchronisation des données
        socket.on('data:changed', (event) => {
            // Relayer l'événement à tous les autres clients
            socket.broadcast.emit('data:changed', {
                ...event,
                timestamp: new Date().toISOString(),
                fromSocketId: socket.id
            });
            console.log(`[SYNC] Données modifiées: ${event.type} - ${event.action}`);
        });

        // Notification entre utilisateurs
        socket.on('notification:send', (notification) => {
            if (notification.toSocketId) {
                io.to(notification.toSocketId).emit('notification:new', {
                    ...notification,
                    timestamp: new Date().toISOString(),
                    from: utilisateursConnectes.get(socket.id)
                });
            } else {
                socket.broadcast.emit('notification:new', {
                    ...notification,
                    timestamp: new Date().toISOString(),
                    from: utilisateursConnectes.get(socket.id)
                });
            }
        });

        // Message direct entre utilisateurs
        socket.on('message:send', (message) => {
            socket.broadcast.emit('message:received', {
                ...message,
                timestamp: new Date().toISOString(),
                from: utilisateursConnectes.get(socket.id)
            });
        });

        // Déconnexion
        socket.on('disconnect', () => {
            const user = utilisateursConnectes.get(socket.id);
            utilisateursConnectes.delete(socket.id);

            if (user) {
                io.emit('user:disconnected', {
                    ...user,
                    disconnectedAt: new Date().toISOString()
                });
                console.log(`[SYNC] Utilisateur déconnecté: ${user.nom} ${user.prenom}`);
            }
        });

        // Ping/Pong pour vérifier la connexion
        socket.on('ping:check', () => {
            socket.emit('pong:response', { timestamp: Date.now() });
        });
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[SYNC] Serveur de synchronisation démarré sur le port ${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`[SYNC] Port ${PORT} déjà utilisé - serveur probablement déjà actif`);
        } else {
            console.error('[SYNC] Erreur serveur:', err);
        }
    });

    return server;
}

function stopServer() {
    if (io) io.close();
    if (server) server.close();
    server = null;
    io = null;
}

function getConnectedUsers() {
    return Array.from(utilisateursConnectes.values());
}

module.exports = { startServer, stopServer, getConnectedUsers };

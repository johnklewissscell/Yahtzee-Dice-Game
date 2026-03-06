const express = require('express');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Game sessions storage
const gameSessions = new Map();

// Player connections storage
const playerConnections = new Map();

class GameSession {
    constructor(gameCode, creatorId, creatorName, gameMode) {
        this.gameCode = gameCode;
        this.creatorId = creatorId;
        this.creatorName = creatorName;
        this.gameMode = gameMode; // 1-8 (number of players)
        this.players = new Map();
        this.gameStarted = false;
        this.scores = new Map();
        this.createdAt = Date.now();
        this.addPlayer(creatorId, creatorName);
    }

    addPlayer(playerId, playerName) {
        if (this.players.size >= this.gameMode) {
            return false;
        }
        this.players.set(playerId, { id: playerId, name: playerName });
        this.scores.set(playerId, {});
        return true;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.scores.delete(playerId);
    }

    isFull() {
        return this.players.size >= this.gameMode;
    }

    canStart() {
        if (this.gameMode === 1) {
            return true; // 1P can start immediately
        }
        return this.players.size >= 2; // 2-8P needs at least 2 players
    }

    getPlayerList() {
        return Array.from(this.players.values());
    }
}

// Generate unique game code
function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    const playerId = uuidv4();
    let currentGameCode = null;
    let currentPlayerName = null;

    console.log(`New client connected: ${playerId}`);

    playerConnections.set(playerId, { ws, gameCode: null });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(playerId, message, ws);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${playerId}`);
        // Let em leave session gracefully
        if (currentGameCode && gameSessions.has(currentGameCode)) {
            const session = gameSessions.get(currentGameCode);
            if (session.players.has(playerId)) {
                session.removePlayer(playerId);
                // Broadcast updated player list
                broadcastToGame(currentGameCode, {
                    type: 'playerLeft',
                    playerName: currentPlayerName,
                    players: session.getPlayerList()
                });
                // If no players left, delete session
                if (session.players.size === 0) {
                    gameSessions.delete(currentGameCode);
                }
            }
        }
        playerConnections.delete(playerId);
    });

    function handleMessage(playerId, message, ws) {
        switch (message.type) {
            case 'createGame': {
                const gameMode = message.gameMode;
                const playerName = message.playerName;
                let gameCode = generateGameCode();
                // Ensure unique code
                while (gameSessions.has(gameCode)) {
                    gameCode = generateGameCode();
                }
                const session = new GameSession(gameCode, playerId, playerName, gameMode);
                gameSessions.set(gameCode, session);
                currentGameCode = gameCode;
                currentPlayerName = playerName;
                playerConnections.get(playerId).gameCode = gameCode;

                ws.send(JSON.stringify({
                    type: 'gameCreated',
                    gameCode: gameCode,
                    players: session.getPlayerList(),
                    canStart: session.canStart()
                }));
                break;
            }

            case 'joinGame': {
                const gameCode = message.gameCode.toUpperCase();
                const playerName = message.playerName;

                if (!gameSessions.has(gameCode)) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Game code not found'
                    }));
                    return;
                }

                const session = gameSessions.get(gameCode);
                if (session.gameStarted) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Game has already started'
                    }));
                    return;
                }

                if (!session.addPlayer(playerId, playerName)) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Game is full'
                    }));
                    return;
                }

                currentGameCode = gameCode;
                currentPlayerName = playerName;
                playerConnections.get(playerId).gameCode = gameCode;

                ws.send(JSON.stringify({
                    type: 'gameJoined',
                    gameCode: gameCode,
                    players: session.getPlayerList(),
                    canStart: session.canStart()
                }));

                // Broadcast to others in the game
                broadcastToGame(gameCode, {
                    type: 'playerJoined',
                    playerName: playerName,
                    players: session.getPlayerList(),
                    canStart: session.canStart()
                }, playerId);
                break;
            }

            case 'startGame': {
                if (!currentGameCode || !gameSessions.has(currentGameCode)) {
                    ws.send(JSON.stringify({ type: 'error', message: 'No active game' }));
                    return;
                }

                const session = gameSessions.get(currentGameCode);
                if (!session.canStart()) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Not enough players to start'
                    }));
                    return;
                }

                session.gameStarted = true;
                broadcastToGame(currentGameCode, {
                    type: 'gameStarted',
                    players: session.getPlayerList()
                });
                break;
            }

            case 'updateScore': {
                if (!currentGameCode || !gameSessions.has(currentGameCode)) return;
                const session = gameSessions.get(currentGameCode);
                
                // Handle score update (can be a full object or just finalScore)
                let scoreData;
                if (typeof message.score === 'number') {
                    // Single final score from game completion
                    scoreData = { finalScore: message.score };
                } else {
                    // Full score object
                    scoreData = message.scores || {};
                }
                
                // Update player's score in the session
                const playerScores = session.scores.get(playerId) || {};
                session.scores.set(playerId, { ...playerScores, ...scoreData });

                // Broadcast to all players in the game
                const playersWithScores = session.getPlayerList().map(p => ({
                    ...p,
                    score: session.scores.get(p.id)?.finalScore || 0
                }));

                broadcastToGame(currentGameCode, {
                    type: 'playerScoreUpdate',
                    playerName: currentPlayerName,
                    score: scoreData.finalScore || 0,
                    allPlayers: playersWithScores
                });
                break;
            }

            case 'gameEnded': {
                if (!currentGameCode || !gameSessions.has(currentGameCode)) return;
                const session = gameSessions.get(currentGameCode);
                const finalScore = message.finalScore;
                session.scores.set(playerId, { ...session.scores.get(playerId), finalScore });

                const playersWithScores = session.getPlayerList().map(p => ({
                    ...p,
                    scores: session.scores.get(p.id)
                }));

                broadcastToGame(currentGameCode, {
                    type: 'playerFinished',
                    playerName: currentPlayerName,
                    finalScore: finalScore,
                    allPlayers: playersWithScores
                });
                break;
            }
        }
    }
});

function broadcastToGame(gameCode, message, excludePlayerId = null) {
    const gameConnections = Array.from(playerConnections.values()).filter(
        conn => conn.gameCode === gameCode
    );

    gameConnections.forEach(conn => {
        if (conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.send(JSON.stringify(message));
        }
    });
}

// Routes
app.get('/api/game/:gameCode', (req, res) => {
    const gameCode = req.params.gameCode.toUpperCase();
    if (gameSessions.has(gameCode)) {
        const session = gameSessions.get(gameCode);
        res.json({
            exists: true,
            gameMode: session.gameMode,
            players: session.getPlayerList(),
            started: session.gameStarted
        });
    } else {
        res.json({ exists: false });
    }
});

console.log('Multiplayer Yahtzee server initialized');

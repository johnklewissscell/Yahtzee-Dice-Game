// WebSocket connection
let ws = null;
let playerName = null;
let selectedMode = null;
let currentGameCode = null;

// Connect to WebSocket server
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    ws.onopen = () => {
        console.log('Connected to game server');
    };

    ws.onmessage = (event) => {
    if (typeof event.data === "string" && event.data.startsWith("{")) {
        handleServerMessage(JSON.parse(event.data));
    } else {
        console.log("Server message:", event.data);
    }
};

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        setTimeout(initWebSocket, 3000);
    };
}

function handleServerMessage(message) {
    switch (message.type) {
        case 'gameCreated':
        case 'gameJoined':
            currentGameCode = message.gameCode;
            showGameCode(message.gameCode);
            updateWaitingRoom(message.players);
            updateStartButtonState(message.canStart);
            break;

        case 'playerJoined':
            updateWaitingRoom(message.players);
            updateStartButtonState(message.canStart);
            break;

        case 'playerLeft':
            updateWaitingRoom(message.players);
            break;

        case 'gameStarted':
            window.location.href = '/index.html?gameCode=' + currentGameCode;
            break;

        case 'error':
            alert('Error: ' + message.message);
            break;
    }
}

function showGameCode(code) {
    const display = document.getElementById('game-code-display');
    if (display) {
        display.style.display = 'block';
        document.getElementById('game-code-value').textContent = code;
    }
}

function updateWaitingRoom(players) {
    const waitingRoom = document.getElementById('waiting-room-players');
    if (!waitingRoom) return;
    waitingRoom.innerHTML = '';
    players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'waiting-player';
        div.textContent = player.name;
        waitingRoom.appendChild(div);
    });
}

function updateStartButtonState(canStart) {
    const startBtn = document.getElementById('start-game-button');
    if (startBtn) {
        startBtn.disabled = !canStart;
        startBtn.style.opacity = canStart ? '1' : '0.5';
        startBtn.style.cursor = canStart ? 'pointer' : 'not-allowed';
    }
}

// Function to handle the name change
function changePlayerName() {
    const nameInput = document.getElementById('name-input');
    const displayName = document.getElementById('player-name');
    
    const newName = nameInput.value;
    
    if (newName.trim() !== '') {
        playerName = newName;
        displayName.textContent = newName;
        nameInput.value = ''; 
    } else {
        alert('Please enter a valid name.');
    }
}

const enterNameButton = document.getElementById('enter-name-button');
enterNameButton.addEventListener('click', changePlayerName);

const nameInput = document.getElementById('name-input');
nameInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        changePlayerName();
    }
});

const mpDivs = document.querySelectorAll('.mp');

mpDivs.forEach(function(div) {
  div.addEventListener('click', function() {
    mpDivs.forEach(function(d) {
      d.classList.remove('selected');
    });
    this.classList.add('selected');
    selectedMode = parseInt(this.textContent);

    const gameCodeDiv = document.getElementById('game-code');
    const joinCodeDiv = document.getElementById('join-code');
    const orDiv = document.getElementById('or');
    const startBtn = document.getElementById('start-game-button');

    if (this.id === 'oneP') {
      gameCodeDiv.style.display = 'none';
      joinCodeDiv.style.display = 'none';
      orDiv.style.display = 'none';

      // Enable the start button immediately for 1P
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
    } else {
      gameCodeDiv.style.display = 'flex';
      joinCodeDiv.style.display = 'flex';
      orDiv.style.display = 'block';

      // Disable until server confirms enough players
      startBtn.disabled = true;
      startBtn.style.opacity = '0.5';
      startBtn.style.cursor = 'not-allowed';
    }
  });
});

// Create/Join game handlers
document.getElementById('join-game-button').addEventListener('click', () => {
    if (!playerName) {
        alert('Please enter a player name first');
        return;
    }
    if (!selectedMode) {
        alert('Please select a game mode');
        return;
    }

    sessionStorage.setItem('playerName', playerName);
    ws.send(JSON.stringify({
        type: 'createGame',
        gameMode: selectedMode,
        playerName: playerName
    }));
    document.getElementById('game-code-input').value = '';
});

document.getElementById('join-code-button').addEventListener('click', () => {
    if (!playerName) {
        alert('Please enter a player name first');
        return;
    }
    const joinCode = document.getElementById('join-code-input').value;
    if (!joinCode) {
        alert('Please enter a game code');
        return;
    }
    
    sessionStorage.setItem('playerName', playerName);
    ws.send(JSON.stringify({
        type: 'joinGame',
        gameCode: joinCode,
        playerName: playerName
    }));
    document.getElementById('join-code-input').value = '';
});

document.getElementById('start-game-button').addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected to server');
        return;
    }
    ws.send(JSON.stringify({ type: 'startGame' }));
});

// Initialize WebSocket on page load
window.addEventListener('load', () => {
    initWebSocket();
});

document.getElementById('start-game-button').addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected to server');
        return;
    }

    if (selectedMode === 1) {
        // 1-player: go directly to game
        sessionStorage.setItem('playerName', playerName || 'Player1');
        window.location.href = '/public/index.html';
    } else {
        // Multiplayer: send start request to server
        ws.send(JSON.stringify({ type: 'startGame' }));
    }
});


document.addEventListener("DOMContentLoaded", () => {
    let playerName = null;
    let selectedMode = null;
    let currentGameCode = null;

    // Change player name
    function changePlayerName() {
        const nameInput = document.getElementById("name-input");
        const displayName = document.getElementById("player-name");
        const newName = nameInput.value.trim();

        if (newName !== "") {
            playerName = newName;
            displayName.textContent = newName;
            nameInput.value = "";
        } else {
            alert("Please enter a valid name.");
        }
    }

    // Generate a random 6-character game code
    function generateGameCode() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        currentGameCode = code;
        document.getElementById("game-code-input").value = code;
        document.getElementById("game-code-display").style.display = "block";
        document.getElementById("game-code-value").textContent = code;

        // Update waiting room with creator
        updateWaitingRoom([{ name: playerName || "Player1" }]);
        updateStartButtonState(true);
    }

    // Update waiting room
    function updateWaitingRoom(players) {
        const waitingRoom = document.getElementById("waiting-room-players");
        waitingRoom.innerHTML = "";
        players.forEach((player) => {
            const div = document.createElement("div");
            div.className = "waiting-player";
            div.textContent = player.name;
            waitingRoom.appendChild(div);
        });
    }

    // Enable or disable start button
    function updateStartButtonState(canStart) {
        const startBtn = document.getElementById("start-game-button");
        startBtn.disabled = !canStart;
        startBtn.style.opacity = canStart ? "1" : "0.5";
        startBtn.style.cursor = canStart ? "pointer" : "not-allowed";
    }

    // Event listeners
    const enterNameButton = document.getElementById("enter-name-button");
    if (enterNameButton) {
        enterNameButton.addEventListener("click", changePlayerName);
    }

    const nameInput = document.getElementById("name-input");
    if (nameInput) {
        nameInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") changePlayerName();
        });
    }

    // Multiplayer mode selection
    const mpDivs = document.querySelectorAll(".mp");
    mpDivs.forEach((div) => {
        div.addEventListener("click", () => {
            mpDivs.forEach((d) => d.classList.remove("selected"));
            div.classList.add("selected");
            selectedMode = parseInt(div.textContent);

            const gameCodeDiv = document.getElementById("game-code");
            const joinCodeDiv = document.getElementById("join-code");
            const orDiv = document.getElementById("or");

            if (div.id === "oneP") {
                gameCodeDiv.style.display = "none";
                joinCodeDiv.style.display = "none";
                orDiv.style.display = "none";
                updateStartButtonState(true);
            } else {
                gameCodeDiv.style.display = "flex";
                joinCodeDiv.style.display = "flex";
                orDiv.style.display = "block";
                updateStartButtonState(false);
            }
        });
    });

    // Create game
    const generateBtn = document.getElementById("generate-code");
    if (generateBtn) {
        generateBtn.addEventListener("click", () => {
            if (!playerName) {
                alert("Please enter a player name first");
                return;
            }
            generateGameCode();
        });
    }

    const createBtn = document.getElementById("join-game-button");
    if (createBtn) {
        createBtn.addEventListener("click", () => {
            if (!playerName) {
                alert("Please enter a player name first");
                return;
            }
            generateGameCode();
        });
    }

    // Join game
    const joinBtn = document.getElementById("join-code-button");
    if (joinBtn) {
        joinBtn.addEventListener("click", () => {
            if (!playerName) {
                alert("Please enter a player name first");
                return;
            }

            const joinCode = document.getElementById("join-code-input").value.trim();
            if (!joinCode) {
                alert("Please enter a game code");
                return;
            }

            currentGameCode = joinCode;
            updateWaitingRoom([{ name: playerName }]);
            document.getElementById("game-code-display").style.display = "block";
            document.getElementById("game-code-value").textContent = currentGameCode;
            updateStartButtonState(true);
        });
    }

    // Start game
    const startBtn = document.getElementById("start-game-button");
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            if (!playerName) playerName = "Player1";
            sessionStorage.setItem("playerName", playerName);
            sessionStorage.setItem("gameCode", currentGameCode || "");
            window.location.href = "play.html";
        });
    }
});
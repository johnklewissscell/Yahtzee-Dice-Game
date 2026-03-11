import { rtdb } from "./api.js";
import {
  ref,
  set,
  get,
  update,
  onValue,
  onDisconnect,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  let playerName = sessionStorage.getItem("defaultPlayerName") || null;
  let selectedMode = null;
  let currentGameCode = null;
  let isHost = false;

  if (playerName) {
    const displayName = document.getElementById("player-name");
    displayName.textContent = playerName;
  }

  function changePlayerName() {
    const nameInput = document.getElementById("name-input");
    const displayName = document.getElementById("player-name");
    const newName = nameInput.value.trim();
    if (!newName) return alert("Please enter a valid name.");
    if (newName.length > 15)
      return alert("Name must be 15 characters or less.");
    playerName = newName;
    displayName.textContent = newName;
    nameInput.value = "";
  }

  function generateGameCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    currentGameCode = code;
    document.getElementById("game-code-input").value = code;
  }

  function updateWaitingRoom(players) {
    const waitingRoom = document.getElementById("waiting-room-players");
    waitingRoom.innerHTML = "";
    players.forEach((p) => {
      const div = document.createElement("div");
      div.className = "waiting-player";
      div.textContent = p.name;
      waitingRoom.appendChild(div);
    });
    if (isHost) {
      const maxPlayers = selectedMode || 1;
      updateStartButtonState(players.length === maxPlayers);
    }
  }

  function updateStartButtonState(canStart) {
    const startBtn = document.getElementById("start-game-button");
    startBtn.disabled = !canStart;
    startBtn.style.opacity = canStart ? "1" : "0.5";
    startBtn.style.cursor = canStart ? "pointer" : "not-allowed";
  }

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

  document
    .getElementById("enter-name-button")
    ?.addEventListener("click", changePlayerName);
  document.getElementById("name-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") changePlayerName();
  });

  document.getElementById("generate-code")?.addEventListener("click", () => {
    if (!playerName) return alert("Enter a name first");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    currentGameCode = code;
    document.getElementById("game-code-input").value = code;
  });

  document
  .getElementById("join-game-button")
  ?.addEventListener("click", async () => {
    if (!playerName) return alert("Enter a name first");
    if (!selectedMode) return alert("Select player count first");

    currentGameCode = document
      .getElementById("game-code-input")
      .value.trim()
      .toUpperCase();

    if (!currentGameCode) return alert("Generate a game code first");

    const gameRef = ref(rtdb, "games/" + currentGameCode);
    const snapshot = await get(gameRef);

    if (snapshot.exists()) {
      return alert("Game code already exists. Generate another.");
    }

    await set(gameRef, {
      host: playerName,
      status: "waiting",
      maxPlayers: selectedMode,
      players: {
        [playerName]: { name: playerName },
      },
    });

    const playerRef = ref(rtdb, `games/${currentGameCode}/players/${playerName}`);
    onDisconnect(playerRef).remove();

    isHost = true;

    document.getElementById("game-code-display").style.display = "block";
    document.getElementById("game-code-value").textContent = currentGameCode;

    listenForPlayers(currentGameCode);
    listenForGameStatus(currentGameCode);
  });

  document
    .getElementById("start-game-button")
    ?.addEventListener("click", async () => {
      sessionStorage.setItem("playerName", playerName);
      sessionStorage.setItem("gameCode", currentGameCode);
      sessionStorage.setItem("isHost", isHost ? "true" : "false");

      if (selectedMode === 1) {
        window.location.href = "play.html";
        return;
      }

      const gameRef = ref(rtdb, "games/" + currentGameCode);
      await update(gameRef, { status: "started" });
    });

    document
  .getElementById("join-code-button")
  ?.addEventListener("click", async () => {
    if (!playerName) return alert("Enter a name first");

    const code = document.getElementById("join-code-input").value.trim().toUpperCase();
    if (!code) return alert("Enter a join code");

    const gameRef = ref(rtdb, "games/" + code);
    const snapshot = await get(gameRef);

    if (!snapshot.exists()) return alert("Game not found");

    const gameData = snapshot.val();

    if (gameData.status !== "waiting") return alert("Game already started");

    const players = gameData.players ? Object.keys(gameData.players) : [];
    if (players.includes(playerName)) return alert("Name already in use");
    if (players.length >= gameData.maxPlayers) return alert("Lobby is full");

    const playerRef = ref(rtdb, `games/${code}/players/${playerName}`);
    await set(playerRef, { name: playerName });
    onDisconnect(playerRef).remove();

    currentGameCode = code;
    isHost = false;

    listenForPlayers(code);
    listenForGameStatus(code);

    document.getElementById("game-code-display").style.display = "block";
    document.getElementById("game-code-value").textContent = code;
  });

  function listenForPlayers(code) {
    const playersRef = ref(rtdb, "games/" + code + "/players");
    onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const players = Object.values(data);
      updateWaitingRoom(players);
    });
  }

  function listenForGameStatus(code) {
    const gameRef = ref(rtdb, "games/" + code);
    onValue(gameRef, (snapshot) => {
      if (!snapshot.exists()) {
        window.location.href = "lobby.html";
        return;
      }

      const gameData = snapshot.val();

      if (gameData.status === "started") {
        sessionStorage.setItem("playerName", playerName || "Player1");
        sessionStorage.setItem("gameCode", currentGameCode || "");
        window.location.href = "play.html";
      }

      if (gameData.status === "finished") {
        set(ref(rtdb, "games/" + code), null);
        window.location.href = "lobby.html";
      }
    });
  }
});

import { db } from "./api.js";
import {
  ref,
  set,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const diceOne = '<img alt="1" src="images/dice-six-faces-one.png">';
const diceTwo = '<img alt="2" src="images/dice-six-faces-two.png">';
const diceThree = '<img alt="3" src="images/dice-six-faces-three.png">';
const diceFour = '<img alt="4" src="images/dice-six-faces-four.png">';
const diceFive = '<img alt="5" src="images/dice-six-faces-five.png">';
const diceSix = '<img alt="6" src="images/dice-six-faces-six.png">';

const diceArray = [diceOne, diceTwo, diceThree, diceFour, diceFive, diceSix];

const rollButton = document.getElementById("roll-button");
let finishedPlayers = {};
let acknowledgedPlayers = {};
let isHost = sessionStorage.getItem("isHost") === "true";
let totalPlayers = 0;
let totalTurns = 0;
let yahtzeeBonus = 0;
let startTime = null;
let timerInterval = null;

let ws = null;
let gameCode = null;
let isMultiplayer = false;
let playerScores = {};

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function startTimer() {
  if (startTime !== null) return;
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    document.getElementById("time-count").textContent = formatElapsed(elapsed);
  }, 500);
}

let gameCount;
const stored = sessionStorage.getItem("nextGameCount");
if (stored) {
  gameCount = parseInt(stored, 10) || 1;
  sessionStorage.removeItem("nextGameCount");
} else {
  gameCount = 1;
}
document.getElementById("game-count").textContent = gameCount;

function initMultiplayer() {
  const params = new URLSearchParams(window.location.search);
  gameCode = params.get("gameCode");

  if (gameCode) {
    isMultiplayer = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      const playerName = sessionStorage.getItem("playerName") || "Player";
      ws.send(
        JSON.stringify({
          type: "joinGame",
          gameCode: gameCode,
          playerName: playerName,
        }),
      );
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMultiplayerMessage(message);
    };

    ws.onclose = () => {
      window.location.href = "lobby.html";
    };
  }
}

function handleMultiplayerMessage(message) {
  switch (message.type) {
    case "startNewGame":
      sessionStorage.setItem("nextGameCount", message.nextGameCount);
      location.reload();
      break;
    case "gameJoined":
      if (message.allPlayers) {
        message.allPlayers.forEach((player) => {
          if (player.score) playerScores[player.name] = player.score;
        });
      }
      break;
    case "playerAcknowledged":
      acknowledgedPlayers[message.playerName] = true;

      if (Object.keys(acknowledgedPlayers).length === totalPlayers) {
        if (isHost) {
          newGameButton.disabled = false;
        }
      }
      break;
    case "playerScoreUpdate":
      playerScores[message.playerName] = message.score;
      const session = gameSessions.get(gameCode);
      if (
        message.allPlayers &&
        message.allPlayers.every((p) => playerScores[p.name])
      ) {
        displayFinalScores(playerScores);
      }
      break;
    case "playerFinished":
      finishedPlayers[message.playerName] = message.finalScore;

      if (message.allPlayers) {
        totalPlayers = message.allPlayers.length;
      }

      if (Object.keys(finishedPlayers).length === totalPlayers) {
        displayFinalScores(finishedPlayers);
      }
      break;
    case "gameEnded":
      displayFinalScores(message.scores);
      break;
    case "hostQuit":
      window.location.href = "lobby.html";
      break;
  }
}

window.addEventListener("load", () => {
  const playerName = sessionStorage.getItem("playerName");
  if (playerName) {
    document.getElementById("player-name").textContent = playerName;
  }

  const gameCode = sessionStorage.getItem("gameCode");
  if (gameCode) {
    const gameRef = ref(db, "games/" + gameCode);

    onValue(gameRef, (snapshot) => {
      if (!snapshot.exists()) {
        window.location.href = "lobby.html";
      }
    });
  }

  initMultiplayer();
});

const newGameButton = document.getElementById("new-game-button");
if (isMultiplayer && isHost) {
  newGameButton.disabled = true;
}

newGameButton.addEventListener("click", () => {
  const next = gameCount + 1;

  if (isMultiplayer && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "startNewGame",
        gameCode: gameCode,
        nextGameCount: next,
      }),
    );
  } else {
    sessionStorage.setItem("nextGameCount", next);
    location.reload();
  }
});

rollButton.addEventListener("click", () => {
  const playDice = [
    document.getElementById("playOne"),
    document.getElementById("playTwo"),
    document.getElementById("playThree"),
    document.getElementById("playFour"),
    document.getElementById("playFive"),
  ];

  const activeDice = playDice.filter((die) => die.style.display !== "none");
  const keeperDice = Array.from(document.querySelectorAll(".keepDice")).filter(
    (d) => d.innerHTML.trim(),
  );

  if (activeDice.length === 0 && keeperDice.length === 5) {
    alert("move dice into playspace to roll them again");
    return;
  }

  startTimer();

  activeDice.forEach((die) => {
    const roll = Math.floor(Math.random() * 6);
    die.innerHTML = diceArray[roll];
    die.style.display = "block";
  });
  updatePlayCursor();
  document.getElementById("unset-dice").style.display = "none";

  const rollCountElement = document.getElementById("roll-count");
  let currentValue = parseInt(rollCountElement.textContent);
  if (currentValue > 0) rollCountElement.textContent = currentValue - 1;
  if (rollCountElement.textContent === "0") rollButton.disabled = true;

  calculatePotentialScores();
  randomizeDicePositions();
});

function randomizeDicePositions() {
  const playspace = document.getElementById("playspace");
  const dice = playspace.querySelectorAll(".playdice");
  const spaceWidth = playspace.clientWidth;
  const spaceHeight = playspace.clientHeight;
  const placedPositions = [];

  dice.forEach((die) => {
    if (!die.innerHTML.trim() || die.style.display === "none") return;
    const dieWidth = die.offsetWidth;
    const dieHeight = die.offsetHeight;
    let x,
      y,
      safe = false,
      attempts = 0;
    while (!safe && attempts < 100) {
      x = Math.random() * (spaceWidth - dieWidth);
      y = Math.random() * (spaceHeight - dieHeight);
      safe = true;
      for (const pos of placedPositions) {
        const dx = Math.abs(pos.x - x);
        const dy = Math.abs(pos.y - y);
        if (dx < dieWidth && dy < dieHeight) {
          safe = false;
          break;
        }
      }
      attempts++;
    }
    die.style.left = x + "px";
    die.style.top = y + "px";
    placedPositions.push({ x, y });
  });
}

document.querySelectorAll(".playdice").forEach((die) => {
  die.addEventListener("click", () => {
    if (!die.innerHTML.trim()) return;
    const diceClass = [...die.classList].find((cls) => cls.startsWith("dice"));
    const keeperSlot = document.querySelector("#keeper-dice ." + diceClass);
    keeperSlot.innerHTML = die.innerHTML;
    die.innerHTML = "";
    die.style.display = "none";
    updateKeeperCursor();
    updatePlayCursor();
    calculatePotentialScores();
  });
});

function updatePlayCursor() {
  document.querySelectorAll(".playdice").forEach((die) => {
    die.style.cursor = die.innerHTML.trim() ? "pointer" : "default";
  });
}
updatePlayCursor();

document.querySelectorAll(".keepDice").forEach((keeperDie) => {
  keeperDie.style.cursor = "default";
  keeperDie.addEventListener("click", () => {
    if (!keeperDie.innerHTML.trim()) return;
    const diceClass = [...keeperDie.classList].find((cls) =>
      cls.startsWith("dice"),
    );
    const playSlot = document.querySelector("#playspace ." + diceClass);
    playSlot.innerHTML = keeperDie.innerHTML;
    playSlot.style.display = "block";
    keeperDie.innerHTML = "";
    updateKeeperCursor();
    calculatePotentialScores();
  });
});

function updateKeeperCursor() {
  document.querySelectorAll(".keepDice").forEach((keeperDie) => {
    keeperDie.style.cursor = keeperDie.innerHTML.trim() ? "pointer" : "default";
  });
}

function calculatePotentialScores() {
  const allDice = Array.from(document.querySelectorAll(".playdice, .keepDice"))
    .map((die) =>
      die.innerHTML.trim() ? parseInt(die.querySelector("img").alt) : null,
    )
    .filter(Boolean);

  const upperMapping = ["aces", "twos", "threes", "fours", "fives", "sixes"];
  upperMapping.forEach((id, index) => {
    const td = document.getElementById(`${id}-score`);
    if (td.dataset.locked) return;
    const count = allDice.filter((d) => d === index + 1).length;
    td.textContent = count ? count * (index + 1) : "";
    td.style.color = count ? "red" : "";
  });

  const upperCells = upperMapping.map((id) =>
    document.getElementById(`${id}-score`),
  );
  const allUpperLocked = upperCells.every((td) => td.dataset.locked === "true");
  if (allUpperLocked) {
    const upperScores = upperCells.map((td) => parseInt(td.textContent) || 0);
    const upperTotal = upperScores.reduce((a, b) => a + b, 0);
    document.getElementById("upper-score").textContent = upperTotal;
    const bonus = upperTotal >= 63 ? 35 : 0;
    document.getElementById("bonus-score").textContent = bonus;
    document.getElementById("total-upper-score").textContent =
      upperTotal + bonus;
  } else {
    document.getElementById("upper-score").textContent = "";
    document.getElementById("bonus-score").textContent = "";
    document.getElementById("total-upper-score").textContent = "";
  }

  const lowerScores = {
    "three-kind-score": sumIfKind(allDice, 3),
    "four-kind-score": sumIfKind(allDice, 4),
    "full-house-score": isFullHouse(allDice) ? 25 : "",
    "small-straight-score": hasSmallStraight(allDice) ? 30 : "",
    "large-straight-score": hasLargeStraight(allDice) ? 40 : "",
    "yahtzee-score":
      allDice.length === 5 && new Set(allDice).size === 1 ? 50 : "",
    "chance-score":
      allDice.length > 0 ? allDice.reduce((a, b) => a + b, 0) : "",
  };

  Object.keys(lowerScores).forEach((id) => {
    const td = document.getElementById(id);
    if (td.dataset.locked) return;
    td.textContent = lowerScores[id] !== "" ? lowerScores[id] : "";
    td.style.color = lowerScores[id] !== "" ? "red" : "";
  });

  const yahtzeeTd = document.getElementById("yahtzee-score");
  const yahtzeeScoreLocked = yahtzeeTd.dataset.locked === "true";
  const yahtzeeScoreValue = parseInt(yahtzeeTd.textContent) || 0;
  if (yahtzeeScoreLocked && yahtzeeScoreValue === 0) yahtzeeBonus = 0;
  if (
    yahtzeeScoreLocked &&
    yahtzeeScoreValue === 50 &&
    allDice.length === 5 &&
    new Set(allDice).size === 1
  ) {
    yahtzeeBonus += 100;
  }
  let yahtzeeBonusDisplay = "";
  if (yahtzeeScoreLocked && yahtzeeScoreValue === 0) yahtzeeBonusDisplay = "0";
  else if (yahtzeeBonus > 0) yahtzeeBonusDisplay = yahtzeeBonus;
  document.getElementById("yahtzee-bonus-score").textContent =
    yahtzeeBonusDisplay;

  const lowerScoreCells = [
    "three-kind-score",
    "four-kind-score",
    "full-house-score",
    "small-straight-score",
    "large-straight-score",
    "yahtzee-score",
    "chance-score",
  ];
  const allLowerLocked = lowerScoreCells.every(
    (id) => document.getElementById(id).dataset.locked === "true",
  );
  const lowerTotalValue =
    lowerScoreCells.reduce((sum, id) => {
      const td = document.getElementById(id);
      const val =
        td.dataset.locked === "true" ? parseInt(td.textContent) || 0 : 0;
      return sum + val;
    }, 0) + yahtzeeBonus;
  const lowerTotalDisplay = allLowerLocked ? lowerTotalValue : "";
  document.getElementById("total-lower-score").textContent = lowerTotalDisplay;
}

function sumIfKind(dice, countNeeded) {
  if (dice.length < 5) return "";
  const counts = {};
  dice.forEach((d) => (counts[d] = (counts[d] || 0) + 1));
  for (let value in counts) {
    if (counts[value] >= countNeeded) return dice.reduce((a, b) => a + b, 0);
  }
  return "";
}

function isFullHouse(dice) {
  if (dice.length !== 5) return false;
  const counts = {};
  dice.forEach((d) => (counts[d] = (counts[d] || 0) + 1));
  const values = Object.values(counts);
  return values.includes(3) && values.includes(2);
}

function hasSmallStraight(dice) {
  if (dice.length < 4) return false;
  const unique = [...new Set(dice)].sort((a, b) => a - b);
  const straights = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
  ];
  return straights.some((straight) =>
    straight.every((num) => unique.includes(num)),
  );
}

function hasLargeStraight(dice) {
  if (dice.length !== 5) return false;
  const sorted = [...new Set(dice)].sort((a, b) => a - b).join("");
  return sorted === "12345" || sorted === "23456";
}

document.querySelectorAll("#upper-table td, #lower-table td").forEach((td) => {
  const skipIds = [
    "total-upper-score",
    "total-lower-score",
    "bonus-score",
    "upper-score",
    "yahtzee-bonus-score",
  ];
  if (skipIds.includes(td.id)) return;
  td.addEventListener("click", () => {
    if (td.dataset.locked) return;
    if (td.textContent === "") {
      if (!confirm("No dice for this category. Set to 0?")) return;
      td.textContent = 0;
    }
    td.style.color = "black";
    td.dataset.locked = "true";

    document.getElementById("unset-dice").style.display = "flex";
    document.getElementById("roll-count").textContent = 3;
    rollButton.disabled = false;
    document.querySelectorAll(".playdice, .keepDice").forEach((d) => {
      d.innerHTML = "";
      d.style.display = "block";
    });

    totalTurns++;
    calculatePotentialScores();
    if (totalTurns >= 13) {
      const upperText =
        document.getElementById("total-upper-score").textContent;
      const lowerText =
        document.getElementById("total-lower-score").textContent;
      if (upperText !== "" && lowerText !== "") {
        rollButton.disabled = true;
        const upperTotal = parseInt(upperText) || 0;
        const lowerTotal = parseInt(lowerText) || 0;
        const finalScore = upperTotal + lowerTotal;
        document.getElementById("final-score-value").textContent = finalScore;
        document.getElementById("new-game-button").style.display = "block";
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }

        if (isMultiplayer && ws && ws.readyState === WebSocket.OPEN) {
          const playerName = document.getElementById("player-name").textContent;

          if (isMultiplayer && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "acknowledgeResults",
                gameCode: gameCode,
                playerName: playerName,
              }),
            );
          }

          if (isHost) {
            newGameButton.disabled = true;
          }

          ws.send(
            JSON.stringify({
              type: "playerFinished",
              gameCode: gameCode,
              playerName: playerName,
              finalScore: finalScore,
            }),
          );
        }
      }
    }
  });
});

function displayFinalScores(scores) {
  document.getElementById("final-score").style.display = "none";
  document.getElementById("multiplayer-scores").style.display = "block";

  const tbody = document.getElementById("final-scores-body");
  tbody.innerHTML = "";

  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  sortedScores.forEach(([playerName, score]) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const scoreCell = document.createElement("td");
    nameCell.textContent = playerName;
    scoreCell.textContent = score;
    row.appendChild(nameCell);
    row.appendChild(scoreCell);
    tbody.appendChild(row);
  });
}

document
  .querySelectorAll("#total-upper-score, #total-lower-score")
  .forEach((td) => {
    td.addEventListener("click", () => {
      alert("You cannot zero out the total scores");
    });
  });

const bonusTd = document.getElementById("bonus-score");
if (bonusTd)
  bonusTd.addEventListener("click", () => {
    alert("You cannot zero out the bonus score");
  });

const upperTotalTd = document.getElementById("upper-score");
if (upperTotalTd)
  upperTotalTd.addEventListener("click", () => {
    alert("You cannot zero out the upper section score");
  });

const quitButton = document.getElementById("quit-button");

quitButton?.addEventListener("click", async () => {
  const gameCode = sessionStorage.getItem("gameCode");
  const isHost = sessionStorage.getItem("isHost") === "true";

  if (!gameCode) {
    window.location.href = "lobby.html";
    return;
  }

  if (isHost) {
    const gameRef = ref(db, "games/" + gameCode);
    await set(gameRef, null);
  }

  window.location.href = "lobby.html";
});

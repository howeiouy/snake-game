const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const speedLevelEl = document.getElementById("speed-level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");

const GRID_SIZE = 20;
const CELL = canvas.width / GRID_SIZE;
const BASE_SPEED = 140;

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

let snake;
let direction;
let nextDirection;
let food;
let score;
let highScore;
let gameLoop;
let lastTick;
let state;
let speedLevel;

function loadHighScore() {
  return Number(localStorage.getItem("snake-high-score") || 0);
}

function saveHighScore(value) {
  localStorage.setItem("snake-high-score", String(value));
}

function randomCell() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  };
}

function spawnFood() {
  let spot;
  do {
    spot = randomCell();
  } while (snake.some((part) => part.x === spot.x && part.y === spot.y));
  food = spot;
}

function resetGame() {
  const center = Math.floor(GRID_SIZE / 2);
  snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  score = 0;
  speedLevel = 1;
  scoreEl.textContent = "0";
  speedLevelEl.textContent = "1";
  spawnFood();
}

function getSpeed() {
  return Math.max(55, BASE_SPEED - (speedLevel - 1) * 12);
}

function showOverlay(title, message, showStart = true) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  startBtn.style.display = showStart ? "inline-block" : "none";
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function setState(next) {
  state = next;
  pauseBtn.disabled = state !== "playing";
  restartBtn.disabled = state === "idle";
}

function startGame() {
  resetGame();
  hideOverlay();
  setState("playing");
  lastTick = 0;
  cancelAnimationFrame(gameLoop);
  gameLoop = requestAnimationFrame(tick);
}

function pauseGame() {
  if (state !== "playing") return;
  setState("paused");
  showOverlay("已暂停", "按空格键或点击开始按钮继续", true);
  startBtn.textContent = "继续游戏";
}

function resumeGame() {
  if (state !== "paused") return;
  hideOverlay();
  setState("playing");
  startBtn.textContent = "开始游戏";
  lastTick = performance.now();
  gameLoop = requestAnimationFrame(tick);
}

function gameOver() {
  setState("over");
  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = String(highScore);
    saveHighScore(highScore);
    showOverlay("新纪录！", `最终得分 ${score}，再来一局？`, true);
  } else {
    showOverlay("游戏结束", `最终得分 ${score}，再来一局？`, true);
  }
  startBtn.textContent = "再来一局";
}

function isOpposite(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

function update() {
  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  if (
    head.x < 0 ||
    head.x >= GRID_SIZE ||
    head.y < 0 ||
    head.y >= GRID_SIZE ||
    snake.some((part) => part.x === head.x && part.y === head.y)
  ) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = String(score);
    const newLevel = Math.floor(score / 50) + 1;
    if (newLevel !== speedLevel) {
      speedLevel = newLevel;
      speedLevelEl.textContent = String(speedLevel);
    }
    spawnFood();
  } else {
    snake.pop();
  }
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID_SIZE; i++) {
    const pos = i * CELL;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }
}

function drawRoundedRect(x, y, size, color, radius) {
  const r = radius ?? size * 0.22;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, size - 2, size - 2, r);
  ctx.fill();
}

function drawSnake() {
  snake.forEach((part, index) => {
    const x = part.x * CELL;
    const y = part.y * CELL;
    if (index === 0) {
      drawRoundedRect(x, y, CELL, "#00e5a0", CELL * 0.3);
      const eyeSize = CELL * 0.12;
      ctx.fillStyle = "#042a1f";
      const offsetX = direction.x !== 0 ? direction.x * 3 : 0;
      const offsetY = direction.y !== 0 ? direction.y * 3 : 0;
      ctx.beginPath();
      ctx.arc(
        x + CELL * 0.35 + offsetX,
        y + CELL * 0.35 + offsetY,
        eyeSize,
        0,
        Math.PI * 2
      );
      ctx.arc(
        x + CELL * 0.65 + offsetX,
        y + CELL * 0.35 + offsetY,
        eyeSize,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      const shade = Math.max(0.45, 1 - index * 0.03);
      drawRoundedRect(
        x,
        y,
        CELL,
        `rgba(0, 184, 125, ${shade})`,
        CELL * 0.25
      );
    }
  });
}

function drawFood() {
  const x = food.x * CELL;
  const y = food.y * CELL;
  const pulse = 0.85 + Math.sin(performance.now() / 180) * 0.08;
  const size = CELL * pulse;
  const offset = (CELL - size) / 2;

  const gradient = ctx.createRadialGradient(
    x + CELL / 2,
    y + CELL / 2,
    2,
    x + CELL / 2,
    y + CELL / 2,
    size / 2
  );
  gradient.addColorStop(0, "#ff9a7a");
  gradient.addColorStop(1, "#ff4a3d");
  drawRoundedRect(x + offset, y + offset, size, gradient, size * 0.35);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawFood();
  drawSnake();
}

function tick(timestamp) {
  if (state !== "playing") return;

  if (!lastTick) lastTick = timestamp;
  const elapsed = timestamp - lastTick;

  if (elapsed >= getSpeed()) {
    update();
    if (state !== "playing") return;
    lastTick = timestamp;
  }

  draw();
  gameLoop = requestAnimationFrame(tick);
}

function handleDirection(key) {
  const dir = DIRECTIONS[key];
  if (!dir) return;
  if (!isOpposite(dir, direction)) {
    nextDirection = dir;
  }
}

document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key === " ") {
    event.preventDefault();
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
    else if (state === "idle" || state === "over") startGame();
    return;
  }

  if (state === "playing" || state === "paused") {
    handleDirection(key);
  }
});

startBtn.addEventListener("click", () => {
  if (state === "paused") resumeGame();
  else startGame();
});

pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", startGame);

highScore = loadHighScore();
highScoreEl.textContent = String(highScore);
setState("idle");
showOverlay("准备开始", "按空格键或点击开始按钮", true);
draw();

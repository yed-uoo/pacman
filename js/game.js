/**
 * game.js — Main entry point: game loop, state machine, rendering, and init.
 *
 * This is the only script loaded by index.html (as type="module").
 * It imports everything from the other modules and orchestrates the
 * game lifecycle: START → PLAYING → GAME_OVER / WIN → restart.
 */

import {
  TILE, COLS, ROWS,
  GAME_STATES,
  createMap, countPellets,
  checkEntityCollision,
} from './utils.js';

import {
  createPlayer, updatePlayer, eatPellet,
  drawPacman, handleInput, resetPlayerPosition,
} from './player.js';

import {
  createGhosts, updateGhost, drawGhost, resetGhosts,
} from './ghost.js';

// ─── DOM References ─────────────────────────────────────────────────

let canvas;
let ctx;
let scoreEl;
let highScoreEl;

let overlayStart;
let overlayGameOver;
let overlayWin;

let startBtn;
let restartBtnGO;
let restartBtnWin;
let finalScoreEl;
let winScoreEl;

// ─── Game State ─────────────────────────────────────────────────────

let state      = GAME_STATES.START;
let map        = createMap();
let player     = createPlayer();
let ghosts     = createGhosts();
let pellets    = countPellets(map);
let highScore  = 0;
let previousTs = 0; // last frame timestamp

// ─── High Score (localStorage) ──────────────────────────────────────

const LS_KEY = 'pacman_high_score';

function loadHighScore() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? parseInt(saved, 10) : 0;
  } catch (e) {
    console.warn("localStorage access denied or unavailable. High score will not persist.", e);
    return 0;
  }
}

function saveHighScore(score) {
  if (score > highScore) {
    highScore = score;
    try {
      localStorage.setItem(LS_KEY, String(highScore));
    } catch (e) {
      console.warn("Failed to save high score to localStorage:", e);
    }
  }
}

// ─── State Machine Transitions ──────────────────────────────────────

function transitionTo(newState) {
  console.log(`Transitioning state: ${state} -> ${newState}`);
  state = newState;

  // Hide all overlays first
  overlayStart.classList.add('hidden');
  overlayGameOver.classList.add('hidden');
  overlayWin.classList.add('hidden');

  switch (newState) {
    case GAME_STATES.START:
      overlayStart.classList.remove('hidden');
      break;

    case GAME_STATES.PLAYING:
      console.log("State changed to PLAYING");
      // Nothing extra — overlays already hidden
      break;

    case GAME_STATES.GAME_OVER:
      saveHighScore(player.score);
      finalScoreEl.textContent = player.score;
      overlayGameOver.classList.remove('hidden');
      break;

    case GAME_STATES.WIN:
      saveHighScore(player.score);
      winScoreEl.textContent = player.score;
      overlayWin.classList.remove('hidden');
      break;
  }

  updateHUD();
}

// ─── Restart ────────────────────────────────────────────────────────

function restartGame() {
  console.log("Restarting game");
  map     = createMap();
  player  = createPlayer();
  ghosts  = createGhosts();
  pellets = countPellets(map);
  transitionTo(GAME_STATES.START);
}

// ─── Update ─────────────────────────────────────────────────────────

function update(dt) {
  // Player
  updatePlayer(player, map, dt);

  // Eat pellets
  const { ate } = eatPellet(player, map);
  if (ate) {
    pellets = countPellets(map);

    // Check win condition
    if (pellets <= 0) {
      transitionTo(GAME_STATES.WIN);
      return;
    }
  }

  // Ghosts
  const playerPos = { x: player.x, y: player.y };
  for (const ghost of ghosts) {
    updateGhost(ghost, map, playerPos, dt);

    // Check ghost ↔ player collision
    if (checkEntityCollision(player, ghost)) {
      transitionTo(GAME_STATES.GAME_OVER);
      return;
    }
  }
}

// ─── Rendering ──────────────────────────────────────────────────────

/** Clears the entire canvas to black. */
function clearCanvas() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** Draws a faint grid for visual polish. */
function drawBackgroundGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * TILE, 0);
    ctx.lineTo(x * TILE, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * TILE);
    ctx.lineTo(canvas.width, y * TILE);
    ctx.stroke();
  }
}

/** Draws the maze walls and collectible dots. */
function drawMap() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = map[y][x];
      const px = x * TILE;
      const py = y * TILE;

      if (tile === '#') {
        // Wall
        ctx.fillStyle = '#0f1d72';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = '#2946df';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      } else {
        // Floor
        ctx.fillStyle = '#000';
        ctx.fillRect(px, py, TILE, TILE);

        if (tile === '.') {
          // Small dot
          ctx.fillStyle = '#f8f0a7';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 'o') {
          // Power pellet
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

/** Updates the HUD score displays. */
function updateHUD() {
  scoreEl.textContent     = `Score: ${player.score}`;
  highScoreEl.textContent = `High Score: ${highScore}`;
}

/** Master render — called every frame regardless of game state. */
function render(time) {
  clearCanvas();
  drawBackgroundGrid();
  drawMap();
  drawPacman(ctx, player, time);
  ghosts.forEach((g) => drawGhost(ctx, g));
  updateHUD();
}

// ─── Game Loop ──────────────────────────────────────────────────────

let loopStarted = false;
function gameLoop(time) {
  if (!loopStarted) {
    console.log("Game loop started");
    loopStarted = true;
  }
  const dt = Math.min((time - previousTs) / 1000, 0.05); // cap delta
  previousTs = time;

  if (state === GAME_STATES.PLAYING) {
    update(dt);
  }

  render(time);
  requestAnimationFrame(gameLoop);
}

// ─── Input Handling ─────────────────────────────────────────────────

function setupInput() {
  window.addEventListener('keydown', (e) => {
    // Start the game on Enter while in START state
    if (e.key === 'Enter' && state === GAME_STATES.START) {
      console.log("Enter pressed");
      e.preventDefault();
      transitionTo(GAME_STATES.PLAYING);
      return;
    }

    // Player movement — only while PLAYING
    if (state === GAME_STATES.PLAYING) {
      const moved = handleInput(player, e.key);
      if (moved) e.preventDefault();
    }
  });

  // Button Handlers
  startBtn.addEventListener('click', () => {
    console.log("Start button clicked");
    transitionTo(GAME_STATES.PLAYING);
  });

  restartBtnGO.addEventListener('click', restartGame);
  restartBtnWin.addEventListener('click', restartGame);
}

// ─── Initialisation ─────────────────────────────────────────────────

function init() {
  // Retrieve DOM elements now that the DOM is fully parsed and loaded
  canvas          = document.getElementById('gameCanvas');
  ctx             = canvas.getContext('2d');
  scoreEl         = document.getElementById('score');
  highScoreEl     = document.getElementById('high-score');
  overlayStart    = document.getElementById('overlay-start');
  overlayGameOver = document.getElementById('overlay-gameover');
  overlayWin      = document.getElementById('overlay-win');
  startBtn        = document.getElementById('btn-start');
  restartBtnGO    = document.getElementById('btn-restart-go');
  restartBtnWin   = document.getElementById('btn-restart-win');
  finalScoreEl    = document.getElementById('final-score');
  winScoreEl      = document.getElementById('win-score');

  canvas.width  = COLS * TILE;
  canvas.height = ROWS * TILE;

  highScore = loadHighScore();
  setupInput();
  updateHUD();
  transitionTo(GAME_STATES.START);

  previousTs = performance.now();
  requestAnimationFrame(gameLoop);
  console.log("Game initialized");
}

// Safely execute init after DOM is fully parsed and loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


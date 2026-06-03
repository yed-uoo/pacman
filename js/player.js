/**
 * player.js — Player (Pac-Man) creation, movement, input, and rendering.
 *
 * Exports a factory function and pure-ish helpers so the main game
 * module can own the state while this module owns the logic.
 */

import {
  TILE, DIRS, ALL_DIRS,
  tileCenterX, tileCenterY,
  collidesWithWall,
} from './utils.js';

// ─── Factory ────────────────────────────────────────────────────────

/** Starting tile coordinates (read from LAYOUT — row 10, col 10). */
const START_TX = 10;
const START_TY = 10;

/**
 * Creates and returns a fresh player object.
 * Call this on init and on every restart.
 */
export function createPlayer() {
  return {
    x:        tileCenterX(START_TX),
    y:        tileCenterY(START_TY),
    radius:   TILE * 0.4,
    speed:    130,             // pixels per second
    dir:      { ...DIRS.left },
    nextDir:  { ...DIRS.left },
    mouth:    0,               // mouth-open angle (animated)
    score:    0,
  };
}

// ─── Input ──────────────────────────────────────────────────────────

/**
 * Maps a keyboard event key to a direction and queues it as `nextDir`.
 *
 * @param {Object} player
 * @param {string} key — `event.key` value
 * @returns {boolean} true if the key was a valid movement key
 */
export function handleInput(player, key) {
  const k = key.toLowerCase();

  if (k === 'arrowleft'  || k === 'a') { player.nextDir = { ...DIRS.left };  return true; }
  if (k === 'arrowright' || k === 'd') { player.nextDir = { ...DIRS.right }; return true; }
  if (k === 'arrowup'    || k === 'w') { player.nextDir = { ...DIRS.up };    return true; }
  if (k === 'arrowdown'  || k === 's') { player.nextDir = { ...DIRS.down };  return true; }

  return false;
}

// ─── Movement ───────────────────────────────────────────────────────

/**
 * Attempts to turn `entity` toward `desiredDir`.
 * Only applies if the turn would not immediately collide with a wall.
 */
function tryTurn(entity, desiredDir, map) {
  if (!collidesWithWall(map, entity, desiredDir, 2)) {
    entity.dir = { ...desiredDir };
  }
}

/**
 * Updates the player for one frame.
 *   1. Tries to apply the queued direction change.
 *   2. Moves in the current direction if no wall blocks.
 *
 * @param {Object} player
 * @param {Array}  map — mutable 2-D tile array
 * @param {number} dt  — seconds since last frame
 */
export function updatePlayer(player, map, dt) {
  // Try queued turn first
  tryTurn(player, player.nextDir, map);

  // Move forward
  const distance = player.speed * dt;
  if (!collidesWithWall(map, player, player.dir, distance)) {
    player.x += player.dir.x * distance;
    player.y += player.dir.y * distance;
  }
}

// ─── Pellet Eating ──────────────────────────────────────────────────

/**
 * Checks the tile under the player and eats a dot / power pellet if present.
 *
 * @param {Object} player
 * @param {Array}  map
 * @returns {{ ate: boolean, points: number }} whether a pellet was eaten and how many points
 */
export function eatPellet(player, map) {
  const tx = Math.floor(player.x / TILE);
  const ty = Math.floor(player.y / TILE);
  const tile = map[ty]?.[tx];

  if (tile === '.') {
    map[ty][tx] = ' ';
    player.score += 10;
    return { ate: true, points: 10 };
  }

  if (tile === 'o') {
    map[ty][tx] = ' ';
    player.score += 50;
    return { ate: true, points: 50 };
  }

  return { ate: false, points: 0 };
}

// ─── Rendering ──────────────────────────────────────────────────────

/**
 * Draws Pac-Man on the canvas with an animated mouth.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} player
 * @param {number} time — timestamp from requestAnimationFrame (ms)
 */
export function drawPacman(ctx, player, time) {
  // Animate mouth opening based on time
  const speedFactor = Math.hypot(player.dir.x, player.dir.y);
  player.mouth = 0.18 + Math.abs(Math.sin(time * 0.012)) * 0.24 * speedFactor;

  // Determine facing angle
  let angle = 0;
  if (player.dir.x ===  1) angle = 0;
  if (player.dir.x === -1) angle = Math.PI;
  if (player.dir.y === -1) angle = -Math.PI / 2;
  if (player.dir.y ===  1) angle =  Math.PI / 2;

  // Draw the classic Pac-Man wedge shape
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(
    player.x,
    player.y,
    player.radius,
    angle + player.mouth,
    angle - player.mouth + Math.PI * 2,
  );
  ctx.closePath();
  ctx.fill();
}

// ─── Reset ──────────────────────────────────────────────────────────

/**
 * Resets the player's position and direction to defaults.
 * Does NOT reset the score (call createPlayer for a full reset).
 */
export function resetPlayerPosition(player) {
  player.x       = tileCenterX(START_TX);
  player.y       = tileCenterY(START_TY);
  player.dir     = { ...DIRS.left };
  player.nextDir = { ...DIRS.left };
}

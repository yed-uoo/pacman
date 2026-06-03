/**
 * ghost.js — Ghost creation, AI modes, BFS pathfinding, and rendering.
 *
 * Each ghost independently switches between CHASE and RANDOM mode on
 * a timer. The red ghost ("Blinky") uses BFS pathfinding in CHASE mode
 * for a noticeable difficulty bump; the others use Manhattan distance.
 */

import {
  TILE, COLS, ROWS, DIRS, ALL_DIRS,
  tileCenterX, tileCenterY, tileAtPixel,
  isWallTile, collidesWithWall, manhattanDistance,
} from './utils.js';

// ─── Ghost AI Types ─────────────────────────────────────────────────

/** AI strategies a ghost can use in CHASE mode. */
const AI_TYPE = Object.freeze({
  BFS:       'bfs',        // Shortest-path (used by Blinky)
  MANHATTAN: 'manhattan',  // Greedy Manhattan heuristic
});

/** Behaviour mode — each ghost tracks its own. */
const MODE = Object.freeze({
  CHASE:  'CHASE',
  RANDOM: 'RANDOM',
});

// ─── Ghost Definitions ─────────────────────────────────────────────

/**
 * Blueprint for each ghost: starting tile, colour, and AI type.
 * Index 0 = Blinky (red, BFS) — the smartest pursuer.
 */
const GHOST_DEFS = [
  { tx: 9,  ty: 8, color: '#ff4d4d', ai: AI_TYPE.BFS,       name: 'Blinky' },
  { tx: 10, ty: 8, color: '#ff99ff', ai: AI_TYPE.MANHATTAN,  name: 'Pinky'  },
  { tx: 11, ty: 8, color: '#5bd3ff', ai: AI_TYPE.MANHATTAN,  name: 'Inky'   },
];

/** How often (in seconds) ghosts switch mode — randomised within a range. */
const MODE_SWITCH_MIN = 5;
const MODE_SWITCH_MAX = 8;

/** Returns a random switch interval within the defined range. */
function randomSwitchInterval() {
  return MODE_SWITCH_MIN + Math.random() * (MODE_SWITCH_MAX - MODE_SWITCH_MIN);
}

// ─── Factory ────────────────────────────────────────────────────────

/**
 * Creates a single ghost object.
 */
function createGhost(def, index) {
  return {
    x:             tileCenterX(def.tx),
    y:             tileCenterY(def.ty),
    startTx:       def.tx,
    startTy:       def.ty,
    radius:        TILE * 0.38,
    speed:         90 + index * 8,   // slightly different speeds
    dir:           { ...ALL_DIRS[index % ALL_DIRS.length] },
    color:         def.color,
    name:          def.name,
    aiType:        def.ai,
    mode:          MODE.CHASE,
    modeTimer:     randomSwitchInterval(),
  };
}

/**
 * Creates and returns the full array of ghosts.
 */
export function createGhosts() {
  return GHOST_DEFS.map((def, i) => createGhost(def, i));
}

// ─── Mode Switching ─────────────────────────────────────────────────

/**
 * Ticks the ghost's mode timer. When it expires, flips between
 * CHASE and RANDOM and resets the timer.
 */
function updateMode(ghost, dt) {
  ghost.modeTimer -= dt;
  if (ghost.modeTimer <= 0) {
    ghost.mode = ghost.mode === MODE.CHASE ? MODE.RANDOM : MODE.CHASE;
    ghost.modeTimer = randomSwitchInterval();
  }
}

// ─── Direction Choosing — Manhattan Chase ───────────────────────────

/**
 * Evaluates all valid (non-reverse, non-wall) directions and picks
 * the one that minimises Manhattan distance to the player.
 */
function chooseDirectionManhattan(ghost, map, playerPos) {
  const options = getValidDirections(ghost, map);
  if (!options.length) return reverseDirection(ghost);

  // Sort by Manhattan distance to player (lower = better)
  const playerTile = tileAtPixel(playerPos.x, playerPos.y);

  options.sort((a, b) => {
    const ghostTile = tileAtPixel(ghost.x, ghost.y);
    const da = manhattanDistance(
      ghostTile.x + a.x, ghostTile.y + a.y,
      playerTile.x, playerTile.y,
    );
    const db = manhattanDistance(
      ghostTile.x + b.x, ghostTile.y + b.y,
      playerTile.x, playerTile.y,
    );
    return da - db;
  });

  return options[0];
}

// ─── Direction Choosing — BFS Pathfinding ───────────────────────────

/**
 * Runs BFS from the ghost's current tile to the player's tile.
 * Returns the direction of the first step on the shortest path,
 * or falls back to Manhattan chase if no path is found.
 */
function chooseDirectionBFS(ghost, map, playerPos) {
  const start = tileAtPixel(ghost.x, ghost.y);
  const goal  = tileAtPixel(playerPos.x, playerPos.y);

  // Quick exit — already on the same tile
  if (start.x === goal.x && start.y === goal.y) {
    return chooseDirectionManhattan(ghost, map, playerPos);
  }

  // BFS setup
  const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const queue = []; // each entry: { x, y, firstDir }

  visited[start.y][start.x] = true;

  // Seed with all valid neighbours of the start tile
  for (const dir of ALL_DIRS) {
    const nx = start.x + dir.x;
    const ny = start.y + dir.y;

    if (!isWallTile(map, nx, ny) && !visited[ny][nx]) {
      // Don't allow immediate reversal
      if (dir.x === -ghost.dir.x && dir.y === -ghost.dir.y) continue;

      visited[ny][nx] = true;
      queue.push({ x: nx, y: ny, firstDir: dir });
    }
  }

  // Standard BFS traversal
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];

    // Goal reached — return the direction of the very first step
    if (node.x === goal.x && node.y === goal.y) {
      return node.firstDir;
    }

    for (const dir of ALL_DIRS) {
      const nx = node.x + dir.x;
      const ny = node.y + dir.y;

      if (!isWallTile(map, nx, ny) && !visited[ny][nx]) {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, firstDir: node.firstDir });
      }
    }
  }

  // No path found — fall back to Manhattan
  return chooseDirectionManhattan(ghost, map, playerPos);
}

// ─── Direction Choosing — Random ────────────────────────────────────

/**
 * Picks a random valid direction (no reversal, no walls).
 */
function chooseDirectionRandom(ghost, map) {
  const options = getValidDirections(ghost, map);
  if (!options.length) return reverseDirection(ghost);
  return options[Math.floor(Math.random() * options.length)];
}

// ─── Shared Direction Helpers ───────────────────────────────────────

/**
 * Returns all non-reverse directions that don't immediately collide
 * with a wall.
 */
function getValidDirections(ghost, map) {
  return ALL_DIRS.filter((dir) => {
    // Don't reverse (ghosts shouldn't 180° unless stuck)
    if (dir.x === -ghost.dir.x && dir.y === -ghost.dir.y) return false;
    return !collidesWithWall(map, ghost, dir, 8);
  });
}

/**
 * Returns the reverse of the ghost's current direction.
 * Used as a last resort when no other direction is available.
 */
function reverseDirection(ghost) {
  return { x: -ghost.dir.x, y: -ghost.dir.y };
}

// ─── Master Update ──────────────────────────────────────────────────

/**
 * The main per-frame update for a single ghost.
 *   1. Ticks the mode timer (may switch CHASE ↔ RANDOM).
 *   2. At tile centers, picks a new direction based on the current mode.
 *   3. Moves forward; if blocked, re-evaluates direction.
 *
 * @param {Object} ghost
 * @param {Array}  map
 * @param {Object} playerPos — { x, y } pixel position
 * @param {number} dt — seconds since last frame
 */
export function updateGhost(ghost, map, playerPos, dt) {
  // 1. Mode switching timer
  updateMode(ghost, dt);

  // 2. Choose direction at tile centers
  const nearCenterX = Math.abs((ghost.x - TILE / 2) % TILE) < 2;
  const nearCenterY = Math.abs((ghost.y - TILE / 2) % TILE) < 2;

  if (nearCenterX && nearCenterY) {
    ghost.dir = pickDirection(ghost, map, playerPos);
  }

  // 3. Move
  const distance = ghost.speed * dt;
  if (!collidesWithWall(map, ghost, ghost.dir, distance)) {
    ghost.x += ghost.dir.x * distance;
    ghost.y += ghost.dir.y * distance;
  } else {
    // Stuck — pick a new direction immediately
    ghost.dir = pickDirection(ghost, map, playerPos);
  }
}

/**
 * Dispatches to the correct direction-picking strategy based on the
 * ghost's current mode and AI type.
 */
function pickDirection(ghost, map, playerPos) {
  if (ghost.mode === MODE.RANDOM) {
    return chooseDirectionRandom(ghost, map);
  }

  // CHASE mode — strategy depends on AI type
  if (ghost.aiType === AI_TYPE.BFS) {
    return chooseDirectionBFS(ghost, map, playerPos);
  }
  return chooseDirectionManhattan(ghost, map, playerPos);
}

// ─── Rendering ──────────────────────────────────────────────────────

/**
 * Draws a ghost at its current position.
 * Body: rounded top + wavy bottom edge.
 * Eyes: white sclera + dark pupils.
 */
export function drawGhost(ctx, ghost) {
  const { x, y, radius: r, color } = ghost;

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.1, r, Math.PI, 0);
  ctx.lineTo(x + r, y + r);
  for (let i = 0; i < 3; i++) {
    const sx = x + r - ((i + 1) * 2 * r) / 3;
    ctx.quadraticCurveTo(sx + r / 6, y + r * 0.6, sx - r / 3, y + r);
  }
  ctx.closePath();
  ctx.fill();

  // Eyes — sclera
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.22, 0, Math.PI * 2);
  ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Eyes — pupils
  ctx.fillStyle = '#1b2a6d';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.08, r * 0.1, 0, Math.PI * 2);
  ctx.arc(x + r * 0.4, y - r * 0.08, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Reset ──────────────────────────────────────────────────────────

/**
 * Resets all ghosts to their starting positions and re-randomises modes.
 */
export function resetGhosts(ghosts) {
  ghosts.forEach((ghost, i) => {
    const def = GHOST_DEFS[i];
    ghost.x         = tileCenterX(def.tx);
    ghost.y         = tileCenterY(def.ty);
    ghost.dir       = { ...ALL_DIRS[i % ALL_DIRS.length] };
    ghost.mode      = MODE.CHASE;
    ghost.modeTimer = randomSwitchInterval();
  });
}

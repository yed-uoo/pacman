/**
 * utils.js — Shared constants, map data, and utility functions.
 *
 * Everything that is used by more than one module lives here so the
 * rest of the codebase stays DRY and easy to reason about.
 */

// ─── Grid & Canvas Constants ────────────────────────────────────────

/** Pixel size of one tile (width === height). */
export const TILE = 28;

/** Height reserved for the HUD bar above the canvas. */
export const HUD_HEIGHT = 0; // HUD is now in the DOM, not on canvas

/** Number of columns in the maze. */
export const COLS = 20;

/** Number of rows in the maze. */
export const ROWS = 20;

// ─── Direction Vectors ──────────────────────────────────────────────

/**
 * Unit direction vectors keyed by name.
 * Useful for movement, input handling, and AI direction picking.
 */
export const DIRS = {
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
  up:    { x:  0, y: -1 },
  down:  { x:  0, y:  1 },
};

/** Convenience array of all four direction vectors. */
export const ALL_DIRS = Object.values(DIRS);

// ─── Game State Enum ────────────────────────────────────────────────

/**
 * Possible states for the game state machine.
 *   START     → waiting for the player to press Enter / click Start
 *   PLAYING   → active gameplay
 *   GAME_OVER → ghost caught the player
 *   WIN       → all dots collected
 */
export const GAME_STATES = Object.freeze({
  START:     'START',
  PLAYING:   'PLAYING',
  GAME_OVER: 'GAME_OVER',
  WIN:       'WIN',
});

// ─── Maze Layout ────────────────────────────────────────────────────

/**
 * The maze as an array of strings.
 *   #  = wall
 *   .  = small dot (10 pts)
 *   o  = power pellet (50 pts)
 *   G  = ghost starting position (treated as empty floor)
 *   P  = player starting position (treated as empty floor)
 *   ' ' = empty corridor
 */
export const LAYOUT = [
  '####################',
  '#........##........#',
  '#.####.#.##.#.####.#',
  '#o####.#.##.#.####o#',
  '#..................#',
  '#.####.######.####.#',
  '#......##..##......#',
  '######.##..##.######',
  '#....#...GG...#....#',
  '#.##.#.######.#.##.#',
  '#.........P........#',
  '######.##..##.######',
  '#......##..##......#',
  '#.####.######.####.#',
  '#..................#',
  '#o####.#.##.#.####o#',
  '#...##.#.##.#.##...#',
  '###....#....#....###',
  '#........##........#',
  '####################',
];

// ─── Map Helpers ────────────────────────────────────────────────────

/**
 * Creates a fresh mutable 2-D array from the LAYOUT strings.
 * Call this every time you need to reset the map (e.g. on restart).
 */
export function createMap() {
  return LAYOUT.map((row) => row.split(''));
}

/**
 * Counts the number of collectible tiles ('.', 'o') remaining on the map.
 */
export function countPellets(map) {
  let count = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (map[y][x] === '.' || map[y][x] === 'o') count++;
    }
  }
  return count;
}

// ─── Tile ↔ Pixel Conversion ────────────────────────────────────────

/** Returns the pixel X of a tile's center. */
export function tileCenterX(tx) {
  return tx * TILE + TILE / 2;
}

/** Returns the pixel Y of a tile's center. */
export function tileCenterY(ty) {
  return ty * TILE + TILE / 2;
}

/** Converts a pixel position to tile coordinates. */
export function tileAtPixel(px, py) {
  return {
    x: Math.floor(px / TILE),
    y: Math.floor(py / TILE),
  };
}

// ─── Collision Detection ────────────────────────────────────────────

/**
 * Returns true if the tile at (tx, ty) is a wall or out of bounds.
 */
export function isWallTile(map, tx, ty) {
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
  return map[ty][tx] === '#';
}

/**
 * Checks whether moving `entity` by `distance` in `dir` would collide
 * with a wall. Uses the entity's four corner points for precision.
 *
 * @param {Object} map     — 2-D tile array
 * @param {Object} entity  — must have { x, y, radius }
 * @param {Object} dir     — direction vector { x, y }
 * @param {number} distance — pixels to move
 * @returns {boolean} true if any corner would land in a wall
 */
export function collidesWithWall(map, entity, dir, distance) {
  const nx = entity.x + dir.x * distance;
  const ny = entity.y + dir.y * distance;
  const r = entity.radius - 2; // small inset to avoid pixel-edge false positives

  // Check all four corners of the entity's bounding box
  const corners = [
    [nx - r, ny - r],
    [nx + r, ny - r],
    [nx - r, ny + r],
    [nx + r, ny + r],
  ];

  return corners.some(([px, py]) => {
    const tile = tileAtPixel(px, py);
    return isWallTile(map, tile.x, tile.y);
  });
}

/**
 * Circle-vs-circle collision between two entities.
 * Used for player ↔ ghost hit detection.
 *
 * @param {Object} a — { x, y, radius }
 * @param {Object} b — { x, y, radius }
 * @returns {boolean}
 */
export function checkEntityCollision(a, b) {
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  return dist < a.radius + b.radius - 4; // small tolerance
}

/**
 * Returns the Manhattan distance between two tile positions.
 * Used by ghost AI to evaluate which direction brings it closer to Pac-Man.
 */
export function manhattanDistance(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

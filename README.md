# 🟡 Pac-Man — Arcade Game

A classic Pac-Man arcade game built from scratch with **vanilla JavaScript**, **HTML5 Canvas**, and **CSS**. No frameworks, no libraries — just clean, modular code using ES6 modules.

## ✨ Features

- **Classic Pac-Man gameplay** — navigate the maze, eat all the dots, avoid the ghosts
- **Smart Ghost AI** — three ghosts with independent behaviour:
  - 🔴 **Blinky** — uses **BFS pathfinding** to find the shortest path to Pac-Man
  - 🟣 **Pinky** — uses **Manhattan distance** heuristic to chase
  - 🔵 **Inky** — uses Manhattan distance heuristic to chase
- **Dual AI modes** — ghosts automatically switch between **CHASE** and **RANDOM** mode every 5–8 seconds
- **Game state machine** — clean state transitions: `START → PLAYING → GAME_OVER / WIN`
- **Score system** with **localStorage high score** persistence
- **Overlay screens** — start, game over, and win screens with restart functionality
- **Smooth Pac-Man animation** — animated mouth opening/closing
- **Responsive layout** — canvas scales to fit the viewport

## 🛠 Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Page structure, Canvas element |
| CSS3 | Styling, overlays, responsive layout |
| JavaScript (ES6+) | Game logic, modules, Canvas API |
| localStorage | High score persistence |

## 📁 Project Structure

```
pacman/
├── index.html        # Single-page game entry point
├── styles.css        # All styles (layout, HUD, overlays)
├── README.md         # This file
└── js/
    ├── game.js       # Game loop, state machine, rendering, init
    ├── player.js     # Player movement, input handling, pellet eating
    ├── ghost.js      # Ghost AI (BFS + Manhattan), mode switching
    └── utils.js      # Constants, map data, collision detection, helpers
```

## 🧠 Core Concepts

### Game Loop
Uses `requestAnimationFrame` for a smooth 60fps loop. Delta time (`dt`) is capped at 50ms to prevent physics glitches on tab-switch.

### State Machine
Four states managed by a `transitionTo()` function that handles overlay visibility, score saving, and HUD updates:
```
START ──► PLAYING ──► WIN
              │         │
              ▼         │
          GAME_OVER ◄───┘
              │
              └──► START (restart)
```

### Collision Detection
- **Wall collision**: Four-corner bounding box check against tile grid
- **Entity collision**: Circle-vs-circle overlap test (player ↔ ghost)
- **Pellet collection**: Tile lookup at player's current position

### Ghost AI
Each ghost independently runs one of two modes:

- **CHASE mode**: Pursues Pac-Man using either:
  - **BFS pathfinding** (Blinky) — finds the shortest tile-grid path
  - **Manhattan distance** (Pinky, Inky) — greedily picks the direction that minimises distance
- **RANDOM mode**: Picks a random valid direction at each intersection

Modes switch automatically every 5–8 seconds per ghost.

### localStorage
High score is saved to `localStorage` under the key `pacman_high_score` and loaded on every page visit.

## 🚀 How to Run

ES6 modules require a local server (they don't work with `file://` protocol).

**Option 1 — Python**
```bash
cd pacman
python3 -m http.server 8080
# Open http://localhost:8080
```

**Option 2 — VS Code Live Server**
1. Install the "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

**Option 3 — Node.js**
```bash
npx -y serve .
```

## 🎮 Controls

| Key | Action |
|---|---|
| `↑` / `W` | Move up |
| `↓` / `S` | Move down |
| `←` / `A` | Move left |
| `→` / `D` | Move right |
| `Enter` | Start game |

## 🔮 Future Improvements

- **Power pellets** — make ghosts vulnerable (frightened mode) when eaten
- **Sound effects** — dot eating, ghost collision, level clear
- **Level progression** — increasing ghost speed and count per level
- **Mobile touch controls** — swipe or on-screen D-pad
- **A\* pathfinding** — upgrade from BFS for weighted movement costs
- **Multiple maze layouts** — randomly selected or level-based
- **Animations** — death animation, ghost eyes returning to base
- **Leaderboard** — online score submission

---

Built with ❤️ as a portfolio project demonstrating clean JavaScript architecture, game state management, and pathfinding algorithms.

# Nitro Drift Arcade 🏎️💨

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=flat&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23F7DF1E.svg?style=flat&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=flat&logo=css3&logoColor=white)

**Nitro Drift Arcade** is a lightning-fast, arcade-style 2D top-down racing game built entirely from scratch using HTML5 Canvas and Vanilla JavaScript. Experience slick drifting mechanics, particle effects, multiple tracks, and an adrenaline-fueled synthwave soundtrack feel!

---

## 🌟 Key Features

- **Fluid Physics Engine**: Realistic acceleration, friction, steering inertia, and tire-drift slip angles.
- **Dynamic Particle System**: Smoke puffs on tight turns, skid marks on asphalt, and fiery nitro explosions.
- **Multiple Circuits**: Choose between *Oval Speedway*, *Neon Circuit*, and *Hazard Canyon*.
- **Time Trial Mode**: Race against the clock with lap tracking and persistent high scores stored in `localStorage`.
- **Audio Synth & SFX**: Procedurally generated Web Audio API sound effects for engine revs, drifts, and crashes (no external assets required).
- **Zero Build Steps**: Pure HTML/JS/CSS that runs instantly in any modern web browser.

---

## 📁 Project Structure

```text
nitro-drift-arcade/
├── index.html        # Main HTML5 entry point & UI overlay
├── style.css         # Neon arcade styling & responsive layout
├── app.js            # Game engine, physics, inputs, and render loop
└── .gitignore        # Standard git ignore file
```

---

## 🚀 Quickstart & Usage

No installation or package managers required!

1. **Clone the repository**:
   ```bash
   git clone https://github.com/username/nitro-drift-arcade.git
   cd nitro-drift-arcade
   ```

2. **Open the game**:
   Simply open `index.html` in your favorite web browser:
   ```bash
   # On macOS
   open index.html

   # On Linux
   xdg-open index.html

   # On Windows
   start index.html
   ```
   *(Alternatively, run a quick local static server like `npx serve` or `python3 -m http.server`)*

---

## 🎮 Controls

| Key | Action |
| :--- | :--- |
| `W` / `Arrow Up` | Accelerate / Throttle |
| `S` / `Arrow Down` | Reverse / Brake |
| `A` / `Arrow Left` | Steer Left |
| `D` / `Arrow Right` | Steer Right |
| `Shift` | Nitro Boost (when charged) |
| `Esc` / `P` | Pause Game |

---

## 🛠️ Architecture & How It Works

- **Canvas 2D Context**: Renders cars, tracks, particle arrays, and HUD elements at 60 FPS using `requestAnimationFrame`.
- **State Machine**: Handles transitions between Main Menu, Track Select, Gameplay, Pause, and Game Over states.
- **Collision Detection**: Circle-to-rectangle bounding checks against track barriers and checkpoints.
- **Web Audio API**: Dynamically synthesizes engine pitch oscillation and screech frequencies on the fly.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` or check the header for details.
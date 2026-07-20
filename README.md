<div align="center">

# FINAL PASS

### Ride the last truck out. Keep the sky clear.

[![Play Final Pass](https://img.shields.io/badge/PLAY_NOW-FFB23E?style=for-the-badge&logo=github&logoColor=111111)](https://isaacnewtonne.github.io/FinalPass/)

[![Three.js](https://img.shields.io/badge/Three.js-0.180-000000?style=flat-square&logo=threedotjs)](https://threejs.org/)
[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222222?style=flat-square&logo=github)](https://isaacnewtonne.github.io/FinalPass/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=000000)](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Modules)
[![No Build Step](https://img.shields.io/badge/Build_Step-None-4CAF50?style=flat-square)](#running-locally)

**Final Pass** is a browser-based first-person survival game built entirely with HTML, CSS, JavaScript, and Three.js. Defend a moving pickup truck from waves of incoming drones while your teammate calls out threats from the truck bed.

[Play the game](https://isaacnewtonne.github.io/FinalPass/) · [Report an issue](https://github.com/IsaacNewtonne/FinalPass/issues) · [View source](https://github.com/IsaacNewtonne/FinalPass)

</div>

---

## The Mission

You are riding through a hostile mountain pass with one job: protect the truck. Track incoming drones, react to your teammate's warnings, and destroy each target before it reaches the vehicle.

The pressure increases every two minutes. Drones become faster, tougher, and more frequent as the convoy pushes deeper into the pass. There is no extraction timer—survive for as long as you can and chase a higher score.

## Features

- **First-person 3D combat** with mouse aiming, raycast shooting, recoil, muzzle flash, and reloading
- **Escalating survival loop** that raises the difficulty every two minutes
- **Directional teammate warnings** for threats approaching from the left, right, or front
- **Procedural roadside environment** with an endless moving road, terrain props, lighting, fog, and vehicle movement
- **Reactive combat feedback** including explosions, damage effects, camera shake, health, combos, and scoring
- **Four-channel in-game radio** powered by Hip Hop Circuit YouTube playlists
- **Cinematic interface** with mission briefing, HUD, pause screen, and post-run statistics
- **Static deployment** with no database, backend, bundler, or build pipeline required

## Controls

| Action | Control |
| --- | --- |
| Aim | Move mouse |
| Fire | Left mouse button |
| Reload | `R` |
| Pause | `Esc` |
| Previous / next track | Radio controls |
| Change playlist | `CH` radio button |
| Music volume | Radio volume slider |

> [!TIP]
> Play in a desktop browser with headphones for the intended experience. Click **Start Engine** to enable pointer-lock aiming, sound effects, and music.

## Running Locally

Final Pass uses native JavaScript modules, so the files must be served over HTTP rather than opened directly from the filesystem.

### Python

```powershell
git clone https://github.com/IsaacNewtonne/FinalPass.git
cd FinalPass
python -m http.server 8080
```

### Node.js

```powershell
git clone https://github.com/IsaacNewtonne/FinalPass.git
cd FinalPass
npx serve .
```

Open [http://localhost:8080](http://localhost:8080) in your browser. If `npx serve` chooses another port, use the address printed in the terminal.

## Project Structure

```text
FinalPass/
├── index.html    # Game interface, menus, HUD, and import map
├── styles.css    # Visual design, responsive layout, and effects
├── game.js       # Three.js scene, gameplay, audio, and radio logic
└── README.md     # Project documentation
```

## How It Works

The game is deliberately lightweight and framework-free:

1. `index.html` loads Three.js from jsDelivr through an import map.
2. `game.js` constructs the road, terrain, pickup, teammate, weapon, and drones from Three.js geometry.
3. A render loop advances vehicle motion, enemy behavior, particles, combat, and difficulty progression.
4. The YouTube IFrame Player API provides the optional in-game radio after user interaction.
5. GitHub Pages serves the repository as a static website; all game logic runs locally in the player's browser.

No player data is collected or stored by the game.

## Deployment

The production site is published directly from the repository's `main` branch.

To deploy a fork:

1. Open the repository's **Settings** page.
2. Select **Pages** under **Code and automation**.
3. Set the source to **Deploy from a branch**.
4. Choose `main` and `/ (root)`.
5. Save and wait for the Pages deployment to finish.

Because every asset path is relative, the game works from a GitHub Pages project URL such as `username.github.io/FinalPass/`.

## Music and External Services

The radio streams four playlists from [Hip Hop Circuit](https://www.youtube.com/@Hip_Hop_Circuit) using the YouTube IFrame Player API. Playback begins only after the player interacts with the start screen, in line with browser autoplay restrictions.

Music availability, advertisements, regional restrictions, and playback behavior are controlled by YouTube and the respective rights holders. An internet connection is required for Three.js, web fonts, and radio playback.

## Browser Support

Final Pass requires a modern browser with WebGL 2, ES modules, pointer lock, and Web Audio support. Current desktop versions of Chrome, Edge, and Firefox are recommended. Mobile layouts are partially supported, but the game is designed around mouse aiming.

## Contributing

Ideas, bug reports, and gameplay feedback are welcome. Open an [issue](https://github.com/IsaacNewtonne/FinalPass/issues) with:

- A clear description of the problem or suggestion
- Steps to reproduce bugs
- Your browser and operating system
- A screenshot or console error when relevant

---

<div align="center">

Built with Three.js and a questionable amount of confidence in the person holding the rifle.

**[Enter the pass →](https://isaacnewtonne.github.io/FinalPass/)**

</div>

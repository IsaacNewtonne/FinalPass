# Final Pass

A static first-person Three.js survival game designed for GitHub Pages. Defend a moving pickup from incoming drones while the difficulty increases every two minutes.

## Run locally

ES modules must be served over HTTP. From this folder, run one of:

```powershell
python -m http.server 8080
```

or:

```powershell
npx serve .
```

Then open `http://localhost:8080`.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.

No application server is required. GitHub Pages serves the files, and the game runs entirely in the browser. The only external runtime dependency is Three.js, loaded from jsDelivr.

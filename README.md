# Nick Budget

Personal finance dashboard — works offline, installs as an app on your phone.

## Quick Setup (5 minutes)

### 1. Create a GitHub repo

- Go to [github.com/new](https://github.com/new)
- Name it `nick-budget` (this must match the `base` in `vite.config.js`)
- Make it **Private** (your financial data stays in your browser, but no need for the code to be public either)
- Don't add a README (you already have one)

### 2. Push the code

Open Terminal and run:

```bash
cd nick-budget
npm install
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nick-budget.git
git push -u origin main
```

### 3. Deploy to GitHub Pages

```bash
npm run deploy
```

This builds the app and pushes it to a `gh-pages` branch automatically.

### 4. Enable GitHub Pages

- Go to your repo on GitHub → **Settings** → **Pages**
- Under "Source", select **Deploy from a branch**
- Branch: `gh-pages` / `/ (root)`
- Click Save
- Wait ~60 seconds, your site will be live at:

```
https://YOUR_USERNAME.github.io/nick-budget/
```

### 5. Install on your phone

- Open the URL on your iPhone in Safari
- Tap the **Share** button (box with arrow)
- Tap **Add to Home Screen**
- It now works like a native app, including offline

## Updating

Make changes to the code, then:

```bash
npm run deploy
```

The PWA will auto-update next time you open it with internet.

## How data works

- All your data is saved in your **browser's localStorage**
- Nothing is sent to any server — it's 100% private
- Data persists between sessions and works offline
- If you clear your browser data, you'll lose your saved numbers
- Different devices have separate data (it doesn't sync between phone and laptop)

## If you want to change the repo name

1. Update `base` in `vite.config.js` to match: `base: '/your-repo-name/'`
2. Update `start_url` and `scope` in the same file
3. Update the `link` tags in `index.html`
4. Run `npm run deploy` again

## Tech stack

- React 18
- Vite 5
- Recharts (charts)
- Lucide React (icons)
- vite-plugin-pwa (offline/installable)
- GitHub Pages (hosting, free)

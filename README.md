# Yahavi Premier League (YPL) — Season 2

Static multi-page website for a society cricket tournament. Built for GitHub Pages using **HTML + CSS + Vanilla JS** (no backend).

## Folder structure

```
/
  ├── index.html
  ├── register.html
  ├── schedule.html
  ├── teams.html
  ├── leaderboard.html
  └── assets/
      ├── css/
      │   ├── main.css
      │   ├── navbar.css
      │   ├── hero.css
      │   └── register.css
      ├── js/
      │   ├── main.js
      │   └── register.js
      └── images/
          ├── ypl-logo.jpg (or ypl-logo.png)
          ├── hero-bg.jpg
          └── upi-qr.png
```

## Run locally

From the repo root:

```bash
python3 -m http.server 5173
```

Open `http://localhost:5173/index.html`

## FormSubmit setup

In `register.html`, replace:

`https://formsubmit.co/your-email@example.com`

with your real email URL, for example:

`https://formsubmit.co/you@example.com`

## Images

- Put your logo at `assets/images/ypl-logo.jpg` (or `.png`)
- Put your UPI QR at `assets/images/upi-qr.png`


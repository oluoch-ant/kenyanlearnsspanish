# Aprende — installable phone app (PWA)

This folder is the complete, ready-to-host app:

| File | Role |
|---|---|
| `index.html` | The whole app (a copy of `../spanish-teacher.html`) |
| `manifest.webmanifest` | App name, icon, "open as full-screen app" settings |
| `sw.js` | Service worker — caches everything so it works with no internet |
| `icon-*.png` | Home-screen icons (Android 192/512, iPhone 180) |

## Put it online (one time, ~2 minutes, no code)

Installable apps must be served over HTTPS, so the folder needs a (free) host.
Easiest options:

**Netlify** — go to https://app.netlify.com/drop, sign up free, and drag this
whole `pwa` folder onto the page. You get a link like
`https://something.netlify.app` immediately.

**GitHub Pages** — on github.com: New repository → upload these 6 files →
Settings → Pages → deploy from branch `main`. Your link:
`https://<username>.github.io/<repo>/`.

The page is public at that link, but unlisted — only people you give the
link to will find it, and your progress stays on your own device either way.

## Install it on your phone

Open your link on the phone, then:
- **iPhone (Safari)**: Share button → *Add to Home Screen*
- **Android (Chrome)**: ⋮ menu → *Add to Home screen* / *Install app*

You get the 🔥 icon, it opens full-screen with no browser bars, and after the
first visit it works entirely offline.

## Moving progress between devices

In the app: **Progress → 📤 Export progress** downloads a small file.
Send it to yourself (email/WhatsApp), open the app on the other device,
**📥 Import progress**. Import replaces that device's progress.

## Updating the app later

1. Copy the new `../spanish-teacher.html` over `index.html` in this folder.
2. In `sw.js`, bump `VERSION` (e.g. `aprende-v1` → `aprende-v2`) — this is what
   makes installed phones fetch the new build.
3. Re-upload the folder to your host (Netlify: drag onto the same site's
   "Deploys" page).

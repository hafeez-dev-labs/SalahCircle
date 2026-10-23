# SalahCircle

A family-friendly Salah and dhikr Progressive Web App with an Islamic-inspired emerald, ivory, and antique-gold visual style. No account or backend is required.

## Features
- Daily prayer times from AlAdhan, editable location, calculation method, and Hanafi Asr setting.
- Upcoming-prayer countdown, optional in-page notifications, and configurable Adhan audio URL.
- Dhikr counter with configurable target and locally saved count.
- Family circle profiles and daily five-prayer check-ins.
- Quran reading log with an adjustable daily page goal.
- Daily Quran reflection with Arabic text, translation, reference, and local favourites.
- Family intentions / dua list and a daily good-deeds checklist for Ramadan or any time.
- Approximate Hijri date using the browser's Islamic calendar implementation.
- Installable PWA shell, responsive styling, and offline caching of app files.

## Family privacy
Family profiles, prayer check-ins, reading progress, intentions, favourites, and preferences stay in the current browser's local storage. They do **not** synchronize between family members' phones. There is no account, analytics, or backend. Check-ins are a gentle household reminder, not a measure of anyone's faith. A secure shared backend can be added later if cross-device synchronization is needed.

## Technology
Application logic is authored in TypeScript (`app.ts`) and compiled to browser-ready `app.js`. The generated JavaScript is committed so GitHub Pages can serve the PWA directly. The UI uses HTML and CSS; the service worker remains JavaScript.

Requirements: Node.js and npm.

    npm install
    npm run typecheck
    npm run build

## Run locally
Serve the folder over HTTP:

    python -m http.server 8080

Open http://localhost:8080. Prayer times need an internet connection for AlAdhan. Change the location and calculation method in Settings if needed.

## Deploy to GitHub Pages
The existing Pages workflow deploys the repository root on pushes to `main`. In repository Settings → Pages, select GitHub Actions as the deployment source if prompted.

## Notifications and Adhan limitations
- Notifications are checked only while the page is open and are not reliable when the app is closed because GitHub Pages has no push-notification backend.
- Adhan playback needs a direct audio URL and user permission; autoplay and background audio restrictions vary by platform.
- Hijri dates can differ by local moon sighting. Prayer timings may vary by calculation method and mosque; confirm important timings locally.

## Privacy
Prayer location is sent to AlAdhan when refreshing prayer times. Family data stays local to this device. Use approximate coordinates if you prefer not to send precise location to the prayer-time service.

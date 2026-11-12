# SalahCircle

A family-friendly Salah and dhikr Progressive Web App with an Islamic-inspired emerald, ivory, and antique-gold visual style. No account or backend is required.

## Features
- Daily prayer times from AlAdhan, editable location, calculation method, and Hanafi Asr setting.
- Upcoming-prayer countdown, optional notifications, and configurable per-prayer Adhan playback while the PWA is active.
- Dhikr counter with configurable target and locally saved count.
- Family circle profiles and daily five-prayer check-ins.
- Quran reading log with dated reading history and weekly progress.
- Qibla bearing and optional device-compass view with a manual fallback.
- Guided morning/evening and post-Salah adhkar routines with source references and resumable counts.
- A private Qada tracker for user-entered make-up prayer balances.
- An estimated Islamic calendar with White Days, fasting-day indicators, and local Hijri adjustment.
- Versioned JSON backup and restore for local data.
- Daily Quran reflection with Arabic text, translation, reference, and local favourites.
- Family intentions / dua list and a daily good-deeds checklist for Ramadan or any time.
- Approximate Hijri date using the browser's Islamic calendar implementation.
- Installable PWA shell, responsive styling, and offline caching of app files.

## Family privacy
Family profiles, prayer check-ins, reading history, Qada records, adhkar progress, intentions, favourites, calendar preferences, and settings stay in the current browser's local storage. Use Backup and restore to export or restore a versioned JSON backup. They do **not** synchronize between family members' phones. There is no account, analytics, or backend. Check-ins are a gentle household reminder, not a measure of anyone's faith. A secure shared backend can be added later if cross-device synchronization is needed.

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
- Prayer notifications are checked while the PWA page is active. GitHub Pages is static and has no push server or scheduled background jobs.
- Adhan playback supports per-prayer selection and a test/stop control. On mobile, open the installed PWA, enable Adhan, use **Test Adhan** to check the audio URL and browser playback permission, and keep the app active around prayer time.
- **Important:** browsers may suspend timers and audio when a PWA is backgrounded, the device is locked, or the app is closed. This static PWA cannot guarantee closed-app Adhan. Reliable closed-app delivery needs a push backend and platform-supported notification behavior; web push cannot reliably play an arbitrary MP3 as a notification sound.
- Adhan audio requires a direct audio URL and user interaction; autoplay and background audio restrictions vary by platform.
- Hijri dates are estimates and can differ by local moon sighting. Follow local mosque/community announcements for Ramadan and Eid.
- Qada counts are personal records entered by the user, not a calculation of religious obligations or a fatwa.

## Privacy
Prayer location is sent to AlAdhan when refreshing prayer times. Family data stays local to this device. Use approximate coordinates if you prefer not to send precise location to the prayer-time service.

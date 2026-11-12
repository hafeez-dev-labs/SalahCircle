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
- First-visit **How to use SalahCircle** guide, reopenable from the header.
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

## Adhan playback and Android exact alarms

- The app includes Wikimedia Commons' **"Adhan"** recording by Aishatu98, released under **CC0 1.0**. It is stored at assets/adhan.ogg, cached by the PWA service worker, and included in the Android APK. No external URL or audio host is required.
- In the browser-only PWA, reminders and audio playback are best-effort while the page is active. Browsers can suspend timers and audio when the PWA is backgrounded, the device is locked, or the app is closed. Web notifications cannot play an arbitrary full-length Adhan recording as a custom notification sound.
- For private family use on Android, the android/ project provides a sideloadable WebView app. It requests Android's **Alarms & reminders** special access and notification permission, schedules prayer alarms with AlarmManager.setExactAndAllowWhileIdle(), plays the bundled recording from a native media-playback foreground service, and restores alarms after reboot.
- On each prayer-calendar refresh the Android app registers upcoming prayer times from the current and following month. Keep the app connected occasionally so the local schedule can refresh as prayer times change.
- Exact alarms require the user to grant special access in Android Settings. Android can revoke that access; notifications and foreground playback can also be affected by device settings, battery controls, or user actions. Check the permission status in the Adhan card. No app can promise delivery if the operating system blocks or the user disables it.
- Build the family APK by opening the android/ folder in Android Studio or using the repository's Android APK workflow. Install the debug APK directly on family devices; no store publication or account is required.

Prayer times are sourced from AlAdhan. Confirm computed times with your trusted local mosque or timetable, especially where local conventions differ. The app requests Hanafi Asr timings.

- Hijri dates are estimates and can differ by local moon sighting. Follow local mosque/community announcements for Ramadan and Eid.
- Qada counts are personal records entered by the user, not a calculation of religious obligations or a fatwa.

## Privacy
Prayer location is sent to AlAdhan when refreshing prayer times. Family data stays local to this device. Use approximate coordinates if you prefer not to send precise location to the prayer-time service.

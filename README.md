# SalahCircle

A private-by-design, family-friendly Salah and dhikr Progressive Web App. No account or backend required.

## Features
- Daily prayer times from the AlAdhan API, with editable coordinates and Hanafi Asr setting.
- Prayer reminders while the app is open, browser notification permission, and optional Adhan audio from a direct audio URL you trust.
- Dhikr counter with configurable target, progress, and locally saved count.
- Installable PWA shell with offline caching for the app files.
- Responsive layout and local-only preferences.

## Run locally
Serve this folder over HTTP (service workers and notifications do not work reliably from file URLs):

    python -m http.server 8080

Open http://localhost:8080. Prayer times need an internet connection for the AlAdhan API. Set a location using latitude and longitude in Settings.

## Deploy to GitHub Pages
The included GitHub Actions workflow deploys the repository root to GitHub Pages on pushes to main. In repository Settings → Pages, choose GitHub Actions as the build/deployment source if prompted. After the first successful run, open the Pages URL and choose Install app / Add to Home Screen from your browser.

## Notifications and Adhan limitations
- Notifications require permission and a supported browser. This app schedules reminders only while its page is open; it does not promise reliable background or closed-app alerts because GitHub Pages has no push-notification backend.
- Adhan playback is optional. Browsers require a user gesture before audio can play; some mobile operating systems restrict background audio. In Settings, provide a direct MP3/OGG URL for an Adhan audio file you have permission to use. Test it with Test Adhan.
- Keep the app open for reminders. For dependable alerts when the app is closed, a push-enabled server/native app would be needed.

## Privacy
Prayer location, preferences, and dhikr count stay in this browser's local storage. Prayer times are requested from AlAdhan when refreshing. No analytics or account system is included. Use approximate coordinates if you prefer not to share precise location with the prayer-time service.

## Validation
The CI workflow runs JavaScript syntax validation and checks required PWA files before publishing.

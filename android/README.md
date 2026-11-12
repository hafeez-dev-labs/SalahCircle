# SalahCircle Family for Android

This is a private, sideloadable Android wrapper around the SalahCircle PWA. It is intended for your family devices and does not require Play Store publication, an account, or a server-side alarm scheduler.

## Build a debug APK

1. Install Android Studio and its Android SDK (API 35).
2. Open this android/ directory as a project.
3. Let Gradle sync, then choose Build → Build Bundle(s) / APK(s) → Build APK(s).
4. Install app/build/outputs/apk/debug/app-debug.apk on each family Android phone.

The repository's Android APK GitHub Actions workflow also builds the debug APK and publishes it as a downloadable workflow artifact.

The app loads the current GitHub Pages PWA at the URL configured in app/build.gradle.kts. Keep the device online when refreshing prayer times; the app caches its web shell and the bundled Adhan audio for later use.

## Enable scheduled Adhan

1. Open the Android app and allow notifications.
2. In the Adhan card, choose the prayers you want and enable Adhan playback.
3. Tap Grant Alarms & reminders access and enable Allow setting alarms and reminders in Android Settings.
4. Return to SalahCircle. The app registers future prayer alarms from the current and following month. The app refreshes this schedule whenever prayer times are fetched.
5. Test the built-in Adhan from the Adhan card.

The Android wrapper uses SCHEDULE_EXACT_ALARM, checks AlarmManager.canScheduleExactAlarms(), and schedules with setExactAndAllowWhileIdle(). It restores pending alarms after reboot and starts a native media-playback foreground service to play the included CC0 recording.

Android may revoke exact-alarm access, and notification permission, battery controls, Do Not Disturb, volume, and device-specific restrictions still matter. Check the Adhan card for permission state. No app can override a permission that the device owner or operating system has disabled.

The ordinary browser PWA remains best-effort for background or closed-app playback. The native exact-alarm path is available only in this Android wrapper.

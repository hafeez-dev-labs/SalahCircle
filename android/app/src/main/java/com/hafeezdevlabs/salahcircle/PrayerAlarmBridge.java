package com.hafeezdevlabs.salahcircle;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

public final class PrayerAlarmBridge {
    private final Activity activity;

    PrayerAlarmBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean canScheduleExactAlarms() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager manager = (AlarmManager) activity.getSystemService(Context.ALARM_SERVICE);
        return manager != null && manager.canScheduleExactAlarms();
    }

    @JavascriptInterface
    public void requestExactAlarmPermission() {
        activity.runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExactAlarms()) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:" + activity.getPackageName()));
                activity.startActivity(intent);
            }
        });
    }

    @JavascriptInterface
    public boolean hasNotificationPermission() {
        return Build.VERSION.SDK_INT < 33 || activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            == android.content.pm.PackageManager.PERMISSION_GRANTED;
    }

    @JavascriptInterface
    public void requestNotificationPermission() {
        activity.runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= 33 && !hasNotificationPermission()) {
                activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4102);
            }
        });
    }

    @JavascriptInterface
    public String schedulePrayerAlarms(String alarmsJson) {
        if (alarmsJson == null) return "invalid";
        try {
            int scheduled = AlarmScheduler.replace(activity, alarmsJson);
            return canScheduleExactAlarms() ? "scheduled:" + scheduled : "permission_required";
        } catch (Exception error) {
            return "error:" + error.getClass().getSimpleName();
        }
    }

    @JavascriptInterface
    public int getScheduledAlarmCount() {
        return AlarmScheduler.getFutureAlarmCount(activity);
    }
}

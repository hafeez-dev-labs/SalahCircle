package com.hafeezdevlabs.salahcircle;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

public final class AlarmScheduler {
    private static final String PREFS = "salahcircle_native_alarms";
    private static final String KEY = "alarms_json";

    private AlarmScheduler() {}

    static int replace(Context context, String json) throws Exception {
        String oldJson = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]");
        try {
            JSONArray previous = new JSONArray(oldJson);
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (manager != null) {
                for (int i = 0; i < previous.length(); i++) cancel(context, manager, previous.optJSONObject(i));
            }
        } catch (Exception ignored) {
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply();
        return schedule(context, new JSONArray(json));
    }

    static int restore(Context context) {
        try {
            String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]");
            return schedule(context, new JSONArray(json));
        } catch (Exception ignored) {
            return 0;
        }
    }

    static int getFutureAlarmCount(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (manager == null || !manager.canScheduleExactAlarms()) return 0;
        }
        try {
            JSONArray alarms = new JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"));
            int count = 0;
            long now = System.currentTimeMillis();
            for (int i = 0; i < alarms.length(); i++) {
                if (alarms.getJSONObject(i).optLong("triggerAtMillis") > now) count++;
            }
            return count;
        } catch (Exception ignored) {
            return 0;
        }
    }

    private static int schedule(Context context, JSONArray alarms) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) return 0;

        int count = 0;
        long now = System.currentTimeMillis();
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject item = alarms.optJSONObject(i);
            if (item == null) continue;
            long trigger = item.optLong("triggerAtMillis", 0L);
            if (trigger <= now) continue;
            String id = item.optString("id", "");
            String title = item.optString("title", "Salah");
            if (id.isEmpty()) continue;
            Intent intent = new Intent(context, PrayerAlarmReceiver.class)
                .setAction("com.hafeezdevlabs.salahcircle.PRAYER_ALARM")
                .setData(Uri.parse("salahcircle://prayer/" + Uri.encode(id)))
                .putExtra("prayer_title", title)
                .putExtra("alarm_id", id);
            PendingIntent pending = PendingIntent.getBroadcast(context, id.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            try {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pending);
                count++;
            } catch (SecurityException ignored) {
                return 0;
            }
        }
        return count;
    }

    private static void cancel(Context context, AlarmManager manager, JSONObject item) {
        if (item == null) return;
        String id = item.optString("id", "");
        if (id.isEmpty()) return;
        Intent intent = new Intent(context, PrayerAlarmReceiver.class)
            .setAction("com.hafeezdevlabs.salahcircle.PRAYER_ALARM")
            .setData(Uri.parse("salahcircle://prayer/" + Uri.encode(id)));
        PendingIntent pending = PendingIntent.getBroadcast(context, id.hashCode(), intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pending != null) {
            manager.cancel(pending);
            pending.cancel();
        }
    }
}

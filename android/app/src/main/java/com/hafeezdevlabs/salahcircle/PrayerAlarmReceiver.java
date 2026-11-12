package com.hafeezdevlabs.salahcircle;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class PrayerAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra("prayer_title");
        Intent playback = new Intent(context, AdhanPlaybackService.class)
            .setAction(AdhanPlaybackService.ACTION_PLAY)
            .putExtra("prayer_title", title == null ? "Salah" : title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(playback);
        else context.startService(playback);
    }
}

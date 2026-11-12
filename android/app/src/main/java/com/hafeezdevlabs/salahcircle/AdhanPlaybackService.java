package com.hafeezdevlabs.salahcircle;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

public final class AdhanPlaybackService extends Service {
    static final String ACTION_PLAY = "com.hafeezdevlabs.salahcircle.PLAY_ADHAN";
    private static final String ACTION_STOP = "com.hafeezdevlabs.salahcircle.STOP_ADHAN";
    private static final String CHANNEL = "salahcircle_adhan_playback";
    private static final int NOTIFICATION_ID = 4103;
    private MediaPlayer player;

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Adhan playback", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Shows while the locally scheduled Adhan is playing.");
            channel.setSound(null, null);
            manager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopPlayback();
            stopSelf();
            return START_NOT_STICKY;
        }
        String prayer = intent == null ? "Salah" : intent.getStringExtra("prayer_title");
        startForeground(NOTIFICATION_ID, buildNotification(prayer == null ? "Salah" : prayer));
        stopPlayer();
        player = MediaPlayer.create(this, R.raw.adhan);
        if (player == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        player.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
        player.setOnCompletionListener(mp -> stopSelf());
        player.setOnErrorListener((mp, what, extra) -> {
            stopSelf();
            return true;
        });
        player.start();
        return START_NOT_STICKY;
    }

    private Notification buildNotification(String prayer) {
        Intent stop = new Intent(this, AdhanPlaybackService.class).setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(this, 4104, stop,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL)
            : new Notification.Builder(this);
        return builder
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("SalahCircle · " + prayer)
            .setContentText("Adhan is playing")
            .setOngoing(true)
            .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_pause, "Stop", stopPending).build())
            .build();
    }

    private void stopPlayer() {
        if (player != null) {
            try { if (player.isPlaying()) player.stop(); } catch (Exception ignored) {}
            player.release();
            player = null;
        }
    }

    private void stopPlayback() {
        stopPlayer();
        stopForeground(true);
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

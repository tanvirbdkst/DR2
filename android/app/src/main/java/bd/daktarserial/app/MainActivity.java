package bd.daktarserial.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    /**
     * Initializes notification channels for Android 8.0+ (Oreo and above).
     * This ensures push notifications, doctor call alerts, and emergency serial notices
     * play sound, vibrate, and display properly.
     *
     * FirebaseApp is automatically initialized by the com.google.gms.google-services
     * Gradle plugin and FirebaseInitProvider using google-services.json.
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                // Default Daktar Serial Notification Channel
                NotificationChannel serialChannel = new NotificationChannel(
                        "daktar_serial_channel",
                        "Daktar Serial Notifications",
                        NotificationManager.IMPORTANCE_HIGH
                );
                serialChannel.setDescription("Chamber serial queue updates, booking confirmations, and patient call alerts");
                serialChannel.enableVibration(true);
                serialChannel.enableLights(true);

                // Emergency & Helpline Notification Channel
                NotificationChannel emergencyChannel = new NotificationChannel(
                        "emergency_channel",
                        "Emergency & Helpline Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                );
                emergencyChannel.setDescription("Urgent medical alerts and emergency walk-in queue notifications");
                emergencyChannel.enableVibration(true);
                emergencyChannel.enableLights(true);

                manager.createNotificationChannel(serialChannel);
                manager.createNotificationChannel(emergencyChannel);
            }
        }
    }
}

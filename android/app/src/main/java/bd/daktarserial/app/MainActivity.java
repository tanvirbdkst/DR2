package bd.daktarserial.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        safeInitFirebase();
    }

    /**
     * Ensures FirebaseApp is safely initialized to prevent native fatal crashes
     * when PushNotificationsPlugin calls FirebaseMessaging.getInstance()
     * before a production google-services.json is added.
     */
    private void safeInitFirebase() {
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseOptions options = new FirebaseOptions.Builder()
                        .setApplicationId("bd.daktarserial.app")
                        .setApiKey("AIzaSyDummyFallbackKeyForSafeInitOnly")
                        .setProjectId("daktar-serial-app")
                        .build();
                FirebaseApp.initializeApp(this, options);
                Log.i(TAG, "Safe fallback FirebaseApp initialized to prevent native push startup crash.");
            }
        } catch (Throwable t) {
            Log.w(TAG, "Firebase initialization notice: " + t.getMessage());
        }
    }
}

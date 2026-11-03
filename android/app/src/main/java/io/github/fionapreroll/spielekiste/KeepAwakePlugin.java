package io.github.fionapreroll.spielekiste;

import android.app.Activity;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps the screen on while the player sits at a table (src/native.ts): a phone that goes dark
 * there stops answering, and drops out of the table. The window's flag needs no permission, and
 * Android lets go of it when the app goes to the background.
 */
@CapacitorPlugin(name = "KeepAwake")
public class KeepAwakePlugin extends Plugin {

    @PluginMethod
    public void keepAwake(PluginCall call) {
        setFlag(call, true);
    }

    @PluginMethod
    public void allowSleep(PluginCall call) {
        setFlag(call, false);
    }

    private void setFlag(PluginCall call, boolean on) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(() -> {
            if (on) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }
}

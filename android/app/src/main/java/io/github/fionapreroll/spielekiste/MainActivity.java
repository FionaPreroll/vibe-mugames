package io.github.fionapreroll.spielekiste;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * The app's only screen, Capacitor's WebView with the Spielekiste. Most of its plugins come with
 * their packages, which Capacitor registers: Bluetooth from @fionapreroll/p2p-nearby and updates
 * from @fionapreroll/app-updates. The app's own, KeepAwakePlugin, is registered here.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KeepAwakePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

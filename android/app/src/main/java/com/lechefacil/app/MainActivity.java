package com.lechefacil.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		// Register custom native plugin
		registerPlugin(com.lechefacil.app.wificonnector.WifiConnectorPlugin.class);
	}
}

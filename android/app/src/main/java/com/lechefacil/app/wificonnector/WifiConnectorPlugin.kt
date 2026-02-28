package com.lechefacil.app.wificonnector

import android.Manifest
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.getcapacitor.annotation.PluginMethod

@CapacitorPlugin(name = "WifiConnector")
class WifiConnectorPlugin : Plugin() {
    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var currentNetwork: Network? = null

    @PluginMethod
    fun connectToBalanza(call: PluginCall) {
        val ssid = call.getString("ssid") ?: "Balanza"
        val password = call.getString("password") ?: "12345678"
        val ctx: Context = bridge.activity ?: bridge.context
        connectivityManager = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Requires Android 10+ (API 29+)")
            return
        }

        // Check permissions - the plugin expects permissions granted. If not, reject with code to request from JS.
        try {
            val pm = ctx.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
            if (pm != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                val err = JSObject()
                err.put("code", "MISSING_PERMISSIONS")
                err.put("permissions", arrayOf(Manifest.permission.ACCESS_FINE_LOCATION))
                call.reject("Missing required permissions", err)
                return
            }
        } catch (e: Exception) {
            // ignore
        }

        try {
            val specifier = WifiNetworkSpecifier.Builder()
                .setSsid(ssid)
                .setWpa2Passphrase(password)
                .build()

            val request = NetworkRequest.Builder()
                .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                .setNetworkSpecifier(specifier)
                .build()

            networkCallback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    currentNetwork = network
                    // bind process to network so app traffic uses it
                    try {
                        connectivityManager?.bindProcessToNetwork(network)
                    } catch (e: Exception) {
                        // ignore
                    }
                    val res = JSObject()
                    res.put("connected", true)
                    call.resolve(res)
                }

                override fun onLost(network: Network) {
                    if (currentNetwork == network) {
                        try {
                            connectivityManager?.bindProcessToNetwork(null)
                        } catch (e: Exception) {}
                        currentNetwork = null
                        val ev = JSObject()
                        ev.put("connected", false)
                        notifyListeners("onBalanzaLost", ev)
                    }
                }

                override fun onUnavailable() {
                    call.reject("Network unavailable")
                }
            }

            connectivityManager?.requestNetwork(request, networkCallback!!)
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        try {
            if (networkCallback != null && connectivityManager != null) {
                try {
                    connectivityManager?.unregisterNetworkCallback(networkCallback!!)
                } catch (e: Exception) {}
                try {
                    connectivityManager?.bindProcessToNetwork(null)
                } catch (e: Exception) {}
                networkCallback = null
                currentNetwork = null
            }
            val res = JSObject()
            res.put("disconnected", true)
            call.resolve(res)
        } catch (e: Exception) {
            call.reject(e.message)
        }
    }
}

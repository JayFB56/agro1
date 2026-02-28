import { EdgeToEdge } from "@capawesome/capacitor-android-edge-to-edge-support";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

const applyTheme = async (isDarkMode: boolean) => {
  const backgroundColor = isDarkMode ? "#0f172a" : "#ffffff";
  await EdgeToEdge.setBackgroundColor({ color: backgroundColor });
  await StatusBar.setStyle({ style: isDarkMode ? Style.Dark : Style.Light });
};

export async function initializeCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
    await CapacitorUpdater.notifyAppReady();
  } catch (error) {
    console.error("Failed to notify Capacitor updater:", error);
  }

  try {
    await EdgeToEdge.enable();

    const matchMedia = window.matchMedia("(prefers-color-scheme: dark)");
    await applyTheme(matchMedia.matches);
    matchMedia.addEventListener("change", async (event) => {
      await applyTheme(event.matches);
    });
  } catch (error) {
    console.error("Capacitor bootstrap error:", error);
  }
}

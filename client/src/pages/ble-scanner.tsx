import { Bluetooth, Zap } from "lucide-react";
import { ScanControls } from "@/components/bluetooth/scan-controls";
import { DeviceDetails } from "@/components/bluetooth/device-details";
import { StatusFooter } from "@/components/bluetooth/status-footer";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useBluetooth } from "@/hooks/use-bluetooth";

export default function BleScanner() {
  const { scanStatus, connectionStatus, selectedDevice } = useBluetooth();

  console.log('BleScanner render:', {
    hasDevice: !!selectedDevice,
    deviceName: selectedDevice?.name,
    isConnected: selectedDevice?.connected
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-3">
            <Bluetooth className="text-primary text-2xl" />
            Makerville Badge
            <a href="/flash">
              <Zap className="w-5 h-5 text-slate-500 hover:text-primary transition-colors cursor-pointer" />
            </a>
            <a
              href="https://github.com/makerville/makerville-badge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-primary transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Discover and tweak badges near you using BLE</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          {/* Scan Controls */}
          <ScanControls />

          {/* Device Details (shown when device is selected) */}
          {selectedDevice && <DeviceDetails />}

          {/* Status Footer */}
          <StatusFooter />
        </div>
      </main>

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={scanStatus.isScanning || connectionStatus.isConnecting}
        title={scanStatus.isScanning ? "Scanning for Devices" : "Connecting to Device"}
        message={scanStatus.isScanning
          ? "Looking for nearby Bluetooth devices..."
          : "Please wait while we establish a connection..."
        }
      />
    </div>
  );
}

import { Bluetooth } from "lucide-react";
import { ScanControls } from "@/components/bluetooth/scan-controls";
import { DeviceList } from "@/components/bluetooth/device-list";
import { DeviceDetails } from "@/components/bluetooth/device-details";
import { StatusFooter } from "@/components/bluetooth/status-footer";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useBluetooth } from "@/hooks/use-bluetooth";

export default function BleScanner() {
  const { scanStatus, connectionStatus, selectedDevice } = useBluetooth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-3">
            <Bluetooth className="text-primary text-2xl" />
            Makerville Badge
          </h1>
          <p className="text-sm text-slate-500 mt-1">Discover and tweak badges near you over BLE</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          {/* Scan Controls */}
          <ScanControls />

          {/* Device List */}
          <DeviceList />

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

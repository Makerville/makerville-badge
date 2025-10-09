import { ScanControls } from "@/components/bluetooth/scan-controls";
import { DeviceDetails } from "@/components/bluetooth/device-details";
import { StatusFooter } from "@/components/bluetooth/status-footer";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Navigation } from "@/components/ui/navigation";
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
      <Navigation currentPage="home" />

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

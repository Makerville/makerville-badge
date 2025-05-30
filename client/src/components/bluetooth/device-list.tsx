import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { Bluetooth } from "lucide-react";

export function DeviceList() {
  const { selectedDevice, scanStatus } = useBluetooth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bluetooth Scanner</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedDevice ? (
          <div className="text-center py-4">
            <Bluetooth className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-sm text-slate-600">
              Connected to <span className="font-medium">{selectedDevice.name}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              You can now write text to the badge
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <Bluetooth className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm text-slate-600">
              {scanStatus.isScanning ? (
                "Scanning for devices..."
              ) : (
                "Click 'Scan for Devices' to connect to your badge"
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Make sure your badge is turned on and in range
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

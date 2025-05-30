import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { BadgeWriter } from "./badge-writer";

export function DeviceDetails() {
  const { selectedDevice, disconnectFromDevice } = useBluetooth();

  console.log('DeviceDetails render:', {
    hasDevice: !!selectedDevice,
    deviceName: selectedDevice?.name,
    isConnected: selectedDevice?.connected
  });

  if (!selectedDevice) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Device Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Name:</strong> {selectedDevice.name}</p>
            <p><strong>Status:</strong> {selectedDevice.connected ? 'Connected' : 'Disconnected'}</p>
          </div>
        </CardContent>
      </Card>

      <BadgeWriter />

      <Button
        variant="destructive"
        onClick={() => disconnectFromDevice(selectedDevice)}
        className="w-full"
      >
        Disconnect
      </Button>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Headphones, 
  Smartphone, 
  Activity, 
  Info, 
  Link, 
  Unlink, 
  Loader2,
  Bluetooth
} from "lucide-react";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { BluetoothDeviceInfo } from "@/types/bluetooth";

function getDeviceIcon(deviceName: string) {
  const name = deviceName.toLowerCase();
  
  if (name.includes('airpods') || name.includes('headphones') || name.includes('speaker')) {
    return <Headphones className="text-white text-sm" />;
  }
  
  if (name.includes('phone') || name.includes('samsung') || name.includes('iphone')) {
    return <Smartphone className="text-white text-sm" />;
  }
  
  if (name.includes('tracker') || name.includes('watch') || name.includes('fitness')) {
    return <Activity className="text-white text-sm" />;
  }
  
  return <Bluetooth className="text-white text-sm" />;
}

function getDeviceIconColor(connected: boolean, connecting?: boolean) {
  if (connected) return "bg-blue-500";
  if (connecting) return "bg-yellow-500";
  return "bg-gray-500";
}

function getConnectionBadge(device: BluetoothDeviceInfo) {
  if (device.connected) {
    return (
      <Badge className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium">
        Connected
      </Badge>
    );
  }
  
  if (device.connecting) {
    return (
      <Badge className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Connecting
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-medium">
      Available
    </Badge>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

interface DeviceListItemProps {
  device: BluetoothDeviceInfo;
  onConnect: (device: BluetoothDeviceInfo) => void;
  onDisconnect: (device: BluetoothDeviceInfo) => void;
  onShowDetails: (device: BluetoothDeviceInfo) => void;
}

function DeviceListItem({ device, onConnect, onDisconnect, onShowDetails }: DeviceListItemProps) {
  return (
    <div className="p-4 hover:bg-slate-50 transition-colors duration-150">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${getDeviceIconColor(device.connected, device.connecting)} rounded-full flex items-center justify-center`}>
            {getDeviceIcon(device.name)}
          </div>
          <div>
            <h3 className="font-medium text-slate-800">{device.name}</h3>
            <p className="text-xs text-slate-500 font-mono">{device.id || 'Unknown ID'}</p>
          </div>
        </div>
        {getConnectionBadge(device)}
      </div>
      
      <div className="text-xs text-slate-400 mb-3">
        {device.rssi && <span>RSSI: {device.rssi} dBm</span>}
        {device.rssi && <span> • </span>}
        <span>{formatTimeAgo(device.lastSeen)}</span>
      </div>
      
      <div className="flex gap-2">
        {device.connected ? (
          <>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => onShowDetails(device)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
            >
              <Info className="h-3 w-3 mr-1" />
              Details
            </Button>
            <Button 
              variant="destructive"
              size="sm"
              onClick={() => onDisconnect(device)}
              className="flex-1 text-sm font-medium"
            >
              <Unlink className="h-3 w-3 mr-1" />
              Disconnect
            </Button>
          </>
        ) : (
          <Button 
            onClick={() => onConnect(device)}
            disabled={device.connecting}
            className="w-full bg-primary hover:bg-blue-700 text-white text-sm font-medium"
            size="sm"
          >
            {device.connecting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link className="h-3 w-3 mr-1" />
                Connect
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function DeviceList() {
  const { 
    discoveredDevices, 
    connectToDevice, 
    disconnectFromDevice, 
    setSelectedDevice 
  } = useBluetooth();

  const handleShowDetails = (device: BluetoothDeviceInfo) => {
    setSelectedDevice(device);
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="p-4 border-b border-slate-100">
        <h2 className="text-lg font-medium text-slate-800">Discovered Devices</h2>
        <p className="text-sm text-slate-500">
          {discoveredDevices.length} {discoveredDevices.length === 1 ? 'device' : 'devices'} found
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {discoveredDevices.length === 0 ? (
          <div className="p-8 text-center">
            <Bluetooth className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-slate-600 mb-2">No devices found</h3>
            <p className="text-xs text-slate-400">
              Start scanning to discover nearby Bluetooth devices
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {discoveredDevices.map((device) => (
              <DeviceListItem
                key={device.id}
                device={device}
                onConnect={connectToDevice}
                onDisconnect={disconnectFromDevice}
                onShowDetails={handleShowDetails}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RefreshCw, X } from "lucide-react";
import { useBluetooth } from "@/hooks/use-bluetooth";

export function DeviceDetails() {
  const { 
    selectedDevice, 
    setSelectedDevice, 
    getServiceInfo, 
    refreshDeviceServices 
  } = useBluetooth();

  if (!selectedDevice) {
    return null;
  }

  const serviceInfos = selectedDevice.services ? getServiceInfo(selectedDevice.services) : [];

  const handleRefresh = () => {
    refreshDeviceServices(selectedDevice);
  };

  const handleClose = () => {
    setSelectedDevice(null);
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="p-4 border-b border-slate-100">
        <h2 className="text-lg font-medium text-slate-800">Device Details</h2>
        <p className="text-sm text-slate-500">{selectedDevice.name}</p>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Device Info */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Device Information</h3>
          <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Device ID:</span>
              <span className="text-slate-800 font-mono text-xs">{selectedDevice.id || 'Unknown'}</span>
            </div>
            {selectedDevice.rssi && (
              <div className="flex justify-between">
                <span className="text-slate-500">RSSI:</span>
                <span className="text-slate-800">{selectedDevice.rssi} dBm</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Connection:</span>
              <span className={selectedDevice.connected ? "text-green-600 font-medium" : "text-gray-600"}>
                {selectedDevice.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Available Services */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Available Services</h3>
          {serviceInfos.length === 0 ? (
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-500">
                {selectedDevice.connected 
                  ? 'No services discovered yet'
                  : 'Connect to device to view services'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {serviceInfos.map((serviceInfo, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{serviceInfo.name}</span>
                    <span className="text-xs text-slate-500 font-mono">
                      {serviceInfo.uuid.startsWith('0000') 
                        ? serviceInfo.uuid.substring(4, 8).toUpperCase()
                        : serviceInfo.uuid.substring(0, 8).toUpperCase()
                      }
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{serviceInfo.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleRefresh}
            disabled={!selectedDevice.connected}
            className="flex-1 bg-primary hover:bg-blue-700 text-white text-sm font-medium"
            size="sm"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={handleClose}
            variant="outline"
            className="flex-1 text-sm font-medium"
            size="sm"
          >
            <X className="h-3 w-3 mr-1" />
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

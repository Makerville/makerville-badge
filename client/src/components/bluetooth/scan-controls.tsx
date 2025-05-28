import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, Search, Wifi, AlertCircle } from "lucide-react";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { cn } from "@/lib/utils";

export function ScanControls() {
  const { scanStatus, startScan, error } = useBluetooth();

  const getStatusIndicator = () => {
    if (scanStatus.isScanning) {
      return {
        color: "bg-blue-500 animate-pulse-slow",
        text: "Scanning",
        icon: <Search className="h-4 w-4" />
      };
    }
    
    if (!scanStatus.isAvailable) {
      return {
        color: "bg-red-500",
        text: "Unavailable",
        icon: <AlertCircle className="h-4 w-4" />
      };
    }
    
    return {
      color: "bg-gray-300",
      text: "Ready",
      icon: <Wifi className="h-4 w-4" />
    };
  };

  const status = getStatusIndicator();

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-800">Device Scanning</h2>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", status.color)}></div>
            <span className="text-sm text-slate-500">{status.text}</span>
          </div>
        </div>
        
        <Button 
          onClick={startScan}
          disabled={scanStatus.isScanning || !scanStatus.isAvailable}
          className="w-full bg-primary hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mb-4"
        >
          {scanStatus.isScanning ? (
            <>
              <Search className="h-4 w-4 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Start Scanning</span>
            </>
          )}
        </Button>

        <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg flex items-center gap-2">
          {error ? (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600">{error.message}</span>
            </>
          ) : scanStatus.isAvailable ? (
            <>
              <Bluetooth className="h-4 w-4 text-green-500" />
              <span>Web Bluetooth API supported</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>Bluetooth not available</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

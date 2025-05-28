import { Card, CardContent } from "@/components/ui/card";
import { useBluetooth } from "@/hooks/use-bluetooth";

export function StatusFooter() {
  const { scanStatus } = useBluetooth();

  const formatLastScanTime = () => {
    if (!scanStatus.lastScanTime) {
      return "Never";
    }
    
    const seconds = Math.floor((Date.now() - scanStatus.lastScanTime.getTime()) / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              scanStatus.isAvailable ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-slate-600">
              {scanStatus.isAvailable ? 'Bluetooth Available' : 'Bluetooth Unavailable'}
            </span>
          </div>
          <span className="text-slate-400">
            Last scan: {formatLastScanTime()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

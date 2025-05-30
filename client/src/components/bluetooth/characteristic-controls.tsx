import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Send } from "lucide-react";
import { BluetoothDeviceInfo, BluetoothServiceInfo } from "@/types/bluetooth";
import { useToast } from "@/hooks/use-toast";

interface CharacteristicControlsProps {
  device: BluetoothDeviceInfo;
  service: BluetoothServiceInfo;
}

export function CharacteristicControls({ device, service }: CharacteristicControlsProps) {
  const [characteristics, setCharacteristics] = useState<BluetoothRemoteGATTCharacteristic[]>([]);
  const [selectedCharacteristic, setSelectedCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [value, setValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCharacteristics();
  }, [service]);

  const loadCharacteristics = async () => {
    if (!device.server?.connected) return;

    try {
      setIsLoading(true);
      const chars = await service.service.getCharacteristics();
      setCharacteristics(chars);

      if (chars.length > 0) {
        setSelectedCharacteristic(chars[0]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load characteristics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRead = async () => {
    if (!selectedCharacteristic) return;

    try {
      setIsLoading(true);
      const value = await selectedCharacteristic.readValue();
      const decoder = new TextDecoder();
      setValue(decoder.decode(value));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to read characteristic value",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWrite = async () => {
    if (!selectedCharacteristic) return;

    try {
      setIsLoading(true);
      const encoder = new TextEncoder();
      await selectedCharacteristic.writeValue(encoder.encode(value));
      toast({
        title: "Success",
        description: "Value written successfully",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to write characteristic value",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canRead = selectedCharacteristic?.properties.read;
  const canWrite = selectedCharacteristic?.properties.write || selectedCharacteristic?.properties.writeWithoutResponse;

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-800">Characteristic Controls</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadCharacteristics}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-slate-500">{service.name}</p>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label>Select Characteristic</Label>
          <Select
            value={selectedCharacteristic?.uuid}
            onValueChange={(uuid) => {
              const char = characteristics.find(c => c.uuid === uuid);
              setSelectedCharacteristic(char || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a characteristic" />
            </SelectTrigger>
            <SelectContent>
              {characteristics.map((char) => (
                <SelectItem key={char.uuid} value={char.uuid}>
                  {char.uuid}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCharacteristic && (
          <div className="space-y-2">
            <Label>Value</Label>
            <div className="flex gap-2">
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter value to write"
                disabled={!canWrite}
              />
              {canRead && (
                <Button
                  onClick={handleRead}
                  disabled={isLoading}
                  variant="outline"
                >
                  Read
                </Button>
              )}
              {canWrite && (
                <Button
                  onClick={handleWrite}
                  disabled={isLoading}
                  className="bg-primary hover:bg-blue-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Write
                </Button>
              )}
            </div>
          </div>
        )}

        {selectedCharacteristic && (
          <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Properties:</span>
              <div className="space-x-2">
                {selectedCharacteristic.properties.read && (
                  <span className="text-blue-600">Read</span>
                )}
                {selectedCharacteristic.properties.write && (
                  <span className="text-green-600">Write</span>
                )}
                {selectedCharacteristic.properties.writeWithoutResponse && (
                  <span className="text-green-600">Write Without Response</span>
                )}
                {selectedCharacteristic.properties.notify && (
                  <span className="text-purple-600">Notify</span>
                )}
                {selectedCharacteristic.properties.indicate && (
                  <span className="text-purple-600">Indicate</span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
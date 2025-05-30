import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { useBluetooth } from '@/hooks/use-bluetooth';

export function BadgeWriter() {
  const { selectedDevice, writeToBadge } = useBluetooth();
  const [text, setText] = useState('');

  if (!selectedDevice) {
    return null;
  }

  const handleWrite = async () => {
    if (!text.trim()) return;
    await writeToBadge(selectedDevice, text.trim());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write to Badge</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter text to display on badge..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={32}
              disabled={!selectedDevice.connected}
            />
            <p className="text-xs text-slate-500">
              {text.length}/32 characters
            </p>
          </div>
          <Button
            onClick={handleWrite}
            disabled={!text.trim() || !selectedDevice.connected}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Send to Badge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
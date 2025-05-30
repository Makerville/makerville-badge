import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { Send } from "lucide-react";

export function ChangeText() {
  const { selectedDevice, writeToBadge } = useBluetooth();
  const [text, setText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDevice && text.trim()) {
      await writeToBadge(selectedDevice, text.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Text</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter text to display on badge..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!selectedDevice?.connected}
              maxLength={32}
            />
            <p className="text-xs text-slate-500">
              {text.length}/32 characters
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!selectedDevice?.connected || !text.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            Send to Badge
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
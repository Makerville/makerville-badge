import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Terminal, RotateCcw, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SerialConsoleHook } from "@/hooks/use-serial-console";

interface SerialConsoleProps {
  console: SerialConsoleHook;
}

// Only `led <r> <g> <b>` exists in released firmware (0.4); `led off` and blink are unreleased
const QUICK_COMMANDS = ["help", "led 255 0 0", "led 0 255 0", "led 0 0 255", "led 0 0 0"];

export function SerialConsole({ console: serial }: SerialConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const { attachTerminal, send } = serial;

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      convertEol: false,
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      scrollback: 5000,
      theme: { background: '#0f172a', foreground: '#e2e8f0', cursor: '#4ade80' },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    const dataSub = term.onData(send);
    const resizeObserver = new ResizeObserver(() => fit.fit());
    resizeObserver.observe(containerRef.current);

    termRef.current = term;
    attachTerminal(term);

    return () => {
      attachTerminal(null);
      resizeObserver.disconnect();
      dataSub.dispose();
      term.dispose();
      termRef.current = null;
    };
  }, [attachTerminal, send]);

  const runCommand = (cmd: string) => {
    send(cmd + "\r");
    termRef.current?.focus();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Serial Console
        </CardTitle>
        <CardDescription>
          {serial.status === 'suspended'
            ? 'Paused while flashing. Reconnects when done.'
            : serial.isOpen
              ? "Type into the badge's shell, or use the shortcuts below"
              : 'Connect your badge above to see its logs and use its shell'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={serial.restartDevice} disabled={!serial.isOpen} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-1" />
            Restart badge
          </Button>
          <Button onClick={() => termRef.current?.clear()} variant="outline" size="sm">
            <Eraser className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        <div className="bg-slate-900 rounded-md p-2">
          <div ref={containerRef} className="h-72 w-full" />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_COMMANDS.map(cmd => (
            <Button
              key={cmd}
              onClick={() => runCommand(cmd)}
              disabled={!serial.isOpen}
              variant="secondary"
              size="sm"
              className="font-mono text-xs"
            >
              {cmd}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

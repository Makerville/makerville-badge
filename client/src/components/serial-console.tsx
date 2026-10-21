import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Terminal, Plug, Unplug, RotateCcw, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SerialConsoleHook } from "@/hooks/use-serial-console";

interface SerialConsoleProps {
  console: SerialConsoleHook;
  // The flasher currently owns the port
  portBusy: boolean;
}

const QUICK_COMMANDS = ["help", "led 0 0 255", "led 255 0 0 500", "led off"];

export function SerialConsole({ console: serial, portBusy }: SerialConsoleProps) {
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
          Talk to the badge's shell over USB. Opens automatically after flashing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {serial.status === 'error' && (
          <div className="p-3 bg-red-50 rounded-md border border-red-200">
            <p className="text-sm font-medium text-red-800">Console Error</p>
            <p className="text-xs text-red-600">{serial.error}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {serial.isOpen ? (
            <Button onClick={serial.close} variant="outline" size="sm">
              <Unplug className="w-4 h-4 mr-1" />
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={() => serial.open()}
              disabled={portBusy || serial.status === 'opening'}
              size="sm"
            >
              <Plug className="w-4 h-4 mr-1" />
              {serial.status === 'opening' ? 'Connecting...' : 'Connect'}
            </Button>
          )}
          <Button onClick={serial.restartDevice} disabled={!serial.isOpen} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-1" />
            Restart badge
          </Button>
          <Button onClick={() => termRef.current?.clear()} variant="outline" size="sm">
            <Eraser className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        {portBusy && !serial.isOpen && (
          <p className="text-xs text-slate-500">
            The flasher is using the port. Flash firmware or disconnect it to use the console.
          </p>
        )}

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

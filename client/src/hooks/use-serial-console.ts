import { useState, useCallback, useRef } from 'react';
import type { Terminal } from '@xterm/xterm';

export type SerialConsoleStatus = 'closed' | 'opening' | 'open' | 'error';

export interface SerialConsoleHook {
  status: SerialConsoleStatus;
  error: string | null;
  isOpen: boolean;
  attachTerminal: (term: Terminal | null) => void;
  open: (port?: SerialPort) => Promise<void>;
  close: () => Promise<void>;
  send: (data: string) => void;
  restartDevice: () => Promise<void>;
}

const BAUD_RATE = 115200;
const DIM = (s: string) => `\x1b[90m${s}\x1b[0m`;

export function useSerialConsole(): SerialConsoleHook {
  const [status, setStatus] = useState<SerialConsoleStatus>('closed');
  const [error, setError] = useState<string | null>(null);

  const termRef = useRef<Terminal | null>(null);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readLoopRef = useRef<Promise<void> | null>(null);
  // Serialize writes so fast typing doesn't hit a locked writer
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  const encoder = useRef(new TextEncoder()).current;

  const attachTerminal = useCallback((term: Terminal | null) => {
    termRef.current = term;
  }, []);

  const readLoop = useCallback(async (port: SerialPort) => {
    // Per the Web Serial spec, non-fatal errors (e.g. framing) replace port.readable,
    // while a fatal one (device unplugged) leaves it null.
    while (port.readable && portRef.current === port) {
      const reader = port.readable.getReader();
      readerRef.current = reader;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) termRef.current?.write(value);
        }
      } catch (e) {
        console.warn('Serial read error:', e);
      } finally {
        reader.releaseLock();
        readerRef.current = null;
      }
    }

    // Loop ended without close() being called: the device went away
    if (portRef.current === port) {
      portRef.current = null;
      await port.close().catch(() => {});
      termRef.current?.writeln(DIM('\r\n--- device disconnected ---'));
      setStatus('closed');
    }
  }, []);

  const open = useCallback(async (existing?: SerialPort) => {
    if (portRef.current) return;

    setStatus('opening');
    setError(null);
    try {
      const port = existing ?? await navigator.serial.requestPort();
      await port.open({ baudRate: BAUD_RATE });
      // Release DTR/RTS so the ESP32 isn't held in reset or the bootloader
      await port.setSignals({ dataTerminalReady: false, requestToSend: false }).catch(() => {});

      portRef.current = port;
      setStatus('open');
      termRef.current?.writeln(DIM(`--- connected at ${BAUD_RATE} baud, press Enter for a prompt ---`));
      readLoopRef.current = readLoop(port);
    } catch (e) {
      // User dismissed the port picker
      if (e instanceof DOMException && e.name === 'NotFoundError') {
        setStatus('closed');
        return;
      }
      console.error('Failed to open serial console:', e);
      setError(e instanceof Error ? e.message : 'Failed to open serial port');
      setStatus('error');
    }
  }, [readLoop]);

  const close = useCallback(async () => {
    const port = portRef.current;
    if (!port) return;

    portRef.current = null;
    await readerRef.current?.cancel().catch(() => {});
    await readLoopRef.current;
    await writeChainRef.current;
    await port.close().catch(() => {});
    termRef.current?.writeln(DIM('\r\n--- disconnected ---'));
    setStatus('closed');
  }, []);

  const send = useCallback((data: string) => {
    const port = portRef.current;
    if (!port?.writable) return;

    writeChainRef.current = writeChainRef.current.then(async () => {
      if (!port.writable) return;
      const writer = port.writable.getWriter();
      try {
        await writer.write(encoder.encode(data));
      } catch (e) {
        console.warn('Serial write error:', e);
      } finally {
        writer.releaseLock();
      }
    });
  }, [encoder]);

  const restartDevice = useCallback(async () => {
    const port = portRef.current;
    if (!port) return;

    // Pulse EN via RTS with DTR (GPIO9/boot) released, so the badge boots the app
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await new Promise(resolve => setTimeout(resolve, 100));
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
  }, []);

  return {
    status,
    error,
    isOpen: status === 'open',
    attachTerminal,
    open,
    close,
    send,
    restartDevice,
  };
}

import { useState, useCallback, useRef } from 'react';
import type { Terminal } from '@xterm/xterm';

// disconnected: no port picked; open: console is reading the port;
// suspended: port picked but lent to the flasher
export type SerialStatus = 'disconnected' | 'connecting' | 'open' | 'suspended' | 'error';

export interface SerialConsoleHook {
  status: SerialStatus;
  error: string | null;
  isConnected: boolean;
  isOpen: boolean;
  attachTerminal: (term: Terminal | null) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  suspend: () => Promise<SerialPort | null>;
  resume: () => Promise<void>;
  send: (data: string) => void;
  restartDevice: () => Promise<void>;
}

const BAUD_RATE = 115200;
const DIM = (s: string) => `\x1b[90m${s}\x1b[0m`;

export function useSerialConsole(): SerialConsoleHook {
  const [status, setStatus] = useState<SerialStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const termRef = useRef<Terminal | null>(null);
  // The port the user picked, kept while the flasher borrows it
  const portRef = useRef<SerialPort | null>(null);
  // Set only while the console itself has the port open
  const openPortRef = useRef<SerialPort | null>(null);
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
    while (port.readable && openPortRef.current === port) {
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

    // Loop ended without closePort() being called: the device went away
    if (openPortRef.current === port) {
      openPortRef.current = null;
      portRef.current = null;
      await port.close().catch(() => {});
      termRef.current?.writeln(DIM('\r\n--- device disconnected ---'));
      setStatus('disconnected');
    }
  }, []);

  const openPort = useCallback(async (port: SerialPort) => {
    await port.open({ baudRate: BAUD_RATE });
    // Release DTR/RTS so the ESP32 isn't held in reset or the bootloader
    await port.setSignals({ dataTerminalReady: false, requestToSend: false }).catch(() => {});

    openPortRef.current = port;
    setStatus('open');
    termRef.current?.writeln(DIM(`--- connected at ${BAUD_RATE} baud, press Enter for a prompt ---`));
    readLoopRef.current = readLoop(port);
  }, [readLoop]);

  const closePort = useCallback(async () => {
    const port = openPortRef.current;
    if (!port) return;

    openPortRef.current = null;
    await readerRef.current?.cancel().catch(() => {});
    await readLoopRef.current;
    await writeChainRef.current;
    await port.close().catch(() => {});
  }, []);

  const fail = useCallback((e: unknown) => {
    console.error('Serial port error:', e);
    setError(e instanceof Error ? e.message : 'Failed to open serial port');
    setStatus('error');
  }, []);

  const connect = useCallback(async () => {
    if (portRef.current) return;

    setStatus('connecting');
    setError(null);
    try {
      const port = await navigator.serial.requestPort();
      portRef.current = port;
      await openPort(port);
    } catch (e) {
      portRef.current = null;
      // User dismissed the port picker
      if (e instanceof DOMException && e.name === 'NotFoundError') {
        setStatus('disconnected');
        return;
      }
      fail(e);
    }
  }, [openPort, fail]);

  const disconnect = useCallback(async () => {
    await closePort();
    portRef.current = null;
    termRef.current?.writeln(DIM('\r\n--- disconnected ---'));
    setStatus('disconnected');
  }, [closePort]);

  // Close the port and hand it to someone else (the flasher)
  const suspend = useCallback(async () => {
    const port = portRef.current;
    if (!port) return null;

    await closePort();
    termRef.current?.writeln(DIM('\r\n--- paused for flashing ---'));
    setStatus('suspended');
    return port;
  }, [closePort]);

  const resume = useCallback(async () => {
    const port = portRef.current;
    if (!port || openPortRef.current) return;

    try {
      await openPort(port);
    } catch (e) {
      portRef.current = null;
      fail(e);
    }
  }, [openPort, fail]);

  const send = useCallback((data: string) => {
    const port = openPortRef.current;
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
    const port = openPortRef.current;
    if (!port) return;

    // Pulse EN via RTS with DTR (GPIO9/boot) released, so the badge boots the app
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await new Promise(resolve => setTimeout(resolve, 100));
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
  }, []);

  return {
    status,
    error,
    isConnected: status === 'open' || status === 'suspended',
    isOpen: status === 'open',
    attachTerminal,
    connect,
    disconnect,
    suspend,
    resume,
    send,
    restartDevice,
  };
}

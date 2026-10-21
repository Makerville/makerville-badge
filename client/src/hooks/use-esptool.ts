import { useState, useCallback, useRef } from 'react';
import { ESPLoader, Transport, LoaderOptions } from 'esptool-js';
import { detectWebSerialSupport, WebSerialSupport } from '@/lib/webserial-utils';

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  device: SerialPort | null;
  chipType: string | null;
  error: string | null;
}

export interface FlashState {
  status: 'idle' | 'downloading' | 'flashing' | 'success' | 'error';
  progress: number;
  message: string;
  error: string | null;
}

export interface LogState {
  logs: string[];
}

export interface EspToolHook {
  connectionState: ConnectionState;
  flashState: FlashState;
  logState: LogState;
  webSerialSupport: WebSerialSupport;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  flashFirmware: (downloadUrl: string) => Promise<boolean>;
  releasePort: () => Promise<SerialPort | null>;
  clearLogs: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  isFlashing: boolean;
}

// Transport.disconnect() cancels its reader without releasing the lock, which leaves
// waitForUnlock() spinning, so release it here before closing the port
async function closeTransport(transport: Transport) {
  const reader = (transport as unknown as { reader?: ReadableStreamDefaultReader<Uint8Array> }).reader;
  if (reader) {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  await transport.device.close();
}

export function useEspTool(): EspToolHook {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    device: null,
    chipType: null,
    error: null
  });

  const [flashState, setFlashState] = useState<FlashState>({
    status: 'idle',
    progress: 0,
    message: '',
    error: null
  });

  const [logState, setLogState] = useState<LogState>({
    logs: []
  });

  const espLoaderRef = useRef<ESPLoader | null>(null);
  const transportRef = useRef<Transport | null>(null);
  const webSerialSupport = detectWebSerialSupport();

  const terminal = {
    clean() {
      console.log('[ESP] Terminal cleaned');
      setLogState(prev => ({ ...prev, logs: [] }));
    },
    writeLine(data: string) {
      console.log('[ESP]', data);
      const timestamp = new Date().toLocaleTimeString();
      setLogState(prev => ({
        ...prev,
        logs: [...prev.logs, `[${timestamp}] ${data}`]
      }));
    },
    write(data: string) {
      console.log('[ESP]', data);
      const timestamp = new Date().toLocaleTimeString();
      setLogState(prev => ({
        ...prev,
        logs: [...prev.logs, `[${timestamp}] ${data}`]
      }));
    },
  };

  const connect = useCallback(async () => {
    if (!webSerialSupport.supported) {
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        error: webSerialSupport.reason || 'Web Serial API not supported'
      }));
      return;
    }

    try {
      setConnectionState(prev => ({ ...prev, status: 'connecting', error: null }));

      // Request serial port from user
      const device = await navigator.serial.requestPort({});
      
      // Create transport
      const transport = new Transport(device, true);
      transportRef.current = transport;

      // Create ESP loader with default settings
      const loaderOptions: LoaderOptions = {
        transport,
        baudrate: 115200, // Start with safe baudrate
        romBaudrate: 115200,
        terminal,
        debugLogging: false,
      };
      const espLoader = new ESPLoader(loaderOptions);
      espLoaderRef.current = espLoader;

      // Connect and detect chip
      const chipType = await espLoader.main();

      setConnectionState({
        status: 'connected',
        device,
        chipType,
        error: null
      });

    } catch (error) {
      console.error('Connection failed:', error);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
      
      // Clean up on error
      if (transportRef.current) {
        try {
          await closeTransport(transportRef.current);
        } catch (e) {
          console.warn('Error during cleanup:', e);
        }
        transportRef.current = null;
      }
      espLoaderRef.current = null;
    }
  }, [webSerialSupport]);

  const disconnect = useCallback(async () => {
    try {
      if (transportRef.current) {
        await closeTransport(transportRef.current);
      }
    } catch (error) {
      console.warn('Error during disconnect:', error);
    } finally {
      transportRef.current = null;
      espLoaderRef.current = null;
      setConnectionState({
        status: 'disconnected',
        device: null,
        chipType: null,
        error: null
      });
    }
  }, []);

  const flashFirmware = useCallback(async (downloadUrl: string) => {
    if (!espLoaderRef.current || connectionState.status !== 'connected') {
      setFlashState(prev => ({
        ...prev,
        status: 'error',
        error: 'Device not connected'
      }));
      return false;
    }

    try {
      setFlashState({
        status: 'downloading',
        progress: 0,
        message: 'Downloading firmware...',
        error: null
      });

      // Check if URL contains makerville-badge.bin
      if (!downloadUrl.includes('makerville-badge.bin')) {
        throw new Error('makerville-badge.bin file not found in this release');
      }

      // Download firmware binary through CORS proxy
      // GitHub blocks direct browser downloads, so we need a proxy
      console.log('Downloading firmware from:', downloadUrl);

      // Use self-hosted Cloudflare Worker CORS proxy
      const corsProxyUrl = 'https://badge.makerville.io/api/cors-proxy';
      const proxyUrl = `${corsProxyUrl}?url=${encodeURIComponent(downloadUrl)}`;
      console.log('Using CORS proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', {
          status: response.status,
          statusText: response.statusText,
          url: downloadUrl,
          headers: Object.fromEntries(response.headers.entries()),
          responseText: errorText
        });
        throw new Error(`Failed to download firmware: ${response.status} ${response.statusText}`);
      }
      
      console.log('Download successful, content-type:', response.headers.get('content-type'));

      const firmwareBuffer = await response.arrayBuffer();
      const firmwareData = new Uint8Array(firmwareBuffer);

      setFlashState(prev => ({
        ...prev,
        status: 'flashing',
        progress: 0,
        message: 'Flashing firmware...'
      }));

      // Try the most basic approach with raw binary conversion
      // Convert Uint8Array to binary string
      let binaryString = '';
      for (let i = 0; i < firmwareData.length; i++) {
        binaryString += String.fromCharCode(firmwareData[i]);
      }

      // Zephyr RTOS builds for ESP32C3 typically flash at address 0x0
      // The 159KB binary suggests it includes bootloader + app
      console.log('Flashing Zephyr firmware binary at address 0x0, size:', firmwareData.length);
      
      await espLoaderRef.current.writeFlash({
        fileArray: [{
          data: binaryString,
          address: 0x0      // Zephyr builds typically flash at 0x0
        }],
        flashSize: 'keep',
        flashMode: 'keep', 
        flashFreq: 'keep',
        eraseAll: true,    // Erase all flash for complete Zephyr image
        compress: true,
        reportProgress: (_fileIndex: number, written: number, total: number) => {
          const progress = Math.round((written / total) * 100);
          setFlashState(prev => ({
            ...prev,
            progress,
            message: `Flashing firmware... ${progress}%`
          }));
        }
      });

      setFlashState({
        status: 'success',
        progress: 100,
        message: 'Firmware flashed successfully!',
        error: null
      });
      return true;

    } catch (error) {
      console.error('Flash failed:', error);
      setFlashState({
        status: 'error',
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'Flash operation failed'
      });
      return false;
    }
  }, [connectionState.status]);

  // Reset the badge into its app and close the port, returning it so the serial console can open it
  const releasePort = useCallback(async () => {
    const transport = transportRef.current;
    if (!transport) return null;

    const device = transport.device;
    try {
      // RTS pulses EN; DTR (GPIO9) stays released so the chip boots the app, not the bootloader
      await transport.setDTR(false);
      await transport.setRTS(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      await transport.setRTS(false);
      terminal.writeLine('Reset badge, handing port to serial console');
    } catch (error) {
      console.warn('Could not reset device:', error);
    }

    try {
      await closeTransport(transport);
    } catch (error) {
      console.warn('Error closing port:', error);
    }
    transportRef.current = null;
    espLoaderRef.current = null;
    setConnectionState({
      status: 'disconnected',
      device: null,
      chipType: null,
      error: null
    });
    return device;
  }, []);

  const clearLogs = useCallback(() => {
    setLogState(prev => ({ ...prev, logs: [] }));
  }, []);

  return {
    connectionState,
    flashState,
    logState,
    webSerialSupport,
    connect,
    disconnect,
    flashFirmware,
    releasePort,
    clearLogs,
    isConnecting: connectionState.status === 'connecting',
    isConnected: connectionState.status === 'connected',
    isFlashing: flashState.status === 'flashing' || flashState.status === 'downloading',
  };
}
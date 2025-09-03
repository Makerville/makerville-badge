import { useState, useCallback, useRef } from 'react';
import { ESPLoader, Transport, LoaderOptions } from 'esptool-js';
import { detectWebSerialSupport, WebSerialSupport } from '@/lib/webserial-utils';

// Extend global Navigator interface for Web Serial API
declare global {
  interface Navigator {
    serial: {
      requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    };
  }
  
  interface SerialPort {
    // Basic SerialPort interface - esptool-js handles the details
  }
  
  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
  }
  
  interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
  }
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  device: SerialPort | null;
  chipType: string | null;
  error: string | null;
}

export interface EspToolHook {
  connectionState: ConnectionState;
  webSerialSupport: WebSerialSupport;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
  isConnected: boolean;
}

export function useEspTool(): EspToolHook {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    device: null,
    chipType: null,
    error: null
  });

  const espLoaderRef = useRef<ESPLoader | null>(null);
  const transportRef = useRef<Transport | null>(null);
  const webSerialSupport = detectWebSerialSupport();

  const terminal = {
    clean() {
      console.log('[ESP] Terminal cleaned');
    },
    writeLine(data: string) {
      console.log('[ESP]', data);
    },
    write(data: string) {
      console.log('[ESP]', data);
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
          await transportRef.current.disconnect();
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
        await transportRef.current.disconnect();
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

  return {
    connectionState,
    webSerialSupport,
    connect,
    disconnect,
    isConnecting: connectionState.status === 'connecting',
    isConnected: connectionState.status === 'connected',
  };
}
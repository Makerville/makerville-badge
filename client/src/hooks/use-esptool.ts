import { useState, useCallback } from 'react';
import { ESPLoader, Transport, LoaderOptions } from 'esptool-js';

export interface FlashState {
  status: 'idle' | 'downloading' | 'flashing' | 'success' | 'error';
  progress: number;
  message: string;
  error: string | null;
  chipType: string | null;
}

export interface LogState {
  logs: string[];
}

export interface EspToolHook {
  flashState: FlashState;
  logState: LogState;
  flashFirmware: (port: SerialPort, downloadUrl: string) => Promise<boolean>;
  clearLogs: () => void;
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

async function downloadFirmware(downloadUrl: string): Promise<string> {
  if (!downloadUrl.includes('makerville-badge.bin')) {
    throw new Error('makerville-badge.bin file not found in this release');
  }

  // GitHub blocks direct browser downloads, so go through our Cloudflare CORS proxy
  const corsProxyUrl = 'https://badge.makerville.io/api/cors-proxy';
  const proxyUrl = `${corsProxyUrl}?url=${encodeURIComponent(downloadUrl)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    console.error('Download failed:', {
      status: response.status,
      statusText: response.statusText,
      url: downloadUrl,
      responseText: await response.text()
    });
    throw new Error(`Failed to download firmware: ${response.status} ${response.statusText}`);
  }

  // esptool-js wants the image as a binary string
  const firmwareData = new Uint8Array(await response.arrayBuffer());
  let binaryString = '';
  for (let i = 0; i < firmwareData.length; i++) {
    binaryString += String.fromCharCode(firmwareData[i]);
  }
  return binaryString;
}

export function useEspTool(): EspToolHook {
  const [flashState, setFlashState] = useState<FlashState>({
    status: 'idle',
    progress: 0,
    message: '',
    error: null,
    chipType: null
  });

  const [logState, setLogState] = useState<LogState>({
    logs: []
  });

  const log = useCallback((data: string) => {
    console.log('[ESP]', data);
    const timestamp = new Date().toLocaleTimeString();
    setLogState(prev => ({
      ...prev,
      logs: [...prev.logs, `[${timestamp}] ${data}`]
    }));
  }, []);

  // Takes a closed port, flashes it, resets the badge into the new firmware and closes the port again
  const flashFirmware = useCallback(async (port: SerialPort, downloadUrl: string) => {
    let transport: Transport | null = null;

    try {
      setFlashState({
        status: 'downloading',
        progress: 0,
        message: 'Downloading firmware...',
        error: null,
        chipType: null
      });
      const firmware = await downloadFirmware(downloadUrl);

      setFlashState(prev => ({ ...prev, message: 'Entering bootloader...' }));
      transport = new Transport(port, true);
      const loaderOptions: LoaderOptions = {
        transport,
        baudrate: 115200,
        romBaudrate: 115200,
        terminal: {
          clean() {
            setLogState(prev => ({ ...prev, logs: [] }));
          },
          writeLine: log,
          write: log,
        },
        debugLogging: false,
      };
      const espLoader = new ESPLoader(loaderOptions);
      const chipType = await espLoader.main();

      setFlashState(prev => ({
        ...prev,
        status: 'flashing',
        chipType,
        message: 'Flashing firmware...'
      }));

      // Zephyr image includes the bootloader, so it goes at 0x0
      await espLoader.writeFlash({
        fileArray: [{ data: firmware, address: 0x0 }],
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: true,
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

      // RTS pulses EN; DTR (GPIO9) stays released so the chip boots the app, not the bootloader
      await transport.setDTR(false);
      await transport.setRTS(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      await transport.setRTS(false);
      log('Reset badge into new firmware');

      setFlashState({
        status: 'success',
        progress: 100,
        message: 'Firmware flashed successfully!',
        error: null,
        chipType
      });
      return true;

    } catch (error) {
      console.error('Flash failed:', error);
      setFlashState(prev => ({
        ...prev,
        status: 'error',
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'Flash operation failed'
      }));
      return false;

    } finally {
      if (transport) {
        await closeTransport(transport).catch(e => console.warn('Error closing port:', e));
      }
    }
  }, [log]);

  const clearLogs = useCallback(() => {
    setLogState(prev => ({ ...prev, logs: [] }));
  }, []);

  return {
    flashState,
    logState,
    flashFirmware,
    clearLogs,
    isFlashing: flashState.status === 'flashing' || flashState.status === 'downloading',
  };
}

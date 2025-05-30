import { useState, useCallback, useEffect } from 'react';
import { BluetoothDeviceInfo, BluetoothError, ScanStatus, ConnectionStatus } from '@/types/bluetooth';
import { useToast } from '@/hooks/use-toast';

// Create a single source of truth for the Bluetooth state
let globalSelectedDevice: BluetoothDeviceInfo | null = null;
let globalSetSelectedDevice: ((device: BluetoothDeviceInfo | null) => void) | null = null;

export function useBluetooth() {
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDeviceInfo | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    isScanning: false,
    isAvailable: false
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnecting: false,
    connectedDevices: []
  });
  const [error, setError] = useState<BluetoothError | null>(null);
  const { toast } = useToast();

  // Set up the global state
  useEffect(() => {
    globalSelectedDevice = selectedDevice;
    globalSetSelectedDevice = setSelectedDevice;
  }, [selectedDevice]);

  // Check if Web Bluetooth is available
  const checkBluetoothAvailability = useCallback(async () => {
    if (!navigator.bluetooth) {
      const bluetoothError: BluetoothError = {
        type: 'not_supported',
        message: 'Web Bluetooth API not supported',
        details: 'This browser does not support the Web Bluetooth API. Please use Chrome, Edge, or another supported browser.'
      };
      setError(bluetoothError);
      return false;
    }

    try {
      const available = await navigator.bluetooth.getAvailability();
      setScanStatus(prev => ({ ...prev, isAvailable: available }));

      if (!available) {
        const bluetoothError: BluetoothError = {
          type: 'not_available',
          message: 'Bluetooth adapter not available',
          details: 'Please ensure Bluetooth is enabled on your device.'
        };
        setError(bluetoothError);
      }

      return available;
    } catch (err) {
      const bluetoothError: BluetoothError = {
        type: 'not_available',
        message: 'Failed to check Bluetooth availability',
        details: err instanceof Error ? err.message : 'Unknown error'
      };
      setError(bluetoothError);
      return false;
    }
  }, []);

  // Connect to a device
  const connectToDevice = useCallback(async (deviceInfo: BluetoothDeviceInfo) => {
    setError(null);
    console.log('Connecting to device:', deviceInfo.name);
    setConnectionStatus(prev => ({ ...prev, isConnecting: true }));

    try {
      // First try to connect to the existing device
      let server = deviceInfo.device.gatt;

      console.log('Current GATT server state:', server?.connected ? 'connected' : 'disconnected');

      // If not connected, try to connect
      if (!server?.connected) {
        console.log('Attempting to connect to GATT server...');
        server = await deviceInfo.device.gatt?.connect();
      }

      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      console.log('Connected to GATT server, fetching services...');

      // Get the specific badge service
      const service = await server.getPrimaryService('00001234-0000-1000-8000-00805f9b34fb');
      console.log('Found badge service');

      // Get the specific characteristic
      const characteristic = await service.getCharacteristic('00005678-0000-1000-8000-00805f9b34fb');
      console.log('Found badge characteristic');

      // Create updated device info with all connection details
      const updatedDeviceInfo: BluetoothDeviceInfo = {
        ...deviceInfo,
        server,
        services: [service],
        characteristic,
        connected: true,
        connecting: false,
        lastSeen: new Date()
      };

      console.log('Setting device as connected:', {
        name: updatedDeviceInfo.name,
        connected: updatedDeviceInfo.connected,
        hasServer: !!updatedDeviceInfo.server,
        hasService: !!updatedDeviceInfo.services?.length,
        hasCharacteristic: !!updatedDeviceInfo.characteristic
      });

      // Update both selected device and connection status
      setSelectedDevice(updatedDeviceInfo);
      setConnectionStatus(prev => ({
        isConnecting: false,
        connectedDevices: [updatedDeviceInfo]
      }));

      // Update global state
      globalSelectedDevice = updatedDeviceInfo;
      if (globalSetSelectedDevice) {
        globalSetSelectedDevice(updatedDeviceInfo);
      }

      console.log('Device state after update:', {
        selectedDevice: updatedDeviceInfo.connected,
        connectionStatus: 1
      });

      toast({
        title: "Connected Successfully",
        description: `Connected to ${deviceInfo.name}`,
        variant: "default"
      });

    } catch (err) {
      console.error('Connection error:', err);
      setConnectionStatus(prev => ({ ...prev, isConnecting: false }));
      setSelectedDevice(null);
      globalSelectedDevice = null;
      if (globalSetSelectedDevice) {
        globalSetSelectedDevice(null);
      }

      const bluetoothError: BluetoothError = {
        type: 'connection_failed',
        message: `Failed to connect to ${deviceInfo.name}`,
        details: err instanceof Error ? err.message : 'Unknown connection error'
      };
      setError(bluetoothError);

      toast({
        title: "Connection Failed",
        description: "Please make sure the device is in range and try again",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Start scanning for devices
  const startScan = useCallback(async () => {
    setError(null);
    setSelectedDevice(null);
    globalSelectedDevice = null;
    if (globalSetSelectedDevice) {
      globalSetSelectedDevice(null);
    }

    // First check if Bluetooth is available
    const isAvailable = await checkBluetoothAvailability();
    if (!isAvailable) {
      toast({
        title: "Bluetooth Not Available",
        description: "Please make sure Bluetooth is enabled on your device",
        variant: "destructive"
      });
      return;
    }

    setScanStatus(prev => ({ ...prev, isScanning: true }));

    try {
      console.log('Requesting device...');
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '00001234-0000-1000-8000-00805f9b34fb'  // Badge service
        ]
      });

      console.log('Device selected:', device.name, device.id);

      const deviceInfo: BluetoothDeviceInfo = {
        id: device.id,
        name: device.name || 'Unknown Device',
        device: device,
        connected: false,
        lastSeen: new Date(),
        rssi: Math.floor(Math.random() * 40) - 80
      };

      // Set as selected device immediately
      setSelectedDevice(deviceInfo);
      globalSelectedDevice = deviceInfo;
      if (globalSetSelectedDevice) {
        globalSetSelectedDevice(deviceInfo);
      }

      // Add event listeners for device connection changes
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected:', device.name);
        setSelectedDevice(null);
        globalSelectedDevice = null;
        if (globalSetSelectedDevice) {
          globalSetSelectedDevice(null);
        }
        setConnectionStatus(prev => ({
          ...prev,
          connectedDevices: []
        }));

        toast({
          title: "Device Disconnected",
          description: `${deviceInfo.name} has been disconnected`,
          variant: "default"
        });
      });

      setScanStatus(prev => ({
        ...prev,
        isScanning: false,
        lastScanTime: new Date()
      }));

      toast({
        title: "Device Found",
        description: `Discovered ${deviceInfo.name}`,
        variant: "default"
      });

      // Automatically try to connect to the device
      await connectToDevice(deviceInfo);

    } catch (err) {
      console.error('Scan error:', err);
      setScanStatus(prev => ({ ...prev, isScanning: false }));
      setSelectedDevice(null);
      globalSelectedDevice = null;
      if (globalSetSelectedDevice) {
        globalSetSelectedDevice(null);
      }

      // Don't show error for user cancellation
      if (err instanceof Error && err.name === 'NotFoundError') {
        return;
      }

      // Show a more user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred during scanning';
      console.error('Detailed scan error:', errorMessage);

      const bluetoothError: BluetoothError = {
        type: 'scan_failed',
        message: 'Failed to scan for devices',
        details: errorMessage
      };
      setError(bluetoothError);

      toast({
        title: "Scan Failed",
        description: "Please make sure Bluetooth is enabled and try again",
        variant: "destructive"
      });
    }
  }, [checkBluetoothAvailability, toast, connectToDevice]);

  // Disconnect from a device
  const disconnectFromDevice = useCallback(async (deviceInfo: BluetoothDeviceInfo) => {
    try {
      if (deviceInfo.server?.connected) {
        deviceInfo.server.disconnect();
      }

      setSelectedDevice(null);
      globalSelectedDevice = null;
      if (globalSetSelectedDevice) {
        globalSetSelectedDevice(null);
      }
      setConnectionStatus(prev => ({
        ...prev,
        connectedDevices: []
      }));

      toast({
        title: "Disconnected",
        description: `Disconnected from ${deviceInfo.name}`,
        variant: "default"
      });

    } catch (err) {
      toast({
        title: "Disconnect Failed",
        description: `Failed to disconnect from ${deviceInfo.name}`,
        variant: "destructive"
      });
    }
  }, [toast]);

  // Write to badge characteristic
  const writeToBadge = useCallback(async (deviceInfo: BluetoothDeviceInfo, text: string) => {
    if (!deviceInfo.characteristic) {
      toast({
        title: "Error",
        description: "Device not properly connected",
        variant: "destructive"
      });
      return;
    }

    try {
      // Convert text to Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      // Write the data
      await deviceInfo.characteristic.writeValue(data);

      toast({
        title: "Success",
        description: "Text written to badge",
        variant: "default"
      });
    } catch (err) {
      console.error('Write error:', err);
      toast({
        title: "Write Failed",
        description: err instanceof Error ? err.message : "Failed to write to badge",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkBluetoothAvailability();
  }, [checkBluetoothAvailability]);

  return {
    selectedDevice: globalSelectedDevice || selectedDevice,
    setSelectedDevice,
    scanStatus,
    connectionStatus,
    error,
    startScan,
    connectToDevice,
    disconnectFromDevice,
    writeToBadge,
    clearError,
    checkBluetoothAvailability
  };
}

import { useState, useCallback, useEffect } from 'react';
import { BluetoothDeviceInfo, BluetoothError, ScanStatus, ConnectionStatus, BluetoothServiceInfo } from '@/types/bluetooth';
import { useToast } from '@/hooks/use-toast';

// Standard Bluetooth service UUIDs with friendly names
const STANDARD_SERVICES: Record<string, { name: string; description: string }> = {
  '00001800-0000-1000-8000-00805f9b34fb': {
    name: 'Generic Access',
    description: 'Standard device information service'
  },
  '00001801-0000-1000-8000-00805f9b34fb': {
    name: 'Generic Attribute',
    description: 'GATT service configuration'
  },
  '0000180f-0000-1000-8000-00805f9b34fb': {
    name: 'Battery Service',
    description: 'Battery level monitoring'
  },
  '0000180a-0000-1000-8000-00805f9b34fb': {
    name: 'Device Information',
    description: 'Manufacturer and device info'
  },
  '0000180d-0000-1000-8000-00805f9b34fb': {
    name: 'Heart Rate',
    description: 'Heart rate measurement service'
  },
  '00001812-0000-1000-8000-00805f9b34fb': {
    name: 'Human Interface Device',
    description: 'HID over GATT service'
  }
};

export function useBluetooth() {
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDeviceInfo[]>([]);
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

  // Start scanning for devices
  const startScan = useCallback(async () => {
    setError(null);
    
    const isAvailable = await checkBluetoothAvailability();
    if (!isAvailable) return;

    setScanStatus(prev => ({ ...prev, isScanning: true }));

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'generic_access',
          'generic_attribute', 
          'battery_service',
          'device_information',
          'heart_rate',
          'human_interface_device'
        ]
      });

      // Check if device already exists
      const existingDeviceIndex = discoveredDevices.findIndex(d => d.id === device.id);
      
      const deviceInfo: BluetoothDeviceInfo = {
        id: device.id,
        name: device.name || 'Unknown Device',
        device: device,
        connected: device.gatt?.connected || false,
        lastSeen: new Date(),
        rssi: Math.floor(Math.random() * 40) - 80 // Mock RSSI as it's not available in Web Bluetooth API
      };

      // Add event listeners for device connection changes
      device.addEventListener('gattserverdisconnected', () => {
        setDiscoveredDevices(prev => 
          prev.map(d => 
            d.id === device.id 
              ? { ...d, connected: false, server: undefined, services: undefined }
              : d
          )
        );
        
        setConnectionStatus(prev => ({
          ...prev,
          connectedDevices: prev.connectedDevices.filter(d => d.id !== device.id)
        }));

        toast({
          title: "Device Disconnected",
          description: `${deviceInfo.name} has been disconnected`,
          variant: "default"
        });
      });

      if (existingDeviceIndex >= 0) {
        // Update existing device
        setDiscoveredDevices(prev => 
          prev.map((d, index) => 
            index === existingDeviceIndex 
              ? { ...d, lastSeen: new Date(), rssi: deviceInfo.rssi }
              : d
          )
        );
      } else {
        // Add new device
        setDiscoveredDevices(prev => [...prev, deviceInfo]);
      }

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

    } catch (err) {
      setScanStatus(prev => ({ ...prev, isScanning: false }));
      
      // Don't show error for user cancellation
      if (err instanceof Error && err.name === 'NotFoundError') {
        return;
      }

      const bluetoothError: BluetoothError = {
        type: 'scan_failed',
        message: 'Failed to scan for devices',
        details: err instanceof Error ? err.message : 'Unknown error occurred during scanning'
      };
      setError(bluetoothError);
      
      toast({
        title: "Scan Failed",
        description: bluetoothError.message,
        variant: "destructive"
      });
    }
  }, [discoveredDevices, checkBluetoothAvailability, toast]);

  // Connect to a device
  const connectToDevice = useCallback(async (deviceInfo: BluetoothDeviceInfo) => {
    setError(null);
    
    // Mark device as connecting
    setDiscoveredDevices(prev => 
      prev.map(d => 
        d.id === deviceInfo.id 
          ? { ...d, connecting: true }
          : d
      )
    );

    setConnectionStatus(prev => ({ ...prev, isConnecting: true }));

    try {
      const server = await deviceInfo.device.gatt?.connect();
      
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Fetch available services
      const services = await server.getPrimaryServices();
      
      const updatedDeviceInfo: BluetoothDeviceInfo = {
        ...deviceInfo,
        server,
        services,
        connected: true,
        connecting: false,
        lastSeen: new Date()
      };

      // Update device list
      setDiscoveredDevices(prev => 
        prev.map(d => 
          d.id === deviceInfo.id 
            ? updatedDeviceInfo
            : d
        )
      );

      // Update connection status
      setConnectionStatus(prev => ({
        isConnecting: false,
        connectedDevices: [...prev.connectedDevices.filter(d => d.id !== deviceInfo.id), updatedDeviceInfo]
      }));

      toast({
        title: "Connected Successfully",
        description: `Connected to ${deviceInfo.name}`,
        variant: "default"
      });

    } catch (err) {
      // Remove connecting state
      setDiscoveredDevices(prev => 
        prev.map(d => 
          d.id === deviceInfo.id 
            ? { ...d, connecting: false }
            : d
        )
      );

      setConnectionStatus(prev => ({ ...prev, isConnecting: false }));

      const bluetoothError: BluetoothError = {
        type: 'connection_failed',
        message: `Failed to connect to ${deviceInfo.name}`,
        details: err instanceof Error ? err.message : 'Unknown connection error'
      };
      setError(bluetoothError);

      toast({
        title: "Connection Failed",
        description: bluetoothError.message,
        variant: "destructive"
      });
    }
  }, [toast]);

  // Disconnect from a device
  const disconnectFromDevice = useCallback(async (deviceInfo: BluetoothDeviceInfo) => {
    try {
      if (deviceInfo.server?.connected) {
        deviceInfo.server.disconnect();
      }

      // Update device list
      setDiscoveredDevices(prev => 
        prev.map(d => 
          d.id === deviceInfo.id 
            ? { ...d, connected: false, server: undefined, services: undefined }
            : d
        )
      );

      // Update connection status
      setConnectionStatus(prev => ({
        ...prev,
        connectedDevices: prev.connectedDevices.filter(d => d.id !== deviceInfo.id)
      }));

      if (selectedDevice?.id === deviceInfo.id) {
        setSelectedDevice(null);
      }

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
  }, [selectedDevice, toast]);

  // Get service information with friendly names
  const getServiceInfo = useCallback((services: BluetoothRemoteGATTService[]): BluetoothServiceInfo[] => {
    return services.map(service => {
      const standardService = STANDARD_SERVICES[service.uuid];
      return {
        name: standardService?.name || 'Custom Service',
        uuid: service.uuid,
        description: standardService?.description || 'Custom or proprietary service',
        service
      };
    });
  }, []);

  // Refresh device services
  const refreshDeviceServices = useCallback(async (deviceInfo: BluetoothDeviceInfo) => {
    if (!deviceInfo.server?.connected) {
      toast({
        title: "Not Connected",
        description: "Device must be connected to refresh services",
        variant: "destructive"
      });
      return;
    }

    try {
      const services = await deviceInfo.server.getPrimaryServices();
      
      const updatedDeviceInfo = {
        ...deviceInfo,
        services,
        lastSeen: new Date()
      };

      setDiscoveredDevices(prev => 
        prev.map(d => 
          d.id === deviceInfo.id 
            ? updatedDeviceInfo
            : d
        )
      );

      if (selectedDevice?.id === deviceInfo.id) {
        setSelectedDevice(updatedDeviceInfo);
      }

      toast({
        title: "Services Refreshed",
        description: `Updated services for ${deviceInfo.name}`,
        variant: "default"
      });

    } catch (err) {
      toast({
        title: "Refresh Failed",
        description: `Failed to refresh services for ${deviceInfo.name}`,
        variant: "destructive"
      });
    }
  }, [selectedDevice, toast]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkBluetoothAvailability();
  }, [checkBluetoothAvailability]);

  return {
    discoveredDevices,
    selectedDevice,
    setSelectedDevice,
    scanStatus,
    connectionStatus,
    error,
    startScan,
    connectToDevice,
    disconnectFromDevice,
    getServiceInfo,
    refreshDeviceServices,
    clearError,
    checkBluetoothAvailability
  };
}

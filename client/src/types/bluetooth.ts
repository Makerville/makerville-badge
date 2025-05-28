export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  device: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  services?: BluetoothRemoteGATTService[];
  connected: boolean;
  rssi?: number;
  lastSeen: Date;
  connecting?: boolean;
}

export interface BluetoothServiceInfo {
  name: string;
  uuid: string;
  description: string;
  service: BluetoothRemoteGATTService;
}

export interface BluetoothError {
  type: 'not_supported' | 'not_available' | 'permission_denied' | 'connection_failed' | 'scan_failed';
  message: string;
  details?: string;
}

export interface ScanStatus {
  isScanning: boolean;
  isAvailable: boolean;
  lastScanTime?: Date;
}

export interface ConnectionStatus {
  isConnecting: boolean;
  connectedDevices: BluetoothDeviceInfo[];
}

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  device: BluetoothDevice;
  connected: boolean;
  connecting?: boolean;
  lastSeen: Date;
  rssi: number;
  server?: BluetoothRemoteGATTServer;
  services?: BluetoothRemoteGATTService[];
  characteristic?: BluetoothRemoteGATTCharacteristic;
}

export interface BluetoothServiceInfo {
  name: string;
  uuid: string;
  description: string;
  service: BluetoothRemoteGATTService;
}

export interface BluetoothError {
  type: 'not_supported' | 'not_available' | 'scan_failed' | 'connection_failed' | 'disconnect_failed';
  message: string;
  details: string;
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

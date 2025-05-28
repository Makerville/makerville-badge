# Static Bluetooth Low Energy Scanner

A web-based Bluetooth Low Energy (BLE) device scanner that runs entirely in the browser using the Web Bluetooth API. No backend server required!

## Features

- 🔍 **Device Discovery**: Scan for nearby Bluetooth Low Energy devices
- 🔗 **Connection Management**: Connect and disconnect from BLE devices
- 📋 **Service Exploration**: View available services on connected devices
- 📱 **Mobile Optimized**: Responsive design perfect for mobile browsers
- ⚡ **Real-time Updates**: Live status indicators and connection states
- 🎨 **Modern UI**: Clean, intuitive interface with loading states

## How to Use

1. **Open in a compatible browser** (Chrome, Edge, or other Web Bluetooth supported browsers)
2. **Ensure HTTPS** - Web Bluetooth API requires a secure connection
3. **Click "Start Scanning"** to discover nearby BLE devices
4. **Select a device** from the list to connect
5. **Explore services** to see what the device offers

## Browser Compatibility

- ✅ Chrome 56+
- ✅ Edge 79+
- ✅ Opera 43+
- ❌ Firefox (Web Bluetooth not supported)
- ❌ Safari (Web Bluetooth not supported)

## Deployment

This is a static web application that can be deployed to any static hosting service:

- **Netlify**: Drag and drop the `dist` folder
- **Vercel**: Connect your Git repository
- **GitHub Pages**: Upload files to your repository
- **Any web server**: Serve the built files over HTTPS

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## Security Notes

- Requires HTTPS to access Web Bluetooth API
- User must grant permission for each device connection
- Only discovers devices that are actively advertising
- Cannot access devices without user interaction

## Supported Device Types

The scanner can discover and connect to any BLE device, with optimized support for:

- Audio devices (headphones, speakers)
- Fitness trackers and smartwatches
- Health monitoring devices
- IoT sensors and beacons
- Custom BLE peripherals

## Standard Services Detected

- Generic Access Profile
- Device Information Service
- Battery Service
- Heart Rate Service
- Human Interface Device (HID)
- And many more standard BLE services
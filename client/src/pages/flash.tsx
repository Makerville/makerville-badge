import { Zap, ArrowLeft, Download, Usb, CheckCircle, AlertTriangle, Terminal, X, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useGitHubReleases } from "@/hooks/use-github-releases";
import { useEspTool } from "@/hooks/use-esptool";
import { BrowserCompatibilityAlert } from "@/components/ui/browser-compatibility-alert";

export default function Flash() {
  const { releases, isLoading, error } = useGitHubReleases("makerville", "makerville-badge");
  const { connectionState, flashState, logState, webSerialSupport, connect, disconnect, flashFirmware, startMonitoring, stopMonitoring, clearLogs, isConnecting, isConnected, isFlashing } = useEspTool();
  const [selectedRelease, setSelectedRelease] = useState<string>("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  const firmwareBinaries = releases.flatMap(release => 
    release.assets.filter(asset => asset.name === 'makerville-badge.bin')
      .map(asset => ({
        release: release.tag_name,
        releaseName: release.name,
        publishedAt: release.published_at,
        downloadUrl: asset.browser_download_url,
        fileName: asset.name,
        size: asset.size
      }))
  );

  const handleFlash = async () => {
    if (!selectedRelease || !isConnected) return;
    await flashFirmware(selectedRelease);
  };

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logState.logs]);
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-3">
            <Zap className="text-primary text-2xl" />
            Flash Firmware
            <a href="/">
              <ArrowLeft className="w-5 h-5 text-slate-500 hover:text-primary transition-colors cursor-pointer" />
            </a>
            <a
              href="https://github.com/makerville/makerville-badge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-primary transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Flash firmware binaries to your Makerville Badge</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          {/* Browser Compatibility Warning */}
          <BrowserCompatibilityAlert webSerialSupport={webSerialSupport} />
          
          {/* Connection Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Usb className="w-5 h-5" />
                Device Connection
              </CardTitle>
              <CardDescription>
                Connect your ESP32-based badge via USB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionState.status === 'connected' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-md border border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Connected to {connectionState.chipType}</p>
                    <p className="text-xs text-green-600">Ready to flash firmware</p>
                  </div>
                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                    {connectionState.chipType}
                  </Badge>
                </div>
              )}

              {connectionState.status === 'error' && (
                <div className="p-3 bg-red-50 rounded-md border border-red-200">
                  <p className="text-sm font-medium text-red-800">Connection Error</p>
                  <p className="text-xs text-red-600">{connectionState.error}</p>
                </div>
              )}

              <div className="flex gap-2">
                {!isConnected ? (
                  <Button
                    onClick={connect}
                    disabled={isConnecting || !webSerialSupport.supported}
                    className="flex-1"
                  >
                    <Usb className="w-4 h-4 mr-2" />
                    {isConnecting ? 'Connecting...' : 'Connect Device'}
                  </Button>
                ) : (
                  <Button onClick={disconnect} variant="outline" className="flex-1">
                    Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Flash Tool Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                ESP32 Flash Tool
              </CardTitle>
              <CardDescription>
                Upload firmware binaries directly to your badge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Select Release Version</label>
                {isLoading ? (
                  <div className="text-sm text-slate-500">Loading releases...</div>
                ) : error ? (
                  <div className="text-sm text-red-500">Error loading releases: {error}</div>
                ) : firmwareBinaries.length === 0 ? (
                  <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">No makerville-badge.bin found</p>
                      <p className="text-xs text-yellow-600">No releases contain the required firmware file</p>
                    </div>
                  </div>
                ) : (
                  <Select value={selectedRelease} onValueChange={setSelectedRelease}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a firmware version" />
                    </SelectTrigger>
                    <SelectContent>
                      {firmwareBinaries.map((binary, index) => (
                        <SelectItem key={index} value={binary.downloadUrl}>
                          <div className="flex flex-col">
                            <span className="font-medium">{binary.release}</span>
                            <span className="text-xs text-slate-500">{binary.releaseName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {flashState.status !== 'idle' && (
                <div className="space-y-2">
                  {flashState.status === 'success' ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-md border border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-800">{flashState.message}</p>
                    </div>
                  ) : flashState.status === 'error' ? (
                    <div className="p-3 bg-red-50 rounded-md border border-red-200">
                      <p className="text-sm font-medium text-red-800">Flash Failed</p>
                      <p className="text-xs text-red-600">{flashState.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{flashState.message}</span>
                        <span className="text-slate-800 font-medium">{flashState.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${flashState.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={handleFlash}
                disabled={!isConnected || !selectedRelease || isFlashing || firmwareBinaries.length === 0} 
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isFlashing ? flashState.message : 'Flash Firmware'}
              </Button>
              
              {!isConnected ? (
                <p className="text-xs text-slate-500 text-center">
                  Connect your device first to enable flashing
                </p>
              ) : !selectedRelease && firmwareBinaries.length > 0 ? (
                <p className="text-xs text-slate-500 text-center">
                  Select a firmware version to flash
                </p>
              ) : firmwareBinaries.length === 0 ? (
                <p className="text-xs text-slate-500 text-center">
                  No makerville-badge.bin found in releases
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Device Logs Card - Show after successful flash or when monitoring */}
          {(flashState.status === 'success' || logState.isMonitoring || logState.logs.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Device Logs
                  </div>
                  <div className="flex items-center gap-2">
                    {logState.isMonitoring ? (
                      <Button onClick={stopMonitoring} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-1" />
                        Stop
                      </Button>
                    ) : isConnected && (
                      <Button onClick={startMonitoring} variant="outline" size="sm">
                        <Terminal className="w-4 h-4 mr-1" />
                        Monitor
                      </Button>
                    )}
                    <Button onClick={clearLogs} variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {logState.isMonitoring 
                    ? 'Monitoring device output in real-time'
                    : 'Device output and boot logs'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-60 overflow-y-auto">
                  {logState.logs.length === 0 ? (
                    <div className="text-slate-500 italic">No logs yet...</div>
                  ) : (
                    logState.logs.map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap break-words">
                        {log}
                      </div>
                    ))
                  )}
                  {logState.isMonitoring && (
                    <div className="text-yellow-400 animate-pulse">
                      ● Monitoring...
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
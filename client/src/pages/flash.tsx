import { Zap, Download, Usb, CheckCircle, AlertTriangle, PauseCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/ui/navigation";
import { useGitHubReleases } from "@/hooks/use-github-releases";
import { useEspTool } from "@/hooks/use-esptool";
import { useSerialConsole } from "@/hooks/use-serial-console";
import { detectWebSerialSupport } from "@/lib/webserial-utils";
import { BrowserCompatibilityAlert } from "@/components/ui/browser-compatibility-alert";
import { SerialConsole } from "@/components/serial-console";

export default function Flash() {
  const { releases, isLoading, error } = useGitHubReleases("makerville", "makerville-badge");
  const { flashState, logState, flashFirmware, clearLogs, isFlashing } = useEspTool();
  const serial = useSerialConsole();
  const webSerialSupport = detectWebSerialSupport();
  const [selectedRelease, setSelectedRelease] = useState<string>("");
  const logsRef = useRef<HTMLDivElement>(null);

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
    if (!selectedRelease || !serial.isConnected) return;

    // Borrow the port from the console for flashing, then give it back so the
    // user lands in the new firmware's shell
    const port = await serial.suspend();
    if (!port) return;
    clearLogs();
    await flashFirmware(port, selectedRelease);
    await serial.resume();
  };

  // Keep the flash log scrolled to the latest line
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logState.logs]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <Navigation currentPage="flash" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-6">
          {/* Browser Compatibility Warning */}
          <BrowserCompatibilityAlert webSerialSupport={webSerialSupport} />

          {/* Connection Card - owns the serial port for both flashing and the console */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Usb className="w-5 h-5" />
                Device Connection
              </CardTitle>
              <CardDescription>
                Connect your badge via USB to flash it or talk to it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {serial.status === 'open' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-md border border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Badge connected</p>
                    <p className="text-xs text-green-600">Ready to flash, logs streaming below</p>
                  </div>
                  {flashState.chipType && (
                    <Badge variant="secondary" className="text-green-700 bg-green-100">
                      {flashState.chipType}
                    </Badge>
                  )}
                </div>
              )}

              {serial.status === 'suspended' && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <PauseCircle className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">Flashing, keep the badge plugged in</p>
                </div>
              )}

              {serial.status === 'error' && (
                <div className="p-3 bg-red-50 rounded-md border border-red-200">
                  <p className="text-sm font-medium text-red-800">Connection Error</p>
                  <p className="text-xs text-red-600">{serial.error}</p>
                </div>
              )}

              <div className="flex gap-2">
                {!serial.isConnected ? (
                  <Button
                    onClick={serial.connect}
                    disabled={serial.status === 'connecting' || !webSerialSupport.supported}
                    className="flex-1"
                  >
                    <Usb className="w-4 h-4 mr-2" />
                    {serial.status === 'connecting' ? 'Connecting...' : 'Connect Device'}
                  </Button>
                ) : (
                  <Button onClick={serial.disconnect} disabled={isFlashing} variant="outline" className="flex-1">
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
                Flash Firmware
              </CardTitle>
              <CardDescription>
                Install a released firmware on your badge
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
                disabled={!serial.isOpen || !selectedRelease || isFlashing || firmwareBinaries.length === 0}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isFlashing ? flashState.message : 'Flash Firmware'}
              </Button>

              {!serial.isConnected ? (
                <p className="text-xs text-slate-500 text-center">
                  Connect your device first to enable flashing
                </p>
              ) : !selectedRelease && firmwareBinaries.length > 0 ? (
                <p className="text-xs text-slate-500 text-center">
                  Select a firmware version to flash
                </p>
              ) : null}

              {logState.logs.length > 0 && (
                <details open={flashState.status === 'error'} className="text-sm">
                  <summary className="cursor-pointer text-slate-600 hover:text-slate-800">Flash log</summary>
                  <div ref={logsRef} className="mt-2 bg-slate-900 text-green-400 p-3 rounded-md font-mono text-xs max-h-48 overflow-y-auto">
                    {logState.logs.map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap break-words">
                        {log}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>

          {webSerialSupport.supported && <SerialConsole console={serial} />}
        </div>
      </main>
    </div>
  );
}

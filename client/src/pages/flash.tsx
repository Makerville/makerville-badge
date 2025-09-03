import { Zap, ArrowLeft, Download } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGitHubReleases } from "@/hooks/use-github-releases";

export default function Flash() {
  const { releases, isLoading, error } = useGitHubReleases("makerville", "makerville-badge");
  const [selectedRelease, setSelectedRelease] = useState<string>("");

  const firmwareBinaries = releases.flatMap(release => 
    release.assets.filter(asset => asset.name.endsWith('.bin'))
      .map(asset => ({
        release: release.tag_name,
        releaseName: release.name,
        publishedAt: release.published_at,
        downloadUrl: asset.browser_download_url,
        fileName: asset.name,
        size: asset.size
      }))
  );
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-3">
            <Zap className="text-primary text-2xl" />
            Flash Firmware
            <Link href="/">
              <ArrowLeft className="w-5 h-5 text-slate-500 hover:text-primary transition-colors cursor-pointer" />
            </Link>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                ESP32 Flash Tool
              </CardTitle>
              <CardDescription>
                Upload firmware binaries directly to your ESP32-based badge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                This tool allows you to flash firmware binaries to your Makerville Badge using esptool-js.
                Connect your badge via USB and select the appropriate binary file.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Select Release Version</label>
                {isLoading ? (
                  <div className="text-sm text-slate-500">Loading releases...</div>
                ) : error ? (
                  <div className="text-sm text-red-500">Error loading releases: {error}</div>
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

              <Button disabled className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Flash Firmware
              </Button>
              <p className="text-xs text-slate-500 text-center">
                Flashing functionality coming soon...
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
import { useEffect, useRef } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, ExternalLink } from "lucide-react";

export default function PCB() {
  const pcbContainerRef = useRef<HTMLDivElement>(null);
  const schematicContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically load the KiCanvas script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://kicanvas.org/kicanvas/kicanvas.js';
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    // Inject HTML directly for PCB viewer
    if (pcbContainerRef.current) {
      pcbContainerRef.current.innerHTML = `
        <kicanvas-embed controls="full">
          <kicanvas-source src="https://raw.githubusercontent.com/Makerville/makerville-badge/master/hw_pcb/mbadge25_v2/mbadge25.kicad_pcb"></kicanvas-source>
        </kicanvas-embed>
      `;
    }

    // Inject HTML directly for Schematic viewer
    if (schematicContainerRef.current) {
      schematicContainerRef.current.innerHTML = `
        <kicanvas-embed controls="full">
          <kicanvas-source src="https://raw.githubusercontent.com/Makerville/makerville-badge/master/hw_pcb/mbadge25_v2/mbadge25.kicad_sch"></kicanvas-source>
        </kicanvas-embed>
      `;
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <Navigation currentPage="pcb" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* PCB Layout Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                PCB Layout
              </CardTitle>
              <CardDescription>
                Interactive PCB layout viewer
                <a
                  href="https://github.com/Makerville/makerville-badge/tree/master/hw_pcb/mbadge25_v2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-primary hover:underline"
                >
                  View on GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={pcbContainerRef}
                className="bg-white rounded-lg overflow-hidden border border-slate-200"
                style={{ height: '70vh' }}
              />
            </CardContent>
          </Card>

          {/* Schematic Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Schematic
              </CardTitle>
              <CardDescription>
                Interactive schematic viewer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={schematicContainerRef}
                className="bg-white rounded-lg overflow-hidden border border-slate-200"
                style={{ height: '70vh' }}
              />
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-xs text-slate-500 text-center">
            Powered by <a href="https://kicanvas.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">KiCanvas</a>,
            an open-source KiCAD web viewer (currently in alpha)
          </p>
        </div>
      </main>
    </div>
  );
}

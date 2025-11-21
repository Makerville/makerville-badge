import { Bluetooth, Zap, Github, Cpu, ShoppingCart } from "lucide-react";

interface NavigationProps {
  currentPage: "home" | "flash" | "pcb";
}

export function Navigation({ currentPage }: NavigationProps) {

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            {currentPage === "home" ? (
              <Bluetooth className="text-primary w-6 h-6" />
            ) : currentPage === "flash" ? (
              <Zap className="text-primary w-6 h-6" />
            ) : (
              <Cpu className="text-primary w-6 h-6" />
            )}
            <h1 className="text-xl font-semibold text-slate-800">
              {currentPage === "home" ? "Makerville Badge" : currentPage === "flash" ? "Flash Firmware" : "PCB Viewer"}
            </h1>
          </div>

          {/* Navigation Menu */}
          <nav className="flex items-center gap-3 ml-auto">
            {/* Home/BLE Scanner Link */}
            <a
              href="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                currentPage === "home"
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-primary"
              }`}
              title="BLE Scanner"
            >
              <Bluetooth className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Scanner</span>
            </a>

            {/* Flash Link */}
            <a
              href="/flash"
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                currentPage === "flash"
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-primary"
              }`}
              title="Flash Firmware"
            >
              <Zap className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Flash</span>
            </a>

            {/* PCB Link */}
            <a
              href="/pcb"
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                currentPage === "pcb"
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-primary"
              }`}
              title="PCB Viewer"
            >
              <Cpu className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">PCB</span>
            </a>

            {/* GitHub Link */}
            <a
              href="https://github.com/makerville/makerville-badge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors"
              title="View on GitHub (opens in new tab)"
            >
              <Github className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">GitHub</span>
            </a>

            {/* Buy Button */}
            <a
              href="https://713s70-dy.myshopify.com/products/makerville-badge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
              title="Buy Badge"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Buy</span>
            </a>
          </nav>
        </div>

        {/* Subtitle */}
        <p className="text-sm text-slate-500 mt-1">
          {currentPage === "home"
            ? "Discover and tweak badges near you using BLE"
            : currentPage === "flash"
            ? "Flash firmware binaries to your Makerville Badge"
            : "Interactive PCB and schematic viewer"}
        </p>
      </div>
    </header>
  );
}

import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BleScanner from "@/pages/ble-scanner";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <Toaster />
    <BleScanner />
  </TooltipProvider>
);

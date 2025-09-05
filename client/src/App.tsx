import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BleScanner from "@/pages/ble-scanner";

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <BleScanner />
    </TooltipProvider>
  );
}

export default App;

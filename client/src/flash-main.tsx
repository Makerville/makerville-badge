import React from 'react'
import ReactDOM from 'react-dom/client'
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import Flash from "@/pages/flash";
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider>
      <Toaster />
      <Flash />
    </TooltipProvider>
  </React.StrictMode>,
)
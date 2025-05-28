import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  isVisible: boolean;
  title?: string;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  title = "Loading", 
  message = "Please wait...",
  className 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
      className
    )}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
      </div>
    </div>
  );
}

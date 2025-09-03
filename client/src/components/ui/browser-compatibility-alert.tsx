import { AlertTriangle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WebSerialSupport, getRecommendedBrowser } from "@/lib/webserial-utils";

interface BrowserCompatibilityAlertProps {
  webSerialSupport: WebSerialSupport;
}

export function BrowserCompatibilityAlert({ webSerialSupport }: BrowserCompatibilityAlertProps) {
  if (webSerialSupport.supported) {
    return null;
  }

  const recommendedBrowser = getRecommendedBrowser();

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Browser Not Compatible</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{webSerialSupport.reason}</p>
        <p className="text-sm">
          <strong>Recommended:</strong> {recommendedBrowser}
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://www.google.com/chrome/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Download Chrome <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://www.microsoft.com/edge" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Download Edge <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
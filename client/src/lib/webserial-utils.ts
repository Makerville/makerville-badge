export interface WebSerialSupport {
  supported: boolean;
  reason?: string;
  browserInfo: string;
}

export function detectWebSerialSupport(): WebSerialSupport {
  const browserInfo = navigator.userAgent;
  
  // Check for HTTPS requirement (except localhost)
  const isSecureContext = window.isSecureContext || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
  
  if (!isSecureContext) {
    return {
      supported: false,
      reason: 'Web Serial API requires HTTPS',
      browserInfo
    };
  }
  
  // Check for Web Serial API support
  if (!('serial' in navigator)) {
    let reason = 'Web Serial API not supported';
    
    // Provide browser-specific guidance
    if (browserInfo.includes('Firefox')) {
      reason = 'Firefox does not support Web Serial API. Please use Chrome or Edge.';
    } else if (browserInfo.includes('Safari')) {
      reason = 'Safari does not support Web Serial API. Please use Chrome or Edge.';
    } else if (browserInfo.includes('Chrome')) {
      reason = 'Chrome version too old. Please update to Chrome 89 or later.';
    } else if (browserInfo.includes('Edge')) {
      reason = 'Edge version too old. Please update to Edge 89 or later.';
    }
    
    return {
      supported: false,
      reason,
      browserInfo
    };
  }
  
  return {
    supported: true,
    browserInfo
  };
}

export function getRecommendedBrowser(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Android')) {
    return 'Chrome for Android (version 61 or later)';
  }
  
  return 'Google Chrome or Microsoft Edge (version 89 or later)';
}
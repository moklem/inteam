// PWA Install Utility
// Handles PWA installation prompts for Android and iOS

let deferredPrompt = null;

// Listen for the beforeinstallprompt event (Android)
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Store the event so it can be triggered later
  deferredPrompt = e;
  console.log('PWA install prompt is available');
});

// Listen for app installed event
window.addEventListener('appinstalled', (e) => {
  console.log('PWA was installed');
  deferredPrompt = null;
});

// Check if the app is already installed
export const isAppInstalled = () => {
  // Check if app is running in standalone mode (PWA is installed)
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone || 
         document.referrer.includes('android-app://');
};

// Check if PWA install is available
export const isPWAInstallAvailable = () => {
  // Android: Check if deferredPrompt is available
  if (deferredPrompt) {
    return true;
  }
  
  // iOS: Check if it's iOS Safari and not in standalone mode
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = window.navigator.standalone;
  
  return isIOS && !isInStandaloneMode;
};

// Get the device type
export const getDeviceType = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  return 'desktop';
};

// Show PWA install prompt
export const showPWAInstallPrompt = async () => {
  const deviceType = getDeviceType();
  
  if (deviceType === 'android' && deferredPrompt) {
    // Android: Show the install prompt
    try {
      const result = await deferredPrompt.prompt();
      console.log('PWA install prompt result:', result);
      
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
        return { success: true, method: 'android-prompt' };
      } else {
        console.log('User dismissed the PWA install prompt');
        return { success: false, method: 'android-prompt', reason: 'dismissed' };
      }
    } catch (error) {
      console.error('Error showing PWA install prompt:', error);
      return { success: false, method: 'android-prompt', reason: 'error', error };
    } finally {
      deferredPrompt = null;
    }
  } else if (deviceType === 'ios') {
    // iOS: Show instructions
    return { success: true, method: 'ios-instructions' };
  } else {
    // Desktop or other: Show instructions
    return { success: true, method: 'desktop-instructions' };
  }
};

// Get install instructions based on device
export const getInstallInstructions = () => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'ios':
      return {
        title: 'App zum Homescreen hinzufügen',
        steps: [
          'Tippe auf das Teilen-Symbol unten',
          'Wähle "Zum Home-Bildschirm hinzufügen"',
          'Tippe auf "Hinzufügen"'
        ],
        icon: '📱'
      };
    case 'android':
      return {
        title: 'App installieren',
        steps: [
          'Tippe auf "Installieren" wenn der Dialog erscheint',
          'Oder öffne das Browser-Menü (⋮)',
          'Wähle "App installieren" oder "Zum Startbildschirm hinzufügen"'
        ],
        icon: '📱'
      };
    default:
      return {
        title: 'App installieren',
        steps: [
          'Klicke auf das Install-Symbol in der Adressleiste',
          'Oder öffne das Browser-Menü',
          'Wähle "App installieren" oder "Verknüpfung erstellen"'
        ],
        icon: '💻'
      };
  }
};

// Check if install banner should be shown
export const shouldShowInstallBanner = () => {
  // Don't show if app is already installed
  if (isAppInstalled()) {
    return false;
  }
  
  // Don't show if user has dismissed it recently
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    if (dismissedTime > oneDayAgo) {
      return false;
    }
  }
  
  return isPWAInstallAvailable();
};

// Mark install banner as dismissed
export const dismissInstallBanner = () => {
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
};

export default {
  isAppInstalled,
  isPWAInstallAvailable,
  getDeviceType,
  showPWAInstallPrompt,
  getInstallInstructions,
  shouldShowInstallBanner,
  dismissInstallBanner
};
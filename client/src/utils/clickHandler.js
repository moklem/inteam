/**
 * Utility to ensure click events work properly across the application
 * This adds a global click handler to help ensure clicks are properly processed
 * for both mouse and touch interactions while preventing accidental clicks during scrolling
 */

// Configuration
const TOUCH_THRESHOLD = 10; // Maximum pixels of movement to consider it a tap
const TOUCH_DURATION_THRESHOLD = 500; // Maximum ms to consider it a tap (not a long press)

// Track touch state
let touchStartData = null;
let touchMoved = false;

// Function to initialize click handling
export const initClickHandling = () => {
  // Only add touch handlers for touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    // Add touch event handlers for mobile devices with passive option for better scrolling
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    console.log('Touch handlers initialized');
  }
  
  // Add pointer event support for better cross-device compatibility
  document.addEventListener('pointerdown', handlePointerDown, { passive: false });
  
  console.log('Click handlers initialized');
};

// Pointer down handler for better cross-device support
const handlePointerDown = (event) => {
  const target = event.target;
  const clickableElement = findClickableParent(target);
  
  if (clickableElement) {
    // Ensure the element is focusable and can receive clicks
    if (!clickableElement.hasAttribute('tabindex') &&
        !['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(clickableElement.tagName)) {
      clickableElement.setAttribute('tabindex', '0');
    }
    
    // For MUI components that might have disabled pointer events
    if (window.getComputedStyle(clickableElement).pointerEvents === 'none') {
      clickableElement.style.pointerEvents = 'auto';
    }
  }
};

// Find the closest clickable parent element
const findClickableParent = (element) => {
  // Extended list of selectors for clickable elements including MUI components
  const clickableSelectors = [
    'a',
    'button',
    '[role="button"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    'select',
    '.MuiButtonBase-root',
    '.MuiIconButton-root',
    '.MuiButton-root',
    '.MuiMenuItem-root',
    '.MuiListItem-button',
    '.MuiListItemButton-root',
    '.MuiTab-root',
    '.MuiToggleButton-root',
    '.MuiSwitch-root',
    '.MuiCheckbox-root',
    '.MuiRadio-root',
    '.MuiSelect-root',
    '.MuiSelect-select',
    '.MuiFab-root',
    '.MuiChip-root[onclick]',
    '.MuiChip-clickable',
    '.MuiTableRow-root[onclick]',
    '.MuiTableCell-root[onclick]',
    '[onclick]',
    '[data-clickable="true"]',
    '[tabindex="0"]',
    '[tabindex="-1"][role]'
  ];
  
  // Check if the element or any of its parents match the selectors
  let currentElement = element;
  while (currentElement && currentElement !== document.body) {
    if (currentElement.matches && currentElement.matches(clickableSelectors.join(','))) {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }
  
  return null;
};

// Touch event handlers for mobile devices
const handleTouchStart = (event) => {
  touchMoved = false;
  
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    touchStartData = {
      target: event.target,
      startX: touch.pageX,
      startY: touch.pageY,
      startTime: Date.now()
    };
  }
};

const handleTouchMove = (event) => {
  if (!touchStartData || event.touches.length !== 1) {
    touchMoved = true;
    return;
  }
  
  const touch = event.touches[0];
  const deltaX = Math.abs(touch.pageX - touchStartData.startX);
  const deltaY = Math.abs(touch.pageY - touchStartData.startY);
  
  // If the touch has moved more than the threshold, it's a scroll, not a tap
  if (deltaX > TOUCH_THRESHOLD || deltaY > TOUCH_THRESHOLD) {
    touchMoved = true;
  }
};

const handleTouchEnd = (event) => {
  if (!touchStartData || touchMoved || event.changedTouches.length !== 1) {
    touchStartData = null;
    touchMoved = false;
    return;
  }
  
  const touch = event.changedTouches[0];
  const deltaX = Math.abs(touch.pageX - touchStartData.startX);
  const deltaY = Math.abs(touch.pageY - touchStartData.startY);
  const duration = Date.now() - touchStartData.startTime;
  
  // Check if this qualifies as a tap (minimal movement and reasonable duration)
  if (deltaX <= TOUCH_THRESHOLD && 
      deltaY <= TOUCH_THRESHOLD && 
      duration <= TOUCH_DURATION_THRESHOLD &&
      event.target === touchStartData.target) {
    
    const clickableElement = findClickableParent(event.target);
    
    if (clickableElement) {
      // Prevent default to avoid double clicks
      event.preventDefault();
      
      // Small delay to ensure any scroll momentum has stopped
      setTimeout(() => {
        // Create and dispatch a click event
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          detail: 1
        });
        
        clickableElement.dispatchEvent(clickEvent);
      }, 50);
    }
  }
  
  touchStartData = null;
  touchMoved = false;
};

const handleTouchCancel = () => {
  touchStartData = null;
  touchMoved = false;
};

// Clean up function to remove event listeners
export const cleanupClickHandling = () => {
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
  document.removeEventListener('touchcancel', handleTouchCancel);
  document.removeEventListener('pointerdown', handlePointerDown);
  
  console.log('Click handlers removed');
};

// Helper function to ensure MUI components are properly clickable
export const ensureMuiClickable = (component) => {
  // This can be used as a ref callback to ensure MUI components are clickable
  if (component && component.style) {
    component.style.cursor = 'pointer';
    if (window.getComputedStyle(component).pointerEvents === 'none') {
      component.style.pointerEvents = 'auto';
    }
  }
};
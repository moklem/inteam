/**
 * Utility to ensure click events work properly across the application
 * This adds a global click handler to help ensure clicks are properly processed
 * for both mouse and touch interactions
 */

// Function to initialize click handling
export const initClickHandling = () => {
  // Only add touch handlers for touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    // Add touch event handlers for mobile devices
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
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
let touchStartTarget = null;

const handleTouchStart = (event) => {
  touchStartTarget = event.target;
};

const handleTouchEnd = (event) => {
  // If the touch ended on the same element it started on, treat it as a click
  if (touchStartTarget && event.target === touchStartTarget) {
    const clickableElement = findClickableParent(event.target);
    if (clickableElement) {
      // Create and dispatch a click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      clickableElement.dispatchEvent(clickEvent);
    }
  }
  
  touchStartTarget = null;
};

// Clean up function to remove event listeners
export const cleanupClickHandling = () => {
  document.removeEventListener('touchstart', handleTouchStart, { passive: false });
  document.removeEventListener('touchend', handleTouchEnd, { passive: false });
  document.removeEventListener('pointerdown', handlePointerDown, { passive: false });
  
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
// Polyfills for older browsers

// Polyfill for Object.entries
if (!Object.entries) {
  Object.entries = function(obj) {
    const ownProps = Object.keys(obj);
    let i = ownProps.length;
    const resArray = new Array(i);
    
    while (i--) {
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    }
    
    return resArray;
  };
}

// Polyfill for Array.prototype.includes
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement, fromIndex) {
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    const o = Object(this);
    const len = o.length >>> 0;

    if (len === 0) {
      return false;
    }

    const n = fromIndex | 0;
    let k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

    while (k < len) {
      if (o[k] === searchElement) {
        return true;
      }
      k++;
    }

    return false;
  };
}

// Polyfill for String.prototype.startsWith
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

// Polyfill for Promise.prototype.finally
if (!Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const P = this.constructor;
    return this.then(
      value => P.resolve(callback()).then(() => value),
      reason => P.resolve(callback()).then(() => { throw reason; })
    );
  };
}

// Polyfill for Object.values
if (!Object.values) {
  Object.values = function(obj) {
    return Object.keys(obj).map(key => obj[key]);
  };
}

// Polyfill for CustomEvent for older browsers
(function () {
  if (typeof window.CustomEvent === "function") return false;

  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    const evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }

  CustomEvent.prototype = window.Event.prototype;
  window.CustomEvent = CustomEvent;
})();

// Initialize polyfills
export function initPolyfills() {
  // Any additional initialization logic can go here
  console.log('Polyfills initialized');
}
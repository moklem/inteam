// Simple event emitter for cross-component communication
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove
    );
  }

  emit(event, data) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(listener => listener(data));
  }
}

// Create a singleton instance
const eventEmitter = new EventEmitter();

// Event names
export const EVENTS = {
  EVENT_UPDATED: 'event_updated',
  EVENTS_REFRESH: 'events_refresh'
};

export default eventEmitter;
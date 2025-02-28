type EventCallback = () => void;

class EventBus {
  private events: { [key: string]: EventCallback[] } = {};

  subscribe(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Cleanup fonksiyonunu döndür
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  publish(event: string) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback());
    }
  }
}

export const eventBus = new EventBus();

// Event türleri için sabitler
export const EVENT_TYPES = {
  STOCK_MOVEMENT_CREATED: 'STOCK_MOVEMENT_CREATED',
  SALE_CREATED: 'SALE_CREATED',
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED'
} as const; 
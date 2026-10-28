import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Global Real-time Synchronization Engine for CRM System
const CHANNEL_NAME = 'crm_realtime_sync';

const SOCKET_URL =
  import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com'
    : 'http://localhost:5000';

let socket = null;
let broadcastChannel = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment');
}

// Initialize Socket.IO connection lazily/singleton
export const getSocket = () => {
  if (typeof window === 'undefined') return null;
  if (!socket) {
    try {
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        withCredentials: true,
      });

      socket.on('connect', () => {
        // Auto-join user room if user is logged in
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const user = JSON.parse(stored);
            if (user?._id || user?.id) {
              socket.emit('join', `user_${user._id || user.id}`);
            }
            if (user?.role) {
              socket.emit('join', `role_${user.role.toLowerCase()}`);
            }
          }
        } catch (e) {}
      });

      // Central incoming real-time listener from Backend
      socket.on('crm:sync', (data) => {
        if (data && data.type) {
          notifyLiveSync(data.type, data.payload, false /* fromSocket: do not loop back */);
        }
      });

      socket.on('data:sync', (data) => {
        if (data && data.type) {
          notifyLiveSync(data.type, data.payload, false);
        }
      });
    } catch (err) {
      console.warn('Socket connection initialization warning:', err);
    }
  }
  return socket;
};

// Initialize socket immediately on load in browser
if (typeof window !== 'undefined') {
  getSocket();
}

/**
 * Trigger a real-time sync update across all open tabs/windows, network sockets, and local components.
 * @param {string} type - 'orders' | 'products' | 'rawMaterials' | 'wip' | 'inbound' | 'returns' | 'marketing' | 'sections' | 'users' | 'cart' | 'favorites' | etc.
 * @param {any} payload - Optional extra details
 * @param {boolean} emitToSocket - Whether to broadcast outward to server
 */
export const notifyLiveSync = (type = 'general', payload = null, emitToSocket = true) => {
  if (typeof window === 'undefined') return;

  const eventDetail = { type, payload, timestamp: Date.now() };

  // 1. Dispatch local window CustomEvent
  window.dispatchEvent(new CustomEvent('crmSyncEvent', { detail: eventDetail }));
  window.dispatchEvent(new CustomEvent(`${type}Updated`, { detail: payload }));
  window.dispatchEvent(new Event(`${type}Updated`));
  window.dispatchEvent(new Event('storage'));

  // Aliases for broad component categories
  if (['products', 'rawMaterials', 'wip', 'inbound', 'expiry', 'suppliers', 'categories', 'scrap'].includes(type)) {
    window.dispatchEvent(new CustomEvent('inventoryUpdated', { detail: payload }));
    window.dispatchEvent(new Event('inventoryUpdated'));
    window.dispatchEvent(new Event('inventory_products_updated'));
  }
  if (['orders', 'returns', 'support', 'shipping'].includes(type)) {
    window.dispatchEvent(new CustomEvent('logisticsUpdated', { detail: payload }));
    window.dispatchEvent(new Event('logisticsUpdated'));
  }
  if (['sections', 'collections', 'events', 'reviews', 'coupons', 'story'].includes(type)) {
    window.dispatchEvent(new CustomEvent('marketingUpdated', { detail: payload }));
    window.dispatchEvent(new Event('marketingUpdated'));
  }
  if (['users', 'settings', 'appearance', 'database'].includes(type)) {
    window.dispatchEvent(new CustomEvent('adminUpdated', { detail: payload }));
    window.dispatchEvent(new Event('adminUpdated'));
  }

  // 2. Broadcast across browser tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(eventDetail);
    } catch (err) {
      console.error('Error broadcasting live sync message:', err);
    }
  }

  // 3. Broadcast to all other devices/browsers across network via Socket.IO
  if (emitToSocket && socket && socket.connected) {
    try {
      socket.emit('client:sync', { type, payload });
    } catch (socketErr) {
      console.warn('Socket emit warning:', socketErr);
    }
  }
};

/**
 * Subscribe to real-time sync updates from backend socket, other tabs, or local components.
 * @param {Function} callback - Function called with ({ type, payload })
 * @returns {Function} Unsubscribe function
 */
export const subscribeLiveSync = (callback) => {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }

  const handleSyncEvent = (e) => {
    callback({ type: e.detail?.type || 'general', payload: e.detail?.payload });
  };

  const createNamedHandler = (name) => (e) => {
    callback({ type: name, payload: e?.detail || null });
  };

  const listeners = [
    { event: 'crmSyncEvent', handler: handleSyncEvent },
    { event: 'ordersUpdated', handler: createNamedHandler('orders') },
    { event: 'logisticsUpdated', handler: createNamedHandler('logistics') },
    { event: 'productsUpdated', handler: createNamedHandler('products') },
    { event: 'inventoryUpdated', handler: createNamedHandler('inventory') },
    { event: 'inventory_products_updated', handler: createNamedHandler('products') },
    { event: 'rawMaterialsUpdated', handler: createNamedHandler('rawMaterials') },
    { event: 'wipUpdated', handler: createNamedHandler('wip') },
    { event: 'inboundUpdated', handler: createNamedHandler('inbound') },
    { event: 'returnsUpdated', handler: createNamedHandler('returns') },
    { event: 'sectionsUpdated', handler: createNamedHandler('sections') },
    { event: 'marketingUpdated', handler: createNamedHandler('marketing') },
    { event: 'usersUpdated', handler: createNamedHandler('users') },
    { event: 'adminUpdated', handler: createNamedHandler('admin') },
    { event: 'appearanceUpdated', handler: createNamedHandler('appearance') },
    { event: 'cartUpdated', handler: createNamedHandler('cart') },
    { event: 'favoritesUpdated', handler: createNamedHandler('favorites') },
    { event: 'notificationsUpdated', handler: createNamedHandler('notifications') },
  ];

  listeners.forEach(({ event, handler }) => {
    window.addEventListener(event, handler);
  });

  let channelListener = null;
  if (broadcastChannel) {
    channelListener = (event) => {
      if (event.data) {
        callback(event.data);
      }
    };
    broadcastChannel.addEventListener('message', channelListener);
  }

  return () => {
    listeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    if (broadcastChannel && channelListener) {
      broadcastChannel.removeEventListener('message', channelListener);
    }
  };
};

/**
 * React Hook for seamless, zero-boilerplate live auto-revalidation without page refresh.
 * @param {string|string[]} entityTypes - One or more entities to watch (e.g. 'orders', ['inventory', 'products'])
 * @param {Function} refreshFn - Callback to re-fetch data silently (e.g. (silent) => fetchOrders(true))
 */
export const useLiveSync = (entityTypes, refreshFn) => {
  const refreshRef = useRef(refreshFn);
  refreshRef.current = refreshFn;

  useEffect(() => {
    const types = Array.isArray(entityTypes) ? entityTypes : [entityTypes];

    const unsubscribe = subscribeLiveSync((event) => {
      if (!event?.type) return;
      const isMatch =
        types.includes('*') ||
        types.includes(event.type) ||
        (types.includes('inventory') && ['products', 'rawMaterials', 'wip', 'inbound', 'expiry', 'suppliers', 'categories'].includes(event.type)) ||
        (types.includes('logistics') && ['orders', 'returns', 'support', 'shipping'].includes(event.type)) ||
        (types.includes('marketing') && ['sections', 'collections', 'events', 'reviews', 'coupons', 'story'].includes(event.type)) ||
        (types.includes('admin') && ['users', 'settings', 'appearance', 'database'].includes(event.type));

      if (isMatch && typeof refreshRef.current === 'function') {
        refreshRef.current(event.payload);
      }
    });

    return unsubscribe;
  }, [Array.isArray(entityTypes) ? entityTypes.join(',') : entityTypes]);
};

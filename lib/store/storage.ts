/**
 * Chrome Storage Adapter for Redux Persist
 * This adapter allows redux-persist to use Chrome's storage.local API
 * instead of localStorage, which is more appropriate for Chrome extensions
 */

import { Storage } from 'redux-persist';

interface ChromeStorageAdapter extends Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Creates a storage adapter that uses Chrome's storage.local API
 * Falls back to localStorage if Chrome APIs are not available (for development)
 */
export const createChromeStorageAdapter = (): ChromeStorageAdapter => {
  const isExtensionContext = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  if (isExtensionContext) {
    return {
      getItem: async (key: string): Promise<string | null> => {
        try {
          const result = await chrome.storage.local.get([key]);
          return result[key] || null;
        } catch (error) {
          console.error('Chrome storage getItem error:', error);
          return null;
        }
      },

      setItem: async (key: string, value: string): Promise<void> => {
        try {
          await chrome.storage.local.set({ [key]: value });
        } catch (error) {
          console.error('Chrome storage setItem error:', error);
          throw error;
        }
      },

      removeItem: async (key: string): Promise<void> => {
        try {
          await chrome.storage.local.remove([key]);
        } catch (error) {
          console.error('Chrome storage removeItem error:', error);
          throw error;
        }
      },
    };
  }

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        throw error;
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        throw error;
      }
    },
  };
};

export const chromeStorageAdapter = createChromeStorageAdapter();

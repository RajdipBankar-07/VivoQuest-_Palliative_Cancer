/**
 * Secure Authentication Token Storage
 * Uses expo-secure-store for hardware-backed encryption (iOS Keychain / Android Keystore)
 * with a resilient in-memory fallback for test and non-native runtimes.
 */

const TOKEN_KEY = 'vivoquest_patient_jwt_token';
const USER_KEY = 'vivoquest_patient_user_data';

export type StorageType = 'hardware_secure_store' | 'in_memory_transient_fallback';

// In-memory fallback cache for headless tests and web previews (non-persistent)
let inMemoryToken: string | null = null;
let inMemoryUser: string | null = null;

// Dynamically load expo-secure-store if available
let SecureStore: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

export const authStorage = {
  /**
   * Determine whether hardware-backed persistent secure storage is active
   */
  async getStorageType(): Promise<StorageType> {
    if (SecureStore && typeof SecureStore.isAvailableAsync === 'function') {
      try {
        const available = await SecureStore.isAvailableAsync();
        if (available) return 'hardware_secure_store';
      } catch {
        // Fall back to in-memory
      }
    }
    return 'in_memory_transient_fallback';
  },

  /**
   * Save JWT token securely
   */
  async setToken(token: string): Promise<void> {
    inMemoryToken = token;
    if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
      try {
        await SecureStore.setItemAsync(TOKEN_KEY, token, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
        return;
      } catch (err) {
        console.warn('[AuthStorage] SecureStore setItem failed, using fallback:', err);
      }
    }
  },

  /**
   * Retrieve JWT token
   */
  async getToken(): Promise<string | null> {
    if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) return token;
      } catch (err) {
        console.warn('[AuthStorage] SecureStore getItem failed, using fallback:', err);
      }
    }
    return inMemoryToken;
  },

  /**
   * Save User session metadata
   */
  async setUser(user: any): Promise<void> {
    const raw = JSON.stringify(user);
    inMemoryUser = raw;
    if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
      try {
        await SecureStore.setItemAsync(USER_KEY, raw);
        return;
      } catch (err) {
        console.warn('[AuthStorage] SecureStore setUser failed:', err);
      }
    }
  },

  /**
   * Retrieve User session metadata
   */
  async getUser(): Promise<any | null> {
    if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
      try {
        const raw = await SecureStore.getItemAsync(USER_KEY);
        if (raw) return JSON.parse(raw);
      } catch (err) {
        console.warn('[AuthStorage] SecureStore getUser failed:', err);
      }
    }
    return inMemoryUser ? JSON.parse(inMemoryUser) : null;
  },

  /**
   * Clear all authentication data on logout or session expiration
   */
  async clearSession(): Promise<void> {
    inMemoryToken = null;
    inMemoryUser = null;
    if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      } catch (err) {
        console.warn('[AuthStorage] SecureStore deleteItem failed:', err);
      }
    }
  },
};

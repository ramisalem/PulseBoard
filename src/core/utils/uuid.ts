/**
 * Generates a UUID v4 compatible identifier.
 * React Native compatible implementation that doesn't rely on Web Crypto API.
 *
 * Note: This uses Math.random() which is not cryptographically secure.
 * For production use, consider react-native-quick-crypto or expo-crypto.
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    // eslint-disable-next-line no-bitwise -- Required for UUID v4 variant bits
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import * as Keychain from 'react-native-keychain';
import type { AuthTokens } from '@typings/auth';
import { logger } from '@core/logger';

const KEYCHAIN_SERVICE = 'com.pulseboard.auth';
const KEYCHAIN_USERNAME = 'pulseboard_tokens';

export const secureStorage = {
  async saveTokens(tokens: AuthTokens): Promise<void> {
    try {
      const value = JSON.stringify(tokens);
      await Keychain.setGenericPassword(KEYCHAIN_USERNAME, value, {
        service: KEYCHAIN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      logger.info('Tokens saved to Keychain');
    } catch (error) {
      logger.error('Failed to save tokens to Keychain', {
        error: String(error),
      });
      throw new Error('Secure storage save failed');
    }
  },

  async getTokens(): Promise<AuthTokens | null> {
    try {
      const result = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
      });
      if (!result || !result.password) {
        return null;
      }
      return JSON.parse(result.password) as AuthTokens;
    } catch (error) {
      logger.error('Failed to retrieve tokens from Keychain', {
        error: String(error),
      });
      return null;
    }
  },

  async clearTokens(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
      logger.info('Tokens cleared from Keychain');
    } catch (error) {
      logger.warn('Failed to clear tokens (may not exist)', {
        error: String(error),
      });
    }
  },
};

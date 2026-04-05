import { useState, useCallback } from 'react';
import * as Keychain from 'react-native-keychain';
import { logger } from '@core/logger';

const BIOMETRIC_PROMPT_KEY = 'com.pulseboard.biometric_gate';

export function useBiometricGate() {
  const [isPromptVisible, setIsPromptVisible] = useState(false);

  const triggerBiometric = useCallback(async (): Promise<boolean> => {
    setIsPromptVisible(true);

    try {
      const bioType = await Keychain.getSupportedBiometryType();

      if (!bioType) {
        logger.warn('No biometry supported, bypassing gate');
        setIsPromptVisible(false);
        return true;
      }

      await Keychain.setInternetCredentials(
        BIOMETRIC_PROMPT_KEY,
        'pulseboard_user',
        'biometric_auth_check',
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        },
      );

      setIsPromptVisible(false);
      return true;
    } catch (error) {
      logger.warn('Biometric gate failed or cancelled', {
        error: String(error),
      });
      setIsPromptVisible(false);
      return false;
    } finally {
      try {
        await Keychain.resetInternetCredentials({
          server: BIOMETRIC_PROMPT_KEY,
        });
      } catch {}
    }
  }, []);

  return {
    triggerBiometric,
    isPromptVisible,
  };
}

import { device } from 'detox';

export class NetworkSimulator {
  static async goOffline() {
    await device.setURLBlacklist(['.*']);
    console.log('Network: OFFLINE');
  }

  static async goOnline() {
    await device.setURLBlacklist([]);
    console.log('Network: ONLINE');
  }
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const retry = async (
  fn: () => Promise<void>,
  maxAttempts = 3,
  delay = 1000,
) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fn();
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await sleep(delay);
    }
  }
};

const CERTIFICATE_HASHES = ['AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='];

export interface PinningConfig {
  sslPinning: {
    certs: string[];
  };
  pkPinning: boolean;
}

export const getPinningConfig = (): PinningConfig => {
  return {
    sslPinning: {
      certs: CERTIFICATE_HASHES,
    },
    pkPinning: true,
  };
};

export const ALLOWED_DOMAINS = ['localhost'];

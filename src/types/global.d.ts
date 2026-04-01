/// <reference types="@types/jest" />

// Global type declarations for PulseBoard

declare global {
  const __DEV__: boolean;
  var __DEV__: boolean;

  var global: {
    __DEV__: boolean;
  };

  namespace NodeJS {
    interface Global {
      __DEV__: boolean;
    }
  }
}

declare global {
  interface GlobalThis {
    __DEV__: boolean;
  }
}

export {};

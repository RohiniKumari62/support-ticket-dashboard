export interface ChaosOptions {
  enabled: boolean;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface Chaos {
  delay: () => Promise<void>;
  shouldFail: () => boolean;
  shouldForceClaimConflict: () => boolean;
}

export function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createChaos(options: ChaosOptions): Chaos {
  const { enabled, random = Math.random, sleep = defaultSleep } = options;

  return {
    async delay(): Promise<void> {
      if (!enabled) return;
      const ms = Math.floor(300 + random() * 1200); // 300–1500 ms
      await sleep(ms);
    },

    shouldFail(): boolean {
      if (!enabled) return false;
      return random() < 0.1; // 10% failure rate
    },

    shouldForceClaimConflict(): boolean {
      if (!enabled) return false;
      return random() < 0.25; // 25% forced claim conflict
    },
  };
}

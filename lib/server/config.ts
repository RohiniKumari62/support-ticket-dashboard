export interface ServerConfig {
  chaos: boolean;
  triageApiKey: string;
}

/**
 * Reads server environment configuration dynamically at request time.
 * Tests and route handlers can adjust process.env per execution.
 */
export function getServerConfig(): ServerConfig {
  const chaosEnv = process.env.FAKE_API_CHAOS;
  const chaos = chaosEnv !== "off"; // default "on"
  const triageApiKey = process.env.TRIAGE_API_KEY || "";

  return {
    chaos,
    triageApiKey,
  };
}

import { loadEnv, type Env } from './env';

let current: Env | undefined;

/** Process-wide validated config. `createApp(env)` installs it; tests can pass their own. */
export const config = (): Env => (current ??= loadEnv());
export const useConfig = (env: Env): void => {
  current = env;
};

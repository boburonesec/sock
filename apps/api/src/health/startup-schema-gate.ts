import {
  describeSchemaIncompatibility,
  type SchemaCompatibility,
} from './schema-compatibility';

export class StartupSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StartupSchemaError';
  }
}

export interface StartupSchemaGateOptions {
  nodeEnv: string;
  check: () => Promise<SchemaCompatibility>;
  warn: (message: string) => void;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Runs before `app.listen`. A production process must never start serving on
 * a schema its release migration did not produce, so any incompatibility —
 * including "could not verify" (database unreachable, check timed out) —
 * throws to the bootstrap boundary. Outside production the same finding is a
 * single warning, so a developer with pending migrations can still boot;
 * readiness keeps reporting 503 in every environment.
 */
export async function assertSchemaReadyForStartup(options: StartupSchemaGateOptions): Promise<void> {
  const result = await withTimeout(options.check(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  if (result.ok) {
    return;
  }

  const message = describeSchemaIncompatibility(result);

  if (options.nodeEnv === 'production') {
    throw new StartupSchemaError(`Refusing to start: ${message}`);
  }

  options.warn(`${message} Continuing because NODE_ENV=${options.nodeEnv || 'development'}; a production API refuses to start in this state.`);
}

async function withTimeout(check: Promise<SchemaCompatibility>, timeoutMs: number): Promise<SchemaCompatibility> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<SchemaCompatibility>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, reason: 'database-unreachable', names: [] }), timeoutMs);
  });

  try {
    return await Promise.race([check, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

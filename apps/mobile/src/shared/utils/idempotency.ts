/**
 * Idempotency for writes the API de-duplicates by key (machine output intake).
 *
 * On factory Wi-Fi a request can reach the server and still time out on the
 * phone. If the operator then taps again, the same key must be sent so the
 * API returns the first result instead of recording the output twice. A new
 * key is only minted when what is being submitted actually changes.
 */

export function createIdempotencyKey(
  now: () => number = Date.now,
  random: () => number = Math.random,
): string {
  // Fixed-width segments: the API rejects keys shorter than 8 characters.
  const entropy = Array.from({ length: 3 }, () =>
    Math.floor(random() * 0xffffffff)
      .toString(36)
      .padStart(7, "0"),
  ).join("");
  return `m-${now().toString(36)}-${entropy}`;
}

export interface AttemptKey {
  /** What is being submitted, e.g. `${runId}:${quantity}`. */
  signature: string;
  key: string;
}

/** Reuses the previous key while the same submission is being retried. */
export function resolveAttemptKey(
  previous: AttemptKey | null,
  signature: string,
  generate: () => string = createIdempotencyKey,
): AttemptKey {
  if (previous && previous.signature === signature) {
    return previous;
  }

  return { signature, key: generate() };
}

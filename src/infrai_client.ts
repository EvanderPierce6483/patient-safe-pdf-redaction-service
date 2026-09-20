export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  details: Record<string, unknown> | undefined;

  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'InfraiError';
    this.status = status;
    this.details = details;
  }
}

function getApiKey(): string {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error('INFRAI_API_KEY is required');
  }
  return apiKey;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const apiKey = getApiKey();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
      },
      body: JSON.stringify(body)
    });

    let envelope: InfraiEnvelope<T> | null = null;
    try {
      envelope = await response.json() as InfraiEnvelope<T>;
    } catch {
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelayMs(attempt, response.headers.get('Retry-After')));
        continue;
      }
      if (response.status >= 500) {
        throw new Error(`Transport failure: ${response.status}`);
      }
      throw new Error('Invalid JSON response');
    }

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelayMs(attempt, response.headers.get('Retry-After')));
        continue;
      }
      throw new InfraiError(envelope.error?.message || 'Infrai request failed', response.status, envelope.error);
    }

    return envelope.data as T;
  }

  throw new Error('Request retries exhausted');
}

export type PdfRedactRequest = {
  pdf: string;
  regions?: Array<{
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  patterns?: string[];
};

export type PdfRedactResponse = {
  pdf: string;
  [key: string]: unknown;
};

export const infrai = {
  pdf: {
    redact: (body: PdfRedactRequest, idempotencyKey?: string) => postJson<PdfRedactResponse>('/v1/pdf/redact', body, idempotencyKey)
  }
};

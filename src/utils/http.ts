export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(
      payload?.statusMessage ?? payload?.message ?? response.statusText ?? 'Request failed.',
      response.status
    );
  }

  return payload as T;
}

export function toMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error.';
}

const DEFAULT_TIMEOUT_MS = 12000

/**
 * fetch() with a hard timeout. Verified live: some Rijkswaterstaat ArcGIS
 * queries can hang indefinitely (no response, no error) instead of failing
 * fast for certain layer/id combinations. A single such request would
 * otherwise stall a Promise.allSettled fan-out (e.g. the 26 WKD layers)
 * forever, since allSettled only resolves once every promise has settled.
 */
export async function fetchWithTimeout(
  url: string,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  signal?.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Pagination helpers for Kratos Admin API list endpoints
 *
 * Kratos uses keyset pagination and returns the next cursor in the `Link`
 * response header (`<...?page_token=XYZ>; rel="next"`).
 * @module kratos/pagination
 */

/**
 * Extract the `page_token` of the `rel="next"` link from a Kratos `Link` header
 */
export function extractPageToken(linkHeader: unknown): string | undefined {
  if (typeof linkHeader !== "string") return undefined;
  const nextMatch = linkHeader.match(/<[^>]*[?&]page_token=([^&>]+)[^>]*>;\s*rel="next"/);
  return nextMatch?.[1] ? decodeURIComponent(nextMatch[1]) : undefined;
}

/** Minimal shape of an Axios response as returned by @ory/kratos-client */
export interface PagedResponse<T> {
  data: T[];
  headers?: Record<string, unknown>;
}

/** Extract the next page token from an SDK response (Axios lower-cases header names) */
export function nextPageTokenOf(response: { headers?: unknown }): string | undefined {
  const headers = response.headers as Record<string, unknown> | undefined;
  return extractPageToken(headers?.link ?? headers?.Link);
}

export interface ScanResult<T> {
  items: T[];
  /** Number of pages fetched */
  pagesScanned: number;
  /** True when the page cap was reached before the end of the collection */
  truncated: boolean;
  /** Cursor to resume from when truncated */
  nextPageToken?: string;
}

/**
 * Walk a paginated Kratos endpoint until exhausted or `maxPages` is reached.
 * `fetchPage` receives the page token for the page to fetch (undefined = first).
 */
export async function scanPages<T>(
  fetchPage: (pageToken: string | undefined) => Promise<PagedResponse<T>>,
  opts: { maxPages: number; startToken?: string },
): Promise<ScanResult<T>> {
  const items: T[] = [];
  let pageToken = opts.startToken;
  let pagesScanned = 0;

  while (pagesScanned < opts.maxPages) {
    const response = await fetchPage(pageToken);
    pagesScanned++;
    items.push(...response.data);
    pageToken = nextPageTokenOf(response);
    if (!pageToken || response.data.length === 0) {
      return { items, pagesScanned, truncated: false };
    }
  }

  return { items, pagesScanned, truncated: true, nextPageToken: pageToken };
}

/**
 * Check whether an ISO timestamp falls within an optional [after, before] range
 */
export function inTimeRange(
  timestamp: string | undefined,
  after?: string,
  before?: string,
): boolean {
  if (!timestamp) return true;
  const date = new Date(timestamp);
  if (after && date < new Date(after)) return false;
  if (before && date > new Date(before)) return false;
  return true;
}

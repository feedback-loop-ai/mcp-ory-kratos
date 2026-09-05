/**
 * Unit tests for Kratos pagination helpers
 */

import { describe, expect, it, vi } from "vitest";
import {
  extractPageToken,
  inTimeRange,
  nextPageTokenOf,
  scanPages,
} from "../../src/kratos/pagination";

describe("extractPageToken", () => {
  it("returns the page_token of the rel=next link", () => {
    const header =
      '<http://k/admin/identities?page_size=10&page_token=abc123>; rel="next",<http://k/admin/identities?page_token=first>; rel="first"';
    expect(extractPageToken(header)).toBe("abc123");
  });

  it("returns undefined when there is no rel=next link", () => {
    expect(
      extractPageToken('<http://k/admin/identities?page_token=first&page_size=10>; rel="first"'),
    ).toBeUndefined();
  });

  it("URL-decodes the token", () => {
    expect(
      extractPageToken('<http://k/admin/identities?page_token=a%3Db%2Fc&page_size=10>; rel="next"'),
    ).toBe("a=b/c");
  });

  it("returns undefined for non-string input", () => {
    expect(extractPageToken(undefined)).toBeUndefined();
    expect(extractPageToken(42)).toBeUndefined();
    expect(extractPageToken(["x"])).toBeUndefined();
  });
});

describe("nextPageTokenOf", () => {
  const link = '<http://k/x?page_token=tok&page_size=1>; rel="next"';

  it("reads the lower-case link header", () => {
    expect(nextPageTokenOf({ headers: { link } })).toBe("tok");
  });

  it("reads the capitalised Link header", () => {
    expect(nextPageTokenOf({ headers: { Link: link } })).toBe("tok");
  });

  it("returns undefined without headers", () => {
    expect(nextPageTokenOf({})).toBeUndefined();
    expect(nextPageTokenOf({ headers: {} })).toBeUndefined();
  });
});

describe("scanPages", () => {
  const linkTo = (token: string) => ({ link: `<http://k/x?page_token=${token}>; rel="next"` });

  function threePageFetcher() {
    const pages: Record<string, { data: number[]; headers: Record<string, string> }> = {
      first: { data: [1, 2], headers: linkTo("p2") },
      p2: { data: [3], headers: linkTo("p3") },
      p3: { data: [4], headers: {} },
    };
    return vi.fn(async (token: string | undefined) => {
      const found = pages[token ?? "first"];
      if (!found) throw new Error(`unexpected page token ${token}`);
      return found;
    });
  }

  it("walks to the end of the collection", async () => {
    const fetchPage = threePageFetcher();
    const result = await scanPages(fetchPage, { maxPages: 10 });
    expect(result).toEqual({ items: [1, 2, 3, 4], pagesScanned: 3, truncated: false });
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([undefined, "p2", "p3"]);
  });

  it("stops at maxPages and reports the resume token", async () => {
    const fetchPage = threePageFetcher();
    const result = await scanPages(fetchPage, { maxPages: 2 });
    expect(result).toEqual({
      items: [1, 2, 3],
      pagesScanned: 2,
      truncated: true,
      nextPageToken: "p3",
    });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("starts from startToken", async () => {
    const fetchPage = threePageFetcher();
    const result = await scanPages(fetchPage, { maxPages: 10, startToken: "p2" });
    expect(result).toEqual({ items: [3, 4], pagesScanned: 2, truncated: false });
    expect(fetchPage.mock.calls[0]?.[0]).toBe("p2");
  });

  it("stops on an empty page even if a next link is present", async () => {
    const fetchPage = vi.fn(async () => ({ data: [] as number[], headers: linkTo("loop") }));
    const result = await scanPages(fetchPage, { maxPages: 5 });
    expect(result).toEqual({ items: [], pagesScanned: 1, truncated: false });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe("inTimeRange", () => {
  const ts = "2026-03-01T12:00:00Z";

  it("accepts a missing timestamp", () => {
    expect(inTimeRange(undefined, "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z")).toBe(true);
  });

  it("accepts when no bounds are given", () => {
    expect(inTimeRange(ts)).toBe(true);
  });

  it("checks the lower bound", () => {
    expect(inTimeRange(ts, "2026-03-02T00:00:00Z")).toBe(false);
    expect(inTimeRange(ts, "2026-03-01T00:00:00Z")).toBe(true);
  });

  it("checks the upper bound", () => {
    expect(inTimeRange(ts, undefined, "2026-02-28T00:00:00Z")).toBe(false);
    expect(inTimeRange(ts, undefined, "2026-03-02T00:00:00Z")).toBe(true);
  });

  it("treats the bounds as inclusive", () => {
    expect(inTimeRange(ts, ts, ts)).toBe(true);
  });
});

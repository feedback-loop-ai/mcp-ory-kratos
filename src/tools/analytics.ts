/**
 * Analytics tools for Kratos MCP Server
 *
 * Implements session and credential analytics for business analysts
 * @module tools/analytics
 */

import { inTimeRange, type ScanResult, scanPages } from "../kratos/pagination.js";
import { CREDENTIAL_TYPES } from "../kratos/types.js";
import {
  type CredentialAnalyticsInput,
  CredentialAnalyticsInputSchema,
  type CredentialAnalyticsOutput,
  CredentialAnalyticsOutputSchema,
  type SessionAnalyticsInput,
  SessionAnalyticsInputSchema,
  type SessionAnalyticsOutput,
  SessionAnalyticsOutputSchema,
} from "../schemas/tools.js";
import { defineTool, READ_ONLY, type ToolContext } from "./define.js";

/** Scan bookkeeping fields shared by every analytics output */
type ScanSummary = Pick<ScanResult<unknown>, "pagesScanned" | "truncated" | "nextPageToken">;

/** Aggregate portion of the session analytics output (without scan summary) */
export type SessionAggregate = Omit<SessionAnalyticsOutput, keyof ScanSummary>;

/** Aggregate portion of the credential analytics output (without scan summary) */
export type CredentialAggregate = Omit<CredentialAnalyticsOutput, keyof ScanSummary>;

/**
 * Parse user agent string to extract device type and browser
 */
export function parseUserAgent(userAgent: string): { deviceType: string; browser: string } {
  const ua = userAgent.toLowerCase();

  // Determine device type
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = "tablet";
  } else if (/bot|crawler|spider|scraper/i.test(ua)) {
    deviceType = "bot";
  }

  // Determine browser
  let browser = "unknown";
  if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("chrome") && !ua.includes("edg/")) {
    browser = "Chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
  } else if (ua.includes("opera") || ua.includes("opr/")) {
    browser = "Opera";
  } else if (ua.includes("msie") || ua.includes("trident/")) {
    browser = "Internet Explorer";
  }

  return { deviceType, browser };
}

/**
 * Increment count in a record
 */
function incrementCount(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

/**
 * Aggregate authentication methods from session
 */
function aggregateAuthMethods(
  methods: Array<{ method?: string }> | undefined,
  target: Record<string, number>,
): void {
  if (!methods) return;
  for (const method of methods) {
    if (method.method) {
      incrementCount(target, method.method);
    }
  }
}

/**
 * Update assurance level counts
 */
function updateAssuranceLevel(
  aal: string | undefined,
  target: { aal1: number; aal2: number },
): void {
  if (aal === "aal1") {
    target.aal1++;
  } else if (aal === "aal2" || aal === "aal3") {
    target.aal2++;
  }
}

/**
 * Aggregate device information from session
 */
function aggregateDeviceInfo(
  devices: Array<{ user_agent?: string }> | undefined,
  byDeviceType: Record<string, number>,
  byBrowser: Record<string, number>,
): void {
  if (!devices) return;
  for (const device of devices) {
    if (device.user_agent) {
      const { deviceType, browser } = parseUserAgent(device.user_agent);
      incrementCount(byDeviceType, deviceType);
      incrementCount(byBrowser, browser);
    }
  }
}

/**
 * Process a single session for analytics aggregation
 */
function processSessionForAnalytics(
  session: {
    active?: boolean;
    authentication_methods?: Array<{ method?: string }>;
    authenticator_assurance_level?: string;
    devices?: Array<{ user_agent?: string }>;
  },
  analytics: SessionAggregate,
  includeAuthMethods: boolean,
  includeDevices: boolean,
): void {
  analytics.totalSessions++;

  if (session.active) {
    analytics.activeSessions++;
  } else {
    analytics.inactiveSessions++;
  }

  if (includeAuthMethods) {
    aggregateAuthMethods(session.authentication_methods, analytics.byAuthenticationMethod);
  }

  updateAssuranceLevel(session.authenticator_assurance_level, analytics.byAssuranceLevel);

  if (includeDevices) {
    aggregateDeviceInfo(session.devices, analytics.byDeviceType, analytics.byBrowser);
  }
}

/**
 * Credential types counted as a second factor (MFA).
 *
 * Deliberately excludes `passkey` (a first-factor passwordless method, tracked
 * separately as passwordless adoption) and `code` (may act as first or second
 * factor; the stored credential alone cannot tell which, so it is reported only
 * in credentialDistribution).
 */
const MFA_CREDENTIAL_TYPES: readonly string[] = ["totp", "webauthn", "lookup_secret"];

/** Credential types counted as passwordless first factors */
const PASSWORDLESS_CREDENTIAL_TYPES: readonly string[] = ["passkey"];

/**
 * Record an identity against an adoption bucket (enabled/disabled), if the
 * bucket is present. A missing bucket means the metric is disabled by input.
 */
function recordAdoption(
  bucket: { enabled: number; disabled: number } | undefined,
  present: boolean,
): void {
  if (!bucket) return;
  if (present) {
    bucket.enabled++;
  } else {
    bucket.disabled++;
  }
}

/**
 * Process identity for credential analytics
 *
 * Exported for unit testing (pure aggregation logic).
 */
export function processIdentityForCredentialAnalytics(
  identity: { credentials?: Record<string, unknown> },
  analytics: CredentialAggregate,
): void {
  analytics.totalIdentities++;

  const credentialTypes = Object.keys(identity.credentials ?? {});
  for (const credType of credentialTypes) {
    incrementCount(analytics.credentialDistribution, credType);
  }

  const hasMfa = credentialTypes.some((type) => MFA_CREDENTIAL_TYPES.includes(type));
  const hasPasswordless = credentialTypes.some((type) =>
    PASSWORDLESS_CREDENTIAL_TYPES.includes(type),
  );

  recordAdoption(analytics.mfaAdoption, hasMfa);
  recordAdoption(analytics.passwordlessAdoption, hasPasswordless);
}

/** Copy the scan bookkeeping fields off a scan result */
function scanSummaryOf(scan: ScanResult<unknown>): ScanSummary {
  return {
    pagesScanned: scan.pagesScanned,
    truncated: scan.truncated,
    ...(scan.nextPageToken ? { nextPageToken: scan.nextPageToken } : {}),
  };
}

/**
 * Fetch and aggregate session analytics
 */
async function fetchSessionAnalytics(
  ctx: ToolContext,
  args: SessionAnalyticsInput,
): Promise<SessionAnalyticsOutput> {
  const analytics: SessionAggregate = {
    totalSessions: 0,
    activeSessions: 0,
    inactiveSessions: 0,
    byAuthenticationMethod: {},
    byAssuranceLevel: { aal1: 0, aal2: 0 },
    byDeviceType: {},
    byBrowser: {},
    timeRange: { from: args.from, to: args.to },
  };
  const includeAuthMethods = args.includeAuthMethods !== false;
  const includeDevices = args.includeDevices !== false;

  const scan = await scanPages(
    (pageToken) =>
      ctx.clients.identity.listSessions({
        pageSize: 250,
        pageToken,
        expand: includeDevices ? ["devices"] : undefined,
      }),
    { maxPages: args.maxPages ?? ctx.config.maxScanPages, startToken: args.pageToken },
  );

  for (const session of scan.items) {
    if (!inTimeRange(session.authenticated_at, args.from, args.to)) {
      continue;
    }
    processSessionForAnalytics(session, analytics, includeAuthMethods, includeDevices);
  }

  return { ...analytics, ...scanSummaryOf(scan) };
}

/**
 * Fetch and aggregate credential analytics
 */
async function fetchCredentialAnalytics(
  ctx: ToolContext,
  args: CredentialAnalyticsInput,
): Promise<CredentialAnalyticsOutput> {
  const includeAdoption = args.includeMfa !== false;
  const analytics: CredentialAggregate = {
    totalIdentities: 0,
    credentialDistribution: {},
    mfaAdoption: includeAdoption ? { enabled: 0, disabled: 0 } : undefined,
    passwordlessAdoption: includeAdoption ? { enabled: 0, disabled: 0 } : undefined,
  };

  const scan = await scanPages(
    (pageToken) =>
      ctx.clients.identity.listIdentities({
        pageSize: 250,
        pageToken,
        includeCredential: [...CREDENTIAL_TYPES],
      }),
    { maxPages: args.maxPages ?? ctx.config.maxScanPages, startToken: args.pageToken },
  );

  for (const identity of scan.items) {
    processIdentityForCredentialAnalytics(identity, analytics);
  }

  return { ...analytics, ...scanSummaryOf(scan) };
}

/**
 * Register analytics tools (session analytics, credential analytics)
 */
export function registerAnalyticsTools(ctx: ToolContext): void {
  defineTool(ctx, {
    name: "kratos_session_analytics",
    title: "Session analytics",
    description:
      'Get aggregated session statistics including authentication methods, device types, and browser distribution. Useful for understanding user login patterns. Scans up to maxPages pages of 250 sessions (default from KRATOS_MAX_SCAN_PAGES); check `truncated` in the result and raise maxPages or pass its nextPageToken as pageToken to continue. Example: {"from": "2026-09-01T00:00:00Z", "includeDevices": false}.',
    toolset: "analytics",
    inputSchema: SessionAnalyticsInputSchema,
    outputSchema: SessionAnalyticsOutputSchema,
    annotations: READ_ONLY,
    run: (args) => fetchSessionAnalytics(ctx, args),
  });

  defineTool(ctx, {
    name: "kratos_credential_analytics",
    title: "Credential analytics",
    description:
      'Get authentication method adoption statistics showing which credential types (password, OIDC, TOTP, WebAuthn, passkey, code) are most used, plus MFA adoption (totp/webauthn/lookup_secret) and passwordless adoption (passkey) rates. Code credentials appear only in the distribution because they may be a first or second factor. Scans up to maxPages pages of 250 identities (default from KRATOS_MAX_SCAN_PAGES); check `truncated` in the result and raise maxPages or pass its nextPageToken as pageToken to continue. Example: {"includeMfa": true, "maxPages": 50}.',
    toolset: "analytics",
    inputSchema: CredentialAnalyticsInputSchema,
    outputSchema: CredentialAnalyticsOutputSchema,
    annotations: READ_ONLY,
    run: (args) => fetchCredentialAnalytics(ctx, args),
  });
}

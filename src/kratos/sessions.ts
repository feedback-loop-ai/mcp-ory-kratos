/**
 * Session helpers shared by identity and session tools
 * @module kratos/sessions
 */

import type { IdentityApi } from "@ory/kratos-client";

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

/**
 * Delete every session of an identity, treating "no sessions to delete" as
 * success. Kratos v1.x answers 404 and v26.x answers 400 in that case; both
 * mean the desired end state (zero sessions) already holds.
 * Returns true when sessions were deleted, false when there were none.
 */
export async function revokeAllSessions(identity: IdentityApi, id: string): Promise<boolean> {
  try {
    await identity.deleteIdentitySessions({ id });
    return true;
  } catch (error) {
    const status = statusOf(error);
    if (status === 404 || status === 400) return false;
    throw error;
  }
}

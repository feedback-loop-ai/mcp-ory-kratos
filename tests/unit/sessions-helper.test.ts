/**
 * revokeAllSessions: Kratos answers 404 (v1.x) or 400 (v26.x) when an identity
 * has no sessions; both mean "already at the desired state".
 */

import type { IdentityApi } from "@ory/kratos-client";
import { describe, expect, it, vi } from "vitest";
import { revokeAllSessions } from "../../src/kratos/sessions";
import { httpError } from "./harness";

const ID = "9f8d7c6b-5a49-4838-9271-605948372615";

function api(impl: () => Promise<unknown>): IdentityApi {
  return { deleteIdentitySessions: vi.fn(impl) } as unknown as IdentityApi;
}

describe("revokeAllSessions", () => {
  it("returns true when sessions were deleted", async () => {
    await expect(
      revokeAllSessions(
        api(async () => ({ data: undefined })),
        ID,
      ),
    ).resolves.toBe(true);
  });

  it.each([404, 400])("returns false on %d (no sessions to delete)", async (status) => {
    const client = api(async () => {
      throw httpError(status, "none");
    });
    await expect(revokeAllSessions(client, ID)).resolves.toBe(false);
  });

  it("rethrows other failures", async () => {
    const client = api(async () => {
      throw httpError(503, "down");
    });
    await expect(revokeAllSessions(client, ID)).rejects.toMatchObject({
      response: { status: 503 },
    });
  });
});

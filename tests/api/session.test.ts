/**
 * Session API Tests
 *
 * Verifies all session operations work correctly against configured Kratos instance.
 * User Story 3: Run Session Management Tests (Priority: P1)
 *
 * Note: Session tests are limited because creating sessions requires actual
 * authentication flows (login). These tests verify the API endpoints work
 * correctly with existing sessions or handle empty results gracefully.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Identity, Session } from "@ory/kratos-client";
import { getTestContext, type TestContext } from "../setup/context";
import { createTestIdentityInput } from "../setup/fixtures";

describe("Session API", () => {
  let ctx: TestContext;
  let testIdentity: Identity;
  let schema: object;
  let schemaId: string;

  beforeAll(async () => {
    ctx = getTestContext();
    schemaId = ctx.getDefaultSchemaId();
    schema = ctx.getSchema(schemaId);

    // Create a test identity for session-related operations
    const input = createTestIdentityInput(schema, schemaId);
    const response = await ctx.clients.identity.createIdentity({
      createIdentityBody: {
        schema_id: input.schemaId,
        traits: input.traits,
        state: input.state,
      },
    });
    testIdentity = response.data;
    ctx.trackIdentity(testIdentity.id);
  });

  afterAll(async () => {
    const result = await ctx.cleanup();
    if (!result.success) {
      console.warn(
        `Cleanup had failures. Failed to delete: ${result.failedDeletions.join(", ")}`
      );
    }
    console.log(`Cleaned up ${result.identitiesDeleted} test identities`);
  });

  describe("List All Sessions", () => {
    it("should return session data (may be empty)", async () => {
      const response = await ctx.clients.identity.listSessions({
        pageSize: 10,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      // If there are sessions, verify structure
      if (response.data.length > 0) {
        const session = response.data[0];
        expect(session).toHaveProperty("id");
        expect(session).toHaveProperty("active");
        expect(session).toHaveProperty("expires_at");
        expect(session).toHaveProperty("authenticated_at");
      }
    });

    it("should respect page size limit", async () => {
      const response = await ctx.clients.identity.listSessions({
        pageSize: 1,
      });

      expect(response.status).toBe(200);
      expect(response.data.length).toBeLessThanOrEqual(1);
    });

    it("should filter by active status", async () => {
      const response = await ctx.clients.identity.listSessions({
        active: true,
        pageSize: 10,
      });

      expect(response.status).toBe(200);
      // All returned sessions should be active
      for (const session of response.data) {
        expect(session.active).toBe(true);
      }
    });

    it("should expand identity when requested", async () => {
      const response = await ctx.clients.identity.listSessions({
        pageSize: 10,
        expand: ["identity"],
      });

      expect(response.status).toBe(200);

      // If there are sessions with expanded identity, verify structure
      if (response.data.length > 0 && response.data[0].identity) {
        const session = response.data[0];
        expect(session.identity).toHaveProperty("id");
        expect(session.identity).toHaveProperty("traits");
      }
    });
  });

  describe("Get Session by ID", () => {
    it("should return 404 for non-existent session", async () => {
      const fakeSessionId = "00000000-0000-0000-0000-000000000000";

      await expect(
        ctx.clients.identity.getSession({ id: fakeSessionId })
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it("should return complete details for existing session", async () => {
      // First, get a list of sessions
      const listResponse = await ctx.clients.identity.listSessions({
        pageSize: 1,
      });

      if (listResponse.data.length === 0) {
        // Skip if no sessions exist - this is expected in test environments
        console.log("Skipping: No existing sessions to test");
        return;
      }

      const sessionId = listResponse.data[0].id;
      const response = await ctx.clients.identity.getSession({
        id: sessionId,
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(sessionId);
      expect(response.data).toHaveProperty("active");
      expect(response.data).toHaveProperty("expires_at");
      expect(response.data).toHaveProperty("authenticated_at");
    });

    it("should expand identity and devices when requested", async () => {
      const listResponse = await ctx.clients.identity.listSessions({
        pageSize: 1,
      });

      if (listResponse.data.length === 0) {
        console.log("Skipping: No existing sessions to test");
        return;
      }

      const sessionId = listResponse.data[0].id;
      const response = await ctx.clients.identity.getSession({
        id: sessionId,
        expand: ["identity", "devices"],
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(sessionId);
    });
  });

  describe("List Sessions by Identity", () => {
    it("should return filtered results for identity", async () => {
      const response = await ctx.clients.identity.listIdentitySessions({
        id: testIdentity.id,
        pageSize: 10,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      // All returned sessions should belong to the test identity
      // (may be empty if identity has no sessions)
    });

    it("should return empty list for non-existent identity", async () => {
      const fakeIdentityId = "00000000-0000-0000-0000-000000000000";

      // Kratos returns 200 with empty list for non-existent identity
      const response = await ctx.clients.identity.listIdentitySessions({
        id: fakeIdentityId,
        pageSize: 10,
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual([]);
    });

    it("should filter by active status", async () => {
      const response = await ctx.clients.identity.listIdentitySessions({
        id: testIdentity.id,
        active: true,
        pageSize: 10,
      });

      expect(response.status).toBe(200);
      // All returned sessions should be active
      for (const session of response.data) {
        expect(session.active).toBe(true);
      }
    });
  });

  describe("Extend Session", () => {
    it("should return 404 for non-existent session", async () => {
      const fakeSessionId = "00000000-0000-0000-0000-000000000000";

      await expect(
        ctx.clients.identity.extendSession({ id: fakeSessionId })
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it("should successfully extend existing session expiry", async () => {
      // Get an existing session
      const listResponse = await ctx.clients.identity.listSessions({
        active: true,
        pageSize: 1,
      });

      if (listResponse.data.length === 0) {
        console.log("Skipping: No active sessions to extend");
        return;
      }

      const session = listResponse.data[0];
      const originalExpiry = session.expires_at;

      const response = await ctx.clients.identity.extendSession({
        id: session.id,
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(session.id);

      // The new expiry should be later than or equal to the original
      const newExpiry = response.data.expires_at;
      if (originalExpiry && newExpiry) {
        expect(new Date(newExpiry).getTime()).toBeGreaterThanOrEqual(
          new Date(originalExpiry).getTime()
        );
      }
    });
  });

  describe("Disable Session", () => {
    it("should return 404 for non-existent session", async () => {
      const fakeSessionId = "00000000-0000-0000-0000-000000000000";

      await expect(
        ctx.clients.identity.disableSession({ id: fakeSessionId })
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it("should successfully invalidate existing session", async () => {
      // Get an existing active session
      const listResponse = await ctx.clients.identity.listSessions({
        active: true,
        pageSize: 1,
      });

      if (listResponse.data.length === 0) {
        console.log("Skipping: No active sessions to disable");
        return;
      }

      const sessionId = listResponse.data[0].id;

      const response = await ctx.clients.identity.disableSession({
        id: sessionId,
      });

      expect(response.status).toBe(204);

      // Verify the session is now inactive
      const getResponse = await ctx.clients.identity.getSession({
        id: sessionId,
      });
      expect(getResponse.data.active).toBe(false);
    });
  });

  describe("Delete All Sessions for Identity", () => {
    it("should return 404 for non-existent identity", async () => {
      const fakeIdentityId = "00000000-0000-0000-0000-000000000000";

      await expect(
        ctx.clients.identity.deleteIdentitySessions({ id: fakeIdentityId })
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it("should successfully clear all sessions for identity", async () => {
      // Use the test identity (which likely has no sessions)
      // Kratos returns 404 if no sessions exist, or 200/204 if sessions were deleted
      try {
        const response = await ctx.clients.identity.deleteIdentitySessions({
          id: testIdentity.id,
        });
        // Should return 204 (no content) or 200 if sessions existed
        expect([200, 204]).toContain(response.status);
      } catch (error) {
        // Kratos returns 404 when identity has no sessions - this is acceptable
        const status = (error as { response?: { status: number } })?.response
          ?.status;
        expect(status).toBe(404);
      }

      // Verify no sessions remain for this identity
      const listResponse = await ctx.clients.identity.listIdentitySessions({
        id: testIdentity.id,
        pageSize: 10,
      });

      expect(listResponse.data.length).toBe(0);
    });
  });
});

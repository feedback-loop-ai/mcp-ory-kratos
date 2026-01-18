/**
 * Recovery API Tests
 *
 * Verifies account recovery operations work correctly against configured Kratos instance.
 * User Story 4: Run Recovery Flow Tests (Priority: P2)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Identity } from "@ory/kratos-client";
import { getTestContext, type TestContext } from "../setup/context";
import { createTestIdentityInput } from "../setup/fixtures";

describe("Recovery API", () => {
  let ctx: TestContext;
  let testIdentity: Identity;
  let schema: object;
  let schemaId: string;

  beforeAll(async () => {
    ctx = getTestContext();
    schemaId = ctx.getDefaultSchemaId();
    schema = ctx.getSchema(schemaId);

    // Create a test identity for recovery operations
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

  describe("Create Recovery Link", () => {
    it("should generate valid link for existing identity", async () => {
      const response = await ctx.clients.identity.createRecoveryLinkForIdentity(
        {
          createRecoveryLinkForIdentityBody: {
            identity_id: testIdentity.id,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("recovery_link");
      expect(response.data.recovery_link).toContain("http");
      expect(response.data).toHaveProperty("expires_at");
    });

    it("should accept custom expiry duration", async () => {
      const response = await ctx.clients.identity.createRecoveryLinkForIdentity(
        {
          createRecoveryLinkForIdentityBody: {
            identity_id: testIdentity.id,
            expires_in: "1h",
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("recovery_link");
      expect(response.data).toHaveProperty("expires_at");

      // Verify the expiry is approximately 1 hour from now
      const expiresAt = new Date(response.data.expires_at!);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Should be close to 1 hour (within 5 minutes tolerance)
      expect(diffHours).toBeGreaterThan(0.9);
      expect(diffHours).toBeLessThan(1.1);
    });

    it("should return error for non-existent identity", async () => {
      const fakeIdentityId = "00000000-0000-0000-0000-000000000000";

      await expect(
        ctx.clients.identity.createRecoveryLinkForIdentity({
          createRecoveryLinkForIdentityBody: {
            identity_id: fakeIdentityId,
          },
        })
      ).rejects.toMatchObject({
        // Kratos returns 400 (bad request) for non-existent identity
        response: { status: 400 },
      });
    });

    it("should generate unique links for multiple requests", async () => {
      const response1 =
        await ctx.clients.identity.createRecoveryLinkForIdentity({
          createRecoveryLinkForIdentityBody: {
            identity_id: testIdentity.id,
          },
        });

      const response2 =
        await ctx.clients.identity.createRecoveryLinkForIdentity({
          createRecoveryLinkForIdentityBody: {
            identity_id: testIdentity.id,
          },
        });

      expect(response1.data.recovery_link).not.toBe(
        response2.data.recovery_link
      );
    });
  });

  describe("Create Recovery Code", () => {
    it("should generate valid code for existing identity", async () => {
      const response = await ctx.clients.identity.createRecoveryCodeForIdentity(
        {
          createRecoveryCodeForIdentityBody: {
            identity_id: testIdentity.id,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("recovery_code");
      expect(response.data.recovery_code).toBeDefined();
      expect(response.data.recovery_code!.length).toBeGreaterThan(0);
      expect(response.data).toHaveProperty("expires_at");
    });

    it("should accept custom expiry duration", async () => {
      const response = await ctx.clients.identity.createRecoveryCodeForIdentity(
        {
          createRecoveryCodeForIdentityBody: {
            identity_id: testIdentity.id,
            expires_in: "30m",
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("recovery_code");
      expect(response.data).toHaveProperty("expires_at");

      // Verify the expiry is approximately 30 minutes from now
      const expiresAt = new Date(response.data.expires_at!);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      // Should be close to 30 minutes (within 2 minutes tolerance)
      expect(diffMinutes).toBeGreaterThan(28);
      expect(diffMinutes).toBeLessThan(32);
    });

    it("should return 404 for non-existent identity", async () => {
      const fakeIdentityId = "00000000-0000-0000-0000-000000000000";

      await expect(
        ctx.clients.identity.createRecoveryCodeForIdentity({
          createRecoveryCodeForIdentityBody: {
            identity_id: fakeIdentityId,
          },
        })
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it("should generate unique codes for multiple requests", async () => {
      const response1 =
        await ctx.clients.identity.createRecoveryCodeForIdentity({
          createRecoveryCodeForIdentityBody: {
            identity_id: testIdentity.id,
          },
        });

      const response2 =
        await ctx.clients.identity.createRecoveryCodeForIdentity({
          createRecoveryCodeForIdentityBody: {
            identity_id: testIdentity.id,
          },
        });

      expect(response1.data.recovery_code).not.toBe(
        response2.data.recovery_code
      );
    });
  });
});

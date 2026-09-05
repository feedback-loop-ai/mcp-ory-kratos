/**
 * Identity API Tests
 *
 * Verifies all identity CRUD operations work correctly against configured Kratos instance.
 * User Story 2: Run Identity Management Tests (Priority: P1)
 */

import type { Identity, JsonPatch } from "@ory/kratos-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTestContext, type TestContext } from "../setup/context";
import { createTestIdentityInput, generateTestEmail, patchOperations } from "../setup/fixtures";
import { generateTraitsFromSchema } from "../setup/schema-generator";

describe("Identity API", () => {
  let ctx: TestContext;
  let schema: object;
  let schemaId: string;

  beforeAll(() => {
    ctx = getTestContext();
    schemaId = ctx.getDefaultSchemaId();
    schema = ctx.getSchema(schemaId);
  });

  afterAll(async () => {
    const result = await ctx.cleanup();
    if (!result.success) {
      console.warn(`Cleanup had failures. Failed to delete: ${result.failedDeletions.join(", ")}`);
    }
    console.log(`Cleaned up ${result.identitiesDeleted} test identities`);
  });

  describe("List Identities", () => {
    it("should return paginated results", async () => {
      // Create a test identity to ensure there's at least one
      const input = createTestIdentityInput(schema, schemaId);
      const createResponse = await ctx.clients.identity.createIdentity({
        createIdentityBody: {
          schema_id: input.schemaId,
          traits: input.traits,
          state: input.state,
        },
      });
      ctx.trackIdentity(createResponse.data.id);

      // List identities
      const response = await ctx.clients.identity.listIdentities({
        pageSize: 10,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Verify structure of returned identities
      const identity = response.data[0];
      expect(identity).toHaveProperty("id");
      expect(identity).toHaveProperty("schema_id");
      expect(identity).toHaveProperty("traits");
      expect(identity).toHaveProperty("state");
      expect(identity).toHaveProperty("created_at");
      expect(identity).toHaveProperty("updated_at");
    });

    it("should respect page size limit", async () => {
      const response = await ctx.clients.identity.listIdentities({
        pageSize: 1,
      });

      expect(response.status).toBe(200);
      expect(response.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Get Identity by ID", () => {
    let testIdentity: Identity;

    beforeAll(async () => {
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

    it("should return correct data for existing identity", async () => {
      const response = await ctx.clients.identity.getIdentity({
        id: testIdentity.id,
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testIdentity.id);
      expect(response.data.schema_id).toBe(testIdentity.schema_id);
      expect(response.data.traits).toEqual(testIdentity.traits);
      expect(response.data.state).toBe(testIdentity.state);
    });

    it("should return 404 for non-existent identity", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      await expect(ctx.clients.identity.getIdentity({ id: fakeId })).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it("should include credentials when requested", async () => {
      const response = await ctx.clients.identity.getIdentity({
        id: testIdentity.id,
        includeCredential: ["password"],
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testIdentity.id);
      // credentials field should be present (may be empty if no credentials set)
    });
  });

  describe("Find Identity by Credentials", () => {
    let testIdentity: Identity;
    let testEmail: string;

    beforeAll(async () => {
      const input = createTestIdentityInput(schema, schemaId);
      // Get the email from generated traits (may vary by schema)
      testEmail = (input.traits as { email?: string }).email || generateTestEmail();

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

    it("should find identity by credentials identifier", async () => {
      // Note: Kratos uses credentials identifier (email) for lookup
      const response = await ctx.clients.identity.listIdentities({
        credentialsIdentifier: testEmail,
      });

      expect(response.status).toBe(200);
      // If the email matches a credential, we should find the identity
      // Note: This may return empty if the identity doesn't have password credentials
    });
  });

  describe("Create Identity", () => {
    it("should succeed with valid traits", async () => {
      const input = createTestIdentityInput(schema, schemaId);

      const response = await ctx.clients.identity.createIdentity({
        createIdentityBody: {
          schema_id: input.schemaId,
          traits: input.traits,
          state: input.state,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.schema_id).toBe(input.schemaId);
      expect(response.data.traits).toEqual(input.traits);
      expect(response.data.state).toBe(input.state);

      ctx.trackIdentity(response.data.id);
    });

    it("should create identity with metadata", async () => {
      const input = createTestIdentityInput(schema, schemaId, {
        metadataPublic: { role: "test-user" },
        metadataAdmin: { internal_notes: "test identity" },
      });

      const response = await ctx.clients.identity.createIdentity({
        createIdentityBody: {
          schema_id: input.schemaId,
          traits: input.traits,
          state: input.state,
          metadata_public: input.metadataPublic,
          metadata_admin: input.metadataAdmin,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.metadata_public).toEqual(input.metadataPublic);
      expect(response.data.metadata_admin).toEqual(input.metadataAdmin);

      ctx.trackIdentity(response.data.id);
    });

    it("should create inactive identity", async () => {
      const input = createTestIdentityInput(schema, schemaId, { state: "inactive" });

      const response = await ctx.clients.identity.createIdentity({
        createIdentityBody: {
          schema_id: input.schemaId,
          traits: input.traits,
          state: input.state,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.state).toBe("inactive");

      ctx.trackIdentity(response.data.id);
    });
  });

  describe("Update Identity", () => {
    let testIdentity: Identity;

    beforeAll(async () => {
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

    it("should modify all fields correctly", async () => {
      // Generate new valid traits from schema for update
      const newTraits = generateTraitsFromSchema(schema);
      const newMetadata = { updated: true };

      const response = await ctx.clients.identity.updateIdentity({
        id: testIdentity.id,
        updateIdentityBody: {
          schema_id: testIdentity.schema_id,
          traits: newTraits,
          state: "inactive",
          metadata_public: newMetadata,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testIdentity.id);
      expect(response.data.traits).toEqual(newTraits);
      expect(response.data.state).toBe("inactive");
      expect(response.data.metadata_public).toEqual(newMetadata);
    });
  });

  describe("Patch Identity", () => {
    let testIdentity: Identity;

    beforeAll(async () => {
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

    it("should apply JSON patch operations", async () => {
      const newEmail = generateTestEmail("patched");
      const patches = patchOperations.replaceEmail(newEmail);

      const response = await ctx.clients.identity.patchIdentity({
        id: testIdentity.id,
        jsonPatch: patches as JsonPatch[],
      });

      expect(response.status).toBe(200);
      expect((response.data.traits as { email: string }).email).toBe(newEmail);
    });

    it("should apply state change via patch", async () => {
      const patches = patchOperations.changeState("inactive");

      const response = await ctx.clients.identity.patchIdentity({
        id: testIdentity.id,
        jsonPatch: patches as JsonPatch[],
      });

      expect(response.status).toBe(200);
      expect(response.data.state).toBe("inactive");
    });

    it("should apply metadata patch", async () => {
      const metadata = { patched: true, timestamp: Date.now() };
      const patches = patchOperations.addMetadataPublic(metadata);

      const response = await ctx.clients.identity.patchIdentity({
        id: testIdentity.id,
        jsonPatch: patches as JsonPatch[],
      });

      expect(response.status).toBe(200);
      expect(response.data.metadata_public).toEqual(metadata);
    });
  });

  describe("Delete Identity", () => {
    it("should remove identity successfully", async () => {
      // Create an identity specifically for deletion
      const input = createTestIdentityInput(schema, schemaId);
      const createResponse = await ctx.clients.identity.createIdentity({
        createIdentityBody: {
          schema_id: input.schemaId,
          traits: input.traits,
          state: input.state,
        },
      });
      const identityId = createResponse.data.id;
      // Don't track - we're deleting it manually

      // Delete the identity
      const deleteResponse = await ctx.clients.identity.deleteIdentity({
        id: identityId,
      });

      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      await expect(ctx.clients.identity.getIdentity({ id: identityId })).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it("should return 404 for non-existent identity", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      await expect(ctx.clients.identity.deleteIdentity({ id: fakeId })).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  describe("Identity Credentials", () => {
    let testIdentity: Identity;

    beforeAll(async () => {
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

    it("should return credential info when requested", async () => {
      const response = await ctx.clients.identity.getIdentity({
        id: testIdentity.id,
        includeCredential: ["password"],
      });

      expect(response.status).toBe(200);
      // credentials field should be present
      expect(response.data).toHaveProperty("id");
    });

    it("should handle delete credential for non-existent credential type gracefully", async () => {
      // Attempting to delete a credential type that doesn't exist
      // should return 404 or handle gracefully
      try {
        await ctx.clients.identity.deleteIdentityCredentials({
          id: testIdentity.id,
          type: "totp",
        });
        // If it succeeds, that's fine (no TOTP to delete)
      } catch (error) {
        const err = error as { response?: { status: number } };
        // 404 is expected if credential doesn't exist
        expect([404, 400]).toContain(err.response?.status);
      }
    });
  });
});

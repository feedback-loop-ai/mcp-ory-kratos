/**
 * Unit tests for the identity toolset (list/get/create/update/patch/state/
 * credential deletion/schemas) driven through the in-memory MCP harness.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ALL_CREDENTIAL_TYPES } from "../../src/kratos/types.js";
import { type Harness, page, startHarness } from "./harness";

const ID = "9f8d7c6b-5a49-4838-9271-605948372615";
const ORG = "22222222-2222-2222-2222-222222222222";

const IDENTITY = {
  id: ID,
  schema_id: "default",
  traits: { email: "user@example.com" },
  state: "active",
};

const IDENTITY_WITH_CREDENTIALS = {
  ...IDENTITY,
  credentials: {
    password: {
      type: "password",
      identifiers: ["user@example.com"],
      config: { hashed_password: "$2a$secret" },
    },
    oidc: {
      type: "oidc",
      identifiers: ["google:123"],
      config: { providers: [{ provider: "google", subject: "123" }] },
    },
    code: { type: "code", identifiers: ["user@example.com"], config: { addresses: [] } },
  },
};

interface Credentials {
  credentials: Record<string, { config?: unknown; identifiers?: string[] }>;
}

describe("identity tools", () => {
  let h: Harness;

  beforeEach(async () => {
    h = await startHarness();
  });
  afterEach(async () => {
    await h?.close();
  });

  describe("kratos_list_identities", () => {
    it("passes filters through to the SDK", async () => {
      h.stubs.identity.listIdentities.mockResolvedValue(page([IDENTITY]));

      await h.callTool("kratos_list_identities", {
        ids: [ID],
        organizationId: ORG,
        credentialsIdentifier: "user@example.com",
        previewCredentialsIdentifierSimilar: "user@",
        includeCredential: ["password"],
        consistency: "eventual",
        pageSize: 10,
        pageToken: "abc",
      });

      expect(h.stubs.identity.listIdentities).toHaveBeenCalledWith({
        pageSize: 10,
        pageToken: "abc",
        ids: [ID],
        organizationId: ORG,
        credentialsIdentifier: "user@example.com",
        previewCredentialsIdentifierSimilar: "user@",
        includeCredential: ["password"],
        consistency: "eventual",
      });
    });

    it("returns items, count and nextPageToken parsed from the Link header", async () => {
      h.stubs.identity.listIdentities.mockResolvedValue(page([IDENTITY, IDENTITY], "tok-2"));

      const res = await h.callTool("kratos_list_identities", {});

      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.count).toBe(2);
      expect(res.structuredContent?.nextPageToken).toBe("tok-2");
      expect((res.structuredContent?.items as unknown[] | undefined)?.length).toBe(2);
    });

    it("omits nextPageToken on the last page", async () => {
      h.stubs.identity.listIdentities.mockResolvedValue(page([IDENTITY]));
      const res = await h.callTool("kratos_list_identities", {});
      expect(res.structuredContent?.nextPageToken).toBeUndefined();
    });

    it("redacts secret credential config by default", async () => {
      h.stubs.identity.listIdentities.mockResolvedValue(page([IDENTITY_WITH_CREDENTIALS]));

      const res = await h.callTool("kratos_list_identities", { includeCredential: ["password"] });
      const item = (res.structuredContent?.items as Credentials[] | undefined)?.[0];

      expect(item?.credentials.password?.config).toMatch(/redacted/);
      expect(item?.credentials.password?.identifiers).toEqual(["user@example.com"]);
      expect(item?.credentials.oidc?.config).toMatch(/redacted/);
      // non-sensitive types are untouched
      expect(item?.credentials.code?.config).toEqual({ addresses: [] });
    });

    it("keeps credential config when allowCredentialExposure is on", async () => {
      await h.close();
      h = await startHarness({ allowCredentialExposure: true });
      h.stubs.identity.listIdentities.mockResolvedValue(page([IDENTITY_WITH_CREDENTIALS]));

      const res = await h.callTool("kratos_list_identities", { includeCredential: ["password"] });
      const item = (res.structuredContent?.items as Credentials[] | undefined)?.[0];

      expect(item?.credentials.password?.config).toEqual({ hashed_password: "$2a$secret" });
    });
  });

  describe("kratos_get_identity", () => {
    it("passes includeCredential to the SDK", async () => {
      h.stubs.identity.getIdentity.mockResolvedValue({ data: IDENTITY });

      await h.callTool("kratos_get_identity", { id: ID, includeCredential: ["oidc"] });

      expect(h.stubs.identity.getIdentity).toHaveBeenCalledWith({
        id: ID,
        includeCredential: ["oidc"],
      });
    });

    it("expands the deprecated includeCredentials flag to all credential types", async () => {
      h.stubs.identity.getIdentity.mockResolvedValue({ data: IDENTITY });

      await h.callTool("kratos_get_identity", { id: ID, includeCredentials: true });

      expect(h.stubs.identity.getIdentity).toHaveBeenCalledWith({
        id: ID,
        includeCredential: [...ALL_CREDENTIAL_TYPES],
      });
    });

    it("sends no includeCredential when neither flag is given", async () => {
      h.stubs.identity.getIdentity.mockResolvedValue({ data: IDENTITY });
      await h.callTool("kratos_get_identity", { id: ID });
      expect(h.stubs.identity.getIdentity).toHaveBeenCalledWith({
        id: ID,
        includeCredential: undefined,
      });
    });

    it("redacts secret credential config by default", async () => {
      h.stubs.identity.getIdentity.mockResolvedValue({ data: IDENTITY_WITH_CREDENTIALS });

      const res = await h.callTool("kratos_get_identity", { id: ID, includeCredential: ["oidc"] });
      const creds = (res.structuredContent as unknown as Credentials).credentials;

      expect(creds.password?.config).toMatch(/redacted/);
      expect(creds.oidc?.config).toMatch(/redacted/);
      expect(creds.oidc?.identifiers).toEqual(["google:123"]);
    });

    it("keeps credential config when allowCredentialExposure is on", async () => {
      await h.close();
      h = await startHarness({ allowCredentialExposure: true });
      h.stubs.identity.getIdentity.mockResolvedValue({ data: IDENTITY_WITH_CREDENTIALS });

      const res = await h.callTool("kratos_get_identity", { id: ID, includeCredential: ["oidc"] });
      const creds = (res.structuredContent as unknown as Credentials).credentials;

      expect(creds.oidc?.config).toEqual({ providers: [{ provider: "google", subject: "123" }] });
      expect(creds.password?.config).toEqual({ hashed_password: "$2a$secret" });
    });
  });

  describe("kratos_create_identity", () => {
    it("maps camelCase input onto the snake_case Kratos body", async () => {
      h.stubs.identity.createIdentity.mockResolvedValue({ data: IDENTITY });

      const res = await h.callTool("kratos_create_identity", {
        schemaId: "default",
        traits: { email: "user@example.com" },
        metadataPublic: { tier: "gold" },
        metadataAdmin: { note: "vip" },
        externalId: "crm-1",
        organizationId: ORG,
        credentials: { oidc: { config: { providers: [{ provider: "google", subject: "123" }] } } },
        verifiableAddresses: [{ value: "user@example.com", via: "email", verified: true }],
        recoveryAddresses: [{ value: "user@example.com", via: "email" }],
      });

      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.id).toBe(ID);
      expect(h.stubs.identity.createIdentity).toHaveBeenCalledWith({
        createIdentityBody: {
          schema_id: "default",
          traits: { email: "user@example.com" },
          state: "active",
          metadata_public: { tier: "gold" },
          metadata_admin: { note: "vip" },
          external_id: "crm-1",
          organization_id: ORG,
          credentials: {
            oidc: { config: { providers: [{ provider: "google", subject: "123" }] } },
          },
          verifiable_addresses: [
            { value: "user@example.com", via: "email", verified: true, status: "completed" },
          ],
          recovery_addresses: [{ value: "user@example.com", via: "email" }],
        },
      });
    });

    it("rejects a missing schemaId before reaching Kratos", async () => {
      const res = await h.callTool("kratos_create_identity", { traits: {} });
      expect(res.isError).toBe(true);
      expect(h.stubs.identity.createIdentity).not.toHaveBeenCalled();
    });
  });

  describe("kratos_update_identity", () => {
    it("maps camelCase input onto the snake_case Kratos body", async () => {
      h.stubs.identity.updateIdentity.mockResolvedValue({ data: IDENTITY });

      await h.callTool("kratos_update_identity", {
        id: ID,
        schemaId: "default",
        traits: { email: "new@example.com" },
        state: "inactive",
        metadataAdmin: { note: "x" },
        externalId: "crm-2",
      });

      expect(h.stubs.identity.updateIdentity).toHaveBeenCalledWith({
        id: ID,
        updateIdentityBody: {
          schema_id: "default",
          traits: { email: "new@example.com" },
          state: "inactive",
          metadata_public: undefined,
          metadata_admin: { note: "x" },
          external_id: "crm-2",
          credentials: undefined,
        },
      });
    });

    it("warns that omitted metadata is cleared", async () => {
      const { tools } = await h.client.listTools();
      const tool = tools.find((t) => t.name === "kratos_update_identity");
      expect(tool?.description?.toLowerCase()).toContain("clear");
      expect(tool?.annotations?.idempotentHint).toBe(true);
    });
  });

  describe("kratos_patch_identity", () => {
    it("passes the JSON Patch array to the SDK", async () => {
      h.stubs.identity.patchIdentity.mockResolvedValue({ data: IDENTITY });

      const res = await h.callTool("kratos_patch_identity", {
        id: ID,
        patch: [
          { op: "replace", path: "/traits/email", value: "new@example.com" },
          { op: "remove", path: "/metadata_admin/role" },
        ],
      });

      expect(res.isError).toBeFalsy();
      expect(h.stubs.identity.patchIdentity).toHaveBeenCalledWith({
        id: ID,
        jsonPatch: [
          { op: "replace", path: "/traits/email", value: "new@example.com" },
          { op: "remove", path: "/metadata_admin/role", value: undefined },
        ],
      });
    });

    it("rejects an empty patch list", async () => {
      const res = await h.callTool("kratos_patch_identity", { id: ID, patch: [] });
      expect(res.isError).toBe(true);
      expect(h.stubs.identity.patchIdentity).not.toHaveBeenCalled();
    });
  });

  describe("kratos_set_identity_state", () => {
    it("patches /state and leaves sessions alone by default", async () => {
      h.stubs.identity.patchIdentity.mockResolvedValue({
        data: { ...IDENTITY, state: "inactive" },
      });

      const res = await h.callTool("kratos_set_identity_state", { id: ID, state: "inactive" });

      expect(res.isError).toBeFalsy();
      expect(h.elicit.calls).toHaveLength(1);
      expect(h.stubs.identity.patchIdentity).toHaveBeenCalledWith({
        id: ID,
        jsonPatch: [{ op: "replace", path: "/state", value: "inactive" }],
      });
      expect(h.stubs.identity.deleteIdentitySessions).not.toHaveBeenCalled();
      expect(res.structuredContent?.sessionsRevoked).toBe(false);
      expect(res.structuredContent?.state).toBe("inactive");
    });

    it("also deletes sessions when revokeSessions is set", async () => {
      h.stubs.identity.patchIdentity.mockResolvedValue({
        data: { ...IDENTITY, state: "inactive" },
      });
      h.stubs.identity.deleteIdentitySessions.mockResolvedValue({ data: undefined });

      const res = await h.callTool("kratos_set_identity_state", {
        id: ID,
        state: "inactive",
        revokeSessions: true,
      });

      expect(h.elicit.calls[0]?.params.message).toMatch(/revoke/i);
      expect(h.stubs.identity.deleteIdentitySessions).toHaveBeenCalledWith({ id: ID });
      expect(res.structuredContent?.sessionsRevoked).toBe(true);
    });

    it("returns cancelled and does not call Kratos when declined", async () => {
      h.elicit.handler = () => ({ action: "decline" });

      const res = await h.callTool("kratos_set_identity_state", {
        id: ID,
        state: "inactive",
        revokeSessions: true,
      });

      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.cancelled).toBe(true);
      expect(h.stubs.identity.patchIdentity).not.toHaveBeenCalled();
      expect(h.stubs.identity.deleteIdentitySessions).not.toHaveBeenCalled();
    });
  });

  describe("kratos_delete_identity_credential", () => {
    it("passes id, type and identifier to the SDK after confirmation", async () => {
      h.stubs.identity.deleteIdentityCredentials.mockResolvedValue({ data: undefined });

      const res = await h.callTool("kratos_delete_identity_credential", {
        id: ID,
        type: "oidc",
        identifier: "google:123",
      });

      expect(res.isError).toBeFalsy();
      expect(h.elicit.calls).toHaveLength(1);
      expect(h.elicit.calls[0]?.params.message).toContain("google:123");
      expect(h.stubs.identity.deleteIdentityCredentials).toHaveBeenCalledWith({
        id: ID,
        type: "oidc",
        identifier: "google:123",
      });
      expect(res.structuredContent?.success).toBe(true);
    });

    it("works without an identifier for single-instance credential types", async () => {
      h.stubs.identity.deleteIdentityCredentials.mockResolvedValue({ data: undefined });

      await h.callTool("kratos_delete_identity_credential", { id: ID, type: "totp" });

      expect(h.stubs.identity.deleteIdentityCredentials).toHaveBeenCalledWith({
        id: ID,
        type: "totp",
        identifier: undefined,
      });
    });

    it("returns cancelled and does not call Kratos when declined", async () => {
      h.elicit.handler = () => ({ action: "cancel" });

      const res = await h.callTool("kratos_delete_identity_credential", { id: ID, type: "totp" });

      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.cancelled).toBe(true);
      expect(h.stubs.identity.deleteIdentityCredentials).not.toHaveBeenCalled();
    });

    it("rejects an unknown credential type", async () => {
      const res = await h.callTool("kratos_delete_identity_credential", {
        id: ID,
        type: "magic",
      });
      expect(res.isError).toBe(true);
      expect(h.stubs.identity.deleteIdentityCredentials).not.toHaveBeenCalled();
    });
  });

  describe("identity schemas", () => {
    it("lists schemas with pagination", async () => {
      h.stubs.identity.listIdentitySchemas.mockResolvedValue(
        page([{ id: "default", schema: { type: "object" } }], "next-1"),
      );

      const res = await h.callTool("kratos_list_identity_schemas", { pageSize: 5 });

      expect(res.isError).toBeFalsy();
      expect(h.stubs.identity.listIdentitySchemas).toHaveBeenCalledWith({
        pageSize: 5,
        pageToken: undefined,
      });
      expect(res.structuredContent?.count).toBe(1);
      expect(res.structuredContent?.nextPageToken).toBe("next-1");
      expect((res.structuredContent?.items as Array<{ id: string }> | undefined)?.[0]?.id).toBe(
        "default",
      );
    });

    it("gets a single schema by ID", async () => {
      h.stubs.identity.getIdentitySchema.mockResolvedValue({
        data: { type: "object", properties: { traits: {} } },
      });

      const res = await h.callTool("kratos_get_identity_schema", { id: "default" });

      expect(res.isError).toBeFalsy();
      expect(h.stubs.identity.getIdentitySchema).toHaveBeenCalledWith({ id: "default" });
      expect(res.structuredContent?.type).toBe("object");
    });
  });

  describe("annotations", () => {
    it("marks read-only and destructive tools correctly", async () => {
      const { tools } = await h.client.listTools();
      const byName = new Map(tools.map((t) => [t.name, t.annotations]));

      for (const name of [
        "kratos_list_identities",
        "kratos_get_identity",
        "kratos_get_identity_by_external_id",
        "kratos_list_identity_schemas",
        "kratos_get_identity_schema",
      ]) {
        expect(byName.get(name)?.readOnlyHint, name).toBe(true);
        expect(byName.get(name)?.destructiveHint, name).not.toBe(true);
      }

      for (const name of ["kratos_delete_identity", "kratos_delete_identity_credential"]) {
        expect(byName.get(name)?.readOnlyHint, name).toBe(false);
        expect(byName.get(name)?.destructiveHint, name).toBe(true);
      }

      for (const name of [
        "kratos_create_identity",
        "kratos_update_identity",
        "kratos_patch_identity",
        "kratos_set_identity_state",
        "kratos_batch_patch_identities",
      ]) {
        expect(byName.get(name)?.readOnlyHint, name).toBe(false);
      }
    });
  });
});

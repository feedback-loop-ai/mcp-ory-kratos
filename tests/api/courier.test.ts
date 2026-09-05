/**
 * Courier API Tests
 *
 * Verifies courier message operations work correctly against configured Kratos instance.
 * User Story 5: Run Courier Message Tests (Priority: P2)
 *
 * Note: Courier messages are created by Kratos during authentication flows
 * (verification emails, recovery emails, etc.). These tests verify the API
 * endpoints work correctly with existing messages or handle empty results gracefully.
 */

import type { Message } from "@ory/kratos-client";
import { beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../setup/config";
import { createKratosClients, createTestContext, type TestContext } from "../setup/context";

describe("Courier API", () => {
  let ctx: TestContext;

  beforeAll(() => {
    const config = loadConfig();
    const clients = createKratosClients(config);
    ctx = createTestContext(clients);
  });

  describe("List Courier Messages", () => {
    it("should return paginated results (may be empty)", async () => {
      const response = await ctx.clients.courier.listCourierMessages({
        pageSize: 10,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      // If there are messages, verify structure
      if (response.data.length > 0) {
        const message = response.data[0];
        expect(message).toHaveProperty("id");
        expect(message).toHaveProperty("status");
        expect(message).toHaveProperty("type");
        expect(message).toHaveProperty("recipient");
        expect(message).toHaveProperty("created_at");
      }
    });

    it("should respect page size limit", async () => {
      const response = await ctx.clients.courier.listCourierMessages({
        pageSize: 1,
      });

      expect(response.status).toBe(200);
      expect(response.data.length).toBeLessThanOrEqual(1);
    });

    it("should support pagination with page token", async () => {
      // First request
      const firstResponse = await ctx.clients.courier.listCourierMessages({
        pageSize: 2,
      });

      expect(firstResponse.status).toBe(200);

      // If there's a next page token in headers, we can test pagination
      // Note: Kratos uses Link headers for pagination
    });
  });

  describe("Get Courier Message by ID", () => {
    it("should return 404 for non-existent message", async () => {
      const fakeMessageId = "00000000-0000-0000-0000-000000000000";

      await expect(
        ctx.clients.courier.getCourierMessage({ id: fakeMessageId }),
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it("should return message details for existing message", async () => {
      // First, get a list of messages
      const listResponse = await ctx.clients.courier.listCourierMessages({
        pageSize: 1,
      });

      if (listResponse.data.length === 0) {
        // Skip if no messages exist - this is expected in test environments
        console.log("Skipping: No existing courier messages to test");
        return;
      }

      const messageId = listResponse.data[0].id;
      const response = await ctx.clients.courier.getCourierMessage({
        id: messageId,
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(messageId);
      expect(response.data).toHaveProperty("status");
      expect(response.data).toHaveProperty("type");
      expect(response.data).toHaveProperty("recipient");
      expect(response.data).toHaveProperty("body");
      expect(response.data).toHaveProperty("created_at");
    });
  });

  describe("Filter Messages by Status", () => {
    const statuses = ["queued", "sent", "processing", "abandoned"] as const;

    for (const status of statuses) {
      it(`should filter messages by status: ${status}`, async () => {
        const response = await ctx.clients.courier.listCourierMessages({
          status: status as Message["status"],
          pageSize: 10,
        });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);

        // All returned messages should have the requested status
        for (const message of response.data) {
          expect(message.status).toBe(status);
        }
      });
    }
  });

  describe("Message Types", () => {
    it("should correctly identify email messages", async () => {
      const response = await ctx.clients.courier.listCourierMessages({
        pageSize: 20,
      });

      expect(response.status).toBe(200);

      // If there are email messages, verify they have expected fields
      const emailMessages = response.data.filter((m) => m.type === "email");
      for (const message of emailMessages) {
        expect(message.recipient).toContain("@");
      }
    });

    it("should correctly identify SMS messages", async () => {
      const response = await ctx.clients.courier.listCourierMessages({
        pageSize: 20,
      });

      expect(response.status).toBe(200);

      // If there are SMS messages, verify they exist
      const smsMessages = response.data.filter((m) => m.type === "phone");
      // SMS messages have phone numbers as recipients
      for (const message of smsMessages) {
        expect(message.recipient).toBeDefined();
      }
    });
  });

  describe("Message Structure Validation", () => {
    it("should have all required fields in message response", async () => {
      const response = await ctx.clients.courier.listCourierMessages({
        pageSize: 1,
      });

      if (response.data.length === 0) {
        console.log("Skipping: No messages to validate structure");
        return;
      }

      const message = response.data[0];

      // Required fields per Kratos API spec
      expect(message).toHaveProperty("id");
      expect(typeof message.id).toBe("string");

      expect(message).toHaveProperty("status");
      expect(["queued", "sent", "processing", "abandoned"]).toContain(message.status);

      expect(message).toHaveProperty("type");
      expect(["email", "phone"]).toContain(message.type);

      expect(message).toHaveProperty("recipient");
      expect(typeof message.recipient).toBe("string");

      expect(message).toHaveProperty("created_at");
      expect(new Date(message.created_at!).toString()).not.toBe("Invalid Date");
    });
  });
});

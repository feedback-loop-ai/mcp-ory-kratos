/**
 * Courier tool tests: list with filters/pagination, get, 404 mapping.
 */

import { afterEach, describe, expect, it } from "vitest";
import { type Harness, httpError, page, startHarness } from "./harness";

const MESSAGE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("courier tools", () => {
  let h: Harness;
  afterEach(async () => {
    await h?.close();
  });

  it("kratos_list_courier_messages passes filters and returns nextPageToken", async () => {
    h = await startHarness();
    h.stubs.courier.listCourierMessages.mockResolvedValue(
      page(
        [
          { id: "m1", status: "sent", recipient: "a@example.test" },
          { id: "m2", status: "sent", recipient: "a@example.test" },
        ],
        "next-msgs",
      ),
    );

    const res = await h.callTool("kratos_list_courier_messages", {
      status: "sent",
      recipient: "a@example.test",
      pageSize: 2,
      pageToken: "prev",
    });

    expect(res.isError).toBeFalsy();
    expect(h.stubs.courier.listCourierMessages).toHaveBeenCalledWith({
      pageSize: 2,
      pageToken: "prev",
      status: "sent",
      recipient: "a@example.test",
    });
    expect(res.structuredContent).toEqual({
      messages: [
        { id: "m1", status: "sent", recipient: "a@example.test" },
        { id: "m2", status: "sent", recipient: "a@example.test" },
      ],
      count: 2,
      nextPageToken: "next-msgs",
    });
  });

  it("kratos_list_courier_messages omits nextPageToken on the last page", async () => {
    h = await startHarness();
    h.stubs.courier.listCourierMessages.mockResolvedValue(page([{ id: "m1" }]));
    const res = await h.callTool("kratos_list_courier_messages");
    expect(res.structuredContent?.nextPageToken).toBeUndefined();
    expect(res.structuredContent?.count).toBe(1);
  });

  it("kratos_get_courier_message returns the message", async () => {
    h = await startHarness();
    h.stubs.courier.getCourierMessage.mockResolvedValue({
      data: { id: MESSAGE_ID, status: "queued", dispatches: [] },
    });
    const res = await h.callTool("kratos_get_courier_message", { id: MESSAGE_ID });
    expect(res.isError).toBeFalsy();
    expect(h.stubs.courier.getCourierMessage).toHaveBeenCalledWith({ id: MESSAGE_ID });
    expect(res.structuredContent).toEqual({ id: MESSAGE_ID, status: "queued", dispatches: [] });
  });

  it("maps a 404 to NOT_FOUND", async () => {
    h = await startHarness();
    h.stubs.courier.getCourierMessage.mockRejectedValue(httpError(404, "message not found"));
    const res = await h.callTool("kratos_get_courier_message", { id: MESSAGE_ID });
    expect(res.isError).toBe(true);
    const payload = res.json as { error: { code: string; kratosStatus: number } };
    expect(payload.error.code).toBe("NOT_FOUND");
    expect(payload.error.kratosStatus).toBe(404);
  });
});

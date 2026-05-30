import { describe, expect, it } from "vitest";

import { TopicSubscriptionRegistry } from "./subscriptions.js";

describe("TopicSubscriptionRegistry", () => {
  it("ref-counts topics", () => {
    const registry = new TopicSubscriptionRegistry();
    expect(registry.increment("a/b/#")).toBe(true);
    expect(registry.increment("a/b/#")).toBe(false);
    expect(registry.refCount("a/b/#")).toBe(2);
    expect(registry.decrement("a/b/#")).toBe(false);
    expect(registry.decrement("a/b/#")).toBe(true);
    expect(registry.refCount("a/b/#")).toBe(0);
  });
});

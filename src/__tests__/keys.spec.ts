import { describe, expect, test } from "vitest";

import { buildIdKey, buildRootKey } from "../redis/keys";

describe("cache key builders", () => {
  test("builds deterministic root and id keys", () => {
    expect(buildRootKey("accounts")).toBe("cache:accounts:rootKey");
    expect(buildIdKey("accounts", ["id"], { id: "ABC-123" })).toBe(
      "accounts:idKey:accounts:idKey:id:abc-123",
    );
  });

  test("requires every id column", () => {
    expect(() => buildIdKey("accounts", ["id", "tenant"], { id: "1" })).toThrow(
      "Must have all id columns",
    );
  });
});

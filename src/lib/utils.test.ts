import { afterEach, describe, expect, it, vi } from "vitest";
import { id } from "./utils";

describe("id", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an id when crypto.randomUUID is not available", () => {
    vi.stubGlobal("crypto", {});

    expect(id("cycle")).toMatch(/^cycle_/);
  });
});

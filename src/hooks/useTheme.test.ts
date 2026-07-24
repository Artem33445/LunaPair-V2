import { describe, expect, it } from "vitest";
import { applyTheme } from "./useTheme";

describe("theme", () => {
  it("applies and persists visible class", () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveClass("dark");
    applyTheme("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });
});

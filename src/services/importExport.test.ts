import { describe, expect, it } from "vitest";
import { createDemoData } from "../features/cycle/domain/demoData";
import { createBackup } from "./exportService";
import { parseBackup } from "./importService";

describe("backup import/export", () => {
  it("exports and imports valid backup", () => {
    const demo = createDemoData(new Date("2026-07-14T12:00:00"));
    const json = createBackup(demo.profile, demo.cycles, demo.logs);
    expect(parseBackup(json).dailyLogs.length).toBeGreaterThan(0);
  });

  it("rejects corrupted import", () => {
    expect(() => parseBackup("{\"version\":1,\"cycles\":[{}]}")).toThrow();
  });
});

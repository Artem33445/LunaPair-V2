import { describe, expect, it } from "vitest";
import type { DailyLog, PartnerVisibleDay } from "../../../types";
import { buildPartnerSupportCard } from "./partnerSupport";

const day: PartnerVisibleDay = {
  date: "2026-07-17",
  visibility: {
    cycle: true,
    wellbeing: false,
    mood: false,
    energy: true,
    sleep: true,
    pain: true,
    symptoms: false,
    discharge: false,
    note: false,
    privateMarker: false,
    intimacy: false
  }
};

describe("partner support recommendations", () => {
  it("prioritizes personal support preferences", () => {
    const card = buildPartnerSupportCard({
      today: day,
      phase: "luteal",
      logs: [],
      preferences: {
        preferredSupport: ["заказать ужин"],
        avoidWhenPossible: "спорить вечером",
        reassuranceText: "Я рядом.",
        updatedAt: ""
      }
    });

    expect(card.source).toBe("preferences");
    expect(card.body).toContain("заказать ужин");
  });

  it("does not treat low energy as a diagnosis", () => {
    const card = buildPartnerSupportCard({
      today: { ...day, energy: "low" },
      logs: []
    });

    expect(card.body.toLowerCase()).toContain("не диагноз");
    expect(card.actions.join(" ")).toContain("Спросить");
  });

  it("does not prescribe treatment for strong pain", () => {
    const card = buildPartnerSupportCard({
      today: { ...day, painLevel: 8 },
      logs: []
    });

    expect(card.body).toContain("не ставит диагнозы");
    expect(card.actions.join(" ")).not.toContain("прими");
  });

  it("uses cautious pattern language for repeated allowed symptoms", () => {
    const logs: DailyLog[] = [
      log("2026-07-01", "усталость"),
      log("2026-07-02", "усталость"),
      log("2026-07-03", "усталость")
    ];
    const card = buildPartnerSupportCard({ today: day, logs });

    expect(card.source).toBe("pattern");
    expect(card.body).toContain("наблюдение");
    expect(card.actions.join(" ")).toContain("Не связывать всё автоматически");
  });
});

function log(date: string, symptom: string): DailyLog {
  return {
    id: date,
    date,
    symptoms: [symptom],
    source: "user",
    createdAt: "",
    updatedAt: ""
  };
}

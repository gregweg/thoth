import { describe, expect, it } from "vitest";
import { addCalendarDays, isFollowUpDue } from "./checkpoints.js";

describe("isFollowUpDue", () => {
  it("is false before 5 calendar days", () => {
    expect(isFollowUpDue("2026-07-01", "2026-07-05", false)).toBe(false);
  });

  it("is true on day 5 and after", () => {
    expect(isFollowUpDue("2026-07-01", "2026-07-06", false)).toBe(true);
    expect(isFollowUpDue("2026-07-01", "2026-07-10", false)).toBe(true);
  });

  it("is false when follow_up already exists", () => {
    expect(isFollowUpDue("2026-07-01", "2026-07-10", true)).toBe(false);
  });
});

describe("addCalendarDays", () => {
  it("adds across month boundaries", () => {
    expect(addCalendarDays("2026-01-30", 5)).toBe("2026-02-04");
  });
});

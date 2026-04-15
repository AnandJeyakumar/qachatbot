import { buildPrompt } from "../src/prompt";

describe("buildPrompt", () => {
  it("includes mobile instructions by default", () => {
    const { system, user } = buildPrompt("Add login feature", {});
    expect(system).toContain("Mobile");
    expect(system).toContain("MOB-POS-001");
    expect(user).toContain("Add login feature");
  });

  it("excludes mobile when includeMobile is false", () => {
    const { system } = buildPrompt("Add login feature", {
      includeMobile: false,
    });
    expect(system).not.toContain("MOB-POS-001");
    expect(system).not.toContain("Gestures");
  });

  it("includes all scenario types in system prompt", () => {
    const { system } = buildPrompt("Any requirement", {});
    expect(system).toContain("Positive (happy path)");
    expect(system).toContain("Negative");
    expect(system).toContain("Edge cases");
  });

  it("includes ISTQB test design techniques", () => {
    const { system } = buildPrompt("Any requirement", {});
    expect(system).toContain("Equivalence Partitioning");
    expect(system).toContain("Boundary Value Analysis");
    expect(system).toContain("Decision Table Testing");
    expect(system).toContain("State Transition Testing");
    expect(system).toContain("Error Guessing");
  });

  it("includes OWASP security awareness", () => {
    const { system } = buildPrompt("Any requirement", {});
    expect(system).toContain("OWASP");
    expect(system).toContain("SQL injection");
    expect(system).toContain("Broken Access Control");
  });

  it("includes accessibility guidelines", () => {
    const { system } = buildPrompt("Any requirement", {});
    expect(system).toContain("keyboard navigation");
    expect(system).toContain("screen reader");
    expect(system).toContain("color contrast");
  });

  it("includes all category prefixes in ID format", () => {
    const { system } = buildPrompt("Any requirement", {});
    expect(system).toContain("FE-POS-001");
    expect(system).toContain("FE-NEG-001");
    expect(system).toContain("FE-EDGE-001");
    expect(system).toContain("BE-POS-001");
    expect(system).toContain("BE-NEG-001");
    expect(system).toContain("BE-EDGE-001");
  });

  it("includes the requirement text in user prompt", () => {
    const requirement = "As a user, I want to reset my password via email";
    const { user } = buildPrompt(requirement, {});
    expect(user).toContain(requirement);
  });
});

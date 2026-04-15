import { analyzeRequirement } from "../src/analyzer";

// Mock the Anthropic SDK
jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              requirement: "Test requirement",
              summary: "A test summary",
              scenarios: [
                {
                  id: "FE-POS-001",
                  category: "frontend",
                  type: "positive",
                  title: "Valid login",
                  description: "User logs in with valid credentials",
                  preconditions: ["User has an account"],
                  steps: ["Enter email", "Enter password", "Click login"],
                  expectedResult: "User is redirected to dashboard",
                  priority: "high",
                },
                {
                  id: "BE-NEG-001",
                  category: "backend",
                  type: "negative",
                  title: "Invalid token",
                  description: "API rejects expired token",
                  preconditions: ["Token has expired"],
                  steps: ["Send request with expired token"],
                  expectedResult: "401 Unauthorized response",
                  priority: "high",
                },
              ],
            }),
          },
        ],
      }),
    },
  }));
});

describe("analyzeRequirement", () => {
  it("throws if no API key is provided", async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    await expect(analyzeRequirement("test")).rejects.toThrow("Missing API key");

    if (original) process.env.ANTHROPIC_API_KEY = original;
  });

  it("throws if requirement is empty", async () => {
    await expect(
      analyzeRequirement("", { apiKey: "test-key" })
    ).rejects.toThrow("Requirement text cannot be empty");
  });

  it("returns structured test scenarios", async () => {
    const result = await analyzeRequirement("Add login feature", {
      apiKey: "test-key",
    });

    expect(result.requirement).toBe("Test requirement");
    expect(result.summary).toBe("A test summary");
    expect(result.scenarios).toHaveLength(2);
    expect(result.metadata.totalCount).toBe(2);
    expect(result.metadata.model).toBe("claude-sonnet-4-6-20250514");
  });

  it("scenarios have correct structure", async () => {
    const result = await analyzeRequirement("Add login feature", {
      apiKey: "test-key",
    });

    const fe = result.scenarios[0];
    expect(fe.id).toBe("FE-POS-001");
    expect(fe.category).toBe("frontend");
    expect(fe.type).toBe("positive");
    expect(fe.steps).toBeInstanceOf(Array);
    expect(fe.preconditions).toBeInstanceOf(Array);

    const be = result.scenarios[1];
    expect(be.id).toBe("BE-NEG-001");
    expect(be.category).toBe("backend");
    expect(be.type).toBe("negative");
  });
});
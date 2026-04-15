import Anthropic from "@anthropic-ai/sdk";
import { AnalyzerOptions, ChatMessage, TestScenarios } from "./types";
import { buildPrompt } from "./prompt";

export class QAChatbot {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private options: AnalyzerOptions;
  private history: ChatMessage[] = [];
  private systemPrompt: string = "";

  constructor(options: AnalyzerOptions = {}) {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing API key. Set ANTHROPIC_API_KEY environment variable or pass apiKey in options."
      );
    }
    this.client = new Anthropic({ apiKey });
    this.model = options.model || "claude-sonnet-4-6-20250514";
    this.maxTokens = options.maxTokens || 8192;
    this.options = options;
  }

  async analyze(requirement: string): Promise<TestScenarios> {
    if (!requirement.trim()) {
      throw new Error("Requirement text cannot be empty.");
    }

    const { system, user } = buildPrompt(requirement, this.options);
    this.systemPrompt = system;
    this.history = [{ role: "user", content: user }];

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response received from Claude.");
    }

    this.history.push({ role: "assistant", content: textBlock.text });

    const parsed = parseJSON(textBlock.text);
    return {
      requirement: parsed.requirement || requirement,
      summary: parsed.summary || "",
      scenarios: parsed.scenarios || [],
      metadata: {
        generatedAt: new Date().toISOString(),
        model: this.model,
        totalCount: (parsed.scenarios || []).length,
      },
    };
  }

  async chat(followUp: string): Promise<string> {
    this.history.push({ role: "user", content: followUp });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: this.systemPrompt,
      messages: this.history.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response received from Claude.");
    }

    this.history.push({ role: "assistant", content: textBlock.text });
    return textBlock.text;
  }
}

export async function analyzeRequirement(
  requirement: string,
  options: AnalyzerOptions = {}
): Promise<TestScenarios> {
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key. Set ANTHROPIC_API_KEY environment variable or pass apiKey in options."
    );
  }

  if (!requirement.trim()) {
    throw new Error("Requirement text cannot be empty.");
  }

  const model = options.model || "claude-sonnet-4-6-20250514";
  const maxTokens = options.maxTokens || 8192;

  const client = new Anthropic({ apiKey });
  const { system, user } = buildPrompt(requirement, options);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response received from Claude.");
  }

  const parsed = parseJSON(textBlock.text);

  return {
    requirement: parsed.requirement || requirement,
    summary: parsed.summary || "",
    scenarios: parsed.scenarios || [],
    metadata: {
      generatedAt: new Date().toISOString(),
      model,
      totalCount: (parsed.scenarios || []).length,
    },
  };
}

function parseJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Strip markdown code fences if present
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      return JSON.parse(fenceMatch[1].trim());
    }

    // Try to find a JSON object in the text
    const braceStart = text.indexOf("{");
    const braceEnd = text.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd !== -1) {
      return JSON.parse(text.slice(braceStart, braceEnd + 1));
    }

    throw new Error(
      "Failed to parse response as JSON. Raw response:\n" + text.slice(0, 500)
    );
  }
}

export interface AnalyzerOptions {
  apiKey?: string;
  model?: string;
  includeMobile?: boolean;
  maxTokens?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TestScenario {
  id: string;
  category: "frontend" | "backend" | "mobile";
  type: "positive" | "negative" | "edge_case";
  title: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  priority: "high" | "medium" | "low";
}

export interface TestScenarios {
  requirement: string;
  summary: string;
  scenarios: TestScenario[];
  metadata: {
    generatedAt: string;
    model: string;
    totalCount: number;
  };
}
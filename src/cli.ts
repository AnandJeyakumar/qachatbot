#!/usr/bin/env node

import { analyzeRequirement, QAChatbot } from "./analyzer";
import { TestScenarios } from "./types";
import * as fs from "fs";
import * as readline from "readline";

// ── Colors (no dependencies) ──────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgRed: "\x1b[41m",
};

function banner() {
  console.log(`
${c.cyan}${c.bold}  ╔══════════════════════════════════════════╗
  ║          QAChatbot  v1.0.0               ║
  ║    AI-powered QA test plan generator     ║
  ╚══════════════════════════════════════════╝${c.reset}
`);
}

function printScenarios(result: TestScenarios) {
  const divider = `${c.dim}${"─".repeat(50)}${c.reset}`;

  console.log(divider);
  console.log(`${c.bold}${c.cyan}  Requirement:${c.reset} ${result.requirement}`);
  console.log(`${c.bold}${c.cyan}  Summary:${c.reset} ${result.summary}`);
  console.log(divider);

  const categories = ["frontend", "backend", "mobile"] as const;
  const catIcons = { frontend: "🖥️ ", backend: "⚙️ ", mobile: "📱" };
  const catLabels = { frontend: "FRONTEND", backend: "BACKEND", mobile: "MOBILE" };
  const typeIcons = { positive: "✅", negative: "❌", edge_case: "⚡" };
  const typeLabels = { positive: "Happy Path", negative: "Negative", edge_case: "Edge Case" };
  const priorityColors = { high: c.red, medium: c.yellow, low: c.dim };

  for (const cat of categories) {
    const catScenarios = result.scenarios.filter((s) => s.category === cat);
    if (catScenarios.length === 0) continue;

    console.log(
      `\n${c.bold}${c.bgCyan}${c.white} ${catIcons[cat]} ${catLabels[cat]} (${catScenarios.length} scenarios) ${c.reset}\n`
    );

    const types = ["positive", "negative", "edge_case"] as const;
    for (const type of types) {
      const typeScenarios = catScenarios.filter((s) => s.type === type);
      if (typeScenarios.length === 0) continue;

      console.log(`  ${typeIcons[type]} ${c.bold}${typeLabels[type]}${c.reset}`);
      console.log();

      for (const s of typeScenarios) {
        const pColor = priorityColors[s.priority];
        console.log(
          `    ${c.bold}${s.id}${c.reset}  ${s.title}  ${pColor}[${s.priority.toUpperCase()}]${c.reset}`
        );
        console.log(`    ${c.dim}${s.description}${c.reset}`);

        if (s.preconditions.length > 0) {
          console.log(`    ${c.yellow}Preconditions:${c.reset}`);
          s.preconditions.forEach((p) => console.log(`      ${c.dim}- ${p}${c.reset}`));
        }

        console.log(`    ${c.cyan}Steps:${c.reset}`);
        s.steps.forEach((st, i) => console.log(`      ${c.dim}${i + 1}. ${st}${c.reset}`));

        console.log(`    ${c.green}Expected:${c.reset} ${s.expectedResult}`);
        console.log();
      }
    }
  }

  // Summary bar
  const pos = result.scenarios.filter((s) => s.type === "positive").length;
  const neg = result.scenarios.filter((s) => s.type === "negative").length;
  const edge = result.scenarios.filter((s) => s.type === "edge_case").length;
  const hi = result.scenarios.filter((s) => s.priority === "high").length;
  const med = result.scenarios.filter((s) => s.priority === "medium").length;
  const lo = result.scenarios.filter((s) => s.priority === "low").length;

  console.log(divider);
  console.log(
    `${c.bold}  Total: ${result.metadata.totalCount} scenarios${c.reset}  ` +
      `${c.green}✅ ${pos} positive${c.reset}  ` +
      `${c.red}❌ ${neg} negative${c.reset}  ` +
      `${c.yellow}⚡ ${edge} edge cases${c.reset}`
  );
  console.log(
    `  ${c.dim}Priority:${c.reset}  ` +
      `${c.red}${hi} high${c.reset}  ` +
      `${c.yellow}${med} medium${c.reset}  ` +
      `${c.dim}${lo} low${c.reset}`
  );
  console.log(divider);
}

async function interactiveMode(noMobile: boolean, model?: string) {
  banner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = (q: string): Promise<string> =>
    new Promise((res) => rl.question(q, res));

  console.log(
    `${c.dim}  Paste your requirement below (press Enter twice to submit):${c.reset}\n`
  );

  // Collect multi-line input
  const lines: string[] = [];
  let emptyCount = 0;
  await new Promise<void>((resolve) => {
    rl.on("line", (line) => {
      if (line === "") {
        emptyCount++;
        if (emptyCount >= 1 && lines.length > 0) resolve();
      } else {
        emptyCount = 0;
        lines.push(line);
      }
    });
  });

  const requirement = lines.join("\n").trim();
  if (!requirement) {
    console.error(`${c.red}  No requirement provided. Exiting.${c.reset}`);
    rl.close();
    process.exit(1);
  }

  console.log(`\n${c.cyan}  Analyzing requirement...${c.reset}\n`);

  try {
    const bot = new QAChatbot({ includeMobile: !noMobile, model: model || undefined });
    const result = await bot.analyze(requirement);
    printScenarios(result);

    // Follow-up chat loop
    console.log(
      `\n${c.magenta}${c.bold}  Chat mode${c.reset}${c.dim} — ask follow-ups like "add more edge cases for auth" or type "exit"${c.reset}\n`
    );

    while (true) {
      const input = await ask(`${c.magenta}  > ${c.reset}`);
      if (!input.trim() || input.trim().toLowerCase() === "exit") break;

      console.log(`\n${c.dim}  Thinking...${c.reset}\n`);
      const reply = await bot.chat(input);
      console.log(`  ${reply}\n`);
    }

    console.log(`\n${c.green}  Done. Happy testing!${c.reset}\n`);
  } catch (err: any) {
    console.error(`\n${c.red}  Error: ${err.message}${c.reset}`);
    process.exit(1);
  }

  rl.close();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const noMobile = args.includes("--no-mobile");
  const model = getFlag(args, "--model");

  // Interactive mode: no args, or explicit --interactive
  if (args.length === 0 || args.includes("--interactive")) {
    await interactiveMode(noMobile, model || undefined);
    return;
  }

  // Single-shot mode
  const format = getFlag(args, "--format") || "markdown";
  const filePath = getFlag(args, "--file");
  const outputPath = getFlag(args, "--output");
  const useStdin = args.includes("--stdin");

  let requirement: string;

  if (useStdin) {
    requirement = await readStdin();
  } else if (filePath) {
    requirement = fs.readFileSync(filePath, "utf-8");
  } else {
    requirement = args
      .filter((a) => !a.startsWith("--"))
      .join(" ");
  }

  if (!requirement.trim()) {
    // No inline requirement — fall back to interactive
    await interactiveMode(noMobile, model || undefined);
    return;
  }

  console.log(`${c.cyan}  Analyzing requirement...${c.reset}\n`);

  try {
    const result = await analyzeRequirement(requirement, {
      includeMobile: !noMobile,
      model: model || undefined,
    });

    if (format === "json") {
      const output = JSON.stringify(result, null, 2);
      if (outputPath) {
        fs.writeFileSync(outputPath, output, "utf-8");
        console.log(`${c.green}  Results saved to ${outputPath}${c.reset}`);
      } else {
        console.log(output);
      }
    } else {
      printScenarios(result);
      if (outputPath) {
        fs.writeFileSync(outputPath, formatMarkdownPlain(result), "utf-8");
        console.log(`\n${c.green}  Results also saved to ${outputPath}${c.reset}`);
      }
    }
  } catch (err: any) {
    console.error(`${c.red}  Error: ${err.message}${c.reset}`);
    process.exit(1);
  }
}

function printHelp() {
  banner();
  console.log(`${c.bold}  Usage:${c.reset}
    qachatbot                                  ${c.dim}Interactive mode${c.reset}
    qachatbot "requirement text"               ${c.dim}Single-shot mode${c.reset}
    qachatbot --file requirements.txt          ${c.dim}Read from file${c.reset}
    echo "requirement" | qachatbot --stdin     ${c.dim}Read from stdin${c.reset}

${c.bold}  Options:${c.reset}
    --interactive     ${c.dim}Force interactive mode with chat follow-ups${c.reset}
    --file <path>     ${c.dim}Read requirement from a file${c.reset}
    --output <path>   ${c.dim}Save results to a file${c.reset}
    --stdin           ${c.dim}Read requirement from stdin${c.reset}
    --format <type>   ${c.dim}Output format: "markdown" (default) or "json"${c.reset}
    --no-mobile       ${c.dim}Skip mobile test scenarios${c.reset}
    --model <model>   ${c.dim}Claude model to use${c.reset}
    --help, -h        ${c.dim}Show this help message${c.reset}

${c.bold}  Environment:${c.reset}
    ANTHROPIC_API_KEY  ${c.dim}Your Anthropic API key (required)${c.reset}
`);
}

function getFlag(args: string[], flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return null;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function formatMarkdownPlain(result: TestScenarios): string {
  const lines: string[] = [];
  lines.push(`# QA Test Scenarios\n`);
  lines.push(`**Requirement:** ${result.requirement}\n`);
  lines.push(`**Summary:** ${result.summary}\n`);
  lines.push(`---\n`);

  const categories = ["frontend", "backend", "mobile"] as const;
  const categoryLabels = { frontend: "Frontend (FE)", backend: "Backend (BE)", mobile: "Mobile" };
  const types = ["positive", "negative", "edge_case"] as const;
  const typeLabels = { positive: "Positive Scenarios", negative: "Negative Scenarios", edge_case: "Edge Cases" };

  for (const cat of categories) {
    const catScenarios = result.scenarios.filter((s) => s.category === cat);
    if (catScenarios.length === 0) continue;

    lines.push(`## ${categoryLabels[cat]}\n`);

    for (const type of types) {
      const typeScenarios = catScenarios.filter((s) => s.type === type);
      if (typeScenarios.length === 0) continue;

      lines.push(`### ${typeLabels[type]}\n`);

      for (const scenario of typeScenarios) {
        lines.push(`#### ${scenario.id}: ${scenario.title} [${scenario.priority.toUpperCase()}]\n`);
        lines.push(`${scenario.description}\n`);

        if (scenario.preconditions.length > 0) {
          lines.push(`**Preconditions:**`);
          scenario.preconditions.forEach((p) => lines.push(`- ${p}`));
          lines.push("");
        }

        lines.push(`**Steps:**`);
        scenario.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
        lines.push("");

        lines.push(`**Expected Result:** ${scenario.expectedResult}\n`);
        lines.push(`---\n`);
      }
    }
  }

  lines.push(
    `\n*Generated ${result.metadata.totalCount} scenarios at ${result.metadata.generatedAt} using ${result.metadata.model}*`
  );

  return lines.join("\n");
}

main();
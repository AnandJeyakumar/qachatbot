# QAChatbot

> AI-powered QA agent that turns software requirements into comprehensive, ISTQB-aligned test scenarios in seconds.

Built on Claude AI (Anthropic). Works as a CLI tool or an npm library. Covers Frontend, Backend, and Mobile — with positive, negative, and edge case scenarios out of the box.

---

## What It Does

You paste a requirement. QAChatbot generates a full test plan.

**Input:**
```
The login page must allow users to authenticate with email and password.
Account locks after 5 failed attempts. Session expires after 30 minutes
of inactivity. Must be WCAG 2.1 AA compliant.
```

**Output (instantly):**
```
 🖥️  FRONTEND (12 scenarios)
  ✅ FE-POS-001  Successful login with valid credentials  [HIGH]
  ❌ FE-NEG-003  Generic error — no email/password hint  [HIGH]
  ⚡ FE-EDGE-002  Show/hide toggle with screen reader (WCAG)  [HIGH]

 ⚙️  BACKEND (10 scenarios)
  ✅ BE-POS-001  Successful auth returns session token  [HIGH]
  ❌ BE-NEG-001  Account lockout after exactly 5 failures (BVA)  [HIGH]
  ⚡ BE-EDGE-002  Race condition — 5 failed attempts simultaneously  [HIGH]

 📱 MOBILE (8 scenarios)
  ✅ MOB-POS-001  Login on iOS and Android native apps  [HIGH]
  ❌ MOB-NEG-001  Login with no network connection  [HIGH]
  ⚡ MOB-EDGE-004  Low memory / app backgrounded for 30+ minutes  [MEDIUM]

──────────────────────────────────────────────────
  Total: 30 scenarios  ✅ 6 positive  ❌ 11 negative  ⚡ 13 edge cases
  Priority:  18 high  9 medium  3 low
```

Each scenario includes: **ID, title, priority, description, preconditions, steps, and expected result.**

---

## How It Thinks

QAChatbot applies **ISTQB Foundation Level (v4.0)** test design techniques automatically:

| Technique | Example |
|-----------|---------|
| **Boundary Value Analysis** | Attempt count: test at 4, 5, 6 failures |
| **Equivalence Partitioning** | Valid/invalid email format classes |
| **State Transition Testing** | Active → Locked → Unlocked account states |
| **Decision Table Testing** | Login + 2FA + Remember Me combinations |
| **Error Guessing** | SQL injection, XSS, race conditions, unicode |

It also checks against **OWASP Top 10** (injection, broken access control, auth failures) and **WCAG 2.1 AA** (keyboard nav, screen reader, color contrast).

---

## Installation

```bash
npm install -g qachatbot-ad
```

Set your Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com)):

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

---

## Usage

### Interactive Mode (recommended)

Just run `qachatbot` — paste your requirement, get your test plan, then ask follow-up questions:

```bash
qachatbot
```

```
  ╔══════════════════════════════════════════╗
  ║          QAChatbot  v1.0.0               ║
  ║    AI-powered QA test plan generator     ║
  ╚══════════════════════════════════════════╝

  Paste your requirement below (press Enter twice to submit):

  > User should be able to reset their password via email OTP...

  Analyzing requirement...

  [scenarios appear here]

  Chat mode — ask follow-ups like "add more edge cases for OTP expiry"

  > add performance test scenarios for the OTP API
  > exit
```

### Single-Shot Mode

```bash
# Inline requirement
qachatbot "User can upload a profile photo"

# From a file
qachatbot --file requirements.txt

# From stdin (pipe)
cat story.txt | qachatbot --stdin

# Skip mobile scenarios (backend-only requirement)
qachatbot "Build REST API for user management" --no-mobile

# Save output to a markdown file
qachatbot "User can checkout with a saved card" --output test-plan.md

# Get raw JSON output
qachatbot "Add search functionality" --format json
```

### All Options

| Flag | Description |
|------|-------------|
| `--interactive` | Force interactive mode with chat follow-ups |
| `--file <path>` | Read requirement from a file |
| `--output <path>` | Save results to a file instead of stdout |
| `--stdin` | Read requirement from stdin |
| `--format <type>` | Output format: `markdown` (default) or `json` |
| `--no-mobile` | Skip mobile test scenarios |
| `--model <model>` | Override Claude model |
| `--help, -h` | Show help |

---

## Use as a Library

```typescript
import { QAChatbot, analyzeRequirement } from "qachatbot-ad";

// One-shot — simple use case
const result = await analyzeRequirement(
  "User can add items to a shopping cart",
  { includeMobile: true }
);

console.log(`Generated ${result.metadata.totalCount} scenarios`);
result.scenarios.forEach(s => {
  console.log(`[${s.id}] ${s.title} — ${s.priority}`);
});
```

```typescript
// Agent with chat — for iterative test planning
const bot = new QAChatbot({ includeMobile: true });

const result = await bot.analyze(
  "User should be able to login with email and password"
);

// Follow-up questions in the same conversation
const more = await bot.chat("Add more edge cases around account lockout");
const gherkin = await bot.chat("Rewrite the backend scenarios in Gherkin format");

console.log(more);
console.log(gherkin);
```

### TypeScript Types

```typescript
import type { TestScenarios, TestScenario, AnalyzerOptions } from "qachatbot-ad";

interface TestScenario {
  id: string;                                          // e.g. "FE-NEG-001"
  category: "frontend" | "backend" | "mobile";
  type: "positive" | "negative" | "edge_case";
  title: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  priority: "high" | "medium" | "low";
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

Or pass it directly in options:

```typescript
const bot = new QAChatbot({ apiKey: "..." });
```

---

## What Gets Tested

For every requirement, QAChatbot automatically considers:

**Frontend**
- Form validation (inline errors, not just alerts)
- Rendering states: loading, empty, error, success
- Accessibility: keyboard navigation, screen reader labels, color contrast 4.5:1
- Browser back button during multi-step flows
- Rapid double-click / duplicate submission
- Responsive layout across all screen sizes

**Backend**
- HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 429, 500, 503
- Authentication and authorization (valid/invalid/expired tokens)
- Role-based access control (horizontal privilege escalation)
- Rate limiting and account lockout
- SQL injection and XSS in all input fields
- Race conditions and concurrent requests
- No stack traces or sensitive info in error responses

**Mobile**
- iOS and Android specific behavior
- Touch gestures: tap, long-press, swipe, pinch-zoom
- Interruptions: incoming call, SMS, low battery — app must not lose state
- Network transitions: Wi-Fi → 4G, airplane mode, disconnect mid-request
- Permissions: Allow, Deny, "Don't ask again" states
- Orientation change, deep links, biometric fallback

---

## Running Tests

```bash
npm test
```

12 unit tests covering prompt generation, scenario parsing, and the analyzer.

---

## Tech Stack

- **TypeScript** — fully typed throughout
- **Claude AI (claude-sonnet-4-6)** — reasoning engine via Anthropic SDK
- **Node.js** — CLI runtime
- **Jest** — unit tests

---

## License

MIT — built by [Anand Jeyakumar](https://www.linkedin.com/in/anand-jeyakumar)

# Magnitude Playwright Generator

AI-powered tool that automatically generates Playwright test suites by exploring your web application.

## Overview

This tool uses Magnitude (with AI vision) to:
1. Explore your web application autonomously or follow guided scenarios
2. Understand page structures, forms, and user flows
3. Generate complete Playwright test suites with best practices

The generated tests are **pure Playwright** - no Magnitude dependency at runtime, fast execution, suitable for CI/CD.

## Installation

```bash
npm install -g magnitude-playwright-generator
```

## Usage

### Autonomous Mode (Discovers flows automatically)

```bash
# Using Claude Code subscription (no API key needed!)
magnitude-generate-tests generate \
  --url https://your-app.com \
  --autonomous

# Or with explicit provider
magnitude-generate-tests generate \
  --url https://your-app.com \
  --autonomous \
  --provider claude-code \
  --model claude-sonnet-4.5
```

### Scenario-Based Mode (Guided exploration)

Create a `scenarios.json` file:

```json
[
  {
    "name": "login-flow",
    "description": "Test user login with valid credentials",
    "steps": [
      "Navigate to login page",
      "Fill in email and password",
      "Click login button",
      "Verify user is logged in"
    ]
  },
  {
    "name": "checkout-flow",
    "description": "Test e-commerce checkout process"
  }
]
```

Then run:

```bash
magnitude-generate-tests generate \
  --url https://your-app.com \
  --scenarios scenarios.json \
  --output ./my-tests
```

## LLM Providers

Supports multiple LLM providers. **Recommended:** Use `claude-code` to leverage your existing Claude Code subscription!

### Claude Code (Recommended - Uses Your Subscription!)

```bash
# Sonnet 4.5 (default, recommended)
--provider claude-code --model claude-sonnet-4-5-20250929
# No API key needed! Uses your Claude Code Pro/Max subscription

# Sonnet 3.5 (stable, well-tested)
--provider claude-code --model claude-3-5-sonnet-20241022

# Or just use defaults (uses Sonnet 4.5)
--provider claude-code
```

**Note:** Model identifiers use full names with dates:
- Claude Code: `claude-sonnet-4-5-20250929`, `claude-3-5-sonnet-20241022`
- Anthropic API: Same format
- Bedrock: `anthropic.claude-sonnet-4-5-20250929` (with prefix)

### Other Supported Providers

```bash
# Anthropic API (requires API key)
--provider anthropic --model claude-sonnet-4.5
export ANTHROPIC_API_KEY=your-key

# AWS Bedrock
--provider aws-bedrock --model anthropic.claude-sonnet-4-5-20250929
# Uses AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION env vars

# OpenAI
--provider openai --model gpt-4o
export OPENAI_API_KEY=your-key

# Google AI Studio
--provider google-ai --model gemini-2.5-pro
export GOOGLE_API_KEY=your-key

# Google Vertex AI
--provider vertex-ai --model gemini-2.5-pro
# Requires GCP credentials configuration

# Azure OpenAI
--provider azure-openai --model gpt-4
# Requires resource name, deployment ID, API version, and API key

# OpenAI-Compatible APIs (Ollama, etc.)
--provider openai-generic --model your-model
# Requires baseUrl and optional API key
```

## How It Works

1. **Exploration Phase:**
   - Magnitude agent (with vision AI) explores your application
   - Uses Playwright selectors for reliable interaction
   - Captures page structures, forms, buttons, and navigation

2. **Generation Phase:**
   - Analyzes captured page structures
   - Generates idiomatic Playwright test code
   - Creates full test suite scaffold with configuration

3. **Output:**
   - Complete test suite in `./generated-tests/`
   - Ready to run with `npx playwright test`
   - No Magnitude dependency - pure Playwright!

## Generated Files

```
generated-tests/
├── tests/
│   ├── auth-flow.spec.ts
│   ├── navigation-flow.spec.ts
│   └── form-interaction.spec.ts
├── playwright.config.ts
├── package.json
├── .gitignore
└── README.md
```

## Requirements

- Node.js >= 18
- Claude Code subscription (recommended) OR API key for LLM provider (Anthropic, OpenAI, etc.)
- Web application to test (can be localhost)
- **Optional:** Mailinator account for email verification testing

## Email Verification Support

Many applications require email verification during signup. The test generator can automatically handle this!

### Setup Mailinator

1. **Get a Mailinator account** at [mailinator.com](https://www.mailinator.com)
2. **Get your API key** from Mailinator dashboard
3. **Get your team domain** (e.g., `@team123456.testinator.com`)

### Configure Email Verification

**Via Environment Variables (Recommended):**

```bash
export MAILINATOR_API_KEY=your-api-key-here
export MAILINATOR_DOMAIN=@team123456.testinator.com

# Now run test generation
magnitude-generate-tests generate --url https://your-app.com --autonomous
```

**Via Command Line:**

```bash
magnitude-generate-tests generate \
  --url https://your-app.com \
  --autonomous \
  --email-api-key your-api-key-here \
  --email-domain @team123456.testinator.com
```

### How It Works

When email verification is configured:

1. **Email Generation:** Tool automatically generates unique test emails (e.g., `test-1731181234567-abc@team123456.testinator.com`)
2. **Form Filling:** Agent uses the test email in signup forms
3. **Verification Detection:** Detects "verification code" or "OTP" fields in the page
4. **Email Polling:** Automatically checks Mailinator inbox for verification emails (30-second timeout)
5. **Code Extraction:** Extracts verification codes using smart patterns:
   - 6-digit codes: `123456`
   - Formatted codes: `1234-5678-9012-3456`
   - Space-separated: `1234 5678`

### Generated Test Output

Tests will include email verification steps:

```typescript
test('signup flow', async ({ page }) => {
  // Generate test email for signup/verification
  const testEmail = 'test-1731181234567-abc@team123456.testinator.com';

  await page.getByLabel('Email').fill(testEmail);
  await page.getByLabel('Password').fill('SecurePassword123!');
  await page.getByRole('button', { name: 'Sign Up' }).click();

  // Email verification detected
  // TODO: Integrate email service to fetch verification code
  // During exploration, verification code was: 123456
  // await page.getByLabel('Verification Code').fill(verificationCode);
});
```

### Without Email Verification

If you don't configure email verification:
- Tool works normally but will pause at verification steps
- Generated tests will have TODOs for manual email handling
- You'll need to manually add email verification logic later

## Examples

### Generate tests for local development server

```bash
# Uses Claude Code by default (no API key needed!)
magnitude-generate-tests generate \
  --url http://localhost:3000 \
  --autonomous
```

### Generate specific scenario tests

```bash
magnitude-generate-tests example-scenarios  # Creates scenarios.json template

# Edit scenarios.json, then:
magnitude-generate-tests generate \
  --url https://your-app.com \
  --scenarios scenarios.json
```

### Use different LLM provider

```bash
# With Anthropic API
magnitude-generate-tests generate \
  --url https://your-app.com \
  --autonomous \
  --provider anthropic \
  --api-key $ANTHROPIC_API_KEY
```

## Current Limitations (MVP)

- Template-based code generation (LLM-enhanced generation coming soon)
- Tests include TODOs for manual refinement
- Best suited for standard web forms and navigation
- Complex SPAs may need manual test adjustments

## Roadmap

- [ ] LLM-based intelligent test code generation
- [ ] Data fixture generation
- [ ] Screenshot-based visual regression tests
- [ ] API mocking setup
- [ ] CI/CD integration templates

## Learn More

- [Magnitude Documentation](https://docs.magnitude.run)
- [Playwright Documentation](https://playwright.dev)

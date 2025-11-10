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
magnitude-generate-tests generate \
  --url https://your-app.com \
  --autonomous \
  --provider anthropic \
  --api-key your-api-key
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

Supports multiple LLM providers:

```bash
# Anthropic Claude (default)
--provider anthropic --model claude-sonnet-4.5
export ANTHROPIC_API_KEY=your-key

# OpenAI
--provider openai --model gpt-4o
export OPENAI_API_KEY=your-key

# AWS Bedrock
--provider bedrock --model anthropic.claude-sonnet-4-5-20250929
export AWS_ACCESS_KEY_ID=your-key

# Google AI
--provider google-ai --model gemini-2.5-pro
export GOOGLE_API_KEY=your-key
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
- API key for LLM provider (Anthropic, OpenAI, etc.)
- Web application to test (can be localhost)

## Examples

### Generate tests for local development server

```bash
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

#!/usr/bin/env node

import { Command } from 'commander';
import { generatePlaywrightTests } from './index';
import { TestScenario } from './types';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
    .name('magnitude-generate-tests')
    .description('Generate Playwright test suites using AI')
    .version('0.1.0');

program
    .command('generate')
    .description('Generate Playwright tests for a web application')
    .requiredOption('-u, --url <url>', 'Base URL of the application to test')
    .option('-o, --output <dir>', 'Output directory for generated tests', './generated-tests')
    .option('-s, --scenarios <file>', 'Path to JSON file with test scenarios')
    .option('-a, --autonomous', 'Autonomous exploration mode (no scenarios needed)', true)
    .option('--provider <provider>', 'LLM provider (anthropic, openai, bedrock, google-ai)', 'anthropic')
    .option('--model <model>', 'Model name (e.g., claude-sonnet-4.5, gpt-4o)', 'claude-sonnet-4.5')
    .option('--api-key <key>', 'API key for LLM provider (or use ANTHROPIC_API_KEY env var)')
    .action(async (opts) => {
        try {
            let scenarios: TestScenario[] | undefined;

            // Load scenarios from file if provided
            if (opts.scenarios) {
                const scenariosPath = path.resolve(opts.scenarios);
                if (!fs.existsSync(scenariosPath)) {
                    console.error(`❌ Scenarios file not found: ${scenariosPath}`);
                    process.exit(1);
                }

                const scenariosContent = fs.readFileSync(scenariosPath, 'utf-8');
                scenarios = JSON.parse(scenariosContent);
                console.log(`📋 Loaded ${scenarios!.length} scenario(s) from ${opts.scenarios}`);
            }

            // Configure LLM
            const apiKey = opts.apiKey ||
                          process.env.ANTHROPIC_API_KEY ||
                          process.env.OPENAI_API_KEY ||
                          process.env.GOOGLE_API_KEY;

            if (!apiKey) {
                console.error(`❌ API key required. Provide via --api-key or set ANTHROPIC_API_KEY env var`);
                process.exit(1);
            }

            const llmClient: any = {
                provider: opts.provider,
                options: {
                    model: opts.model,
                    apiKey: apiKey
                }
            };

            // Generate tests
            const outputPath = await generatePlaywrightTests({
                url: opts.url,
                scenarios,
                autonomous: opts.autonomous,
                outputDir: opts.output,
                llm: llmClient
            });

            console.log(`\n✅ Success! Test suite generated at: ${outputPath}`);
        } catch (error) {
            console.error(`\n❌ Error:`, error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command('example-scenarios')
    .description('Generate an example scenarios.json file')
    .option('-o, --output <file>', 'Output file path', './scenarios.json')
    .action((opts) => {
        const exampleScenarios: TestScenario[] = [
            {
                name: 'login-flow',
                description: 'Test user login with valid credentials',
                steps: [
                    'Navigate to login page',
                    'Fill in email field with test@example.com',
                    'Fill in password field with password123',
                    'Click login button',
                    'Verify user is logged in'
                ]
            },
            {
                name: 'signup-flow',
                description: 'Test user registration',
                steps: [
                    'Navigate to signup page',
                    'Fill in registration form',
                    'Submit the form',
                    'Verify account was created'
                ]
            },
            {
                name: 'navigation-test',
                description: 'Test navigation between main sections'
            }
        ];

        fs.writeFileSync(opts.output, JSON.stringify(exampleScenarios, null, 2));
        console.log(`✓ Example scenarios written to: ${opts.output}`);
        console.log(`\nEdit this file and run:`);
        console.log(`  magnitude-generate-tests generate --url YOUR_URL --scenarios ${opts.output}`);
    });

program.parse();

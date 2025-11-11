#!/usr/bin/env node

import { Command } from 'commander';
import { generatePlaywrightTests } from './index';
import { TestScenario } from './types';
import { LogConfigManager } from './logging/config';
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
    .option('--provider <provider>', 'LLM provider (claude-code, anthropic, openai, aws-bedrock, google-ai, vertex-ai, azure-openai, openai-generic)', 'claude-code')
    .option('--model <model>', 'Model name (e.g., claude-sonnet-4-5-20250929, claude-3-5-sonnet-20241022)', 'claude-sonnet-4-5-20250929')
    .option('--api-key <key>', 'API key for LLM provider (not needed for claude-code)')
    .option('--email-api-key <key>', 'Mailinator API key (or use MAILINATOR_API_KEY env var)')
    .option('--email-domain <domain>', 'Mailinator domain (or use MAILINATOR_DOMAIN env var)')
    .option('--log-dir <dir>', 'Directory for debug logs (or use MAGNITUDE_LOG_DIR env var)')
    .option('--log-baml', 'Save BAML prompts and responses (or use MAGNITUDE_LOG_BAML=true)')
    .option('--log-actions', 'Save actions and reasoning (or use MAGNITUDE_LOG_ACTIONS=true)')
    .option('--log-screenshots', 'Save all screenshots (or use MAGNITUDE_LOG_SCREENSHOTS=true)')
    .option('--log-network', 'Save network requests (or use MAGNITUDE_LOG_NETWORK=true)')
    .option('--toast-detection <mode>', 'Toast detection mode: auto (default), always, never', 'auto')
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
            const llmClient: any = {
                provider: opts.provider,
                options: {
                    model: opts.model
                }
            };

            // API key not needed for claude-code provider
            if (opts.provider !== 'claude-code') {
                const apiKey = opts.apiKey ||
                              process.env.ANTHROPIC_API_KEY ||
                              process.env.OPENAI_API_KEY ||
                              process.env.GOOGLE_API_KEY;

                if (!apiKey) {
                    console.error(`❌ API key required for provider: ${opts.provider}`);
                    console.log(`\nProvide via --api-key flag or environment variable:`);
                    console.log(`  ANTHROPIC_API_KEY (for anthropic)`);
                    console.log(`  OPENAI_API_KEY (for openai)`);
                    console.log(`  GOOGLE_API_KEY (for google-ai)`);
                    console.log(`\nOr use --provider claude-code (no API key needed!)`);
                    process.exit(1);
                }

                llmClient.options.apiKey = apiKey;
            }

            // Configure email service if credentials provided
            let emailConfig;
            const emailApiKey = opts.emailApiKey || process.env.MAILINATOR_API_KEY;
            const emailDomain = opts.emailDomain || process.env.MAILINATOR_DOMAIN;

            if (emailApiKey && emailDomain) {
                emailConfig = {
                    provider: 'mailinator' as const,
                    apiKey: emailApiKey,
                    domain: emailDomain
                };
                console.log(`✓ Email verification enabled (Mailinator)`);
            } else if (emailApiKey || emailDomain) {
                console.warn(`⚠ Email configuration incomplete. Need both MAILINATOR_API_KEY and MAILINATOR_DOMAIN.`);
            }

            // Configure logging
            const logConfig = new LogConfigManager();
            if (opts.logDir) process.env.MAGNITUDE_LOG_DIR = opts.logDir;
            logConfig.updateFromCLIFlags({
                logBaml: opts.logBaml,
                logActions: opts.logActions,
                logScreenshots: opts.logScreenshots,
                logNetwork: opts.logNetwork,
                logDir: opts.logDir
            });

            // Validate toast detection mode
            const toastMode = opts.toastDetection as 'auto' | 'always' | 'never';
            if (!['auto', 'always', 'never'].includes(toastMode)) {
                console.error(`❌ Invalid toast detection mode: ${opts.toastDetection}`);
                console.log(`   Valid options: auto, always, never`);
                process.exit(1);
            }

            // Generate tests
            const outputPath = await generatePlaywrightTests({
                url: opts.url,
                scenarios,
                autonomous: opts.autonomous,
                outputDir: opts.output,
                llm: llmClient,
                email: emailConfig,
                toastDetectionMode: toastMode,
                logging: logConfig.getConfig().enabled ? {
                    enabled: true,
                    sessionDir: logConfig.getSessionDir(),
                    logDir: logConfig.getConfig().logDir,
                    baml: logConfig.getConfig().baml,
                    actions: logConfig.getConfig().actions,
                    screenshots: logConfig.getConfig().screenshots,
                    network: logConfig.getConfig().network
                } : undefined
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

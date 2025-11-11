import { BrowserAgent, BrowserConnector, startBrowserAgent } from 'magnitude-core';
import { TestScenario, GeneratorOptions } from './types';
import { EmailService } from './emailService';
import { LogArchiver } from './logging/archiver';

interface ExplorationResult {
    scenario: string;
    description: string;
    pageStructure: string;
    interactions: string[];
    url: string;
    emailUsed?: string;
    verificationCode?: string;
}

export class ApplicationExplorer {
    private agent: BrowserAgent | null = null;
    private baseURL: string;
    private explorationResults: ExplorationResult[] = [];
    private emailService: EmailService | null = null;
    private currentTestEmail: string | null = null;
    private logArchiver: LogArchiver | null = null;

    constructor(private options: GeneratorOptions) {
        this.baseURL = options.url;

        // Initialize email service if configured
        if (options.email) {
            this.emailService = new EmailService(options.email);
            console.log(`📧 Email service configured: ${options.email.domain}`);
        }

        // Initialize logging if configured
        if (options.logging?.enabled) {
            this.logArchiver = new LogArchiver(options.logging, options.logging.sessionDir);
        }
    }

    async start() {
        // Build custom prompt with email capabilities
        let customPrompt = 'You are exploring a web application to generate Playwright tests.';

        if (this.emailService) {
            this.currentTestEmail = this.emailService.generateEmail('test');
            customPrompt += `\n\nEmail Verification Support:
- When you encounter email fields during signup/registration, use this test email: ${this.currentTestEmail}
- If you encounter a "verification code" or "OTP" field, PAUSE and note that email verification is required
- The test will automatically check for verification emails and extract codes
- Continue the flow after noting the verification step`;
        }

        // Initialize Magnitude agent with selectors enabled
        const agentConfig: any = {
            url: this.baseURL,
            connector: new BrowserConnector({
                enableSelectors: true,  // Enable playwright selectors for reliable interaction
                enableConsoleMonitoring: true,
                enableNetworkMonitoring: true,
                toastDetectionMode: this.options.toastDetectionMode || 'auto'
            }),
            prompt: customPrompt,
            narrate: true  // Show what it's doing
        };

        // Add LLM configuration if provided
        if (this.options.llm) {
            agentConfig.llm = this.options.llm;
        }

        this.agent = await startBrowserAgent(agentConfig);

        // Hook into agent events for logging
        if (this.logArchiver) {
            this.setupLogging();
        }

        console.log(`🔍 Started exploration of: ${this.baseURL}`);
        if (this.currentTestEmail) {
            console.log(`📧 Test email generated: ${this.currentTestEmail}`);
        }
    }

    private setupLogging() {
        if (!this.agent || !this.logArchiver) return;

        console.log(`📝 Logging enabled: ${this.logArchiver.getSessionDir()}`);

        // TODO: Hook into BrowserAgent events when available
        // For now, screenshots are saved after each scenario completes
    }

    async explore() {
        if (!this.agent) {
            throw new Error('Explorer not started. Call start() first.');
        }

        if (this.options.scenarios && this.options.scenarios.length > 0) {
            // Prompt-based mode: Execute specified scenarios
            for (const scenario of this.options.scenarios) {
                await this.exploreScenario(scenario);
            }
        } else if (this.options.autonomous) {
            // Autonomous mode: Discover and test everything
            await this.autonomousExploration();
        } else {
            throw new Error('Must provide scenarios or enable autonomous mode');
        }
    }

    private async exploreScenario(scenario: TestScenario) {
        console.log(`\n📝 Exploring scenario: ${scenario.name}`);

        // Reset to base URL for each scenario
        await this.agent!.nav(this.baseURL);

        if (scenario.steps && scenario.steps.length > 0) {
            // User provided specific steps
            for (const step of scenario.steps) {
                console.log(`  → ${step}`);
                await this.agent!.act(step);
            }
        } else {
            // LLM figures out the scenario based on description
            console.log(`  → Executing: ${scenario.description}`);
            await this.agent!.act(scenario.description);
        }

        // Capture page structure after exploration
        const harness = this.agent!.getHarness();
        const html = await harness.getPageHTML();
        const a11yTree = await harness.getAccessibilityTree();

        // Check if email verification is needed
        let verificationCode: string | undefined;
        if (this.emailService && this.currentTestEmail) {
            const needsVerification = html.toLowerCase().includes('verification') ||
                                     html.toLowerCase().includes('verify') ||
                                     html.toLowerCase().includes('code');

            if (needsVerification) {
                console.log(`  🔍 Email verification detected, checking inbox...`);
                verificationCode = await this.handleEmailVerification();
            }
        }

        // Save screenshot if logging enabled
        if (this.logArchiver) {
            try {
                const screenshot = await harness.screenshot();
                const buffer = Buffer.from(await screenshot.toBase64(), 'base64');
                await this.logArchiver.saveScreenshot(buffer, scenario.name);
            } catch (error) {
                console.warn('Failed to save screenshot:', error);
            }
        }

        // Store exploration result with page structure
        this.explorationResults.push({
            scenario: scenario.name,
            description: scenario.description,
            pageStructure: this.summarizePageStructure(html, a11yTree),
            interactions: scenario.steps || [scenario.description],
            url: this.agent!.page.url(),
            emailUsed: this.currentTestEmail || undefined,
            verificationCode
        });

        console.log(`✓ Scenario complete: ${scenario.name}`);
    }

    private async handleEmailVerification(): Promise<string | undefined> {
        if (!this.emailService || !this.currentTestEmail) {
            return undefined;
        }

        try {
            // Wait for verification email
            const email = await this.emailService.waitForEmail(this.currentTestEmail, {
                timeout: 30000,
                pollInterval: 2000
            });

            if (!email) {
                console.log(`  ⚠ No verification email received`);
                return undefined;
            }

            // Extract verification code
            const code = await this.emailService.extractVerificationCode(email);

            if (code) {
                console.log(`  ✓ Verification code found: ${code}`);
                // TODO: Could automatically fill the code here if we detect the field
                return code;
            } else {
                console.log(`  ⚠ No verification code found in email`);
                return undefined;
            }
        } catch (error) {
            console.error(`  ❌ Email verification failed:`, error);
            return undefined;
        }
    }

    private summarizePageStructure(html: string, a11yTree: any): string {
        // Extract key interactive elements from HTML
        const formMatches = html.match(/<form[^>]*>/g) || [];
        const inputMatches = html.match(/<input[^>]*>/g) || [];
        const buttonMatches = html.match(/<button[^>]*>/g) || [];

        const summary = {
            forms: formMatches.length,
            inputs: inputMatches.length,
            buttons: buttonMatches.length,
            hasAccessibilityTree: !!a11yTree,
            sampleInputs: inputMatches.slice(0, 5),  // First 5 inputs
            sampleButtons: buttonMatches.slice(0, 5)  // First 5 buttons
        };

        return JSON.stringify(summary, null, 2);
    }

    private async autonomousExploration() {
        console.log(`\n🤖 Starting autonomous exploration...`);

        // Get initial page structure
        const harness = this.agent!.getHarness();
        const html = await harness.getPageHTML();
        const a11yTree = await harness.getAccessibilityTree();

        // Phase 1: Discover main flows
        const commonFlows = [
            { name: 'auth-flow', description: 'Explore login and signup functionality if available' },
            { name: 'navigation-flow', description: 'Navigate through main sections of the site' },
            { name: 'form-interaction', description: 'Find and interact with any forms on the site' },
            { name: 'critical-paths', description: 'Identify and test critical user paths' }
        ];

        for (const flow of commonFlows) {
            try {
                console.log(`  Testing: ${flow.name}`);

                await this.agent!.nav(this.baseURL);  // Reset for each flow
                await this.agent!.act(flow.description);

                // Capture result
                const currentHTML = await harness.getPageHTML();
                const currentA11y = await harness.getAccessibilityTree();

                this.explorationResults.push({
                    scenario: flow.name,
                    description: flow.description,
                    pageStructure: this.summarizePageStructure(currentHTML, currentA11y),
                    interactions: [flow.description],
                    url: this.agent!.page.url()
                });

                console.log(`  ✓ ${flow.name} explored`);
            } catch (error) {
                console.log(`  ⚠ ${flow.name} skipped: ${error}`);
            }
        }

        console.log(`\n✓ Autonomous exploration complete`);
    }

    async stop() {
        if (this.agent) {
            await this.agent.stop();
            console.log(`\n✓ Exploration complete`);
        }
    }

    getExplorationResults(): ExplorationResult[] {
        return this.explorationResults;
    }
}

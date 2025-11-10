import { AgentConnector } from ".";
//import { Observation, BamlRenderable } from "@/memory";
import { WebHarness } from "@/web/harness";
import { ActionDefinition } from '@/actions';
import { webActions } from '@/actions/webActions';
import { Browser, BrowserContext, BrowserContextOptions, LaunchOptions } from "playwright";
import { BrowserOptions, BrowserProvider } from "@/web/browserProvider";
import logger from "@/logger";
import { Logger } from 'pino';
import { TabState } from '@/web/tabs';
import { Observation } from "@/memory/observation";
import { Image } from "@/memory/image";
import { ActionVisualizerOptions } from "@/web/visualizer";

// export type BrowserOptions = ({ instance: Browser } | { launchOptions?: LaunchOptions }) & {
//     contextOptions?: BrowserContextOptions;
// };

// const foo: BrowserOptions = {
//     launchOptions: {},
//     instance: {},

// }

// Changed back to 3 - too many situations where the amnesia of having only 1 is very problematic and makes agent act stupidly
// With caching, using 3 is relatively ok tradeoff
// Maybe try 2 for now, or could do 3 when prompt caching available else 2
const DEFAULT_MIN_RETAINED_SCREENSHOTS = 2;

export interface BrowserConnectorOptions {
    //browser?: Browser
    browser?: BrowserOptions
    url?: string
    //browserContextOptions?: BrowserContextOptions
    virtualScreenDimensions?: { width: number, height: number },
    minScreenshots?: number,
    visuals?: ActionVisualizerOptions
    enableConsoleMonitoring?: boolean  // Whether to capture console logs (default: true)
    enableNetworkMonitoring?: boolean  // Whether to capture network requests (default: true)
    consoleLogLimit?: number  // Maximum console logs to retain (default: 500, minimum: 10)
    networkRequestLimit?: number  // Maximum network requests to retain (default: 100, minimum: 10)
    enableSelectors?: boolean  // Whether to enable Playwright selector-based actions (default: false)
    toastDetectionMode?: 'auto' | 'always' | 'never'  // Toast detection mode (default: 'auto')
    toastDetectionDelay?: number  // Delay in ms to wait for toasts (default: 500)
}

export interface BrowserConnectorStateData {
    screenshot: Image;
    tabs: TabState;
}

export class BrowserConnector implements AgentConnector {
    public readonly id: string = "web";
    private harness!: WebHarness;
    private options: BrowserConnectorOptions;
    private browser?: Browser;
    private context!: BrowserContext;
    private logger: Logger;

    constructor(options: BrowserConnectorOptions = {}) {
        // console.log("options", options)
        // console.log("options.screenshotMemoryLimit", options.screenshotMemoryLimit)
        this.options = options;
        this.logger = logger.child({
            name: `connectors.${this.id}`
        });
    }


    async onStart(): Promise<void> {
        this.logger.info("Starting...");
        
        this.logger.info("Creating new browser context.");

        this.context = await BrowserProvider.getInstance().newContext(this.options.browser);

        //const contextOptions = this.options.browser && 'contextOptions' in this.options.browser ? this.options.browser.contextOptions : {};
        
        this.harness = new WebHarness(this.context, {
            //fallbackViewportDimensions: contextOptions?.viewport ?? { width: 1024, height: 768 },
            virtualScreenDimensions: this.options.virtualScreenDimensions,
            visuals: this.options.visuals,
            enableConsoleMonitoring: this.options.enableConsoleMonitoring,
            enableNetworkMonitoring: this.options.enableNetworkMonitoring,
            consoleLogLimit: this.options.consoleLogLimit,
            networkRequestLimit: this.options.networkRequestLimit,
            toastDetectionMode: this.options.toastDetectionMode,
            toastDetectionDelay: this.options.toastDetectionDelay
        });
        await this.harness.start();
        this.logger.info("WebHarness started.");

        if (this.options.url) {
            this.logger.info(`Navigating to initial URL: ${this.options.url}`);
            await this.harness.navigate(this.options.url);
            //await this.harness.waitForStability();
        }
        this.logger.info("Started successfully.");
    }

    async onStop(): Promise<void> {
        this.logger.info("Stopping...");
        if (this.harness) {
            await this.harness.stop();
            this.logger.info("WebHarness cleaned up.");
        }
        if (this.context) {
            await this.context.close();
            this.logger.info("Browser context closed.");
        }
        // Note: We don't close this.browser here if obtained from BrowserProvider,
        // as BrowserProvider manages the singleton browser lifecycle.
        // If this.options.browser was provided, its lifecycle is managed externally.
        this.logger.info("Stopped successfully.");
    }

    getActionSpace(): ActionDefinition<any>[] {
        return [...webActions];
    }
    
    // public get page(): Page {
    //     if (!this.harness || !this.harness.page) {
    //         throw new Error("WebInteractionConnector: Harness or Page is not available. Ensure onStart has completed.");
    //     }
    //     return this.harness.page;
    // }

    public getHarness(): WebHarness {
        if (!this.harness) {
            throw new Error("WebInteractionConnector: Harness is not available. Ensure onStart has completed.");
        }
        return this.harness;
    }

    private async captureCurrentState(): Promise<BrowserConnectorStateData> {
        if (!this.harness || !this.harness.page) {
            throw new Error("WebInteractionConnector: Harness or Page is not available for capturing state.");
        }
        const [screenshot, tabs] = await Promise.all([
            this.harness.screenshot(),
            this.harness.retrieveTabState()
        ]);
        //const resizedScreenshot = await screenshot.resize()
        // if (this.options.autoResize) {
        //     return { screenshot: await screenshot.resize(this.options.autoResize.width, this.options.autoResize.height), tabs: tabs };
        // }
        return { screenshot: await this.transformScreenshot(screenshot), tabs: tabs };
    }

    async transformScreenshot(screenshot: Image): Promise<Image> {
        if (this.options.virtualScreenDimensions) {
            return await screenshot.resize(this.options.virtualScreenDimensions.width, this.options.virtualScreenDimensions.height);
        } else {
            return screenshot;
        }
    }

    public async getLastScreenshot(): Promise<Image> {
        //return { image: "", dimensions: { width: 0, height: 0 } };
        // TODO: better to use last
        return (await this.captureCurrentState()).screenshot;
    }

    async collectObservations(): Promise<Observation[]> {
        const currentState = await this.captureCurrentState();
        const observations: Observation[] = [];

        const currentTabs = currentState.tabs;
        let tabInfo = "Open Tabs:\n";
        currentTabs.tabs.forEach((tab, index) => {
            tabInfo += `${index === currentTabs.activeTab ? '[ACTIVE] ' : ''}${tab.title} (${tab.url})`;
        });

        //console.log("this.options.screenshotMemoryLimit", this.options.screenshotMemoryLimit);
        const screenshotLimit = this.options.minScreenshots ?? DEFAULT_MIN_RETAINED_SCREENSHOTS;
        //console.log("screenshotLimit:", screenshotLimit);

        observations.push(
            Observation.fromConnector(
                this.id,
                await this.transformScreenshot(currentState.screenshot),
                { type: 'screenshot', limit: screenshotLimit, dedupe: true }
            )
        );
        observations.push(
            Observation.fromConnector(
                this.id,
                tabInfo,
                { type: 'tabinfo', limit: 1 }
            )
        );

        // Detect and include toast notifications
        const toasts = await this.harness.getToasts();
        if (toasts.length > 0) {
            const toastInfo = toasts.map(t => {
                const icon = t.type === 'success' ? '🟢' : t.type === 'error' ? '🔴' : t.type === 'warning' ? '🟡' : 'ℹ️';
                return `${icon} Toast: ${t.text}`;
            }).join('\n');

            observations.push(
                Observation.fromConnector(
                    this.id,
                    toastInfo,
                    { type: 'toast', limit: 3 }  // Keep last 3 toasts
                )
            );
        }

        // Check network responses after actions (proactive error detection)
        const networkRequests = this.harness.getNetworkRequests(false);
        const recentRequests = networkRequests.slice(-5);  // Last 5 requests
        const failures = recentRequests.filter(r => r.status && r.status >= 400);

        if (failures.length > 0) {
            const failureInfo = failures.map(f =>
                `⚠️ Network: ${f.method} ${f.url} returned ${f.status} ${f.statusText}`
            ).join('\n');

            observations.push(
                Observation.fromConnector(
                    this.id,
                    failureInfo,
                    { type: 'network-errors', limit: 2 }
                )
            );
        }

        return observations;
    }

    async getInstructions(): Promise<void | string> {
        const enableConsole = this.options.enableConsoleMonitoring ?? true;
        const enableNetwork = this.options.enableNetworkMonitoring ?? true;
        const enableSelectors = this.options.enableSelectors ?? false;

        // Only provide instructions for enabled features
        const sections = [];

        if (enableSelectors) {
            sections.push(`## Playwright Selector-Based Actions

You have access to reliable Playwright-style selectors for interacting with elements. These are MUCH more reliable than visual clicking for forms, buttons, and standard interactive elements.

**Available selector actions:**
- \`click_text(text)\` - Click element containing text (most useful for buttons, links)
- \`click_role(role, name?)\` - Click by ARIA role (button, link, textbox, checkbox, radio)
- \`click_selector(selector)\` - Click by CSS selector (#id, .class, etc.)
- \`click_testid(testid)\` - Click by data-testid attribute
- \`fill_by_label(label, value)\` - Fill input by its label text
- \`fill_by_placeholder(placeholder, value)\` - Fill input by placeholder text
- \`fill_selector(selector, value)\` - Fill input by CSS selector

**When to use selector actions:**
- Forms with labels/placeholders - use fill_by_label or fill_by_placeholder
- Buttons with text - use click_text
- Standard UI elements - use click_role
- Known selectors - use click_selector

**When to use visual actions:**
- Exploring unknown interfaces
- Complex visual layouts
- Canvas or image-based UIs
- Custom components without semantic markup

Use selector actions PREFERENTIALLY for reliability and speed when elements have known text, labels, or roles.`);
        }

        sections.push(`## Page Content Inspection
- You can retrieve the full HTML content of any page to inspect DOM structure, find specific elements, and understand the page layout
- You can access the accessibility tree which provides a structured view of interactive elements with their roles, names, and states
- Use these when you need to locate specific elements reliably (e.g., forms, buttons, inputs) or verify page structure

## Toast Notifications & Feedback
- Toast notifications (success/error messages) are automatically detected and shown with each observation
- Pay close attention to toasts as they indicate whether your actions succeeded or failed
- Format: "🟢 Toast: Action successful!" or "🔴 Toast: Error message"
- If you see an error toast, adjust your approach accordingly

## Network Response Monitoring
- Failed network requests (4xx/5xx) are automatically highlighted
- After form submissions or critical actions, check for network errors
- Format: "⚠️ Network: POST /api/register returned 400 Bad Request"
- Network failures often explain why visual feedback is missing`);


        if (enableConsole) {
            sections.push(`## Console Monitoring
- Browser console messages (logs, errors, warnings) are automatically captured
- Use this to debug JavaScript errors, check for console warnings, or verify that expected logs appear
- Particularly useful for debugging why interactions might be failing or for test assertions`);
        }

        if (enableNetwork) {
            sections.push(`## Network Monitoring
- All network requests are automatically tracked including URLs, methods, status codes, and headers
- Use this to verify API calls are being made correctly, check response statuses, or debug loading issues
- Helpful for ensuring data is being fetched/submitted properly during test flows`);
        }

        // Build best practices based on enabled features
        const bestPractices = [
            '- When form filling fails or elements are hard to locate visually, inspect the HTML/accessibility tree first'
        ];
        if (enableConsole) {
            bestPractices.push('- If interactions seem to fail silently, check console logs for JavaScript errors');
        }
        if (enableNetwork) {
            bestPractices.push('- For data submission flows, verify network requests to confirm data is being sent correctly');
        }
        bestPractices.push('- These inspection tools are faster and more reliable than trying to visually locate elements in screenshots');

        sections.push(`## Best Practices\n${bestPractices.join('\n')}`);

        return `You have access to advanced browser inspection capabilities beyond just screenshots:\n\n${sections.join('\n\n')}`;
    }
}

import { Page } from 'playwright';

export interface DetectedToast {
    text: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'unknown';
    boundingBox?: { x: number, y: number, width: number, height: number };
    timestamp: number;
}

export class ToastDetector {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Check if the page has toast/notification capability
     * This is done once per page to avoid unnecessary delays
     */
    async detectToastCapability(): Promise<boolean> {
        try {
            return await this.page.evaluate(() => {
                // Check for toast library globals
                if ((window as any).Toastify || (window as any).sonner) {
                    return true;
                }

                // Check for toast container elements
                const selectors = [
                    '[data-sonner-toaster]',    // Sonner
                    '.Toastify',                 // react-toastify
                    '.toast-container',          // Generic
                    '[aria-live="polite"]',      // ARIA live regions
                    '[aria-live="assertive"]',
                    '[role="alert"]',
                    '[role="status"]'
                ];

                for (const selector of selectors) {
                    if (document.querySelector(selector)) {
                        return true;
                    }
                }

                // Check loaded scripts for toast library keywords
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                const hasToastLib = scripts.some((s: any) =>
                    s.src && (
                        s.src.includes('toast') ||
                        s.src.includes('sonner') ||
                        s.src.includes('notification') ||
                        s.src.includes('Toastify')
                    )
                );

                if (hasToastLib) {
                    return true;
                }

                // Check for toast-related classes in the document
                const hasToastClasses = !!document.querySelector('[class*="toast" i], [class*="notification" i]');

                return hasToastClasses;
            });
        } catch (error) {
            console.warn('Toast capability detection failed:', error);
            return false;  // Assume no toasts on error
        }
    }

    async detectToasts(): Promise<DetectedToast[]> {
        const toasts: DetectedToast[] = [];

        try {
            // Strategy 1: Check accessibility tree for alert/status roles
            const a11yToasts = await this.detectViaAccessibility();
            toasts.push(...a11yToasts);

            // Strategy 2: Query DOM for common toast patterns
            const domToasts = await this.detectViaDOMQuery();
            toasts.push(...domToasts);

            // Deduplicate by text content
            const uniqueToasts = this.deduplicateToasts(toasts);

            return uniqueToasts;
        } catch (error) {
            console.warn('Toast detection failed:', error);
            return [];
        }
    }

    private async detectViaAccessibility(): Promise<DetectedToast[]> {
        const snapshot = await this.page.accessibility.snapshot();
        if (!snapshot) return [];

        const toasts: DetectedToast[] = [];

        const findAlerts = (node: any): void => {
            // Look for alert, status, or log roles (ARIA live regions)
            if (node.role === 'alert' || node.role === 'status' || node.role === 'log') {
                if (node.name || node.value) {
                    toasts.push({
                        text: node.name || node.value || '',
                        type: this.inferTypeFromText(node.name || node.value || ''),
                        timestamp: Date.now()
                    });
                }
            }

            // Recursively check children
            if (node.children) {
                for (const child of node.children) {
                    findAlerts(child);
                }
            }
        };

        findAlerts(snapshot);
        return toasts;
    }

    private async detectViaDOMQuery(): Promise<DetectedToast[]> {
        // Query page for common toast selectors
        const toastData = await this.page.evaluate(() => {
            const selectors = [
                '.toast',
                '.notification',
                '[role="alert"]',
                '[role="status"]',
                '[aria-live="polite"]',
                '[aria-live="assertive"]',
                '.Toastify__toast',  // react-toastify
                '[data-sonner-toast]',  // sonner
                '[data-radix-toast-viewport]'  // radix-ui
            ];

            const found: any[] = [];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach((el: Element) => {
                    const rect = el.getBoundingClientRect();
                    // Only include visible toasts
                    if (rect.width > 0 && rect.height > 0) {
                        found.push({
                            text: el.textContent?.trim() || '',
                            boundingBox: {
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height
                            }
                        });
                    }
                });
            }

            return found;
        });

        return toastData.map((toast: any) => ({
            text: toast.text,
            type: this.inferTypeFromText(toast.text),
            boundingBox: toast.boundingBox,
            timestamp: Date.now()
        }));
    }

    private inferTypeFromText(text: string): DetectedToast['type'] {
        const lower = text.toLowerCase();

        if (lower.includes('success') || lower.includes('confirmed') || lower.includes('✓') || lower.includes('✔')) {
            return 'success';
        }
        if (lower.includes('error') || lower.includes('failed') || lower.includes('✗') || lower.includes('✘')) {
            return 'error';
        }
        if (lower.includes('warning') || lower.includes('caution') || lower.includes('⚠')) {
            return 'warning';
        }
        if (lower.includes('info') || lower.includes('note') || lower.includes('ℹ')) {
            return 'info';
        }

        return 'unknown';
    }

    private deduplicateToasts(toasts: DetectedToast[]): DetectedToast[] {
        const seen = new Set<string>();
        const unique: DetectedToast[] = [];

        for (const toast of toasts) {
            const key = toast.text.toLowerCase().trim();
            if (key && !seen.has(key)) {
                seen.add(key);
                unique.push(toast);
            }
        }

        return unique;
    }

    /**
     * Draw bounding boxes around toasts on a screenshot
     * Returns modified screenshot buffer
     */
    async highlightToastsOnScreenshot(screenshotBuffer: Buffer, toasts: DetectedToast[]): Promise<Buffer> {
        // Use Playwright's page.evaluate to draw on canvas
        // This would require canvas manipulation in the browser context
        // For MVP, we can skip visual highlighting and just return original buffer
        // TODO: Implement canvas-based highlighting
        return screenshotBuffer;
    }
}

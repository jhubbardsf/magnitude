import { RecordedTest, RecordedAction, RecordedAssertion, GeneratedTest } from './types';

export class PlaywrightCodeGenerator {
    generateTest(test: RecordedTest): GeneratedTest {
        const filename = this.sanitizeFilename(test.name) + '.spec.ts';
        const code = this.generateTestCode(test);

        return { filename, code };
    }

    private sanitizeFilename(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    private generateTestCode(test: RecordedTest): string {
        const imports = `import { test, expect } from '@playwright/test';`;

        const testBody = `
test.describe('${test.name}', () => {
  test('${test.description}', async ({ page }) => {
    // Navigate to starting URL
    await page.goto('${test.url}');

${this.generateActionCode(test.actions)}

${this.generateAssertionCode(test.assertions)}
  });
});`;

        return `${imports}\n${testBody}\n`;
    }

    private generateActionCode(actions: RecordedAction[]): string {
        const lines: string[] = [];

        for (const action of actions) {
            switch (action.type) {
                case 'click_text':
                    lines.push(`    // Click element with text: "${action.text}"`);
                    lines.push(`    await page.getByText('${this.escapeString(action.text!)}').click();`);
                    break;

                case 'click_selector':
                    lines.push(`    // Click element: ${action.selector}`);
                    lines.push(`    await page.locator('${this.escapeString(action.selector!)}').click();`);
                    break;

                case 'fill_by_label':
                    lines.push(`    // Fill field: ${action.label}`);
                    if (this.isStaticValue(action.value!)) {
                        lines.push(`    await page.getByLabel('${this.escapeString(action.label!)}').fill('${this.escapeString(action.value!)}');`);
                    } else {
                        // Parameterize dynamic values
                        const varName = this.toVariableName(action.label!);
                        lines.push(`    await page.getByLabel('${this.escapeString(action.label!)}').fill(${varName});`);
                    }
                    break;

                case 'fill_by_placeholder':
                    lines.push(`    // Fill field by placeholder: ${action.placeholder}`);
                    if (this.isStaticValue(action.value!)) {
                        lines.push(`    await page.getByPlaceholder('${this.escapeString(action.placeholder!)}').fill('${this.escapeString(action.value!)}');`);
                    } else {
                        const varName = this.toVariableName(action.placeholder!);
                        lines.push(`    await page.getByPlaceholder('${this.escapeString(action.placeholder!)}').fill(${varName});`);
                    }
                    break;

                case 'fill_selector':
                    lines.push(`    // Fill input: ${action.selector}`);
                    if (this.isStaticValue(action.value!)) {
                        lines.push(`    await page.locator('${this.escapeString(action.selector!)}').fill('${this.escapeString(action.value!)}');`);
                    } else {
                        const varName = 'inputValue';
                        lines.push(`    await page.locator('${this.escapeString(action.selector!)}').fill(${varName});`);
                    }
                    break;

                case 'navigate':
                    lines.push(`    // Navigate to: ${action.url}`);
                    lines.push(`    await page.goto('${action.url}');`);
                    break;

                case 'wait':
                    lines.push(`    // Wait for page to load`);
                    lines.push(`    await page.waitForLoadState('networkidle');`);
                    break;
            }

            // Add spacing between actions
            if (lines.length > 0) {
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    private generateAssertionCode(assertions: RecordedAssertion[]): string {
        const lines: string[] = [];

        if (assertions.length > 0) {
            lines.push('    // Assertions');
        }

        for (const assertion of assertions) {
            switch (assertion.type) {
                case 'visible':
                    lines.push(`    await expect(page.locator('${this.escapeString(assertion.selector!)}')).toBeVisible();`);
                    break;

                case 'text_content':
                    lines.push(`    await expect(page.locator('${this.escapeString(assertion.selector!)}')).toHaveText('${this.escapeString(assertion.expected as string)}');`);
                    break;

                case 'url':
                    lines.push(`    expect(page.url()).toBe('${assertion.expected}');`);
                    break;

                case 'element_count':
                    lines.push(`    await expect(page.locator('${this.escapeString(assertion.selector!)}')).toHaveCount(${assertion.expected});`);
                    break;
            }
        }

        return lines.join('\n');
    }

    private escapeString(str: string): string {
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    private isStaticValue(value: string): boolean {
        // Heuristics for detecting if a value should be hardcoded or parameterized
        // Hardcode: URLs, emails, static text
        // Parameterize: User-generated content, dynamic IDs, timestamps

        // Check for email patterns
        if (value.includes('@') && value.includes('.')) {
            return false;  // Parameterize emails
        }

        // Check for URLs
        if (value.startsWith('http://') || value.startsWith('https://')) {
            return true;  // Hardcode URLs
        }

        // Check for timestamps or UUIDs
        if (/\d{13,}/.test(value) || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(value)) {
            return false;  // Parameterize dynamic IDs
        }

        // Short static text can be hardcoded
        if (value.length < 50 && !/\d{4,}/.test(value)) {
            return true;
        }

        // Default: parameterize for safety
        return false;
    }

    private toVariableName(label: string): string {
        return label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    }
}

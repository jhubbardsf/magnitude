import { LLMClient } from 'magnitude-core';
import { GeneratedTest } from './types';

interface ExplorationResult {
    scenario: string;
    description: string;
    pageStructure: string;
    interactions: string[];
    url: string;
}

export class TestCodeGenerator {
    private llm: LLMClient | undefined;

    constructor(llm?: LLMClient) {
        this.llm = llm;
    }

    async generateTests(explorationResults: ExplorationResult[]): Promise<GeneratedTest[]> {
        // TODO: Initialize model harness if LLM provided for enhanced code generation

        const generatedTests: GeneratedTest[] = [];

        for (const result of explorationResults) {
            console.log(`  Generating test for: ${result.scenario}`);

            const testCode = await this.generateTestCode(result);

            generatedTests.push({
                filename: this.sanitizeFilename(result.scenario) + '.spec.ts',
                code: testCode
            });
        }

        return generatedTests;
    }

    private async generateTestCode(exploration: ExplorationResult): Promise<string> {
        // For MVP: Generate template-based tests
        // TODO: Enhance with LLM-based code generation for smarter tests
        return this.generateEnhancedTemplate(exploration);
    }

    private extractCodeFromResponse(response: string): string {
        // Extract code block from LLM response
        const codeBlockMatch = response.match(/```typescript\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
            return codeBlockMatch[1];
        }

        // Or look for code blocks without language specifier
        const genericBlockMatch = response.match(/```\n([\s\S]*?)\n```/);
        if (genericBlockMatch) {
            return genericBlockMatch[1];
        }

        // Return raw response if no code blocks found
        return response;
    }

    private generateEnhancedTemplate(exploration: ExplorationResult): string {
        const testName = exploration.scenario.replace(/-/g, ' ');
        const pageStructure = JSON.parse(exploration.pageStructure);

        // Build test steps based on page structure
        const testSteps: string[] = [];

        // Add interactions as comments for context
        testSteps.push(`    // Exploration performed: ${exploration.interactions.join(', ')}`);
        testSteps.push('');

        // If forms detected, add form interaction example
        if (pageStructure.forms > 0) {
            testSteps.push(`    // TODO: Fill form fields (${pageStructure.inputs} inputs detected)`);
            testSteps.push(`    // Example: await page.getByLabel('Email').fill('test@example.com');`);
            testSteps.push('');
        }

        // If buttons detected, add button click example
        if (pageStructure.buttons > 0) {
            testSteps.push(`    // TODO: Click buttons (${pageStructure.buttons} buttons detected)`);
            testSteps.push(`    // Example: await page.getByRole('button', { name: 'Submit' }).click();`);
            testSteps.push('');
        }

        // Add navigation verification
        testSteps.push(`    // Verify navigation`);
        testSteps.push(`    await expect(page).toHaveURL('${exploration.url}');`);

        return `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test('${exploration.description}', async ({ page }) => {
    // Navigate to starting URL
    await page.goto('${exploration.url}');

${testSteps.join('\n')}
  });
});
`;
    }

    private sanitizeFilename(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}

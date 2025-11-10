import { ApplicationExplorer } from './explorer';
import { ScaffoldGenerator } from './scaffoldGenerator';
import { TestCodeGenerator } from './testCodeGenerator';
import { GeneratorOptions, TestScenario } from './types';
import { LLMClient } from 'magnitude-core';
import * as path from 'path';

export * from './types';
export { ApplicationExplorer } from './explorer';
export { TestRecorder } from './recorder';
export { PlaywrightCodeGenerator } from './codeGenerator';
export { ScaffoldGenerator } from './scaffoldGenerator';

/**
 * Main function to generate a Playwright test suite from a web application
 *
 * This tool uses Magnitude's BrowserAgent (with an LLM) to explore the app,
 * then uses the same LLM to generate idiomatic Playwright test code.
 *
 * @param options - Configuration options including LLM provider
 * @returns Path to generated test suite
 */
export async function generatePlaywrightTests(options: GeneratorOptions): Promise<string> {
    const outputDir = options.outputDir || path.join(process.cwd(), 'generated-tests');

    console.log(`\n🚀 Magnitude Playwright Test Generator`);
    console.log(`   URL: ${options.url}`);
    console.log(`   Mode: ${options.scenarios ? 'Prompt-based' : 'Autonomous'}`);
    console.log(`   Output: ${outputDir}\n`);

    // Initialize explorer with LLM configuration
    const explorer = new ApplicationExplorer(options);

    try {
        // Start browser and begin exploration
        await explorer.start();

        // Explore application
        await explorer.explore();

        // Get exploration results (page structures, flows discovered)
        const explorationResults = explorer.getExplorationResults();

        if (explorationResults.length === 0) {
            throw new Error('No flows were explored');
        }

        console.log(`\n📊 Explored ${explorationResults.length} flow(s)`);

        // Use LLM to generate Playwright tests from exploration data
        console.log(`\n🤖 Generating Playwright test code...`);
        const testGenerator = new TestCodeGenerator(options.llm);
        const generatedTests = await testGenerator.generateTests(explorationResults);

        console.log(`✓ Generated ${generatedTests.length} test file(s)`);

        // Generate test suite scaffold
        const scaffoldGen = new ScaffoldGenerator();
        await scaffoldGen.generateFullSuite(generatedTests, options.url, outputDir);

        return outputDir;
    } finally {
        // Always clean up
        await explorer.stop();
    }
}

/**
 * Helper function to generate tests for specific scenarios
 */
export async function generateTestsForScenarios(
    url: string,
    scenarios: TestScenario[],
    outputDir?: string
): Promise<string> {
    return generatePlaywrightTests({
        url,
        scenarios,
        outputDir
    });
}

/**
 * Helper function for autonomous test generation
 */
export async function generateTestsAutonomously(
    url: string,
    outputDir?: string
): Promise<string> {
    return generatePlaywrightTests({
        url,
        autonomous: true,
        outputDir
    });
}

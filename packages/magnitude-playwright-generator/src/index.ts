import { ApplicationExplorer } from './explorer';
import { ScaffoldGenerator } from './scaffoldGenerator';
import { GeneratorOptions, TestScenario } from './types';
import * as path from 'path';

export * from './types';
export { ApplicationExplorer } from './explorer';
export { TestRecorder } from './recorder';
export { PlaywrightCodeGenerator } from './codeGenerator';
export { ScaffoldGenerator } from './scaffoldGenerator';

/**
 * Main function to generate a Playwright test suite from a web application
 *
 * @param options - Configuration options
 * @returns Path to generated test suite
 */
export async function generatePlaywrightTests(options: GeneratorOptions): Promise<string> {
    const outputDir = options.outputDir || path.join(process.cwd(), 'generated-tests');

    console.log(`\n🚀 Magnitude Playwright Test Generator`);
    console.log(`   URL: ${options.url}`);
    console.log(`   Mode: ${options.scenarios ? 'Prompt-based' : 'Autonomous'}`);
    console.log(`   Output: ${outputDir}\n`);

    // Initialize explorer
    const explorer = new ApplicationExplorer(options);

    try {
        // Start browser and begin exploration
        await explorer.start();

        // Explore application
        await explorer.explore();

        // Get recorded tests
        const recordedTests = explorer.getRecordedTests();

        if (recordedTests.length === 0) {
            throw new Error('No tests were recorded during exploration');
        }

        console.log(`\n📊 Recorded ${recordedTests.length} test(s)`);

        // Generate test suite scaffold
        const scaffoldGen = new ScaffoldGenerator();
        await scaffoldGen.generateSuite(recordedTests, options.url, outputDir);

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

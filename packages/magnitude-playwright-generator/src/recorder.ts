import { RecordedAction, RecordedTest, RecordedAssertion } from './types';

export class TestRecorder {
    private currentTest: RecordedTest | null = null;
    private tests: RecordedTest[] = [];
    private actions: RecordedAction[] = [];

    startTest(name: string, description: string, url: string) {
        // Save previous test if exists
        if (this.currentTest) {
            this.tests.push(this.currentTest);
        }

        this.currentTest = {
            name,
            description,
            url,
            actions: [],
            assertions: []
        };
        this.actions = [];
    }

    recordAction(action: RecordedAction) {
        if (!this.currentTest) {
            throw new Error('No active test. Call startTest() first.');
        }

        this.actions.push(action);
        this.currentTest.actions.push(action);
    }

    recordAssertion(assertion: RecordedAssertion) {
        if (!this.currentTest) {
            throw new Error('No active test. Call startTest() first.');
        }

        this.currentTest.assertions.push(assertion);
    }

    endTest() {
        if (this.currentTest) {
            this.tests.push(this.currentTest);
            this.currentTest = null;
        }
    }

    getTests(): RecordedTest[] {
        // Include current test if still active
        if (this.currentTest) {
            return [...this.tests, this.currentTest];
        }
        return this.tests;
    }

    clear() {
        this.currentTest = null;
        this.tests = [];
        this.actions = [];
    }
}

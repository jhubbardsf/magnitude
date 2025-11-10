import { LLMClient } from 'magnitude-core';

export interface GeneratorOptions {
    url: string;
    outputDir?: string;
    scenarios?: TestScenario[];
    autonomous?: boolean;
    llm?: LLMClient;  // LLM configuration for Magnitude agent
}

export interface TestScenario {
    name: string;
    description: string;
    steps?: string[];
}

export interface RecordedAction {
    type: 'click_text' | 'click_selector' | 'fill_by_label' | 'fill_by_placeholder' | 'fill_selector' | 'navigate' | 'wait';
    timestamp: number;
    selector?: string;
    text?: string;
    label?: string;
    placeholder?: string;
    value?: string;
    url?: string;
}

export interface RecordedTest {
    name: string;
    description: string;
    url: string;
    actions: RecordedAction[];
    assertions: RecordedAssertion[];
}

export interface RecordedAssertion {
    type: 'visible' | 'text_content' | 'url' | 'element_count';
    selector?: string;
    text?: string;
    expected?: string | number;
}

export interface GeneratedTestSuite {
    tests: GeneratedTest[];
    config: PlaywrightConfig;
    packageJson: any;
}

export interface GeneratedTest {
    filename: string;
    code: string;
}

export interface PlaywrightConfig {
    baseURL?: string;
    timeout?: number;
    retries?: number;
    workers?: number;
}

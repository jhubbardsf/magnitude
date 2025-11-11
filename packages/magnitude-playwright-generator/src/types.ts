import { LLMClient } from 'magnitude-core';

export interface EmailConfig {
    provider: 'mailinator';
    apiKey: string;
    domain: string;  // e.g., @team337632.testinator.com or team337632.testinator.com
}

export interface LoggingOptions {
    enabled: boolean;
    sessionDir: string;
    logDir: string;
    baml: boolean;
    actions: boolean;
    screenshots: boolean;
    network: boolean;
}

export interface GeneratorOptions {
    url: string;
    outputDir?: string;
    scenarios?: TestScenario[];
    autonomous?: boolean;
    llm?: LLMClient;  // LLM configuration for Magnitude agent
    email?: EmailConfig;  // Optional email service for verification codes
    logging?: LoggingOptions;  // Optional logging configuration
    toastDetectionMode?: 'auto' | 'always' | 'never';  // Toast detection mode (default: 'auto')
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

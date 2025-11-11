import * as fs from 'fs';
import * as path from 'path';
import { LogConfig } from './config';

export class LogArchiver {
    private config: LogConfig;
    private sessionDir: string;
    private screenshotCounter = 0;
    private bamlCounter = 0;

    constructor(config: LogConfig, sessionDir: string) {
        this.config = config;
        this.sessionDir = sessionDir;
    }

    async saveScreenshot(screenshot: Buffer | string, context?: string): Promise<string | null> {
        if (!this.config.screenshots || !this.config.enabled) {
            return null;
        }

        try {
            this.screenshotCounter++;
            const timestamp = Date.now();
            const contextSlug = context ? `-${context.replace(/[^a-z0-9]/gi, '-')}` : '';
            const filename = `${this.screenshotCounter.toString().padStart(3, '0')}-${timestamp}${contextSlug}.png`;
            const fullPath = path.join(this.sessionDir, 'screenshots', filename);

            const buffer = typeof screenshot === 'string'
                ? Buffer.from(screenshot, 'base64')
                : screenshot;

            fs.writeFileSync(fullPath, buffer);
            return fullPath;
        } catch (error) {
            console.error('Failed to save screenshot:', error);
            return null;
        }
    }

    logAction(action: any, reasoning?: string): void {
        if (!this.config.actions || !this.config.enabled) {
            return;
        }

        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                reasoning,
                action
            };

            const actionsFile = path.join(this.sessionDir, 'actions', 'actions.jsonl');
            fs.appendFileSync(actionsFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('Failed to log action:', error);
        }
    }

    logBAML(type: 'prompt' | 'response', content: string, metadata?: any): void {
        if (!this.config.baml || !this.config.enabled) {
            return;
        }

        try {
            this.bamlCounter++;
            const filename = `${this.bamlCounter.toString().padStart(3, '0')}-${type}.txt`;
            const fullPath = path.join(this.sessionDir, 'baml', filename);

            let fileContent = content;
            if (metadata) {
                fileContent = `---METADATA---\n${JSON.stringify(metadata, null, 2)}\n\n---CONTENT---\n${content}`;
            }

            fs.writeFileSync(fullPath, fileContent);
        } catch (error) {
            console.error('Failed to log BAML:', error);
        }
    }

    logNetworkRequest(request: any): void {
        if (!this.config.network || !this.config.enabled) {
            return;
        }

        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                ...request
            };

            const networkFile = path.join(this.sessionDir, 'network', 'requests.jsonl');
            fs.appendFileSync(networkFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('Failed to log network request:', error);
        }
    }

    logEvent(eventType: string, data: any): void {
        if (!this.config.enabled) {
            return;
        }

        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                eventType,
                data
            };

            const eventsFile = path.join(this.sessionDir, 'events.jsonl');
            fs.appendFileSync(eventsFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }

    getSessionDir(): string {
        return this.sessionDir;
    }
}

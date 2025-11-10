import * as path from 'path';
import * as fs from 'fs';

export interface LogConfig {
    enabled: boolean;
    logDir: string;
    baml: boolean;         // Log BAML prompts and responses
    actions: boolean;      // Log actions and reasoning
    screenshots: boolean;  // Save all screenshots
    network: boolean;      // Log network requests/responses
}

export class LogConfigManager {
    private config: LogConfig;
    private sessionDir: string;

    constructor() {
        // Load configuration from environment variables
        const baseEnabled = process.env.MAGNITUDE_LOG_ENABLED === 'true' ||
                           process.env.MAGNITUDE_LOG_BAML === 'true' ||
                           process.env.MAGNITUDE_LOG_ACTIONS === 'true' ||
                           process.env.MAGNITUDE_LOG_SCREENSHOTS === 'true' ||
                           process.env.MAGNITUDE_LOG_NETWORK === 'true';

        const baseDir = process.env.MAGNITUDE_LOG_DIR || path.join(process.cwd(), 'magnitude-logs');

        this.config = {
            enabled: baseEnabled,
            logDir: baseDir,
            baml: process.env.MAGNITUDE_LOG_BAML === 'true',
            actions: process.env.MAGNITUDE_LOG_ACTIONS === 'true',
            screenshots: process.env.MAGNITUDE_LOG_SCREENSHOTS === 'true',
            network: process.env.MAGNITUDE_LOG_NETWORK === 'true'
        };

        // Create session directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.sessionDir = path.join(this.config.logDir, `session-${timestamp}`);

        if (this.config.enabled) {
            this.initializeDirectories();
        }
    }

    private initializeDirectories() {
        const dirs = [
            this.sessionDir,
            this.config.baml ? path.join(this.sessionDir, 'baml') : null,
            this.config.actions ? path.join(this.sessionDir, 'actions') : null,
            this.config.screenshots ? path.join(this.sessionDir, 'screenshots') : null,
            this.config.network ? path.join(this.sessionDir, 'network') : null
        ].filter(Boolean) as string[];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }

        // Create manifest
        const manifest = {
            session: path.basename(this.sessionDir),
            startTime: new Date().toISOString(),
            config: this.config
        };

        fs.writeFileSync(
            path.join(this.sessionDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );

        console.log(`📝 Logging enabled: ${this.sessionDir}`);
    }

    getConfig(): LogConfig {
        return this.config;
    }

    getSessionDir(): string {
        return this.sessionDir;
    }

    updateFromCLIFlags(flags: {
        logBaml?: boolean;
        logActions?: boolean;
        logScreenshots?: boolean;
        logNetwork?: boolean;
        logDir?: string;
    }) {
        if (flags.logBaml) this.config.baml = true;
        if (flags.logActions) this.config.actions = true;
        if (flags.logScreenshots) this.config.screenshots = true;
        if (flags.logNetwork) this.config.network = true;
        if (flags.logDir) this.config.logDir = flags.logDir;

        // Enable logging if any flag is set
        if (flags.logBaml || flags.logActions || flags.logScreenshots || flags.logNetwork) {
            this.config.enabled = true;
            this.initializeDirectories();
        }
    }
}

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const DEFAULT_CONFIG = {
    checks: {
        eslint: true,
        llm_suggestions: false
    },
    eslint: {
        severity_threshold: "warning" 
    }
};

export function loadConfig(repoRoot = process.cwd()) {
    const configPath = path.join(repoRoot, ".reviewbot.yml");
    let userConfig = {};

    if (fs.existsSync(configPath)) {
        try {
            const fileContents = fs.readFileSync(configPath, "utf8");
            userConfig = yaml.load(fileContents) || {};
        } catch (e) {
            console.warn("Failed to load .reviewbot.yml, using defaults:", e.message);
        }
    }

    return {
        checks: {
            ...DEFAULT_CONFIG.checks,
            ...(userConfig.checks || {})
        },
        eslint: {
            ...DEFAULT_CONFIG.eslint,
            ...(userConfig.eslint || {})
        }
    };
}

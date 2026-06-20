import { ESLint } from "eslint";
import fs from "fs";

export async function lintFiles(changedFiles) {
    // Filter to only .js/.jsx files that still exist on disk
    const filesToLint = changedFiles
        .filter(f => f.endsWith(".js") || f.endsWith(".jsx"))
        .filter(f => fs.existsSync(f));

    if (filesToLint.length === 0) {
        return [];
    }

    const eslint = new ESLint();
    const results = await eslint.lintFiles(filesToLint);

    const findings = [];
    
    for (const result of results) {
        for (const message of result.messages) {
            findings.push({
                file: result.filePath,
                line: message.line,
                ruleId: message.ruleId,
                message: message.message,
                severity: message.severity === 2 ? 'error' : 'warning'
            });
        }
    }

    return findings;
}

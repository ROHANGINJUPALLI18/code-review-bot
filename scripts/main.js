import {Octokit} from "@octokit/rest";
import { log } from "console";
import { useCallback } from "react";
import fs from "fs";
import { lintFiles } from "./lint.js";
import { postComments } from "./postComments.js";
import { loadConfig } from "./config.js";

async function main() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error("GITHUB_TOKEN is missing or token is expired!");
        process.exit(1);
    }

    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
        console.error("GITHUB_EVENT_PATH is missing please verify it !");
        process.exit(1);
    }

    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const pullRequest = eventData.pull_request;
    
    if (!pullRequest) {
        console.error("No pull_request data found in the event payload.");
        process.exit(1);
    }

    const prNumber = pullRequest.number;
    const owner = pullRequest.base.repo.owner.login;
    const repo = pullRequest.base.repo.name;

    console.log(`Processing PR #${prNumber} for ${owner}/${repo}`);

    const octokit = new Octokit({ auth: token });

    try {
        const { data: files } = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber
        });

        console.log(files);
        

        console.log(`Found ${files.length} changed files:`);
        
        files.forEach(file => {
            console.log(`- ${file.filename} (+${file.additions} / -${file.deletions})`);
            console.log(`content of file ${file.filename} : ${file.data}`)
        });

        const filePaths = files.map(file => file.filename);

        console.log(`\n\nchanged file names are : ${filePaths.join("\n")}`);
        const config = loadConfig();
        
        let lintFindings = [];
        if (config.checks.eslint) {
            lintFindings = await lintFiles(filePaths);
            
            
            if (config.eslint.severity_threshold === "error") {
                lintFindings = lintFindings.filter(f => f.severity === "error");
            }
            
            console.log("\n\nESLint findings:", JSON.stringify(lintFindings, null, 2));
        } else {
            console.log("ESLint check is disabled via config.");
        }

        let commit_id = pullRequest.head?.sha;
        if (!commit_id) {
            const { data: prData } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: prNumber
            });
            commit_id = prData.head.sha;
        }

        await postComments(octokit, owner, repo, prNumber, commit_id, lintFindings);
    } catch (error) {
        console.error("Error fetching PR files:", error.message);
        process.exit(1);
    }
}

main();

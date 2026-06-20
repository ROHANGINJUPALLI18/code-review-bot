import {Octokit} from "@octokit/rest";
import { log } from "console";
import fs from "fs";

async function main() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error("GITHUB_TOKEN is missing!");
        process.exit(1);
    }

    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
        console.error("GITHUB_EVENT_PATH is missing!");
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
    } catch (error) {
        console.error("Error fetching PR files:", error.message);
        process.exit(1);
    }
}

main();

import path from "path";

export async function postComments(octokit, owner, repo, pull_number, commit_id, findings) {
    if (!findings || findings.length === 0) {
        return "There are no lint findings found";
    }

    let existingComments = [];
    try {
        const { data } = await octokit.rest.pulls.listReviewComments({
            owner,
            repo,
            pull_number
        });
        existingComments = data;
    } catch (error) {
        console.error("Failed to fetch existing comments:", error.message);
        return;
    }

    const cwd = process.cwd();

    for (const finding of findings) {
        const marker = `<!-- review-bot:eslint:${finding.ruleId} -->`;
        
        // Ensure path is relative
        // continue 
        let relPath = finding.file;
        if (path.isAbsolute(relPath)) {
            relPath = path.relative(cwd, relPath).replace(/\\/g, "/");
        }

        // Dedupe check
        const alreadyCommented = existingComments.some(comment => 
            comment.path === relPath &&
            comment.line === finding.line &&
            comment.body && comment.body.includes(marker)
        );

        if (alreadyCommented) {
            console.log(`Skipping duplicate comment for ${finding.ruleId} in ${relPath}:${finding.line}`);
            continue;
        }

        const body = `**ESLint: ${finding.ruleId}**\n\n${finding.message}\n\n${marker}`;

        try {
            await octokit.rest.pulls.createReviewComment({
                owner,
                repo,
                pull_number,
                commit_id,
                path: relPath,
                line: finding.line,
                side: "RIGHT",
                body
            });
            console.log(`Posted comment for ${finding.ruleId} in ${relPath}:${finding.line}`);
        } catch (error) {
            console.error(`Failed to post comment on ${relPath}:${finding.line} - it might not be part of the diff. Error: ${error.message}`);
        }
    }
}

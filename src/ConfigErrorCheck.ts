import { Octokit, Context } from "probot";

export async function UpdateCheckWithConfigError(context:Context, repoOwner:string, repoName: string, checkRunId:number, message: string){
    // Finish time
    const finishTime = new Date();

    // Update check with final result
    let errorCheck:Octokit.ChecksUpdateParams = {
        owner: repoOwner,
        repo: repoName,
        check_run_id: checkRunId,
        status: "completed",
        conclusion: "failure",
        completed_at: finishTime.toISOString(),
        output: {
            title: "Configuration Error",
            summary: message
        }
    };

    await context.github.checks.update(errorCheck);
}
import { Application, Context } from "probot";
import { defaultConfig } from "./DefaultConfig";

export async function createCheck(app: Application, context: Context, headSha:string) {

  // Get the config from the repo that this bot installed
  // & if does not exist or malformed fallback to deafult one
  // .github/vale-linter.yml
  let config:IConfig = await context.config('vale-linter.yml', defaultConfig);

  if(config.Vale.Enabled === false){
    app.log('Vale Linter Config Disabled. Exiting Early');
    return;
  }

  app.log('Recieved a PR webhook payload');
  const repoOwner = context.payload.repository.owner.login;
  const repoName = context.payload.repository.name;

  // Create a NEW Check (For new PR's or code updated/sync'd or has been re-opened)
  // We will listen/hear back with a new WebHook event once it's been created
  await context.github.checks.create({
    name: 'Documentation Lint',
    owner: repoOwner,
    repo: repoName,
    head_sha: headSha
  });

  app.log('Posted to GitHub API to create a Check');
}

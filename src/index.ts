import { Application, Context, Octokit } from 'probot' // eslint-disable-line no-unused-vars
import Webhooks from '@octokit/webhooks';
import { ChecksUpdateParamsOutputAnnotations } from '@octokit/rest';
import { execSync } from 'child_process';
import fs from 'fs-extra';

import { createCheck } from './CreateCheck';
import { defaultConfig } from './DefaultConfig';
import { UpdateCheckWithConfigError } from './ConfigErrorCheck';


export = (app: Application) => {

  app.log('Booting up Vale Linter ProBot');

  // Listen for these PR webhook payload types
  app.on(['pull_request.opened', 'pull_request.synchronize', 'pull_request_reopened'], async (context: Context<Webhooks.WebhookPayloadPullRequest>) => {
    let headSha = context.payload.pull_request.head.sha;
    await createCheck(app, context, headSha);
  });

  // Listen for when a check is manually re-requested (Create a NEW Check & start over)
  app.on('check_run.rerequested', async (context: Context<Webhooks.WebhookPayloadCheckRun>) => {
    let headSha = context.payload.check_run.head_sha
    await createCheck(app, context, headSha);
  });

  // Listen for when a NEW check is created
  app.on('check_run.created', async(context: Context<Webhooks.WebhookPayloadCheckRun>) => {

    // Need to 100% verify the check created is for us & not another tool/service
    let checkAppId = context.payload.check_run.app.id;
    if(checkAppId != Number(process.env.APP_ID)) {
      app.log('This check was not created by the Vale Lint app, ignoring.');
      return;
    }

    // Get the config from the repo that this bot installed
    // & if does not exist or malformed fallback to deafult one
    // .github/vale-linter.yml
    let config:IConfig = await context.config('vale-linter.yml', defaultConfig);

    if(config.Vale.Enabled === false){
      app.log('Vale Linter Config Disabled. Exiting Early');
      return;
    }

    app.log('Reacting to a Check Run Created payload');

    const repoOwner = context.payload.repository.owner.login;
    const repoName = context.payload.repository.name;
    const checkRunId = context.payload.check_run.id;

    const startTime = new Date();

    // Update the check with in-progress state & date-time stamp
    await context.github.checks.update({
      owner: repoOwner,
      repo: repoName,
      check_run_id: checkRunId,
      status: "in_progress",
      started_at: startTime.toISOString()
    });

    const headSha = context.payload.check_run.head_sha;

    // Create the vale-lint folder to do our processing in & subdir for the vale YML style rules
    fs.mkdirpSync(`./vale-lint_${headSha}/files`);
    fs.mkdirpSync(`./vale-lint_${headSha}/${config.Vale.Paths.Styles}`);

    let valeConfigNotFound = false;
    let valeStylesNotFound = false;

    // Download _vale.ini from master branch
    let valeRawData:any;
    await context.github.repos.getContents({ owner: repoOwner, repo: repoName, path: config.Vale.Paths.Configuration })
    .then(async response => {
      // Get the encoded content & convert from base64 to text to save the code file
      valeRawData = response.data.content;
      const valeFileContent = Buffer.from(valeRawData, "base64").toString();

      // Save _vale.ini file
      await fs.writeFile(`./vale-lint_${headSha}/${config.Vale.Paths.Configuration}`, valeFileContent);
      app.log(`Written ./vale-lint_${headSha}/${config.Vale.Paths.Configuration} file`);
    })
    .catch(reason => {
      valeConfigNotFound = true;
    });

    // Get all files from 'vale/DocStyles' in repo root from master/default branch
    let valeStylesItems:Array<any> = new Array<any>();
    await context.github.repos.getContents({ owner: repoOwner, repo: repoName, path: config.Vale.Paths.Styles })
    .then(response => {
      valeStylesItems = response.data;
    })
    .catch(reason => {
      valeStylesNotFound = true;
    });

    // Both can not be found
    if(valeConfigNotFound && valeStylesNotFound){
      let errorMessage = 'The Vale.ini configuration file and the Vale styles could not be downloaded from the default branch in the repository. Double check the paths configured in the YML file .github/vale-linter.yml';

      // Update Check with the Error
      UpdateCheckWithConfigError(context, repoOwner, repoName, checkRunId, errorMessage);

      // Delete vale-lint folder
      fs.removeSync(`./vale-lint_${headSha}`);

      // Stop the rest of the execution flow
      return;
    }
    else if(valeConfigNotFound){
      let errorMessage = `The Vale.ini configuration file could not be downloaded from the default branch in the repository. Double check the path **${config.Vale.Paths.Configuration}**`

      // Update Check with the Error
      UpdateCheckWithConfigError(context, repoOwner, repoName, checkRunId, errorMessage);

      // Delete vale-lint folder
      fs.removeSync(`./vale-lint_${headSha}`);

      // Stop the rest of the execution flow
      return;
    }
    else if(valeStylesNotFound){
      let errorMessage = `The Vale Styles folder could not be downloaded from the default branch in the repository. Double check the path **${config.Vale.Paths.Styles}**`

      // Update Check with the Error
      UpdateCheckWithConfigError(context, repoOwner, repoName, checkRunId, errorMessage);

      // Delete vale-lint folder
      fs.removeSync(`./vale-lint_${headSha}`);

      // Stop the rest of the execution flow
      return;
    }

    // We have style files downloaded & can loop over them
    for(const item of valeStylesItems){
      const filePath = item.path; // 'vale/DocStyles/BadWords.yml'

      // Download each file from the master/default branch
      const blobContent = await context.github.git.getBlob({owner: repoOwner, repo: repoName, file_sha: item.sha });
      const rawData = blobContent.data.content;
      const fileContent = Buffer.from(rawData, "base64").toString();

      fs.writeFileSync(`./vale-lint_${headSha}/${filePath}`, fileContent);
      app.log(`Written ./vale-lint_${headSha}/${filePath} file from default branch`);
    }

    // Fetch the list of files in the PR from the head_sha
    // Gives us an array of files that changed & their sha's so we can get their file contents
    var tree = await context.github.git.getTree({ owner: repoOwner, repo: repoName, tree_sha: headSha });
    var treeResponse = tree.data;
    var treeData:Array<any> = treeResponse.tree; // Array of objects

    // Filter the list of items (don't want images or anything else but .md files)
    const markdownFiles = treeData.filter(path => {
      const {path: filename, type} = path
      return type === 'blob'  && filename.endsWith('.md')
    });

    // For each markdown file - go and download it & save it in 'vale-lint/files'
    for(const file of markdownFiles){
      // Download each file
      const prBlob = await context.github.git.getBlob({owner: repoOwner, repo: repoName, file_sha: file.sha });
      var rawData = prBlob.data.content;
      var fileContent = Buffer.from(rawData, "base64").toString();

      // Write file to disk
      fs.writeFileSync(`./vale-lint_${headSha}/files/${file.path}`, fileContent);
      app.log(`Written file from PR to ./vale-lint_${headSha}/files/${file.path}`);
    }

    // Call the VALE CLI tool to output results as JSON
    // We must pass --no-exit otherwise if we find an error, we dont get the result but an error saying it exited etc
    var valeLint = execSync("vale --no-exit --output=JSON .", { cwd: `./vale-lint_${headSha}/files`});
    var rawString = valeLint.toString();
    app.log('Raw JSON string', rawString);

    // Example JSON result
    // {
    //   "README.md": [
    //     {
    //       "Check": "DocsStyles.BadWords",
    //       "Description": "",
    //       "Line": 6,
    //       "Link": "",
    //       "Message": "'slave' should be changed",
    //       "Severity": "error",
    //       "Span": [
    //         22,
    //         26
    //       ],
    //       "Hide": false,
    //       "Match": "slave"
    //     }
    //   ]
    // }

    // Convert to a proper JSON object to query/iterate over etc
    const resultJson = JSON.parse(rawString) as IValeJSON;


    // Check the JSON is NOT an empty json object `{}`
    const hasLints = Object.entries(resultJson).length > 0 && resultJson.constructor === Object;
    app.log('Has Lints?', hasLints);

    // No Errors - so let's bail out early & POST a SUCCESS message/check result
    if(hasLints === false){
      // Finish time
      const finishTime = new Date();

      let successCheck:Octokit.ChecksUpdateParams = {
        owner: repoOwner,
        repo: repoName,
        check_run_id: checkRunId,
        status: "completed",
        conclusion: "success",
        completed_at: finishTime.toISOString()
      };

      let successOutput:Octokit.ChecksUpdateParamsOutput = {
        title: config.Vale.Success.Header,
        summary: config.Vale.Success.Message
      }

      // If we have images enabled add it into the output object that makes up the larger check object
      if(config.Vale.Success.ShowImage){

        let images: Array<Octokit.ChecksUpdateParamsOutputImages> = new Array<Octokit.ChecksUpdateParamsOutputImages>();
        images.push({
          alt: config.Vale.Success.Header,
          image_url: config.Vale.Success.ImageUrl
        });

        // Update the output object
        successOutput.images = images;
      }

      //Add the output to the main object to send back to GitHub
      successCheck.output = successOutput;

      // Update check with SUCCESS result
      await context.github.checks.update(successCheck);

      // Delete vale-lint folder
      fs.removeSync(`./vale-lint_${headSha}`);

      // Exit/finish early
      return;
    }

    // An array to store our annotations in
    const annotations:Array<ChecksUpdateParamsOutputAnnotations> = new Array<ChecksUpdateParamsOutputAnnotations>();

    // For each error create an annotation
    for (const objectKey of Object.getOwnPropertyNames(resultJson)){
      const fileName = objectKey;
      const lintItems = resultJson[objectKey];

      // The filename can contain an array of objects
      for(const item of lintItems){

        // Vale states to map to GitHub Check Annotation Level
        // error = failure
        // warning = warning
        // suggestion = notice
        var githubLevel : "notice" | "warning" | "failure"  = "notice";

        switch (item.Severity) {
          case "suggestion":
            githubLevel = "notice";
            break;

          case "warning":
            githubLevel = "warning";
            break;

          case "error":
            githubLevel = "failure";
            break;

          default:
            githubLevel = "notice";
            break;
        }

        annotations.push({
          title: item.Check,
          message: item.Message,
          annotation_level: githubLevel,
          path: fileName,
          start_line: item.Line,
          end_line: item.Line,
          start_column: item.Span[0],
          end_column: item.Span[1]
        });
      }
    }

    // NOTE: GitHub API only accepts 50 annotations
    // If we have 50+ items will need to do multiple updates to the check
    app.log('Annotations', annotations);

    // Delete vale-lint folder
    fs.removeSync(`./vale-lint_${headSha}`);

    // Finish time
    const finishTime = new Date();

    // Update check with final result
    let errorCheck:Octokit.ChecksUpdateParams = {
      owner: repoOwner,
      repo: repoName,
      check_run_id: checkRunId,
      status: "completed",
      conclusion: "failure",
      completed_at: finishTime.toISOString()
    };

    let errorOutput:Octokit.ChecksUpdateParamsOutput = {
      title: config.Vale.Error.Header,
      summary: config.Vale.Error.Message,
      annotations: annotations
    }

    // If we have images enabled add it into the output object that makes up the larger check object
    if(config.Vale.Error.ShowImage){

      let images: Array<Octokit.ChecksUpdateParamsOutputImages> = new Array<Octokit.ChecksUpdateParamsOutputImages>();
      images.push({
        alt: config.Vale.Error.Header,
        image_url: config.Vale.Error.ImageUrl
      });

      // Update the output object
      errorOutput.images = images;
    }

    //Add the output to the main object to send back to GitHub
    errorCheck.output = errorOutput;

    // Update check with SUCCESS result
    await context.github.checks.update(errorCheck);

  });
}



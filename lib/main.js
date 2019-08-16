"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const constants_1 = require("./constants");
const eslint_cli_1 = require("./eslint-cli");
const GOOD_FILE_STATUS = new Set(['added', 'modified']);
async function run() {
    const octokit = new github.GitHub(core.getInput('repo-token', { required: true }));
    const context = github.context;
    /**
     * getting files modified in pull request
     *
     * @see {@link https://developer.github.com/v3/pulls/#list-pull-requests-files}
     */
    const files = await octokit.pulls.listFiles({
        ...context.repo,
        pull_number: context.issue.number,
        per_page: 100 // it's maximum
    });
    const commits = await octokit.pulls.listCommits({
        ...context.repo,
        pull_number: context.issue.number
    });
    const commit = commits.data.pop();
    if (!commit)
        return;
    const lastCommit = await octokit.graphql(`query($owner:String!, $name:String!, $prNumber: Int!) {
      repository(owner: $owner, name: $name){
        pullRequest(number: $prNumber){
            commits(last: 1){
              nodes{
                commit{
                  oid
                }
              }
            }
          
        }
      }
    }`, {
        owner: context.repo.owner,
        name: context.repo.repo,
        prNumber: context.issue.number
    });
    console.log('Commit from GraphQL:', lastCommit.repository.pullRequest.commits.nodes[0].commit.oid);
    const filesToLint = files.data
        .filter(({ filename, status }) => constants_1.EXTENSIONS_TO_LINT.has(path.extname(filename)) &&
        GOOD_FILE_STATUS.has(status))
        .map(({ filename }) => filename);
    if (filesToLint.length < 1) {
        console.warn(`No files with [${[...constants_1.EXTENSIONS_TO_LINT].join(', ')}] extensions added or modified in this PR, nothing to lint...`);
        return;
    }
    console.log('Context SHA: %s, last PR commit', context.sha, commit.sha);
    const checks = await octokit.checks.listForRef({
        ...context.repo,
        status: 'in_progress',
        ref: commit.sha
    });
    const { id: checkId } = checks.data.check_runs.find(({ external_id }) => external_id === constants_1.OUR_EXTERNAL_ID) ||
        (await octokit.checks.create({
            ...context.repo,
            name: constants_1.CHECK_NAME,
            head_sha: commit.sha,
            status: 'in_progress',
            started_at: new Date().toISOString()
        })).data;
    try {
        const { conclusion, output } = await eslint_cli_1.eslint(filesToLint);
        await octokit.checks.update({
            ...context.repo,
            check_run_id: checkId,
            completed_at: new Date().toISOString(),
            conclusion,
            output
        });
        if (conclusion === 'failure') {
            core.setFailed(`ESLint found some errors`);
        }
    }
    catch (error) {
        await octokit.checks.update({
            ...context.repo,
            check_run_id: checkId,
            conclusion: 'failure',
            completed_at: new Date().toISOString()
        });
        core.setFailed(error.message);
    }
}
run();

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
/**
 * This is just for syntax highlighting, does nothing
 * @param {string} s
 */
const gql = (s) => s.join('');
async function run() {
  console.log('github', github)
  const octokit = new github.GitHub(core.getInput('repo-token', { required: true }));
  const context = github.context;
  const prInfo = await octokit.graphql(gql`
      query($owner: String!, $name: String!, $prNumber: Int!) {
        repository(owner: $owner, name: $name) {
          pullRequest(number: $prNumber) {
            files(first: 100) {
              nodes {
                path
              }
            }
            commits(last: 1) {
              nodes {
                commit {
                  oid
                }
              }
            }
          }
        }
      }
    `, {
    owner: context.repo.owner,
    name: context.repo.repo,
    prNumber: context.issue.number
  });
  const currentSha = prInfo.repository.pullRequest.commits.nodes[0].commit.oid;
  // console.log('Commit from GraphQL:', currentSha);
  const files = prInfo.repository.pullRequest.files.nodes;
  const filesToLint = files
    .filter(f => constants_1.EXTENSIONS_TO_LINT.has(path.extname(f.path)))
    .map(f => f.path);
  if (filesToLint.length < 1) {
    console.warn(`No files with [${[...constants_1.EXTENSIONS_TO_LINT].join(', ')}] extensions added or modified in this PR, nothing to lint...`);
    return;
  }
  let checkId;
  const givenCheckName = core.getInput('check-name');
  if (givenCheckName) {
    const checks = await octokit.checks.listForRef({
      ...context.repo,
      status: 'in_progress',
      ref: currentSha
    });
    const theCheck = checks.data.check_runs.find(({ name }) => name === givenCheckName);
    if (theCheck)
      checkId = theCheck.id;
  }
  if (!checkId) {
    checkId = (await octokit.checks.create({
      ...context.repo,
      name: constants_1.CHECK_NAME,
      head_sha: currentSha,
      status: 'in_progress',
      started_at: new Date().toISOString()
    })).data.id;
  }
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

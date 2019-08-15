import * as path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { CHECK_NAME, EXTENSIONS_TO_LINT } from './constants';
import { eslint } from './eslint-cli';

const GOOD_FILE_STATUS = new Set(['added', 'modified']);

async function run() {
  const octokit = new github.GitHub(
    process.env.GITHUB_TOKEN || core.getInput('token', { required: true })
  );
  const context = github.context;

  // getting files modified in pull request
  const files = await octokit.pulls.listFiles({
    ...context.repo,
    pull_number: context.issue.number,
    per_page: 100 // it's maximum
  });
  const filesToLint = files.data
    .filter(
      ({ filename, status }) =>
        EXTENSIONS_TO_LINT.has(path.extname(filename)) &&
        GOOD_FILE_STATUS.has(status)
    )
    .map(({ filename }) => filename);
  if (filesToLint.length < 1) return;

  // create check
  const check = await octokit.checks.create({
    ...context.repo,
    name: CHECK_NAME,
    head_sha: context.sha,
    status: 'in_progress',
    started_at: new Date().toISOString()
  });
  try {
    /**
     * @see {@link https://developer.github.com/v3/pulls/#list-pull-requests-files}
     */
    const { conclusion, output } = await eslint(filesToLint);
    await octokit.checks.update({
      ...context.repo,
      check_run_id: check.data.id,
      status: 'completed',
      completed_at: new Date().toISOString(),
      conclusion,
      output
    });
    if (conclusion === 'failure') {
      core.setFailed(`ESLint found some errors`);
    }
  } catch (error) {
    await octokit.checks.update({
      ...context.repo,
      check_run_id: check.data.id,
      status: 'completed',
      conclusion: 'failure',
      completed_at: new Date().toISOString()
    });
    core.setFailed(error.message);
  }
}

run();

import * as core from '@actions/core';
import * as github from '@actions/github';
import { CHECK_NAME } from './constants';
import { eslint } from './eslint-cli';

async function run() {
  const octokit = new github.GitHub(
    process.env.GITHUB_TOKEN || core.getInput('token', { required: true })
  );
  const context = github.context;

  // create check
  const check = await octokit.checks.create({
    ...context.repo,
    name: CHECK_NAME,
    head_sha: context.sha,
    status: 'in_progress',
    started_at: new Date().toISOString()
  });
  try {
    const { conclusion, output } = await eslint();
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

import * as core from '@actions/core';
import * as path from 'path';

import { CHECK_NAME } from './constants';

const { GITHUB_WORKSPACE = '' } = process.env;

export async function eslint() {
  const { CLIEngine } = (await import(
    path.join(process.cwd(), 'node_modules/eslint')
  )) as typeof import('eslint');

  const cli = new CLIEngine({ extensions: ['.js', '.mjs'] });

  // getting files glob
  // process.argv will be ['node', 'thisFiles.js', ...]

  const report = cli.executeOnFiles([
    core.getInput('glob', { required: true })
  ]);
  // fixableErrorCount, fixableWarningCount are available too
  const { results, errorCount, warningCount } = report;

  const levels: import('@octokit/rest').ChecksUpdateParamsOutputAnnotations['annotation_level'][] = [
    'notice',
    'warning',
    'failure'
  ];

  const annotations: import('@octokit/rest').ChecksUpdateParamsOutputAnnotations[] = [];
  for (const result of results) {
    const { filePath, messages } = result;
    const path = filePath.substring(GITHUB_WORKSPACE.length + 1);
    for (const msg of messages) {
      const { line, severity, ruleId, message } = msg;
      const annotationLevel = levels[severity];
      annotations.push({
        path,
        start_line: line,
        end_line: line,
        annotation_level: annotationLevel,
        message: `[${ruleId}] ${message}`
      });
    }
  }

  return {
    conclusion: (errorCount > 0
      ? 'failure'
      : 'success') as import('@octokit/rest').ChecksCreateParams['conclusion'],
    output: {
      title: CHECK_NAME,
      summary: `${errorCount} error(s), ${warningCount} warning(s) found`,
      annotations
    }
  };
}

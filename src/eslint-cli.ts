import * as core from '@actions/core';
import * as path from 'path';

import { CHECK_NAME, EXTENSIONS_TO_LINT } from './constants';

const ESLINT_TO_GITHUB_LEVELS: import('@octokit/rest').ChecksUpdateParamsOutputAnnotations['annotation_level'][] = [
  'notice',
  'warning',
  'failure'
];

export async function eslint(filesList: string[]) {
  const { CLIEngine } = (await import(
    path.join(process.cwd(), 'node_modules/eslint')
  )) as typeof import('eslint');

  const cli = new CLIEngine({ extensions: [...EXTENSIONS_TO_LINT] });
  const report = cli.executeOnFiles(filesList);
  // fixableErrorCount, fixableWarningCount are available too
  const { results, errorCount, warningCount } = report;

  const annotations: import('@octokit/rest').ChecksUpdateParamsOutputAnnotations[] = [];
  for (const result of results) {
    const { filePath, messages } = result;
    const filename = filesList.find(file => filePath.endsWith(file));
    if (!filename) continue;
    for (const msg of messages) {
      const { line, severity, ruleId, message, endLine, source } = msg;
      annotations.push({
        path: filename,
        start_line: line,
        end_line: endLine || line,
        annotation_level: ESLINT_TO_GITHUB_LEVELS[severity],
        message: `[${ruleId}] ${message}`
      });
    }
  }

  if (annotations.length) {
    console.info('ESLint annotations:', annotations);
  } else console.info('No ESlint problems found');

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

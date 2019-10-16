import * as path from 'path';

import { EXTENSIONS_TO_LINT } from './constants';

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
      const {
        line,
        severity,
        ruleId,
        message,
        endLine,
        column,
        endColumn
      } = msg;
      annotations.push({
        path: filename,
        start_line: line || 0,
        end_line: endLine || line || 0,
        start_column: column || 0,
        end_column: endColumn || column || 0,
        annotation_level: ESLINT_TO_GITHUB_LEVELS[severity],
        title: ruleId || 'ESLint',
        message
      });
    }
  }

  return {
    conclusion: (errorCount > 0
      ? 'failure'
      : 'success') as import('@octokit/rest').ChecksCreateParams['conclusion'],
    output: {
      title: `${errorCount} error(s), ${warningCount} warning(s) found in ${filesList.length} file(s)`,
      summary: `${errorCount} error(s), ${warningCount} warning(s) found in ${filesList.length} file(s)`,
      annotations
    }
  };
}

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
const constants_1 = require("./constants");
const ESLINT_TO_GITHUB_LEVELS = [
    'notice',
    'warning',
    'failure'
];
async function eslint(filesList) {
    const { CLIEngine } = (await Promise.resolve().then(() => __importStar(require(path.join(process.cwd(), 'node_modules/eslint')))));
    const cli = new CLIEngine({ extensions: [...constants_1.EXTENSIONS_TO_LINT] });
    const report = cli.executeOnFiles(filesList);
    // fixableErrorCount, fixableWarningCount are available too
    const { results, errorCount, warningCount } = report;
    const annotations = [];
    for (const result of results) {
        const { filePath, messages } = result;
        const filename = filesList.find(file => filePath.endsWith(file));
        if (!filename)
            continue;
        for (const msg of messages) {
            const { line, severity, ruleId, message, endLine, source, column, endColumn } = msg;
            annotations.push({
                path: filename,
                start_line: line,
                end_line: endLine || line,
                start_column: column,
                end_column: endColumn || column,
                annotation_level: ESLINT_TO_GITHUB_LEVELS[severity],
                title: ruleId || 'ESLint',
                message
            });
        }
    }
    if (annotations.length) {
        console.info('ESLint annotations:', annotations);
    }
    else
        console.info('No ESlint problems found');
    return {
        conclusion: (errorCount > 0
            ? 'failure'
            : 'success'),
        output: {
            title: constants_1.CHECK_NAME,
            summary: `${errorCount} error(s), ${warningCount} warning(s) found`,
            annotations
        }
    };
}
exports.eslint = eslint;

"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const eslint_1 = require("eslint");
const constants_1 = require("./constants");
const { GITHUB_WORKSPACE = '' } = process.env;
function eslint() {
    const cli = new eslint_1.CLIEngine({ extensions: ['.js', '.mjs'] });
    // getting files glob
    // process.argv will be ['node', 'thisFiles.js', ...]
    const report = cli.executeOnFiles([
        core.getInput('glob', { required: true })
    ]);
    // fixableErrorCount, fixableWarningCount are available too
    const { results, errorCount, warningCount } = report;
    const levels = [
        'notice',
        'warning',
        'failure'
    ];
    const annotations = [];
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
            : 'success'),
        output: {
            title: constants_1.CHECK_NAME,
            summary: `${errorCount} error(s), ${warningCount} warning(s) found`,
            annotations
        }
    };
}
exports.eslint = eslint;

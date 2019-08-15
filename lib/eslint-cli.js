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
const { GITHUB_WORKSPACE = '' } = process.env;
async function eslint(filesList) {
    const { CLIEngine } = (await Promise.resolve().then(() => __importStar(require(path.join(process.cwd(), 'node_modules/eslint')))));
    const cli = new CLIEngine({ extensions: [...constants_1.EXTENSIONS_TO_LINT] });
    // getting files glob
    // process.argv will be ['node', 'thisFiles.js', ...]
    const report = cli.executeOnFiles(filesList);
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

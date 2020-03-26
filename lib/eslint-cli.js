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
// https://developer.github.com/v3/checks/runs/#output-object
const ANNOTATION_LIMIT = 50;
const buildAnnotation = (filename, msg) => {
    const { line, endLine, severity, ruleId, message } = msg;
    let annotation = {
        path: filename,
        start_line: line || 0,
        end_line: endLine || line || 0,
        annotation_level: ESLINT_TO_GITHUB_LEVELS[severity],
        title: ruleId || 'ESLint',
        message
    };
    return annotation;
};
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
            if (annotations.length >= ANNOTATION_LIMIT)
                break;
            const annotation = buildAnnotation(filename, msg);
            annotations.push(annotation);
        }
    }
    return {
        conclusion: (errorCount > 0
            ? 'failure'
            : 'success'),
        output: {
            title: `${errorCount} error(s), ${warningCount} warning(s) found in ${filesList.length} file(s)`,
            summary: `${errorCount} error(s), ${warningCount} warning(s) found in ${filesList.length} file(s)`,
            annotations
        }
    };
}
exports.eslint = eslint;

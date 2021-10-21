"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eslint = void 0;
const path = __importStar(require("path"));
const fs = require('fs');
const constants_1 = require("./constants");
const ESLINT_TO_GITHUB_LEVELS = [
    'notice',
    'warning',
    'failure'
];
async function eslint(filesList) {
    const { CLIEngine } = (await Promise.resolve().then(() => __importStar(require(path.join(process.cwd(), 'node_modules/eslint')))));
    const filteredFilesList = filesList.filter((value) => fs.existsSync(value));
    const cli = new CLIEngine({ extensions: [...constants_1.EXTENSIONS_TO_LINT] });
    const report = cli.executeOnFiles(filteredFilesList);
    // fixableErrorCount, fixableWarningCount are available too
    const { results, errorCount, warningCount } = report;
    const annotations = [];
    for (const result of results) {
        const { filePath, messages } = result;
        const filename = filteredFilesList.find(file => filePath.endsWith(file));
        if (!filename)
            continue;
        for (const msg of messages) {
            const { line, severity, ruleId, message, endLine, column, endColumn } = msg;
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
            : 'success'),
        output: {
            title: `${errorCount} error(s), ${warningCount} warning(s) found in ${filteredFilesList.length} file(s)`,
            summary: `${errorCount} error(s), ${warningCount} warning(s) found in ${filteredFilesList.length} file(s)`,
            annotations
        }
    };
}
exports.eslint = eslint;

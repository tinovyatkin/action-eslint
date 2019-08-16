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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const constants_1 = require("./constants");
const eslint_cli_1 = require("./eslint-cli");
const GOOD_FILE_STATUS = new Set(['added', 'modified']);
async function run() {
    const octokit = new github.GitHub(core.getInput('repo-token', { required: true }));
    const context = github.context;
    /**
     * getting files modified in pull request
     *
     * @see {@link https://developer.github.com/v3/pulls/#list-pull-requests-files}
     */
    const files = await octokit.pulls.listFiles({
        ...context.repo,
        pull_number: context.issue.number,
        per_page: 100 // it's maximum
    });
    const commits = await octokit.pulls.listCommits({
        ...context.repo,
        pull_number: context.issue.number
    });
    console.log('Commit:', commits.data.pop());
    const filesToLint = files.data
        .filter(({ filename, status }) => constants_1.EXTENSIONS_TO_LINT.has(path.extname(filename)) &&
        GOOD_FILE_STATUS.has(status))
        .map(({ filename }) => filename);
    if (filesToLint.length < 1) {
        console.warn(`No files with [${[...constants_1.EXTENSIONS_TO_LINT].join(', ')}] extensions added or modified in this PR, nothing to lint...`);
        return;
    }
    console.log('Context SHA: %s', context.sha);
    const check = await octokit.checks.create({
        ...context.repo,
        name: constants_1.CHECK_NAME,
        head_sha: context.ref,
        status: 'in_progress',
        started_at: new Date().toISOString()
    });
    try {
        const { conclusion, output } = await eslint_cli_1.eslint(filesToLint);
        await octokit.checks.update({
            ...context.repo,
            check_run_id: check.data.id,
            completed_at: new Date().toISOString(),
            conclusion,
            output
        });
        const ann = await octokit.checks.listAnnotations({
            ...context.repo,
            check_run_id: check.data.id
        });
        console.log('Check annotations:', ann);
        if (conclusion === 'failure') {
            core.setFailed(`ESLint found some errors`);
        }
    }
    catch (error) {
        await octokit.checks.update({
            ...context.repo,
            check_run_id: check.data.id,
            conclusion: 'failure',
            completed_at: new Date().toISOString()
        });
        core.setFailed(error.message);
    }
}
run();

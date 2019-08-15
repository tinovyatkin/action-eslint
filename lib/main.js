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
const github = __importStar(require("@actions/github"));
const constants_1 = require("./constants");
const eslint_cli_1 = require("./eslint-cli");
async function run() {
    const octokit = new github.GitHub(process.env.GITHUB_TOKEN || core.getInput('token', { required: true }));
    const context = github.context;
    // create check
    const check = await octokit.checks.create({
        ...context.repo,
        name: constants_1.CHECK_NAME,
        head_sha: context.sha,
        status: 'in_progress',
        started_at: new Date().toISOString()
    });
    try {
        const { conclusion, output } = await eslint_cli_1.eslint();
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
    }
    catch (error) {
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

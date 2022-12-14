"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.ShellError = exports.globUtils = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const parsers_1 = require("@yarnpkg/parsers");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const os_1 = require("os");
const stream_1 = require("stream");
const util_1 = require("util");
const errors_1 = require("./errors");
Object.defineProperty(exports, "ShellError", { enumerable: true, get: function () { return errors_1.ShellError; } });
const globUtils = tslib_1.__importStar(require("./globUtils"));
exports.globUtils = globUtils;
const pipe_1 = require("./pipe");
const pipe_2 = require("./pipe");
const setTimeoutPromise = (0, util_1.promisify)(setTimeout);
var StreamType;
(function (StreamType) {
    StreamType[StreamType["Readable"] = 1] = "Readable";
    StreamType[StreamType["Writable"] = 2] = "Writable";
})(StreamType || (StreamType = {}));
function getFileDescriptorStream(fd, type, state) {
    const stream = new stream_1.PassThrough({ autoDestroy: true });
    switch (fd) {
        case pipe_2.Pipe.STDIN:
            {
                if ((type & StreamType.Readable) === StreamType.Readable)
                    state.stdin.pipe(stream, { end: false });
                if ((type & StreamType.Writable) === StreamType.Writable && state.stdin instanceof stream_1.Writable) {
                    stream.pipe(state.stdin, { end: false });
                }
            }
            break;
        case pipe_2.Pipe.STDOUT:
            {
                if ((type & StreamType.Readable) === StreamType.Readable)
                    state.stdout.pipe(stream, { end: false });
                if ((type & StreamType.Writable) === StreamType.Writable) {
                    stream.pipe(state.stdout, { end: false });
                }
            }
            break;
        case pipe_2.Pipe.STDERR:
            {
                if ((type & StreamType.Readable) === StreamType.Readable)
                    state.stderr.pipe(stream, { end: false });
                if ((type & StreamType.Writable) === StreamType.Writable) {
                    stream.pipe(state.stderr, { end: false });
                }
            }
            break;
        default: {
            throw new errors_1.ShellError(`Bad file descriptor: "${fd}"`);
        }
    }
    return stream;
}
function cloneState(state, mergeWith = {}) {
    const newState = { ...state, ...mergeWith };
    newState.environment = { ...state.environment, ...mergeWith.environment };
    newState.variables = { ...state.variables, ...mergeWith.variables };
    return newState;
}
const BUILTINS = new Map([
    [`cd`, async ([target = (0, os_1.homedir)(), ...rest], opts, state) => {
            const resolvedTarget = fslib_1.ppath.resolve(state.cwd, fslib_1.npath.toPortablePath(target));
            const stat = await opts.baseFs.statPromise(resolvedTarget).catch(error => {
                throw error.code === `ENOENT`
                    ? new errors_1.ShellError(`cd: no such file or directory: ${target}`)
                    : error;
            });
            if (!stat.isDirectory())
                throw new errors_1.ShellError(`cd: not a directory: ${target}`);
            state.cwd = resolvedTarget;
            return 0;
        }],
    [`pwd`, async (args, opts, state) => {
            state.stdout.write(`${fslib_1.npath.fromPortablePath(state.cwd)}\n`);
            return 0;
        }],
    [`:`, async (args, opts, state) => {
            return 0;
        }],
    [`true`, async (args, opts, state) => {
            return 0;
        }],
    [`false`, async (args, opts, state) => {
            return 1;
        }],
    [`exit`, async ([code, ...rest], opts, state) => {
            return state.exitCode = parseInt(code !== null && code !== void 0 ? code : state.variables[`?`], 10);
        }],
    [`echo`, async (args, opts, state) => {
            state.stdout.write(`${args.join(` `)}\n`);
            return 0;
        }],
    [`sleep`, async ([time], opts, state) => {
            if (typeof time === `undefined`)
                throw new errors_1.ShellError(`sleep: missing operand`);
            // TODO: make it support unit suffixes
            const seconds = Number(time);
            if (Number.isNaN(seconds))
                throw new errors_1.ShellError(`sleep: invalid time interval '${time}'`);
            return await setTimeoutPromise(1000 * seconds, 0);
        }],
    [`__ysh_run_procedure`, async (args, opts, state) => {
            const procedure = state.procedures[args[0]];
            const exitCode = await (0, pipe_2.start)(procedure, {
                stdin: new pipe_2.ProtectedStream(state.stdin),
                stdout: new pipe_2.ProtectedStream(state.stdout),
                stderr: new pipe_2.ProtectedStream(state.stderr),
            }).run();
            return exitCode;
        }],
    [`__ysh_set_redirects`, async (args, opts, state) => {
            let stdin = state.stdin;
            let stdout = state.stdout;
            let stderr = state.stderr;
            const inputs = [];
            const outputs = [];
            const errors = [];
            let t = 0;
            while (args[t] !== `--`) {
                const key = args[t++];
                const { type, fd } = JSON.parse(key);
                const pushInput = (readableFactory) => {
                    switch (fd) {
                        case null:
                        case 0:
                            {
                                inputs.push(readableFactory);
                            }
                            break;
                        default:
                            throw new Error(`Unsupported file descriptor: "${fd}"`);
                    }
                };
                const pushOutput = (writable) => {
                    switch (fd) {
                        case null:
                        case 1:
                            {
                                outputs.push(writable);
                            }
                            break;
                        case 2:
                            {
                                errors.push(writable);
                            }
                            break;
                        default:
                            throw new Error(`Unsupported file descriptor: "${fd}"`);
                    }
                };
                const count = Number(args[t++]);
                const last = t + count;
                for (let u = t; u < last; ++t, ++u) {
                    switch (type) {
                        case `<`:
                            {
                                pushInput(() => {
                                    return opts.baseFs.createReadStream(fslib_1.ppath.resolve(state.cwd, fslib_1.npath.toPortablePath(args[u])));
                                });
                            }
                            break;
                        case `<<<`:
                            {
                                pushInput(() => {
                                    const input = new stream_1.PassThrough();
                                    process.nextTick(() => {
                                        input.write(`${args[u]}\n`);
                                        input.end();
                                    });
                                    return input;
                                });
                            }
                            break;
                        case `<&`:
                            {
                                pushInput(() => getFileDescriptorStream(Number(args[u]), StreamType.Readable, state));
                            }
                            break;
                        case `>`:
                        case `>>`:
                            {
                                const outputPath = fslib_1.ppath.resolve(state.cwd, fslib_1.npath.toPortablePath(args[u]));
                                if (outputPath === `/dev/null`) {
                                    pushOutput(new stream_1.Writable({
                                        autoDestroy: true,
                                        emitClose: true,
                                        write(chunk, encoding, callback) {
                                            setImmediate(callback);
                                        },
                                    }));
                                }
                                else {
                                    pushOutput(opts.baseFs.createWriteStream(outputPath, type === `>>` ? { flags: `a` } : undefined));
                                }
                            }
                            break;
                        case `>&`:
                            {
                                pushOutput(getFileDescriptorStream(Number(args[u]), StreamType.Writable, state));
                            }
                            break;
                        default: {
                            throw new Error(`Assertion failed: Unsupported redirection type: "${type}"`);
                        }
                    }
                }
            }
            if (inputs.length > 0) {
                const pipe = new stream_1.PassThrough();
                stdin = pipe;
                const bindInput = (n) => {
                    if (n === inputs.length) {
                        pipe.end();
                    }
                    else {
                        const input = inputs[n]();
                        input.pipe(pipe, { end: false });
                        input.on(`end`, () => {
                            bindInput(n + 1);
                        });
                    }
                };
                bindInput(0);
            }
            if (outputs.length > 0) {
                const pipe = new stream_1.PassThrough();
                stdout = pipe;
                for (const output of outputs) {
                    pipe.pipe(output);
                }
            }
            if (errors.length > 0) {
                const pipe = new stream_1.PassThrough();
                stderr = pipe;
                for (const error of errors) {
                    pipe.pipe(error);
                }
            }
            const exitCode = await (0, pipe_2.start)(makeCommandAction(args.slice(t + 1), opts, state), {
                stdin: new pipe_2.ProtectedStream(stdin),
                stdout: new pipe_2.ProtectedStream(stdout),
                stderr: new pipe_2.ProtectedStream(stderr),
            }).run();
            // Close all the outputs (since the shell never closes the output stream)
            await Promise.all(outputs.map(output => {
                // Wait until the output got flushed to the disk
                return new Promise((resolve, reject) => {
                    output.on(`error`, error => {
                        reject(error);
                    });
                    output.on(`close`, () => {
                        resolve();
                    });
                    output.end();
                });
            }));
            // Close all the errors (since the shell never closes the error stream)
            await Promise.all(errors.map(err => {
                // Wait until the error got flushed to the disk
                return new Promise((resolve, reject) => {
                    err.on(`error`, error => {
                        reject(error);
                    });
                    err.on(`close`, () => {
                        resolve();
                    });
                    err.end();
                });
            }));
            return exitCode;
        }],
]);
async function executeBufferedSubshell(ast, opts, state) {
    const chunks = [];
    const stdout = new stream_1.PassThrough();
    stdout.on(`data`, chunk => chunks.push(chunk));
    await executeShellLine(ast, opts, cloneState(state, { stdout }));
    return Buffer.concat(chunks).toString().replace(/[\r\n]+$/, ``);
}
async function applyEnvVariables(environmentSegments, opts, state) {
    const envPromises = environmentSegments.map(async (envSegment) => {
        const interpolatedArgs = await interpolateArguments(envSegment.args, opts, state);
        return {
            name: envSegment.name,
            value: interpolatedArgs.join(` `),
        };
    });
    const interpolatedEnvs = await Promise.all(envPromises);
    return interpolatedEnvs.reduce((envs, env) => {
        envs[env.name] = env.value;
        return envs;
    }, {});
}
function split(raw) {
    return raw.match(/[^ \r\n\t]+/g) || [];
}
async function evaluateVariable(segment, opts, state, push, pushAndClose = push) {
    switch (segment.name) {
        case `$`:
            {
                push(String(process.pid));
            }
            break;
        case `#`:
            {
                push(String(opts.args.length));
            }
            break;
        case `@`:
            {
                if (segment.quoted) {
                    for (const raw of opts.args) {
                        pushAndClose(raw);
                    }
                }
                else {
                    for (const raw of opts.args) {
                        const parts = split(raw);
                        for (let t = 0; t < parts.length - 1; ++t)
                            pushAndClose(parts[t]);
                        push(parts[parts.length - 1]);
                    }
                }
            }
            break;
        case `*`:
            {
                const raw = opts.args.join(` `);
                if (segment.quoted) {
                    push(raw);
                }
                else {
                    for (const part of split(raw)) {
                        pushAndClose(part);
                    }
                }
            }
            break;
        case `PPID`:
            {
                push(String(process.ppid));
            }
            break;
        case `RANDOM`:
            {
                push(String(Math.floor(Math.random() * 32768)));
            }
            break;
        default:
            {
                const argIndex = parseInt(segment.name, 10);
                let raw;
                if (Number.isFinite(argIndex)) {
                    if (argIndex >= 0 && argIndex < opts.args.length) {
                        raw = opts.args[argIndex];
                    }
                    else if (segment.defaultValue) {
                        raw = (await interpolateArguments(segment.defaultValue, opts, state)).join(` `);
                    }
                    else if (segment.alternativeValue) {
                        raw = (await interpolateArguments(segment.alternativeValue, opts, state)).join(` `);
                    }
                    else {
                        throw new errors_1.ShellError(`Unbound argument #${argIndex}`);
                    }
                }
                else {
                    if (Object.prototype.hasOwnProperty.call(state.variables, segment.name)) {
                        raw = state.variables[segment.name];
                    }
                    else if (Object.prototype.hasOwnProperty.call(state.environment, segment.name)) {
                        raw = state.environment[segment.name];
                    }
                    else if (segment.defaultValue) {
                        raw = (await interpolateArguments(segment.defaultValue, opts, state)).join(` `);
                    }
                    else {
                        throw new errors_1.ShellError(`Unbound variable "${segment.name}"`);
                    }
                }
                if (typeof raw !== `undefined` && segment.alternativeValue)
                    raw = (await interpolateArguments(segment.alternativeValue, opts, state)).join(` `);
                if (segment.quoted) {
                    push(raw);
                }
                else {
                    const parts = split(raw);
                    for (let t = 0; t < parts.length - 1; ++t)
                        pushAndClose(parts[t]);
                    const part = parts[parts.length - 1];
                    if (typeof part !== `undefined`) {
                        push(part);
                    }
                }
            }
            break;
    }
}
const operators = {
    addition: (left, right) => left + right,
    subtraction: (left, right) => left - right,
    multiplication: (left, right) => left * right,
    division: (left, right) => Math.trunc(left / right),
};
async function evaluateArithmetic(arithmetic, opts, state) {
    if (arithmetic.type === `number`) {
        if (!Number.isInteger(arithmetic.value)) {
            // ZSH allows non-integers, while bash throws at the parser level (unrecoverable)
            throw new Error(`Invalid number: "${arithmetic.value}", only integers are allowed`);
        }
        else {
            return arithmetic.value;
        }
    }
    else if (arithmetic.type === `variable`) {
        const parts = [];
        await evaluateVariable({ ...arithmetic, quoted: true }, opts, state, result => parts.push(result));
        const number = Number(parts.join(` `));
        if (Number.isNaN(number)) {
            return evaluateArithmetic({ type: `variable`, name: parts.join(` `) }, opts, state);
        }
        else {
            return evaluateArithmetic({ type: `number`, value: number }, opts, state);
        }
    }
    else {
        return operators[arithmetic.type](await evaluateArithmetic(arithmetic.left, opts, state), await evaluateArithmetic(arithmetic.right, opts, state));
    }
}
async function interpolateArguments(commandArgs, opts, state) {
    const redirections = new Map();
    const interpolated = [];
    let interpolatedSegments = [];
    const push = (segment) => {
        interpolatedSegments.push(segment);
    };
    const close = () => {
        if (interpolatedSegments.length > 0)
            interpolated.push(interpolatedSegments.join(``));
        interpolatedSegments = [];
    };
    const pushAndClose = (segment) => {
        push(segment);
        close();
    };
    const redirect = (type, fd, target) => {
        const key = JSON.stringify({ type, fd });
        let targets = redirections.get(key);
        if (typeof targets === `undefined`)
            redirections.set(key, targets = []);
        targets.push(target);
    };
    for (const commandArg of commandArgs) {
        let isGlob = false;
        switch (commandArg.type) {
            case `redirection`:
                {
                    const interpolatedArgs = await interpolateArguments(commandArg.args, opts, state);
                    for (const interpolatedArg of interpolatedArgs) {
                        redirect(commandArg.subtype, commandArg.fd, interpolatedArg);
                    }
                }
                break;
            case `argument`:
                {
                    for (const segment of commandArg.segments) {
                        switch (segment.type) {
                            case `text`:
                                {
                                    push(segment.text);
                                }
                                break;
                            case `glob`:
                                {
                                    push(segment.pattern);
                                    isGlob = true;
                                }
                                break;
                            case `shell`:
                                {
                                    const raw = await executeBufferedSubshell(segment.shell, opts, state);
                                    if (segment.quoted) {
                                        push(raw);
                                    }
                                    else {
                                        const parts = split(raw);
                                        for (let t = 0; t < parts.length - 1; ++t)
                                            pushAndClose(parts[t]);
                                        push(parts[parts.length - 1]);
                                    }
                                }
                                break;
                            case `variable`:
                                {
                                    await evaluateVariable(segment, opts, state, push, pushAndClose);
                                }
                                break;
                            case `arithmetic`:
                                {
                                    push(String(await evaluateArithmetic(segment.arithmetic, opts, state)));
                                }
                                break;
                        }
                    }
                }
                break;
        }
        close();
        if (isGlob) {
            const pattern = interpolated.pop();
            if (typeof pattern === `undefined`)
                throw new Error(`Assertion failed: Expected a glob pattern to have been set`);
            const matches = await opts.glob.match(pattern, { cwd: state.cwd, baseFs: opts.baseFs });
            if (matches.length === 0) {
                const braceExpansionNotice = globUtils.isBraceExpansion(pattern)
                    ? `. Note: Brace expansion of arbitrary strings isn't currently supported. For more details, please read this issue: https://github.com/yarnpkg/berry/issues/22`
                    : ``;
                throw new errors_1.ShellError(`No matches found: "${pattern}"${braceExpansionNotice}`);
            }
            for (const match of matches.sort()) {
                pushAndClose(match);
            }
        }
    }
    if (redirections.size > 0) {
        const redirectionArgs = [];
        for (const [key, targets] of redirections.entries())
            redirectionArgs.splice(redirectionArgs.length, 0, key, String(targets.length), ...targets);
        interpolated.splice(0, 0, `__ysh_set_redirects`, ...redirectionArgs, `--`);
    }
    return interpolated;
}
/**
 * Executes a command chain. A command chain is a list of commands linked
 * together thanks to the use of either of the `|` or `|&` operators:
 *
 * $ cat hello | grep world | grep -v foobar
 */
function makeCommandAction(args, opts, state) {
    if (!opts.builtins.has(args[0]))
        args = [`command`, ...args];
    const nativeCwd = fslib_1.npath.fromPortablePath(state.cwd);
    let env = state.environment;
    if (typeof env.PWD !== `undefined`)
        env = { ...env, PWD: nativeCwd };
    const [name, ...rest] = args;
    if (name === `command`) {
        return (0, pipe_1.makeProcess)(rest[0], rest.slice(1), opts, {
            cwd: nativeCwd,
            env,
        });
    }
    const builtin = opts.builtins.get(name);
    if (typeof builtin === `undefined`)
        throw new Error(`Assertion failed: A builtin should exist for "${name}"`);
    return (0, pipe_1.makeBuiltin)(async ({ stdin, stdout, stderr }) => {
        const { stdin: initialStdin, stdout: initialStdout, stderr: initialStderr, } = state;
        state.stdin = stdin;
        state.stdout = stdout;
        state.stderr = stderr;
        try {
            return await builtin(rest, opts, state);
        }
        finally {
            state.stdin = initialStdin;
            state.stdout = initialStdout;
            state.stderr = initialStderr;
        }
    });
}
function makeSubshellAction(ast, opts, state) {
    return (stdio) => {
        const stdin = new stream_1.PassThrough();
        const promise = executeShellLine(ast, opts, cloneState(state, { stdin }));
        return { stdin, promise };
    };
}
function makeGroupAction(ast, opts, state) {
    return (stdio) => {
        const stdin = new stream_1.PassThrough();
        const promise = executeShellLine(ast, opts, state);
        return { stdin, promise };
    };
}
function makeActionFromProcedure(procedure, args, opts, activeState) {
    if (args.length === 0) {
        return procedure;
    }
    else {
        let key;
        do {
            key = String(Math.random());
        } while (Object.prototype.hasOwnProperty.call(activeState.procedures, key));
        activeState.procedures = { ...activeState.procedures };
        activeState.procedures[key] = procedure;
        return makeCommandAction([...args, `__ysh_run_procedure`, key], opts, activeState);
    }
}
async function executeCommandChainImpl(node, opts, state) {
    let current = node;
    let pipeType = null;
    let execution = null;
    while (current) {
        // Only the final segment is allowed to modify the shell state; all the
        // other ones are isolated
        const activeState = current.then
            ? { ...state }
            : state;
        let action;
        switch (current.type) {
            case `command`:
                {
                    const args = await interpolateArguments(current.args, opts, state);
                    const environment = await applyEnvVariables(current.envs, opts, state);
                    action = current.envs.length
                        ? makeCommandAction(args, opts, cloneState(activeState, { environment }))
                        : makeCommandAction(args, opts, activeState);
                }
                break;
            case `subshell`:
                {
                    const args = await interpolateArguments(current.args, opts, state);
                    // We don't interpolate the subshell because it will be recursively
                    // interpolated within its own context
                    const procedure = makeSubshellAction(current.subshell, opts, activeState);
                    action = makeActionFromProcedure(procedure, args, opts, activeState);
                }
                break;
            case `group`:
                {
                    const args = await interpolateArguments(current.args, opts, state);
                    const procedure = makeGroupAction(current.group, opts, activeState);
                    action = makeActionFromProcedure(procedure, args, opts, activeState);
                }
                break;
            case `envs`:
                {
                    const environment = await applyEnvVariables(current.envs, opts, state);
                    activeState.environment = { ...activeState.environment, ...environment };
                    action = makeCommandAction([`true`], opts, activeState);
                }
                break;
        }
        if (typeof action === `undefined`)
            throw new Error(`Assertion failed: An action should have been generated`);
        if (pipeType === null) {
            // If we're processing the left-most segment of the command, we start a
            // new execution pipeline
            execution = (0, pipe_2.start)(action, {
                stdin: new pipe_2.ProtectedStream(activeState.stdin),
                stdout: new pipe_2.ProtectedStream(activeState.stdout),
                stderr: new pipe_2.ProtectedStream(activeState.stderr),
            });
        }
        else {
            if (execution === null)
                throw new Error(`Assertion failed: The execution pipeline should have been setup`);
            // Otherwise, depending on the exaxct pipe type, we either pipe stdout
            // only or stdout and stderr
            switch (pipeType) {
                case `|`:
                    {
                        execution = execution.pipeTo(action, pipe_2.Pipe.STDOUT);
                    }
                    break;
                case `|&`:
                    {
                        execution = execution.pipeTo(action, pipe_2.Pipe.STDOUT | pipe_2.Pipe.STDERR);
                    }
                    break;
            }
        }
        if (current.then) {
            pipeType = current.then.type;
            current = current.then.chain;
        }
        else {
            current = null;
        }
    }
    if (execution === null)
        throw new Error(`Assertion failed: The execution pipeline should have been setup`);
    return await execution.run();
}
async function executeCommandChain(node, opts, state, { background = false } = {}) {
    function getColorizer(index) {
        const colors = [`#2E86AB`, `#A23B72`, `#F18F01`, `#C73E1D`, `#CCE2A3`];
        const colorName = colors[index % colors.length];
        return chalk_1.default.hex(colorName);
    }
    if (background) {
        const index = state.nextBackgroundJobIndex++;
        const colorizer = getColorizer(index);
        const rawPrefix = `[${index}]`;
        const prefix = colorizer(rawPrefix);
        const { stdout, stderr } = (0, pipe_1.createOutputStreamsWithPrefix)(state, { prefix });
        state.backgroundJobs.push(executeCommandChainImpl(node, opts, cloneState(state, { stdout, stderr }))
            .catch(error => stderr.write(`${error.message}\n`))
            .finally(() => {
            if (state.stdout.isTTY) {
                state.stdout.write(`Job ${prefix}, '${colorizer((0, parsers_1.stringifyCommandChain)(node))}' has ended\n`);
            }
        }));
        return 0;
    }
    return await executeCommandChainImpl(node, opts, state);
}
/**
 * Execute a command line. A command line is a list of command shells linked
 * together thanks to the use of either of the `||` or `&&` operators.
 */
async function executeCommandLine(node, opts, state, { background = false } = {}) {
    let code;
    const setCode = (newCode) => {
        code = newCode;
        // We must update $?, which always contains the exit code from
        // the right-most command
        state.variables[`?`] = String(newCode);
    };
    const executeChain = async (line) => {
        try {
            return await executeCommandChain(line.chain, opts, state, { background: background && typeof line.then === `undefined` });
        }
        catch (error) {
            if (!(error instanceof errors_1.ShellError))
                throw error;
            state.stderr.write(`${error.message}\n`);
            return 1;
        }
    };
    setCode(await executeChain(node));
    // We use a loop because we must make sure that we respect
    // the left associativity of lists, as per the bash spec.
    // (e.g. `inexistent && echo yes || echo no` must be
    // the same as `{inexistent && echo yes} || echo no`)
    while (node.then) {
        // If the execution aborted (usually through "exit"), we must bailout
        if (state.exitCode !== null)
            return state.exitCode;
        switch (node.then.type) {
            case `&&`:
                {
                    if (code === 0) {
                        setCode(await executeChain(node.then.line));
                    }
                }
                break;
            case `||`:
                {
                    if (code !== 0) {
                        setCode(await executeChain(node.then.line));
                    }
                }
                break;
            default: {
                throw new Error(`Assertion failed: Unsupported command type: "${node.then.type}"`);
            }
        }
        node = node.then.line;
    }
    return code;
}
async function executeShellLine(node, opts, state) {
    const originalBackgroundJobs = state.backgroundJobs;
    state.backgroundJobs = [];
    let rightMostExitCode = 0;
    for (const { command, type } of node) {
        rightMostExitCode = await executeCommandLine(command, opts, state, { background: type === `&` });
        // If the execution aborted (usually through "exit"), we must bailout
        if (state.exitCode !== null)
            return state.exitCode;
        // We must update $?, which always contains the exit code from
        // the right-most command
        state.variables[`?`] = String(rightMostExitCode);
    }
    await Promise.all(state.backgroundJobs);
    state.backgroundJobs = originalBackgroundJobs;
    return rightMostExitCode;
}
function locateArgsVariableInSegment(segment) {
    switch (segment.type) {
        case `variable`: {
            return segment.name === `@` || segment.name === `#` || segment.name === `*` || Number.isFinite(parseInt(segment.name, 10)) || (`defaultValue` in segment && !!segment.defaultValue && segment.defaultValue.some(arg => locateArgsVariableInArgument(arg))) || (`alternativeValue` in segment && !!segment.alternativeValue && segment.alternativeValue.some(arg => locateArgsVariableInArgument(arg)));
        }
        case `arithmetic`: {
            return locateArgsVariableInArithmetic(segment.arithmetic);
        }
        case `shell`: {
            return locateArgsVariable(segment.shell);
        }
        default: {
            return false;
        }
    }
}
function locateArgsVariableInArgument(arg) {
    switch (arg.type) {
        case `redirection`: {
            return arg.args.some(arg => locateArgsVariableInArgument(arg));
        }
        case `argument`: {
            return arg.segments.some(segment => locateArgsVariableInSegment(segment));
        }
        default:
            throw new Error(`Assertion failed: Unsupported argument type: "${arg.type}"`);
    }
}
function locateArgsVariableInArithmetic(arg) {
    switch (arg.type) {
        case `variable`: {
            return locateArgsVariableInSegment(arg);
        }
        case `number`: {
            return false;
        }
        default:
            return locateArgsVariableInArithmetic(arg.left) || locateArgsVariableInArithmetic(arg.right);
    }
}
function locateArgsVariable(node) {
    return node.some(({ command }) => {
        while (command) {
            let chain = command.chain;
            while (chain) {
                let hasArgs;
                switch (chain.type) {
                    case `subshell`:
                        {
                            hasArgs = locateArgsVariable(chain.subshell);
                        }
                        break;
                    case `command`:
                        {
                            hasArgs = chain.envs.some(env => env.args.some(arg => {
                                return locateArgsVariableInArgument(arg);
                            })) || chain.args.some(arg => {
                                return locateArgsVariableInArgument(arg);
                            });
                        }
                        break;
                }
                if (hasArgs)
                    return true;
                if (!chain.then)
                    break;
                chain = chain.then.chain;
            }
            if (!command.then)
                break;
            command = command.then.line;
        }
        return false;
    });
}
async function execute(command, args = [], { baseFs = new fslib_1.NodeFS(), builtins = {}, cwd = fslib_1.npath.toPortablePath(process.cwd()), env = process.env, stdin = process.stdin, stdout = process.stdout, stderr = process.stderr, variables = {}, glob = globUtils, } = {}) {
    const normalizedEnv = {};
    for (const [key, value] of Object.entries(env))
        if (typeof value !== `undefined`)
            normalizedEnv[key] = value;
    const normalizedBuiltins = new Map(BUILTINS);
    for (const [key, builtin] of Object.entries(builtins))
        normalizedBuiltins.set(key, builtin);
    // This is meant to be the equivalent of /dev/null
    if (stdin === null) {
        stdin = new stream_1.PassThrough();
        stdin.end();
    }
    const ast = (0, parsers_1.parseShell)(command, glob);
    // If the shell line doesn't use the args, inject it at the end of the
    // right-most command
    if (!locateArgsVariable(ast) && ast.length > 0 && args.length > 0) {
        let { command } = ast[ast.length - 1];
        while (command.then)
            command = command.then.line;
        let chain = command.chain;
        while (chain.then)
            chain = chain.then.chain;
        if (chain.type === `command`) {
            chain.args = chain.args.concat(args.map(arg => {
                return {
                    type: `argument`,
                    segments: [{
                            type: `text`,
                            text: arg,
                        }],
                };
            }));
        }
    }
    return await executeShellLine(ast, {
        args,
        baseFs,
        builtins: normalizedBuiltins,
        initialStdin: stdin,
        initialStdout: stdout,
        initialStderr: stderr,
        glob,
    }, {
        cwd,
        environment: normalizedEnv,
        exitCode: null,
        procedures: {},
        stdin,
        stdout,
        stderr,
        variables: Object.assign({}, variables, {
            [`?`]: 0,
        }),
        nextBackgroundJobIndex: 1,
        backgroundJobs: [],
    });
}
exports.execute = execute;

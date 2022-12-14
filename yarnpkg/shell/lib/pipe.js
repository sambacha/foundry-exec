"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOutputStreamsWithPrefix = exports.start = exports.Handle = exports.ProtectedStream = exports.makeBuiltin = exports.makeProcess = exports.Pipe = void 0;
const tslib_1 = require("tslib");
const cross_spawn_1 = tslib_1.__importDefault(require("cross-spawn"));
const stream_1 = require("stream");
const string_decoder_1 = require("string_decoder");
var Pipe;
(function (Pipe) {
    Pipe[Pipe["STDIN"] = 0] = "STDIN";
    Pipe[Pipe["STDOUT"] = 1] = "STDOUT";
    Pipe[Pipe["STDERR"] = 2] = "STDERR";
})(Pipe = exports.Pipe || (exports.Pipe = {}));
const activeChildren = new Set();
function sigintHandler() {
    // We don't want SIGINT to kill our process; we want it to kill the
    // innermost process, whose end will cause our own to exit.
}
function sigtermHandler() {
    for (const child of activeChildren) {
        child.kill();
    }
}
function makeProcess(name, args, opts, spawnOpts) {
    return (stdio) => {
        const stdin = stdio[0] instanceof stream_1.Transform
            ? `pipe`
            : stdio[0];
        const stdout = stdio[1] instanceof stream_1.Transform
            ? `pipe`
            : stdio[1];
        const stderr = stdio[2] instanceof stream_1.Transform
            ? `pipe`
            : stdio[2];
        const child = (0, cross_spawn_1.default)(name, args, { ...spawnOpts, stdio: [
                stdin,
                stdout,
                stderr,
            ] });
        activeChildren.add(child);
        if (activeChildren.size === 1) {
            process.on(`SIGINT`, sigintHandler);
            process.on(`SIGTERM`, sigtermHandler);
        }
        if (stdio[0] instanceof stream_1.Transform)
            stdio[0].pipe(child.stdin);
        if (stdio[1] instanceof stream_1.Transform)
            child.stdout.pipe(stdio[1], { end: false });
        if (stdio[2] instanceof stream_1.Transform)
            child.stderr.pipe(stdio[2], { end: false });
        return {
            stdin: child.stdin,
            promise: new Promise(resolve => {
                child.on(`error`, error => {
                    activeChildren.delete(child);
                    if (activeChildren.size === 0) {
                        process.off(`SIGINT`, sigintHandler);
                        process.off(`SIGTERM`, sigtermHandler);
                    }
                    // @ts-expect-error
                    switch (error.code) {
                        case `ENOENT`:
                            {
                                stdio[2].write(`command not found: ${name}\n`);
                                resolve(127);
                            }
                            break;
                        case `EACCES`:
                            {
                                stdio[2].write(`permission denied: ${name}\n`);
                                resolve(128);
                            }
                            break;
                        default:
                            {
                                stdio[2].write(`uncaught error: ${error.message}\n`);
                                resolve(1);
                            }
                            break;
                    }
                });
                child.on(`close`, code => {
                    activeChildren.delete(child);
                    if (activeChildren.size === 0) {
                        process.off(`SIGINT`, sigintHandler);
                        process.off(`SIGTERM`, sigtermHandler);
                    }
                    if (code !== null) {
                        resolve(code);
                    }
                    else {
                        resolve(129);
                    }
                });
            }),
        };
    };
}
exports.makeProcess = makeProcess;
function makeBuiltin(builtin) {
    return (stdio) => {
        const stdin = stdio[0] === `pipe`
            ? new stream_1.PassThrough()
            : stdio[0];
        return {
            stdin,
            promise: Promise.resolve().then(() => builtin({
                stdin,
                stdout: stdio[1],
                stderr: stdio[2],
            })),
        };
    };
}
exports.makeBuiltin = makeBuiltin;
class ProtectedStream {
    constructor(stream) {
        this.stream = stream;
    }
    close() {
        // Ignore close request
    }
    get() {
        return this.stream;
    }
}
exports.ProtectedStream = ProtectedStream;
class PipeStream {
    constructor() {
        this.stream = null;
    }
    close() {
        if (this.stream === null) {
            throw new Error(`Assertion failed: No stream attached`);
        }
        else {
            this.stream.end();
        }
    }
    attach(stream) {
        this.stream = stream;
    }
    get() {
        if (this.stream === null) {
            throw new Error(`Assertion failed: No stream attached`);
        }
        else {
            return this.stream;
        }
    }
}
class Handle {
    constructor(ancestor, implementation) {
        this.stdin = null;
        this.stdout = null;
        this.stderr = null;
        this.pipe = null;
        this.ancestor = ancestor;
        this.implementation = implementation;
    }
    static start(implementation, { stdin, stdout, stderr }) {
        const chain = new Handle(null, implementation);
        chain.stdin = stdin;
        chain.stdout = stdout;
        chain.stderr = stderr;
        return chain;
    }
    pipeTo(implementation, source = Pipe.STDOUT) {
        const next = new Handle(this, implementation);
        const pipe = new PipeStream();
        next.pipe = pipe;
        next.stdout = this.stdout;
        next.stderr = this.stderr;
        if ((source & Pipe.STDOUT) === Pipe.STDOUT)
            this.stdout = pipe;
        else if (this.ancestor !== null)
            this.stderr = this.ancestor.stdout;
        if ((source & Pipe.STDERR) === Pipe.STDERR)
            this.stderr = pipe;
        else if (this.ancestor !== null)
            this.stderr = this.ancestor.stderr;
        return next;
    }
    async exec() {
        const stdio = [
            `ignore`,
            `ignore`,
            `ignore`,
        ];
        if (this.pipe) {
            stdio[0] = `pipe`;
        }
        else {
            if (this.stdin === null) {
                throw new Error(`Assertion failed: No input stream registered`);
            }
            else {
                stdio[0] = this.stdin.get();
            }
        }
        let stdoutLock;
        if (this.stdout === null) {
            throw new Error(`Assertion failed: No output stream registered`);
        }
        else {
            stdoutLock = this.stdout;
            stdio[1] = stdoutLock.get();
        }
        let stderrLock;
        if (this.stderr === null) {
            throw new Error(`Assertion failed: No error stream registered`);
        }
        else {
            stderrLock = this.stderr;
            stdio[2] = stderrLock.get();
        }
        const child = this.implementation(stdio);
        if (this.pipe)
            this.pipe.attach(child.stdin);
        return await child.promise.then(code => {
            stdoutLock.close();
            stderrLock.close();
            return code;
        });
    }
    async run() {
        const promises = [];
        for (let handle = this; handle; handle = handle.ancestor)
            promises.push(handle.exec());
        const exitCodes = await Promise.all(promises);
        return exitCodes[0];
    }
}
exports.Handle = Handle;
function start(p, opts) {
    return Handle.start(p, opts);
}
exports.start = start;
function createStreamReporter(reportFn, prefix = null) {
    const stream = new stream_1.PassThrough();
    const decoder = new string_decoder_1.StringDecoder();
    let buffer = ``;
    stream.on(`data`, chunk => {
        let chunkStr = decoder.write(chunk);
        let lineIndex;
        do {
            lineIndex = chunkStr.indexOf(`\n`);
            if (lineIndex !== -1) {
                const line = buffer + chunkStr.substring(0, lineIndex);
                chunkStr = chunkStr.substring(lineIndex + 1);
                buffer = ``;
                if (prefix !== null) {
                    reportFn(`${prefix} ${line}`);
                }
                else {
                    reportFn(line);
                }
            }
        } while (lineIndex !== -1);
        buffer += chunkStr;
    });
    stream.on(`end`, () => {
        const last = decoder.end();
        if (last !== ``) {
            if (prefix !== null) {
                reportFn(`${prefix} ${last}`);
            }
            else {
                reportFn(last);
            }
        }
    });
    return stream;
}
function createOutputStreamsWithPrefix(state, { prefix }) {
    return {
        stdout: createStreamReporter(text => state.stdout.write(`${text}\n`), state.stdout.isTTY ? prefix : null),
        stderr: createStreamReporter(text => state.stderr.write(`${text}\n`), state.stderr.isTTY ? prefix : null),
    };
}
exports.createOutputStreamsWithPrefix = createOutputStreamsWithPrefix;

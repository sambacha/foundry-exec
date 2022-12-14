/// <reference types="node" />
import { PassThrough, Readable, Writable } from 'stream';
import { ShellOptions, ShellState } from './index';
export declare enum Pipe {
    STDIN = 0,
    STDOUT = 1,
    STDERR = 2
}
export declare type Stdio = [
    any,
    any,
    any
];
export declare type ProcessImplementation = (stdio: Stdio) => {
    stdin: Writable;
    promise: Promise<number>;
};
export declare function makeProcess(name: string, args: Array<string>, opts: ShellOptions, spawnOpts: any): ProcessImplementation;
export declare function makeBuiltin(builtin: (opts: any) => Promise<number>): ProcessImplementation;
interface StreamLock<StreamType> {
    close(): void;
    get(): StreamType;
}
export declare class ProtectedStream<StreamType> implements StreamLock<StreamType> {
    private stream;
    constructor(stream: StreamType);
    close(): void;
    get(): StreamType;
}
declare type StartOptions = {
    stdin: StreamLock<Readable>;
    stdout: StreamLock<Writable>;
    stderr: StreamLock<Writable>;
};
export declare class Handle {
    private ancestor;
    private implementation;
    private stdin;
    private stdout;
    private stderr;
    private pipe;
    static start(implementation: ProcessImplementation, { stdin, stdout, stderr }: StartOptions): Handle;
    constructor(ancestor: Handle | null, implementation: ProcessImplementation);
    pipeTo(implementation: ProcessImplementation, source?: Pipe): Handle;
    exec(): Promise<number>;
    run(): Promise<number>;
}
export declare function start(p: ProcessImplementation, opts: StartOptions): Handle;
export declare function createOutputStreamsWithPrefix(state: ShellState, { prefix }: {
    prefix: string | null;
}): {
    stdout: PassThrough;
    stderr: PassThrough;
};
export {};

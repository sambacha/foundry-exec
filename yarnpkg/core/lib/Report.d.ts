/// <reference types="node" />
import { PassThrough } from 'stream';
import { MessageName } from './MessageName';
import { Locator } from './types';
export declare class ReportError extends Error {
    reportExtra?: ((report: Report) => void) | undefined;
    reportCode: MessageName;
    originalError?: Error;
    constructor(code: MessageName, message: string, reportExtra?: ((report: Report) => void) | undefined);
}
export declare function isReportError(error: Error): error is ReportError;
export declare type ProgressDefinition = {
    progress?: number;
    title?: string;
};
export declare type ProgressIterable = AsyncIterable<ProgressDefinition> & {
    hasProgress: boolean;
    hasTitle: boolean;
};
export declare type SectionOptions = {
    reportHeader?: () => void;
    reportFooter?: (elapsedTime: number) => void;
    skipIfEmpty?: boolean;
};
export declare type TimerOptions = Pick<SectionOptions, 'skipIfEmpty'>;
export declare abstract class Report {
    private reportedInfos;
    private reportedWarnings;
    private reportedErrors;
    abstract reportCacheHit(locator: Locator): void;
    abstract reportCacheMiss(locator: Locator, message?: string): void;
    abstract startSectionPromise<T>(opts: SectionOptions, cb: () => Promise<T>): Promise<T>;
    abstract startSectionSync<T>(opts: SectionOptions, cb: () => T): T;
    abstract startTimerPromise<T>(what: string, opts: TimerOptions, cb: () => Promise<T>): Promise<T>;
    abstract startTimerPromise<T>(what: string, cb: () => Promise<T>): Promise<T>;
    abstract startTimerSync<T>(what: string, opts: TimerOptions, cb: () => T): T;
    abstract startTimerSync<T>(what: string, cb: () => T): T;
    abstract startCacheReport<T>(cb: () => Promise<T>): Promise<T>;
    abstract reportSeparator(): void;
    abstract reportInfo(name: MessageName | null, text: string): void;
    abstract reportWarning(name: MessageName, text: string): void;
    abstract reportError(name: MessageName, text: string): void;
    abstract reportProgress(progress: AsyncIterable<ProgressDefinition>): Promise<void> & {
        stop: () => void;
    };
    abstract reportJson(data: any): void;
    abstract finalize(): void;
    static progressViaCounter(max: number): {
        [Symbol.asyncIterator](): AsyncGenerator<{
            progress: number;
        }, void, unknown>;
        hasProgress: boolean;
        hasTitle: boolean;
        set: (n: number) => void;
        tick: (n?: number) => void;
    };
    static progressViaTitle(): {
        [Symbol.asyncIterator](): AsyncGenerator<{
            title: string | undefined;
        }, never, unknown>;
        hasProgress: boolean;
        hasTitle: boolean;
        setTitle: import("lodash").DebouncedFunc<(title: string) => void>;
    };
    startProgressPromise<T, P extends ProgressIterable>(progressIt: P, cb: (progressIt: P) => Promise<T>): Promise<T>;
    startProgressSync<T, P extends ProgressIterable>(progressIt: P, cb: (progressIt: P) => T): T;
    reportInfoOnce(name: MessageName, text: string, opts?: {
        key?: any;
        reportExtra?: (report: Report) => void;
    }): void;
    reportWarningOnce(name: MessageName, text: string, opts?: {
        key?: any;
        reportExtra?: (report: Report) => void;
    }): void;
    reportErrorOnce(name: MessageName, text: string, opts?: {
        key?: any;
        reportExtra?: (report: Report) => void;
    }): void;
    reportExceptionOnce(error: Error | ReportError): void;
    createStreamReporter(prefix?: string | null): PassThrough;
}

/// <reference types="node" />
import { Writable } from 'stream';
import { Configuration } from './Configuration';
import { MessageName } from './MessageName';
import { Report, SectionOptions, TimerOptions } from './Report';
import { Locator } from './types';
export declare type LightReportOptions = {
    configuration: Configuration;
    stdout: Writable;
    suggestInstall?: boolean;
};
export declare class LightReport extends Report {
    static start(opts: LightReportOptions, cb: (report: LightReport) => Promise<void>): Promise<LightReport>;
    private configuration;
    private stdout;
    private suggestInstall;
    private errorCount;
    constructor({ configuration, stdout, suggestInstall }: LightReportOptions);
    hasErrors(): boolean;
    exitCode(): 1 | 0;
    reportCacheHit(locator: Locator): void;
    reportCacheMiss(locator: Locator): void;
    startSectionSync<T>(opts: SectionOptions, cb: () => T): T;
    startSectionPromise<T>(opts: SectionOptions, cb: () => Promise<T>): Promise<T>;
    startTimerSync<T>(what: string, opts: TimerOptions, cb: () => T): T;
    startTimerSync<T>(what: string, cb: () => T): T;
    startTimerPromise<T>(what: string, opts: TimerOptions, cb: () => Promise<T>): Promise<T>;
    startTimerPromise<T>(what: string, cb: () => Promise<T>): Promise<T>;
    startCacheReport<T>(cb: () => Promise<T>): Promise<T>;
    reportSeparator(): void;
    reportInfo(name: MessageName | null, text: string): void;
    reportWarning(name: MessageName, text: string): void;
    reportError(name: MessageName, text: string): void;
    reportProgress(progress: AsyncIterable<{
        progress: number;
        title?: string;
    }>): {
        stop: () => void;
        then<TResult1 = void, TResult2 = never>(onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2>;
        catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): Promise<void | TResult>;
        finally(onfinally?: (() => void) | null | undefined): Promise<void>;
        [Symbol.toStringTag]: string;
    };
    reportJson(data: any): void;
    finalize(): Promise<void>;
    private formatNameWithHyperlink;
}

/// <reference types="node" />
import { NativePath, PortablePath } from '@yarnpkg/fslib';
import { Readable, Writable } from 'stream';
import { Configuration } from './Configuration';
import { Project } from './Project';
import { Report } from './Report';
import { Workspace } from './Workspace';
import { Locator } from './types';
/**
 * @internal
 */
export declare enum PackageManager {
    Yarn1 = "Yarn Classic",
    Yarn2 = "Yarn",
    Npm = "npm",
    Pnpm = "pnpm"
}
interface PackageManagerSelection {
    packageManager: PackageManager;
    reason: string;
}
/**
 * @internal
 */
export declare function detectPackageManager(location: PortablePath): Promise<PackageManagerSelection | null>;
export declare function makeScriptEnv({ project, locator, binFolder, lifecycleScript }: {
    project?: Project;
    locator?: Locator;
    binFolder: PortablePath;
    lifecycleScript?: string;
}): Promise<{
    [key: string]: string;
} & {
    BERRY_BIN_FOLDER: string;
}>;
export declare function prepareExternalProject(cwd: PortablePath, outputPath: PortablePath, { configuration, report, workspace, locator }: {
    configuration: Configuration;
    report: Report;
    workspace?: string | null;
    locator?: Locator | null;
}): Promise<void>;
declare type HasPackageScriptOption = {
    project: Project;
};
export declare function hasPackageScript(locator: Locator, scriptName: string, { project }: HasPackageScriptOption): Promise<boolean>;
declare type ExecutePackageScriptOptions = {
    cwd?: PortablePath | undefined;
    project: Project;
    stdin: Readable | null;
    stdout: Writable;
    stderr: Writable;
};
export declare function executePackageScript(locator: Locator, scriptName: string, args: Array<string>, { cwd, project, stdin, stdout, stderr }: ExecutePackageScriptOptions): Promise<number>;
export declare function executePackageShellcode(locator: Locator, command: string, args: Array<string>, { cwd, project, stdin, stdout, stderr }: ExecutePackageScriptOptions): Promise<number>;
declare type ExecuteWorkspaceScriptOptions = {
    cwd?: PortablePath | undefined;
    stdin: Readable | null;
    stdout: Writable;
    stderr: Writable;
};
export declare function executeWorkspaceScript(workspace: Workspace, scriptName: string, args: Array<string>, { cwd, stdin, stdout, stderr }: ExecuteWorkspaceScriptOptions): Promise<number>;
export declare function hasWorkspaceScript(workspace: Workspace, scriptName: string): boolean;
declare type ExecuteWorkspaceLifecycleScriptOptions = {
    cwd?: PortablePath | undefined;
    report: Report;
};
export declare function executeWorkspaceLifecycleScript(workspace: Workspace, lifecycleScriptName: string, { cwd, report }: ExecuteWorkspaceLifecycleScriptOptions): Promise<void>;
export declare function maybeExecuteWorkspaceLifecycleScript(workspace: Workspace, lifecycleScriptName: string, opts: ExecuteWorkspaceLifecycleScriptOptions): Promise<void>;
declare type GetPackageAccessibleBinariesOptions = {
    project: Project;
};
declare type Binary = [Locator, NativePath];
declare type PackageAccessibleBinaries = Map<string, Binary>;
/**
 * Return the binaries that can be accessed by the specified package
 *
 * @param locator The queried package
 * @param project The project owning the package
 */
export declare function getPackageAccessibleBinaries(locator: Locator, { project }: GetPackageAccessibleBinariesOptions): Promise<PackageAccessibleBinaries>;
/**
 * Return the binaries that can be accessed by the specified workspace
 *
 * @param workspace The queried workspace
 */
export declare function getWorkspaceAccessibleBinaries(workspace: Workspace): Promise<PackageAccessibleBinaries>;
declare type ExecutePackageAccessibleBinaryOptions = {
    cwd: PortablePath;
    nodeArgs?: Array<string>;
    project: Project;
    stdin: Readable | null;
    stdout: Writable;
    stderr: Writable;
    /** @internal */
    packageAccessibleBinaries?: PackageAccessibleBinaries;
};
/**
 * Execute a binary from the specified package.
 *
 * Note that "binary" in this sense means "a Javascript file". Actual native
 * binaries cannot be executed this way, because we use Node in order to
 * transparently read from the archives.
 *
 * @param locator The queried package
 * @param binaryName The name of the binary file to execute
 * @param args The arguments to pass to the file
 */
export declare function executePackageAccessibleBinary(locator: Locator, binaryName: string, args: Array<string>, { cwd, project, stdin, stdout, stderr, nodeArgs, packageAccessibleBinaries }: ExecutePackageAccessibleBinaryOptions): Promise<number>;
declare type ExecuteWorkspaceAccessibleBinaryOptions = {
    cwd: PortablePath;
    stdin: Readable | null;
    stdout: Writable;
    stderr: Writable;
    /** @internal */
    packageAccessibleBinaries?: PackageAccessibleBinaries;
};
/**
 * Execute a binary from the specified workspace
 *
 * @param workspace The queried package
 * @param binaryName The name of the binary file to execute
 * @param args The arguments to pass to the file
 */
export declare function executeWorkspaceAccessibleBinary(workspace: Workspace, binaryName: string, args: Array<string>, { cwd, stdin, stdout, stderr, packageAccessibleBinaries }: ExecuteWorkspaceAccessibleBinaryOptions): Promise<number>;
export {};

declare enum PathType {
    File = 0,
    Portable = 1,
    Native = 2
}
export declare type PortablePath = string & {
    __pathType: PathType.File | PathType.Portable;
};
export declare type NativePath = string & {
    __pathType?: PathType.File | PathType.Native;
};
export declare const PortablePath: {
    root: PortablePath;
    dot: PortablePath;
};
export declare type Filename = string & {
    __pathType: PathType.File;
};
export declare type Path = PortablePath | NativePath;
export declare const Filename: {
    home: Filename;
    nodeModules: Filename;
    manifest: Filename;
    lockfile: Filename;
    virtual: Filename;
    /**
     * @deprecated
     */
    pnpJs: Filename;
    pnpCjs: Filename;
    rc: Filename;
};
export declare type FSPath<T extends Path> = T | number;
export declare const npath: PathUtils<NativePath> & ConvertUtils;
export declare const ppath: PathUtils<PortablePath>;
export interface ParsedPath<P extends Path> {
    root: P;
    dir: P;
    base: Filename;
    ext: string;
    name: Filename;
}
export interface FormatInputPathObject<P extends Path> {
    root?: P;
    dir?: P;
    base?: Filename;
    ext?: string;
    name?: Filename;
}
export interface PathUtils<P extends Path> {
    cwd(): P;
    normalize(p: P): P;
    join(...paths: Array<P | Filename>): P;
    resolve(...pathSegments: Array<P | Filename>): P;
    isAbsolute(path: P): boolean;
    relative(from: P, to: P): P;
    dirname(p: P): P;
    basename(p: P, ext?: string): Filename;
    extname(p: P): string;
    readonly sep: P;
    readonly delimiter: string;
    parse(pathString: P): ParsedPath<P>;
    format(pathObject: FormatInputPathObject<P>): P;
    contains(from: P, to: P): P | null;
}
export interface ConvertUtils {
    fromPortablePath: (p: Path) => NativePath;
    toPortablePath: (p: Path) => PortablePath;
}
export declare function convertPath<P extends Path>(targetPathUtils: PathUtils<P>, sourcePath: Path): P;
export declare function toFilename(filename: string): Filename;
export {};

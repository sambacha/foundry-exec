import { FakeFS } from '../FakeFS';
import { Path } from '../path';
export declare type HardlinkFromIndexStrategy<P> = {
    type: `HardlinkFromIndex`;
    indexPath: P;
    autoRepair?: boolean;
    readOnly?: boolean;
};
export declare type LinkStrategy<P> = HardlinkFromIndexStrategy<P>;
export declare type CopyOptions<P> = {
    linkStrategy: LinkStrategy<P> | null;
    stableTime: boolean;
    stableSort: boolean;
    overwrite: boolean;
};
export declare type Operations = Array<() => Promise<void>>;
export declare type LUTimes<P extends Path> = Array<[P, Date | number, Date | number]>;
export declare function setupCopyIndex<P extends Path>(destinationFs: FakeFS<P>, linkStrategy: Pick<HardlinkFromIndexStrategy<P>, `indexPath`>): Promise<P>;
export declare function copyPromise<P1 extends Path, P2 extends Path>(destinationFs: FakeFS<P1>, destination: P1, sourceFs: FakeFS<P2>, source: P2, opts: CopyOptions<P1>): Promise<void>;

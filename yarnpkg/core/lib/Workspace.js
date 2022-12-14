"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workspace = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const globby_1 = tslib_1.__importDefault(require("globby"));
const Manifest_1 = require("./Manifest");
const WorkspaceResolver_1 = require("./WorkspaceResolver");
const hashUtils = tslib_1.__importStar(require("./hashUtils"));
const semverUtils = tslib_1.__importStar(require("./semverUtils"));
const structUtils = tslib_1.__importStar(require("./structUtils"));
class Workspace {
    constructor(workspaceCwd, { project }) {
        this.workspacesCwds = new Set();
        // Generated at resolution; basically dependencies + devDependencies + child workspaces
        this.dependencies = new Map();
        this.project = project;
        this.cwd = workspaceCwd;
    }
    async setup() {
        var _a;
        // @ts-expect-error: It's ok to initialize it now
        this.manifest = (_a = await Manifest_1.Manifest.tryFind(this.cwd)) !== null && _a !== void 0 ? _a : new Manifest_1.Manifest();
        // We use ppath.relative to guarantee that the default hash will be consistent even if the project is installed on different OS / path
        // @ts-expect-error: It's ok to initialize it now, even if it's readonly (setup is called right after construction)
        this.relativeCwd = fslib_1.ppath.relative(this.project.cwd, this.cwd) || fslib_1.PortablePath.dot;
        const ident = this.manifest.name ? this.manifest.name : structUtils.makeIdent(null, `${this.computeCandidateName()}-${hashUtils.makeHash(this.relativeCwd).substring(0, 6)}`);
        const reference = this.manifest.version ? this.manifest.version : `0.0.0`;
        // @ts-expect-error: It's ok to initialize it now, even if it's readonly (setup is called right after construction)
        this.locator = structUtils.makeLocator(ident, reference);
        // @ts-expect-error: It's ok to initialize it now, even if it's readonly (setup is called right after construction)
        this.anchoredDescriptor = structUtils.makeDescriptor(this.locator, `${WorkspaceResolver_1.WorkspaceResolver.protocol}${this.relativeCwd}`);
        // @ts-expect-error: It's ok to initialize it now, even if it's readonly (setup is called right after construction)
        this.anchoredLocator = structUtils.makeLocator(this.locator, `${WorkspaceResolver_1.WorkspaceResolver.protocol}${this.relativeCwd}`);
        const patterns = this.manifest.workspaceDefinitions.map(({ pattern }) => pattern);
        const relativeCwds = await (0, globby_1.default)(patterns, {
            cwd: fslib_1.npath.fromPortablePath(this.cwd),
            expandDirectories: false,
            onlyDirectories: true,
            onlyFiles: false,
            ignore: [`**/node_modules`, `**/.git`, `**/.yarn`],
        });
        // It seems that the return value of globby isn't in any guaranteed order - not even the directory listing order
        relativeCwds.sort();
        for (const relativeCwd of relativeCwds) {
            const candidateCwd = fslib_1.ppath.resolve(this.cwd, fslib_1.npath.toPortablePath(relativeCwd));
            if (fslib_1.xfs.existsSync(fslib_1.ppath.join(candidateCwd, `package.json`))) {
                this.workspacesCwds.add(candidateCwd);
            }
        }
    }
    accepts(range) {
        var _a;
        const protocolIndex = range.indexOf(`:`);
        const protocol = protocolIndex !== -1
            ? range.slice(0, protocolIndex + 1)
            : null;
        const pathname = protocolIndex !== -1
            ? range.slice(protocolIndex + 1)
            : range;
        if (protocol === WorkspaceResolver_1.WorkspaceResolver.protocol && fslib_1.ppath.normalize(pathname) === this.relativeCwd)
            return true;
        if (protocol === WorkspaceResolver_1.WorkspaceResolver.protocol && (pathname === `*` || pathname === `^` || pathname === `~`))
            return true;
        const semverRange = semverUtils.validRange(pathname);
        if (!semverRange)
            return false;
        if (protocol === WorkspaceResolver_1.WorkspaceResolver.protocol)
            return semverRange.test((_a = this.manifest.version) !== null && _a !== void 0 ? _a : `0.0.0`);
        if (!this.project.configuration.get(`enableTransparentWorkspaces`))
            return false;
        if (this.manifest.version !== null)
            return semverRange.test(this.manifest.version);
        return false;
    }
    computeCandidateName() {
        if (this.cwd === this.project.cwd) {
            return `root-workspace`;
        }
        else {
            return `${fslib_1.ppath.basename(this.cwd)}` || `unnamed-workspace`;
        }
    }
    /**
     * Find workspaces marked as dependencies/devDependencies of the current workspace recursively.
     *
     * @param rootWorkspace root workspace
     * @param project project
     *
     * @returns all the workspaces marked as dependencies
     */
    getRecursiveWorkspaceDependencies({ dependencies = Manifest_1.Manifest.hardDependencies } = {}) {
        const workspaceList = new Set();
        const visitWorkspace = (workspace) => {
            for (const dependencyType of dependencies) {
                // Quick note: it means that if we have, say, a workspace in
                // dev dependencies but not in dependencies, this workspace will be
                // traversed (even if dependencies traditionally override dev
                // dependencies). It's not clear which behaviour is better, but
                // at least it's consistent.
                for (const descriptor of workspace.manifest[dependencyType].values()) {
                    const foundWorkspace = this.project.tryWorkspaceByDescriptor(descriptor);
                    if (foundWorkspace === null || workspaceList.has(foundWorkspace))
                        continue;
                    workspaceList.add(foundWorkspace);
                    visitWorkspace(foundWorkspace);
                }
            }
        };
        visitWorkspace(this);
        return workspaceList;
    }
    /**
     * Find workspaces which include the current workspace as a dependency/devDependency recursively.
     *
     * @param rootWorkspace root workspace
     * @param project project
     *
     * @returns all the workspaces marked as dependents
     */
    getRecursiveWorkspaceDependents({ dependencies = Manifest_1.Manifest.hardDependencies } = {}) {
        const workspaceList = new Set();
        const visitWorkspace = (workspace) => {
            for (const projectWorkspace of this.project.workspaces) {
                const isDependent = dependencies.some(dependencyType => {
                    return [...projectWorkspace.manifest[dependencyType].values()].some(descriptor => {
                        const foundWorkspace = this.project.tryWorkspaceByDescriptor(descriptor);
                        return foundWorkspace !== null && structUtils.areLocatorsEqual(foundWorkspace.anchoredLocator, workspace.anchoredLocator);
                    });
                });
                if (isDependent && !workspaceList.has(projectWorkspace)) {
                    workspaceList.add(projectWorkspace);
                    visitWorkspace(projectWorkspace);
                }
            }
        };
        visitWorkspace(this);
        return workspaceList;
    }
    /**
     * Retrieves all the child workspaces of a given root workspace recursively
     *
     * @param rootWorkspace root workspace
     * @param project project
     *
     * @returns all the child workspaces
     */
    getRecursiveWorkspaceChildren() {
        const workspaceList = [];
        for (const childWorkspaceCwd of this.workspacesCwds) {
            const childWorkspace = this.project.workspacesByCwd.get(childWorkspaceCwd);
            if (childWorkspace) {
                workspaceList.push(childWorkspace, ...childWorkspace.getRecursiveWorkspaceChildren());
            }
        }
        return workspaceList;
    }
    async persistManifest() {
        const data = {};
        this.manifest.exportTo(data);
        const path = fslib_1.ppath.join(this.cwd, Manifest_1.Manifest.fileName);
        const content = `${JSON.stringify(data, null, this.manifest.indent)}\n`;
        await fslib_1.xfs.changeFilePromise(path, content, {
            automaticNewlines: true,
        });
        this.manifest.raw = data;
    }
}
exports.Workspace = Workspace;

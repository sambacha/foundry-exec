"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execUtils = void 0;
const tslib_1 = require("tslib");
const ExecFetcher_1 = require("./ExecFetcher");
const ExecResolver_1 = require("./ExecResolver");
const execUtils = tslib_1.__importStar(require("./execUtils"));
exports.execUtils = execUtils;
const plugin = {
    fetchers: [
        ExecFetcher_1.ExecFetcher,
    ],
    resolvers: [
        ExecResolver_1.ExecResolver,
    ],
};
// eslint-disable-next-line arca/no-default-export
exports.default = plugin;

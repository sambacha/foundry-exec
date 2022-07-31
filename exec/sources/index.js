"use strict";
exports.__esModule = true;
exports.execUtils = void 0;
var ExecFetcher_1 = require("./ExecFetcher");
var ExecResolver_1 = require("./ExecResolver");
var execUtils = require("./execUtils");
exports.execUtils = execUtils;
var plugin = {
    fetchers: [
        ExecFetcher_1.ExecFetcher,
    ],
    resolvers: [
        ExecResolver_1.ExecResolver,
    ]
};
// eslint-disable-next-line arca/no-default-export
exports["default"] = plugin;

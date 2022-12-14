"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitTree = exports.emitList = exports.treeNodeToJson = exports.treeNodeToTreeify = void 0;
const tslib_1 = require("tslib");
const treeify_1 = require("treeify");
const formatUtils = tslib_1.__importStar(require("./formatUtils"));
function treeNodeToTreeify(printTree, { configuration }) {
    const target = {};
    const copyTree = (printNode, targetNode) => {
        const iterator = Array.isArray(printNode)
            ? printNode.entries()
            : Object.entries(printNode);
        for (const [key, { label, value, children }] of iterator) {
            const finalParts = [];
            if (typeof label !== `undefined`)
                finalParts.push(formatUtils.applyStyle(configuration, label, formatUtils.Style.BOLD));
            if (typeof value !== `undefined`)
                finalParts.push(formatUtils.pretty(configuration, value[0], value[1]));
            if (finalParts.length === 0)
                finalParts.push(formatUtils.applyStyle(configuration, `${key}`, formatUtils.Style.BOLD));
            const finalLabel = finalParts.join(`: `);
            const createdNode = targetNode[finalLabel] = {};
            if (typeof children !== `undefined`) {
                copyTree(children, createdNode);
            }
        }
    };
    if (typeof printTree.children === `undefined`)
        throw new Error(`The root node must only contain children`);
    copyTree(printTree.children, target);
    return target;
}
exports.treeNodeToTreeify = treeNodeToTreeify;
function treeNodeToJson(printTree) {
    const copyTree = (printNode) => {
        var _a;
        if (typeof printNode.children === `undefined`) {
            if (typeof printNode.value === `undefined`)
                throw new Error(`Assertion failed: Expected a value to be set if the children are missing`);
            return formatUtils.json(printNode.value[0], printNode.value[1]);
        }
        const iterator = Array.isArray(printNode.children)
            ? printNode.children.entries()
            : Object.entries((_a = printNode.children) !== null && _a !== void 0 ? _a : {});
        const targetChildren = Array.isArray(printNode.children)
            ? []
            : {};
        for (const [key, child] of iterator)
            targetChildren[key] = copyTree(child);
        if (typeof printNode.value === `undefined`)
            return targetChildren;
        return {
            value: formatUtils.json(printNode.value[0], printNode.value[1]),
            children: targetChildren,
        };
    };
    return copyTree(printTree);
}
exports.treeNodeToJson = treeNodeToJson;
function emitList(values, { configuration, stdout, json }) {
    const children = values.map(value => ({ value }));
    emitTree({ children }, { configuration, stdout, json });
}
exports.emitList = emitList;
function emitTree(tree, { configuration, stdout, json, separators = 0 }) {
    var _a;
    if (json) {
        const iterator = Array.isArray(tree.children)
            ? tree.children.values()
            : Object.values((_a = tree.children) !== null && _a !== void 0 ? _a : {});
        for (const child of iterator)
            stdout.write(`${JSON.stringify(treeNodeToJson(child))}\n`);
        return;
    }
    let treeOutput = (0, treeify_1.asTree)(treeNodeToTreeify(tree, { configuration }), false, false);
    // A slight hack to add line returns between two top-level entries
    if (separators >= 1)
        treeOutput = treeOutput.replace(/^([??????]???)/gm, `???\n$1`).replace(/^???\n/, ``);
    // Another one for the second level fields. We run it twice because in some pathological cases the regex matches would
    if (separators >= 2)
        for (let t = 0; t < 2; ++t)
            treeOutput = treeOutput.replace(/^([??? ].{2}[?????? ].{2}[^\n]+\n)(([??? ]).{2}[??????].{2}[^\n]*\n[??? ].{2}[??? ].{2}[??????]???)/gm, `$1$3  ???\n$2`).replace(/^???\n/, ``);
    if (separators >= 3)
        throw new Error(`Only the first two levels are accepted by treeUtils.emitTree`);
    stdout.write(treeOutput);
}
exports.emitTree = emitTree;

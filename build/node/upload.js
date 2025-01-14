"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPath = void 0;
const fs_1 = require("fs");
const upload_1 = __importStar(require("../common/upload"));
const p = __importStar(require("path"));
const mime_types_1 = __importDefault(require("mime-types"));
const inquirer_1 = __importDefault(require("inquirer"));
const checkPath = async (path) => { return fs_1.promises.stat(path).then(_ => true).catch(_ => false); };
exports.checkPath = checkPath;
class NodeUploader extends upload_1.default {
    constructor(api, utils, currency, currencyConfig) {
        super(api, utils, currency, currencyConfig);
    }
    /**
     * Uploads a file to the bundler
     * @param path to the file to be uploaded
     * @returns the response from the bundler
     */
    async uploadFile(path) {
        if (!fs_1.promises.stat(path).then(_ => true).catch(_ => false)) {
            throw new Error(`Unable to access path: ${path}`);
        }
        const mimeType = mime_types_1.default.lookup(path);
        const tags = [{ name: "Content-Type", value: (mimeType ? mimeType : "application/octet-stream") }];
        const data = (0, fs_1.readFileSync)(path);
        return await this.upload(data, tags);
    }
    // the cleanest dir walking code I've ever seen... it's beautiful. 
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    async *walk(dir) {
        for await (const d of await fs_1.promises.opendir(dir)) {
            const entry = p.join(dir, d.name);
            if (d.isDirectory())
                yield* await this.walk(entry);
            else if (d.isFile())
                yield entry;
        }
    }
    /**
     * Preprocessor for BulkUploader, ensures it has a correct operating environment.
     * @param path - path to the folder to be uploaded
     * @param indexFile - path to the index file (i.e index.html)
     * @param batchSize - number of items to upload concurrently
     * @param interactivePreflight - whether to interactively prompt the user for confirmation of upload (CLI ONLY)
     * @returns
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    async uploadFolder(path, indexFile, batchSize, interactivePreflight, logFunction) {
        var _a;
        path = p.resolve(path);
        let alreadyProcessed = [];
        if (!await (0, exports.checkPath)(path)) {
            throw new Error(`Unable to access path: ${path}`);
        }
        // manifest operations
        const manifestPath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-manifest.json`);
        let manifest = {
            "manifest": "arweave/paths",
            "version": "0.1.0",
            "paths": {}
        };
        if (await (0, exports.checkPath)(manifestPath)) {
            const d = await fs_1.promises.readFile(manifestPath);
            manifest = d.length > 0 ? JSON.parse((d).toString()) : manifest;
            alreadyProcessed = Object.keys(manifest.paths);
        }
        if (indexFile) {
            indexFile = p.join(path, indexFile);
            if (!await (0, exports.checkPath)(indexFile)) {
                throw new Error(`Unable to access path: ${indexFile}`);
            }
            manifest["index"] = { path: p.relative(path, indexFile) };
        }
        await this.syncManifest(manifest, manifestPath);
        const files = [];
        let total = 0;
        for await (const f of this.walk(path)) {
            if (!alreadyProcessed.includes(p.relative(path, f))) {
                files.push(f);
                total += await (await fs_1.promises.stat(f)).size;
            }
            if (files.length % batchSize == 0) {
                logFunction(`Checked ${files.length} files...`);
            }
        }
        if (files.length == 0) {
            logFunction("No items to process");
            // return the txID of the upload
            const idpath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-id.txt`);
            if (await (0, exports.checkPath)(idpath)) {
                return (await fs_1.promises.readFile(idpath)).toString();
            }
            return undefined;
        }
        const price = await this.utils.getPrice(this.currency, total);
        if (interactivePreflight) {
            if (!(await confirmation(`Authorize upload?\nTotal amount of data: ${total} bytes over ${files.length} files - cost: ${price} ${this.currencyConfig.base[0]} (${this.utils.unitConverter(price).toFixed()} ${this.currency})\n Y / N`))) {
                throw new Error("Confirmation failed");
            }
        }
        // invoke bulkuploader, with inline fallback to console.log if no logging function is given and interactive preflight is on.
        return (_a = (await this.bulkUploader(files, path, batchSize, (logFunction !== null && logFunction !== void 0 ? logFunction : (interactivePreflight ? console.log : undefined)))).manifestTx) !== null && _a !== void 0 ? _a : "none";
    }
    /**
     * Synchronises the manifest to disk
     * @param manifest - manifest object
     * @param manifestPath - path to the JSON file to write to
     */
    async syncManifest(manifest, manifestPath) {
        fs_1.promises.writeFile(manifestPath, Buffer.from(JSON.stringify(manifest, null, 4))).catch(e => {
            console.log(`Error syncing manifest: ${e}`);
        });
    }
    /**
     * Asynchronous chunking uploader, able to upload an array of dataitems or paths
     * Paths allow for an optional arweave manifest, provided they all have a common base path [path]
     * Syncs manifest to disk every 5 (or less) items.
     * @param items - Array of DataItems or paths
     * @param path  - Common base path for provided path items
     * @param batchSize - number of items to upload concurrently
     * @param logFunction - function to use for logging, defaults to voiding logs. should take a string to log as the first arg, can be async.
     * @returns - object containing responses for successful and failed items, as well as the manifest Txid if applicable
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    async bulkUploader(items, path, batchSize = 5, logFunction = async (_) => { return; }) {
        const promiseFactory = (d, x) => {
            return new Promise((r, e) => {
                (typeof d === "string" ? this.uploadFile(d) : this.dataItemUploader(d))
                    .then(re => r({ i: x, d: re })).catch(er => e({ i: x, e: er }));
            });
        };
        const uploaderBlockSize = (batchSize > 0) ? batchSize : 5;
        const manifestPath = path ? p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-manifest.json`) : undefined;
        const manifest = path ? JSON.parse((await fs_1.promises.readFile(manifestPath)).toString()) : undefined;
        const hasManifest = (manifestPath && typeof items[0] === "string");
        const failed = new Map();
        const processed = new Map();
        try {
            for (let i = 0; i < items.length; i = Math.min(i + uploaderBlockSize, items.length)) {
                const upperb = Math.min(i + uploaderBlockSize, items.length);
                await logFunction(`Uploading items ${i} to ${upperb}`);
                const toProcess = items.slice(i, upperb);
                let x = 0;
                const promises = toProcess.map((d) => {
                    x++;
                    const p = promiseFactory(d, (i + x - 1));
                    return p;
                });
                const processing = await Promise.allSettled(promises);
                outerLoop: for (let x = 0; x < processing.length; x++) {
                    let pr = processing[x];
                    if (pr.status === "rejected") {
                        const dataItem = items[pr.reason.i];
                        for (let y = 0; y < 3; y++) {
                            await (0, upload_1.sleep)(1000);
                            const d = (await Promise.allSettled([promiseFactory(dataItem, i)]))[0];
                            if (d.status === "rejected") {
                                if (d.reason.e.message === "Not enough funds to send data") {
                                    if (hasManifest) {
                                        await this.syncManifest(manifest, manifestPath);
                                    }
                                    throw new Error("Ran out of funds");
                                }
                                if (i == 3) {
                                    failed[d.reason.i] = d.reason.e;
                                    break outerLoop;
                                }
                            }
                            else {
                                pr = d;
                            }
                        }
                    }
                    // only gets here if the promise/upload succeeded
                    processed.set(pr.value.id, pr.value.d);
                    if (hasManifest) {
                        // add to manifest
                        const ind = pr.value.i;
                        const it = items[ind];
                        const rel = p.relative(path, it);
                        manifest.paths[rel] = { id: pr.value.d.data.id };
                    }
                }
                if (hasManifest) {
                    await this.syncManifest(manifest, manifestPath);
                }
                ; // checkpoint state then start a new block.
            }
            await logFunction(`Finished uploading ${items.length} items (${failed.size} failures)`);
            let manifestTx;
            if (hasManifest) {
                if (failed.size > 0) {
                    await logFunction("Failures detected - not uploading manifest");
                }
                else {
                    const tags = [{ name: "Type", value: "manifest" }, { name: "Content-Type", value: "application/x.arweave-manifest+json" }];
                    manifestTx = await this.upload(Buffer.from(JSON.stringify(manifest)), tags).catch((e) => { throw new Error(`Failed to upload manifest: ${e.message}`); });
                    await fs_1.promises.writeFile(p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-id.txt`), manifestTx.data.id);
                }
            }
            return { processed, failed, manifestTx: manifestTx === null || manifestTx === void 0 ? void 0 : manifestTx.data.id };
        }
        catch (err) {
            await logFunction(`Error whilst uploading: ${err.message} `);
            await this.syncManifest(manifest, manifestPath);
            return { processed, failed };
        }
    }
}
exports.default = NodeUploader;
async function confirmation(message) {
    const answers = await inquirer_1.default.prompt([
        { type: "input", name: "confirmation", message }
    ]);
    return answers.confirmation.toLowerCase() == "y";
}
//# sourceMappingURL=upload.js.map
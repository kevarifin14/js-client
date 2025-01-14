"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
const arbundles_1 = require("arbundles");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.sleep = sleep;
class Uploader {
    constructor(api, utils, currency, currencyConfig) {
        this.api = api;
        this.currency = currency;
        this.currencyConfig = currencyConfig;
        this.utils = utils;
    }
    /**
     * Uploads data to the bundler
     * @param data
     * @param tags
     * @returns the response from the bundler
     */
    async upload(data, tags) {
        // try {
        const signer = await this.currencyConfig.getSigner();
        const dataItem = (0, arbundles_1.createData)(data, signer, { tags });
        await dataItem.sign(signer);
        return await this.dataItemUploader(dataItem);
    }
    /**
     * Uploads a given dataItem to the bundler
     * @param dataItem
     */
    async dataItemUploader(dataItem) {
        const { protocol, host, port, timeout } = this.api.getConfig();
        const res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, dataItem.getRaw(), {
            headers: { "Content-Type": "application/octet-stream", },
            timeout,
            maxBodyLength: Infinity
        });
        switch (res.status) {
            case 201:
                res.data = { id: dataItem.id };
                return res;
            case 402:
                throw new Error("Not enough funds to send data");
            default:
                if (res.status >= 400) {
                    throw new Error(`whilst uploading DataItem: ${res.status} ${res.statusText}`);
                }
        }
        return res;
    }
}
exports.default = Uploader;
//# sourceMappingURL=upload.js.map
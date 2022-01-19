"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedstonePrice = void 0;
const arweave_1 = __importDefault(require("arweave"));
const base64url_1 = __importDefault(require("base64url"));
const redstone_api_1 = __importDefault(require("redstone-api"));
class BaseNodeCurrency {
    constructor(config) {
        Object.assign(this, config);
        this._address = this.wallet ? this.ownerToAddress(this.getPublicKey()) : undefined;
    }
    // common methods
    get address() {
        return this._address;
    }
    async getId(item) {
        return base64url_1.default.encode(Buffer.from(await arweave_1.default.crypto.hash(await item.rawSignature())));
    }
    async price() {
        return getRedstonePrice(this.ticker);
    }
}
exports.default = BaseNodeCurrency;
async function getRedstonePrice(currency) {
    return (await redstone_api_1.default.getPrice(currency)).value;
}
exports.getRedstonePrice = getRedstonePrice;
//# sourceMappingURL=currency.js.map
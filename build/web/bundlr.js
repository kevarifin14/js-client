"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = __importDefault(require("../common/api"));
const bundlr_1 = __importDefault(require("../common/bundlr"));
const upload_1 = __importDefault(require("../common/upload"));
const utils_1 = __importDefault(require("../common/utils"));
const currencies_1 = __importDefault(require("./currencies"));
const fund_1 = __importDefault(require("./fund"));
class WebBundlr extends bundlr_1.default {
    constructor(url, currency, provider, config) {
        var _a;
        super();
        const parsed = new URL(url);
        this.api = new api_1.default({ protocol: parsed.protocol.slice(0, -1), port: parsed.port, host: parsed.hostname, timeout: (_a = config === null || config === void 0 ? void 0 : config.timeout) !== null && _a !== void 0 ? _a : 100000 });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this.currency = currency;
        this.currencyConfig = (0, currencies_1.default)(currency, provider, config === null || config === void 0 ? void 0 : config.providerUrl);
        this.utils = new utils_1.default(this.api, this.currency, this.currencyConfig);
        this.uploader = new upload_1.default(this.api, this.utils, this.currency, this.currencyConfig);
        this.funder = new fund_1.default(this.utils);
    }
    // async initialisation 
    async ready() {
        await this.currencyConfig.ready();
        this.address = this.currencyConfig.address;
    }
}
exports.default = WebBundlr;
//# sourceMappingURL=bundlr.js.map
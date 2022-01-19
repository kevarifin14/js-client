"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethereum_1 = __importDefault(require("./ethereum"));
const solana_1 = __importDefault(require("./solana"));
function getCurrency(currency, wallet, providerUrl) {
    switch (currency) {
        // case "ethereum":
        //     return new EthereumConfig({ name: "ethereum", ticker: "ETH", minConfirm: 5, wallet })
        case "matic":
            return new ethereum_1.default({ name: "matic", ticker: "MATIC", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://polygon-rpc.com", minConfirm: 5, wallet });
        case "arbitrum":
            return new ethereum_1.default({ name: "arbitrum", ticker: "ETH", minConfirm: 5, providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://arb1.arbitrum.io/rpc", wallet });
        case "bnb":
            return new ethereum_1.default({ name: "bnb", ticker: "BNB", minConfirm: 5, providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://bsc-dataseed.binance.org", wallet });
        case "avalanche":
            return new ethereum_1.default({ name: "avalanche", ticker: "AVAX", minConfirm: 5, providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://api.avax.network/ext/bc/C/rpc", wallet });
        case "boba":
            return new ethereum_1.default({ name: "boba", ticker: "ETH", minConfirm: 5, providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://mainnet.boba.network/", wallet });
        case "solana":
            return new solana_1.default({ name: "solana", ticker: "SOL", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://api.mainnet-beta.solana.com/", minConfirm: 5, wallet });
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}
exports.default = getCurrency;
//# sourceMappingURL=index.js.map
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
const signing_1 = require("arbundles/src/signing");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const currency_1 = __importDefault(require("../currency"));
const web3 = __importStar(require("@solana/web3.js"));
const bs58_1 = __importDefault(require("bs58"));
class SolanaConfig extends currency_1.default {
    constructor(config) {
        super(config);
        this.base = ["lamports", 1e9];
    }
    async getProvider() {
        if (!this.providerInstance) {
            this.providerInstance = new web3.Connection(this.providerUrl, 
            // web3.clusterApiUrl(this.providerUrl as web3.Cluster),
            "confirmed");
        }
        return this.providerInstance;
    }
    async getTx(txId) {
        const connection = await this.getProvider();
        const stx = await connection.getTransaction(txId, {
            commitment: "confirmed",
        });
        if (!stx)
            throw new Error(`tx ${txId} not found`);
        const confirmed = !((await connection.getTransaction(txId, { commitment: "finalized" })) ===
            null);
        const amount = new bignumber_js_1.default(stx.meta.postBalances[1]).minus(new bignumber_js_1.default(stx.meta.preBalances[1]));
        const tx = {
            from: stx.transaction.message.accountKeys[0].toBase58(),
            to: stx.transaction.message.accountKeys[1].toBase58(),
            amount: amount,
            blockHeight: new bignumber_js_1.default(stx.slot),
            pending: false,
            confirmed,
        };
        return tx;
    }
    ownerToAddress(owner) {
        if (typeof owner === "string") {
            owner = Buffer.from(owner);
        }
        return bs58_1.default.encode(owner);
    }
    async sign(data) {
        return await (await this.getSigner()).sign(data);
    }
    getSigner() {
        if (!this.signer) {
            this.signer = new signing_1.InjectedSolanaSigner(this.wallet);
        }
        return this.signer;
    }
    verify(pub, data, signature) {
        return signing_1.InjectedSolanaSigner.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        return new bignumber_js_1.default((await (await this.getProvider()).getEpochInfo()).blockHeight);
    }
    async getFee(_amount, _to) {
        const connection = await this.getProvider();
        const block = await connection.getRecentBlockhash();
        const feeCalc = await connection.getFeeCalculatorForBlockhash(block.blockhash);
        return new bignumber_js_1.default(feeCalc.value.lamportsPerSignature);
    }
    async sendTx(data) {
        return await this.wallet.sendTransaction(data, await this.getProvider());
    }
    async createTx(amount, to, _fee) {
        // TODO: figure out how to manually set fees
        const pubkey = new web3.PublicKey(await this.getPublicKey());
        const transaction = new web3.Transaction({
            recentBlockhash: (await (await this.getProvider()).getRecentBlockhash()).blockhash,
            feePayer: pubkey
        });
        transaction.add(web3.SystemProgram.transfer({
            fromPubkey: pubkey,
            toPubkey: new web3.PublicKey(to),
            lamports: +new bignumber_js_1.default(amount).toNumber(),
        }));
        // const transactionBuffer = transaction.serializeMessage();
        // const signature = nacl.sign.detached(transactionBuffer, keys.secretKey);
        // transaction.addSignature(keys.publicKey, Buffer.from(signature));
        return { tx: transaction, txId: undefined };
    }
    async getPublicKey() {
        return this.wallet.publicKey.toBuffer();
    }
}
exports.default = SolanaConfig;
//# sourceMappingURL=solana.js.map
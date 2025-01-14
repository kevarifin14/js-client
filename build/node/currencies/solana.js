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
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const web3 = __importStar(require("@solana/web3.js"));
const arbundles_1 = require("arbundles");
const bs58_1 = __importDefault(require("bs58"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const currency_1 = __importDefault(require("../currency"));
const solanaSigner = arbundles_1.signers.SolanaSigner;
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
    getKeyPair() {
        let key = this.wallet;
        if (typeof key !== "string") {
            key = bs58_1.default.encode(Buffer.from(key));
        }
        return web3.Keypair.fromSecretKey(bs58_1.default.decode(key));
    }
    async getTx(txId) {
        const connection = await this.getProvider();
        const stx = await connection.getTransaction(txId, {
            commitment: "confirmed",
        });
        if (!stx)
            throw new Error("Confirmed tx not found");
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
        return bs58_1.default.encode(owner);
    }
    async sign(data) {
        return await (await this.getSigner()).sign(data);
    }
    getSigner() {
        const keyp = this.getKeyPair();
        const keypb = bs58_1.default.encode(Buffer.concat([keyp.secretKey, keyp.publicKey.toBuffer()]));
        return new solanaSigner(keypb);
    }
    verify(pub, data, signature) {
        return solanaSigner.verify(pub, data, signature);
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
        const connection = await this.getProvider();
        // if it's already been signed...
        if (data.signature) {
            await web3.sendAndConfirmRawTransaction(connection, data.serialize());
        }
        await web3.sendAndConfirmTransaction(connection, data, [this.getKeyPair()]);
    }
    async createTx(amount, to, _fee) {
        // TODO: figure out how to manually set fees
        const keys = this.getKeyPair();
        const transaction = new web3.Transaction({
            recentBlockhash: (await (await this.getProvider()).getRecentBlockhash()).blockhash,
            feePayer: keys.publicKey,
        });
        transaction.add(web3.SystemProgram.transfer({
            fromPubkey: keys.publicKey,
            toPubkey: new web3.PublicKey(to),
            lamports: +new bignumber_js_1.default(amount).toNumber(),
        }));
        const transactionBuffer = transaction.serializeMessage();
        const signature = tweetnacl_1.default.sign.detached(transactionBuffer, keys.secretKey);
        transaction.addSignature(keys.publicKey, Buffer.from(signature));
        return { tx: transaction, txId: bs58_1.default.encode(signature) };
    }
    getPublicKey() {
        const key = this.getKeyPair();
        return key.publicKey.toBuffer();
    }
}
exports.default = SolanaConfig;
//# sourceMappingURL=solana.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const keccak256_1 = __importDefault(require("keccak256"));
const secp256k1_1 = require("secp256k1");
const ethers_1 = require("ethers");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const arbundles_1 = require("arbundles");
const currency_1 = __importDefault(require("../currency"));
const ethereumSigner = arbundles_1.signers.EthereumSigner;
// export interface EthCurrencyConfig extends CurrencyConfig {
//     // eslint-disable-next-line @typescript-eslint/naming-convention
//     isEIP1559?: boolean
// }
class EthereumConfig extends currency_1.default {
    constructor(config) {
        super(config);
        this.base = ["wei", 1e18];
    }
    async getProvider() {
        if (!this.providerInstance) {
            this.providerInstance = new ethers_1.ethers.providers.JsonRpcProvider(this.providerUrl);
            await this.providerInstance._ready();
        }
        return this.providerInstance;
    }
    async getTx(txId) {
        const provider = await this.getProvider();
        const response = await provider.getTransaction(txId);
        // const r2 = await provider.getTransactionReceipt(txId);
        // console.log(r2);
        if (!response)
            throw new Error("Tx doesn't exist");
        return {
            from: response.from,
            to: response.to,
            blockHeight: response.blockNumber ? new bignumber_js_1.default(response.blockNumber) : null,
            amount: new bignumber_js_1.default(response.value.toHexString(), 16),
            pending: response.blockNumber ? false : true,
            confirmed: response.confirmations >= this.minConfirm,
        };
    }
    ownerToAddress(owner) {
        return "0x" + (0, keccak256_1.default)(owner.slice(1)).slice(-20).toString("hex");
    }
    async sign(data) {
        const signer = new ethereumSigner(this.wallet);
        return signer.sign(data);
    }
    getSigner() {
        return new ethereumSigner(this.wallet);
    }
    verify(pub, data, signature) {
        return ethereumSigner.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        const response = await (await this.getProvider()).send("eth_blockNumber", []);
        return new bignumber_js_1.default(response, 16);
    }
    async getFee(amount, to) {
        const provider = await this.getProvider();
        const _amount = new bignumber_js_1.default(amount);
        const tx = {
            to,
            value: "0x" + _amount.toString(16),
        };
        const estimatedGas = await provider.estimateGas(tx);
        const gasPrice = await provider.getGasPrice();
        // const b = await provider.send("eth_maxPriorityFeePerGas", [])
        // console.log(b)
        return new bignumber_js_1.default(estimatedGas.mul(gasPrice).toString());
    }
    async sendTx(data) {
        return (await (await this.getProvider()).sendTransaction(data).catch(e => { console.error(`Error occurred while sending a tx - ${e}`); throw e; }));
    }
    async createTx(amount, to, _fee) {
        const provider = await this.getProvider();
        const wallet = new ethers_1.Wallet(this.wallet, provider);
        const _amount = "0x" + new bignumber_js_1.default(amount).toString(16);
        // const gasPrice = await provider.getGasPrice();
        // const estimatedGas = await provider.estimateGas({ to, value: _amount });
        // console.log({ gasPrice, estimatedGas })
        const tx = await wallet.populateTransaction({
            to,
            value: _amount,
            // gasPrice,
            // gasLimit: estimatedGas,
            // nonce: await provider.getTransactionCount(this.address),
            // chainId: await (await provider.getNetwork()).chainId
        });
        const signedTx = await wallet.signTransaction(tx);
        const txId = "0x" + (0, keccak256_1.default)(Buffer.from(signedTx.slice(2), "hex")).toString("hex");
        return { txId, tx: signedTx };
    }
    getPublicKey() {
        return Buffer.from((0, secp256k1_1.publicKeyCreate)(Buffer.from(this.wallet, "hex"), false));
    }
}
exports.default = EthereumConfig;
//# sourceMappingURL=ethereum.js.map
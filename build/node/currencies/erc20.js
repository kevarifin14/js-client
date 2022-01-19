"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.erc20abi = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ethers_1 = require("ethers");
const keccak256_1 = __importDefault(require("keccak256"));
const ethereum_1 = __importDefault(require("./ethereum"));
class ERC20Config extends ethereum_1.default {
    constructor(config) {
        super(config);
        this.contractAddress = config.contractAddress;
    }
    async getContract() {
        if (!this.contractInstance) {
            this.contractInstance = new ethers_1.ethers.Contract(this.contractAddress, exports.erc20abi, new ethers_1.Wallet(this.wallet, await this.getProvider()));
            this.base = ["wei", this.contractInstance.decimals()];
        }
        return this.contractInstance;
    }
    async getTx(txId) {
        const response = await (await super.getProvider()).getTransaction(txId);
        if (!response)
            throw new Error("Tx doesn't exist");
        if (response.data.length !== 138 ||
            response.data.slice(2, 10) !== "a9059cbb" // standard ERC20-ABI method ID for transfers
        ) {
            throw new Error("Tx isn't a ERC20 transfer");
        }
        const to = `0x${response.data.slice(34, 74)}`;
        const amount = new bignumber_js_1.default(response.data.slice(74), 16);
        return {
            from: response.from,
            to,
            blockHeight: response.blockNumber ? new bignumber_js_1.default(response.blockNumber) : null,
            amount,
            pending: response.blockNumber ? false : true,
            confirmed: response.confirmations >= this.minConfirm,
        };
    }
    async getFee(amount, to) {
        const _amount = "0x" + new bignumber_js_1.default(amount).toString(16);
        const contract = await this.getContract();
        return new bignumber_js_1.default((await contract.estimateGas.transfer(to, _amount)).toString());
    }
    async createTx(amount, to, _fee) {
        const provider = await this.getProvider();
        const wallet = new ethers_1.Wallet(this.wallet, provider);
        const contract = await this.getContract();
        const _amount = "0x" + new bignumber_js_1.default(amount).toString(16);
        const tx = await contract.populateTransaction.transfer(to, _amount);
        tx.gasPrice = await provider.getGasPrice();
        tx.gasLimit = await contract.estimateGas.transfer(to, _amount);
        tx.chainId = (await provider.getNetwork()).chainId;
        tx.nonce = await provider.getTransactionCount(this.address);
        const signedTx = await wallet.signTransaction(tx);
        const txId = "0x" + (0, keccak256_1.default)(Buffer.from(signedTx.slice(2), "hex")).toString("hex");
        return { txId, tx: signedTx };
    }
}
exports.default = ERC20Config;
exports.erc20abi = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
];
//# sourceMappingURL=erc20.js.map
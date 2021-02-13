// By Leandro Rometsch - 21.01.2020
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin

const { Contract, CashCompiler, ElectrumNetworkProvider, SignatureTemplate } = require('cashscript');
const { randomBytes } = require('crypto')
const { MerkleTree } = require('merkletreejs')
const SHA256 = require('crypto-js/sha256')
const hashFunctions = require('js-sha256')
const conv = require("./conversion");
const xor = require("./xor");

module.exports = {encode, decode, bitcoreCompatibleSHA256, genSetOfRefundTx, genClaimKeyContract, genLockingContract, genRandomHexString, genRandomString}

const provider = new ElectrumNetworkProvider('testnet')

function encode(plaintextArray, key) {
    let data = new Array(plaintextArray.length), keyHash = "";

    // Encrypt
    for (let i=0; i<plaintextArray.length; i++) {
        let indexKey = SHA256(key.concat(i.toString())).toString();
        data[i] = xor.crypt(plaintextArray[i], indexKey);
    }

    keyHash = SHA256(key).toString();

    return {data, keyHash};
}

// Decrypts the cipherArray by utilizing the key and validates the result with the given Merkle Tree.
// If no error found return decrypted data & -1
// If error found return decrypted data and indice of first invalid array entry
function decode(cipherArray, key, originalMTree, publicMRoot) {
    if (originalMTree.getRoot().toString('hex') !== publicMRoot) {
        throw "Error: Given Merkle Tree & Root do not fit together";
    }

    let data = new Array(cipherArray.length);

    // Decrypt
    for (let i=0; i<cipherArray.length; i++) {
        let indexKey = SHA256(key.concat(i.toString())).toString();
        data[i] = xor.crypt(cipherArray[i], indexKey);
    }

    const newLeaves = data.map(x => SHA256(x));
    const newMTree = new MerkleTree(newLeaves, SHA256);
    const newMRoot = newMTree.getRoot().toString('hex');

    // If roots do not match, there will be an error somewhere
    if (newMRoot !== publicMRoot) {
        // Iterate through the new leaves and check for their appearance (at the same position!) in the original tree
        for (let i=0; i<newLeaves.length; i++) {
            // If the proof verification is false, the (first) invalid data chunk is found.
            const proof = originalMTree.getProof(newLeaves[i], i);
            if (!originalMTree.verify(proof, newLeaves[i], publicMRoot)) {
                return {data, errorIndex: i};
            }
        }
        throw "Error: Merkle Roots do not match but no faulty data chunk found!"; // This error indicates a potential problem with the implementation
    }

    return {data, errorIndex: -1}; //
}

// This function takes a (hex denoted) byte string and does the following:
// 1. The byte string is converted to a array of (8-bit) binary string
// 2. The 8-bit values are converted to a (decimal) integer resulting in a Uint8Array
// 4. SHA256 hashes the Uint8Array
// Example: "FA4C" -> ["11111010", "01001100"] -> [250, 76] -> (0x)97e14078fd4006fe20d0fdf31055c84d1d5f7d738a4d24b97ebba515d60a3917
function bitcoreCompatibleSHA256(message) {
    const decArr = conv.hexToBytes(message)
    return hashFunctions.sha256(decArr)
}

function genSetOfRefundTx(pkhS, pkhB, keyHash, dataChunksEncrypted, dataChunksHashed) {
    if (dataChunksEncrypted.length !== dataChunksHashed.length) { throw "Error: Data arrays not of same length"; }
    const refundTxTemplate = CashCompiler.compileFile('./contracts/refundTx.cash');

    let setOfRefundTx = [];
    for (let i = 0; i < dataChunksEncrypted.length; i++) {
        let tx = new Contract(refundTxTemplate, [pkhS, pkhB, "0x" + keyHash, i.toString(), "0x" + dataChunksEncrypted[i], "0x" + dataChunksHashed[i].toString()], provider);
        setOfRefundTx.push(tx);
    }

    return setOfRefundTx;
}

function genClaimKeyContract(pkhS, pkhB, keyHash) {
    const claimKeyContract = CashCompiler.compileFile('./contracts/claimKey.cash');
    const claimKey = new Contract(claimKeyContract, [pkhS, pkhB, keyHash], provider);

    return {transaction: claimKey, address: claimKey.address};
}

function genLockingContract(pkhS, pkhB) {
    const lockingContract = CashCompiler.compileFile('./contracts/claimKey.cash');
    const locking = new Contract(lockingContract, [pkhS, pkhB], provider);

    return {contract: locking, address: locking.address};
}

function genRandomHexString(size) {
    return Array.prototype.map.call(
        randomBytes(size),
        x => ('00' + x.toString(16)).slice(-2)).join('').toUpperCase()
}

function genRandomString(length) {
    // Declare all characters
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    // Pick characters randomly
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return str;
}
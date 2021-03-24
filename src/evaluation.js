// By Leandro Rometsch - 09.02.2021
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin
// Cases based on https://github.com/leandro-ro/bt-evaluation/blob/main/graphics/transaction_flow.pdf

const util = require("./utility");
const wallet = require("./wallet")
const { optimisticCase } = require("./cases/case_01");
const { caseTwo } = require("./cases/case_02");
const { caseThree } = require("./cases/case_03");
const { caseFour } = require("./cases/case_04");
const { caseFive } = require("./cases/case_05");


// The example data is a <CHUNKS>-tuple of hex strings of constant length <CHUNKSIZE> which is always dividable by two and < 32
const CHUNKS = 4; // Minimum 2. Use power of two
const CHUNKSIZE = 1; // In Bytes. Minimum 1 - Maximum 32 (here technically limited by SHA256 Hash of key through symmetric XOR encryption)
const KEYSIZE = 1; // Number of chars. Minimum 1  (e.g. 16 -> 16 chars -> 32 Bytes -> 256 bit key)
const PRICE = 2000; // min 2000
const TXCOSTPERBYTE = 1.008 // sat per byte

// Create random array
let exampleData = [];
for (let i = 0; i < CHUNKS; i++) {
    exampleData.push(util.genRandomHexString(CHUNKSIZE));
}
console.log("Data: " + exampleData);

// Create random key(s)
const key = util.genRandomString(KEYSIZE);
console.log("Key: " + key);
const wrongKey = util.genRandomString(KEYSIZE);

// Encode data
const encoded = util.encode(exampleData, key);

// With the (wrong) key, Bob will be able to claim a refund...
const manipulatedKeyHash = util.encode(exampleData, wrongKey).keyHash;
let maliciousSetOfRefundTx = util.genSetOfRefundTx(wallet.alice.publicKeyHash,
    wallet.bob.publicKeyHash,
    manipulatedKeyHash, //... because the hash is integrated into each of the refund transactions
    encoded.data,
    exampleData.map(x => util.bitcoreCompatibleSHA256(x)));

// These will be un-spendable, because they are created with the correct (encodedData, keyHash) pair
let honestSetOfRefundTx = util.genSetOfRefundTx(wallet.alice.publicKeyHash,
    wallet.bob.publicKeyHash,
    encoded.keyHash,
    encoded.data,
    exampleData.map(x => util.bitcoreCompatibleSHA256(x)));


// Uncomment one of the five scenarios and run this file. You may change one of the capitalized parameters above.

optimisticCase(encoded, key, PRICE, TXCOSTPERBYTE)
//caseTwo(encoded, key, PRICE, TXCOSTPERBYTE)
//caseThree(encoded, key, wrongKey, maliciousSetOfRefundTx, PRICE, TXCOSTPERBYTE)
//caseFour(PRICE, TXCOSTPERBYTE)
//caseFive(honestSetOfRefundTx, key, PRICE, TXCOSTPERBYTE)

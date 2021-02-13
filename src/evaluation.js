// By Leandro Rometsch - 09.02.2020
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin
// Cases based on https://www.notion.so/Transaction-Costs-15b2330a92084a32a29b17e681b2f1c4
const util = require("./utility");
const wallet = require("./wallet")
const { Contract, CashCompiler, ElectrumNetworkProvider, SignatureTemplate } = require('cashscript');

// Compile contracts
const provider = new ElectrumNetworkProvider('testnet')
const lockingTx = CashCompiler.compileFile('./contracts/lockingTx.cash');
const refundTx = CashCompiler.compileFile('./contracts/refundTx.cash');
const claimKeyTx = CashCompiler.compileFile('./contracts/claimKey.cash');


// The example data is a <CHUNKS>-tuple of hex strings of constant length <CHUNKSIZE> which is always dividable by two and < 32
const CHUNKS = 4; // Minimum 2. Use power of two
const CHUNKSIZE = 1; // In Bytes. Minimum 1 - Maximum 32 (technically limited by SHA256 Hash of key through symmetric XOR encryption)
const KEYSIZE = 32; // Number of chars. Minimum 1
const PRICE = 2000; // min 2000
const TXCOSTPERBYTE = 1.008 // sat per byte

// Create random array
let exampleData = [];
for (let i = 0; i < CHUNKS; i++) {
    exampleData.push(util.genRandomHexString(CHUNKSIZE));
}
console.log("Data: " + exampleData);

// Create random key
const key = util.genRandomString(KEYSIZE);
console.log("Key: " + key);

const wrongKey = util.genRandomString(KEYSIZE);

const encoded = util.encode(exampleData, key);

// With the (wrong) key, Bob will be able to claim a refund...
const manipulatedKeyHash = util.encode(exampleData, wrongKey).keyHash;
let maliciousSetOfRefundTx = util.genSetOfRefundTx(wallet.alice.publicKeyHash,
    wallet.bob.publicKeyHash,
    manipulatedKeyHash, //... because the hash is integrated into each of the refund transactions
    encoded.data,
    exampleData.map(x => util.bitcoreCompatibleSHA256(x)));

// These will be unspendable, because they are created with the correct (encodedData, keyHash) pair
let honestSetOfRefundTx = util.genSetOfRefundTx(wallet.alice.publicKeyHash,
    wallet.bob.publicKeyHash,
    encoded.keyHash,
    encoded.data,
    exampleData.map(x => util.bitcoreCompatibleSHA256(x)));

optimisticCase()


// Case 1: Optimistic Case. Alice provides the key to unlock the Key Exchange Transaction and reclaims the locked coins
// inside the locking transcation
function optimisticCase() {
    let txCostsAlice = 0;
    let txCostsBob = 0;

    // a) Alice creates locking transaction...
    const locking = new Contract(lockingTx, [wallet.alice.publicKeyHash, wallet.bob.publicKeyHash], provider);

    // ... and funds it
    wallet.p2pkh(wallet.alice, locking.address, PRICE, 1)
        .then((p2pkhTxOne) => {

            txCostsAlice += calcTxCost(p2pkhTxOne);

            sleep(2000).then(() => {

                // f) Alice unlocks locking transaction to claim the deposit back
                calcMaxLockingUnlockTxFee(locking, wallet.alice.cashAddress).then((lockingFee) => {

                    unlockLockingTx(locking, wallet.alice.cashAddress, PRICE - lockingFee).then((lockingTx) => {

                        console.log(" -> (a. - size: " + calcTxByteSize(p2pkhTxOne) + " - cost: " + calcTxCost(p2pkhTxOne) + ") -> (f. - size: " + calcTxByteSize(lockingTx) + " - cost: " + calcTxCost(lockingTx) + ")");
                        txCostsAlice += calcTxCost(lockingTx);

                    }).catch((error) => {
                        console.log(`Tx Error ${error}`);
                    });

                });

            });

        }).catch((error) => {
            console.log(`Tx Error ${error}`);
        });


    // b) Bob creates Key Exchange transaction...
    const exchange = new Contract(claimKeyTx, [wallet.bob.publicKeyHash, wallet.alice.publicKeyHash, encoded.keyHash], provider)

    // ... and funds it
    wallet.p2pkh(wallet.bob, exchange.address, PRICE, 1)
        .then((p2pkhTxTwo) => {

            txCostsBob += calcTxCost(p2pkhTxTwo);

            sleep(5000).then(() => {

                // e) Alice solves key exchange transaction to claim the price
                calcMaxExchangeTxFee(exchange, wallet.alice.cashAddress, key).then((exchangeFee) => {

                    solveExchangeTx(exchange, wallet.alice.cashAddress, PRICE - exchangeFee).then((exchangeTx) => {

                        console.log(" -> (b. - size: " + calcTxByteSize(p2pkhTxTwo) + " - cost: " + calcTxCost(p2pkhTxTwo) + ") -> (e. - size: " + calcTxByteSize(exchangeTx) + " - cost: " + calcTxCost(exchangeTx) + ")");
                        txCostsAlice += calcTxCost(exchangeTx);

                        console.log("Alice's total transaction costs (a + f + e): " + txCostsAlice);
                        console.log("Bob's total transaction costs (b): " + txCostsBob);

                    }).catch((error) => {
                        console.log(`Tx Error ${error}`);
                    });

                });

            });

        }).catch((error) => {
            console.log(`Tx Error ${error}`);
        });
}

// Case 2: Alice does not provide the key, therefore Bob reclaims his Key Exchange Transaction
function caseTwo(){
    let txCostsAlice = 0;
    let txCostsBob = 0;

    // a) Alice creates locking transaction...
    const locking = new Contract(lockingTx, [wallet.alice.publicKeyHash, wallet.bob.publicKeyHash], provider);

    // ... and funds it
    wallet.p2pkh(wallet.alice, locking.address, PRICE, 1)
        .then((p2pkhTxOne) => {

            txCostsAlice += calcTxCost(p2pkhTxOne);

            sleep(2000).then(() => {

                // f) Alice unlocks locking transaction to claim the deposit back
                calcMaxLockingUnlockTxFee(locking, wallet.alice.cashAddress).then((lockingFee) => {

                    unlockLockingTx(locking, wallet.alice.cashAddress, PRICE - lockingFee).then((lockingTx) => {

                        console.log(" -> (a. - size: " + calcTxByteSize(p2pkhTxOne) + " - cost: " + calcTxCost(p2pkhTxOne) + ") -> (f. - size: " + calcTxByteSize(lockingTx) + " - cost: " + calcTxCost(lockingTx) + ")");
                        txCostsAlice += calcTxCost(lockingTx);

                    }).catch((error) => {
                        console.log(`Tx Error ${error}`);
                    });

                });

            });

        }).catch((error) => {
        console.log(`Tx Error ${error}`);
    });

    // b) Bob create Key Exchange transaction...
    const exchange = new Contract(claimKeyTx, [wallet.bob.publicKeyHash, wallet.alice.publicKeyHash, encoded.keyHash], provider)

    // ... and funds it
    wallet.p2pkh(wallet.bob, exchange.address, PRICE, 1)
        .then((p2pkhTxTwo) => {

            txCostsBob += calcTxCost(p2pkhTxTwo);

            sleep(5000).then(() => {

                // d) Bob reclaims key exchange transaction
                calcMaxExchangeTxFee(exchange, wallet.alice.cashAddress).then((exchangeFee) => {

                    reclaimExchangeTx(exchange, wallet.alice.cashAddress, PRICE - exchangeFee).then((exchangeTx) => {

                        console.log(" -> (b. - size: " + calcTxByteSize(p2pkhTxTwo) + " - cost: " + calcTxCost(p2pkhTxTwo) + ") -> (d. - size: " + calcTxByteSize(exchangeTx) + " - cost: " + calcTxCost(exchangeTx) + ")");
                        txCostsBob += calcTxCost(exchangeTx);

                        console.log("Alice's total transaction costs (a + f): " + txCostsAlice);
                        console.log("Bob's total transaction costs (b + d): " + txCostsBob);

                    }).catch((error) => {
                        console.log(`Tx Error ${error}`);
                    });

                });

            });

        }).catch((error) => {
        console.log(`Tx Error ${error}`);
    });
}

// Case 3: Alice provides manipulated data. Therefore Bob issues a refund.
function caseThree(){
    let txCostsAlice = 0;
    let txCostsBob = 0;

    let refund = maliciousSetOfRefundTx[0]

    // a) Alice creates locking transaction...
    const locking = new Contract(lockingTx, [wallet.alice.publicKeyHash, wallet.bob.publicKeyHash], provider);

    // ... and funds it
    wallet.p2pkh(wallet.alice, locking.address, PRICE, 1)
        .then((p2pkhTxOne) => {

            txCostsAlice += calcTxCost(p2pkhTxOne);

            sleep(1000).then(() => {

                // f) Bob publishes a refund transaction that uses the locking transaction as input
                calcMaxLockingUseForRefundTxFee(locking, refund.address).then((lockingFee) => {

                    useLockingForRefund(locking, refund.address, PRICE - lockingFee).then((lockingTx) => {

                        txCostsBob += calcTxCost(lockingTx);

                        sleep(1000).then(() => {
                            calcMaxRefundTxFee(refund, wallet.bob.cashAddress, wrongKey).then((refundFee) => {

                                claimRefundTx(refund, wallet.bob.cashAddress, PRICE - lockingFee - refundFee).then((refundTx) => {
                                    txCostsBob += calcTxCost(refundTx)
                                    console.log(" -> (a. - size: " + calcTxByteSize(p2pkhTxOne) + " - cost: " + calcTxCost(p2pkhTxOne) + ") -> (c. - size: " + calcTxByteSize(lockingTx) + " - cost: " + calcTxCost(lockingTx) + ") -> (h. - size: " + calcTxByteSize(refundTx) + " - cost: " + calcTxCost(refundTx) + ")");
                                }).catch((error) => {
                                    console.log(`Tx Error ${error}`);
                                });

                            });

                        });

                    }).catch((error) => {
                        console.log(`Tx Error ${error}`);
                    });

                });

            });

        }).catch((error) => {
        console.log(`Tx Error ${error}`);
        });




    // b) Bob creates Key Exchange transaction...
    const exchange = new Contract(claimKeyTx, [wallet.bob.publicKeyHash, wallet.alice.publicKeyHash, encoded.keyHash], provider)

    // ... and funds it
    wallet.p2pkh(wallet.bob, exchange.address, PRICE, 1)
        .then((p2pkhTxTwo) => {

            txCostsBob += calcTxCost(p2pkhTxTwo);

            sleep(15000).then(() => {

                // e) Alice solves key exchange transaction to claim the price
                calcMaxExchangeTxFee(exchange, wallet.alice.cashAddress, wrongKey).then((exchangeFee) => {

                    solveExchangeTx(exchange, wallet.alice.cashAddress, PRICE - exchangeFee).then((exchangeTx) => {

                        console.log(" -> (b. - size: " + calcTxByteSize(p2pkhTxTwo) + " - cost: " + calcTxCost(p2pkhTxTwo) + ") -> (e. - size: " + calcTxByteSize(exchangeTx) + " - cost: " + calcTxCost(exchangeTx) + ")");
                        txCostsAlice += calcTxCost(exchangeTx);

                        console.log("Alice's total transaction costs (a + e): " + txCostsAlice);
                        console.log("Bob's total transaction costs (b + c + h): " + txCostsBob);

                    }).catch((error) => {
                        console.log(`Tx Error ${error}`);
                    });

                });

            });

        }).catch((error) => {
        console.log(`Tx Error ${error}`);
    });
}

// Bob does not publish the Key Exchange Tx
function caseFour() {
    let txCostsAlice = 0;
    let txCostsBob = 0;

    // a) Alice creates locking transaction...
    const locking = new Contract(lockingTx, [wallet.alice.publicKeyHash, wallet.bob.publicKeyHash], provider);

    // ... and funds it
    wallet.p2pkh(wallet.alice, locking.address, PRICE, 1)
        .then((p2pkhTxOne) => {

            txCostsAlice += calcTxCost(p2pkhTxOne);

            sleep(2000).then(() => {

                // f) Alice unlocks locking transaction to claim the deposit back
                calcMaxLockingUnlockTxFee(locking, wallet.alice.cashAddress).then((lockingFee) => {

                    unlockLockingTx(locking, wallet.alice.cashAddress, PRICE - lockingFee).then((lockingTx) => {
                        console.log(" -> (a. - size: " + calcTxByteSize(p2pkhTxOne) + " - cost: " + calcTxCost(p2pkhTxOne) + ") -> (f. - size: " + calcTxByteSize(lockingTx) + " - cost: " + calcTxCost(lockingTx) + ")");
                        txCostsAlice += calcTxCost(lockingTx);
                        console.log("Alice's total transaction costs (a + f): " + txCostsAlice);
                        console.log("Bob's total transaction costs (): " + txCostsBob);

                    }).catch((error) => {
                        console.log(`Tx Error ${error}`);
                    });

                });

            });

        }).catch((error) => {
        console.log(`Tx Error ${error}`);
    });

}

function caseFive() {
    let txCostsAlice = 0;
    let txCostsBob = 0;

    let refund = honestSetOfRefundTx[0]

    // a) Alice creates locking transaction...
    const locking = new Contract(lockingTx, [wallet.alice.publicKeyHash, wallet.bob.publicKeyHash], provider);

    // ... and funds it
    wallet.p2pkh(wallet.alice, locking.address, PRICE, 1)
        .then((p2pkhTxOne) => {

            txCostsAlice += calcTxCost(p2pkhTxOne);

            sleep(1000).then(() => {

                // f) Bob publishes a refund transaction that uses the locking transaction as input
                calcMaxLockingUseForRefundTxFee(locking, refund.address).then((lockingFee) => {

                    useLockingForRefund(locking, refund.address, PRICE - lockingFee).then((lockingTx) => {

                        txCostsBob += calcTxCost(lockingTx);

                        sleep(1000).then(() => {
                            calcMaxRefundTxFee(refund, wallet.bob.cashAddress).then((refundFee) => {

                                revertRefundTx(refund, wallet.bob.cashAddress, PRICE - lockingFee - refundFee).then((refundTx) => {
                                    txCostsBob += calcTxCost(refundTx)
                                    console.log(" -> (a. - size: " + calcTxByteSize(p2pkhTxOne) + " - cost: " + calcTxCost(p2pkhTxOne) + ") -> (c. - size: " + calcTxByteSize(lockingTx) + " - cost: " + calcTxCost(lockingTx) + ") -> (g. - size: " + calcTxByteSize(refundTx) + " - cost: " + calcTxCost(refundTx) + ")");
                                    console.log("Alice's total transaction costs (a + c + g): " + txCostsAlice);
                                    console.log("Bob's total transaction costs (): " + txCostsBob);
                                }).catch((error) => {
                                    console.log(`Tx Error ${error}`);
                                });

                            });

                        });

                    }).catch((error) => {
                        console.log(`Tx Error ${error}`);
                    });

                });

            });

        }).catch((error) => {
        console.log(`Tx Error ${error}`);
    });
}


// Action a) and b) are p2pkh transactions targeted to the address of a locking/key exchange transaction

// Action c) - Bob uses the a locking transaction to fund a specific refund transaction (targetAddress)
async function useLockingForRefund(contract, targetAddress, amount) {
    return await contract.functions
        .useForRefund(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.privateKey), wallet.bob.publicKey, new SignatureTemplate(wallet.bob.privateKey))
        .to(targetAddress, amount)
        .withFeePerByte(1)
        .send()
}

// Action d) - Bob reclaims a Key Exchange Transaction
async function reclaimExchangeTx(contract, targetAddress, amount) {
    return await contract.functions
        .reclaim(wallet.bob.publicKey, new SignatureTemplate(wallet.bob.privateKey))
        .to(targetAddress, amount)
        .withFeePerByte(1)
        .send()
}

// Action e) - Alice solves a Key Exchange Transcation by providing the correct key
async function solveExchangeTx(contract, targetAddress, amount) {
    return await contract.functions
        .solve(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.privateKey), key)
        .to(targetAddress, amount)
        .withFeePerByte(1)
        .send()
}

// Action f) - Alice reclaims a locking transaction
async function unlockLockingTx(contract, targetAddress, amount) {
    return await contract.functions
        .unlock(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.privateKey))
        .to(targetAddress, amount)
        .withFeePerByte(1)
        .send()
}

// Action g) - Alice reverts a Refund Transaction
async function revertRefundTx(contract, targetAddress, amount) {
    return await contract.functions
        .revert(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.privateKey))
        .to(targetAddress, amount)
        .withFeePerByte(1)
        .send()
}

// Action h) - Bob claims a Refund Transaction
async function claimRefundTx(contract, targetAddress, amount) {
    return await contract.functions
        .claim(wallet.bob.publicKey, new SignatureTemplate(wallet.bob.privateKey), wrongKey)
        .to(targetAddress, amount)
        .withFeePerByte(1)
        .send()
}

// Calculates the maximum fee for c)
async function calcMaxLockingUseForRefundTxFee(contract, targetAddress) {
    let tx = await contract.functions
        .useForRefund(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.privateKey), wallet.bob.publicKey, new SignatureTemplate(wallet.bob.privateKey))
        .to(targetAddress, 0)
        .withFeePerByte(1)
        .build()

    return estimateCosts(tx);
}

// Calculates the maximum fee for d) and e)
async function calcMaxExchangeTxFee(contract, targetAddress, key = "") {
    let tx;

    // d)
    if (key === "") {
        tx = await contract.functions
            .reclaim(wallet.bob.publicKey, new SignatureTemplate(wallet.bob.publicKeyHash))
            .to(targetAddress, 0)
            .withFeePerByte(1)
            .build()
    } else { // e)
        tx = await contract.functions
            .solve(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.publicKeyHash), key)
            .to(targetAddress, 0)
            .withFeePerByte(1)
            .build()
    }

    return estimateCosts(tx);
}

// Calculates the maximum fee for h) and g)
async function calcMaxRefundTxFee(contract, targetAddress, key= "") {
    let tx;

    // g)
    if (key === "") {
        tx = await contract.functions
            .revert(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.privateKey))
            .to(targetAddress, 0)
            .withFeePerByte(1)
            .build()
    } else { // h)
        tx = await contract.functions
            .claim(wallet.bob.publicKey, new SignatureTemplate(wallet.bob.privateKey), key)
            .to(targetAddress, 0)
            .withFeePerByte(1)
            .build()
    }

    return estimateCosts(tx);
}

// Calculates the maximum fee for f)
async function calcMaxLockingUnlockTxFee(contract, targetAddress) {
    let tx = await contract.functions
        .unlock(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.privateKey))
        .to(targetAddress, 0)
        .withFeePerByte(1)
        .build()

    return estimateCosts(tx);
}

// Calculates the actual costs of a published transaction tx
function calcTxCost(tx) {
    return Math.ceil(calcTxByteSize(tx) * TXCOSTPERBYTE);
}

// Determines the size of a sent transaction in bytes
function calcTxByteSize(tx) {
    return tx.hex.length/2;
}

// Estimates the maximum costs of a compiled transaction (.build())
function estimateCosts(tx) {
    return Math.ceil((Math.ceil(tx.length/2) - 32) * TXCOSTPERBYTE)
}

// Stops the execution for ms milliseconds
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// By Leandro Rometsch - 09.02.2021
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin
// Scenario 3: Seller malicious
// -> Alice provides manipulated data. Therefore Bob issues a refund.

const {Contract, CashCompiler, ElectrumNetworkProvider} = require('cashscript');
const wallet = require("../wallet");
const util = require("../utility");
const actions = require("../actions");

const provider = new ElectrumNetworkProvider('testnet')
const lockingTx = CashCompiler.compileFile('./contracts/lockingTx.cash');
const claimKeyTx = CashCompiler.compileFile('./contracts/claimKey.cash');

module.exports = {
    caseThree
}

function caseThree(encodedData, key, wrongKey, maliciousSetOfRefundTx, price, costPerByte= 1){
    let txCostsAlice = 0;
    let txCostsBob = 0;

    // In this case, all Refund Transactions are spendable for Bob. Therefore, it does no matter which one we choose
    let refund = maliciousSetOfRefundTx[0]

    // a) Alice creates locking transaction...
    const locking = new Contract(lockingTx,
        [wallet.alice.publicKeyHash, wallet.bob.publicKeyHash], provider);

    // ... and funds it
    wallet.p2pkh(wallet.alice, locking.address, price, 1)
        .then((p2pkhTxOne) => {

            txCostsAlice += util.calcTxCost(p2pkhTxOne, costPerByte);

            util.sleep(1000).then(() => {

                // f) Bob publishes a refund transaction that uses the locking transaction as input
                actions.calcMaxLockingUseForRefundTxFee(locking, refund.address, costPerByte).then((lockingFee) => {

                    actions.useLockingForRefund(locking, refund.address, price - lockingFee).then((lockingTx) => {

                        txCostsBob += util.calcTxCost(lockingTx, costPerByte);

                        util.sleep(1000).then(() => {
                            actions.calcMaxRefundTxFee(refund, wallet.bob.cashAddress, wrongKey, costPerByte).then((refundFee) => {

                                actions.claimRefundTx(refund, wallet.bob.cashAddress, price - lockingFee - refundFee, wrongKey).then((refundTx) => {

                                    console.log(" -> (a. - size: " + util.calcTxByteSize(p2pkhTxOne) + " - cost: " +
                                        util.calcTxCost(p2pkhTxOne, costPerByte) + ") -> (c. - size: " +
                                        util.calcTxByteSize(lockingTx) + " - cost: " +
                                        util.calcTxCost(lockingTx, costPerByte) + ") -> (h. - size: " +
                                        util.calcTxByteSize(refundTx) + " - cost: " +
                                        util.calcTxCost(refundTx, costPerByte) + ")");
                                    txCostsBob += util.calcTxCost(refundTx, costPerByte);

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
    const exchange = new Contract(claimKeyTx,
        [wallet.bob.publicKeyHash, wallet.alice.publicKeyHash,  encodedData.keyHash], provider)

    // ... and funds it
    wallet.p2pkh(wallet.bob, exchange.address, price, 1)
        .then((p2pkhTxTwo) => {

            txCostsBob += util.calcTxCost(p2pkhTxTwo, costPerByte);

            util.sleep(15000).then(() => {

                // e) Alice solves key exchange transaction to claim the price
                actions.calcMaxExchangeTxFee(exchange, wallet.alice.cashAddress, key, costPerByte).then((exchangeFee) => {

                    actions.solveExchangeTx(exchange, wallet.alice.cashAddress, price - exchangeFee, key).then((exchangeTx) => {

                        console.log(" -> (b. - size: " + util.calcTxByteSize(p2pkhTxTwo) + " - cost: " +
                            util.calcTxCost(p2pkhTxTwo, costPerByte) + ") -> (e. - size: " +
                            util.calcTxByteSize(exchangeTx) + " - cost: " +
                            util.calcTxCost(exchangeTx, costPerByte) + ")");
                        txCostsAlice += util.calcTxCost(exchangeTx, costPerByte);

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
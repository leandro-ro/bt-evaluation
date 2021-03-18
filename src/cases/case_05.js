// By Leandro Rometsch - 09.02.2021
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin
// Scenario 5: Buyer malicious
// -> Bob does not publish a Key Exchange Transaction & publishes one Refund Transaction

const {Contract, CashCompiler, ElectrumNetworkProvider} = require('cashscript');
const wallet = require("../wallet");
const util = require("../utility");
const actions = require("../actions");

const provider = new ElectrumNetworkProvider('testnet')
const lockingTx = CashCompiler.compileFile('./contracts/lockingTx.cash');

module.exports = {
    caseFive
}

function caseFive(honestSetOfRefundTx, key, price, costPerByte= 1) {
    let txCostsAlice = 0;
    let txCostsBob = 0;

    // In this case, none of the Refund Transactions are spendable for Bob. Therefore, it does no matter which one we choose
    let refund = honestSetOfRefundTx[0]

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

                        txCostsAlice += util.calcTxCost(lockingTx, costPerByte);

                        util.sleep(1000).then(() => {
                            actions.calcMaxRefundTxFee(refund, wallet.bob.cashAddress, key, costPerByte).then((refundFee) => {

                                actions.revertRefundTx(refund, wallet.bob.cashAddress, price - lockingFee - refundFee).then((refundTx) => {

                                    console.log(" -> (a. - size: " + util.calcTxByteSize(p2pkhTxOne) + " - cost: " +
                                        util.calcTxCost(p2pkhTxOne, costPerByte) + ") -> (c. - size: " +
                                        util.calcTxByteSize(lockingTx) + " - cost: " +
                                        util.calcTxCost(lockingTx, costPerByte) + ") -> (g. - size: " +
                                        util.calcTxByteSize(refundTx) + " - cost: " +
                                        util.calcTxCost(refundTx, costPerByte) + ")");
                                    txCostsAlice += util.calcTxCost(refundTx, costPerByte)

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
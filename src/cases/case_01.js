// By Leandro Rometsch - 09.02.2021
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin
// Case 1: Optimistic Case
// -> Alice provides the key to unlock the Key Exchange Transaction and reclaims the locked coins inside the Locking Transaction

const {Contract, CashCompiler, ElectrumNetworkProvider} = require('cashscript');
const wallet = require("../wallet");
const util = require("../utility");
const actions = require("../actions");

const provider = new ElectrumNetworkProvider('testnet')
const lockingTx = CashCompiler.compileFile('./contracts/lockingTx.cash');
const claimKeyTx = CashCompiler.compileFile('./contracts/claimKey.cash');

module.exports = {
    optimisticCase
}

function optimisticCase(encodedData, key, price, costPerByte = 1) {
    let txCostsAlice = 0;
    let txCostsBob = 0;

    // a) Alice creates locking transaction...
    const locking = new Contract(lockingTx, [wallet.alice.publicKeyHash, wallet.bob.publicKeyHash], provider);

    // ... and funds it
    wallet.p2pkh(wallet.alice, locking.address, price, 1)
        .then((p2pkhTxOne) => {

            txCostsAlice += util.calcTxCost(p2pkhTxOne, costPerByte);

            util.sleep(2000).then(() => {

                // f) Alice unlocks locking transaction to claim the deposit back
                actions.calcMaxLockingUnlockTxFee(locking, wallet.alice.cashAddress, costPerByte).then((lockingFee) => {

                    actions.unlockLockingTx(locking, wallet.alice.cashAddress, price - lockingFee).then((lockingTx) => {

                        console.log(" -> (a. - size: " + util.calcTxByteSize(p2pkhTxOne) + " - cost: " +
                            util.calcTxCost(p2pkhTxOne, costPerByte) + ") -> (f. - size: " +
                            util.calcTxByteSize(lockingTx) + " - cost: " +
                            util.calcTxCost(lockingTx, costPerByte) + ")");
                        txCostsAlice += util.calcTxCost(lockingTx, costPerByte);

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
        [wallet.bob.publicKeyHash, wallet.alice.publicKeyHash, encodedData.keyHash], provider)

    // ... and funds it
    wallet.p2pkh(wallet.bob, exchange.address, price, 1)
        .then((p2pkhTxTwo) => {

            txCostsBob += util.calcTxCost(p2pkhTxTwo, costPerByte);

            util.sleep(5000).then(() => {

                // e) Alice solves key exchange transaction to claim the price
                actions.calcMaxExchangeTxFee(exchange, wallet.alice.cashAddress, key, costPerByte).then((exchangeFee) => {

                    actions.solveExchangeTx(exchange, wallet.alice.cashAddress, price - exchangeFee, key).then((exchangeTx) => {

                        console.log(" -> (b. - size: " + util.calcTxByteSize(p2pkhTxTwo) + " - cost: " +
                            util.calcTxCost(p2pkhTxTwo, costPerByte) + ") -> (e. - size: " +
                            util.calcTxByteSize(exchangeTx) + " - cost: " +
                            util.calcTxCost(exchangeTx, costPerByte) + ")");
                        txCostsAlice += util.calcTxCost(exchangeTx, costPerByte);

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
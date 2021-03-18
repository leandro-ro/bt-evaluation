// By Leandro Rometsch - 09.02.2021
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin
// Scenario 4: Buyer aborts
// -> Bob does not publish the Key Exchange Tx

const {Contract, CashCompiler, ElectrumNetworkProvider} = require('cashscript');
const wallet = require("../wallet");
const util = require("../utility");
const actions = require("../actions");

const provider = new ElectrumNetworkProvider('testnet')
const lockingTx = CashCompiler.compileFile('./contracts/lockingTx.cash');

module.exports = {
    caseFour
}

function caseFour(price, costPerByte= 1) {
    let txCostsAlice = 0;
    let txCostsBob = 0;

    // a) Alice creates locking transaction...
    const locking = new Contract(lockingTx,
        [wallet.alice.publicKeyHash, wallet.bob.publicKeyHash], provider);

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
// By Leandro Rometsch - 14.02.2021
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin

const { estimateCosts } = require("./utility");
const wallet = require("./wallet")
const { SignatureTemplate } = require('cashscript');

module.exports = {
    useLockingForRefund,
    reclaimExchangeTx,
    solveExchangeTx,
    unlockLockingTx,
    revertRefundTx,
    claimRefundTx,
    calcMaxLockingUseForRefundTxFee,
    calcMaxExchangeTxFee,
    calcMaxRefundTxFee,
    calcMaxLockingUnlockTxFee
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

// Action e) - Alice solves a Key Exchange Transaction by providing the correct key
async function solveExchangeTx(contract, targetAddress, amount, key) {
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
async function claimRefundTx(contract, targetAddress, amount, wrongKey) {
    return await contract.functions
        .claim(wallet.bob.publicKey, new SignatureTemplate(wallet.bob.privateKey), wrongKey)
        .to(targetAddress, amount)
        .withFeePerByte(1)
        .send()
}


// Calculates the maximum fee for c)
async function calcMaxLockingUseForRefundTxFee(contract, targetAddress, costPerByte = 1) {
    let tx = await contract.functions
        .useForRefund(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.privateKey), wallet.bob.publicKey, new SignatureTemplate(wallet.bob.privateKey))
        .to(targetAddress, 0)
        .withFeePerByte(1)
        .build()

    return estimateCosts(tx, costPerByte);
}

// Calculates the maximum fee for d) and e)
async function calcMaxExchangeTxFee(contract, targetAddress, key = "", costPerByte = 1) {
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

    return estimateCosts(tx, costPerByte);
}

// Calculates the maximum fee for h) and g)
async function calcMaxRefundTxFee(contract, targetAddress, key= "", costPerByte = 1) {
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

    return estimateCosts(tx, costPerByte);
}

// Calculates the maximum fee for f)
async function calcMaxLockingUnlockTxFee(contract, targetAddress, costPerByte = 1) {
    let tx = await contract.functions
        .unlock(wallet.alice.publicKey, new SignatureTemplate(wallet.alice.privateKey))
        .to(targetAddress, 0)
        .withFeePerByte(1)
        .build()

    return estimateCosts(tx, costPerByte);
}
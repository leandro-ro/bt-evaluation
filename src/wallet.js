const { Contract, CashCompiler, ElectrumNetworkProvider, SignatureTemplate } = require('cashscript');

const bitcore = require("bitcore-lib-cash");
const { BITBOX } = require('bitbox-sdk');
const { stringify } = require('@bitauth/libauth');

const bitbox = new BITBOX();

const provider = new ElectrumNetworkProvider('testnet')
const P2PKH = CashCompiler.compileFile('./contracts/p2pkh.cash');

// Initialise HD node and alice's keypair
const aliceEC = bitbox.ECPair.fromWIF("cPaDJL693WBpNidCHU7Zu6UTJ5g1TJCqw5xnsfX9EP919ma2VbJn");
const alicePrivateKey = new bitcore.PrivateKey("cPaDJL693WBpNidCHU7Zu6UTJ5g1TJCqw5xnsfX9EP919ma2VbJn")
const bobEC = bitbox.ECPair.fromWIF("cPMzNbmGkWiP85u93YMXGoBPrW5t7Nc6tAWR8jFqXsjXrdGdC4N6");
const bobPrivateKey = new bitcore.PrivateKey("cPMzNbmGkWiP85u93YMXGoBPrW5t7Nc6tAWR8jFqXsjXrdGdC4N6")

let aliceAddress = bitbox.ECPair.toCashAddress(aliceEC);
let bobAddress = bitbox.ECPair.toCashAddress(bobEC);

const alicePk = bitbox.ECPair.toPublicKey(aliceEC);
const alicePkh = bitbox.Crypto.hash160(alicePk);

const bobPk = bitbox.ECPair.toPublicKey(bobEC);
const bobPkh = bitbox.Crypto.hash160(bobPk);


const alice = {
    name: "Alice", cashAddress: aliceAddress, publicKey: alicePk, publicKeyHash: alicePkh, privateKey: alicePrivateKey
}

const bob = {
    name: "Bob", cashAddress: bobAddress, publicKey: bobPk, publicKeyHash: bobPkh, privateKey: bobPrivateKey
}

async function p2pkh(from, receiverPubKey, amount, txDebugLevel= 0) {
    let sender;

    if (from === alice) {
        sender = alice
    } else if (from === bob){
        sender = bob;
    } else {
        throw "Wallet Error: P2PKH sender not existing";
    }

    const contract = new Contract(P2PKH, [sender.publicKeyHash], provider);
    console.log(sender.name + ' wallet balance:', await contract.getBalance());

    const tx = await contract.functions
        .spend(sender.publicKey, new SignatureTemplate(sender.privateKey))
        .to(receiverPubKey, amount)
        .withFeePerByte(1)
        .send();

    debugOutput(tx, txDebugLevel, from);
    return tx;
}

// Level 0: -
// Level 1: + Tx Blockchain Explorer Link
// Level 2: + Tx Size
// Level 3: + Full details
function debugOutput(tx, level, from) {
    if (level >= 3) {
        console.log('transaction details: ', stringify(tx));
    }
    if (level >= 2) {
        console.log(`transaction size: `+ tx.hex.length/2 + ` Bytes` );
    }
    if (level >= 1) {
        console.log("P2PKH by " + from.name + ` - track here: https://www.blockchain.com/bch-testnet/tx/`+ tx.txid);
    }
}

module.exports = {alice, bob, p2pkh}
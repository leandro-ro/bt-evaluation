// By Leandro Rometsch - 12.01.2020
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin
// Simple xor cipher of a byte string and a key (decoded in hex)
// Disclaimer: The following encryption scheme is most probably not secure.
// Used only for testing purposes
const conv = require("./conversion");

module.exports = {crypt};

// takes the text ((n*2)-hex string) and performs a bitwise xor with the key (sha256 hash)
// note that the text cannot be > 256 bits
function crypt(text, key) {
    consistencyCheck(text, key);

    const processedText = conv.hexStringToBinary(text)
    const processedKey = conv.hexStringToBinary(key).substr(0, processedText.length);

    const cipher = xor(processedText, processedKey);

    return conv.binaryToHexString(cipher);
}

// performs bitwise xor for bit strings
function xor(a, b) {
    let res = "";
    if (a.length > b.length) {
        for (var i = 0; i < b.length; i++) {
            res += a[i] ^ b[i]
        }
    } else {
        for (var i = 0; i < a.length; i++) {
            res += a[i] ^ b[i]
        }
    }
    return res;
}

// performs necessary checks to ensure input validity
function consistencyCheck(text, key) {
    if(text.length > key.length) throw "Error: Key is too short!";
    if(text.length % 2 !== 0) throw "Error: Text must be a (n*2)-hex string! -> byte string";
}

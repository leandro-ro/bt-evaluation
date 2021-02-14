// By Leandro Rometsch - 24.01.2021
// Bachelor Thesis: Fair Exchange Protocol Over Bitcoin

module.exports = {hexStringToBinary, binaryToHexString, hexToBytes, binToHex, decToBin}

// converts a hex array to binary a binary string
function hexStringToBinary(hash) {
    let result = "";
    hexToBytes(hash).forEach(str => {result += decToBin(str, 8)});
    return result;
}

// converts a binary string to a (byte) hex string
function binaryToHexString(bin) {
    let result = "";
    binToHex(bin).forEach(str => {result += str});
    return result;
}

// converts a hex string to a byte array (in decimal form)
function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

// converts binary to hex (bytes) -> e.g. 1010101100001100 (abc) results in ab0c
function binToHex(bin) {
    for (var fourBitChunks = [], c = 0; c < bin.length; c += 4)
        fourBitChunks.push(parseInt(bin.substr(c, 4), 2).toString(16).toUpperCase());
    return fourBitChunks;
}

// converts decimal to binary
function decToBin(dec,length){
    let out = "";
    while(length--)
        out += (dec >> length ) & 1;
    return out;
}
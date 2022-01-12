const {Blockchain, Odre} = require('./blockchain');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const myKey = ec.keyFromPrivate('b6aca12adca0d228f9fec9fffe08be1a620a1f3db6a89d12bf588500b1bbe6fc');
const myWalletAddress = myKey.getPublic('hex');

// Opret test coin
let testCoin = new Blockchain();
console.log('')
console.log('########################');
console.log('\nMining started...');
testCoin.minePendingOdre(myWalletAddress);

const odre1 = new Odre(myWalletAddress, 'test-wallet', 10);
odre1.signOdre(myKey);
testCoin.addOdre(odre1);

console.log('\nMining started...');
testCoin.minePendingOdre(myWalletAddress);

console.log('\nMy Wallet har nu: ', testCoin.getBalenceOfAdress(myWalletAddress));
console.log('Test Wallet har nu: ', testCoin.getBalenceOfAdress('test-wallet'));

console.log('\nBlockchain valid?', testCoin.isChainValid() ? 'Yes' : 'No');
console.log('########################');
console.log('')

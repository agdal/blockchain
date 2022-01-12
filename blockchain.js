// Imports
const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Bruger class til at definere hvad en block skal indeholde

class Odre{
    constructor(fraAdresse, tilAdresse, amount){
        this.fraAdresse = fraAdresse;
        this.tilAdresse = tilAdresse;
        this.amount = amount;
    }

    calculateHash(){
        return SHA256(this.fraAdresse + this.tilAdresse + this.amount).toString();
    }

    signOdre(signingKey){
        if(signingKey.getPublic('hex') !== this.fraAdresse){
            throw new Error('Du kan ik underskrive odre fra andre wallets!');
        }

        const hashOdre = this.calculateHash();
        const sig = signingKey.sign(hashOdre, 'base64');
        this.signatur = sig.toDER('hex');
    }

    isValid(){
        if(this.fraAdresse === null) return true;

        if(!this.signatur || this.signatur.length === 0){
            throw new Error('Ingen signatur angivet for denne odre!');
        }

        const publicKey = ec.keyFromPublic(this.fraAdresse, 'hex');
        return publicKey.verify(this.calculateHash(), this.signatur);
    }
}

class Block{
    constructor(timestamp, odre, previousHash = ''){
        this.timestamp = timestamp;
        this.odre = odre;
        this.previousHash = previousHash;
        this.nonce = 0;

        // For at beregne block'ets hash, bruger vi hash funktion nedenunder.
        this.hash = this.calculateHash();

    }

    calculateHash(){
        return SHA256(this.previousHash + this.timestamp + JSON.stringify(this.odre) + this.nonce).toString();

    }

    mineBlock(difficulty){
        while(this.hash.substring(0,difficulty) !== Array(difficulty+1).join("0")){
            this.nonce++;
            this.hash = this.calculateHash();
        }

        console.log("Block mined: " + this.hash);
    }

    hasValidOdre(){
        for(const odr of this.odre){
            if(!odr.isValid()){
                return false;
            }
        }

        return true;
    }
}


// Class for vores blockchain
class Blockchain{
    constructor(){
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingOdre = [];
        this.miningReward = 100;
    }

    createGenesisBlock(){
        return new Block("01/01/2022", "Genesis block", "0");
    }

    getLatestBlock(){
         return this.chain[this.chain.length - 1];
    }

    minePendingOdre(miningRewardAdress){
        const rewardOdr = new Odre(null, miningRewardAdress, this.miningReward);
        this.pendingOdre.push(rewardOdr);

        let block = new Block(Date.now(), this.pendingOdre);
        block.mineBlock(this.difficulty);

        console.log('Block sucessfully mined!');
        this.chain.push(block);

        this.pendingOdre = [
            new Odre(null, miningRewardAdress, this.miningReward)
        ];
    }

    addOdre(odre){

        if(!odre.fraAdresse || !odre.tilAdresse){
            throw new Error('Alle odre skal have en fra og til adresse!');
        }

        if(!odre.isValid()){
            throw new Error('Kan ikke tilføje ordren til blockchainen');
        }

        this.pendingOdre.push(odre);
    }

    getBalenceOfAdress(adress){
        let balance = 0;

        for(const block of this.chain){
            for(const trans of block.odre){
                if(trans.fraAdresse === adress){
                    balance -= trans.amount;
                }
                if(trans.tilAdresse === adress){
                    balance += trans.amount;
                }
            }
        }

        return balance;
    }

    isChainValid(){
        for(let i = 1; i < this.chain.length; i++){
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i-1];

            if(!currentBlock.hasValidOdre()){
                return false;
            }

            if(currentBlock.hash !== currentBlock.calculateHash()){
                return false;
            }

            if(currentBlock.previousHash !== previousBlock.calculateHash()){
                return false;
            }
        }

    return true;
    }
}

module.exports.Blockchain = Blockchain;
module.exports.Odre = Odre;
module.exports.Block = Block;
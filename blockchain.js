// Imports
const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Opret odre class

class Odre{
    constructor(fraAdresse, tilAdresse, amount){
        this.fraAdresse = fraAdresse;
        this.tilAdresse = tilAdresse;
        this.amount = amount;
    }

    // Herefter laves der nogle methods til diverse ting    

    // Beregn SHA256 hash af den givne odre, ved brug af cryptojs libary
    calculateHash(){
        return SHA256(this.fraAdresse + this.tilAdresse + this.amount).toString();
    }

    /** Vi skal sigere en odre med det keypar som vi får fra elliptic libaryet,
     * Dette giver os både en public og private key.
     * Signaturen er senere gemt i odrens object og gemt i blockchainen
     */
    signOdre(signingKey){
        /** 
         * Man kan kun sende en odre fra sin egen wallet, så vi checker om 
         * fraAdressen matcher din publickey.
        */
        if(signingKey.getPublic('hex') !== this.fraAdresse){
            throw new Error('Du kan ik underskrive odre fra andre wallets!');
        }

        /**
         * Beregner hash af odren og signere den
         * samt gemmer den.
         */
        const hashOdre = this.calculateHash();
        const sig = signingKey.sign(hashOdre, 'base64');
        this.signatur = sig.toDER('hex');
    }


    /**
     * Checker om signaturen er valid, altså om odren er blevet manipuleret
     */
    isValid(){
        /**
         * Hvis dataen ik har en fraAdresse kan vi konkludere at det er en
         * mining reward, altså det man får for at finde en ny blok.
         */
        if(this.fraAdresse === null) return true;

        /**
         * Checker om der er en signatur for odren.
         */
        if(!this.signatur || this.signatur.length === 0){
            throw new Error('Ingen signatur angivet for denne odre!');
        }

        /**
         * Verify hash
         */
        const publicKey = ec.keyFromPublic(this.fraAdresse, 'hex');
        return publicKey.verify(this.calculateHash(), this.signatur);
    }
}

/**
 * Laver en class for en blok
 * hvor vi angiver hvad en blok indeholder
 */

class Block{
    constructor(timestamp, odre, previousHash = ''){
        this.timestamp = timestamp;
        this.odre = odre;
        this.previousHash = previousHash;
        this.nonce = 0;

        // For at beregne block'ets hash, bruger vi hash funktion nedenunder.
        this.hash = this.calculateHash();

    }

    /**
     * Beregner SHA256 hash af det givne blok, ved at tage alt dataen i blokken.
     */
    calculateHash(){
        return SHA256(this.previousHash + this.timestamp + JSON.stringify(this.odre) + this.nonce).toString();

    }

    /**
     * Gør det muligt at mine en blok. Her ændre vi nonce
     * indtil hashet minet starter med det antal 0'er som sværhed
     * er sat til.
     */
    mineBlock(difficulty){
        while(this.hash.substring(0,difficulty) !== Array(difficulty+1).join("0")){
            this.nonce++;
            this.hash = this.calculateHash();
        }

        console.log("Block mined: " + this.hash);
    }


    /**
     * Validere alle de odre der er i blokken
     */
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

    /**
     * Lav den første block, som man kalder GenesisBlock
     */
    createGenesisBlock(){
        return new Block("01/01/2022", "Genesis block", "0");
    }

    /**
     * Find den seneste blok, så vi kan lave en ny blok
     * baseret på den seneste blok.
     */
    getLatestBlock(){
         return this.chain[this.chain.length - 1];
    }

    /**
     * Tager alle kommende odre og putter dem ind i blokken
     * og tager mining processen.
     * 
     * Adder også en odre om at sende mine præmien til den givne adresse.
     */
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

    /**
     * Tilføjer en ny odre til listen af kommende odre, så odren kan
     * gå gennem når der bliver minet en ny blok.
     */
    addOdre(odre){

        if(!odre.fraAdresse || !odre.tilAdresse){
            throw new Error('Alle odre skal have en fra og til adresse!');
        }

        if(!odre.isValid()){
            throw new Error('Kan ikke tilføje ordren til blockchainen');
        }

        this.pendingOdre.push(odre);
    }


    /**
     * Find en adresses saldo.
     */
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

    /**
     * Check om en blockchain er valid
     * 
     * Den looper gennem alle bloks og verificere at
     * de alle hænger sammen.
     * 
     * Der et problem med denne funktion, jeg ik lige kan finde pt.
     */
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
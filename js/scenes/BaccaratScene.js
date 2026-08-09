import { Navbar } from "../ui/Navbar.js";

export class BaccaratScene extends Phaser.Scene {
    constructor() {
        super("BACCARAT");
    }

    preload() {
        this.load.image("baccaratBackground", "assets/images/baccarat.png");
        this.load.spritesheet("baccaratCards", "assets/images/cards.png", {
            frameWidth: 69,
            frameHeight: 94
        });
        this.load.spritesheet("baccaratChips", "assets/images/chips.png", {
            frameWidth: 30,
            frameHeight: 27
        });
        this.load.audio("baccaratDeal", "assets/sounds/BACCARAT.WAV");
        Navbar.preload(this);
    }

    create() {
        this.minimumBet = 20;
        this.betAmount = 20;
        this.betSide = "player";
        this.roundActive = false;
        this.cardSprites = [];
        globalThis.BACCARAT_COMMISSION_OWED ??= 0;
        this.shoe = this.makeShoe();

        this.add.image(0, 62, "baccaratBackground")
            .setOrigin(0, 0)
            .setDisplaySize(800, 538);

        this.bankZone = new Phaser.Geom.Rectangle(18, 135, 317, 105);
        this.playerZone = new Phaser.Geom.Rectangle(18, 379, 317, 166);

        this.commissionText = this.add.text(12, 78, "", {
            fontFamily: "Arial",
            fontSize: "19px",
            fontStyle: "bold",
            color: "#d8ffd8",
            stroke: "#004400",
            strokeThickness: 3
        }).setDepth(30);

        this.bankScoreText = this.makeScoreText(640, 177);
        this.playerScoreText = this.makeScoreText(640, 402);
        this.statusText = this.add.text(400, 290, "Drag the chip to BANK or PLAYER", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#004400",
            strokeThickness: 4,
            align: "center"
        }).setOrigin(0.5).setDepth(30);
        this.winnerText = this.add.text(785, 568, "", {
            fontFamily: "Arial",
            fontSize: "23px",
            fontStyle: "bold",
            color: "#ffff00",
            stroke: "#000000",
            strokeThickness: 5,
            align: "right"
        }).setOrigin(1, 0.5).setDepth(40);

        this.exitButton = this.makeButton(48, 576, "Exit", () => this.exitScene());
        this.dealButton = this.makeButton(291, 576, "Deal", () => this.dealRound());

        this.navbar = new Navbar(this);
        this.createWagerChip();
        this.updateDisplay();
    }

    makeScoreText(x, y) {
        return this.add.text(x, y, "", {
            fontFamily: "Arial",
            fontSize: "25px",
            fontStyle: "bold",
            color: "#ffff00",
            stroke: "#004400",
            strokeThickness: 4
        }).setOrigin(0, 0.5).setDepth(30);
    }

    makeButton(x, y, label, callback) {
        const button = this.add.text(x, y, label, {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#000000",
            padding: { x: 12, y: 3 }
        }).setOrigin(0.5).setDepth(30).setInteractive({ useHandCursor: true });
        button.on("pointerdown", callback);
        return button;
    }

    createWagerChip() {
        this.wagerChip?.destroy();
        if (Number(globalThis.STAKE ?? 0) < this.minimumBet) {
            this.wagerChip = null;
            return;
        }

        const position = this.getBetPosition(this.betSide);
        this.wagerChip = this.add.sprite(
            position.x,
            position.y,
            "baccaratChips",
            2
        ).setScale(1.25).setDepth(35);
        this.wagerChip.setData("homeSide", this.betSide);
        this.enableWagerDrag();
    }

    enableWagerDrag() {
        if (!this.wagerChip || this.roundActive) return;
        const chip = this.wagerChip;
        chip.setInteractive({ useHandCursor: true });
        this.input.setDraggable(chip);
        if (chip.getData("dragConfigured")) return;
        chip.setData("dragConfigured", true);

        chip.on("drag", (pointer, dragX, dragY) => chip.setPosition(dragX, dragY));
        chip.on("dragend", () => {
            if (Phaser.Geom.Rectangle.Contains(this.bankZone, chip.x, chip.y)) {
                this.betSide = "bank";
            } else if (Phaser.Geom.Rectangle.Contains(this.playerZone, chip.x, chip.y)) {
                this.betSide = "player";
            }
            const position = this.getBetPosition(this.betSide);
            chip.setPosition(position.x, position.y).setData("homeSide", this.betSide);
            this.updateDisplay();
        });
    }

    getBetPosition(side) {
        const zone = side === "bank" ? this.bankZone : this.playerZone;
        return { x: zone.centerX, y: zone.centerY + 20 };
    }

    dealRound() {
        if (this.roundActive || !this.wagerChip) return;
        this.ensureShoe();
        const stake = Number(globalThis.STAKE ?? 0);
        if (stake < this.betAmount) {
            this.updateDisplay();
            return;
        }

        this.roundActive = true;
        this.clearCards();
        this.winnerText.setText("");
        this.statusText.setText("DEALING...");
        this.bankScoreText.setText("");
        this.playerScoreText.setText("");
        this.wagerChip.disableInteractive();
        this.setButtonEnabled(this.dealButton, false);
        globalThis.STAKE = stake - this.betAmount;
        this.navbar.setStake(globalThis.STAKE);

        if (this.cache.audio.exists("baccaratDeal")) this.sound.play("baccaratDeal");

        const playerHand = [];
        const bankHand = [];
        const dealSequence = [];
        for (let cardNumber = 0; cardNumber < 2; cardNumber++) {
            const playerCard = this.shoe.pop();
            playerHand.push(playerCard);
            dealSequence.push({ card: playerCard, side: "player" });

            const bankCard = this.shoe.pop();
            bankHand.push(bankCard);
            dealSequence.push({ card: bankCard, side: "bank" });
        }
        const initialPlayerScore = this.handScore(playerHand);
        const initialBankScore = this.handScore(bankHand);

        if (initialPlayerScore < 8 && initialBankScore < 8) {
            let playerThird = null;
            if (initialPlayerScore < 6) {
                playerThird = this.shoe.pop();
                playerHand.push(playerThird);
                dealSequence.push({ card: playerThird, side: "player" });
            }
            if (this.bankDraws(initialBankScore, playerThird)) {
                const bankThird = this.shoe.pop();
                bankHand.push(bankThird);
                dealSequence.push({ card: bankThird, side: "bank" });
            }
        }

        const delay = this.renderDealSequence(dealSequence);
        this.time.delayedCall(delay + 350, () => this.finishRound(playerHand, bankHand));
    }

    renderDealSequence(dealSequence) {
        const cardCounts = { player: 0, bank: 0 };
        dealSequence.forEach(({ card, side }, index) => {
            const targetX = 390 + cardCounts[side] * 82;
            const targetY = side === "bank" ? 177 : 402;
            cardCounts[side]++;
            const sprite = this.add.sprite(745, 105, "baccaratCards", this.getCardFrame(card))
                .setScale(0.78)
                .setAlpha(0)
                .setDepth(20);
            this.cardSprites.push(sprite);
            this.tweens.add({
                targets: sprite,
                x: targetX,
                y: targetY,
                alpha: 1,
                duration: 280,
                delay: index * 130,
                ease: "Cubic.Out"
            });
        });
        return dealSequence.length * 130;
    }

    finishRound(playerHand, bankHand) {
        const playerScore = this.handScore(playerHand);
        const bankScore = this.handScore(bankHand);
        this.playerScoreText.setText(`SCORE ${playerScore}`);
        this.bankScoreText.setText(`SCORE ${bankScore}`);

        let winner;
        if (playerScore > bankScore) winner = "player";
        else if (bankScore > playerScore) winner = "bank";
        else winner = "tie";

        if (winner === "tie") {
            globalThis.STAKE = Number(globalThis.STAKE ?? 0) + this.betAmount;
            this.winnerText.setText("TIE");
            this.statusText.setText("Tie — wager returned");
        } else if (winner === this.betSide) {
            globalThis.STAKE = Number(globalThis.STAKE ?? 0) + this.betAmount * 2;
            if (winner === "bank") {
                globalThis.BACCARAT_COMMISSION_OWED = Number(
                    globalThis.BACCARAT_COMMISSION_OWED ?? 0
                ) + this.betAmount * 0.05;
            }
            this.winnerText.setText(`${winner.toUpperCase()} WINS`);
            this.statusText.setText(`You win $${this.betAmount}`);
        } else {
            this.winnerText.setText(`${winner.toUpperCase()} WINS`);
            this.statusText.setText(`You lose $${this.betAmount}`);
        }

        this.roundActive = false;
        this.navbar.setStake(globalThis.STAKE);
        this.createWagerChip();
        this.updateDisplay();
    }

    bankDraws(bankScore, playerThird) {
        if (!playerThird) return bankScore < 6;
        const thirdValue = this.cardValue(playerThird);
        if (thirdValue === 0 || thirdValue === 1 || thirdValue === 9) return bankScore < 4;
        if (thirdValue === 2 || thirdValue === 3) return bankScore < 5;
        if (thirdValue === 4 || thirdValue === 5) return bankScore < 6;
        if (thirdValue === 6 || thirdValue === 7) return bankScore < 7;
        return bankScore < 3;
    }

    handScore(hand) {
        return hand.reduce((total, card) => total + this.cardValue(card), 0) % 10;
    }

    cardValue(card) {
        if (card.rank === "A") return 1;
        if (["10", "J", "Q", "K"].includes(card.rank)) return 0;
        return Number(card.rank);
    }

    makeShoe(deckCount = 8) {
        const suits = ["D", "H", "C", "S"];
        const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
        const shoe = [];
        for (let deckIndex = 0; deckIndex < deckCount; deckIndex++) {
            suits.forEach((suit) => {
                ranks.forEach((rank) => shoe.push({ rank, suit }));
            });
        }
        return Phaser.Utils.Array.Shuffle(shoe);
    }

    ensureShoe() {
        if (this.shoe.length >= 6) return;
        this.collectCommission();
        this.shoe = this.makeShoe();
    }

    collectCommission() {
        const commission = Number(globalThis.BACCARAT_COMMISSION_OWED ?? 0);
        if (commission <= 0) return;
        globalThis.STAKE = Math.max(0, Number(globalThis.STAKE ?? 0) - commission);
        globalThis.BACCARAT_COMMISSION_OWED = 0;
        this.navbar?.setStake(globalThis.STAKE);
    }

    getCardFrame(card) {
        const suitOffset = { D: 0, H: 1, C: 2, S: 3 };
        const rankIndex = {
            "2": 0, "3": 1, "4": 2, "5": 3, "6": 4, "7": 5,
            "8": 6, "9": 7, "10": 8, J: 9, Q: 10, K: 11, A: 12
        };
        return rankIndex[card.rank] * 4 + suitOffset[card.suit];
    }

    clearCards() {
        this.cardSprites.forEach((card) => card.destroy());
        this.cardSprites = [];
    }

    updateDisplay() {
        const commission = Number(globalThis.BACCARAT_COMMISSION_OWED ?? 0);
        this.commissionText.setText(
            `Commission Owed: $${commission.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`
        );
        if (!this.roundActive && this.wagerChip && !this.winnerText.text) {
            this.statusText.setText(`$${this.betAmount} BET ON ${this.betSide.toUpperCase()}`);
        }
        this.setButtonEnabled(
            this.dealButton,
            !this.roundActive && Number(globalThis.STAKE ?? 0) >= this.betAmount
        );
    }

    setButtonEnabled(button, enabled) {
        button.setColor(enabled ? "#000000" : "#777777");
        if (enabled) button.setInteractive({ useHandCursor: true });
        else button.disableInteractive();
    }

    exitScene() {
        if (this.roundActive) return;
        this.collectCommission();
        this.scene.start("Hub");
    }
}

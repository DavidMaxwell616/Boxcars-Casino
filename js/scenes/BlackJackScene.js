export class BlackjackScene extends Phaser.Scene {
    constructor() {
        super("BLACKJACK");
    }

    preload() {
        this.load.spritesheet("cards", "assets/images/cards.png", {
            frameWidth: 92,
            frameHeight: 94
        });

        this.load.spritesheet("chips", "assets/images/chips.png", {
            frameWidth: 30,
            frameHeight: 27
        });
    }

    create() {
        this.W = 624;
        this.H = 376;

        this.balance = 500;
        this.betPlaced = 5;
        this.roundActive = false;
        this.playerTurn = false;
        this.hideDealerHole = true;

        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];

        this.cardSprites = [];
        this.chipSprites = [];

        this.colors = {
            titleBlue: 0x0000aa,
            titleBlueDark: 0x00007a,
            menuGray: 0xc0c0c0,
            menuShadow: 0x808080,
            menuHi: 0xffffff,
            felt: 0x008a00,
            felt2: 0x007800,
            white: 0xffffff,
            black: 0x000000,
            gold: 0xd8d088,
            grayBtn: 0xc0c0c0,
            grayBtnShadow: 0x6a6a6a,
            grayBtnHi: 0xffffff
        };

        this.buildBackground();
        this.buildButtons();
        this.buildMoneyBoxes();
        this.buildChipControls();

        this.cardLayer = this.add.container(0, 0);

        this.messageText = this.add.text(318, 210, "", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.statusText = this.add.text(395, 46, "", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#000000"
        });

        this.dealerScoreText = this.add.text(574, 84, "", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#ffffff"
        }).setOrigin(1, 0);

        this.playerScoreText = this.add.text(574, 230, "", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#ffffff"
        }).setOrigin(1, 0);

        this.startRound();
        this.fitToGameSize();
    }

    buildBackground() {
        const g = this.add.graphics();

        g.fillStyle(this.colors.menuGray, 1);
        g.fillRect(0, 0, this.W, this.H);

        this.drawPanel(g, 0, 0, this.W, this.H, true);

        g.fillStyle(this.colors.titleBlue, 1);
        g.fillRect(3, 3, this.W - 6, 18);

        g.fillStyle(this.colors.titleBlueDark, 1);
        g.fillRect(3, 18, this.W - 6, 3);

        this.add.text(9, 6, "Blackjack", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#ffffff",
            fontStyle: "bold"
        });

        this.drawWin95Button(g, this.W - 18, 4, 14, 14, "x", 10);

        g.fillStyle(this.colors.menuGray, 1);
        g.fillRect(3, 21, this.W - 6, 18);

        this.add.text(8, 24, "(A)", {
            fontFamily: "Arial",
            fontSize: "11px",
            color: "#000000"
        });
        this.add.text(32, 24, "File", {
            fontFamily: "Arial",
            fontSize: "11px",
            color: "#000000"
        });
        this.add.text(74, 24, "Options", {
            fontFamily: "Arial",
            fontSize: "11px",
            color: "#000000"
        });
        this.add.text(125, 24, "Keno", {
            fontFamily: "Arial",
            fontSize: "11px",
            color: "#000000"
        });

        g.fillStyle(this.colors.felt, 1);
        g.fillRect(3, 39, 210, 334);
        g.fillRect(215, 39, 406, 334);

        g.fillStyle(this.colors.menuGray, 1);
        g.fillRect(213, 39, 2, 334);

        g.fillStyle(this.colors.gold, 1);
        g.fillRect(25, 61, 162, 2);

        this.add.text(25, 58, "INSURANCE PAYS 2 TO 1", {
            fontFamily: "Courier New",
            fontSize: "12px",
            color: "#d8d088",
            fontStyle: "bold"
        });

        g.lineStyle(2, 0xe0e0e0, 1);
        g.strokeRect(26, 135, 164, 115);

        g.fillStyle(this.colors.menuGray, 1);
        g.fillRect(3, 347, 210, 26);
        this.drawPanel(g, 3, 347, 210, 26, false);

        this.drawInsetRect(g, 395, 44, 170, 11);

        g.fillStyle(this.colors.felt2, 0.18);
        g.fillRect(215, 39, 406, 8);
        g.fillRect(3, 39, 210, 8);
    }

    buildMoneyBoxes() {
        const g = this.add.graphics();

        this.drawMoneyBox(g, 568, 42, 46, 19);
        this.drawMoneyBox(g, 568, 61, 46, 19);

        this.moneyBetText = this.add.text(591, 46, "$5", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5, 0);

        this.moneyBalanceText = this.add.text(591, 65, "$500", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5, 0);
    }

    buildButtons() {
        const g = this.add.graphics();

        this.exitBtnRect = new Phaser.Geom.Rectangle(9, 350, 46, 20);
        this.hitBtnRect = new Phaser.Geom.Rectangle(74, 350, 58, 20);
        this.standBtnRect = new Phaser.Geom.Rectangle(150, 350, 58, 20);
        this.dealBtnRect = new Phaser.Geom.Rectangle(86, 308, 74, 24);

        this.drawBevelButton(g, this.exitBtnRect.x, this.exitBtnRect.y, this.exitBtnRect.width, this.exitBtnRect.height, false);
        this.drawBevelButton(g, this.hitBtnRect.x, this.hitBtnRect.y, this.hitBtnRect.width, this.hitBtnRect.height, true);
        this.drawBevelButton(g, this.standBtnRect.x, this.standBtnRect.y, this.standBtnRect.width, this.standBtnRect.height, true);
        this.drawBevelButton(g, this.dealBtnRect.x, this.dealBtnRect.y, this.dealBtnRect.width, this.dealBtnRect.height, false);

        this.add.text(32, 359, "Exit", {
            fontFamily: "Arial",
            fontSize: "11px",
            color: "#000000"
        }).setOrigin(0.5);

        this.hitBtnText = this.add.text(103, 359, "Hit", {
            fontFamily: "Arial",
            fontSize: "11px",
            color: "#7f7f7f",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.standBtnText = this.add.text(179, 359, "Stand", {
            fontFamily: "Arial",
            fontSize: "11px",
            color: "#7f7f7f",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.dealBtnText = this.add.text(123, 320, "Deal", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#000000",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.input.on("pointerdown", (pointer) => {
            const x = this.blackjackDisplay
                ? pointer.x / this.blackjackDisplay.scaleX
                : pointer.x;
            const y = this.blackjackDisplay
                ? pointer.y / this.blackjackDisplay.scaleY
                : pointer.y;

            if (Phaser.Geom.Rectangle.Contains(this.exitBtnRect, x, y)) {
                this.scene.restart();
                return;
            }

            if (Phaser.Geom.Rectangle.Contains(this.dealBtnRect, x, y)) {
                if (!this.roundActive) this.startRound();
                return;
            }

            if (Phaser.Geom.Rectangle.Contains(this.hitBtnRect, x, y)) {
                if (this.roundActive && this.playerTurn) this.onHit();
                return;
            }

            if (Phaser.Geom.Rectangle.Contains(this.standBtnRect, x, y)) {
                if (this.roundActive && this.playerTurn) this.onStand();
                return;
            }
        });
    }

    fitToGameSize() {
        const sceneObjects = this.children.getChildren().slice();

        this.blackjackDisplay = this.add.container(0, 0, sceneObjects);
        this.blackjackDisplay.setScale(
            this.scale.width / this.W,
            this.scale.height / this.H
        );
    }

    buildChipControls() {
        // chip frame suggestion:
        // 0 = $1
        // 1 = $5
        // 2 = $10
        // 3 = $25
        // 4 = $100

        this.betInfoText = this.add.text(25, 320, "", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#ffffff"
        });

        const chipDefs = [
            { x: 45, y: 298, frame: 2, value: 10 },
            { x: 80, y: 298, frame: 2, value: 10 },
            { x: 108, y: 168, frame: 2, value: 10 }
        ];

        chipDefs.forEach((def) => {
            const chip = this.add.sprite(def.x, def.y, "chips", def.frame).setInteractive({ useHandCursor: true });
            chip.setData("value", def.value);
            chip.on("pointerdown", () => {
                if (this.roundActive) return;
                this.betPlaced = chip.getData("value");
                this.updateTexts();
            });
            this.chipSprites.push(chip);
        });
    }

    startRound() {
        if (this.balance < this.betPlaced) {
            this.messageText.setText("Not enough money");
            return;
        }

        this.roundActive = true;
        this.playerTurn = true;
        this.hideDealerHole = true;
        this.messageText.setText("");

        this.balance -= this.betPlaced;

        this.deck = this.makeShuffledDeck();
        this.playerHand = [];
        this.dealerHand = [];

        this.dealCard(this.playerHand);
        this.dealCard(this.dealerHand);
        this.dealCard(this.playerHand);
        this.dealCard(this.dealerHand);

        this.renderHands();
        this.updateTexts();

        const p = this.getBestValue(this.playerHand);
        const d = this.getBestValue(this.dealerHand);

        if (p === 21 || d === 21) {
            this.time.delayedCall(400, () => this.finishNaturals());
        }
    }

    finishNaturals() {
        const p = this.getBestValue(this.playerHand);
        const d = this.getBestValue(this.dealerHand);

        this.hideDealerHole = false;
        this.renderHands();

        if (p === 21 && d === 21) {
            this.balance += this.betPlaced;
            this.endRound("Push");
        } else if (p === 21) {
            this.balance += Math.floor(this.betPlaced * 2.5);
            this.endRound("Blackjack");
        } else if (d === 21) {
            this.endRound("Dealer has Blackjack");
        }

        this.updateTexts();
    }

    onHit() {
        this.dealCard(this.playerHand);
        this.renderHands();
        this.updateTexts();

        if (this.getBestValue(this.playerHand) > 21) {
            this.hideDealerHole = false;
            this.renderHands();
            this.endRound("Bust");
            this.updateTexts();
        }
    }

    onStand() {
        this.playerTurn = false;
        this.hideDealerHole = false;
        this.renderHands();
        this.updateTexts();
        this.dealerPlayStep();
    }

    dealerPlayStep() {
        const d = this.getBestValue(this.dealerHand);

        if (d < 17) {
            this.time.delayedCall(450, () => {
                this.dealCard(this.dealerHand);
                this.renderHands();
                this.updateTexts();
                this.dealerPlayStep();
            });
            return;
        }

        this.resolveWinner();
    }

    resolveWinner() {
        const p = this.getBestValue(this.playerHand);
        const d = this.getBestValue(this.dealerHand);

        if (d > 21) {
            this.balance += this.betPlaced * 2;
            this.endRound("Dealer Busts");
        } else if (p > d) {
            this.balance += this.betPlaced * 2;
            this.endRound("You Win");
        } else if (p < d) {
            this.endRound("Dealer Wins");
        } else {
            this.balance += this.betPlaced;
            this.endRound("Push");
        }

        this.updateTexts();
    }

    endRound(msg) {
        this.roundActive = false;
        this.playerTurn = false;
        this.messageText.setText(msg);
    }

    renderHands() {
        this.cardLayer.removeAll(true);
        this.cardSprites.length = 0;

        const dealerX = 220;
        const dealerY = 46;
        const playerX = 220;
        const playerY = 184;

        for (let i = 0; i < this.dealerHand.length; i++) {
            const frame = (this.hideDealerHole && i === 1)
                ? this.getCardBackFrame()
                : this.getCardFrame(this.dealerHand[i]);

            const spr = this.add.sprite(dealerX + i * 22, dealerY + i * 2, "cards", frame).setOrigin(0, 0);
            this.cardLayer.add(spr);
            this.cardSprites.push(spr);
        }

        for (let i = 0; i < this.playerHand.length; i++) {
            const frame = this.getCardFrame(this.playerHand[i]);
            const spr = this.add.sprite(playerX + i * 20, playerY + i * 2, "cards", frame).setOrigin(0, 0);
            this.cardLayer.add(spr);
            this.cardSprites.push(spr);
        }
    }

    updateTexts() {
        this.moneyBetText.setText("$" + this.betPlaced);
        this.moneyBalanceText.setText("$" + this.balance);

        this.betInfoText.setText(this.roundActive ? "" : ("Bet: $" + this.betPlaced));

        this.dealerScoreText.setText(
            this.hideDealerHole
                ? "Dealer: " + this.cardValue(this.dealerHand[0]) + "+"
                : "Dealer: " + this.getBestValue(this.dealerHand)
        );

        this.playerScoreText.setText("Player: " + this.getBestValue(this.playerHand));

        this.hitBtnText.setColor(this.roundActive && this.playerTurn ? "#000000" : "#7f7f7f");
        this.standBtnText.setColor(this.roundActive && this.playerTurn ? "#000000" : "#7f7f7f");
        this.dealBtnText.setColor(!this.roundActive ? "#000000" : "#7f7f7f");

        this.statusText.setText(!this.roundActive ? "Click Deal to play" : "");
    }

    makeShuffledDeck() {
        const suits = ["C", "D", "H", "S"];
        const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        const deck = [];

        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ rank, suit });
            }
        }

        Phaser.Utils.Array.Shuffle(deck);
        return deck;
    }

    dealCard(hand) {
        if (this.deck.length === 0) {
            this.deck = this.makeShuffledDeck();
        }
        hand.push(this.deck.pop());
    }

    cardValue(card) {
        if (!card) return 0;
        if (card.rank === "A") return 11;
        if (card.rank === "K" || card.rank === "Q" || card.rank === "J" || card.rank === "10") return 10;
        return parseInt(card.rank, 10);
    }

    getBestValue(hand) {
        let total = 0;
        let aces = 0;

        for (const c of hand) {
            total += this.cardValue(c);
            if (c.rank === "A") aces++;
        }

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    // Frame layout:
    // clubs A-K   => 0..12
    // diamonds A-K=> 13..25
    // hearts A-K  => 26..38
    // spades A-K  => 39..51
    // back        => 52
    getCardFrame(card) {
        const suitBase = {
            C: 0,
            D: 13,
            H: 26,
            S: 39
        };

        const rankIndex = {
            A: 0,
            "2": 1,
            "3": 2,
            "4": 3,
            "5": 4,
            "6": 5,
            "7": 6,
            "8": 7,
            "9": 8,
            "10": 9,
            J: 10,
            Q: 11,
            K: 12
        };

        return suitBase[card.suit] + rankIndex[card.rank];
    }

    getCardBackFrame() {
        return 52;
    }

    drawPanel(g, x, y, w, h, raised) {
        const hi = raised ? this.colors.white : this.colors.menuShadow;
        const lo = raised ? this.colors.menuShadow : this.colors.white;

        g.lineStyle(1, hi, 1);
        g.beginPath();
        g.moveTo(x + w - 1, y);
        g.lineTo(x, y);
        g.lineTo(x, y + h - 1);
        g.strokePath();

        g.lineStyle(1, lo, 1);
        g.beginPath();
        g.moveTo(x + w - 1, y);
        g.lineTo(x + w - 1, y + h - 1);
        g.lineTo(x, y + h - 1);
        g.strokePath();
    }

    drawInsetRect(g, x, y, w, h) {
        g.fillStyle(0xbdbdbd, 1);
        g.fillRect(x, y, w, h);

        g.lineStyle(1, 0x606060, 1);
        g.beginPath();
        g.moveTo(x + w - 1, y);
        g.lineTo(x, y);
        g.lineTo(x, y + h - 1);
        g.strokePath();

        g.lineStyle(1, 0xffffff, 1);
        g.beginPath();
        g.moveTo(x + w - 1, y);
        g.lineTo(x + w - 1, y + h - 1);
        g.lineTo(x, y + h - 1);
        g.strokePath();
    }

    drawBevelButton(g, x, y, w, h, disabled) {
        const fill = disabled ? 0xb8b8b8 : this.colors.grayBtn;

        g.fillStyle(fill, 1);
        g.fillRect(x, y, w, h);

        g.lineStyle(1, this.colors.grayBtnHi, 1);
        g.beginPath();
        g.moveTo(x + w - 1, y);
        g.lineTo(x, y);
        g.lineTo(x, y + h - 1);
        g.strokePath();

        g.lineStyle(1, this.colors.grayBtnShadow, 1);
        g.beginPath();
        g.moveTo(x + w - 1, y);
        g.lineTo(x + w - 1, y + h - 1);
        g.lineTo(x, y + h - 1);
        g.strokePath();
    }

    drawWin95Button(g, x, y, w, h, label, fontSize) {
        this.drawBevelButton(g, x, y, w, h, false);
        this.add.text(x + w / 2, y + h / 2 + 1, label, {
            fontFamily: "Arial",
            fontSize: fontSize + "px",
            color: "#000000",
            fontStyle: "bold"
        }).setOrigin(0.5);
    }

    drawMoneyBox(g, x, y, w, h) {
        g.fillStyle(0x101010, 1);
        g.fillRect(x, y, w, h);
        g.lineStyle(1, 0xffffff, 1);
        g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
}


import { getBestChipStackDistribution } from "../GameFunctions.js";
import { Navbar } from "../ui/Navbar.js";

export class BlackjackScene extends Phaser.Scene {
    constructor() {
        super("BLACKJACK");
    }

    preload() {
        this.load.image("blackjackBackground", "assets/images/blackjack.png");
        Navbar.preload(this);

        this.load.spritesheet("blackjackCardsV2", "assets/images/cards.png", {
            frameWidth: 69,
            frameHeight: 94
        });

        this.load.spritesheet("chips", "assets/images/chips.png", {
            frameWidth: 30,
            frameHeight: 27
        });
    }

    create() {
        this.balance = Number(globalThis.STAKE ?? 0);
        this.betPlaced = 0;
        this.roundActive = false;
        this.playerTurn = false;
        this.hideDealerHole = true;

        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];

        this.cardSprites = [];
        this.dealerCardSprites = [];
        this.playerCardSprites = [];
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];

        // Interior of the white betting square in the resized background.
        this.betZoneRect = new Phaser.Geom.Rectangle(42, 241, 228, 220);

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
        this.W = 800;
        this.H = 538;
        this.add.image(0, 62, "blackjackBackground")
            .setOrigin(0, 0)
            .setDisplaySize(this.W, this.H);

        this.exitBtnRect = new Phaser.Geom.Rectangle(21, 570, 48, 18);
        this.hitBtnRect = new Phaser.Geom.Rectangle(125, 570, 59, 18);
        this.standBtnRect = new Phaser.Geom.Rectangle(243, 570, 59, 18);
        this.dealBtnRect = new Phaser.Geom.Rectangle(537, 570, 59, 18);

        this.exitBtnText = this.add.text(this.exitBtnRect.centerX, this.exitBtnRect.centerY, "Exit", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#000000",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(10);

        this.hitBtnText = this.add.text(this.hitBtnRect.centerX, this.hitBtnRect.centerY, "Hit", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#7f7f7f",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(10);

        this.standBtnText = this.add.text(this.standBtnRect.centerX, this.standBtnRect.centerY, "Stand", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#7f7f7f",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(10);

        this.dealBtnText = this.add.text(this.dealBtnRect.centerX, this.dealBtnRect.centerY, "Deal", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#000000",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(10);

        this.input.on("pointerdown", (pointer) => {
            const x = this.blackjackDisplay
                ? (pointer.x - this.blackjackDisplay.x) / this.blackjackDisplay.scaleX
                : pointer.x;
            const y = this.blackjackDisplay
                ? (pointer.y - this.blackjackDisplay.y) / this.blackjackDisplay.scaleY
                : pointer.y;

            if (Phaser.Geom.Rectangle.Contains(this.exitBtnRect, x, y)) {
                this.scene.start("Hub");
                return;
            }

            if (Phaser.Geom.Rectangle.Contains(this.dealBtnRect, x, y)) {
                if (!this.roundActive && this.betPlaced > 0) this.startRound();
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
        this.buildMoneyBoxes();
        this.betInfoText = this.add.text(
            this.betZoneRect.centerX,
            this.betZoneRect.y - 80,
            "",
            {
                fontFamily: "Arial",
                fontSize: "20px",
                fontStyle: "bold",
                color: "#ffffff"
            }
        ).setOrigin(0.5, 0);
        this.buildBankrollStacks();

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
            fontSize: "20px",
            fontStyle: "bold",
            color: "#ffffff"
        }).setOrigin(1, 0);

        this.playerScoreText = this.add.text(574, 330, "", {
            fontFamily: "Arial",
            fontSize: "20px",
            fontStyle: "bold",
            color: "#ffffff"
        }).setOrigin(1, 0);

        this.updateTexts();
        this.navbar = new Navbar(this);
    }




    buildMoneyBoxes() {
        const g = this.add.graphics().setDepth(14);
        const panelX = 616;
        const panelY = 74;
        const panelWidth = 174;
        const boxX = 716;
        const boxWidth = 66;
        const boxHeight = 24;

        g.fillStyle(0x006f00, 0.94);
        g.fillRect(panelX, panelY, panelWidth, 68);
        this.drawPanel(g, panelX, panelY, panelWidth, 68, true);
        this.drawMoneyBox(g, boxX, 80, boxWidth, boxHeight);
        this.drawMoneyBox(g, boxX, 112, boxWidth, boxHeight);

        this.add.text(625, 84, "Dealer wager", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setDepth(15);

        this.add.text(625, 116, "Player wager", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setDepth(15);

        this.dealerWagerText = this.add.text(boxX + boxWidth / 2, 92, "$0", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(15);

        this.playerWagerText = this.add.text(boxX + boxWidth / 2, 124, "$0", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(15);
    }

    buildBankrollStacks() {
        const stake = Number(globalThis.STAKE ?? 0);
        if (!Number.isSafeInteger(stake) || stake <= 0) {
            return;
        }

        const chipFrames = new Map([
            [5, 0],
            [10, 1],
            [20, 2],
            [50, 3],
            [100, 4],
            [500, 5],
            [1000, 6],
            [5000, 7]
        ]);

        let distribution;
        try {
            distribution = getBestChipStackDistribution(stake, {
                denominations: [...chipFrames.keys()].sort((a, b) => b - a),
                maxStackHeight: 5,
                preferredVariety: 4
            });
        } catch {
            return;
        }

        const firstStackX = 80;
        const stackBottomY = 525;
        const stackSpacing = 34;
        const chipOverlap = 7;

        distribution.stacks.forEach((stack, stackIndex) => {
            const frame = chipFrames.get(stack.denomination);
            const stackChips = [];

            for (let chipIndex = 0; chipIndex < stack.count; chipIndex++) {
                const chip = this.add.sprite(
                    firstStackX + stackIndex * stackSpacing,
                    stackBottomY - chipIndex * chipOverlap,
                    "chips",
                    frame
                ).setOrigin(0.5, 1);

                chip.setData({
                    value: stack.denomination,
                    stackIndex,
                    chipIndex,
                    originalX: chip.x,
                    originalY: chip.y
                });

                this.chipSprites.push(chip);
                stackChips.push(chip);
            }

            this.bankrollChipStacks[stackIndex] = stackChips;
            this.makeBankrollChipDraggable(stackChips.at(-1));
        });
    }

    makeBankrollChipDraggable(chip) {
        if (!chip) return;

        chip.setInteractive({ useHandCursor: true });
        this.input.setDraggable(chip);

        if (chip.getData("dragConfigured")) return;
        chip.setData("dragConfigured", true);

        chip.on("dragstart", () => {
            this.children.bringToTop(chip);
        });

        chip.on("drag", (pointer, dragX, dragY) => {
            chip.setPosition(dragX, dragY);
        });

        chip.on("dragend", () => {
            const chipCenterY = chip.y - chip.displayHeight / 2;
            const droppedInBetZone = Phaser.Geom.Rectangle.Contains(
                this.betZoneRect,
                chip.x,
                chipCenterY
            );

            if (this.wageredChips.includes(chip)) {
                const returnZone = new Phaser.Geom.Rectangle(
                    chip.getData("originalX") - 22,
                    475,
                    44,
                    80
                );

                if (
                    !this.roundActive &&
                    Phaser.Geom.Rectangle.Contains(returnZone, chip.x, chip.y)
                ) {
                    this.returnWagerChipToStack(chip);
                } else if (!this.roundActive && droppedInBetZone) {
                    chip.setData({ betX: chip.x, betY: chip.y });
                } else {
                    chip.setPosition(chip.getData("betX"), chip.getData("betY"));
                }
                return;
            }

            if (this.roundActive || !droppedInBetZone) {
                chip.setPosition(
                    chip.getData("originalX"),
                    chip.getData("originalY")
                );
                return;
            }

            this.betPlaced += chip.getData("value");
            this.wageredChips.push(chip);
            chip.setData({ betX: chip.x, betY: chip.y });

            const stack = this.bankrollChipStacks[chip.getData("stackIndex")];
            const nextTopChip = [...stack].reverse().find(
                (stackChip) => stackChip.active && !this.wageredChips.includes(stackChip)
            );
            this.makeBankrollChipDraggable(nextTopChip);
            this.updateTexts();
        });
    }

    returnWagerChipToStack(chip) {
        const wagerIndex = this.wageredChips.indexOf(chip);
        if (wagerIndex === -1 || this.roundActive) return;

        this.wageredChips.splice(wagerIndex, 1);
        this.betPlaced = Math.max(0, this.betPlaced - chip.getData("value"));
        chip.setPosition(chip.getData("originalX"), chip.getData("originalY"));

        const stack = this.bankrollChipStacks[chip.getData("stackIndex")];
        stack.forEach((stackChip) => {
            if (this.wageredChips.includes(stackChip)) {
                stackChip.setInteractive({ useHandCursor: true });
                this.input.setDraggable(stackChip);
            } else {
                stackChip.disableInteractive();
            }
        });
        const topChip = [...stack].reverse().find(
            (stackChip) => stackChip.active && !this.wageredChips.includes(stackChip)
        );
        this.makeBankrollChipDraggable(topChip);
        this.updateTexts();
    }

    startRound() {
        this.messageText
            .setPosition(318, 210)
            .setFontSize("18px")
            .setColor("#ffffff")
            .setStroke("#ffffff", 0)
            .setDepth(0)
            .setText("");

        if (this.betPlaced <= 0) {
            this.updateTexts();
            return;
        }

        if (this.balance < this.betPlaced) {
            this.messageText.setText("Not enough money");
            return;
        }

        this.roundActive = true;
        this.playerTurn = false;
        this.hideDealerHole = true;
        this.wageredChips.forEach((chip) => chip.disableInteractive());

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

        const playerScore = this.evaluateHand(this.playerHand);
        const dealerScore = this.evaluateHand(this.dealerHand);

        this.animateInitialDeal(() => {
            if (playerScore.isBlackjack || dealerScore.isBlackjack) {
                this.time.delayedCall(400, () => this.finishNaturals());
            } else {
                this.playerTurn = true;
                this.updateTexts();
            }
        });
    }

    animateInitialDeal(onComplete) {
        const dealOrder = [
            this.playerCardSprites[0],
            this.dealerCardSprites[0],
            this.playerCardSprites[1],
            this.dealerCardSprites[1]
        ].filter(Boolean);
        const deckX = 720;
        const deckY = 105;
        const stagger = 180;

        dealOrder.forEach((card, index) => {
            const isLastCard = index === dealOrder.length - 1;
            this.tweenCardFromDeck(
                card,
                index * stagger,
                isLastCard ? onComplete : undefined,
                deckX,
                deckY
            );
        });

        if (dealOrder.length === 0) onComplete();
    }

    tweenCardFromDeck(card, delay = 0, onComplete, deckX = 720, deckY = 105) {
        const targetX = card.x;
        const targetY = card.y;

        card.setPosition(deckX, deckY).setScale(0.72).setAlpha(0);

        this.tweens.add({
            targets: card,
            x: targetX,
            y: targetY,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 280,
            delay,
            ease: "Cubic.Out",
            onComplete
        });
    }

    finishNaturals() {
        const playerScore = this.evaluateHand(this.playerHand);
        const dealerScore = this.evaluateHand(this.dealerHand);

        this.hideDealerHole = false;
        this.renderHands();

        if (playerScore.isBlackjack && dealerScore.isBlackjack) {
            this.balance += this.betPlaced;
            this.endRound("Push", "push");
        } else if (playerScore.isBlackjack) {
            this.balance += Math.floor(this.betPlaced * 2.5);
            this.endRound("Blackjack", "win", Math.floor(this.betPlaced * 1.5));
        } else if (dealerScore.isBlackjack) {
            this.endRound("Dealer has Blackjack", "loss");
        }

        this.updateTexts();
    }

    onHit() {
        this.playerTurn = false;
        this.updateTexts();

        this.dealCard(this.playerHand);
        const cardIndex = this.playerHand.length - 1;
        const card = this.playerHand[cardIndex];
        const playerX = this.playerScoreText.x - 99;
        const playerY = this.playerScoreText.y + this.playerScoreText.height + 8;
        const sprite = this.add.sprite(
            playerX + cardIndex * 20,
            playerY + cardIndex * 2,
            "blackjackCardsV2",
            this.getCardFrame(card)
        ).setOrigin(0, 0);

        this.cardLayer.add(sprite);
        this.cardSprites.push(sprite);
        this.playerCardSprites.push(sprite);

        this.tweenCardFromDeck(sprite, 0, () => {
            if (this.evaluateHand(this.playerHand).isBust) {
                this.hideDealerHole = false;
                this.renderHands();
                this.endRound("Bust", "loss");
            } else {
                this.playerTurn = true;
            }

            this.updateTexts();
        });
    }

    onStand() {
        this.playerTurn = false;
        this.hideDealerHole = false;
        this.renderHands();
        this.updateTexts();
        this.dealerPlayStep();
    }

    dealerPlayStep() {
        const dealerScore = this.evaluateHand(this.dealerHand);

        if (dealerScore.total < 17) {
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
        const playerScore = this.evaluateHand(this.playerHand);
        const dealerScore = this.evaluateHand(this.dealerHand);

        if (dealerScore.isBust) {
            this.balance += this.betPlaced * 2;
            this.endRound("Dealer Busts", "win", this.betPlaced);
        } else if (playerScore.total > dealerScore.total) {
            this.balance += this.betPlaced * 2;
            this.endRound("You Win", "win", this.betPlaced);
        } else if (playerScore.total < dealerScore.total) {
            this.endRound("Dealer Wins", "loss");
        } else {
            this.balance += this.betPlaced;
            this.endRound("Push", "push");
        }

        this.updateTexts();
    }

    endRound(msg, outcome, winnings = 0) {
        this.playerTurn = false;

        if (outcome === "win") {
            globalThis.STAKE = Number(globalThis.STAKE ?? 0) + winnings;
            this.balance = Number(globalThis.STAKE);
            this.updateNavbarStake();
        }

        this.messageText
            .setPosition(this.W / 2, 330)
            .setFontSize("42px")
            .setFontStyle("bold")
            .setColor("#ff0000")
            .setStroke("#ffffff", 6)
            .setAlign("center")
            .setDepth(100)
            .setText(msg);

        this.time.delayedCall(5000, () => {
            this.messageText.setText("");
            this.clearCardsTween(() => this.settleWager(outcome, winnings));
        });
    }

    clearCardsTween(onComplete) {
        const cards = this.cardSprites.filter((card) => card?.active);
        if (cards.length === 0) {
            this.clearHandsFromTable();
            onComplete();
            return;
        }

        let remaining = cards.length;
        cards.forEach((card, index) => {
            this.children.bringToTop(this.cardLayer);
            this.tweens.add({
                targets: card,
                x: 720 + (index % 3) * 3,
                y: 105 + (index % 3) * 2,
                angle: index % 2 === 0 ? 12 : -12,
                scaleX: 0.68,
                scaleY: 0.68,
                alpha: 0,
                duration: 420,
                delay: index * 65,
                ease: "Cubic.In",
                onComplete: () => {
                    if (card.active) card.destroy();
                    remaining--;
                    if (remaining === 0) {
                        this.clearHandsFromTable();
                        onComplete();
                    }
                }
            });
        });
    }

    clearHandsFromTable() {
        this.cardLayer.removeAll(true);
        this.cardSprites = [];
        this.dealerCardSprites = [];
        this.playerCardSprites = [];
        this.dealerHand = [];
        this.playerHand = [];
        this.dealerScoreText.setText("");
        this.playerScoreText.setText("");
    }

    settleWager(outcome, winnings) {
        const wager = this.betPlaced;
        const transfers = [];

        if (outcome === "loss") {
            globalThis.STAKE = Math.max(0, Number(globalThis.STAKE ?? 0) - wager);

            this.wageredChips.forEach((chip, index) => {
                transfers.push({
                    chip,
                    x: this.dealerScoreText.x + 70 + index * 5,
                    y: this.dealerScoreText.y + 90,
                    alpha: 0
                });
            });
        } else if (outcome === "push") {
            this.wageredChips.forEach((chip) => {
                transfers.push({
                    chip,
                    x: chip.getData("originalX"),
                    y: chip.getData("originalY"),
                    alpha: 1
                });
            });

        } else if (outcome === "win") {
            transfers.push(...this.createWinningChipTransfers(winnings));
        }

        this.runChipTransfers(
            transfers,
            () => this.completeRoundSettlement(outcome)
        );
    }

    createWinningChipTransfers(amount) {
        const chipFrames = new Map([
            [5000, 7],
            [1000, 6],
            [500, 5],
            [100, 4],
            [50, 3],
            [20, 2],
            [10, 1],
            [5, 0]
        ]);
        const transfers = [];
        const payoutValues = [];
        let remaining = amount;

        this.wageredChips.forEach((chip) => {
            const value = chip.getData("value");
            if (remaining >= value) {
                payoutValues.push(value);
                remaining -= value;
            }
        });

        for (const [value, frame] of chipFrames) {
            while (remaining >= value) {
                payoutValues.push(value);
                remaining -= value;
            }
        }

        payoutValues.forEach((value) => {
            const frame = chipFrames.get(value);
            let stackIndex = this.bankrollChipStacks.findIndex(
                (stack) => stack.some((chip) => chip.getData("value") === value)
            );

            if (stackIndex === -1) {
                stackIndex = this.bankrollChipStacks.length;
                this.bankrollChipStacks[stackIndex] = [];
            }

            const stack = this.bankrollChipStacks[stackIndex];
            const stackX = stack[0]?.getData("originalX") ?? 80 + stackIndex * 34;
            const chipsAtBankroll = stack.filter(
                (chip) => chip.active && !this.wageredChips.includes(chip)
            );
            const targetY = chipsAtBankroll.length > 0
                ? Math.min(...chipsAtBankroll.map((chip) => chip.getData("originalY"))) - 7
                : 525;
            const chip = this.add.sprite(
                this.dealerScoreText.x + 70,
                this.dealerScoreText.y + 90,
                "chips",
                frame
            ).setOrigin(0.5, 1).setDepth(20);

            chip.setData({
                value,
                stackIndex,
                chipIndex: stack.length,
                originalX: stackX,
                originalY: targetY
            });
            stack.push(chip);
            this.chipSprites.push(chip);
            transfers.push({ chip, x: stackX, y: targetY, alpha: 1 });
        });

        return transfers;
    }

    runChipTransfers(transfers, onComplete) {
        if (transfers.length === 0) {
            onComplete();
            return;
        }

        let remaining = transfers.length;
        transfers.forEach((transfer, index) => {
            this.tweens.add({
                targets: transfer.chip,
                x: transfer.x,
                y: transfer.y,
                alpha: transfer.alpha,
                duration: 750,
                delay: index * 70,
                ease: "Cubic.InOut",
                onComplete: () => {
                    remaining--;
                    if (remaining === 0) onComplete();
                }
            });
        });
    }

    completeRoundSettlement(outcome) {
        if (outcome === "win") {
            this.bankrollChipStacks.forEach((stack) => {
                const bankrollChips = stack.filter(
                    (chip) => chip.active && !this.wageredChips.includes(chip)
                );
                bankrollChips.forEach((chip) => chip.disableInteractive());

                const topChip = bankrollChips.reduce(
                    (top, chip) => !top || chip.y < top.y ? chip : top,
                    null
                );
                this.makeBankrollChipDraggable(topChip);
            });

            this.balance = Number(globalThis.STAKE ?? 0);
            this.roundActive = false;
            this.playerTurn = false;
            this.wageredChips.forEach((chip) => {
                chip.setInteractive({ useHandCursor: true });
                this.input.setDraggable(chip);
            });
            this.updateNavbarStake();
            this.updateTexts();
            return;
        }

        this.chipSprites.forEach((chip) => {
            if (chip.active) chip.destroy();
        });

        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];
        this.betPlaced = 0;
        this.balance = Number(globalThis.STAKE ?? 0);
        this.roundActive = false;
        this.playerTurn = false;

        this.buildBankrollStacks();
        this.updateNavbarStake();
        this.updateTexts();
    }

    updateNavbarStake() {
        this.navbar.setStake(this.balance);
    }

    renderHands() {
        this.cardLayer.removeAll(true);
        this.cardSprites.length = 0;
        this.dealerCardSprites.length = 0;
        this.playerCardSprites.length = 0;

        const dealerX = this.dealerScoreText.x - 99;
        const dealerY = this.dealerScoreText.y + this.dealerScoreText.height + 8;
        const playerX = this.playerScoreText.x - 99;
        const playerY = this.playerScoreText.y + this.playerScoreText.height + 8;

        for (let i = 0; i < this.dealerHand.length; i++) {
            const frame = (this.hideDealerHole && i === 1)
                ? this.getCardBackFrame()
                : this.getCardFrame(this.dealerHand[i]);

            const spr = this.add.sprite(dealerX + i * 22, dealerY + i * 2, "blackjackCardsV2", frame).setOrigin(0, 0);
            this.cardLayer.add(spr);
            this.cardSprites.push(spr);
            this.dealerCardSprites.push(spr);
        }

        for (let i = 0; i < this.playerHand.length; i++) {
            const frame = this.getCardFrame(this.playerHand[i]);
            const spr = this.add.sprite(playerX + i * 20, playerY + i * 2, "blackjackCardsV2", frame).setOrigin(0, 0);
            this.cardLayer.add(spr);
            this.cardSprites.push(spr);
            this.playerCardSprites.push(spr);
        }
    }

    updateTexts() {
        const wagerText = "$" + this.betPlaced.toLocaleString("en-US");
        this.dealerWagerText.setText(wagerText);
        this.playerWagerText.setText(wagerText);

        this.betInfoText.setText(this.roundActive ? "" : ("Bet: $" + this.betPlaced));

        this.dealerScoreText.setText(
            this.hideDealerHole
                ? "Dealer: " + this.cardValue(this.dealerHand[0]) + "+"
                : "Dealer: " + this.getBestValue(this.dealerHand)
        );

        this.playerScoreText.setText("Player: " + this.getBestValue(this.playerHand));

        this.hitBtnText.setColor(this.roundActive && this.playerTurn ? "#000000" : "#7f7f7f");
        this.standBtnText.setColor(this.roundActive && this.playerTurn ? "#000000" : "#7f7f7f");
        this.dealBtnText.setColor(
            !this.roundActive && this.betPlaced > 0 ? "#000000" : "#7f7f7f"
        );

        this.statusText.setText(
            this.roundActive
                ? ""
                : this.betPlaced > 0
                    ? "Click Deal to play"
                    : "Place a wager to play"
        );
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

    evaluateHand(hand) {
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

        return {
            total,
            isSoft: aces > 0,
            isBust: total > 21,
            isBlackjack: hand.length === 2 && total === 21
        };
    }

    getBestValue(hand) {
        return this.evaluateHand(hand).total;
    }

    // Frame layout groups each rank by suit:
    // 2D, 2H, 2C, 2S, 3D ... KD, KH, KC, KS, AD, AH, AC, AS.
    // The card back is frame 52.
    getCardFrame(card) {
        const suitOffset = {
            D: 0,
            H: 1,
            C: 2,
            S: 3
        };

        const rankIndex = {
            "2": 0,
            "3": 1,
            "4": 2,
            "5": 3,
            "6": 4,
            "7": 5,
            "8": 6,
            "9": 7,
            "10": 8,
            J: 9,
            Q: 10,
            K: 11,
            A: 12
        };

        return rankIndex[card.rank] * 4 + suitOffset[card.suit];
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


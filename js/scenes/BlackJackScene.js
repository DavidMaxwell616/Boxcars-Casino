import { getBestChipStackDistribution } from "../GameFunctions.js";
import { Navbar } from "../ui/Navbar.js";
import { RulesPopup } from "../ui/RulesPopup.js";
import { drawWin95Button } from "../ui/Win95.js";
import {
    CARD_SOUND_KEYS,
    CHIP_SOUND_KEYS,
    playSoundEffect,
    preloadSoundEffects
} from "../SoundEffects.js";

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
        preloadSoundEffects(this, [...CARD_SOUND_KEYS, ...CHIP_SOUND_KEYS]);
    }

    create() {
        this.balance = Number(STAKE ?? 0);
        this.betPlaced = 0;
        this.roundWagerTotal = 0;
        this.roundActive = false;
        this.playerTurn = false;
        this.hideDealerHole = true;

        this.deck = [];
        this.playerHand = [];
        this.playerHands = [];
        this.handBets = [];
        this.handStates = [];
        this.activeHandIndex = 0;
        this.insuranceBet = 0;
        this.insurancePromptActive = false;
        this.dealerHand = [];

        this.cardSprites = [];
        this.dealerCardSprites = [];
        this.playerCardSprites = [];
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];
        this.dealerWagerChips = [];
        this.dealerWagerSignature = "";

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
        this.splitBtnRect = new Phaser.Geom.Rectangle(340, 570, 70, 18);
        this.doubleBtnRect = new Phaser.Geom.Rectangle(427, 570, 80, 18);
        this.dealBtnRect = new Phaser.Geom.Rectangle(537, 570, 59, 18);
        this.rulesBtnRect = new Phaser.Geom.Rectangle(625, 566, 74, 26);

        this.buttonGraphics = this.add.graphics().setDepth(9);
        const makeTableButton = (rect, label, fontSize = 18, textColor = "#000000") => (
            drawWin95Button(
                this,
                this.buttonGraphics,
                rect.x,
                rect.y,
                rect.width,
                rect.height,
                label,
                fontSize,
                { depth: 10, textColor }
            )
        );
        this.exitBtnText = makeTableButton(this.exitBtnRect, "Exit");
        this.hitBtnText = makeTableButton(this.hitBtnRect, "Hit", 18, "#7f7f7f");
        this.standBtnText = makeTableButton(this.standBtnRect, "Stand", 18, "#7f7f7f");
        this.splitBtnText = makeTableButton(this.splitBtnRect, "Split", 18, "#7f7f7f");
        this.doubleBtnText = makeTableButton(this.doubleBtnRect, "Double", 18, "#7f7f7f");
        this.dealBtnText = makeTableButton(this.dealBtnRect, "Deal");
        this.rulesBtnText = makeTableButton(this.rulesBtnRect, "Rules", 17);

        this.input.on("pointerdown", (pointer) => {
            const x = this.blackjackDisplay
                ? (pointer.x - this.blackjackDisplay.x) / this.blackjackDisplay.scaleX
                : pointer.x;
            const y = this.blackjackDisplay
                ? (pointer.y - this.blackjackDisplay.y) / this.blackjackDisplay.scaleY
                : pointer.y;

            if (this.rulesPopup?.isOpen) return;

            if (Phaser.Geom.Rectangle.Contains(this.rulesBtnRect, x, y)) {
                this.rulesPopup.open();
                return;
            }

            if (Phaser.Geom.Rectangle.Contains(this.exitBtnRect, x, y)) {
                if (!this.roundActive) this.scene.start("Hub");
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

            if (Phaser.Geom.Rectangle.Contains(this.splitBtnRect, x, y)) {
                if (this.canSplitCurrentHand()) this.onSplit();
                return;
            }

            if (Phaser.Geom.Rectangle.Contains(this.doubleBtnRect, x, y)) {
                if (this.canDoubleCurrentHand()) this.onDoubleDown();
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
        this.dealerChipLabel = this.add.text(
            this.betZoneRect.centerX,
            this.betZoneRect.y + 8,
            "DEALER",
            {
                fontFamily: "Arial",
                fontSize: "12px",
                fontStyle: "bold",
                color: "#ffffff"
            }
        ).setOrigin(0.5, 0).setDepth(9).setVisible(false);
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
        this.insuranceStatusText = this.add.text(160, 116, "", {
            fontFamily: "Arial",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#ffff00"
        }).setOrigin(0.5).setDepth(20);
        this.insuranceYesButton = this.makeActionButton(355, 250, "INSURE", () => {
            this.chooseInsurance(true);
        });
        this.insuranceNoButton = this.makeActionButton(465, 250, "NO", () => {
            this.chooseInsurance(false);
        });
        this.setInsuranceButtonsVisible(false);

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
        this.createRulesPopup();
        this.input.keyboard.on("keydown-ESC", () => this.rulesPopup?.close());
    }

    createRulesPopup() {
        this.rulesPopup = new RulesPopup(this, {
            title: "BLACKJACK RULES",
            leftText:
                "HOW TO PLAY\n" +
                "Drag chips into the betting square and press Deal. Try to finish closer to 21 than the dealer without going over.\n\n" +
                "CARD VALUES\n" +
                "Number cards use their face value. J, Q, and K count as 10. An ace counts as 11 unless counting it as 1 prevents a bust.\n\n" +
                "ACTIONS\n" +
                "Hit takes another card. Stand ends your turn. Double doubles that hand's wager, deals exactly one card, and then stands.\n\n" +
                "Split is available for equal-value starting cards when enough stake remains. Each split hand receives its own matching wager and is played separately. Up to four hands are allowed. Split aces receive one additional card each.\n\n" +
                "DEALER\n" +
                "The dealer reveals the hole card after play and must hit below 17 and stand on 17 or higher.",
            rightText:
                "PAYOUTS\n\n" +
                "Regular win: 1:1\n\n" +
                "Blackjack: 3:2\n" +
                "A blackjack is an ace plus a 10-value card in the initial two cards.\n\n" +
                "Push: wager returned\n\n" +
                "Insurance: 2:1\n" +
                "Offered when the dealer shows an ace, up to half the original wager.\n\n" +
                "Doubled and split hands pay their full individual wagers at 1:1. A split 21 is not a blackjack.\n\n" +
                "A hand over 21 busts and loses immediately.",
            leftFontSize: 12,
            rightFontSize: 12
        });
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

    makeActionButton(x, y, label, callback) {
        const width = 104;
        const height = 34;
        const graphics = this.add.graphics().setDepth(109);
        const button = drawWin95Button(
            this,
            graphics,
            x - width / 2,
            y - height / 2,
            width,
            height,
            label,
            14,
            { depth: 110 }
        );
        const hitZone = this.add.zone(x, y, width, height)
            .setDepth(111)
            .setInteractive({ useHandCursor: true });
        button.setData("buttonGraphics", graphics);
        button.setData("buttonHitZone", hitZone);
        hitZone.on("pointerdown", callback);
        return button;
    }

    setInsuranceButtonsVisible(visible) {
        [this.insuranceYesButton, this.insuranceNoButton].forEach((button) => {
            button?.setVisible(visible);
            button?.getData("buttonGraphics")?.setVisible(visible);
            button?.getData("buttonHitZone")?.setVisible(visible);
            if (visible) button?.getData("buttonHitZone")?.setInteractive({ useHandCursor: true });
            else button?.getData("buttonHitZone")?.disableInteractive();
        });
    }

    buildBankrollStacks() {
        const stake = Number(STAKE ?? 0);
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
                    if (!this.stackWagerChipIfOverlapping(chip)) {
                        playSoundEffect(this, "chipTable");
                    }
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
            if (!this.stackWagerChipIfOverlapping(chip)) {
                playSoundEffect(this, "chipTable");
            }
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

    stackWagerChipIfOverlapping(chip) {
        const overlappingChip = this.wageredChips
            .filter((candidate) => candidate !== chip && candidate.active)
            .map((candidate) => ({
                chip: candidate,
                distance: Phaser.Math.Distance.Between(
                    chip.x,
                    chip.y - chip.displayHeight / 2,
                    candidate.x,
                    candidate.y - candidate.displayHeight / 2
                )
            }))
            .filter(({ chip: candidate }) => {
                const horizontalDistance = Math.abs(chip.x - candidate.x);
                const verticalDistance = Math.abs(
                    (chip.y - chip.displayHeight / 2)
                    - (candidate.y - candidate.displayHeight / 2)
                );
                return horizontalDistance <= chip.displayWidth
                    && verticalDistance <= chip.displayHeight + 8;
            })
            .sort((a, b) => a.distance - b.distance)[0]?.chip;

        if (!overlappingChip) return false;

        const stack = [overlappingChip];
        for (let index = 0; index < stack.length; index++) {
            const stackChip = stack[index];
            this.wageredChips.forEach((candidate) => {
                if (
                    candidate !== chip
                    && candidate.active
                    && !stack.includes(candidate)
                    && Phaser.Geom.Intersects.RectangleToRectangle(
                        stackChip.getBounds(),
                        candidate.getBounds()
                    )
                ) {
                    stack.push(candidate);
                }
            });
        }

        chip.setPosition(
            overlappingChip.x,
            Math.min(...stack.map((stackChip) => stackChip.y)) - 7
        );
        playSoundEffect(this, "chipStack");
        return true;
    }

    returnWagerChipToStack(chip) {
        const wagerIndex = this.wageredChips.indexOf(chip);
        if (wagerIndex === -1 || this.roundActive) return;

        this.wageredChips.splice(wagerIndex, 1);
        this.betPlaced = Math.max(0, this.betPlaced - chip.getData("value"));
        chip.setPosition(chip.getData("originalX"), chip.getData("originalY"));
        playSoundEffect(this, "chipStack");

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

    syncDealerWagerChips() {
        const values = this.wageredChips
            .filter((chip) => chip.active)
            .map((chip) => chip.getData("value"))
            .sort((a, b) => b - a);
        const signature = values.join(",");

        if (signature === this.dealerWagerSignature) return;

        this.dealerWagerSignature = signature;
        this.dealerChipLabel.setVisible(values.length > 0);

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
        const desiredCounts = new Map();
        values.forEach((value) => {
            desiredCounts.set(value, (desiredCounts.get(value) ?? 0) + 1);
        });

        const retainedCounts = new Map();
        this.dealerWagerChips = this.dealerWagerChips.filter((chip) => {
            const value = chip.getData("value");
            const retained = retainedCounts.get(value) ?? 0;
            if (retained < (desiredCounts.get(value) ?? 0)) {
                retainedCounts.set(value, retained + 1);
                return true;
            }
            this.tweens.killTweensOf(chip);
            chip.destroy();
            return false;
        });

        for (const [value, desiredCount] of desiredCounts) {
            const retained = retainedCounts.get(value) ?? 0;
            for (let index = retained; index < desiredCount; index++) {
                const chip = this.add.sprite(
                    this.dealerScoreText.x + 70,
                    this.dealerScoreText.y + 90,
                    "chips",
                    chipFrames.get(value)
                ).setOrigin(0.5, 1).setDepth(8).setAlpha(0.85);
                chip.setData({ value, newlyPlaced: true });
                this.dealerWagerChips.push(chip);
            }
        }

        if (values.length === 0) return;

        const groupedValues = [...new Set(values)];
        const stackSpacing = Math.min(34, 190 / Math.max(1, groupedValues.length - 1));
        const firstStackX = this.betZoneRect.centerX
            - stackSpacing * (groupedValues.length - 1) / 2;
        const stackBottomY = this.betZoneRect.y + 76;

        groupedValues.forEach((value, stackIndex) => {
            const stack = this.dealerWagerChips.filter(
                (chip) => chip.getData("value") === value
            );
            stack.forEach((chip, chipIndex) => {
                const newlyPlaced = chip.getData("newlyPlaced") === true;
                chip.setData("newlyPlaced", false);
                this.tweens.killTweensOf(chip);
                this.tweens.add({
                    targets: chip,
                    x: firstStackX + stackIndex * stackSpacing,
                    y: stackBottomY - chipIndex * 7,
                    alpha: 1,
                    duration: newlyPlaced ? 480 : 220,
                    ease: newlyPlaced ? "Cubic.Out" : "Sine.Out",
                    onComplete: () => {
                        if (newlyPlaced) {
                            playSoundEffect(
                                this,
                                chipIndex > 0 ? "chipStack" : "chipTable"
                            );
                        }
                    }
                });
            });
        });
    }

    clearDealerWagerChips() {
        this.dealerWagerChips.forEach((chip) => {
            this.tweens.killTweensOf(chip);
            if (chip.active) chip.destroy();
        });
        this.dealerWagerChips = [];
        this.dealerWagerSignature = "";
        this.dealerChipLabel.setVisible(false);
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

        playSoundEffect(this, "cardShuffle");

        this.roundActive = true;
        this.playerTurn = false;
        this.hideDealerHole = true;
        this.insuranceBet = 0;
        this.insurancePromptActive = false;
        this.setInsuranceButtonsVisible(false);
        this.insuranceStatusText.setText("");
        this.wageredChips.forEach((chip) => chip.disableInteractive());

        this.balance -= this.betPlaced;

        this.deck = this.makeShuffledDeck();
        this.playerHand = [];
        this.playerHands = [];
        this.handBets = [];
        this.handStates = [];
        this.activeHandIndex = 0;
        this.dealerHand = [];

        this.dealCard(this.playerHand);
        this.dealCard(this.dealerHand);

        this.playerHands = [this.playerHand];
        this.handBets = [this.betPlaced];
        this.handStates = ["active"];
        this.dealCard(this.playerHand);
        this.dealCard(this.dealerHand);

        this.renderHands();
        this.updateTexts();

        const playerScore = this.evaluateHand(this.playerHand);
        const dealerScore = this.evaluateHand(this.dealerHand);

        this.animateInitialDeal(() => {
            if (this.dealerHand[0]?.rank === "A") {
                this.offerInsurance();
                return;
            }
            if (playerScore.isBlackjack || dealerScore.isBlackjack) {
                this.time.delayedCall(400, () => this.finishNaturals());
                return;
            }
            this.playerTurn = true;
            this.updateTexts();
        });
    }

    getMaximumInsuranceBet() {
        const halfBetInChips = Math.floor(this.betPlaced / 10) * 5;
        const available = Math.max(0, Number(STAKE ?? 0) - this.betPlaced);
        return Math.min(halfBetInChips, available);
    }

    offerInsurance() {
        const maximum = this.getMaximumInsuranceBet();
        if (maximum <= 0) {
            this.insurancePromptActive = true;
            this.chooseInsurance(false);
            return;
        }
        this.insurancePromptActive = true;
        this.playerTurn = false;
        this.insuranceYesButton.setText(`INSURE $${maximum}`);
        this.setInsuranceButtonsVisible(true);
        this.messageText
            .setPosition(410, 210)
            .setFontSize("24px")
            .setDepth(105)
            .setText("Insurance?");
        this.insuranceStatusText.setText(`UP TO $${maximum} • PAYS 2 TO 1`);
        this.updateTexts();
    }

    chooseInsurance(accepted) {
        if (!this.insurancePromptActive) return;
        this.insurancePromptActive = false;
        this.setInsuranceButtonsVisible(false);
        this.messageText.setText("");
        this.insuranceBet = accepted ? this.getMaximumInsuranceBet() : 0;

        const dealerBlackjack = this.evaluateHand(this.dealerHand).isBlackjack;
        if (this.insuranceBet > 0) {
            STAKE = Number(STAKE ?? 0) + (dealerBlackjack
                ? this.insuranceBet * 2
                : -this.insuranceBet);
            this.updateNavbarStake();
            this.insuranceStatusText.setText(dealerBlackjack
                ? `INSURANCE WINS $${this.insuranceBet * 2}`
                : `INSURANCE LOSES $${this.insuranceBet}`);
        } else {
            this.insuranceStatusText.setText("");
        }

        const playerBlackjack = this.evaluateHand(this.playerHand).isBlackjack;
        if (dealerBlackjack || playerBlackjack) {
            this.time.delayedCall(250, () => this.finishNaturals());
        } else {
            this.playerTurn = true;
            this.statusText.setText(this.insuranceBet > 0 ? "Insurance lost" : "");
            this.updateTexts();
        }
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
            onComplete: () => {
                playSoundEffect(this, "cardPlace");
                onComplete?.();
            }
        });
    }

    finishNaturals() {
        const playerScore = this.evaluateHand(this.playerHand);
        const dealerScore = this.evaluateHand(this.dealerHand);

        this.hideDealerHole = false;
        playSoundEffect(this, "cardFlip");
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

    canSplitCurrentHand() {
        if (!this.roundActive || !this.playerTurn || this.insurancePromptActive) return false;
        if (this.playerHands.length >= 4) return false;
        const hand = this.playerHands[this.activeHandIndex];
        if (!hand || hand.length !== 2) return false;
        if (this.cardValue(hand[0]) !== this.cardValue(hand[1])) return false;
        const nextTotalWager = this.handBets.reduce((total, bet) => total + bet, 0)
            + this.betPlaced;
        return Number(STAKE ?? 0) >= nextTotalWager;
    }

    canDoubleCurrentHand() {
        if (!this.roundActive || !this.playerTurn || this.insurancePromptActive) return false;
        const hand = this.playerHands[this.activeHandIndex];
        if (!hand || hand.length !== 2 || this.handStates[this.activeHandIndex] !== "active") {
            return false;
        }
        const currentBet = this.handBets[this.activeHandIndex] ?? this.betPlaced;
        const totalWager = this.handBets.reduce((total, bet) => total + bet, 0);
        return Number(STAKE ?? 0) >= totalWager + currentBet;
    }

    addSupplementalWagerChips(amount) {
        const sourceChips = this.wageredChips.filter(
            (chip) => chip.active && !chip.getData("supplementalWager")
        );
        let remaining = amount;
        const addedChips = [];

        sourceChips.forEach((source, index) => {
            const value = source.getData("value");
            if (remaining < value) return;
            remaining -= value;
            const chip = this.add.sprite(
                source.x + 9 + (index % 3) * 3,
                source.y - 7 - Math.floor(index / 3) * 7,
                "chips",
                source.frame.name
            ).setOrigin(0.5, 1).setDepth(12);
            chip.setData({
                value,
                stackIndex: source.getData("stackIndex"),
                chipIndex: source.getData("chipIndex"),
                originalX: source.getData("originalX"),
                originalY: source.getData("originalY"),
                betX: chip.x,
                betY: chip.y,
                supplementalWager: true
            });
            this.chipSprites.push(chip);
            this.wageredChips.push(chip);
            addedChips.push(chip);
        });

        if (remaining !== 0) {
            addedChips.forEach((chip) => {
                this.wageredChips.splice(this.wageredChips.indexOf(chip), 1);
                this.chipSprites.splice(this.chipSprites.indexOf(chip), 1);
                chip.destroy();
            });
            return false;
        }
        if (addedChips.length > 0) playSoundEffect(this, "chipStack");
        return true;
    }

    onDoubleDown() {
        if (!this.canDoubleCurrentHand()) return;
        this.playerTurn = false;
        const index = this.activeHandIndex;
        const additionalBet = this.handBets[index] ?? this.betPlaced;
        if (!this.addSupplementalWagerChips(additionalBet)) {
            this.playerTurn = true;
            return;
        }

        this.handBets[index] += additionalBet;
        const hand = this.playerHands[index];
        this.dealCard(hand);
        this.playerHand = hand;
        playSoundEffect(this, "cardPlace");
        this.renderHands();
        this.updateTexts();

        if (this.playerHands.length > 1) {
            this.handStates[index] = this.evaluateHand(hand).isBust ? "bust" : "stood";
            this.updateTexts();
            this.time.delayedCall(350, () => this.advanceToNextHand());
            return;
        }

        if (this.evaluateHand(hand).isBust) {
            this.hideDealerHole = false;
            playSoundEffect(this, "cardFlip");
            this.renderHands();
            this.endRound("Bust", "loss");
        } else {
            this.hideDealerHole = false;
            playSoundEffect(this, "cardFlip");
            this.renderHands();
            this.updateTexts();
            this.dealerPlayStep();
        }
    }

    onSplit() {
        if (!this.canSplitCurrentHand()) return;
        this.playerTurn = false;
        const index = this.activeHandIndex;
        const hand = this.playerHands[index];
        const splitAces = hand[0].rank === "A" && hand[1].rank === "A";
        const firstHand = [hand[0]];
        const secondHand = [hand[1]];
        if (!this.addSupplementalWagerChips(this.betPlaced)) {
            this.playerTurn = true;
            return;
        }
        this.dealCard(firstHand);
        this.dealCard(secondHand);
        playSoundEffect(this, "cardPlace");

        this.playerHands.splice(index, 1, firstHand, secondHand);
        this.handBets.splice(index, 1, this.betPlaced, this.betPlaced);
        this.handStates.splice(
            index,
            1,
            splitAces ? "stood" : "active",
            splitAces ? "stood" : "active"
        );
        this.playerHand = firstHand;
        this.renderHands();
        this.updateTexts();

        if (splitAces) {
            this.time.delayedCall(350, () => this.advanceToNextHand());
        } else {
            this.playerTurn = true;
            this.updateTexts();
        }
    }

    onSplitHit() {
        this.playerTurn = false;
        const hand = this.playerHands[this.activeHandIndex];
        this.dealCard(hand);
        this.playerHand = hand;
        this.renderHands();
        if (this.evaluateHand(hand).isBust) {
            this.handStates[this.activeHandIndex] = "bust";
            this.time.delayedCall(300, () => this.advanceToNextHand());
        } else {
            this.playerTurn = true;
        }
        this.updateTexts();
    }

    advanceToNextHand() {
        let nextIndex = this.activeHandIndex + 1;
        while (nextIndex < this.playerHands.length && this.handStates[nextIndex] !== "active") {
            nextIndex++;
        }
        if (nextIndex < this.playerHands.length) {
            this.activeHandIndex = nextIndex;
            this.playerHand = this.playerHands[nextIndex];
            this.playerTurn = true;
            this.renderHands();
            this.updateTexts();
            return;
        }
        this.finishPlayerHands();
    }

    finishPlayerHands() {
        this.playerTurn = false;
        this.hideDealerHole = false;
        playSoundEffect(this, "cardFlip");
        this.renderHands();
        this.updateTexts();
        if (this.handStates.every((state) => state === "bust")) {
            this.resolveWinner();
        } else {
            this.dealerPlayStep();
        }
    }

    onHit() {
        if (this.playerHands.length > 1) {
            this.onSplitHit();
            return;
        }
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
                playSoundEffect(this, "cardFlip");
                this.renderHands();
                this.endRound("Bust", "loss");
            } else {
                this.playerTurn = true;
            }

            this.updateTexts();
        });
    }

    onStand() {
        if (this.playerHands.length > 1) {
            this.playerTurn = false;
            this.handStates[this.activeHandIndex] = "stood";
            this.advanceToNextHand();
            return;
        }
        this.playerTurn = false;
        this.hideDealerHole = false;
        playSoundEffect(this, "cardFlip");
        this.renderHands();
        this.updateTexts();
        this.dealerPlayStep();
    }

    dealerPlayStep() {
        const dealerScore = this.evaluateHand(this.dealerHand);

        if (dealerScore.total < 17) {
            this.time.delayedCall(450, () => {
                this.dealCard(this.dealerHand);
                playSoundEffect(this, "cardPlace");
                this.renderHands();
                this.updateTexts();
                this.dealerPlayStep();
            });
            return;
        }

        this.resolveWinner();
    }

    resolveWinner() {
        if (this.playerHands.length > 1) {
            this.resolveSplitHands();
            return;
        }
        const playerScore = this.evaluateHand(this.playerHand);
        const dealerScore = this.evaluateHand(this.dealerHand);
        const wager = this.handBets[0] ?? this.betPlaced;

        if (dealerScore.isBust) {
            this.balance += wager * 2;
            this.endRound("Dealer Busts", "win", wager);
        } else if (playerScore.total > dealerScore.total) {
            this.balance += wager * 2;
            this.endRound("You Win", "win", wager);
        } else if (playerScore.total < dealerScore.total) {
            this.endRound("Dealer Wins", "loss");
        } else {
            this.balance += wager;
            this.endRound("Push", "push");
        }

        this.updateTexts();
    }

    endRound(msg, outcome, winnings = 0) {
        this.playerTurn = false;
        this.roundWagerTotal = this.handBets.length > 0
            ? this.handBets.reduce((total, bet) => total + bet, 0)
            : this.betPlaced;

        if (outcome === "win") {
            STAKE = Number(STAKE ?? 0) + winnings;
            this.balance = Number(STAKE);
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
        this.playerHands = [];
        this.handBets = [];
        this.handStates = [];
        this.activeHandIndex = 0;
        this.dealerScoreText.setText("");
        this.playerScoreText.setText("");
    }

    settleWager(outcome, winnings) {
        const wager = this.roundWagerTotal || this.betPlaced;
        const transfers = [];

        if (outcome === "loss") {
            STAKE = Math.max(0, Number(STAKE ?? 0) - wager);

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
        const hadInsurance = this.insuranceBet > 0;
        const hadSupplementalWager = this.wageredChips.some(
            (chip) => chip.getData("supplementalWager")
        );
        this.insuranceStatusText.setText("");
        this.insuranceBet = 0;
        this.clearDealerWagerChips();
        if (outcome === "win" && !hadInsurance && !hadSupplementalWager) {
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

            this.balance = Number(STAKE ?? 0);
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
        this.roundWagerTotal = 0;
        this.balance = Number(STAKE ?? 0);
        this.roundActive = false;
        this.playerTurn = false;

        this.buildBankrollStacks();
        this.updateNavbarStake();
        this.updateTexts();
    }

    resolveSplitHands() {
        const dealerScore = this.evaluateHand(this.dealerHand);
        let netWinnings = 0;
        const results = this.playerHands.map((hand, index) => {
            const score = this.evaluateHand(hand);
            const wager = this.handBets[index];
            if (score.isBust) {
                netWinnings -= wager;
                return `H${index + 1} BUST`;
            }
            if (dealerScore.isBust || score.total > dealerScore.total) {
                netWinnings += wager;
                return `H${index + 1} WINS`;
            }
            if (score.total < dealerScore.total) {
                netWinnings -= wager;
                return `H${index + 1} LOSES`;
            }
            return `H${index + 1} PUSHES`;
        });

        STAKE = Math.max(
            0,
            Number(STAKE ?? 0) + netWinnings
        );
        this.balance = Number(STAKE);
        this.updateNavbarStake();
        this.endSplitRound(results.join(" • "));
    }

    endSplitRound(message) {
        this.playerTurn = false;
        this.messageText
            .setPosition(this.W / 2, 330)
            .setFontSize("30px")
            .setFontStyle("bold")
            .setColor("#ff0000")
            .setStroke("#ffffff", 5)
            .setAlign("center")
            .setDepth(100)
            .setText(message);
        this.time.delayedCall(5000, () => {
            this.messageText.setText("");
            this.clearCardsTween(() => this.completeSplitSettlement());
        });
    }

    completeSplitSettlement() {
        this.insuranceStatusText.setText("");
        this.insuranceBet = 0;
        this.clearDealerWagerChips();
        this.chipSprites.forEach((chip) => {
            if (chip.active) chip.destroy();
        });
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];
        this.betPlaced = 0;
        this.roundWagerTotal = 0;
        this.roundActive = false;
        this.playerTurn = false;
        this.playerHands = [];
        this.handBets = [];
        this.handStates = [];
        this.activeHandIndex = 0;
        this.buildBankrollStacks();
        this.updateNavbarStake();
        this.updateTexts();
    }

    updateNavbarStake() {
        this.navbar.setStake(Number(STAKE ?? this.balance));
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

        const hands = this.playerHands.length > 0 ? this.playerHands : [this.playerHand];
        const handSpacing = hands.length > 1 ? Math.min(115, 290 / hands.length) : 0;
        hands.forEach((hand, handIndex) => {
            hand.forEach((card, cardIndex) => {
                const frame = this.getCardFrame(card);
                const spr = this.add.sprite(
                    playerX + handIndex * handSpacing + cardIndex * 18,
                    playerY + cardIndex * 2,
                    "blackjackCardsV2",
                    frame
                ).setOrigin(0, 0);
                this.cardLayer.add(spr);
                this.cardSprites.push(spr);
                this.playerCardSprites.push(spr);
            });
        });
    }

    updateTexts() {
        this.syncDealerWagerChips();
        const totalPlayerWager = this.handBets.length > 0
            ? this.handBets.reduce((total, bet) => total + bet, 0)
            : this.betPlaced;
        this.dealerWagerText.setText("$" + totalPlayerWager.toLocaleString("en-US"));
        this.playerWagerText.setText("$" + totalPlayerWager.toLocaleString("en-US"));

        this.betInfoText.setText(this.roundActive ? "" : ("Bet: $" + this.betPlaced));

        this.dealerScoreText.setText(
            this.hideDealerHole
                ? "Dealer: " + this.cardValue(this.dealerHand[0]) + "+"
                : "Dealer: " + this.getBestValue(this.dealerHand)
        );

        this.playerScoreText.setText(this.playerHands.length > 1
            ? this.playerHands.map((hand, index) => (
                `${index === this.activeHandIndex && this.playerTurn ? "▶" : ""}` +
                `H${index + 1}:${this.getBestValue(hand)}`
            )).join("  ")
            : "Player: " + this.getBestValue(this.playerHand));

        this.hitBtnText.setColor(this.roundActive && this.playerTurn ? "#000000" : "#7f7f7f");
        this.standBtnText.setColor(this.roundActive && this.playerTurn ? "#000000" : "#7f7f7f");
        this.splitBtnText.setColor(this.canSplitCurrentHand() ? "#000000" : "#7f7f7f");
        this.doubleBtnText.setColor(this.canDoubleCurrentHand() ? "#000000" : "#7f7f7f");
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

    drawMoneyBox(g, x, y, w, h) {
        g.fillStyle(0x101010, 1);
        g.fillRect(x, y, w, h);
        g.lineStyle(1, 0xffffff, 1);
        g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
}

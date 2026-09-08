import { getBestChipStackDistribution } from "../GameFunctions.js";
import { Navbar } from "../ui/Navbar.js";
import { drawBevelButton } from "../ui/Win95.js";

const TOTAL_PLAYERS = 4;
const POINT_NUMBERS = [4, 5, 6, 8, 9, 10];
const BET_TYPE_ORDER = [
    "pass", "dontPass", "come", "dontCome", "field", "big6", "big8",
    ...POINT_NUMBERS.map((number) => `place:${number}`),
    "hard:4", "hard:6", "hard:8", "hard:10",
    "prop:7", "anyCraps", "prop:2", "prop:3", "prop:11", "prop:12"
];
const BET_PAYOUTS = {
    "place:4": [9, 5], "place:5": [7, 5], "place:6": [7, 6],
    "place:8": [7, 6], "place:9": [7, 5], "place:10": [9, 5],
    "hard:4": [7, 1], "hard:6": [9, 1], "hard:8": [9, 1], "hard:10": [7, 1],
    "prop:7": [4, 1], anyCraps: [7, 1],
    "prop:2": [29, 1], "prop:3": [14, 1],
    "prop:11": [14, 1], "prop:12": [29, 1]
};

export class CrapsScene extends Phaser.Scene {
    constructor() {
        super("CRAPS");
    }

    preload() {
        this.load.image("crapsBackground", "assets/images/craps.png");
        this.load.spritesheet("crapsChips", "assets/images/chips.png", {
            frameWidth: 30,
            frameHeight: 27
        });
        this.load.spritesheet("dice", "assets/images/dice.png", {
            frameWidth: 75,
            frameHeight: 75
        });
        Navbar.preload(this);
    }

    create() {
        this.W = 800;
        this.H = 538;
        this.balance = Number(STAKE ?? 0);
        this.betPlaced = 0;
        this.selectedBetType = "pass";
        this.point = null;
        this.roundActive = false;
        this.rolling = false;
        this.roundSettling = false;
        this.cpuShootTimer = null;
        this.rulesOpen = false;
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];
        this.playerNames = ["YOU", "PLAYER 1", "PLAYER 2", "PLAYER 3"];
        this.shooterIndex = Number.isInteger(CRAPS_SHOOTER_INDEX)
            ? CRAPS_SHOOTER_INDEX % TOTAL_PLAYERS
            : 0;
        this.cpuPlayers = this.playerNames.slice(1).map((name) => ({
            name,
            balance: 1000,
            betAmount: 20,
            betType: "pass"
        }));
        this.cpuBetMarkers = [];

        // Fit the full table artwork below the shared navbar.
        this.background = this.add.image(0, 62, "crapsBackground")
            .setOrigin(0, 0)
            .setDisplaySize(this.W, this.H);

        this.betZoneRect = new Phaser.Geom.Rectangle(76, 434, 458, 49);
        this.dontPassZoneRect = new Phaser.Geom.Rectangle(270, 384, 265, 43);
        this.comeZoneRect = new Phaser.Geom.Rectangle(210, 226, 327, 87);
        this.dontComeZoneRect = new Phaser.Geom.Rectangle(142, 95, 66, 131);
        this.fieldZoneRect = new Phaser.Geom.Rectangle(205, 315, 332, 68);
        this.big6ZoneRect = new Phaser.Geom.Rectangle(76, 315, 96, 106);
        this.big8ZoneRect = new Phaser.Geom.Rectangle(173, 357, 95, 84);
        this.pointZoneRects = new Map();
        const pointBoundaries = [208, 274, 339, 404, 471, 537, 604];
        POINT_NUMBERS.forEach((number, index) => {
            this.pointZoneRects.set(number, new Phaser.Geom.Rectangle(
                pointBoundaries[index], 144,
                pointBoundaries[index + 1] - pointBoundaries[index], 82
            ));
        });
        this.oddsZoneRects = new Map();
        POINT_NUMBERS.forEach((number, index) => {
            this.oddsZoneRects.set(number, new Phaser.Geom.Rectangle(
                pointBoundaries[index], 95,
                pointBoundaries[index + 1] - pointBoundaries[index], 49
            ));
        });
        this.propositionZones = [
            { type: "prop:7", rect: new Phaser.Geom.Rectangle(586, 231, 164, 24) },
            { type: "hard:4", rect: new Phaser.Geom.Rectangle(549, 255, 119, 58) },
            { type: "hard:10", rect: new Phaser.Geom.Rectangle(668, 255, 120, 58) },
            { type: "hard:6", rect: new Phaser.Geom.Rectangle(549, 313, 119, 58) },
            { type: "hard:8", rect: new Phaser.Geom.Rectangle(668, 313, 120, 58) },
            { type: "prop:2", rect: new Phaser.Geom.Rectangle(549, 371, 78, 58) },
            { type: "prop:3", rect: new Phaser.Geom.Rectangle(627, 371, 81, 58) },
            { type: "prop:12", rect: new Phaser.Geom.Rectangle(708, 371, 80, 58) },
            { type: "prop:11", rect: new Phaser.Geom.Rectangle(549, 429, 239, 58) },
            { type: "anyCraps", rect: new Phaser.Geom.Rectangle(586, 487, 164, 31) }
        ];
        this.exitBtnRect = new Phaser.Geom.Rectangle(9, 558, 64, 38);
        this.placeBtnRect = new Phaser.Geom.Rectangle(99, 558, 68, 38);
        this.shootBtnRect = new Phaser.Geom.Rectangle(190, 558, 91, 38);
        this.denomBtnRect = new Phaser.Geom.Rectangle(289, 558, 57, 38);
        this.betTypeBtnRect = new Phaser.Geom.Rectangle(365, 558, 155, 38);
        this.rulesBtnRect = new Phaser.Geom.Rectangle(535, 558, 78, 38);

        const buttonGraphics = this.add.graphics().setDepth(20);
        [
            this.exitBtnRect,
            this.placeBtnRect,
            this.shootBtnRect,
            this.betTypeBtnRect,
            this.rulesBtnRect
        ].forEach((rect) => drawBevelButton(
            buttonGraphics,
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            false
        ));

        this.exitBtnText = this.makeButtonText(this.exitBtnRect, "Exit", 17);
        this.placeBtnText = this.makeButtonText(this.placeBtnRect, "Place", 17);
        this.shootBtnText = this.makeButtonText(this.shootBtnRect, "Shoot", 18);
        this.betTypeBtnText = this.makeButtonText(this.betTypeBtnRect, "PASS LINE", 15);
        this.rulesBtnText = this.makeButtonText(this.rulesBtnRect, "Rules", 17);
        this.denomText = this.add.text(
            this.denomBtnRect.centerX,
            this.denomBtnRect.centerY,
            "$5",
            {
                fontFamily: "Arial",
                fontSize: "19px",
                fontStyle: "bold",
                color: "#000000",
                backgroundColor: "#35df55",
                padding: { x: 8, y: 5 }
            }
        ).setOrigin(0.5).setDepth(21);

        this.betText = this.add.text(this.betZoneRect.centerX + 30, 315, "", {
            fontFamily: "Arial",
            fontSize: "23px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(25);

        this.pointText = this.add.text(400, 82, "COME-OUT ROLL", {
            fontFamily: "Arial",
            fontSize: "25px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(25);

        this.rollText = this.add.text(400, 115, "PLACE A PASS LINE BET", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#ffff00",
            stroke: "#000000",
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(25);

        this.messageText = this.add.text(400, 300, "", {
            fontFamily: "Arial",
            fontSize: "42px",
            fontStyle: "bold",
            color: "#ff0000",
            stroke: "#ffffff",
            strokeThickness: 6,
            align: "center"
        }).setOrigin(0.5).setDepth(100);

        this.add.rectangle(702, 125, 200, 116, 0x003d00, 0.82)
            .setStrokeStyle(2, 0xffffff, 0.8)
            .setDepth(22);
        this.playerTexts = this.playerNames.map((name, index) => this.add.text(
            613,
            80 + index * 27,
            name,
            {
                fontFamily: "Arial",
                fontSize: "13px",
                fontStyle: "bold",
                color: "#ffffff"
            }
        ).setDepth(23));

        this.dieOne = this.createDie(650, 155);
        this.dieTwo = this.createDie(710, 125);
        this.buildBankrollStacks();
        this.selectFirstAvailableDenomination();
        this.setupCpuBets();
        this.createRulesPopup();

        this.input.on("pointerdown", (pointer) => {
            if (this.rulesOpen) return;
            if (Phaser.Geom.Rectangle.Contains(this.exitBtnRect, pointer.x, pointer.y)) {
                if (!this.roundActive && !this.rolling && !this.roundSettling) {
                    this.scene.start("Hub");
                } else {
                    this.rollText.setText("FINISH THE CURRENT CONTRACT BEFORE EXITING");
                }
            } else if (Phaser.Geom.Rectangle.Contains(this.placeBtnRect, pointer.x, pointer.y)) {
                this.placeSelectedChip();
            } else if (Phaser.Geom.Rectangle.Contains(this.shootBtnRect, pointer.x, pointer.y)) {
                this.shootDice();
            } else if (Phaser.Geom.Rectangle.Contains(this.denomBtnRect, pointer.x, pointer.y)) {
                this.cycleDenomination();
            } else if (Phaser.Geom.Rectangle.Contains(this.betTypeBtnRect, pointer.x, pointer.y)) {
                this.cycleBetType();
            } else if (Phaser.Geom.Rectangle.Contains(this.rulesBtnRect, pointer.x, pointer.y)) {
                this.openRulesPopup();
            }
        });
        this.input.keyboard.on("keydown-SPACE", () => this.shootDice());
        this.input.keyboard.on("keydown-ESC", () => {
            if (this.rulesOpen) this.closeRulesPopup();
        });

        this.navbar = new Navbar(this);
        this.updateTexts();
    }

    makeButtonText(rect, label, fontSize) {
        return this.add.text(rect.centerX, rect.centerY, label, {
            fontFamily: "Arial",
            fontSize: `${fontSize}px`,
            fontStyle: "bold",
            color: "#000000"
        }).setOrigin(0.5).setDepth(21);
    }

    createRulesPopup() {
        const popup = this.add.container(0, 0).setDepth(2000).setVisible(false);
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.72)
            .setInteractive();
        const panel = this.add.graphics();
        panel.fillStyle(0x006f00, 1).fillRect(82, 72, 636, 474);
        panel.lineStyle(3, 0xffffff, 1).strokeRect(82, 72, 636, 474);
        panel.lineStyle(2, 0xd8d088, 1).strokeRect(88, 78, 624, 462);

        const title = this.add.text(400, 94, "CRAPS RULES", {
            fontFamily: "Arial",
            fontSize: "28px",
            fontStyle: "bold",
            color: "#ffff00"
        }).setOrigin(0.5);

        const instructions = this.add.text(112, 130,
            "HOW TO PLAY\n" +
            "Choose a bet with the Bet button and press Place, or drag a chip directly onto a marked table area. Multiple bet types may be active together. You shoot on your turn; computer players shoot on theirs.\n\n" +
            "COME-OUT ROLL\n" +
            "PASS: 7 or 11 wins. 2, 3, or 12 loses.\n" +
            "DON'T PASS: 2 or 3 wins. 7 or 11 loses. 12 pushes.\n\n" +
            "POINT ROUND\n" +
            "4, 5, 6, 8, 9, or 10 establishes the point. Pass wins if it repeats; Don't Pass wins on 7. Come and Don't Come create their own points.\n\n" +
            "OTHER BETS\n" +
            "Field and red proposition bets last one roll. Place and Big 6/8 win when their number rolls and lose on 7. Hardways require matching dice and lose on an easy total or 7. Drop chips in the upper number boxes for up to double odds.",
            {
                fontFamily: "Arial",
                fontSize: "13px",
                color: "#ffffff",
                lineSpacing: 3,
                wordWrap: { width: 365 }
            }
        );

        const payouts = this.add.text(505, 130,
            "PAYOUTS\n\n" +
            "Pass / Come: 1:1\n" +
            "Don't bets: 1:1\n" +
            "Big 6 / Big 8: 1:1\n" +
            "Field: 1:1\n" +
            "  2 pays 2:1; 12 pays 3:1\n\n" +
            "PLACE\n" +
            "4/10: 9:5\n5/9: 7:5\n6/8: 7:6\n\n" +
            "ODDS\n" +
            "4/10: 2:1\n5/9: 3:2\n6/8: 6:5\n\n" +
            "HARDWAYS\n" +
            "4/10: 7:1\n6/8: 9:1\n\n" +
            "Any 7: 4:1\nAny Craps: 7:1\n" +
            "2/12: 29:1\n3/11: 14:1",
            {
                fontFamily: "Arial",
                fontSize: "12px",
                fontStyle: "bold",
                color: "#ffffff",
                lineSpacing: 2,
                wordWrap: { width: 180 }
            }
        );

        const closeButton = this.add.text(400, 514, "Close", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#000000",
            backgroundColor: "#c0c0c0",
            padding: { x: 24, y: 7 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeButton.on("pointerdown", (pointer, localX, localY, event) => {
            event.stopPropagation();
            this.closeRulesPopup();
        });

        popup.add([overlay, panel, title, instructions, payouts, closeButton]);
        this.rulesPopup = popup;
    }

    openRulesPopup() {
        this.rulesOpen = true;
        this.rulesPopup.setVisible(true);
        this.time.paused = true;
        this.tweens.pauseAll();
    }

    closeRulesPopup() {
        this.rulesOpen = false;
        this.rulesPopup.setVisible(false);
        this.time.paused = false;
        this.tweens.resumeAll();
    }

    buildBankrollStacks(stakeOverride = null) {
        this.chipFrames = new Map([
            [5, 0], [10, 1], [20, 2], [50, 3],
            [100, 4], [500, 5], [1000, 6], [5000, 7]
        ]);
        const stake = Number(stakeOverride ?? STAKE ?? 0);
        if (!Number.isSafeInteger(stake) || stake <= 0) return;

        let distribution;
        try {
            distribution = getBestChipStackDistribution(stake, {
                denominations: [...this.chipFrames.keys()].sort((a, b) => b - a),
                maxStackHeight: 5,
                preferredVariety: 4
            });
        } catch {
            return;
        }

        const firstStackX = 670;
        const stackBottomY = 582;
        const stackSpacing = 35;
        const chipOverlap = 7;

        distribution.stacks.forEach((stack, stackIndex) => {
            const stackChips = [];
            for (let chipIndex = 0; chipIndex < stack.count; chipIndex++) {
                const chip = this.add.sprite(
                    firstStackX + stackIndex * stackSpacing,
                    stackBottomY - chipIndex * chipOverlap,
                    "crapsChips",
                    this.chipFrames.get(stack.denomination)
                ).setOrigin(0.5, 1).setDepth(30);

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
        if (!chip || !this.canAddWager()) return;

        chip.setInteractive({ useHandCursor: true });
        this.input.setDraggable(chip);
        chip.on("pointerdown", () => this.selectDenomination(chip.getData("value")));
        if (chip.getData("dragConfigured")) return;
        chip.setData("dragConfigured", true);

        chip.on("dragstart", () => {
            this.children.bringToTop(chip);
        });
        chip.on("drag", (pointer, dragX, dragY) => chip.setPosition(dragX, dragY));
        chip.on("dragend", () => {
            const droppedBetType = this.getBetTypeAt(
                chip.x,
                chip.y - chip.displayHeight / 2
            );

            if (this.wageredChips.includes(chip)) {
                const returnZone = new Phaser.Geom.Rectangle(625, 510, 175, 90);

                if (
                    !this.roundSettling &&
                    this.canRemoveWager(chip) &&
                    Phaser.Geom.Rectangle.Contains(returnZone, chip.x, chip.y)
                ) {
                    this.returnWagerChipToStack(chip);
                } else {
                    chip.setPosition(
                        chip.getData("betX"),
                        chip.getData("betY")
                    );
                }
                return;
            }

            if (!droppedBetType || !this.canAddWager()) {
                chip.setPosition(chip.getData("originalX"), chip.getData("originalY"));
                return;
            }
            if (!this.isBetTypeAvailable(droppedBetType, chip.getData("value"))) {
                chip.setPosition(chip.getData("originalX"), chip.getData("originalY"));
                return;
            }
            this.selectedBetType = droppedBetType;
            this.commitWagerChip(chip);
        });
    }

    getBetTypeAt(x, y) {
        for (const zone of this.propositionZones) {
            if (Phaser.Geom.Rectangle.Contains(zone.rect, x, y)) return zone.type;
        }
        for (const number of POINT_NUMBERS) {
            if (Phaser.Geom.Rectangle.Contains(this.oddsZoneRects.get(number), x, y)) {
                return this.getOddsBetType(number) ?? `place:${number}`;
            }
            if (Phaser.Geom.Rectangle.Contains(this.pointZoneRects.get(number), x, y)) {
                return `place:${number}`;
            }
        }
        if (Phaser.Geom.Rectangle.Contains(this.comeZoneRect, x, y)) return "come";
        if (Phaser.Geom.Rectangle.Contains(this.dontComeZoneRect, x, y)) return "dontCome";
        if (Phaser.Geom.Rectangle.Contains(this.fieldZoneRect, x, y)) return "field";
        if (Phaser.Geom.Rectangle.Contains(this.big6ZoneRect, x, y)) return "big6";
        if (Phaser.Geom.Rectangle.Contains(this.big8ZoneRect, x, y)) return "big8";
        if (Phaser.Geom.Rectangle.Contains(this.betZoneRect, x, y)) return "pass";
        if (Phaser.Geom.Rectangle.Contains(this.dontPassZoneRect, x, y)) return "dontPass";
        return null;
    }

    getOddsBetType(number) {
        const passAmount = this.getWagerAmount("pass");
        const passOdds = this.getWagerAmount(`odds:pass:${number}`);
        if (this.point === number && passAmount > 0 && passOdds < passAmount * 2) {
            return `odds:pass:${number}`;
        }
        const comeAmount = this.wageredChips
            .filter((chip) => chip.getData("betType") === "come"
                && chip.getData("contractPoint") === number)
            .reduce((total, chip) => total + chip.getData("value"), 0);
        const comeOdds = this.getWagerAmount(`odds:come:${number}`);
        if (comeAmount > 0 && comeOdds < comeAmount * 2) {
            return `odds:come:${number}`;
        }
        return null;
    }

    getWagerAmount(type) {
        return this.wageredChips
            .filter((chip) => chip.getData("betType") === type)
            .reduce((total, chip) => total + chip.getData("value"), 0);
    }

    getSelectedBetZone() {
        const type = this.selectedBetType;
        if (type === "dontPass") return this.dontPassZoneRect;
        if (type === "come") return this.comeZoneRect;
        if (type === "dontCome") return this.dontComeZoneRect;
        if (type === "field") return this.fieldZoneRect;
        if (type === "big6") return this.big6ZoneRect;
        if (type === "big8") return this.big8ZoneRect;
        if (type.startsWith("place:")) {
            return this.pointZoneRects.get(Number(type.split(":")[1]));
        }
        const proposition = this.propositionZones.find((zone) => zone.type === type);
        return proposition?.rect ?? this.betZoneRect;
    }

    canAddWager() {
        return !this.rulesOpen
            && !this.rolling
            && !this.roundSettling;
    }

    canRemoveWager(chip) {
        const type = chip.getData("betType");
        if ((type === "pass" || type === "dontPass") && this.point !== null) return false;
        if ((type === "come" || type === "dontCome") && chip.getData("contractPoint")) {
            return false;
        }
        return !this.rolling && !this.roundSettling;
    }

    isBetTypeAvailable(type, value = 0) {
        if ((type === "come" || type === "dontCome") && this.point === null) {
            this.rollText.setText("COME BETS REQUIRE A TABLE POINT");
            return false;
        }
        if (type.startsWith("odds:")) {
            const [, contract, pointText] = type.split(":");
            const number = Number(pointText);
            const baseAmount = contract === "pass"
                ? this.getWagerAmount("pass")
                : this.wageredChips
                    .filter((chip) => chip.getData("betType") === "come"
                        && chip.getData("contractPoint") === number)
                    .reduce((total, chip) => total + chip.getData("value"), 0);
            if (this.getWagerAmount(type) + value > baseAmount * 2) {
                this.rollText.setText("DOUBLE ODDS LIMIT EXCEEDED");
                return false;
            }
        }
        return true;
    }

    commitWagerChip(chip) {
        if (!chip || this.wageredChips.includes(chip)) return;
        if (!this.isBetTypeAvailable(this.selectedBetType, chip.getData("value"))) {
            chip.setPosition(chip.getData("originalX"), chip.getData("originalY"));
            return;
        }

        const contractPoint = (this.selectedBetType === "pass"
            || this.selectedBetType === "dontPass")
            ? this.point
            : null;
        const layoutKey = contractPoint
            ? `${this.selectedBetType}:${contractPoint}`
            : this.selectedBetType;
        chip.disableInteractive();
        const joinsStack = this.wageredChips.some(
            (wager) => this.getWagerLayoutKey(wager) === layoutKey
        );
        chip.setData({ betType: this.selectedBetType, contractPoint });
        this.betPlaced += chip.getData("value");
        this.wageredChips.push(chip);
        this.layoutWageredChips();
        this.sound.play(joinsStack ? "CHIPSTACK" : "CHIPTABLE");

        const stack = this.bankrollChipStacks[chip.getData("stackIndex")];
        const nextTopChip = [...stack].reverse().find(
            (stackChip) => stackChip.active && !this.wageredChips.includes(stackChip)
        );
        this.makeBankrollChipDraggable(nextTopChip);
        chip.setInteractive({ useHandCursor: true });
        this.input.setDraggable(chip);
        this.updateTexts();
        this.scheduleCpuShoot();
    }

    returnWagerChipToStack(chip) {
        const wagerIndex = this.wageredChips.indexOf(chip);
        if (wagerIndex === -1) return;

        this.wageredChips.splice(wagerIndex, 1);
        this.betPlaced = Math.max(0, this.betPlaced - chip.getData("value"));
        this.rebuildChipBank();
        this.updateTexts();
    }

    rebuildChipBank() {
        const wagers = this.wageredChips.map((chip) => ({
            value: chip.getData("value"),
            betType: chip.getData("betType"),
            contractPoint: chip.getData("contractPoint")
        }));
        this.chipSprites.forEach((chip) => {
            this.tweens.killTweensOf(chip);
            if (chip.active) chip.destroy();
        });
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];

        const wagerTotal = wagers.reduce((total, wager) => total + wager.value, 0);
        this.buildBankrollStacks(Math.max(0, Number(STAKE ?? 0) - wagerTotal));
        wagers.forEach((wager) => {
            const chip = this.add.sprite(400, 300, "crapsChips", this.chipFrames.get(wager.value))
                .setOrigin(0.5, 1).setDepth(30);
            chip.setData({
                ...wager,
                stackIndex: -1,
                chipIndex: 0,
                originalX: 710,
                originalY: 580
            });
            this.chipSprites.push(chip);
            this.wageredChips.push(chip);
            this.makeBankrollChipDraggable(chip);
        });
        this.betPlaced = wagerTotal;
        this.layoutWageredChips();
        this.selectFirstAvailableDenomination();
    }

    layoutWageredChips() {
        const groups = new Map();
        this.wageredChips.forEach((chip) => {
            const key = this.getWagerLayoutKey(chip);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(chip);
        });
        groups.forEach((chips) => chips.forEach((chip, index) => {
            const zone = this.getWagerZone(chip);
            const betX = zone.centerX - Math.min(18, (chips.length - 1) * 5)
                + (index % 5) * 9;
            const betY = zone.centerY + 10 - Math.floor(index / 5) * 6;
            chip.setData({ betX, betY });
            chip.setPosition(betX, betY);
        }));
    }

    getWagerLayoutKey(chip) {
        const type = chip.getData("betType");
        const contractPoint = chip.getData("contractPoint");
        return contractPoint ? `${type}:${contractPoint}` : type;
    }

    getWagerZone(chip) {
        const type = chip.getData("betType");
        const contractPoint = chip.getData("contractPoint");
        if ((type === "come" || type === "dontCome") && contractPoint) {
            const base = type === "dontCome"
                ? this.oddsZoneRects.get(contractPoint)
                : this.pointZoneRects.get(contractPoint);
            return base;
        }
        if (type.startsWith("odds:")) {
            return this.oddsZoneRects.get(Number(type.split(":")[2]));
        }
        const oldSelection = this.selectedBetType;
        this.selectedBetType = type;
        const zone = this.getSelectedBetZone();
        this.selectedBetType = oldSelection;
        return zone;
    }

    placeSelectedChip() {
        if (!this.canAddWager()) return;
        const chip = this.findTopAvailableChip(this.selectedDenomination);
        if (!chip) {
            this.rollText.setText("NO CHIP OF THAT VALUE AVAILABLE");
            return;
        }

        chip.disableInteractive();
        this.tweens.add({
            targets: chip,
            x: this.getSelectedBetZone().centerX,
            y: this.getSelectedBetZone().centerY + 8,
            duration: 350,
            ease: "Cubic.Out",
            onComplete: () => this.commitWagerChip(chip)
        });
    }

    findTopAvailableChip(value) {
        const stack = this.bankrollChipStacks.find(
            (candidate) => candidate?.[0]?.getData("value") === value
        );
        if (!stack) return null;
        return [...stack].reverse().find(
            (chip) => chip.active && !this.wageredChips.includes(chip)
        ) ?? null;
    }

    availableDenominations() {
        return this.bankrollChipStacks
            .filter((stack) => stack.some(
                (chip) => chip.active && !this.wageredChips.includes(chip)
            ))
            .map((stack) => stack[0].getData("value"))
            .sort((a, b) => a - b);
    }

    selectFirstAvailableDenomination() {
        const values = this.availableDenominations();
        this.selectDenomination(values[0] ?? 5);
    }

    selectDenomination(value) {
        this.selectedDenomination = value;
        this.denomText?.setText(`$${value}`);
    }

    cycleDenomination() {
        if (!this.canAddWager()) return;
        const values = this.availableDenominations();
        if (values.length === 0) return;
        const index = values.indexOf(this.selectedDenomination);
        this.selectDenomination(values[(index + 1) % values.length]);
    }

    cycleBetType() {
        if (!this.canAddWager()) return;
        const index = BET_TYPE_ORDER.indexOf(this.selectedBetType);
        this.selectedBetType = BET_TYPE_ORDER[(index + 1) % BET_TYPE_ORDER.length];
        this.updateTexts();
    }

    setupCpuBets() {
        this.cpuBetMarkers.forEach((marker) => marker.destroy());
        this.cpuBetMarkers = [];
        this.cpuPlayers.forEach((player) => {
            player.betAmount = Math.min(20, player.balance);
            player.betType = Phaser.Math.Between(1, 100) <= 70 ? "pass" : "dontPass";
        });
        this.cpuPlayers.forEach((player, index) => {
            if (player.betAmount <= 0) return;
            const zone = player.betType === "pass" ? this.betZoneRect : this.dontPassZoneRect;
            const chip = this.add.sprite(
                zone.right - 25 - index * 27,
                zone.centerY + 7,
                "crapsChips",
                this.chipFrames.get(20)
            ).setOrigin(0.5, 1).setDepth(28);
            const label = this.add.text(chip.x, chip.y - 14, `${index + 1}`, {
                fontFamily: "Arial",
                fontSize: "11px",
                fontStyle: "bold",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2
            }).setOrigin(0.5).setDepth(29);
            this.cpuBetMarkers.push(chip, label);
        });
        this.updatePlayerTexts();
    }

    updatePlayerTexts() {
        this.playerTexts?.forEach((text, index) => {
            const isShooter = index === this.shooterIndex;
            if (index === 0) {
                const betName = "TOTAL";
                text.setText(`${isShooter ? "► " : ""}YOU • ${betName} $${this.betPlaced}`);
            } else {
                const player = this.cpuPlayers[index - 1];
                const betName = player.betType === "pass" ? "PASS" : "DON'T";
                text.setText(
                    `${isShooter ? "► " : ""}${player.name} $${player.balance} • ` +
                    `${betName} $${player.betAmount}`
                );
            }
            text.setColor(isShooter ? "#ffff00" : "#ffffff");
        });
    }

    shootDice() {
        if (this.rulesOpen) return;
        if (this.shooterIndex !== 0) return;
        this.performShootDice();
    }

    scheduleCpuShoot(delay = 1200) {
        this.cpuShootTimer?.remove(false);
        this.cpuShootTimer = null;
        if (
            this.shooterIndex === 0
            || this.rolling
            || this.roundSettling
            || this.betPlaced <= 0
        ) {
            return;
        }

        this.cpuShootTimer = this.time.delayedCall(delay, () => {
            this.cpuShootTimer = null;
            this.performShootDice();
        });
        this.rollText.setText(`${this.playerNames[this.shooterIndex]} IS READY TO SHOOT`);
    }

    performShootDice() {
        if (this.rolling || this.roundSettling || this.betPlaced <= 0) return;

        this.cpuShootTimer?.remove(false);
        this.cpuShootTimer = null;
        this.rolling = true;
        this.roundActive = true;
        this.disableBankrollChips();
        this.updateTexts();
        const shakeType = Phaser.Math.Between(0, 7);
        this.rollText.setText(`${this.playerNames[this.shooterIndex]} SHOOTING...`);
        this.sound.play("DIESHAKE" + shakeType);

        this.animateDice((dieOne, dieTwo) => this.resolveRoll(dieOne, dieTwo));
    }

    animateDice(onComplete) {
        const results = [];
        let stoppedDice = 0;
        const stopped = (dieIndex, value) => {
            results[dieIndex] = value;
            stoppedDice++;
            if (stoppedDice < 2) return;
            this.sound.play("DIEONDIE", { volume: 0.75 });
            onComplete(results[0], results[1]);
        };

        this.rollDieSprite(this.dieOne, 0, stopped);
        this.rollDieSprite(this.dieTwo, 1, stopped);
    }

    rollDieSprite(die, dieIndex, onComplete) {
        const leftBankX = 92;
        const startX = 840 + dieIndex * 70;
        const startY = dieIndex === 0 ? 225 : 365;
        const bankY = Phaser.Math.Between(235, 385);
        const stopX = leftBankX + Phaser.Math.Between(190, 500);
        const stopY = Phaser.Math.Clamp(
            bankY + Phaser.Math.Between(-70, 70),
            205,
            420
        );
        const finalFrame = Phaser.Math.Between(8, 13);
        const spinDirection = dieIndex === 0 ? -1 : 1;

        die.setPosition(startX, startY)
            .setAngle(0)
            .setFrame(Phaser.Math.Between(0, 7))
            .setVisible(true);

        const frameTimer = this.time.addEvent({
            delay: Phaser.Math.Between(55, 85),
            loop: true,
            callback: () => die.setFrame(Phaser.Math.Between(0, 7))
        });

        this.tweens.add({
            targets: die,
            x: leftBankX,
            y: bankY,
            angle: spinDirection * Phaser.Math.Between(450, 720),
            duration: Phaser.Math.Between(600, 780),
            ease: "Cubic.In",
            onComplete: () => {
                this.sound.play("DIEWALLBOUNCE");
                this.sound.play("DIESLIDE", { volume: 0.55 });
                this.tweens.add({
                    targets: die,
                    x: stopX,
                    y: stopY,
                    angle: die.angle + spinDirection * Phaser.Math.Between(360, 630),
                    duration: Phaser.Math.Between(650, 950),
                    ease: "Cubic.Out",
                    onComplete: () => {
                        frameTimer.remove(false);
                        die.setAngle(0).setFrame(finalFrame);
                        this.sound.play("DIEFLOOR");
                        onComplete(dieIndex, finalFrame - 7);
                    }
                });
            }
        });
    }

    resolveRoll(dieOne, dieTwo) {
        const total = dieOne + dieTwo;
        this.rolling = false;
        this.resolveAllBets(dieOne, dieTwo, total);
        return;

        if (this.point === null) {
            if (total === 7 || total === 11) {
                this.endRound(`${total} — PASS LINE WINS!`, {
                    pass: "win",
                    dontPass: "loss"
                });
                return;
            }
            if (total === 2 || total === 3) {
                this.endRound(`${total} — CRAPS! DON'T PASS WINS`, {
                    pass: "loss",
                    dontPass: "win"
                });
                return;
            }
            if (total === 12) {
                this.endRound("12 — CRAPS! DON'T PASS PUSHES", {
                    pass: "loss",
                    dontPass: "push"
                });
                return;
            }
            this.point = total;
            this.pointText.setText(`POINT: ${this.point}`);
            this.rollText.setText(`POINT IS ${this.point} — SHOOT AGAIN`);
        } else if (total === this.point) {
            this.endRound(`${total} — POINT MADE!`, {
                pass: "win",
                dontPass: "loss"
            });
            return;
        } else if (total === 7) {
            this.endRound("SEVEN OUT! DON'T PASS WINS", {
                pass: "loss",
                dontPass: "win"
            }, true);
            return;
        } else {
            this.rollText.setText(`ROLLED ${total} — POINT IS ${this.point}`);
        }

        this.enableAvailableBankrollChips();
        this.updateTexts();
        this.scheduleCpuShoot(900);
    }

    resolveAllBets(dieOne, dieTwo, total) {
        const oldPoint = this.point;
        const results = this.wageredChips.map((chip) => ({
            chip,
            ...this.evaluateWager(chip, dieOne, dieTwo, total)
        }));
        let winnings = 0;
        let losses = 0;

        results.forEach((result) => {
            const value = result.chip.getData("value");
            if (result.action === "loss") losses += value;
            if (result.action === "win" || result.action === "keepWin") {
                winnings += this.roundPayout(value, result.ratio ?? [1, 1]);
            }
        });
        STAKE = Math.max(0, Number(STAKE ?? 0) + winnings - losses);
        this.balance = Number(STAKE);

        const tableOutcome = this.updateTablePoint(oldPoint, total);
        const resolvedChips = new Set(
            results
                .filter((result) => ["win", "loss", "push"].includes(result.action))
                .map((result) => result.chip)
        );
        this.wageredChips = this.wageredChips.filter((chip) => !resolvedChips.has(chip));
        this.betPlaced = this.wageredChips.reduce(
            (sum, chip) => sum + chip.getData("value"),
            0
        );
        this.layoutWageredChips();

        const resultParts = [`ROLLED ${total}`];
        if (tableOutcome) resultParts.push(tableOutcome);
        if (winnings > 0) resultParts.push(`WIN $${winnings}`);
        if (losses > 0) resultParts.push(`LOSE $${losses}`);
        if (results.some((result) => result.action === "push")) resultParts.push("PUSH");

        this.roundSettling = true;
        this.disableBankrollChips();
        resolvedChips.forEach((chip) => {
            this.tweens.add({ targets: chip, alpha: 0, duration: 500 });
        });
        this.messageText.setFontSize("28px").setText(resultParts.join("\n"));
        this.updateTexts();

        this.time.delayedCall(1400, () => {
            this.messageText.setText("");
            this.roundSettling = false;
            this.roundActive = this.point !== null;
            this.rebuildChipBank();
            this.navbar.setStake(this.balance);
            this.pointText.setText(this.point === null ? "COME-OUT ROLL" : `POINT: ${this.point}`);
            this.updateTexts();
            this.scheduleCpuShoot(900);
        });
    }

    evaluateWager(chip, dieOne, dieTwo, total) {
        const type = chip.getData("betType");
        const contractPoint = chip.getData("contractPoint");
        const pointRolled = POINT_NUMBERS.includes(total);

        if (type === "pass" || type === "dontPass") {
            const isDont = type === "dontPass";
            if (contractPoint) {
                if (total === contractPoint) return { action: isDont ? "loss" : "win" };
                if (total === 7) return { action: isDont ? "win" : "loss" };
                return { action: "keep" };
            }
            if (total === 7 || total === 11) return { action: isDont ? "loss" : "win" };
            if (total === 2 || total === 3) return { action: isDont ? "win" : "loss" };
            if (total === 12) return { action: isDont ? "push" : "loss" };
            if (pointRolled) chip.setData("contractPoint", total);
            return { action: "keep" };
        }

        if (type === "come" || type === "dontCome") {
            const isDont = type === "dontCome";
            if (contractPoint) {
                if (total === contractPoint) return { action: isDont ? "loss" : "win" };
                if (total === 7) return { action: isDont ? "win" : "loss" };
                return { action: "keep" };
            }
            if (total === 7 || total === 11) return { action: isDont ? "loss" : "win" };
            if (total === 2 || total === 3) return { action: isDont ? "win" : "loss" };
            if (total === 12) return { action: isDont ? "push" : "loss" };
            if (pointRolled) chip.setData("contractPoint", total);
            return { action: "move" };
        }

        if (type.startsWith("odds:")) {
            const number = Number(type.split(":")[2]);
            if (total === number) return { action: "win", ratio: this.getOddsRatio(number) };
            if (total === 7) return { action: "loss" };
            return { action: "keep" };
        }
        if (type.startsWith("place:")) {
            const number = Number(type.split(":")[1]);
            if (total === number) return { action: "keepWin", ratio: BET_PAYOUTS[type] };
            if (total === 7) return { action: "loss" };
            return { action: "keep" };
        }
        if (type === "big6" || type === "big8") {
            const number = type === "big6" ? 6 : 8;
            if (total === number) return { action: "keepWin", ratio: [1, 1] };
            if (total === 7) return { action: "loss" };
            return { action: "keep" };
        }
        if (type === "field") {
            if (total === 2) return { action: "win", ratio: [2, 1] };
            if (total === 12) return { action: "win", ratio: [3, 1] };
            return { action: [3, 4, 9, 10, 11].includes(total) ? "win" : "loss" };
        }
        if (type.startsWith("hard:")) {
            const number = Number(type.split(":")[1]);
            if (total === number && dieOne === dieTwo) {
                return { action: "keepWin", ratio: BET_PAYOUTS[type] };
            }
            if (total === 7 || total === number) return { action: "loss" };
            return { action: "keep" };
        }
        if (type === "prop:7") {
            return { action: total === 7 ? "win" : "loss", ratio: BET_PAYOUTS[type] };
        }
        if (type === "anyCraps") {
            return {
                action: [2, 3, 12].includes(total) ? "win" : "loss",
                ratio: BET_PAYOUTS[type]
            };
        }
        if (type.startsWith("prop:")) {
            const number = Number(type.split(":")[1]);
            return { action: total === number ? "win" : "loss", ratio: BET_PAYOUTS[type] };
        }
        return { action: "keep" };
    }

    updateTablePoint(oldPoint, total) {
        if (oldPoint === null && POINT_NUMBERS.includes(total)) {
            this.point = total;
            return `POINT ${total} ESTABLISHED`;
        }
        if (oldPoint !== null && total === oldPoint) {
            this.point = null;
            this.settleCpuBets({ pass: "win", dontPass: "loss" });
            return "POINT MADE";
        }
        if (oldPoint !== null && total === 7) {
            this.point = null;
            this.settleCpuBets({ pass: "loss", dontPass: "win" });
            this.shooterIndex = (this.shooterIndex + 1) % TOTAL_PLAYERS;
            CRAPS_SHOOTER_INDEX = this.shooterIndex;
            return "SEVEN OUT";
        }
        if (oldPoint === null && (total === 7 || total === 11)) {
            this.settleCpuBets({ pass: "win", dontPass: "loss" });
            return "NATURAL";
        }
        if (oldPoint === null && [2, 3, 12].includes(total)) {
            this.settleCpuBets({
                pass: "loss",
                dontPass: total === 12 ? "push" : "win"
            });
            return "CRAPS";
        }
        return "";
    }

    getOddsRatio(number) {
        if (number === 4 || number === 10) return [2, 1];
        if (number === 5 || number === 9) return [3, 2];
        return [6, 5];
    }

    roundPayout(value, ratio) {
        return Math.floor((value * ratio[0] / ratio[1]) / 5) * 5;
    }

    endRound(message, outcomes, rotateShooter = false) {
        this.roundSettling = true;
        this.rolling = false;
        this.cpuShootTimer?.remove(false);
        this.cpuShootTimer = null;
        const outcome = outcomes[this.selectedBetType];
        if (outcome === "win") {
            STAKE = Number(STAKE ?? 0) + this.betPlaced;
            this.balance = Number(STAKE);
            this.navbar.setStake(this.balance);
        }
        this.settleCpuBets(outcomes);
        if (rotateShooter) {
            this.shooterIndex = (this.shooterIndex + 1) % TOTAL_PLAYERS;
            CRAPS_SHOOTER_INDEX = this.shooterIndex;
        }

        this.messageText.setText(message);
        this.updateTexts();
        this.time.delayedCall(5000, () => {
            this.messageText.setText("");
            this.settleWager(outcome);
        });
    }

    settleCpuBets(outcomes) {
        this.cpuPlayers.forEach((player) => {
            const outcome = outcomes[player.betType];
            if (outcome === "win") player.balance += player.betAmount;
            else if (outcome === "loss") player.balance = Math.max(0, player.balance - player.betAmount);
        });
        this.setupCpuBets();
    }

    settleWager(outcome) {
        const transfers = [];
        if (outcome === "loss") {
            STAKE = Math.max(
                0,
                Number(STAKE ?? 0) - this.betPlaced
            );
            this.wageredChips.forEach((chip, index) => {
                transfers.push({ chip, x: 400 + index * 4, y: 105, alpha: 0 });
            });
        } else {
            this.wageredChips.forEach((chip) => {
                transfers.push({
                    chip,
                    x: chip.getData("originalX"),
                    y: chip.getData("originalY"),
                    alpha: 1
                });
                if (outcome !== "win") return;
                const payout = this.add.sprite(
                    chip.x,
                    chip.y,
                    "crapsChips",
                    this.chipFrames.get(chip.getData("value"))
                ).setOrigin(0.5, 1).setDepth(31);
                this.chipSprites.push(payout);
                transfers.push({
                    chip: payout,
                    x: chip.getData("originalX"),
                    y: chip.getData("originalY") - 7,
                    alpha: 1
                });
            });
        }
        this.runChipTransfers(transfers, () => this.resetRound());
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
                duration: 700,
                delay: index * 60,
                ease: "Cubic.InOut",
                onComplete: () => {
                    remaining--;
                    if (remaining === 0) onComplete();
                }
            });
        });
    }

    resetRound() {
        this.cpuShootTimer?.remove(false);
        this.cpuShootTimer = null;
        this.chipSprites.forEach((chip) => chip.active && chip.destroy());
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];
        this.betPlaced = 0;
        this.point = null;
        this.roundActive = false;
        this.roundSettling = false;
        this.balance = Number(STAKE ?? 0);
        this.dieOne.setVisible(false);
        this.dieTwo.setVisible(false);
        this.buildBankrollStacks();
        this.selectFirstAvailableDenomination();
        this.setupCpuBets();
        this.navbar.setStake(this.balance);
        this.pointText.setText("COME-OUT ROLL");
        this.rollText.setText("PLACE A LINE BET");
        this.updateTexts();
    }

    disableBankrollChips() {
        this.bankrollChipStacks.forEach((stack) => {
            stack.forEach((chip) => chip.disableInteractive());
        });
    }

    enableAvailableBankrollChips() {
        if (!this.canAddWager()) return;
        this.bankrollChipStacks.forEach((stack) => {
            const topChip = [...stack].reverse().find(
                (chip) => chip.active && !this.wageredChips.includes(chip)
            );
            this.makeBankrollChipDraggable(topChip);
        });
    }

    updateTexts() {
        const betName = this.formatBetType(this.selectedBetType);
        this.betText.setText(`TOTAL BETS: $${this.betPlaced.toLocaleString("en-US")}`);
        this.betTypeBtnText.setText(betName);
        const canShoot = this.shooterIndex === 0
            && this.betPlaced > 0
            && !this.rolling
            && !this.roundSettling;
        this.shootBtnText.setColor(canShoot ? "#000000" : "#7f7f7f");
        const canPlace = this.canAddWager();
        this.placeBtnText.setColor(canPlace ? "#000000" : "#7f7f7f");
        this.betTypeBtnText.setColor(
            canPlace ? "#000000" : "#7f7f7f"
        );
        this.updatePlayerTexts();

        if (this.betPlaced === 0 && !this.roundActive && !this.roundSettling) {
            const playerHasHave = this.playerNames[this.shooterIndex] == "YOU" ? "HAVE" : "HAS";
            this.rollText.setText(
                `${this.playerNames[this.shooterIndex] + ' ' + playerHasHave} THE DICE - PLACE A BET`
            );
        }
    }

    formatBetType(type) {
        const labels = {
            pass: "PASS LINE",
            dontPass: "DON'T PASS",
            come: "COME",
            dontCome: "DON'T COME",
            field: "FIELD",
            big6: "BIG 6",
            big8: "BIG 8",
            anyCraps: "ANY CRAPS",
            "prop:7": "ANY 7"
        };
        if (labels[type]) return labels[type];
        if (type.startsWith("place:")) return `PLACE ${type.split(":")[1]}`;
        if (type.startsWith("hard:")) return `HARD ${type.split(":")[1]}`;
        if (type.startsWith("prop:")) return `ROLL ${type.split(":")[1]}`;
        if (type.startsWith("odds:")) return `ODDS ${type.split(":")[2]}`;
        return type.toUpperCase();
    }

    createDie(x, y) {
        return this.add.sprite(x, y, "dice", 8)
            .setDepth(40)
            .setVisible(false);
    }

    playSound(key) {
        if (this.cache.audio.exists(key)) this.sound.play(key);
    }
}

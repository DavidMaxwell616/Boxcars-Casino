import { getBestChipStackDistribution } from "../GameFunctions.js";
import { Navbar } from "../ui/Navbar.js";

const POKER_GAMES = [
    "Five-Card Draw",
    "Five-Card Stud",
    "Seven-Card Stud",
    "Hold 'Em",
    "Dealer's Choice"
];

const FIXED_GAMES = POKER_GAMES.slice(0, 4);

const GAME_RULES = {
    "Five-Card Draw": "5 private cards • draw poker • best 5-card hand",
    "Five-Card Stud": "1 hole + 4 up • best 5-card hand",
    "Seven-Card Stud": "2 hole + 4 up + 1 hole • best 5 of 7",
    "Hold 'Em": "2 private + 5 community • best 5 of 7"
};

export class PokerScene extends Phaser.Scene {
    constructor() {
        super("POKER");
    }

    preload() {
        this.load.image("pokerBackground", "assets/images/poker.png");
        this.load.image("pokerSettings", "assets/images/Poker Settings.png");
        this.load.spritesheet("pokerCards", "assets/images/cards.png", {
            frameWidth: 69,
            frameHeight: 94
        });
        this.load.spritesheet("pokerChips", "assets/images/chips.png", {
            frameWidth: 30,
            frameHeight: 27
        });
        this.load.audio("pokerOpen", "assets/sounds/POKEROPE.WAV");
        Navbar.preload(this);
    }

    create() {
        const saved = globalThis.POKER_SETTINGS ?? {};
        this.selectedGame = POKER_GAMES.includes(saved.game)
            ? saved.game
            : "Five-Card Draw";
        this.wildCards = Boolean(saved.wildCards);
        this.roundActive = false;
        this.littleBlind = 5;
        this.bigBlind = 10;
        this.betPlaced = 0;
        this.cardSprites = [];
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];
        this.potZone = new Phaser.Geom.Circle(400, 331, 58);
        this.hasStarted = false;

        this.createGameInterface();
        this.createSettingsInterface();
        this.navbar = new Navbar(this);
        this.showSettings();
    }

    createSettingsInterface() {
        this.settingsLayer = this.add.container(0, 0).setDepth(100);
        const shade = this.add.rectangle(400, 331, 800, 538, 0x202020, 0.72);
        const imageWidth = 317;
        const imageHeight = 538;
        const imageLeft = (800 - imageWidth) / 2;
        const imageTop = 62;
        const scaleX = imageWidth / 646;
        const scaleY = imageHeight / 1098;
        const image = this.add.image(400, imageTop, "pokerSettings")
            .setOrigin(0.5, 0)
            .setDisplaySize(imageWidth, imageHeight);

        this.settingsLayer.add([shade, image]);
        this.settingMarks = [];

        const sourceRows = [207, 257, 307, 357, 406];
        POKER_GAMES.forEach((game, index) => {
            const centerY = imageTop + sourceRows[index] * scaleY;
            const hit = this.add.rectangle(
                imageLeft + 305 * scaleX,
                centerY,
                535 * scaleX,
                43 * scaleY,
                0xffffff,
                0.001
            ).setInteractive({ useHandCursor: true });
            const mark = this.add.text(
                imageLeft + 66 * scaleX,
                centerY,
                "",
                {
                    fontFamily: "Arial",
                    fontSize: "19px",
                    fontStyle: "bold",
                    color: "#008a00"
                }
            ).setOrigin(0.5);
            hit.on("pointerdown", () => {
                this.selectedGame = game;
                this.refreshSettingsMarks();
            });
            this.settingMarks.push(mark);
            this.settingsLayer.add([hit, mark]);
        });

        const wildY = imageTop + 505 * scaleY;
        const wildHit = this.add.rectangle(
            imageLeft + 305 * scaleX,
            wildY,
            535 * scaleX,
            48 * scaleY,
            0xffffff,
            0.001
        ).setInteractive({ useHandCursor: true });
        this.wildMark = this.add.text(
            imageLeft + 66 * scaleX,
            wildY,
            "",
            {
                fontFamily: "Arial",
                fontSize: "19px",
                fontStyle: "bold",
                color: "#008a00"
            }
        ).setOrigin(0.5);
        wildHit.on("pointerdown", () => {
            this.wildCards = !this.wildCards;
            this.refreshSettingsMarks();
        });

        const ok = this.makeDialogButton(
            imageLeft + 154 * scaleX,
            imageTop + 1018 * scaleY,
            "OK"
        );
        const cancel = this.makeDialogButton(
            imageLeft + 508 * scaleX,
            imageTop + 1018 * scaleY,
            "Cancel"
        );
        ok.on("pointerdown", () => this.acceptSettings());
        cancel.on("pointerdown", () => {
            if (this.hasStarted) {
                this.settingsLayer.setVisible(false);
                this.gameLayer.setVisible(true);
            } else {
                this.scene.start("Hub");
            }
        });

        this.settingsLayer.add([wildHit, this.wildMark, ok, cancel]);
        this.refreshSettingsMarks();
    }

    makeDialogButton(x, y, label) {
        return this.add.text(x, y, label, {
            fontFamily: "Arial",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#000000",
            padding: { x: 18, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    }

    refreshSettingsMarks() {
        this.settingMarks?.forEach((mark, index) => {
            mark.setText(POKER_GAMES[index] === this.selectedGame ? "X" : "");
        });
        this.wildMark?.setText(this.wildCards ? "X" : "");
    }

    showSettings() {
        this.gameLayer.setVisible(false);
        this.settingsLayer.setVisible(true);
        this.refreshSettingsMarks();
    }

    acceptSettings() {
        globalThis.POKER_SETTINGS = {
            game: this.selectedGame,
            wildCards: this.wildCards
        };
        this.hasStarted = true;
        this.settingsLayer.setVisible(false);
        this.gameLayer.setVisible(true);
        this.updateRuleText();
        this.updateGameButtons();
    }

    createGameInterface() {
        this.gameLayer = this.add.container(0, 0);
        const background = this.add.image(0, 62, "pokerBackground")
            .setOrigin(0, 0)
            .setDisplaySize(800, 538);
        const sidePanel = this.add.graphics();
        sidePanel.fillStyle(0xd7d7d7, 0.94)
            .fillRoundedRect(610, 78, 176, 218, 8)
            .lineStyle(2, 0x777777, 1)
            .strokeRoundedRect(610, 78, 176, 218, 8);

        this.titleText = this.add.text(8, 58, "", {
            fontFamily: "Arial",
            fontSize: "24px",
            fontStyle: "bold",
            color: "#000080",
            stroke: "#ffffff",
            strokeThickness: 3
        });
        this.ruleText = this.add.text(200, 68, "", {
            fontFamily: "Arial",
            fontSize: "15px",
            color: "#202020",
            backgroundColor: "#ffffffcc",
            padding: { x: 5, y: 3 }
        });
        this.potText = this.add.text(400, 300, "BET: $0", {
            fontFamily: "Arial",
            fontSize: "22px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#555555",
            strokeThickness: 5
        }).setOrigin(0.5);
        this.resultText = this.add.text(400, 405, "Drag chips to the pot", {
            fontFamily: "Arial",
            fontSize: "20px",
            fontStyle: "bold",
            color: "#000080",
            backgroundColor: "#ffffffdd",
            padding: { x: 8, y: 5 },
            align: "center"
        }).setOrigin(0.5).setDepth(50);

        this.dealButton = this.makeGameButton(698, 116, "DEAL", () => this.dealHand());
        this.settingsButton = this.makeGameButton(698, 178, "SETTINGS", () => {
            if (!this.roundActive) this.showSettings();
        });
        this.exitButton = this.makeGameButton(698, 240, "EXIT", () => {
            if (!this.roundActive) this.scene.start("Hub");
        });
        this.blindText = this.add.text(698, 275, "", {
            fontFamily: "Arial",
            fontSize: "12px",
            fontStyle: "bold",
            color: "#000080",
            align: "center"
        }).setOrigin(0.5);

        this.gameLayer.add([
            background,
            sidePanel,
            this.titleText,
            this.ruleText,
            this.potText,
            this.resultText,
            this.dealButton,
            this.settingsButton,
            this.exitButton,
            this.blindText
        ]);
        this.buildChipStacks();
        this.updateRuleText();
    }

    makeGameButton(x, y, label, callback) {
        const button = this.add.text(x, y, label, {
            fontFamily: "Arial",
            fontSize: "17px",
            fontStyle: "bold",
            color: "#000000",
            backgroundColor: "#c0c0c0",
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        button.on("pointerdown", callback);
        return button;
    }

    updateRuleText(activeGame = this.selectedGame) {
        const title = this.selectedGame === "Dealer's Choice" && activeGame !== this.selectedGame
            ? `Dealer's Choice: ${activeGame}`
            : activeGame;
        this.titleText.setText(title);
        this.ruleText.setText(
            `${GAME_RULES[activeGame] ?? "Dealer selects a game each hand"}` +
            (this.wildCards ? " • DEUCES WILD" : "")
        );
        this.blindText.setText(activeGame === "Hold 'Em"
            ? `LITTLE BLIND: $${this.littleBlind}\nBIG BLIND: $${this.bigBlind}`
            : "");
        if (!this.roundActive) this.updateWagerDisplay();
    }

    buildChipStacks() {
        this.chipSprites.forEach((chip) => chip.destroy());
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];
        this.betPlaced = 0;
        const stake = Number(globalThis.STAKE ?? 0);
        if (!Number.isSafeInteger(stake) || stake <= 0) {
            this.updateWagerDisplay();
            return;
        }

        const frames = new Map([
            [5, 0], [10, 1], [20, 2], [50, 3],
            [100, 4], [500, 5], [1000, 6], [5000, 7]
        ]);
        let distribution;
        try {
            distribution = getBestChipStackDistribution(stake, {
                denominations: [...frames.keys()].sort((a, b) => b - a),
                maxStackHeight: 5,
                preferredVariety: 4
            });
        } catch {
            return;
        }

        distribution.stacks.forEach((stack, stackIndex) => {
            const stackChips = [];
            for (let chipIndex = 0; chipIndex < stack.count; chipIndex++) {
                const chip = this.add.sprite(
                    650 + stackIndex * 38,
                    578 - chipIndex * 7,
                    "pokerChips",
                    frames.get(stack.denomination)
                ).setOrigin(0.5, 1).setDepth(30);
                chip.setData({
                    value: stack.denomination,
                    stackIndex,
                    originalX: chip.x,
                    originalY: chip.y
                });
                this.chipSprites.push(chip);
                stackChips.push(chip);
                this.gameLayer.add(chip);
            }
            this.bankrollChipStacks[stackIndex] = stackChips;
            this.makeChipDraggable(stackChips.at(-1));
        });
        this.updateWagerDisplay();
    }

    makeChipDraggable(chip) {
        if (!chip || this.roundActive) return;
        chip.setInteractive({ useHandCursor: true });
        this.input.setDraggable(chip);
        if (chip.getData("dragConfigured")) return;
        chip.setData("dragConfigured", true);

        chip.on("dragstart", () => this.gameLayer.bringToTop(chip));
        chip.on("drag", (pointer, dragX, dragY) => chip.setPosition(dragX, dragY));
        chip.on("dragend", () => {
            if (this.wageredChips.includes(chip)) {
                const bankrollZone = new Phaser.Geom.Rectangle(610, 430, 190, 170);
                if (!this.roundActive && Phaser.Geom.Rectangle.Contains(
                    bankrollZone,
                    chip.x,
                    chip.y
                )) {
                    this.returnWagerChip(chip);
                } else {
                    chip.setPosition(chip.getData("betX"), chip.getData("betY"));
                }
                return;
            }

            const chipCenterY = chip.y - chip.displayHeight / 2;
            if (
                this.roundActive ||
                !Phaser.Geom.Circle.Contains(this.potZone, chip.x, chipCenterY)
            ) {
                chip.setPosition(chip.getData("originalX"), chip.getData("originalY"));
                return;
            }
            this.commitWagerChip(chip);
        });
    }

    commitWagerChip(chip) {
        if (this.wageredChips.includes(chip)) return;
        this.wageredChips.push(chip);
        this.betPlaced += chip.getData("value");
        this.layoutWageredChips();

        const stack = this.bankrollChipStacks[chip.getData("stackIndex")];
        const nextChip = [...stack].reverse().find(
            (candidate) => candidate.active && !this.wageredChips.includes(candidate)
        );
        this.makeChipDraggable(nextChip);
        this.updateWagerDisplay();
        this.updateGameButtons();
    }

    returnWagerChip(chip) {
        const index = this.wageredChips.indexOf(chip);
        if (index === -1) return;
        this.wageredChips.splice(index, 1);
        this.betPlaced = Math.max(0, this.betPlaced - chip.getData("value"));
        chip.setPosition(chip.getData("originalX"), chip.getData("originalY"));

        const stack = this.bankrollChipStacks[chip.getData("stackIndex")];
        stack.forEach((candidate) => {
            if (!this.wageredChips.includes(candidate)) candidate.disableInteractive();
        });
        const topChip = [...stack].reverse().find(
            (candidate) => candidate.active && !this.wageredChips.includes(candidate)
        );
        this.makeChipDraggable(topChip);
        this.layoutWageredChips();
        this.updateWagerDisplay();
        this.updateGameButtons();
    }

    layoutWageredChips() {
        this.wageredChips.forEach((chip, index) => {
            const betX = this.potZone.x - 18 + (index % 5) * 9;
            const betY = this.potZone.y + 20 - Math.floor(index / 5) * 6;
            chip.setData({ betX, betY });
            chip.setPosition(betX, betY);
        });
    }

    updateWagerDisplay() {
        if (!this.potText || this.roundActive) return;
        const holdem = this.selectedGame === "Hold 'Em";
        this.potText.setText(holdem
            ? `BET: $${this.betPlaced}  •  SB $${this.littleBlind} / BB $${this.bigBlind}`
            : `BET: $${this.betPlaced}`);
        this.dealButton?.setText(this.betPlaced > 0 ? `DEAL $${this.betPlaced}` : "DEAL");
    }

    dealHand() {
        if (this.roundActive) return;

        const activeGame = this.selectedGame === "Dealer's Choice"
            ? Phaser.Utils.Array.GetRandom(FIXED_GAMES)
            : this.selectedGame;
        const stake = Number(globalThis.STAKE ?? 0);
        const minimumBet = activeGame === "Hold 'Em" ? this.bigBlind : 5;
        if (this.betPlaced < minimumBet) {
            this.updateRuleText(activeGame);
            this.resultText.setText(activeGame === "Hold 'Em"
                ? `Post/call the $${this.bigBlind} big blind to deal`
                : `Drag at least $${minimumBet} in chips to the pot`);
            return;
        }
        if (stake < this.betPlaced) {
            this.resultText.setText("Not enough stake for that wager");
            return;
        }

        this.currentWager = this.betPlaced;
        this.currentPot = this.currentWager * 2;
        this.roundActive = true;
        this.clearCards();
        globalThis.STAKE = stake - this.currentWager;
        this.navbar.setStake(globalThis.STAKE);
        this.buildChipStacks();
        this.updateGameButtons();
        this.potText.setText(`POT: $${this.currentPot}`);
        this.resultText.setText(activeGame === "Hold 'Em"
            ? `LITTLE BLIND $${this.littleBlind} • BIG BLIND $${this.bigBlind}\nDEALING...`
            : "DEALING...");
        if (this.cache.audio.exists("pokerOpen")) this.sound.play("pokerOpen");

        this.activeGame = activeGame;
        this.updateRuleText(activeGame);

        const deck = this.makeDeck();
        const playerCount = activeGame === "Seven-Card Stud" ? 7
            : activeGame === "Hold 'Em" ? 2
                : 5;
        const opponentCount = playerCount;
        const communityCount = activeGame === "Hold 'Em" ? 5 : 0;
        this.playerHand = this.takeCards(deck, playerCount);
        this.opponentHand = this.takeCards(deck, opponentCount);
        this.communityCards = this.takeCards(deck, communityCount);

        const opponentVisibility = activeGame === "Five-Card Stud"
            ? [false, true, true, true, true]
            : activeGame === "Seven-Card Stud"
                ? [false, false, true, true, true, true, false]
                : false;

        let delay = 0;
        delay = this.renderCards(this.opponentHand, 90, 145, opponentVisibility, delay);
        delay = this.renderCards(this.communityCards, 170, 265, true, delay);
        delay = this.renderCards(this.playerHand, 90, 495, true, delay);
        this.time.delayedCall(delay + 450, () => this.showdown());
    }

    renderCards(cards, startX, y, visibility, initialDelay) {
        const spacing = cards.length >= 7 ? 55 : 70;
        cards.forEach((card, index) => {
            const targetX = startX + index * spacing;
            const faceUp = Array.isArray(visibility) ? visibility[index] : visibility;
            const sprite = this.add.sprite(
                550,
                120,
                "pokerCards",
                faceUp ? this.getCardFrame(card) : 52
            ).setScale(0.72).setAlpha(0).setDepth(20);
            sprite.setData({ card, faceUp });
            this.cardSprites.push(sprite);
            this.gameLayer.add(sprite);
            this.tweens.add({
                targets: sprite,
                x: targetX,
                y,
                alpha: 1,
                duration: 260,
                delay: initialDelay + index * 90,
                ease: "Cubic.Out"
            });
        });
        return initialDelay + cards.length * 90;
    }

    showdown() {
        this.cardSprites.forEach((sprite) => {
            if (!sprite.getData("faceUp")) {
                sprite.setFrame(this.getCardFrame(sprite.getData("card")));
            }
        });

        const playerCards = this.activeGame === "Hold 'Em"
            ? [...this.playerHand, ...this.communityCards]
            : this.playerHand;
        const opponentCards = this.activeGame === "Hold 'Em"
            ? [...this.opponentHand, ...this.communityCards]
            : this.opponentHand;
        const playerScore = this.bestPokerHand(playerCards);
        const opponentScore = this.bestPokerHand(opponentCards);
        const comparison = this.compareScores(playerScore.score, opponentScore.score);

        if (comparison > 0) {
            globalThis.STAKE = Number(globalThis.STAKE ?? 0) + this.currentPot;
            this.resultText.setText(`YOU WIN — ${playerScore.name}\nDealer: ${opponentScore.name}`);
        } else if (comparison === 0) {
            globalThis.STAKE = Number(globalThis.STAKE ?? 0) + this.currentWager;
            this.resultText.setText(`PUSH — ${playerScore.name}`);
        } else {
            this.resultText.setText(`DEALER WINS — ${opponentScore.name}\nYou: ${playerScore.name}`);
        }

        this.roundActive = false;
        this.navbar.setStake(globalThis.STAKE);
        this.buildChipStacks();
        this.updateGameButtons();
    }

    updateGameButtons() {
        const minimumBet = this.selectedGame === "Hold 'Em" ? this.bigBlind : 5;
        const canDeal = !this.roundActive
            && this.betPlaced >= minimumBet
            && Number(globalThis.STAKE ?? 0) >= this.betPlaced;
        this.setButtonEnabled(this.dealButton, canDeal);
        this.setButtonEnabled(this.settingsButton, !this.roundActive);
        this.setButtonEnabled(this.exitButton, !this.roundActive);
    }

    setButtonEnabled(button, enabled) {
        button.setColor(enabled ? "#000000" : "#777777");
        if (enabled) button.setInteractive({ useHandCursor: true });
        else button.disableInteractive();
    }

    clearCards() {
        this.cardSprites.forEach((card) => card.destroy());
        this.cardSprites = [];
    }

    makeDeck() {
        const suits = ["D", "H", "C", "S"];
        const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
        const deck = suits.flatMap((suit) => ranks.map((rank) => ({ rank, suit })));
        return Phaser.Utils.Array.Shuffle(deck);
    }

    takeCards(deck, count) {
        return Array.from({ length: count }, () => deck.pop());
    }

    getCardFrame(card) {
        const suitOffset = { D: 0, H: 1, C: 2, S: 3 };
        const rankIndex = {
            "2": 0, "3": 1, "4": 2, "5": 3, "6": 4, "7": 5,
            "8": 6, "9": 7, "10": 8, J: 9, Q: 10, K: 11, A: 12
        };
        return rankIndex[card.rank] * 4 + suitOffset[card.suit];
    }

    bestPokerHand(cards) {
        const hands = this.combinations(cards, 5);
        let best = null;
        hands.forEach((hand) => {
            const score = this.evaluateFive(hand);
            if (!best || this.compareScores(score, best.score) > 0) best = { hand, score };
        });
        const names = [
            "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight",
            "Flush", "Full House", "Four of a Kind", "Straight Flush", "Five of a Kind"
        ];
        return { ...best, name: names[best.score[0]] };
    }

    evaluateFive(cards) {
        const wilds = this.wildCards ? cards.filter((card) => card.rank === "2").length : 0;
        const naturalCards = wilds > 0 ? cards.filter((card) => card.rank !== "2") : cards;
        const rankValues = naturalCards.map((card) => this.rankValue(card.rank));
        const counts = new Map();
        rankValues.forEach((rank) => counts.set(rank, (counts.get(rank) ?? 0) + 1));
        const distinctRanks = [...counts.keys()].sort((a, b) => b - a);
        const flush = naturalCards.length === 0 || naturalCards.every(
            (card) => card.suit === naturalCards[0].suit
        );
        const straightHigh = this.findStraightHigh(distinctRanks, wilds);

        const highestCount = Math.max(0, ...counts.values());
        if (wilds > 0 && highestCount + wilds >= 5) {
            return [9, distinctRanks[0] ?? 14];
        }
        if (flush && straightHigh) return [8, straightHigh];

        const fourRank = distinctRanks.find((rank) => counts.get(rank) + wilds >= 4);
        if (fourRank) {
            const usedWilds = Math.max(0, 4 - counts.get(fourRank));
            const kicker = distinctRanks.find((rank) => rank !== fourRank)
                ?? (wilds > usedWilds ? 14 : 0);
            return [7, fourRank, kicker];
        }

        for (let triple = 14; triple >= 3; triple--) {
            for (let pair = 14; pair >= 3; pair--) {
                if (triple === pair) continue;
                const needed = Math.max(0, 3 - (counts.get(triple) ?? 0))
                    + Math.max(0, 2 - (counts.get(pair) ?? 0));
                if (needed <= wilds) return [6, triple, pair];
            }
        }

        if (flush) {
            const flushRanks = [...distinctRanks];
            for (let rank = 14; flushRanks.length < 5 && rank >= 3; rank--) {
                if (!flushRanks.includes(rank)) flushRanks.push(rank);
            }
            return [5, ...flushRanks.sort((a, b) => b - a).slice(0, 5)];
        }
        if (straightHigh) return [4, straightHigh];

        const tripleRank = distinctRanks.find((rank) => counts.get(rank) + wilds >= 3);
        if (tripleRank) {
            return [3, tripleRank, ...distinctRanks.filter((rank) => rank !== tripleRank).slice(0, 2)];
        }

        for (let highPair = 14; highPair >= 3; highPair--) {
            for (let lowPair = highPair - 1; lowPair >= 3; lowPair--) {
                const needed = Math.max(0, 2 - (counts.get(highPair) ?? 0))
                    + Math.max(0, 2 - (counts.get(lowPair) ?? 0));
                if (needed <= wilds) {
                    const kicker = distinctRanks.find(
                        (rank) => rank !== highPair && rank !== lowPair
                    ) ?? 0;
                    return [2, highPair, lowPair, kicker];
                }
            }
        }

        const pairRank = distinctRanks.find((rank) => counts.get(rank) + wilds >= 2)
            ?? (wilds > 0 ? 14 : null);
        if (pairRank !== null) {
            return [1, pairRank, ...distinctRanks.filter((rank) => rank !== pairRank).slice(0, 3)];
        }
        return [0, ...distinctRanks.slice(0, 5)];
    }

    findStraightHigh(ranks, wilds) {
        const values = new Set(ranks);
        if (values.has(14)) values.add(1);
        for (let high = 14; high >= 5; high--) {
            let missing = 0;
            for (let value = high; value > high - 5; value--) {
                if (!values.has(value)) missing++;
            }
            if (missing <= wilds) return high;
        }
        return 0;
    }

    rankValue(rank) {
        return { J: 11, Q: 12, K: 13, A: 14 }[rank] ?? Number(rank);
    }

    compareScores(left, right) {
        const length = Math.max(left.length, right.length);
        for (let index = 0; index < length; index++) {
            const difference = (left[index] ?? 0) - (right[index] ?? 0);
            if (difference !== 0) return Math.sign(difference);
        }
        return 0;
    }

    combinations(items, size) {
        const result = [];
        const choose = (start, selection) => {
            if (selection.length === size) {
                result.push([...selection]);
                return;
            }
            for (let index = start; index <= items.length - (size - selection.length); index++) {
                selection.push(items[index]);
                choose(index + 1, selection);
                selection.pop();
            }
        };
        choose(0, []);
        return result;
    }
}

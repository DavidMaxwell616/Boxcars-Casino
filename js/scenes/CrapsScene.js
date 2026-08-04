import { getBestChipStackDistribution } from "../GameFunctions.js";
import { Navbar } from "../ui/Navbar.js";

export class CrapsScene extends Phaser.Scene {
    constructor() {
        super("CRAPS");
    }

    preload() {
        this.load.image("crapsBackground", "assets/images/craps.jpg");
        this.load.spritesheet("crapsChips", "assets/images/chips.png", {
            frameWidth: 30,
            frameHeight: 27
        });
        this.load.audio("crapsShake", "assets/sounds/DIESHAK0.WAV");
        this.load.audio("crapsLand", "assets/sounds/DIEFLOOR.WAV");
        Navbar.preload(this);
    }

    create() {
        this.W = 800;
        this.H = 538;
        this.balance = Number(globalThis.STAKE ?? 0);
        this.betPlaced = 0;
        this.point = null;
        this.roundActive = false;
        this.rolling = false;
        this.roundSettling = false;
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];

        // Crop the old title/menu bar; the shared navbar owns the top 62 pixels.
        this.background = this.add.image(0, 62, "crapsBackground")
            .setOrigin(0, 0)
            .setCrop(0, 39, 607, 436)
            .setScale(800 / 607, 538 / 436);

        this.betZoneRect = new Phaser.Geom.Rectangle(76, 434, 458, 49);
        this.exitBtnRect = new Phaser.Geom.Rectangle(9, 564, 64, 27);
        this.placeBtnRect = new Phaser.Geom.Rectangle(99, 558, 68, 38);
        this.shootBtnRect = new Phaser.Geom.Rectangle(190, 558, 91, 38);
        this.denomBtnRect = new Phaser.Geom.Rectangle(289, 558, 57, 38);

        const buttonGraphics = this.add.graphics().setDepth(20);
        this.drawBevelButton(buttonGraphics, this.exitBtnRect);
        this.drawBevelButton(buttonGraphics, this.placeBtnRect);
        this.drawBevelButton(buttonGraphics, this.shootBtnRect);

        this.exitBtnText = this.makeButtonText(this.exitBtnRect, "Exit", 17);
        this.placeBtnText = this.makeButtonText(this.placeBtnRect, "Place", 17);
        this.shootBtnText = this.makeButtonText(this.shootBtnRect, "Shoot", 18);
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

        this.betText = this.add.text(this.betZoneRect.centerX, 411, "", {
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

        this.rollText = this.add.text(400, 125, "PLACE A PASS LINE BET", {
            fontFamily: "Arial",
            fontSize: "20px",
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

        this.dieOne = this.createDie(650, 155);
        this.dieTwo = this.createDie(710, 125);
        this.buildBankrollStacks();
        this.selectFirstAvailableDenomination();

        this.input.on("pointerdown", (pointer) => {
            if (Phaser.Geom.Rectangle.Contains(this.exitBtnRect, pointer.x, pointer.y)) {
                this.scene.start("Hub");
            } else if (Phaser.Geom.Rectangle.Contains(this.placeBtnRect, pointer.x, pointer.y)) {
                this.placeSelectedChip();
            } else if (Phaser.Geom.Rectangle.Contains(this.shootBtnRect, pointer.x, pointer.y)) {
                this.shootDice();
            } else if (Phaser.Geom.Rectangle.Contains(this.denomBtnRect, pointer.x, pointer.y)) {
                this.cycleDenomination();
            }
        });
        this.input.keyboard.on("keydown-SPACE", () => this.shootDice());

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

    buildBankrollStacks() {
        const stake = Number(globalThis.STAKE ?? 0);
        if (!Number.isSafeInteger(stake) || stake <= 0) return;

        this.chipFrames = new Map([
            [5, 0], [10, 1], [20, 2], [50, 3],
            [100, 4], [500, 5], [1000, 6], [5000, 7]
        ]);

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

        const firstStackX = 650;
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
        if (!chip || this.roundActive || this.roundSettling) return;

        chip.setInteractive({ useHandCursor: true });
        this.input.setDraggable(chip);
        chip.on("pointerdown", () => this.selectDenomination(chip.getData("value")));
        if (chip.getData("dragConfigured")) return;
        chip.setData("dragConfigured", true);

        chip.on("dragstart", () => this.children.bringToTop(chip));
        chip.on("drag", (pointer, dragX, dragY) => chip.setPosition(dragX, dragY));
        chip.on("dragend", () => {
            const droppedInBetZone = Phaser.Geom.Rectangle.Contains(
                this.betZoneRect,
                chip.x,
                chip.y - chip.displayHeight / 2
            );

            if (this.wageredChips.includes(chip)) {
                const returnZone = new Phaser.Geom.Rectangle(
                    chip.getData("originalX") - 22,
                    510,
                    44,
                    90
                );

                if (
                    !this.roundActive &&
                    !this.roundSettling &&
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

            if (!droppedInBetZone || this.roundActive || this.roundSettling) {
                chip.setPosition(chip.getData("originalX"), chip.getData("originalY"));
                return;
            }
            this.commitWagerChip(chip);
        });
    }

    commitWagerChip(chip) {
        if (!chip || this.wageredChips.includes(chip)) return;

        chip.disableInteractive();
        const wagerIndex = this.wageredChips.length;
        chip.setPosition(
            this.betZoneRect.centerX - 25 + (wagerIndex % 6) * 10,
            this.betZoneRect.centerY + 8 - Math.floor(wagerIndex / 6) * 6
        );
        chip.setData({ betX: chip.x, betY: chip.y });
        this.betPlaced += chip.getData("value");
        this.wageredChips.push(chip);

        const stack = this.bankrollChipStacks[chip.getData("stackIndex")];
        const nextTopChip = [...stack].reverse().find(
            (stackChip) => stackChip.active && !this.wageredChips.includes(stackChip)
        );
        this.makeBankrollChipDraggable(nextTopChip);
        chip.setInteractive({ useHandCursor: true });
        this.input.setDraggable(chip);
        this.updateTexts();
    }

    returnWagerChipToStack(chip) {
        const wagerIndex = this.wageredChips.indexOf(chip);
        if (wagerIndex === -1) return;

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
        this.layoutWageredChips();
        this.updateTexts();
    }

    layoutWageredChips() {
        this.wageredChips.forEach((chip, index) => {
            const betX = this.betZoneRect.centerX - 25 + (index % 6) * 10;
            const betY = this.betZoneRect.centerY + 8 - Math.floor(index / 6) * 6;
            chip.setData({ betX, betY });
            chip.setPosition(betX, betY);
        });
    }

    placeSelectedChip() {
        if (this.roundActive || this.roundSettling || this.rolling) return;
        const chip = this.findTopAvailableChip(this.selectedDenomination);
        if (!chip) {
            this.rollText.setText("NO CHIP OF THAT VALUE AVAILABLE");
            return;
        }

        chip.disableInteractive();
        this.tweens.add({
            targets: chip,
            x: this.betZoneRect.centerX,
            y: this.betZoneRect.centerY + 8,
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
        if (this.roundActive || this.roundSettling) return;
        const values = this.availableDenominations();
        if (values.length === 0) return;
        const index = values.indexOf(this.selectedDenomination);
        this.selectDenomination(values[(index + 1) % values.length]);
    }

    shootDice() {
        if (this.rolling || this.roundSettling || this.betPlaced <= 0) return;

        this.rolling = true;
        this.roundActive = true;
        this.disableBankrollChips();
        this.updateTexts();
        this.rollText.setText("SHOOTING...");
        this.playSound("crapsShake");

        const dieOne = Phaser.Math.Between(1, 6);
        const dieTwo = Phaser.Math.Between(1, 6);
        this.animateDice(dieOne, dieTwo, () => this.resolveRoll(dieOne, dieTwo));
    }

    animateDice(finalOne, finalTwo, onComplete) {
        this.dieOne.setPosition(650, 155).setAngle(0).setVisible(true);
        this.dieTwo.setPosition(710, 125).setAngle(0).setVisible(true);

        const tumble = this.time.addEvent({
            delay: 75,
            repeat: 10,
            callback: () => {
                this.drawDie(this.dieOne, Phaser.Math.Between(1, 6));
                this.drawDie(this.dieTwo, Phaser.Math.Between(1, 6));
            }
        });

        let completed = 0;
        const landed = () => {
            completed++;
            if (completed < 2) return;
            tumble.remove(false);
            this.drawDie(this.dieOne, finalOne);
            this.drawDie(this.dieTwo, finalTwo);
            this.playSound("crapsLand");
            onComplete();
        };

        this.tweens.add({
            targets: this.dieOne,
            x: 360,
            y: 285,
            angle: 720,
            duration: 900,
            ease: "Bounce.Out",
            onComplete: landed
        });
        this.tweens.add({
            targets: this.dieTwo,
            x: 445,
            y: 320,
            angle: -630,
            duration: 1050,
            ease: "Bounce.Out",
            onComplete: landed
        });
    }

    resolveRoll(dieOne, dieTwo) {
        const total = dieOne + dieTwo;
        this.rolling = false;

        if (this.point === null) {
            if (total === 7 || total === 11) {
                this.endRound(`${total} — PASS LINE WINS!`, "win");
                return;
            }
            if (total === 2 || total === 3 || total === 12) {
                this.endRound(`${total} — CRAPS!`, "loss");
                return;
            }
            this.point = total;
            this.pointText.setText(`POINT: ${this.point}`);
            this.rollText.setText(`POINT IS ${this.point} — SHOOT AGAIN`);
        } else if (total === this.point) {
            this.endRound(`${total} — POINT MADE!`, "win");
            return;
        } else if (total === 7) {
            this.endRound("SEVEN OUT!", "loss");
            return;
        } else {
            this.rollText.setText(`ROLLED ${total} — POINT IS ${this.point}`);
        }

        this.updateTexts();
    }

    endRound(message, outcome) {
        this.roundSettling = true;
        this.rolling = false;
        if (outcome === "win") {
            globalThis.STAKE = Number(globalThis.STAKE ?? 0) + this.betPlaced;
            this.balance = Number(globalThis.STAKE);
            this.navbar.setStake(this.balance);
        }

        this.messageText.setText(message);
        this.updateTexts();
        this.time.delayedCall(5000, () => {
            this.messageText.setText("");
            this.settleWager(outcome);
        });
    }

    settleWager(outcome) {
        const transfers = [];
        if (outcome === "loss") {
            globalThis.STAKE = Math.max(
                0,
                Number(globalThis.STAKE ?? 0) - this.betPlaced
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
        this.chipSprites.forEach((chip) => chip.active && chip.destroy());
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];
        this.betPlaced = 0;
        this.point = null;
        this.roundActive = false;
        this.roundSettling = false;
        this.balance = Number(globalThis.STAKE ?? 0);
        this.dieOne.setVisible(false);
        this.dieTwo.setVisible(false);
        this.buildBankrollStacks();
        this.selectFirstAvailableDenomination();
        this.navbar.setStake(this.balance);
        this.pointText.setText("COME-OUT ROLL");
        this.rollText.setText("PLACE A PASS LINE BET");
        this.updateTexts();
    }

    disableBankrollChips() {
        this.bankrollChipStacks.forEach((stack) => {
            stack.forEach((chip) => chip.disableInteractive());
        });
    }

    updateTexts() {
        this.betText.setText(`PASS LINE BET: $${this.betPlaced.toLocaleString("en-US")}`);
        const canShoot = this.betPlaced > 0 && !this.rolling && !this.roundSettling;
        this.shootBtnText.setColor(canShoot ? "#000000" : "#7f7f7f");
        const canPlace = !this.roundActive && !this.roundSettling && !this.rolling;
        this.placeBtnText.setColor(canPlace ? "#000000" : "#7f7f7f");

        if (this.betPlaced === 0 && !this.roundActive && !this.roundSettling) {
            this.rollText.setText("PLACE A PASS LINE BET");
        }
    }

    createDie(x, y) {
        const die = this.add.container(x, y).setDepth(40).setVisible(false);
        this.drawDie(die, 1);
        return die;
    }

    drawDie(die, value) {
        die.removeAll(true);
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.lineStyle(3, 0xcc0000, 1);
        g.fillRoundedRect(-30, -30, 60, 60, 9);
        g.strokeRoundedRect(-30, -30, 60, 60, 9);
        g.fillStyle(0xcc0000, 1);

        const positions = {
            1: [[0, 0]],
            2: [[-15, -15], [15, 15]],
            3: [[-15, -15], [0, 0], [15, 15]],
            4: [[-15, -15], [15, -15], [-15, 15], [15, 15]],
            5: [[-15, -15], [15, -15], [0, 0], [-15, 15], [15, 15]],
            6: [[-15, -17], [15, -17], [-15, 0], [15, 0], [-15, 17], [15, 17]]
        };
        positions[value].forEach(([dotX, dotY]) => g.fillCircle(dotX, dotY, 5));
        die.add(g);
    }

    drawBevelButton(graphics, rect) {
        graphics.fillStyle(0xc0c0c0, 1).fillRect(rect.x, rect.y, rect.width, rect.height);
        graphics.lineStyle(2, 0xffffff, 1)
            .beginPath()
            .moveTo(rect.x, rect.bottom)
            .lineTo(rect.x, rect.y)
            .lineTo(rect.right, rect.y)
            .strokePath();
        graphics.lineStyle(2, 0x666666, 1)
            .beginPath()
            .moveTo(rect.right, rect.y)
            .lineTo(rect.right, rect.bottom)
            .lineTo(rect.x, rect.bottom)
            .strokePath();
    }

    playSound(key) {
        if (this.cache.audio.exists(key)) this.sound.play(key);
    }
}

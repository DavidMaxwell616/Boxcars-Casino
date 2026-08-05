import { getBestChipStackDistribution } from "../GameFunctions.js";
import { Navbar } from "../ui/Navbar.js";

export class RouletteScene extends Phaser.Scene {
    constructor() {
        super("ROULETTE");
    }

    preload() {
        this.load.image("rouletteBackground", "assets/images/roulette.png");
        this.load.image("rouletteBall", "assets/images/roulette ball.png");
        this.load.spritesheet("rouletteChips", "assets/images/chips.png", {
            frameWidth: 30,
            frameHeight: 27
        });
        Navbar.preload(this);
        this.load.spritesheet(
            "rouletteWheelSpinSheet",
            "assets/images/roulette wheel.png",
            { frameWidth: 800, frameHeight: 600 }
        );
    }

    create() {
        this.isSpinning = false;
        this.wager = 0;
        this.bets = [];
        this.wageredChips = [];
        this.redNumbers = new Set([
            1, 3, 5, 7, 9, 12, 14, 16, 18,
            19, 21, 23, 25, 27, 30, 32, 34, 36
        ]);
        this.add.image(0, 61, "rouletteBackground")
            .setOrigin(0, 0)
            .setDisplaySize(800, 539);

        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.configureChipDragging();
        this.buildBankrollStacks();
        this.wheel = this.add.sprite(400, 310, "rouletteWheelSpinSheet", 0)
            .setDisplaySize(640, 480)
            .setVisible(false);
        this.ball = this.add.image(730, 120, "rouletteBall")
            .setDisplaySize(28, 28)
            .setVisible(false);
        this.wheelLayer = this.add.container(0, 0, [this.wheel, this.ball])
            .setDepth(45)
            .setVisible(false);

        this.anims.create({
            key: "rouletteBallDrop",
            frames: this.anims.generateFrameNumbers("rouletteWheelSpinSheet", {
                start: 0,
                end: 14
            }),
            frameRate: 18,
            repeat: 0
        });

        this.anims.create({
            key: "rouletteBallOrbit",
            frames: this.anims.generateFrameNumbers("rouletteWheelSpinSheet", {
                start: 15,
                end: 69
            }),
            frameRate: 30,
            repeat: 0
        });

        this.anims.create({
            key: "rouletteBallBounce",
            frames: this.anims.generateFrameNumbers("rouletteWheelSpinSheet", {
                start: 70,
                end: 110
            }),
            frameRate: 18,
            repeat: 0
        });

        this.wheel.on("animationcomplete", (animation) => {
            if (!this.isSpinning) return;

            if (animation.key === "rouletteBallDrop") {
                this.wheel.play("rouletteBallOrbit");
            } else if (animation.key === "rouletteBallOrbit") {
                this.wheel.play("rouletteBallBounce");
            } else if (animation.key === "rouletteBallBounce") {
                this.wheelAnimationDone = true;
                this.hideWheelAndBall();
                this.finishSpinWhenReady();
            }
        });

        this.resultText = this.add.text(
            400,
            94,
            this.hasValidBet() ? "CLICK SPIN" : "PLACE A BET",
            {
                fontFamily: "Arial, sans-serif",
                fontSize: "30px",
                fontStyle: "bold",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 5
            }
        ).setOrigin(0.5).setDepth(50);

        this.spinButton = this.add.text(377, 576, "SPIN", {
            fontFamily: "Arial",
            fontSize: "19px",
            fontStyle: "bold",
            color: "#000000",
            padding: { x: 20, y: 5 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        this.exitButton = this.add.text(37, 576, "EXIT", {
            fontFamily: "Arial",
            fontSize: "17px",
            fontStyle: "bold",
            color: "#000000",
            padding: { x: 13, y: 5 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        this.spinButton.on("pointerdown", () => this.spinWheel());
        this.wheel.on("pointerdown", () => this.spinWheel());
        this.exitButton.on("pointerdown", () => this.scene.start("Hub"));
        this.input.keyboard.on("keydown-SPACE", () => this.spinWheel());

        this.navbar = new Navbar(this);
        this.updateSpinButtonState();
    }

    buildBankrollStacks() {
        const stake = Number(globalThis.STAKE ?? 0);
        if (!Number.isSafeInteger(stake) || stake <= 0) return;

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
            let remaining = stake;
            const stacks = [];
            for (const denomination of [...chipFrames.keys()].sort((a, b) => b - a)) {
                let count = Math.floor(remaining / denomination);
                remaining %= denomination;
                while (count > 0) {
                    const stackCount = Math.min(count, 10);
                    stacks.push({
                        denomination,
                        count: stackCount,
                        value: denomination * stackCount
                    });
                    count -= stackCount;
                }
            }
            if (remaining !== 0) return;
            distribution = { stacks };
        }

        const stackSpacing = 36;
        const chipOverlap = 7;
        const stackBottomY = 513;
        const firstStackX = this.scale.width / 2
            - ((distribution.stacks.length - 1) * stackSpacing) / 2;

        distribution.stacks.forEach((stack, stackIndex) => {
            const stackChips = [];
            for (let chipIndex = 0; chipIndex < stack.count; chipIndex++) {
                const chip = this.add.sprite(
                    firstStackX + stackIndex * stackSpacing,
                    stackBottomY - chipIndex * chipOverlap,
                    "rouletteChips",
                    chipFrames.get(stack.denomination)
                )
                    .setOrigin(0.5, 1)
                    .setDepth(40);

                chip.setData({
                    rouletteChip: true,
                    value: stack.denomination,
                    stackIndex,
                    chipIndex,
                    originalX: chip.x,
                    originalY: chip.y
                });
                stackChips.push(chip);
                this.chipSprites.push(chip);
            }
            this.bankrollChipStacks[stackIndex] = stackChips;
            this.makeBankrollChipDraggable(stackChips.at(-1));
        });
    }

    makeBankrollChipDraggable(chip) {
        if (!chip || this.isSpinning) return;

        if (!chip.input) {
            chip.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(-8, -8, 46, 43),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                useHandCursor: true
            });
        } else {
            chip.input.enabled = true;
            chip.input.cursor = "pointer";
        }
        this.input.setDraggable(chip);
    }

    configureChipDragging() {
        this.input.on("dragstart", (pointer, chip) => {
            if (!chip.getData?.("rouletteChip")) return;
            this.children.bringToTop(chip);
            chip.setScale(1.08);
        });

        this.input.on("drag", (pointer, chip, dragX, dragY) => {
            if (!chip.getData?.("rouletteChip")) return;
            chip.setPosition(dragX, dragY);
        });

        this.input.on("dragend", (pointer, chip) => {
            if (!chip.getData?.("rouletteChip")) return;
            chip.setScale(1);
            this.handleChipDrop(chip);
        });
    }

    handleChipDrop(chip) {
        const isWagered = this.wageredChips.includes(chip);
        const chipCenterY = chip.y - chip.displayHeight / 2;

        if (isWagered && this.isOverOriginalStack(chip)) {
            this.returnBetChipToStack(chip);
            return;
        }

        const bet = this.getBetAt(chip.x, chipCenterY);
        if (!bet || this.isSpinning) {
            chip.setPosition(
                chip.getData(isWagered ? "betX" : "originalX"),
                chip.getData(isWagered ? "betY" : "originalY")
            );
            return;
        }

        if (isWagered) {
            this.moveBetChip(chip, bet);
        } else {
            this.placeBetChip(chip, bet);
        }
    }

    isOverOriginalStack(chip) {
        return Phaser.Geom.Rectangle.Contains(
            new Phaser.Geom.Rectangle(
                chip.getData("originalX") - 22,
                485,
                44,
                80
            ),
            chip.x,
            chip.y
        );
    }

    placeBetChip(chip, bet) {
        const wager = {
            chip,
            value: chip.getData("value"),
            name: bet.name,
            numbers: bet.numbers,
            payout: bet.payout
        };
        chip.setData({ betX: chip.x, betY: chip.y });
        this.bets.push(wager);
        this.wageredChips.push(chip);
        this.wager += wager.value;
        this.refreshChipStack(chip.getData("stackIndex"));
        this.showCurrentBet(wager);
        this.updateSpinButtonState();
    }

    moveBetChip(chip, bet) {
        const wager = this.bets.find((candidate) => candidate.chip === chip);
        if (!wager) return;
        wager.name = bet.name;
        wager.numbers = bet.numbers;
        wager.payout = bet.payout;
        chip.setData({ betX: chip.x, betY: chip.y });
        this.showCurrentBet(wager);
    }

    returnBetChipToStack(chip) {
        const betIndex = this.bets.findIndex((bet) => bet.chip === chip);
        if (betIndex === -1 || this.isSpinning) return;

        this.wager -= this.bets[betIndex].value;
        this.bets.splice(betIndex, 1);
        this.wageredChips = this.wageredChips.filter(
            (wageredChip) => wageredChip !== chip
        );
        chip.setPosition(chip.getData("originalX"), chip.getData("originalY"));
        this.refreshChipStack(chip.getData("stackIndex"));
        this.resultText
            .setColor("#ffffff")
            .setText(this.hasValidBet() ? `TOTAL BET: $${this.wager}` : "PLACE A BET");
        this.updateSpinButtonState();
    }

    refreshChipStack(stackIndex) {
        const stack = this.bankrollChipStacks[stackIndex] ?? [];
        stack.forEach((chip) => {
            if (this.wageredChips.includes(chip)) {
                this.makeBankrollChipDraggable(chip);
            } else {
                chip.disableInteractive();
            }
        });
        const topChip = [...stack].reverse().find(
            (chip) => chip.active && !this.wageredChips.includes(chip)
        );
        this.makeBankrollChipDraggable(topChip);
    }

    showCurrentBet(bet) {
        this.resultText
            .setColor("#ffffff")
            .setText(
                `${bet.name.toUpperCase()}  $${bet.value}  (${bet.payout}:1)        ` +
                `TOTAL BET: $${this.wager.toLocaleString("en-US")}`
            );
    }

    getBetAt(x, y) {
        const gridX = 89;
        const gridY = 127;
        const gridWidth = 640;
        const gridHeight = 181;
        const cellWidth = gridWidth / 12;
        const cellHeight = gridHeight / 3;
        const gridRight = gridX + gridWidth;
        const gridBottom = gridY + gridHeight;
        const numberAt = (column, row) => column * 3 + row + 1;
        const columnNumbers = (column) => [
            numberAt(column, 0),
            numberAt(column, 1),
            numberAt(column, 2)
        ];

        // The American five-number basket sits where 0/00 meet 1-2-3.
        if (Math.abs(x - gridX) <= 12 && Math.abs(y - (gridY + gridHeight / 2)) <= 13) {
            return { name: "Five number", numbers: [0, "00", 1, 2, 3], payout: 6 };
        }

        if (x >= 25 && x < gridX && y >= gridY && y <= gridBottom) {
            const middleY = gridY + gridHeight / 2;
            if (Math.abs(y - middleY) <= 10) {
                return { name: "Split 0/00", numbers: [0, "00"], payout: 17 };
            }
            const number = y < middleY ? 0 : "00";
            return { name: `Straight ${number}`, numbers: [number], payout: 35 };
        }

        if (x >= gridRight && x <= 783 && y >= gridY && y <= gridBottom) {
            const row = Phaser.Math.Clamp(
                Math.floor((y - gridY) / cellHeight),
                0,
                2
            );
            const numbers = Array.from({ length: 12 }, (_, column) => numberAt(column, row));
            return { name: "Column", numbers, payout: 2 };
        }

        if (x >= gridX && x <= gridRight && y > gridBottom + 11 && y <= 353) {
            const dozen = Phaser.Math.Clamp(
                Math.floor((x - gridX) / (gridWidth / 3)),
                0,
                2
            );
            const first = dozen * 12 + 1;
            const numbers = Array.from({ length: 12 }, (_, index) => first + index);
            return { name: `${dozen + 1}${dozen === 0 ? "st" : dozen === 1 ? "nd" : "rd"} dozen`, numbers, payout: 2 };
        }

        if (x >= gridX && x <= gridRight && y > 353 && y <= 404) {
            const outsideIndex = Phaser.Math.Clamp(
                Math.floor((x - gridX) / (gridWidth / 6)),
                0,
                5
            );
            const all = Array.from({ length: 36 }, (_, index) => index + 1);
            const outsideBets = [
                { name: "1-18", numbers: all.filter((n) => n <= 18) },
                { name: "Even", numbers: all.filter((n) => n % 2 === 0) },
                { name: "Red", numbers: all.filter((n) => this.redNumbers.has(n)) },
                { name: "Black", numbers: all.filter((n) => !this.redNumbers.has(n)) },
                { name: "Odd", numbers: all.filter((n) => n % 2 === 1) },
                { name: "19-36", numbers: all.filter((n) => n >= 19) }
            ];
            return { ...outsideBets[outsideIndex], payout: 1 };
        }

        if (x < gridX || x > gridRight || y < gridY || y > gridBottom + 11) {
            return null;
        }

        const columnPosition = (x - gridX) / cellWidth;
        const nearestColumnLine = Math.round(columnPosition);
        const nearColumnLine = Math.abs(columnPosition - nearestColumnLine) <= 0.16;

        if (Math.abs(y - gridBottom) <= 11) {
            if (nearColumnLine && nearestColumnLine > 0 && nearestColumnLine < 12) {
                return {
                    name: "Line",
                    numbers: [
                        ...columnNumbers(nearestColumnLine - 1),
                        ...columnNumbers(nearestColumnLine)
                    ],
                    payout: 5
                };
            }
            const column = Phaser.Math.Clamp(Math.floor(columnPosition), 0, 11);
            return { name: "Street", numbers: columnNumbers(column), payout: 11 };
        }

        const rowPosition = (y - gridY) / cellHeight;
        const column = Phaser.Math.Clamp(Math.floor(columnPosition), 0, 11);
        const row = Phaser.Math.Clamp(Math.floor(rowPosition), 0, 2);
        const nearestRowLine = Math.round(rowPosition);
        const nearRowLine = Math.abs(rowPosition - nearestRowLine) <= 0.16;
        const verticalBoundary = nearColumnLine && nearestColumnLine > 0 && nearestColumnLine < 12;
        const horizontalBoundary = nearRowLine && nearestRowLine > 0 && nearestRowLine < 3;

        if (verticalBoundary && horizontalBoundary) {
            return {
                name: "Corner",
                numbers: [
                    numberAt(nearestColumnLine - 1, nearestRowLine - 1),
                    numberAt(nearestColumnLine, nearestRowLine - 1),
                    numberAt(nearestColumnLine - 1, nearestRowLine),
                    numberAt(nearestColumnLine, nearestRowLine)
                ],
                payout: 8
            };
        }
        if (verticalBoundary) {
            return {
                name: "Split",
                numbers: [
                    numberAt(nearestColumnLine - 1, row),
                    numberAt(nearestColumnLine, row)
                ],
                payout: 17
            };
        }
        if (horizontalBoundary) {
            return {
                name: "Split",
                numbers: [
                    numberAt(column, nearestRowLine - 1),
                    numberAt(column, nearestRowLine)
                ],
                payout: 17
            };
        }

        const number = numberAt(column, row);
        return { name: `Straight ${number}`, numbers: [number], payout: 35 };
    }

    spinWheel() {
        if (this.isSpinning) return;
        if (!this.hasValidBet()) {
            this.hideWheelAndBall();
            this.resultText.setColor("#ffffff").setText("PLACE A BET");
            return;
        }

        this.isSpinning = true;
        this.chipSprites.forEach((chip) => chip.disableInteractive());
        this.wageredChips.forEach((chip) => chip.setVisible(false));
        this.updateSpinButtonState();
        this.resultText.setText("");
        this.wheelLayer.setVisible(true);
        this.wheel
            .setVisible(true)
            .setInteractive({ useHandCursor: true });

        const pocket = Phaser.Math.Between(0, 37);
        const result = pocket === 37 ? "00" : pocket;
        const isGreen = result === 0 || result === "00";
        const color = isGreen
            ? "GREEN"
            : this.redNumbers.has(result) ? "RED" : "BLACK";
        const resultColor = color === "RED"
            ? "#ff2828"
            : color === "GREEN" ? "#4cff4c" : "#ffffff";
        this.pendingResult = { result, color, resultColor };
        this.wheelAnimationDone = false;
        this.ballAnimationDone = false;
        this.wheel.setAngle(0).play("rouletteBallDrop", true);
        this.animateRouletteBall(pocket);
    }

    hasValidBet() {
        return Number(this.wager ?? 0) > 0;
    }

    updateSpinButtonState() {
        if (!this.spinButton) return;

        const enabled = this.hasValidBet() && !this.isSpinning;
        this.spinButton.setColor(enabled ? "#000000" : "#7f7f7f");
        if (enabled) {
            this.spinButton.setInteractive({ useHandCursor: true });
        } else {
            this.spinButton.disableInteractive();
        }
    }

    hideWheelAndBall() {
        if (!this.wheelLayer) return;

        this.wheelLayer.setVisible(false);
        this.wheel.stop().setVisible(false).disableInteractive();
        this.ball.setVisible(false);
    }

    animateRouletteBall(result) {
        const centerX = this.wheel.x;
        const centerY = this.wheel.y;
        const entryAngle = -0.35;
        const outerX = centerX + Math.cos(entryAngle) * 290;
        const outerY = centerY + Math.sin(entryAngle) * 165;

        this.ball.setPosition(735, 105).setScale(0.75).setAlpha(0).setVisible(true);
        this.tweens.add({
            targets: this.ball,
            x: outerX,
            y: outerY,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 550,
            ease: "Quad.In",
            onComplete: () => this.animateBallOrbit(result)
        });
    }

    animateBallOrbit(result) {
        const motion = { progress: 0 };
        const startAngle = -0.35;

        this.tweens.add({
            targets: motion,
            progress: 1,
            duration: 2700,
            ease: "Linear",
            onUpdate: () => {
                const angle = startAngle - motion.progress * Math.PI * 7;
                const radiusX = Phaser.Math.Linear(290, 225, motion.progress);
                const radiusY = Phaser.Math.Linear(165, 122, motion.progress);
                const bounce = Math.sin(motion.progress * Math.PI * 18) * 4;
                this.ball.setPosition(
                    this.wheel.x + Math.cos(angle) * (radiusX + bounce),
                    this.wheel.y + Math.sin(angle) * (radiusY + bounce)
                );
            },
            onComplete: () => this.animateBallBounce(result)
        });
    }

    animateBallBounce(result) {
        const motion = { progress: 0 };
        const startAngle = -0.35 - Math.PI * 7;
        const landingAngle = (result / 36) * Math.PI * 2 - Math.PI / 2;

        this.tweens.add({
            targets: motion,
            progress: 1,
            duration: 1650,
            ease: "Sine.InOut",
            onUpdate: () => {
                const angle = Phaser.Math.Linear(
                    startAngle,
                    landingAngle - Math.PI * 2,
                    motion.progress
                );
                const jitter = Math.sin(motion.progress * Math.PI * 20) *
                    14 * (1 - motion.progress);
                const radiusX = Phaser.Math.Linear(225, 178, motion.progress) + jitter;
                const radiusY = Phaser.Math.Linear(122, 92, motion.progress) + jitter * 0.45;
                this.ball.setPosition(
                    this.wheel.x + Math.cos(angle) * radiusX,
                    this.wheel.y + Math.sin(angle) * radiusY
                );
            },
            onComplete: () => {
                this.ballAnimationDone = true;
                this.finishSpinWhenReady();
            }
        });
    }

    finishSpinWhenReady() {
        if (this.wheelAnimationDone && this.ballAnimationDone) {
            this.finishSpin();
        }
    }

    finishSpin() {
        if (!this.isSpinning || !this.pendingResult) return;

        this.wageredChips.forEach((chip) => chip.setVisible(true));
        const { result, color, resultColor } = this.pendingResult;
        const winningBets = this.bets.filter((bet) => bet.numbers.includes(result));
        const profit = winningBets.reduce(
            (total, bet) => total + bet.value * bet.payout,
            0
        );
        const losses = this.bets
            .filter((bet) => !bet.numbers.includes(result))
            .reduce((total, bet) => total + bet.value, 0);
        const net = profit - losses;
        const outcome = net > 0 ? "WIN" : net < 0 ? "LOSE" : "PUSH";
        this.resultText
            .setColor(resultColor)
            .setText(
                `${result} ${color}\n${outcome} $${Math.abs(net).toLocaleString("en-US")}`
            );

        this.time.delayedCall(3000, () => this.settleBets(result, net));
    }

    settleBets(result, net) {
        globalThis.STAKE = Math.max(0, Number(globalThis.STAKE ?? 0) + net);
        this.navbar.setStake(globalThis.STAKE);

        if (this.bets.length === 0) {
            this.resetBettingRound();
            return;
        }

        let remaining = this.bets.length;
        this.bets.forEach((bet, index) => {
            const won = bet.numbers.includes(result);
            const lossTargetX = 748 + (index % 3) * 7;
            const lossTargetY = 92 + Math.floor(index / 3) * 6;
            this.tweens.add({
                targets: bet.chip,
                x: won ? bet.chip.getData("originalX") : lossTargetX,
                y: won ? bet.chip.getData("originalY") : lossTargetY,
                alpha: won ? 1 : 0,
                scaleX: won ? 1 : 0.7,
                scaleY: won ? 1 : 0.7,
                duration: 700,
                delay: index * 60,
                ease: "Cubic.InOut",
                onComplete: () => {
                    remaining--;
                    if (remaining === 0) this.resetBettingRound();
                }
            });
        });
    }

    resetBettingRound() {
        this.chipSprites.forEach((chip) => {
            if (chip.active) chip.destroy();
        });
        this.chipSprites = [];
        this.bankrollChipStacks = [];
        this.wageredChips = [];
        this.bets = [];
        this.wager = 0;
        this.pendingResult = null;
        this.isSpinning = false;
        this.hideWheelAndBall();
        this.buildBankrollStacks();
        this.resultText.setColor("#ffffff").setText("PLACE A BET");
        this.updateSpinButtonState();
    }
}

import { Navbar } from "../ui/Navbar.js";
import { drawBevelButton, drawWin95Button } from "../ui/Win95.js";

export class SlotsScene extends Phaser.Scene {
    constructor() {
        super("SLOTS");
    }

    preload() {
        this.load.image("slotsBackground", "assets/images/slots.png");
        this.load.image("slotSymbols", "assets/images/slots images.png");
        this.load.audio("slotReelStop", "assets/sounds/REELSTOP.WAV");
        this.load.audio("slotBell", "assets/sounds/SLOTBELL.WAV");
        this.load.audio("slotSiren", "assets/sounds/SLOTSIRE.WAV");
        Navbar.preload(this);
    }

    create() {
        this.isSpinning = false;
        this.currentBet = 0;
        this.symbolNames = [
            "star", "cherry", "bell", "orange",
            "bar", "lemon", "seven", "dice"
        ];

        this.add.image(0, 61, "slotsBackground")
            .setOrigin(0, 0)
            .setDisplaySize(800, 539);

        this.registerSymbolFrames();
        this.createReels();

        this.resultText = this.add.text(400, 164, "CHOOSE YOUR BET", {
            fontFamily: "Arial, sans-serif",
            fontSize: "27px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 5,
            align: "center"
        }).setOrigin(0.5).setDepth(100);

        this.exitButton = this.makeButtonLabel(48, 576, "EXIT", 20);
        this.betButtons = [
            this.makeButtonLabel(255, 576, "$1 BET", 20),
            this.makeButtonLabel(416, 576, "$2 BET", 20),
            this.makeButtonLabel(575, 576, "$3 BET", 20)
        ];

        this.exitButton.getData("win95HitZone")
            .on("pointerdown", () => this.scene.start("Hub"));
        this.betButtons.forEach((button, index) => {
            const bet = index + 1;
            button.setData("bet", bet);
            button.getData("win95HitZone").on("pointerdown", () => this.spin(bet));
        });

        this.navbar = new Navbar(this);
        this.updateButtonStates();
    }

    registerSymbolFrames() {
        const texture = this.textures.get("slotSymbols");
        const frames = [
            ["star", 0, 0, 245, 245],
            ["cherry", 243, 0, 250, 245],
            ["bell", 507, 0, 232, 245],
            ["orange", 739, 0, 242, 245],
            ["bar", 981, 0, 250, 245],
            ["lemon", 1231, 0, 238, 245],
            ["seven", 1469, 0, 238, 245],
            ["dice", 1707, 0, 254, 245]
        ];

        frames.forEach(([name, x, y, width, height]) => {
            if (!texture.has(name)) texture.add(name, 0, x, y, width, height);
        });
    }

    createReels() {
        const reelX = [169, 312, 455];
        const rowY = [251, 344, 437];

        const maskShape = this.make.graphics({ add: false });
        maskShape.fillStyle(0xffffff);
        reelX.forEach((x) => maskShape.fillRect(x - 54, 210, 108, 268));
        this.reelMask = maskShape.createGeometryMask();

        this.reels = reelX.map((x) => rowY.map((y) => {
            const symbol = this.randomSymbol();
            return this.add.image(x, y, "slotSymbols", symbol)
                .setDisplaySize(108, 82)
                .setDepth(20)
                .setMask(this.reelMask)
                .setData({ symbol, homeY: y });
        }));
    }

    makeButtonLabel(x, y, label, fontSize) {
        const width = label === "EXIT" ? 84 : 116;
        const height = 36;
        const left = x - width / 2;
        const top = y - height / 2;
        const graphics = this.add.graphics().setDepth(50);
        const button = drawWin95Button(
            this,
            graphics,
            left,
            top,
            width,
            height,
            label,
            fontSize,
            { depth: 50 }
        );
        const hitZone = this.add.zone(x, y, width, height)
            .setDepth(50)
            .setInteractive({ useHandCursor: true });
        button.setData("win95Graphics", graphics);
        button.setData("win95HitZone", hitZone);
        button.setData("win95Bounds", { x: left, y: top, width, height });
        return button;
    }

    spin(bet) {
        const stake = Number(STAKE ?? 0);
        if (this.isSpinning || stake < bet) return;

        this.isSpinning = true;
        this.currentBet = bet;
        STAKE = stake - bet;
        this.navbar.setStake(STAKE);
        this.resultText.setColor("#ffffff").setText(`SPINNING — $${bet} BET`);
        this.updateButtonStates();

        this.reels.forEach((reel, reelIndex) => {
            this.tweenReel(reel, reelIndex, () => {
                this.randomizeReel(reel);
                reel.forEach((symbol) => symbol.y = symbol.getData("homeY"));
                this.playSound("slotReelStop");
                if (reelIndex === this.reels.length - 1) this.finishSpin();
            });
        });
    }

    tweenReel(reel, reelIndex, onComplete) {
        const symbolSpacing = 93;
        const reelHeight = symbolSpacing * reel.length;
        const rotations = 8 + reelIndex * 3;
        const motion = { offset: 0 };

        reel.forEach((symbol) => symbol.setData("spinCycle", 0));

        this.tweens.add({
            targets: motion,
            offset: reelHeight * rotations,
            duration: 900 + reelIndex * 350,
            ease: "Cubic.Out",
            onUpdate: () => {
                reel.forEach((symbol, rowIndex) => {
                    const travel = rowIndex * symbolSpacing + motion.offset;
                    const cycle = Math.floor(travel / reelHeight);

                    if (cycle !== symbol.getData("spinCycle")) {
                        const frame = this.randomSymbol();
                        symbol.setFrame(frame).setData({
                            symbol: frame,
                            spinCycle: cycle
                        });
                    }

                    symbol.y = reel[0].getData("homeY") + (travel % reelHeight);
                });
            },
            onComplete
        });
    }

    randomizeReel(reel) {
        reel.forEach((symbol) => {
            const frame = this.randomSymbol();
            symbol.setFrame(frame).setData("symbol", frame);
        });
    }

    randomSymbol() {
        return Phaser.Utils.Array.GetRandom(this.symbolNames);
    }

    finishSpin() {
        const payline = this.reels.map((reel) => reel[1].getData("symbol"));
        const multiplier = this.getPayoutMultiplier(payline);
        const payout = this.currentBet * multiplier;

        if (payout > 0) {
            STAKE = Number(STAKE ?? 0) + payout;
            this.resultText
                .setColor("#ffff00")
                .setText(`WIN $${payout.toLocaleString("en-US")}\n${payline.join(" • ").toUpperCase()}`);
            this.playSound(multiplier >= 25 ? "slotSiren" : "slotBell");
        } else {
            this.resultText
                .setColor("#ffffff")
                .setText(`NO WIN\n${payline.join(" • ").toUpperCase()}`);
        }

        this.navbar.setStake(STAKE);
        this.isSpinning = false;
        this.currentBet = 0;
        this.updateButtonStates();
    }

    getPayoutMultiplier([left, middle, right]) {
        if (left === "dice" && middle === "dice" && right === "dice") return 100;
        if (left === "bar" && middle === "bar" && right === "bar") return 75;
        if (left === "seven" && middle === "seven" && right === "seven") return 50;
        if (left === "star" && middle === "star" && right === "star") return 25;
        if (left === "bell" && middle === "bell" && right === "bell") return 20;
        if (left === "orange" && middle === "orange" && right === "orange") return 10;
        if (left === "cherry" && middle === "cherry" && right === "cherry") return 10;
        if (left === "bell" && middle === "bell" && right === "lemon") return 10;
        if (left === "cherry" && middle === "cherry") return 5;
        if (left === "cherry") return 2;
        return 0;
    }

    updateButtonStates() {
        const stake = Number(STAKE ?? 0);
        this.betButtons.forEach((button) => {
            const enabled = !this.isSpinning && stake >= button.getData("bet");
            button.setColor(enabled ? "#000000" : "#7f7f7f");
            const graphics = button.getData("win95Graphics");
            const bounds = button.getData("win95Bounds");
            graphics.clear();
            drawBevelButton(
                graphics,
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height,
                !enabled
            );
            const hitZone = button.getData("win95HitZone");
            if (enabled) {
                hitZone.setInteractive({ useHandCursor: true });
            } else {
                hitZone.disableInteractive();
            }
        });
    }

    playSound(key) {
        if (this.cache.audio.exists(key)) this.sound.play(key);
    }
}

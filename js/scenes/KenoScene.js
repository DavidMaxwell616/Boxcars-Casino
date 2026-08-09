const PAYOUTS = {
    1: { 1: 2 },
    2: { 2: 13 },
    3: { 2: 1, 3: 25 },
    4: { 3: 9, 4: 130 },
    5: { 3: 1, 4: 15, 5: 400 },
    6: { 4: 9, 5: 86, 6: 2067 },
    7: { 4: 3, 5: 23, 6: 273, 7: 8195 },
    8: { 5: 5, 6: 50, 7: 1000, 8: 10000 },
    9: { 5: 5, 6: 25, 7: 200, 8: 4000, 9: 25000 },
    10: { 0: 5, 5: 2, 6: 10, 7: 50, 8: 500, 9: 10000, 10: 100000 }
};

const MAX_SPOTS = 10;
const DEFAULT_QUICK_PICK_SPOTS = 4;
const MIN_DRAW_INTERVAL_MS = 3 * 60 * 1000;
const MAX_DRAW_INTERVAL_MS = 4 * 60 * 1000;

export class KenoScene extends Phaser.Scene {
    constructor() {
        super("KENO");
    }

    init(data) {
        this.parentSceneKey = data?.parentSceneKey ?? null;
    }

    preload() {
        this.load.image("kenoBackground", "assets/images/keno.png");
        this.load.audio("kenoOpen", "assets/sounds/KENOOPEN.WAV");
        this.load.audio("kenoBell", "assets/sounds/KENOBELL.WAV");
        this.load.audio("kenoWinner", "assets/sounds/KENOWINN.WAV");
    }

    create() {
        this.selectedNumbers = new Set();
        this.betPerGame = 1;
        this.numberOfGames = 1;
        this.drawing = false;
        this.numberCells = [];

        this.modalScale = 1.55;
        this.modalWidth = 369 * this.modalScale;
        this.modalHeight = 303 * this.modalScale;
        this.modalLeft = (800 - this.modalWidth) / 2;
        this.modalTop = 80;

        this.add.rectangle(400, 331, 800, 538, 0x000000, 0.58).setDepth(0);

        this.add.image(this.modalLeft, this.modalTop, "kenoBackground")
            .setOrigin(0, 0)
            .setDisplaySize(this.modalWidth, this.modalHeight)
            .setDepth(1);

        this.createNumberGrid();
        this.createTicketFields();
        this.createButtons();
        this.updateTicket();

        this.closeButton = this.add.rectangle(
            this.toX(355),
            this.toY(10),
            18 * this.modalScale,
            16 * this.modalScale,
            0xffffff,
            0.001
        ).setDepth(30).setInteractive({ useHandCursor: true });
        this.closeButton.on("pointerdown", () => this.closeModal());
        this.input.keyboard.on("keydown-ESC", () => this.closeModal());

        if (this.cache.audio.exists("kenoOpen")) this.sound.play("kenoOpen");
    }

    toX(sourceX) {
        return this.modalLeft + sourceX * this.modalScale;
    }

    toY(sourceY) {
        return this.modalTop + sourceY * this.modalScale;
    }

    updateStakeDisplay() {
        if (!this.parentSceneKey) return;
        const parentScene = this.scene.get(this.parentSceneKey);
        parentScene?.navbar?.setStake(globalThis.STAKE);
    }

    closeModal() {
        if (this.parentSceneKey) {
            this.input.enabled = false;
            this.scene.setVisible(false);
            this.scene.resume(this.parentSceneKey);
        } else {
            this.scene.start("Hub");
        }
    }

    openFrom(parentSceneKey) {
        this.parentSceneKey = parentSceneKey;
        this.scene.pause(parentSceneKey);
        this.scene.setVisible(true);
        this.scene.bringToTop();
        this.input.enabled = true;
    }

    createNumberGrid() {
        const gridLeft = this.toX(12);
        const gridTop = this.toY(52);
        const cellWidth = 20.2 * this.modalScale;
        const cellHeight = 21.75 * this.modalScale;

        for (let number = 1; number <= 80; number++) {
            const column = (number - 1) % 10;
            const row = Math.floor((number - 1) / 10);
            const x = gridLeft + column * cellWidth + cellWidth / 2;
            const y = gridTop + row * cellHeight + cellHeight / 2;
            const highlight = this.add.rectangle(
                x,
                y,
                cellWidth - 3,
                cellHeight - 3,
                0x00aa00,
                0
            ).setDepth(10);
            const mark = this.add.text(x, y, "", {
                fontFamily: "Arial",
                fontSize: "27px",
                fontStyle: "bold",
                color: "#000000",
                stroke: "#ffffff",
                strokeThickness: 2
            }).setOrigin(0.5).setDepth(12);
            const hit = this.add.rectangle(
                x,
                y,
                cellWidth,
                cellHeight,
                0xffffff,
                0.001
            ).setDepth(13).setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => this.toggleNumber(number));
            this.numberCells[number] = { highlight, mark, hit };
        }
    }

    createTicketFields() {
        this.spotsText = this.makeFieldText(this.toX(288), this.toY(72));
        this.betText = this.makeFieldText(this.toX(253), this.toY(108));
        this.perGameText = this.makeFieldText(this.toX(323), this.toY(108));
        this.gamesText = this.makeFieldText(this.toX(253), this.toY(152));
        this.totalText = this.makeFieldText(this.toX(323), this.toY(152));

        const betHit = this.add.rectangle(
            this.toX(253),
            this.toY(108),
            57 * this.modalScale,
            22 * this.modalScale,
            0xffffff,
            0.001
        )
            .setInteractive({ useHandCursor: true });
        betHit.on("pointerdown", () => {
            if (this.drawing) return;
            this.betPerGame = this.betPerGame % 3 + 1;
            this.updateTicket();
        });

        const perGameHit = this.add.rectangle(
            this.toX(323),
            this.toY(108),
            57 * this.modalScale,
            22 * this.modalScale,
            0xffffff,
            0.001
        ).setInteractive({ useHandCursor: true });
        perGameHit.on("pointerdown", () => {
            if (this.drawing) return;
            this.betPerGame = this.betPerGame % 3 + 1;
            this.updateTicket();
        });

        const gamesHit = this.add.rectangle(
            this.toX(253),
            this.toY(152),
            57 * this.modalScale,
            22 * this.modalScale,
            0xffffff,
            0.001
        )
            .setInteractive({ useHandCursor: true });
        gamesHit.on("pointerdown", () => {
            if (this.drawing) return;
            this.numberOfGames = this.numberOfGames % 5 + 1;
            this.updateTicket();
        });

        this.statusText = this.add.text(this.toX(182), this.toY(261), "SELECT 1–10 NUMBERS", {
            fontFamily: "Arial",
            fontSize: "16px",
            fontStyle: "bold",
            color: "#00ff44",
            align: "center",
            wordWrap: { width: 245 }
        }).setOrigin(0.5).setDepth(20);
    }

    makeFieldText(x, y) {
        return this.add.text(x, y, "", {
            fontFamily: "Arial",
            fontSize: "20px",
            fontStyle: "bold",
            color: "#000000"
        }).setOrigin(0.5).setDepth(20);
    }

    createButtons() {
        this.quickPickButton = this.makeButton(
            this.toX(62), this.toY(245), "Quick Pick", () => this.quickPick()
        );
        this.drawButton = this.makeButton(
            this.toX(62), this.toY(276), "Draw", () => this.drawGames()
        );
        this.resetButton = this.makeButton(
            this.toX(302), this.toY(245), "Start Over", () => this.resetTicket()
        );
        this.exitButton = this.makeButton(this.toX(302), this.toY(276), "Exit", () => {
            this.closeModal();
        });
    }

    makeButton(x, y, label, callback) {
        const button = this.add.text(x, y, label, {
            fontFamily: "Arial",
            fontSize: "17px",
            fontStyle: "bold",
            color: "#000000",
            padding: { x: 12, y: 4 }
        }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
        button.on("pointerdown", callback);
        return button;
    }

    toggleNumber(number) {
        if (this.drawing) return;
        this.clearDrawHighlights();
        if (this.selectedNumbers.has(number)) {
            this.selectedNumbers.delete(number);
        } else if (this.selectedNumbers.size < MAX_SPOTS) {
            this.selectedNumbers.add(number);
        } else {
            this.statusText.setText(`MAXIMUM ${MAX_SPOTS} SPOTS`);
            return;
        }
        this.refreshNumberMarks();
        this.updateTicket();
    }

    quickPick() {
        if (this.drawing) return;
        this.clearDrawHighlights();
        const numbers = Phaser.Utils.Array.Shuffle(
            Array.from({ length: 80 }, (_, index) => index + 1)
        );
        const spotCount = this.selectedNumbers.size || DEFAULT_QUICK_PICK_SPOTS;
        this.selectedNumbers = new Set(numbers.slice(0, spotCount));
        this.refreshNumberMarks();
        this.updateTicket();
    }

    resetTicket() {
        if (this.drawing) return;
        this.selectedNumbers.clear();
        this.clearDrawHighlights();
        this.refreshNumberMarks();
        this.statusText.setText("SELECT 1–10 NUMBERS");
        this.updateTicket();
    }

    drawGames() {
        const ticketCost = this.betPerGame * this.numberOfGames;
        const stake = Number(globalThis.STAKE ?? 0);
        if (this.drawing || this.selectedNumbers.size === 0) return;
        if (stake < ticketCost) {
            this.statusText.setText("NOT ENOUGH STAKE");
            return;
        }

        this.drawing = true;
        this.clearDrawHighlights();
        this.setControlsEnabled(false);
        globalThis.STAKE = stake - ticketCost;
        this.updateStakeDisplay();

        this.pendingDraws = Array(this.numberOfGames).fill(null);
        this.currentGameIndex = 0;
        this.totalPayout = 0;
        this.scheduleNextGame();
    }

    scheduleNextGame() {
        const delay = Phaser.Math.Between(MIN_DRAW_INTERVAL_MS, MAX_DRAW_INTERVAL_MS);
        this.nextDrawAt = Date.now() + delay;
        this.updateCountdown();
        this.countdownTimer?.remove(false);
        this.countdownTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => this.updateCountdown()
        });
        this.drawStartTimer = this.time.delayedCall(delay, () => {
            this.countdownTimer?.remove(false);
            this.countdownTimer = null;
            this.playNextGame();
        });
    }

    updateCountdown() {
        const remainingMs = Math.max(0, this.nextDrawAt - Date.now());
        const totalSeconds = Math.ceil(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        const drawNumber = this.currentGameIndex + 1;
        const text = `Keno ${drawNumber}/${this.pendingDraws.length}: ${minutes}:${seconds}`;
        this.statusText.setText(`DRAW ${drawNumber}/${this.pendingDraws.length} IN ${minutes}:${seconds}`);
        this.updateNavbarCountdown(text);
    }

    updateNavbarCountdown(text) {
        globalThis.KENO_COUNTDOWN_TEXT = text;
        if (!this.parentSceneKey) return;
        const parentScene = this.scene.get(this.parentSceneKey);
        parentScene?.navbar?.setKenoCountdown(text);
    }

    playNextGame() {
        this.clearDrawHighlights();
        const displayedDraw = this.drawTwenty();
        let drawIndex = 0;
        this.statusText.setText(
            `DRAW ${this.currentGameIndex + 1}/${this.pendingDraws.length} • DRAWING...`
        );
        this.updateNavbarCountdown(
            `Keno ${this.currentGameIndex + 1}/${this.pendingDraws.length}: Drawing`
        );
        if (this.cache.audio.exists("kenoBell")) this.sound.play("kenoBell");

        this.drawTimer = this.time.addEvent({
            delay: 75,
            repeat: displayedDraw.length - 1,
            callback: () => {
                const number = displayedDraw[drawIndex++];
                const cell = this.numberCells[number];
                const caught = this.selectedNumbers.has(number);
                cell.highlight
                    .setFillStyle(caught ? 0xffd700 : 0x00aa00, 0.58)
                    .setAlpha(1);
                if (caught) cell.mark.setColor("#cc0000");
                if (drawIndex === displayedDraw.length) {
                    this.finishGame(displayedDraw);
                }
            }
        });
    }

    drawTwenty() {
        return Phaser.Utils.Array.Shuffle(
            Array.from({ length: 80 }, (_, index) => index + 1)
        ).slice(0, 20);
    }

    finishGame(displayedDraw) {
        const caught = displayedDraw.filter((number) => this.selectedNumbers.has(number)).length;
        const payout = this.getPayout(
            this.selectedNumbers.size,
            caught,
            this.betPerGame
        );
        this.totalPayout += payout;
        globalThis.STAKE = Number(globalThis.STAKE ?? 0) + payout;
        this.updateStakeDisplay();
        this.statusText.setText(
            `DRAW ${this.currentGameIndex + 1}/${this.pendingDraws.length} • ` +
            `CAUGHT ${caught}/${this.selectedNumbers.size}\n` +
            (payout > 0 ? `WIN $${payout.toLocaleString("en-US")}` : "NO WIN")
        );
        if (payout > 0 && this.cache.audio.exists("kenoWinner")) {
            this.sound.play("kenoWinner");
        }

        this.currentGameIndex++;
        if (this.currentGameIndex < this.pendingDraws.length) {
            this.scheduleNextGame();
        } else {
            this.drawing = false;
            this.statusText.setText(
                `LAST DRAW: ${caught}/${this.selectedNumbers.size}\n` +
                (this.totalPayout > 0
                    ? `TOTAL WIN $${this.totalPayout.toLocaleString("en-US")}`
                    : "NO WIN")
            );
            this.updateNavbarCountdown("Keno: Complete");
            this.setControlsEnabled(true);
            this.updateTicket();
        }
    }

    getPayout(spots, caught, ticketPrice) {
        const basePayout = PAYOUTS[spots]?.[caught] ?? 0;
        return basePayout * ticketPrice;
    }

    refreshNumberMarks() {
        for (let number = 1; number <= 80; number++) {
            const selected = this.selectedNumbers.has(number);
            this.numberCells[number].mark
                .setText(selected ? "X" : "")
                .setColor("#000000");
        }
    }

    clearDrawHighlights() {
        for (let number = 1; number <= 80; number++) {
            this.numberCells[number].highlight.setAlpha(0);
            this.numberCells[number].mark.setColor("#000000");
        }
    }

    updateTicket() {
        const ticketCost = this.betPerGame * this.numberOfGames;
        this.spotsText.setText(`${this.selectedNumbers.size}`);
        this.betText.setText(`$${this.betPerGame}`);
        this.perGameText.setText(`$${this.betPerGame}`);
        this.gamesText.setText(`${this.numberOfGames}`);
        this.totalText.setText(`$${ticketCost}`);
        const canDraw = !this.drawing
            && this.selectedNumbers.size > 0
            && Number(globalThis.STAKE ?? 0) >= ticketCost;
        this.setButtonEnabled(this.drawButton, canDraw);
    }

    setControlsEnabled(enabled) {
        this.setButtonEnabled(this.quickPickButton, enabled);
        this.setButtonEnabled(this.resetButton, enabled);
        this.setButtonEnabled(this.exitButton, true);
        if (!enabled) this.setButtonEnabled(this.drawButton, false);
        for (let number = 1; number <= 80; number++) {
            if (enabled) this.numberCells[number].hit.setInteractive({ useHandCursor: true });
            else this.numberCells[number].hit.disableInteractive();
        }
    }

    setButtonEnabled(button, enabled) {
        button.setColor(enabled ? "#000000" : "#777777");
        if (enabled) button.setInteractive({ useHandCursor: true });
        else button.disableInteractive();
    }
}

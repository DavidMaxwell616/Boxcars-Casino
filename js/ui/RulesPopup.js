export class RulesPopup {
    constructor(scene, {
        title,
        leftText,
        rightText,
        leftFontSize = 14,
        rightFontSize = 13,
        onClose
    }) {
        this.scene = scene;
        this.onClose = onClose;
        this.isOpen = false;
        this.container = scene.add.container(0, 0).setDepth(2000).setVisible(false);

        const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.72)
            .setInteractive();
        const panel = scene.add.graphics();
        panel.fillStyle(0x006f00, 1).fillRect(82, 72, 636, 474);
        panel.lineStyle(3, 0xffffff, 1).strokeRect(82, 72, 636, 474);
        panel.lineStyle(2, 0xd8d088, 1).strokeRect(88, 78, 624, 462);

        const heading = scene.add.text(400, 94, title, {
            fontFamily: "Arial",
            fontSize: "28px",
            fontStyle: "bold",
            color: "#ffff00"
        }).setOrigin(0.5);
        const left = scene.add.text(112, 130, leftText, {
            fontFamily: "Arial",
            fontSize: `${leftFontSize}px`,
            color: "#ffffff",
            lineSpacing: 4,
            wordWrap: { width: 365 }
        });
        const right = scene.add.text(505, 130, rightText, {
            fontFamily: "Arial",
            fontSize: `${rightFontSize}px`,
            fontStyle: "bold",
            color: "#ffffff",
            lineSpacing: 3,
            wordWrap: { width: 180 }
        });
        const closeButton = scene.add.text(400, 514, "Close", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#000000",
            backgroundColor: "#c0c0c0",
            padding: { x: 24, y: 7 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeButton.on("pointerdown", (pointer, localX, localY, event) => {
            event?.stopPropagation();
            this.close();
        });

        this.container.add([overlay, panel, heading, left, right, closeButton]);
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.container.setVisible(true);
        this.scene.time.paused = true;
        this.scene.tweens.pauseAll();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.container.setVisible(false);
        this.scene.time.paused = false;
        this.scene.tweens.resumeAll();
        this.onClose?.();
    }
}

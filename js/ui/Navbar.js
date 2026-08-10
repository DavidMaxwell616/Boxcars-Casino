import { navbarOptions } from "../config.js";

export class Navbar {
    static textureKey = "sharedNavbar";

    static preload(scene) {
        if (!scene.textures.exists(Navbar.textureKey)) {
            scene.load.image(Navbar.textureKey, "assets/images/navbar.png");
        }
    }

    constructor(scene, { onOption } = {}) {
        this.scene = scene;
        this.onOption = onOption;
        this.image = scene.add.image(0, 0, Navbar.textureKey)
            .setOrigin(0, 0)
            .setDepth(1000);
        this.height = this.image.displayHeight;

        this.optionButtons = navbarOptions.map((item) => {
            const button = scene.add.text(item.x, item.y, item.text, {
                fontSize: "18px",
                fontFamily: "Tahoma",
                color: "#000000"
            })
                .setPadding(10)
                .setDepth(1001)
                .setInteractive({ useHandCursor: true });

            button.on("pointerdown", () => {
                this.scene.events.emit("navbar-option", item.text);
                this.onOption?.(item.text);
                if (item.text === "Keno" && this.scene.scene.key !== "KENO") {
                    if (!this.scene.scene.isActive("KENO")) {
                        this.scene.scene.launch("KENO", {
                            parentSceneKey: this.scene.scene.key
                        });
                        this.scene.scene.pause();
                    } else {
                        const kenoScene = this.scene.scene.get("KENO");
                        kenoScene?.openFrom(this.scene.scene.key);
                    }
                }
            });

            return button;
        });

        this.gamblerText = scene.add.text(420, 46, "", {
            fontSize: "16px",
            fontFamily: "Tahoma",
            fontStyle: "bold",
            color: "#000000"
        }).setOrigin(0.5).setDepth(1001);

        this.stakeText = scene.add.text(680, 46, "", {
            fontSize: "16px",
            fontFamily: "Tahoma",
            fontStyle: "bold",
            color: "#000000"
        }).setOrigin(0.5).setDepth(1001);

        this.kenoCountdownText = scene.add.text(285, 25, "", {
            fontSize: "15px",
            fontFamily: "Tahoma",
            fontStyle: "bold",
            color: "#000080"
        }).setOrigin(0, 0.5).setDepth(1001);

        this.refreshAccount();
    }

    setGambler(name) {
        this.gamblerText.setText(`Gambler: ${name || "None"}`);
    }

    setStake(value) {
        this.stakeText.setText(`Stake: ${this.formatDollars(value)}`);
    }

    setKenoCountdown(value) {
        this.kenoCountdownText.setText(value || "");
    }

    refreshAccount() {
        this.setGambler(GAMBLER_NAME);
        this.setStake(STAKE ?? 0);
        this.setKenoCountdown(KENO_COUNTDOWN_TEXT ?? "");
    }

    formatDollars(value) {
        return Number(value).toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
    }
}

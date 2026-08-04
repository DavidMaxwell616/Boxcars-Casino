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

        this.refreshAccount();
    }

    setGambler(name) {
        this.gamblerText.setText(`Gambler: ${name || "None"}`);
    }

    setStake(value) {
        this.stakeText.setText(`Stake: ${this.formatDollars(value)}`);
    }

    refreshAccount() {
        this.setGambler(globalThis.GAMBLER_NAME);
        this.setStake(globalThis.STAKE ?? 0);
    }

    formatDollars(value) {
        return Number(value).toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
    }
}


import { menuButtons } from "../config.js";

export default class HubScene extends Phaser.Scene {
    constructor() { super("Hub"); }
    preload() {
        this.load.path = '../assets/images/';
        this.load.image('menu', 'menu.png');
        this.load.image('bank', 'bank.png');
        this.load.image('navBar', 'navbar.png');
    }

    create() {
        globalThis.STAKE ??= 0;

        this.navBar = this.add.image(0, 0, 'navBar').setOrigin(0, 0);
        this.menu = this.add.image(0, this.navBar.height, 'menu').setOrigin(0, 0);

        globalThis.GAMBLER_NAME ??= "";
        this.add.text(
            300,
            this.navBar.height + 17,
            `Gambler: ${globalThis.GAMBLER_NAME || "None"}`,
            {
                fontSize: '18px',
                fontFamily: 'Tahoma',
                fontStyle: 'bold',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        this.add.text(
            650,
            this.navBar.height + 17,
            `Stake: ${this.formatDollars(globalThis.STAKE)}`,
            {
                fontSize: '18px',
                fontFamily: 'Tahoma',
                fontStyle: 'bold',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        this.buttons = this.add.group();
        this.noMoneyMessage = this.add.text(
            this.scale.width * .55,
            76,
            "YOU NEED MONEY TO GAMBLE, IDIOT",
            {
                fontSize: '32px',
                fontFamily: 'Tahoma',
                fontStyle: 'bold',
                color: '#ff0000',
                stroke: '#000000',
                strokeThickness: 6
            }
        )
            .setOrigin(0.5)
            .setDepth(1000)
            .setVisible(false);

        menuButtons.forEach(item => {
            const button = this.add.text(item.x, item.y, item.text, {
                fontSize: '18px',
                fontFamily: 'Tahoma',
                color: '#000000',
            })
                .setPadding(10)
                .setInteractive({ useHandCursor: true });

            button.on('pointerdown', () => {
                if (item.text !== "BANK" && globalThis.STAKE <= 0) {
                    this.showNoMoneyMessage();
                    return;
                }

                this.menu.visible = false;
                this.scene.start(button.text);
            });

            this.buttons.add(button);
        });
    }

    showNoMoneyMessage() {
        this.noMoneyMessage.setVisible(true);

        if (this.noMoneyTimer) {
            this.noMoneyTimer.remove(false);
        }

        this.noMoneyTimer = this.time.delayedCall(2000, () => {
            this.noMoneyMessage.setVisible(false);
            this.noMoneyTimer = null;
        });
    }

    formatDollars(value) {
        return Number(value).toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
    }
}

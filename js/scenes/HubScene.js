
import { SOUNDS, menuButtons } from "../config.js";
import { Navbar } from "../ui/Navbar.js";
const soundFiles = [];

export default class HubScene extends Phaser.Scene {
    constructor() {
        super("Hub");


    }
    preload() {
        this.load.image('menu', 'assets/images/menu.png');
        this.load.image('bank', 'assets/images/bank.png');
        SOUNDS.forEach((sound) => {
            const path = './assets/sounds/' + sound + '.WAV';
            this.load.audio(sound, path);
            soundFiles.push(sound);
        });
        Navbar.preload(this);
    }

    create() {
        this.navbar = new Navbar(this);
        this.menu = this.add.image(0, this.navbar.height, 'menu').setOrigin(0, 0);

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

        // Bounds of the button faces in menu.png, before the navbar offset.
        const buttonBounds = [
            [6, 3, 90, 26],
            [62, 240, 156, 30],
            [324, 240, 156, 30],
            [585, 240, 156, 30],
            [62, 486, 156, 30],
            [324, 486, 156, 30],
            [585, 486, 156, 30]
        ];
        menuButtons.slice(3).forEach((item, index) => {
            const button = this.add.text(item.x, item.y, item.text, {
                fontSize: '18px',
                fontFamily: 'Tahoma',
                color: '#000000',
            })
                .setPadding(10);

            const [x, y, width, height] = buttonBounds[index];
            const hitZone = this.add.zone(x, this.navbar.height + y, width, height)
                .setOrigin(0, 0)
                .setInteractive({ useHandCursor: true });

            hitZone.on('pointerdown', () => {
                if (item.text !== "BANK" && STAKE <= 0) {
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

}

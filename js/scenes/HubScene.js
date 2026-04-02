
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
        this.navBar = this.add.image(0, 0, 'navBar').setOrigin(0, 0);
        this.menu = this.add.image(0, this.navBar.height, 'menu').setOrigin(0, 0);

        this.buttons = this.add.group();

        menuButtons.forEach(item => {
            const button = this.add.text(item.x, item.y, item.text, {
                fontWeight: 'bold',
                fontSize: '18px',
                color: '#000000',
            })
                .setPadding(10)
                .setInteractive({ useHandCursor: true });

            button.on('pointerdown', () => {
                console.log(`${label} clicked`);
            });
            this.buttons.add(button);
        });
    }
}
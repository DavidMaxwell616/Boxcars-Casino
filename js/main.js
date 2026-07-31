import { SplashScene } from "./scenes/SplashScene.js";
import HubScene from "./scenes/HubScene.js";
import { BlackjackScene } from "./scenes/BlackJackScene.js";
import { BankScene } from "./scenes/BankScene.js";

const config = {
    type: Phaser.AUTO,
    parent: "game",
    width: 800,
    height: 600,
    dom: {
        createContainer: true
    },
    scene: [
        SplashScene,
        HubScene,
        BlackjackScene,
        BankScene
    ]
};

new Phaser.Game(config);

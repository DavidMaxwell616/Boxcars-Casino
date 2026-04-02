import { SplashScene } from "./scenes/SplashScene.js";
import HubScene from "./scenes/HubScene.js";
import { BlackjackScene } from "./scenes/BlackJackScene.js";

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [
        SplashScene,
        HubScene,
        BlackjackScene
    ]
};

new Phaser.Game(config);

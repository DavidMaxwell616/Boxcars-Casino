import { SplashScene } from "./scenes/SplashScene.js";
import HubScene from "./scenes/HubScene.js";
import { BlackjackScene } from "./scenes/BlackJackScene.js";
import { BankScene } from "./scenes/BankScene.js";
import { RouletteScene } from "./scenes/RouletteScene.js";
import { CrapsScene } from "./scenes/CrapsScene.js";
import { SlotsScene } from "./scenes/SlotsScene.js";
import { PokerScene } from "./scenes/PokerScene.js";
import { BaccaratScene } from "./scenes/BaccaratScene.js";
import { KenoScene } from "./scenes/KenoScene.js";

const config = {
    type: Phaser.AUTO,
    parent: "game",
    width: 800,
    height: 600,
    // Keep scene coordinates and DOM forms aligned while fitting any viewport.
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    dom: {
        createContainer: true
    },
    scene: [
        SplashScene,
        HubScene,
        BlackjackScene,
        BankScene,
        RouletteScene,
        CrapsScene,
        SlotsScene,
        PokerScene,
        BaccaratScene,
        KenoScene
    ]
};

new Phaser.Game(config);

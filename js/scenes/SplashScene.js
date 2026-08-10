
export class SplashScene extends Phaser.Scene {
    constructor() {
        super("Splash");
    }
    preload() {
        this.load.spritesheet('splash', './assets/images/splash2.png', { frameWidth: 800, frameHeight: 600 });
        this.load.image('maxxdaddy', './assets/images/maxxdaddy.gif');

    }


    create() {
        this.splash = this.add.sprite(0, 0, 'splash').setOrigin(0, 0);
        this.splash.on('pointerdown', function (pointer) {
            SetSplashState(pointer);
        });
        this.anims.create({
            key: "splash",
            frames: this.anims.generateFrameNumbers("splash",
                {
                    start: 0,
                    end: 1
                }),
            frameRate: 8,
            repeat: -1,
        });
        this.splash.anims.play('splash', true);
        this.maxxdaddy = this.add.image(this.game.config.width * 0.9,
            this.game.config.height * .95, 'maxxdaddy');
        this.input.on('pointerdown', () => {
            this.start(this);
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.start(this);
        });
    }
    start(scene) {
        scene.maxxdaddy.visible = false;
        scene.splash.visible = false;
        //  beep(this, 660, 0.05, "square", 0.04);
        scene.scene.start("Hub");

    }

}


const config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    parent: 'canvas',
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    dom: {
        createContainer: true
    },
    callbacks: {
        postBoot: function (game) {
            window.addEventListener("resize", () => {
                game.scale.resize(window.innerWidth, window.innerHeight);
            });
        }
    }
};

const screenWidth = window.innerWidth * window.devicePixelRatio;
const screenHeight = window.innerHeight * window.devicePixelRatio;
const game = new Phaser.Game(config);
var scene;

function create() {
    scene = this;
    if (!startGame) splashCreate(scene, game);
    else gameCreate();
}

function gameCreate() {
    menuMode = true;
    navBar = scene.add.image(0, 0, 'navBar').setOrigin(0, 0);
    menu = scene.add.image(0, navBar.height, 'menu').setOrigin(0, 0);
    menuButtons.forEach(button => {
        const newButton = scene.add.text(button.x, button.y, button.text, { fill: '##000', fontSize: '26px', fontFamily: 'Arial', fontWeight: 'Bold' });
        newButton.setInteractive();
        newButton.on('pointerdown', () => {
            changeMode(button.text);
        })
    });
};
function changeMode(mode) {
    switch (mode) {
        case 'Bank':
            menu.x += 100;
            break;

        default:
            break;
    }
};
function update() {
}

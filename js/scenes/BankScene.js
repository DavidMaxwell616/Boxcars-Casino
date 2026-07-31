let new_stake = 0;
let new_gambler_name = "";

export class BankScene extends Phaser.Scene {
    constructor() {
        super("BANK");
    }

    preload() {
        this.load.image("bankBackground", "assets/images/bank.png");
        this.load.image("newPlayer", "assets/images/new player.png");
        this.load.image("bankNavBar", "assets/images/navbar.png");
    }

    create() {
        const navBar = this.add.image(0, 0, "bankNavBar").setOrigin(0, 0);
        this.add.image(0, navBar.height, "bankBackground").setOrigin(0, 0);

        globalThis.GAMBLER_NAME ??= "";
        globalThis.STAKE ??= 0;
        this.gamblerNameText = this.add.text(
            290,
            navBar.height + 104,
            globalThis.GAMBLER_NAME,
            {
                fontFamily: "Arial, sans-serif",
                fontSize: "18px",
                color: "#000000"
            }
        );
        this.stakeText = this.add.text(
            590,
            navBar.height + 104,
            this.formatDollars(globalThis.STAKE),
            {
                fontFamily: "Arial, sans-serif",
                fontSize: "18px",
                color: "#000000"
            }
        );

        // The controls are part of bank.png, so transparent zones make them clickable.
        const newGamblerButton = this.add.zone(20, navBar.height + 148, 225, 35)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        newGamblerButton.on("pointerdown", () => {
            this.showNewGambler();
        });

        const returnButton = this.add.zone(20, navBar.height + 409, 225, 35)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        returnButton.on("pointerdown", () => {
            this.scene.start("Hub");
        });
    }

    showNewGambler() {
        if (this.newGamblerWindow) {
            new_stake = globalThis.STAKE;
            new_gambler_name = globalThis.GAMBLER_NAME;
            this.bankDepositInput.node.value = String(new_stake);
            this.newGamblerNameInput.node.value = new_gambler_name;
            this.newGamblerWindow.setVisible(true);
            this.newGamblerNameInput.setVisible(true);
            this.bankDepositInput.setVisible(true);
            this.newGamblerOkButton.setVisible(true);
            this.newGamblerCancelButton.setVisible(true);
            this.newGamblerCloseButton.setVisible(true);
            this.children.bringToTop(this.newGamblerWindow);
            this.children.bringToTop(this.newGamblerNameInput);
            this.children.bringToTop(this.bankDepositInput);
            this.children.bringToTop(this.newGamblerOkButton);
            this.children.bringToTop(this.newGamblerCancelButton);
            this.children.bringToTop(this.newGamblerCloseButton);
            this.newGamblerNameInput.node.focus();
            return;
        }

        this.newGamblerWindow = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2,
            "newPlayer"
        ).setOrigin(0.5).setScale(2);

        const windowLeft = this.newGamblerWindow.x - this.newGamblerWindow.displayWidth / 2;
        const windowTop = this.newGamblerWindow.y - this.newGamblerWindow.displayHeight / 2;

        this.newGamblerNameInput = this.add.dom(
            windowLeft + 20,
            windowTop + 98,
            "input",
            {
                width: "332px",
                height: "44px",
                padding: "2px 6px",
                border: "2px solid #222222",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#000000",
                fontFamily: "Arial, sans-serif",
                fontSize: "26px",
                outline: "3px solid #000000",
                outlineOffset: "-3px"
            }
        ).setOrigin(0, 0);

        this.newGamblerNameInput.node.type = "text";
        this.newGamblerNameInput.node.maxLength = 30;
        this.newGamblerNameInput.node.setAttribute("aria-label", "New Gambler's Name");
        new_gambler_name = globalThis.GAMBLER_NAME;
        this.newGamblerNameInput.node.value = new_gambler_name;
        this.newGamblerNameInput.node.addEventListener("input", (event) => {
            new_gambler_name = event.target.value;
        });
        this.newGamblerNameInput.node.focus();

        new_stake = globalThis.STAKE;

        this.bankDepositInput = this.add.dom(
            windowLeft + 20,
            windowTop + 190,
            "input",
            {
                width: "332px",
                height: "44px",
                padding: "2px 6px",
                border: "2px solid #222222",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#000000",
                fontFamily: "Arial, sans-serif",
                fontSize: "26px",
                outline: "3px solid #000000",
                outlineOffset: "-3px"
            }
        ).setOrigin(0, 0);

        this.bankDepositInput.node.type = "number";
        this.bankDepositInput.node.min = "0";
        this.bankDepositInput.node.step = "0.01";
        this.bankDepositInput.node.value = String(new_stake);
        this.bankDepositInput.node.setAttribute("aria-label", "Bank Deposit");
        this.bankDepositInput.node.addEventListener("input", (event) => {
            const deposit = event.target.valueAsNumber;
            new_stake = Number.isFinite(deposit) ? deposit : 0;
        });

        this.newGamblerOkButton = this.add.zone(
            windowLeft + 26,
            windowTop + 356,
            118,
            40
        )
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        this.newGamblerOkButton.on("pointerdown", () => {
            globalThis.STAKE = new_stake;
            globalThis.GAMBLER_NAME = new_gambler_name;
            this.gamblerNameText.setText(globalThis.GAMBLER_NAME);
            this.stakeText.setText(this.formatDollars(globalThis.STAKE));
            this.hideNewGambler();
        });

        this.newGamblerCancelButton = this.add.zone(
            windowLeft + 226,
            windowTop + 356,
            118,
            40
        )
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        this.newGamblerCancelButton.on("pointerdown", () => {
            new_stake = globalThis.STAKE;
            new_gambler_name = globalThis.GAMBLER_NAME;
            this.hideNewGambler();
        });

        this.newGamblerCloseButton = this.add.zone(
            windowLeft + 338,
            windowTop + 6,
            32,
            30
        )
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        this.newGamblerCloseButton.on("pointerdown", () => {
            new_stake = globalThis.STAKE;
            new_gambler_name = globalThis.GAMBLER_NAME;
            this.hideNewGambler();
        });
    }

    hideNewGambler() {
        this.newGamblerWindow.setVisible(false);
        this.newGamblerNameInput.setVisible(false);
        this.bankDepositInput.setVisible(false);
        this.newGamblerOkButton.setVisible(false);
        this.newGamblerCancelButton.setVisible(false);
        this.newGamblerCloseButton.setVisible(false);
    }

    formatDollars(value) {
        return Number(value).toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
    }
}

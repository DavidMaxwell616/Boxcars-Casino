import { Navbar } from "../ui/Navbar.js";

let new_bank_balance = 0;
let new_gambler_name = "";

export class BankScene extends Phaser.Scene {
    constructor() {
        super("BANK");
    }

    preload() {
        this.load.image("bankBackground", "assets/images/bank.png");
        this.load.image("newPlayer", "assets/images/new player.png");
        this.load.image("changeStake", "assets/images/stakes.png");
        Navbar.preload(this);
    }

    create() {
        // Scene restarts destroy display/DOM objects but retain this scene instance.
        // Clear modal references so subsequent opens create fresh controls.
        this.newGamblerWindow = null;
        this.newGamblerNameInput = null;
        this.bankDepositInput = null;
        this.newGamblerOkButton = null;
        this.newGamblerCancelButton = null;
        this.newGamblerCloseButton = null;
        this.changeStakeWindow = null;
        this.changeStakeInput = null;
        this.changeStakeOkButton = null;
        this.changeStakeCancelButton = null;
        this.stakeMessageBlocker = null;
        this.stakeTooHighMessage = null;
        this.stakeTooHighTimer = null;

        globalThis.GAMBLER_NAME ??= "";
        globalThis.STAKE ??= 0;
        globalThis.BANK_BALANCE ??= 0;
        this.navbar = new Navbar(this);
        const navBarHeight = this.navbar.height;
        this.add.image(0, navBarHeight, "bankBackground").setOrigin(0, 0);
        this.gamblerNameText = this.add.text(
            290,
            navBarHeight + 104,
            globalThis.GAMBLER_NAME,
            {
                fontFamily: "Arial, sans-serif",
                fontSize: "18px",
                color: "#000000"
            }
        );
        this.bankBalanceText = this.add.text(
            590,
            navBarHeight + 104,
            this.formatDollars(globalThis.BANK_BALANCE),
            {
                fontFamily: "Arial, sans-serif",
                fontSize: "18px",
                color: "#000000"
            }
        );

        this.sideStakeText = this.add.text(
            20,
            navBarHeight + 246,
            `Stake: ${this.formatDollars(globalThis.STAKE)}`,
            {
                fontFamily: "Arial, sans-serif",
                fontSize: "22px",
                fontStyle: "bold",
                color: "#43a832"
            }
        );

        // The controls are part of bank.png, so transparent zones make them clickable.
        this.changeStakeButton = this.add.zone(20, navBarHeight + 96, 225, 35)
            .setOrigin(0, 0);

        this.changeStakeButton.on("pointerdown", () => {
            this.showChangeStake();
        });

        this.changeStakeButtonLabel = this.add.text(
            132,
            navBarHeight + 113,
            "Change Stake",
            {
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "22px",
                fontStyle: "bold",
                color: "#000000"
            }
        ).setOrigin(0.5);

        this.updateChangeStakeButtonState();

        const newGamblerButton = this.add.zone(20, navBarHeight + 148, 225, 35)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        newGamblerButton.on("pointerdown", () => {
            this.showNewGambler();
        });

        const returnButton = this.add.zone(20, navBarHeight + 409, 225, 35)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        returnButton.on("pointerdown", () => {
            this.scene.start("Hub");
        });
    }

    showNewGambler() {
        if (this.newGamblerWindow) {
            new_bank_balance = globalThis.BANK_BALANCE;
            new_gambler_name = globalThis.GAMBLER_NAME;
            this.bankDepositInput.node.value = String(new_bank_balance);
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

        new_bank_balance = globalThis.BANK_BALANCE;

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
        this.bankDepositInput.node.value = String(new_bank_balance);
        this.bankDepositInput.node.setAttribute("aria-label", "Bank Deposit");
        this.bankDepositInput.node.addEventListener("input", (event) => {
            const deposit = event.target.valueAsNumber;
            new_bank_balance = Number.isFinite(deposit) ? deposit : 0;
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
            if (!Number.isFinite(new_bank_balance) || new_bank_balance < 0) return;

            globalThis.BANK_BALANCE = new_bank_balance;
            globalThis.STAKE = 0;
            globalThis.GAMBLER_NAME = new_gambler_name;
            this.gamblerNameText.setText(globalThis.GAMBLER_NAME);
            this.bankBalanceText.setText(this.formatDollars(globalThis.BANK_BALANCE));
            this.sideStakeText.setText(`Stake: ${this.formatDollars(globalThis.STAKE)}`);
            this.navbar.refreshAccount();
            this.updateChangeStakeButtonState();
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
            new_bank_balance = globalThis.BANK_BALANCE;
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
            new_bank_balance = globalThis.BANK_BALANCE;
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

    updateChangeStakeButtonState() {
        const enabled = Number(globalThis.BANK_BALANCE) > 0;

        if (enabled) {
            this.changeStakeButton.setInteractive({ useHandCursor: true });
        } else {
            this.changeStakeButton.disableInteractive();
        }

        this.changeStakeButtonLabel
            .setVisible(true)
            .setColor(enabled ? "#000000" : "#7f7f7f");
    }

    showChangeStake() {
        if (Number(globalThis.BANK_BALANCE) <= 0) return;

        if (this.changeStakeWindow && this.changeStakeInput?.node) {
            this.changeStakeInput.node.value = String(globalThis.STAKE);
            this.changeStakeInput.node.max = String(globalThis.BANK_BALANCE);
            this.changeStakeWindow.setVisible(true);
            this.changeStakeInput.setVisible(true);
            this.changeStakeOkButton.setVisible(true);
            this.changeStakeCancelButton.setVisible(true);
            this.children.bringToTop(this.changeStakeWindow);
            this.children.bringToTop(this.changeStakeInput);
            this.children.bringToTop(this.changeStakeOkButton);
            this.children.bringToTop(this.changeStakeCancelButton);
            this.changeStakeInput.node.focus();
            return;
        }

        this.changeStakeWindow = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2,
            "changeStake"
        ).setOrigin(0.5);

        const windowLeft = this.changeStakeWindow.x - this.changeStakeWindow.displayWidth / 2;
        const windowTop = this.changeStakeWindow.y - this.changeStakeWindow.displayHeight / 2;

        this.changeStakeInput = this.add.dom(
            windowLeft + 29,
            windowTop + 271,
            "input",
            {
                width: "422px",
                height: "55px",
                padding: "4px 8px",
                border: "2px solid #557755",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#000000",
                fontFamily: "Arial, sans-serif",
                fontSize: "26px"
            }
        ).setOrigin(0, 0);

        this.changeStakeInput.node.type = "number";
        this.changeStakeInput.node.min = "0";
        this.changeStakeInput.node.max = String(globalThis.BANK_BALANCE);
        this.changeStakeInput.node.step = "0.01";
        this.changeStakeInput.node.value = String(globalThis.STAKE);
        this.changeStakeInput.node.setAttribute("aria-label", "New Stake");

        this.changeStakeOkButton = this.add.zone(
            windowLeft + 38,
            windowTop + 365,
            150,
            50
        )
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        this.changeStakeOkButton.on("pointerdown", () => {
            const stake = this.changeStakeInput.node.valueAsNumber;
            if (!Number.isFinite(stake) || stake < 0) return;

            if (stake > globalThis.BANK_BALANCE) {
                this.showStakeTooHighMessage();
                return;
            }

            globalThis.STAKE = stake;
            globalThis.BANK_BALANCE -= stake;
            this.scene.restart();
        });

        this.changeStakeCancelButton = this.add.zone(
            windowLeft + 292,
            windowTop + 365,
            151,
            50
        )
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        this.changeStakeCancelButton.on("pointerdown", () => {
            this.hideChangeStake();
        });

        this.changeStakeInput.node.focus();
    }

    hideChangeStake() {
        this.changeStakeWindow.setVisible(false);
        this.changeStakeInput.setVisible(false);
        this.changeStakeOkButton.setVisible(false);
        this.changeStakeCancelButton.setVisible(false);
    }

    showStakeTooHighMessage() {
        this.hideChangeStake();

        if (!this.stakeTooHighMessage) {
            this.stakeMessageBlocker = this.add.zone(
                0,
                0,
                this.scale.width,
                this.scale.height
            )
                .setOrigin(0, 0)
                .setDepth(1999)
                .setInteractive();

            this.stakeTooHighMessage = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                "STAKE MUST BE LOWER THAN BALANCE, MORON!",
                {
                    fontFamily: "Arial, sans-serif",
                    fontSize: "28px",
                    fontStyle: "bold",
                    color: "#ff0000",
                    stroke: "#000000",
                    strokeThickness: 5
                }
            )
                .setOrigin(0.5)
                .setDepth(2000);
        } else {
            this.stakeMessageBlocker.setVisible(true).setInteractive();
            this.stakeTooHighMessage.setVisible(true);
        }

        if (this.stakeTooHighTimer) {
            this.stakeTooHighTimer.remove(false);
        }

        this.stakeTooHighTimer = this.time.delayedCall(2000, () => {
            this.stakeTooHighMessage.setVisible(false);
            this.stakeMessageBlocker.setVisible(false).disableInteractive();
            this.stakeTooHighTimer = null;
            this.showChangeStake();
        });
    }

    formatDollars(value) {
        return Number(value).toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
    }
}

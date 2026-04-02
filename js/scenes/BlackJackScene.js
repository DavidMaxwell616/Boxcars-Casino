export class BlackjackScene extends Phaser.Scene {
    constructor() {
        super("Blackjack");
    }

    create() {
        this.deck = [];
        this.player = [];
        this.dealer = [];
        this.balance = 500;
        this.bet = 10;

        this.createDeck();

        this.add.rectangle(400, 300, 800, 600, 0x0b5c0b);

        this.infoText = this.add.text(620, 20, "", { fontSize: "18px", color: "#fff" });
        this.messageText = this.add.text(300, 260, "", { fontSize: "22px", color: "#fff" });

        this.playerText = this.add.text(100, 420, "", { fontSize: "20px", color: "#fff" });
        this.dealerText = this.add.text(100, 100, "", { fontSize: "20px", color: "#fff" });

        this.createButtons();

        this.updateUI();
    }

    createButtons() {
        this.hitBtn = this.createButton(100, 500, "HIT", () => this.hit());
        this.standBtn = this.createButton(200, 500, "STAND", () => this.stand());
        this.dealBtn = this.createButton(320, 500, "DEAL", () => this.deal());
    }

    createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: "20px",
            backgroundColor: "#333",
            padding: { x: 10, y: 5 }
        })
            .setInteractive()
            .on("pointerdown", callback);

        return btn;
    }

    createDeck() {
        const suits = ["♠", "♥", "♦", "♣"];
        const values = [
            { name: "A", val: 11 },
            { name: "2", val: 2 },
            { name: "3", val: 3 },
            { name: "4", val: 4 },
            { name: "5", val: 5 },
            { name: "6", val: 6 },
            { name: "7", val: 7 },
            { name: "8", val: 8 },
            { name: "9", val: 9 },
            { name: "10", val: 10 },
            { name: "J", val: 10 },
            { name: "Q", val: 10 },
            { name: "K", val: 10 }
        ];

        this.deck = [];
        suits.forEach(s => {
            values.forEach(v => {
                this.deck.push({ suit: s, name: v.name, val: v.val });
            });
        });

        Phaser.Utils.Array.Shuffle(this.deck);
    }

    dealCard(hand) {
        hand.push(this.deck.pop());
    }

    deal() {
        this.createDeck();
        this.player = [];
        this.dealer = [];
        this.messageText.setText("");

        this.dealCard(this.player);
        this.dealCard(this.player);
        this.dealCard(this.dealer);
        this.dealCard(this.dealer);

        this.updateUI();
    }

    hit() {
        this.dealCard(this.player);
        if (this.getTotal(this.player) > 21) {
            this.endGame("Player Busts!");
        }
        this.updateUI();
    }

    stand() {
        while (this.getTotal(this.dealer) < 17) {
            this.dealCard(this.dealer);
        }

        const p = this.getTotal(this.player);
        const d = this.getTotal(this.dealer);

        if (d > 21 || p > d) this.endGame("Player Wins!");
        else if (p < d) this.endGame("Dealer Wins!");
        else this.endGame("Push");

        this.updateUI();
    }

    getTotal(hand) {
        let total = 0;
        let aces = 0;

        hand.forEach(c => {
            total += c.val;
            if (c.name === "A") aces++;
        });

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    endGame(msg) {
        this.messageText.setText(msg);
    }

    formatHand(hand) {
        return hand.map(c => c.name + c.suit).join(" ");
    }

    updateUI() {
        this.playerText.setText(
            "Player: " + this.formatHand(this.player) +
            " (" + this.getTotal(this.player) + ")"
        );

        this.dealerText.setText(
            "Dealer: " + this.formatHand(this.dealer) +
            " (" + this.getTotal(this.dealer) + ")"
        );

        this.infoText.setText(
            "$" + this.bet + "\n$" + this.balance
        );
    }
}

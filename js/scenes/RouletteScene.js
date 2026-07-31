<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Phaser Roulette</title>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.js"></script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #0b0b0b;
      overflow: hidden;
      height: 100%;
    }
    #game {
      width: 100vw;
      height: 100vh;
    }
    canvas {
      display: block;
      margin: 0 auto;
      image-rendering: pixelated;
    }
  </style>
</head>
<body>
  <div id="game"></div>

  <script>
    class RouletteScene extends Phaser.Scene {
      constructor() {
        super("RouletteScene");

        this.balance = 500;
        this.currentChipValue = 10;
        this.bets = [];
        this.betMap = new Map();
        this.resultNumber = null;
        this.isSpinning = false;

        this.redNumbers = new Set([
          1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
        ]);
      }

      create() {
        this.cameras.main.setBackgroundColor("#008400");

        this.drawWindowChrome();
        this.drawHUD();
        this.createWheel();
        this.createBoard();
        this.createControls();
        this.refreshHUD();
      }

      drawWindowChrome() {
        const w = this.scale.width;
        const top = this.add.graphics();

        top.fillStyle(0x1f43b8, 1);
        top.fillRect(0, 0, w, 24);

        top.fillStyle(0xbfc8d6, 1);
        top.fillRect(0, 24, w, 20);

        this.add.text(8, 3, "Roulette", {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#ffffff"
        });

        this.add.text(8, 26, "(A)   File   Options   Keno", {
          fontFamily: "Arial",
          fontSize: "12px",
          color: "#000000"
        });
      }

      drawHUD() {
        this.hudResult = this.add.text(8, 50, "29", {
          fontFamily: "Arial Black, Arial",
          fontSize: "30px",
          color: "#000000"
        });

        this.moneyPanel = this.add.rectangle(606, 57, 56, 34, 0x000000).setOrigin(0, 0);
        this.hudBalance = this.add.text(612, 44, "$500", {
          fontFamily: "Arial Black, Arial",
          fontSize: "20px",
          color: "#ffffff",
          align: "right"
        });

        this.hudChipValue = this.add.text(252, 318, "10", {
          fontFamily: "Arial Black, Arial",
          fontSize: "26px",
          color: "#ffffff",
          stroke: "#2b1db6",
          strokeThickness: 8
        }).setOrigin(0.5);
      }

      createWheel() {
        const cx = 320;
        const cy = 175;
        const container = this.add.container(cx, cy);

        const bg = this.add.graphics();
        bg.fillStyle(0x0d7f00, 1);
        bg.lineStyle(1, 0x003d00, 1);
        bg.fillRect(-135, -95, 270, 190);
        bg.strokeRect(-135, -95, 270, 190);
        container.add(bg);

        const wheel = this.add.container(0, 0);
        this.wheelContainer = wheel;

        const outer = this.add.circle(0, 0, 78, 0x050505);
        wheel.add(outer);

        const rim = this.add.graphics();
        rim.lineStyle(8, 0x101010, 1);
        rim.strokeCircle(0, 0, 73);
        wheel.add(rim);

        const pockets = [
          0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27,
          13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1,
          20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
        ];

        for (let i = 0; i < pockets.length; i++) {
          const angle1 = Phaser.Math.DegToRad(-90 + (i * 360 / pockets.length));
          const angle2 = Phaser.Math.DegToRad(-90 + ((i + 1) * 360 / pockets.length));
          const num = pockets[i];
          const color = num === 0 ? 0x00a43a : (this.redNumbers.has(num) ? 0xc92121 : 0x111111);

          const slice = this.add.graphics();
          slice.fillStyle(color, 1);
          slice.beginPath();
          slice.moveTo(0, 0);
          slice.arc(0, 0, 67, angle1, angle2, false);
          slice.closePath();
          slice.fillPath();
          wheel.add(slice);

          const mid = (angle1 + angle2) / 2;
          const tx = Math.cos(mid) * 56;
          const ty = Math.sin(mid) * 56;

          const label = this.add.text(tx, ty, String(num), {
            fontFamily: "Arial Black, Arial",
            fontSize: "11px",
            color: "#ffffff"
          }).setOrigin(0.5);

          label.setRotation(mid + Math.PI / 2);
          wheel.add(label);
        }

        const innerRim = this.add.circle(0, 0, 45, 0xd4aa5a);
        wheel.add(innerRim);

        const spindleBase = this.add.circle(0, 0, 13, 0xcfcfcf);
        wheel.add(spindleBase);

        const spindleStem = this.add.rectangle(0, -12, 6, 28, 0xbfbfbf);
        wheel.add(spindleStem);

        const spindleTop = this.add.circle(0, -27, 8, 0xdadada);
        wheel.add(spindleTop);

        const highlight = this.add.graphics();
        highlight.lineStyle(2, 0xffffff, 0.15);
        highlight.strokeEllipse(-8, -10, 126, 104);
        wheel.add(highlight);

        container.add(wheel);

        const marker = this.add.triangle(0, -76, 0, 0, 8, 12, -8, 12, 0xffffff);
        container.add(marker);
      }

      createBoard() {
        this.boardContainer = this.add.container(8, 80);
        this.betZones = [];

        const g = this.add.graphics();
        this.boardContainer.add(g);

        const cellW = 42;
        const cellH = 34;
        const zeroW = 38;
        const leftX = 66;
        const topY = 0;

        g.lineStyle(2, 0xffffff, 1);

        // 0 and 00
        const zeroPolyTop = [
          12, 0,
          zeroW, 0,
          zeroW + 18, cellH / 2,
          zeroW, cellH,
          12, cellH,
          -6, cellH / 2
        ];

        const zeroPolyBottom = zeroPolyTop.map((v, i) => i % 2 ? v + cellH : v);

        this.drawPolygonCell(g, zeroPolyTop, 0x159d2f);
        this.drawPolygonCell(g, zeroPolyBottom, 0x159d2f);

        this.addPolygonBet(0, "0", 26, 17, zeroPolyTop);
        this.addPolygonBet(0, "00", 26, 51, zeroPolyBottom);

        // number grid
        const columns = [
          [3,2,1],
          [6,5,4],
          [9,8,7],
          [12,11,10],
          [15,14,13],
          [18,17,16],
          [21,20,19],
          [24,23,22],
          [27,26,25],
          [30,29,28],
          [33,32,31],
          [36,35,34]
        ];

        for (let c = 0; c < columns.length; c++) {
          for (let r = 0; r < 3; r++) {
            const num = columns[c][r];
            const x = leftX + c * cellW;
            const y = topY + r * cellH;
            const color = this.redNumbers.has(num) ? 0xd9472f : 0x101010;

            g.fillStyle(color, 1);
            g.fillRect(x, y, cellW, cellH);
            g.strokeRect(x, y, cellW, cellH);

            const txt = this.add.text(x + cellW / 2, y + cellH / 2, String(num), {
              fontFamily: "Arial Black, Arial",
              fontSize: "16px",
              color: "#ffffff"
            }).setOrigin(0.5);
            this.boardContainer.add(txt);

            this.addRectBet(`num-${num}`, num, x, y, cellW, cellH);
          }
        }

        // side 2-to-1
        const sideX = leftX + columns.length * cellW;
        for (let r = 0; r < 3; r++) {
          g.fillStyle(0x188b17, 1);
          g.fillRect(sideX, topY + r * cellH, 42, cellH);
          g.strokeRect(sideX, topY + r * cellH, 42, cellH);

          const t = this.add.text(sideX + 21, topY + r * cellH + cellH / 2, "2 to 1", {
            fontFamily: "Arial",
            fontSize: "13px",
            color: "#fff7a8"
          }).setOrigin(0.5);
          t.setAngle(-90);
          this.boardContainer.add(t);

          this.addRectBet(`col-${2-r}`, { type: "column", value: 2 - r }, sideX, topY + r * cellH, 42, cellH);
        }

        // dozens
        const dozenY = topY + 3 * cellH;
        const dozenW = cellW * 4;

        for (let i = 0; i < 3; i++) {
          const x = leftX + i * dozenW;
          g.fillStyle(0x188b17, 1);
          g.fillRect(x, dozenY, dozenW, 28);
          g.strokeRect(x, dozenY, dozenW, 28);

          const label = ["1st 12", "2nd 12", "3rd 12"][i];
          const txt = this.add.text(x + dozenW / 2, dozenY + 14, label, {
            fontFamily: "Arial Black, Arial",
            fontSize: "14px",
            color: "#fff5a0"
          }).setOrigin(0.5);
          this.boardContainer.add(txt);

          this.addRectBet(`dozen-${i+1}`, { type: "dozen", value: i + 1 }, x, dozenY, dozenW, 28);
        }

        // bottom outside bets
        const outsideY = dozenY + 28;
        const outsideW = cellW * 2;
        const labels = [
          { key: "low", text: "1-18", bet: { type: "range", value: "low" } },
          { key: "even", text: "EVEN", bet: { type: "parity", value: "even" } },
          { key: "red", text: "RED", bet: { type: "color", value: "red" }, fill: 0xd9472f },
          { key: "black", text: "BLACK", bet: { type: "color", value: "black" }, fill: 0x101010 },
          { key: "odd", text: "ODD", bet: { type: "parity", value: "odd" } },
          { key: "high", text: "19-36", bet: { type: "range", value: "high" } }
        ];

        for (let i = 0; i < labels.length; i++) {
          const x = leftX + i * outsideW;
          const fill = labels[i].fill ?? 0x188b17;
          g.fillStyle(fill, 1);
          g.fillRect(x, outsideY, outsideW, 30);
          g.strokeRect(x, outsideY, outsideW, 30);

          const txt = this.add.text(x + outsideW / 2, outsideY + 15, labels[i].text, {
            fontFamily: "Arial Black, Arial",
            fontSize: "14px",
            color: "#fff5a0"
          }).setOrigin(0.5);
          this.boardContainer.add(txt);

          this.addRectBet(labels[i].key, labels[i].bet, x, outsideY, outsideW, 30);
        }
      }

      drawPolygonCell(g, points, fill) {
        g.fillStyle(fill, 1);
        g.beginPath();
        g.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) {
          g.lineTo(points[i], points[i + 1]);
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
      }

      addRectBet(id, bet, x, y, w, h) {
        const zone = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        zone.betId = id;
        zone.betData = bet;
        zone.on("pointerdown", () => this.placeBet(zone.betId, zone.betData, x + w / 2, y + h / 2));
        this.boardContainer.add(zone);
        this.betZones.push(zone);
      }

      addPolygonBet(id, label, centerX, centerY, points) {
        const minX = Math.min(points[0], points[2], points[4], points[6], points[8], points[10]);
        const maxX = Math.max(points[0], points[2], points[4], points[6], points[8], points[10]);
        const minY = Math.min(points[1], points[3], points[5], points[7], points[9], points[11]);
        const maxY = Math.max(points[1], points[3], points[5], points[7], points[9], points[11]);

        const zone = this.add.zone(minX, minY, maxX - minX, maxY - minY)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });

        zone.betId = id;
        zone.betData = label === "00" ? { type: "number", value: "00" } : { type: "number", value: 0 };
        zone.on("pointerdown", () => this.placeBet(zone.betId, zone.betData, centerX, centerY));
        this.boardContainer.add(zone);

        const txt = this.add.text(centerX, centerY, label, {
          fontFamily: "Arial Black, Arial",
          fontSize: "24px",
          color: "#ffffff"
        }).setOrigin(0.5);
        this.boardContainer.add(txt);
      }

      createControls() {
        this.exitButton = this.createButton(10, 350, 48, 22, "Exit", () => {
          this.clearBets();
          this.resultNumber = null;
          this.refreshHUD();
        });

        this.spinButton = this.createButton(102, 350, 58, 22, "Spin", () => {
          this.spinRoulette();
        });

        const chipValues = [1, 5, 10, 25, 100];
        let x = 210;
        for (const value of chipValues) {
          const chip = this.add.circle(x, 326, 16, 0x3e37d6).setStrokeStyle(2, 0xffffff);
          chip.setInteractive({ useHandCursor: true });
          chip.on("pointerdown", () => {
            this.currentChipValue = value;
            this.refreshHUD();
          });

          const txt = this.add.text(x, 326, String(value), {
            fontFamily: "Arial Black, Arial",
            fontSize: "16px",
            color: "#ffffff"
          }).setOrigin(0.5);

          x += 42;
        }

        this.clearButton = this.createButton(470, 350, 72, 22, "Clear Bets", () => {
          if (!this.isSpinning) this.clearBets();
        });
      }

      createButton(x, y, w, h, label, onClick) {
        const g = this.add.graphics();
        g.fillStyle(0xd4d4d4, 1);
        g.fillRect(x, y, w, h);
        g.lineStyle(2, 0xffffff, 1);
        g.strokeRect(x, y, w, h);
        g.lineStyle(1, 0x444444, 1);
        g.strokeRect(x + 1, y + 1, w - 2, h - 2);

        const zone = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        zone.on("pointerdown", onClick);

        this.add.text(x + w / 2, y + h / 2, label, {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#000000"
        }).setOrigin(0.5);

        return zone;
      }

      placeBet(id, betData, cx, cy) {
        if (this.isSpinning) return;
        if (this.balance < this.currentChipValue) return;

        this.balance -= this.currentChipValue;

        let record = this.betMap.get(id);
        if (!record) {
          const chip = this.add.container(this.boardContainer.x + cx, this.boardContainer.y + cy);

          const disk = this.add.circle(0, 0, 13, 0x2f2fe7).setStrokeStyle(2, 0xffffff);
          const txt = this.add.text(0, 0, String(this.currentChipValue), {
            fontFamily: "Arial Black, Arial",
            fontSize: "13px",
            color: "#ffffff"
          }).setOrigin(0.5);

          chip.add([disk, txt]);

          record = {
            id,
            betData,
            amount: 0,
            chip,
            txt
          };
          this.betMap.set(id, record);
          this.bets.push(record);
        }

        record.amount += this.currentChipValue;
        record.txt.setText(String(record.amount));
        this.refreshHUD();
      }

      clearBets() {
        for (const bet of this.bets) {
          this.balance += bet.amount;
          bet.chip.destroy();
        }
        this.bets = [];
        this.betMap.clear();
        this.refreshHUD();
      }

      spinRoulette() {
        if (this.isSpinning || this.bets.length === 0) return;

        this.isSpinning = true;

        const winningNumber = Phaser.Math.Between(0, 36);
        const spins = Phaser.Math.Between(5, 8);
        const finalRotation = Phaser.Math.FloatBetween(0, Math.PI * 2);

        this.tweens.add({
          targets: this.wheelContainer,
          angle: Phaser.Math.RadToDeg(finalRotation) + spins * 360,
          duration: 3200,
          ease: "Cubic.easeOut",
          onComplete: () => {
            this.resolveSpin(winningNumber);
          }
        });
      }

      resolveSpin(number) {
        this.resultNumber = number;
        let winnings = 0;

        for (const bet of this.bets) {
          const amt = bet.amount;
          const b = bet.betData;

          if (b.type === "number") {
            if (b.value === number) winnings += amt * 36;
          } else if (typeof b === "number") {
            if (b === number) winnings += amt * 36;
          } else if (b.type === "color") {
            if (number !== 0) {
              const color = this.redNumbers.has(number) ? "red" : "black";
              if (b.value === color) winnings += amt * 2;
            }
          } else if (b.type === "parity") {
            if (number !== 0) {
              const parity = number % 2 === 0 ? "even" : "odd";
              if (b.value === parity) winnings += amt * 2;
            }
          } else if (b.type === "range") {
            if (b.value === "low" && number >= 1 && number <= 18) winnings += amt * 2;
            if (b.value === "high" && number >= 19 && number <= 36) winnings += amt * 2;
          } else if (b.type === "dozen") {
            const dozen = Math.ceil(number / 12);
            if (number >= 1 && number <= 36 && dozen === b.value) winnings += amt * 3;
          } else if (b.type === "column") {
            if (number >= 1 && number <= 36) {
              const rowPos = ((number - 1) % 3);
              const colValue = rowPos === 0 ? 0 : rowPos === 1 ? 1 : 2;
              const boardColumnValue = b.value;
              if (
                (boardColumnValue === 0 && rowPos === 0) ||
                (boardColumnValue === 1 && rowPos === 1) ||
                (boardColumnValue === 2 && rowPos === 2)
              ) {
                winnings += amt * 3;
              }
            }
          }
        }

        this.balance += winnings;

        for (const bet of this.bets) {
          bet.chip.destroy();
        }
        this.bets = [];
        this.betMap.clear();

        this.isSpinning = false;
        this.refreshHUD();
      }

      refreshHUD() {
        const display = this.resultNumber === null ? "29" : String(this.resultNumber);
        const resultColor =
          this.resultNumber === 0 ? "#00ff66" :
          this.resultNumber === null ? "#000000" :
          this.redNumbers.has(this.resultNumber) ? "#ff3b2f" : "#ffffff";

        this.hudResult.setText(display);
        this.hudResult.setColor(resultColor);

        this.hudBalance.setText("$" + this.balance);
        this.hudChipValue.setText(String(this.currentChipValue));
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: "game",
      width: 636,
      height: 378,
      backgroundColor: "#008400",
      scene: [RouletteScene]
    };

    new Phaser.Game(config);
  </script>
</body>
</html>
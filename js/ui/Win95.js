export const bevelOptions = Object.freeze({
    fill: 0xc0c0c0,
    disabledFill: 0xb8b8b8,
    highlight: 0xffffff,
    shadow: 0x666666,
    lineWidth: 2
});

export function drawBevelButton(
    graphics,
    x,
    y,
    width,
    height,
    disabled = false,
    options = bevelOptions
) {
    const {
        fill = bevelOptions.fill,
        disabledFill = bevelOptions.disabledFill,
        highlight = bevelOptions.highlight,
        shadow = bevelOptions.shadow,
        lineWidth = bevelOptions.lineWidth
    } = options;
    graphics.fillStyle(disabled ? disabledFill : fill, 1);
    graphics.fillRect(x, y, width, height);

    graphics.lineStyle(lineWidth, highlight, 1);
    graphics.beginPath();
    graphics.moveTo(x + width, y);
    graphics.lineTo(x, y);
    graphics.lineTo(x, y + height);
    graphics.strokePath();

    graphics.lineStyle(lineWidth, shadow, 1);
    graphics.beginPath();
    graphics.moveTo(x + width, y);
    graphics.lineTo(x + width, y + height);
    graphics.lineTo(x, y + height);
    graphics.strokePath();
}

export function drawWin95Button(
    scene,
    graphics,
    x,
    y,
    width,
    height,
    label,
    fontSize,
    options = {}
) {
    drawBevelButton(
        graphics,
        x,
        y,
        width,
        height,
        options.disabled ?? false,
        options
    );
    return scene.add.text(x + width / 2, y + height / 2 + 1, label, {
        fontFamily: options.fontFamily ?? "Arial",
        fontSize: `${fontSize}px`,
        color: options.textColor ?? "#000000",
        fontStyle: options.fontStyle ?? "bold"
    }).setOrigin(0.5).setDepth(options.depth ?? 0);
}

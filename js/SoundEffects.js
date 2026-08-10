const SOUND_FILES = {
    cardFlip: "CARDFLIP.WAV",
    cardPlace: "CARDPLAC.WAV",
    cardShuffle: "CARDSHUF.WAV",
    chipPickup: "CHIPCHIP.WAV",
    chipStack: "CHIPSTACK.WAV",
    chipTable: "CHIPTABLE.WAV",
    dieFloor: "DIEFLOOR.WAV",
    dieOnDie: "DIEONDIE.WAV",
    dieSlide: "DIESLIDE.WAV",
    dieWall: "DIEWALLB.WAV",
    ...Object.fromEntries(
        Array.from({ length: 8 }, (_, index) => [`dieShake${index}`, `DIESHAK${index}.WAV`])
    )
};

export function preloadSoundEffects(scene, keys) {
    keys.forEach((key) => {
        const file = SOUND_FILES[key];
        if (file && !scene.cache.audio.exists(key)) {
            scene.load.audio(key, `assets/sounds/${file}`);
        }
    });
}

export function playSoundEffect(scene, key, config = {}) {
    if (scene.cache.audio.exists(key)) scene.sound.play(key, config);
}

export function playRandomSoundEffect(scene, keys, config = {}) {
    if (keys.length === 0) return;
    playSoundEffect(scene, Phaser.Utils.Array.GetRandom(keys), config);
}

export const CARD_SOUND_KEYS = ["cardFlip", "cardPlace", "cardShuffle"];
export const CHIP_SOUND_KEYS = ["chipPickup", "chipStack", "chipTable"];
export const DIE_SOUND_KEYS = [
    ...Array.from({ length: 8 }, (_, index) => `dieShake${index}`),
    "dieFloor",
    "dieOnDie",
    "dieSlide",
    "dieWall"
];

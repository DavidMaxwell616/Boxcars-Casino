// The shuffle clip lasts about 557 ms; leave a short pause before dealing.
export const CARD_DEAL_DELAY_MS = 800;

const SOUND_FILES = {
    CARDFLIP: "CARDFLIP.WAV",
    CARDPLACE: "CARDPLACE.WAV",
    CARDSHUFFLE: "CARDSHUFFLE.WAV",
    CHIPCHIP: "CHIPCHIP.WAV",
    CHIPSTACK: "CHIPSTACK.WAV",
    CHIPTABLE: "CHIPTABLE.WAV",
    dieFloor: "DIEFLOOR.WAV",
    dieOnDie: "DIEONDIE.WAV",
    dieSlide: "DIESLIDE.WAV",
    dieWall: "DIEWALLBOUNCE.WAV",
    ...Object.fromEntries(
        Array.from({ length: 8 }, (_, index) => [`dieShake${index}`, `DIESHAKE${index}.WAV`])
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

export const CARD_SOUND_KEYS = ["CARDFLIP", "CARDPLACE", "CARDSHUFFLE"];
export const CHIP_SOUND_KEYS = ["CHIPCHIP", "CHIPSTACK", "CHIPTABLE"];
export const DIE_SOUND_KEYS = [
    ...Array.from({ length: 8 }, (_, index) => `dieShake${index}`),
    "dieFloor",
    "dieOnDie",
    "dieSlide",
    "dieWall"
];

const DEFAULT_CHIP_DENOMINATIONS = [1000, 500, 100, 25, 10, 5, 1];

/**
 * Finds an exact, visually diverse poker-chip distribution.
 *
 * Each denomination produces at most one stack and no stack exceeds
 * maxStackHeight. The search favors preferredVariety denominations, then
 * minimizes the total number of chips.
 *
 * @param {number} amount Total dollar value to represent.
 * @param {object} [options]
 * @param {number[]} [options.denominations] Available chip values.
 * @param {number} [options.maxStackHeight=5] Maximum chips in each stack.
 * @param {number} [options.preferredVariety=4] Desired number of chip colors.
 * @returns {{
 *   amount: number,
 *   chipCount: number,
 *   stackCount: number,
 *   stacks: Array<{denomination: number, count: number, value: number}>
 * }}
 */
export function getBestChipStackDistribution(amount, options = {}) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new RangeError("amount must be a positive whole-dollar value");
    }

    const maxStackHeight = options.maxStackHeight ?? 5;
    const preferredVariety = options.preferredVariety ?? 4;

    if (!Number.isSafeInteger(maxStackHeight) || maxStackHeight < 1) {
        throw new RangeError("maxStackHeight must be a positive integer");
    }

    if (!Number.isSafeInteger(preferredVariety) || preferredVariety < 1) {
        throw new RangeError("preferredVariety must be a positive integer");
    }

    const denominations = [
        ...new Set(options.denominations ?? DEFAULT_CHIP_DENOMINATIONS)
    ]
        .filter((value) => Number.isSafeInteger(value) && value > 0)
        .sort((a, b) => b - a);

    if (denominations.length === 0) {
        throw new RangeError("at least one positive chip denomination is required");
    }

    const suffixCapacity = new Array(denominations.length + 1).fill(0);
    for (let index = denominations.length - 1; index >= 0; index--) {
        suffixCapacity[index] =
            suffixCapacity[index + 1] + denominations[index] * maxStackHeight;
    }

    if (amount > suffixCapacity[0]) {
        throw new RangeError(
            `amount cannot be represented with stacks of ${maxStackHeight} or fewer chips`
        );
    }

    const targetVariety = Math.min(
        preferredVariety,
        denominations.filter((denomination) => denomination <= amount).length
    );

    let best = null;
    const counts = new Array(denominations.length).fill(0);

    function considerCandidate() {
        const usedCounts = counts.filter((count) => count > 0);
        const variety = usedCounts.length;
        const chipCount = usedCounts.reduce((total, count) => total + count, 0);

        // Prefer the requested variety. Extra colors are less undesirable than
        // too few colors, then favor a compact set of chips.
        const varietyPenalty = variety < targetVariety
            ? (targetVariety - variety) * 100
            : (variety - targetVariety) * 10;
        const score = varietyPenalty * 1000 + chipCount;

        if (!best || score < best.score) {
            best = { score, counts: [...counts], chipCount };
        }
    }

    function search(index, remaining) {
        if (remaining === 0) {
            considerCandidate();
            return;
        }

        if (index === denominations.length || remaining > suffixCapacity[index]) {
            return;
        }

        const denomination = denominations[index];
        const highestCount = Math.min(
            maxStackHeight,
            Math.floor(remaining / denomination)
        );

        // Search larger stacks first to make equal-score results deterministic.
        for (let count = highestCount; count >= 0; count--) {
            counts[index] = count;
            search(index + 1, remaining - count * denomination);
        }
        counts[index] = 0;
    }

    search(0, amount);

    if (!best) {
        throw new RangeError(
            `amount cannot be represented exactly by the available denominations`
        );
    }

    const stacks = denominations.flatMap((denomination, index) => {
        const count = best.counts[index];
        return count === 0
            ? []
            : [{
                denomination,
                count,
                value: denomination * count
            }];
    });

    return {
        amount,
        chipCount: best.chipCount,
        stackCount: stacks.length,
        stacks
    };
}


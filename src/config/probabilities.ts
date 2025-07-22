// Container probabilities (in percentage points, scaled to 1,000,000 for precision)
export const CONTAINER_PROBABILITIES = [
    { multiplier: 11000, probability: 0.0015, range: [0, 14] },            // 110x = 0.0015%
    { multiplier: 4100, probability: 0.0244, range: [15, 258] },          // 41x = 0.0244%
    { multiplier: 1000, probability: 0.1831, range: [259, 2089] },        // 10x = 0.1831%
    { multiplier: 500, probability: 0.8545, range: [2090, 10634] },      // 5x = 0.8545%
    { multiplier: 300, probability: 2.7771, range: [10635, 38405] },     // 3x = 2.7771%
    { multiplier: 150, probability: 6.6650, range: [38406, 105055] },    // 1.5x = 6.6650%
    { multiplier: 100, probability: 12.2192, range: [105056, 227247] },  // 1x = 12.2192%
    { multiplier: 50, probability: 17.4561, range: [227248, 401808] },  // 0.5x = 17.4561%
    { multiplier: 30, probability: 19.6381, range: [401809, 598190] },  // 0.3x = 19.6381%
    { multiplier: 50, probability: 17.4561, range: [598191, 772751] },  // 0.5x = 17.4561%
    { multiplier: 100, probability: 12.2192, range: [772752, 894943] },  // 1x = 12.2192%
    { multiplier: 150, probability: 6.6650, range: [894944, 961593] },   // 1.5x = 6.6650%
    { multiplier: 300, probability: 2.7771, range: [961594, 989364] },   // 3x = 2.7771%
    { multiplier: 500, probability: 0.8545, range: [989365, 997909] },   // 5x = 0.8545%
    { multiplier: 1000, probability: 0.1831, range: [997910, 999740] },   // 10x = 0.1831%
    { multiplier: 4100, probability: 0.0244, range: [999741, 999984] },   // 41x = 0.0244%
    { multiplier: 11000, probability: 0.0015, range: [999985, 999999] }    // 110x = 0.0015%
];

export const PRECISION = 1_000_000;
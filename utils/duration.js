function durationToMs(value) {
  const match = /^(\d+)(s|m|h|d)$/.exec(value || "");

  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return Number(match[1]) * multipliers[match[2]];
}

module.exports = durationToMs;
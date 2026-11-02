const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const encode = (num) => {
  if (!Number.isSafeInteger(num) || num < 0) {
    throw new RangeError("Base62 input must be a non-negative safe integer");
  }

  if (num === 0) return ALPHABET[0];
  let out = "";
  while (num > 0) {
    out = ALPHABET[num % 62] + out;
    num = Math.floor(num / 62);
  }

  return out;
};

module.exports = { encode };

const redis = require('./redis');
const { encode } = require('./base62');

const KEY = 'url:counter';
const BLOCK = 1000;
const START = 916132832; // 62^5 -> first code is "100000"

let current = 1;
let max = 0;
let pending = null;

async function reserveBlock() {
  const end = await redis.incrby(KEY, BLOCK);
  current = end - BLOCK + 1;
  max = end;
}

async function nextCode() {
  while (current > max) {
    if (!pending) pending = reserveBlock().finally(() => { pending = null; });
    await pending;
  }
  return encode(START + current++);
}

module.exports = { nextCode, KEY, START };
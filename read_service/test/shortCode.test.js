const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidShortCode } = require("../src/shortCode");

test("accepts generated alphanumeric short codes", () => {
  assert.equal(isValidShortCode("abc123"), true);
  assert.equal(isValidShortCode("A1b2C3d4"), true);
});

test("rejects malformed or out-of-range short codes", () => {
  assert.equal(isValidShortCode("abc12"), false);
  assert.equal(isValidShortCode("abc12345678"), false);
  assert.equal(isValidShortCode("abc-123"), false);
  assert.equal(isValidShortCode(""), false);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { encode } = require("../src/base62");
const { validateUrlInput } = require("../src/validateUrl");

test("encodes numbers as base62 strings", () => {
  assert.equal(encode(0), "0");
  assert.equal(encode(61), "Z");
  assert.equal(encode(62), "10");
  assert.equal(encode(916132832), "100000");
  assert.equal(encode(916132833), "100001");
});

test("rejects values that cannot be encoded safely", () => {
  for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN]) {
    assert.throws(() => encode(value), RangeError);
  }
});

test("accepts valid HTTP and HTTPS URL input", () => {
  assert.deepEqual(validateUrlInput({ longUrl: "https://example.com/a?b=c" }), {
    value: { longUrl: "https://example.com/a?b=c" },
  });
});

test("rejects missing, invalid, unsafe, and oversized URL input", () => {
  for (const body of [
    {},
    { longUrl: "not a URL" },
    { longUrl: "javascript:alert(1)" },
    { longUrl: "https://user:password@example.com" },
    { longUrl: `https://example.com/${"a".repeat(2048)}` },
    { longUrl: "https://example.com", userId: "not-an-object-id" },
  ]) {
    assert.ok(validateUrlInput(body).error, JSON.stringify(body));
  }
});

test("accepts a valid optional MongoDB ObjectId", () => {
  assert.deepEqual(
    validateUrlInput({
      longUrl: "http://example.com",
      userId: "507f1f77bcf86cd799439011",
    }),
    {
      value: {
        longUrl: "http://example.com/",
        userId: "507f1f77bcf86cd799439011",
      },
    },
  );
});

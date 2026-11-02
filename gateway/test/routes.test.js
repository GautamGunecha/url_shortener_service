const test = require("node:test");
const assert = require("node:assert/strict");
const { isCreateRequest, isReadRequest } = require("../src/routes");

test("gateway sends URL creation POSTs to the write service", () => {
  assert.equal(isCreateRequest("/api/urls", { method: "POST" }), true);
  assert.equal(isCreateRequest("/api/urls", { method: "GET" }), false);
  assert.equal(isCreateRequest("/api/urls/abc123", { method: "POST" }), false);
});

test("gateway sends short URL redirects and details GETs to the read service", () => {
  assert.equal(isReadRequest("/abc123", { method: "GET" }), true);
  assert.equal(isReadRequest("/api/urls/abc123", { method: "GET" }), true);
  assert.equal(isReadRequest("/abc12", { method: "GET" }), false);
  assert.equal(isReadRequest("/abc123", { method: "POST" }), false);
  assert.equal(isReadRequest("/health", { method: "GET" }), false);
});

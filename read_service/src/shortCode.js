const CODE_PATTERN = /^[A-Za-z0-9]{6,10}$/;

function isValidShortCode(code) {
  return CODE_PATTERN.test(code);
}

module.exports = { isValidShortCode };

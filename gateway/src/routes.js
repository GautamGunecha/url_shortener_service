const CODE_PATH = "[A-Za-z0-9]{6,10}";
const SHORT_URL_PATH = new RegExp(`^/${CODE_PATH}$`);
const URL_DETAILS_PATH = new RegExp(`^/api/urls/${CODE_PATH}$`);

function isCreateRequest(pathname, req) {
  return req.method === "POST" && pathname === "/api/urls";
}

function isReadRequest(pathname, req) {
  return (
    req.method === "GET" &&
    pathname !== "/health" &&
    (SHORT_URL_PATH.test(pathname) || URL_DETAILS_PATH.test(pathname))
  );
}

module.exports = { isCreateRequest, isReadRequest };

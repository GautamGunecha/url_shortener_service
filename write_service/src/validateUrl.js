const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const MAX_URL_LENGTH = 2048;

function validateUrlInput(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  if (typeof body.longUrl !== "string" || !body.longUrl.trim()) {
    return { error: "longUrl must be a non-empty string" };
  }

  const longUrl = body.longUrl.trim();
  if (longUrl.length > MAX_URL_LENGTH) {
    return { error: `longUrl must be at most ${MAX_URL_LENGTH} characters` };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(longUrl);
  } catch {
    return { error: "longUrl must be a valid absolute URL" };
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    return { error: "longUrl must be an HTTP or HTTPS URL without credentials" };
  }

  if (
    body.userId !== undefined &&
    (typeof body.userId !== "string" || !OBJECT_ID_PATTERN.test(body.userId))
  ) {
    return { error: "userId must be a 24-character MongoDB ObjectId" };
  }

  return {
    value: {
      longUrl: parsedUrl.toString(),
      ...(body.userId ? { userId: body.userId } : {}),
    },
  };
}

module.exports = { validateUrlInput };

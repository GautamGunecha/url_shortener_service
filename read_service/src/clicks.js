const redis = require('./redis');
const { Url } = require('./models');

const PENDING = 'clicks:pending';
const FLUSHING = `clicks:flushing:${process.pid}`;

async function flushClicks() {
  // finish a previous failed flush first, otherwise grab the pending hash
  if (!(await redis.exists(FLUSHING))) {
    if (!(await redis.exists(PENDING))) return;

    try {
      await redis.rename(PENDING, FLUSHING); // atomic, so instances never double-count
    } catch (err) {
      if (err.message.includes("no such key")) return;
      throw err;
    }
  }

  const counts = await redis.hgetall(FLUSHING);
  const ops = Object.entries(counts).map(([shortCode, n]) => ({
    updateOne: { filter: { shortCode }, update: { $inc: { clicks: Number(n) } } },
  }));

  if (ops.length) await Url.bulkWrite(ops, { ordered: false });
  await redis.del(FLUSHING);
}

function startClickFlusher(intervalMs = 10000) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await flushClicks();
    } catch (err) {
      console.error('Click flush failed:', err.message);
    } finally {
      running = false;
    }
  }, intervalMs);
  return timer;
}

module.exports = { startClickFlusher, flushClicks };
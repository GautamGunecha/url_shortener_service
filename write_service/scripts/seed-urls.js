require('dotenv').config();
const mongoose = require('mongoose');
const redis = require('../src/redis');
const { encode } = require('../src/base62');
const { KEY, START } = require('../src/idGenerator');
const { User, Url } = require('../src/models');

const URLS_PER_USER = 100;
const USERS_PER_BATCH = 100; // 10,000 urls per insert
const PARALLEL = 4;

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Url.init();

  const inflight = new Set();
  let total = 0;
  let batches = 0;
  const t0 = Date.now();

  async function flush(userIds) {
    const count = userIds.length * URLS_PER_USER;
    const end = await redis.incrby(KEY, count);
    let n = end - count + 1;
    const now = new Date();
    const docs = new Array(count);
    let k = 0;

    for (const userId of userIds) {
      for (let u = 0; u < URLS_PER_USER; u++, n++, k++) {
        docs[k] = {
          shortCode: encode(START + n),
          longUrl: `https://example.com/page/${n}`,
          userId,
          clicks: 0,
          createdAt: now,
          updatedAt: now,
        };
      }
    }

    await Url.collection.insertMany(docs, { ordered: false });
    total += count;
    if (++batches % 50 === 0) {
      const secs = (Date.now() - t0) / 1000;
      console.log(`${total.toLocaleString()} urls (${Math.round(total / secs)}/s)`);
    }
  }

  function submit(userIds) {
    const p = flush(userIds).finally(() => inflight.delete(p));
    inflight.add(p);
    return inflight.size >= PARALLEL ? Promise.race(inflight) : null;
  }

  let ids = [];
  const cursor = User.find({}, '_id').lean().cursor({ batchSize: 1000 });
  for await (const u of cursor) {
    ids.push(u._id);
    if (ids.length === USERS_PER_BATCH) {
      const wait = submit(ids);
      ids = [];
      if (wait) await wait;
    }
  }
  if (ids.length) submit(ids);
  await Promise.all(inflight);

  console.log(`Done: ${total.toLocaleString()} urls in ${Math.round((Date.now() - t0) / 1000)}s`);
  await mongoose.disconnect();
  await redis.quit();
})();
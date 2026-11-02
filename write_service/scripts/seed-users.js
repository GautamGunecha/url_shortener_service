require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models');

const TOTAL = 1_000_000;
const BATCH = 10_000;

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.init();

  if ((await User.estimatedDocumentCount()) > 0) {
    console.log('Users already exist, aborting.');
    return process.exit(0);
  }

  const t0 = Date.now();
  for (let i = 0; i < TOTAL; i += BATCH) {
    const now = new Date();
    const docs = [];
    for (let j = i; j < i + BATCH; j++) {
      docs.push({
        name: `User ${j}`,
        email: `user${j}@example.com`,
        passwordHash: 'seeded-user-no-login',
        createdAt: now,
        updatedAt: now,
      });
    }
    await User.collection.insertMany(docs, { ordered: false });
    if ((i / BATCH) % 10 === 0) console.log(`${i + BATCH} users`);
  }
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s`);
  await mongoose.disconnect();
})();

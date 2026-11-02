const userModel = require('./models/user.model');
const urlModel = require('./models/url.model');

module.exports = (mongoose) => ({
  User: userModel(mongoose),
  Url: urlModel(mongoose),
});


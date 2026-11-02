module.exports = (mongoose) => {
  const userSchema = new mongoose.Schema(
    {
      name: { type: String, trim: true },
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
      passwordHash: { type: String, required: true },
    },
    { timestamps: true }
  );

  return mongoose.models.User || mongoose.model('User', userSchema);
};

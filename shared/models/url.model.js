module.exports = (mongoose) => {
  const urlSchema = new mongoose.Schema(
    {
      shortCode: { type: String, required: true, unique: true },
      longUrl: { type: String, required: true },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
      },
      clicks: { type: Number, default: 0 },
    },
    { timestamps: true }
  );

  return mongoose.models.Url || mongoose.model('Url', urlSchema);
};
module.exports = (mongoose) => {
  const urlSchema = new mongoose.Schema(
    {
      shortCode: {
        type: String,
        required: true,
        unique: true,
        match: /^[A-Za-z0-9]{6,10}$/,
      },
      longUrl: { type: String, required: true, maxlength: 2048 },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
      },
      clicks: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
  );

  return mongoose.models.Url || mongoose.model('Url', urlSchema);
};
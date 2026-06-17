import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    seatsLeft: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

export const Course = mongoose.model('Course', courseSchema);

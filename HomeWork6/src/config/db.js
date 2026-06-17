import mongoose from 'mongoose';

export async function connectDB() {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/race_condition_transactions_demo';

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

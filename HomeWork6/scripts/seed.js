import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Course } from '../src/models/Course.js';
import { Order } from '../src/models/Order.js';
import { User } from '../src/models/User.js';

export async function seedDatabase() {

  await Promise.all([Order.deleteMany({}), User.deleteMany({}), Course.deleteMany({})]);

  const users = await User.create([
    { name: 'Ada Lovelace', balance: 100 },
    { name: 'Grace Hopper', balance: 100 }
  ]);

  const course = await Course.create({
    title: 'MongoDB Transactions 101',
    price: 100,
    seatsLeft: 1
  });

  await Order.syncIndexes();

  return { users, course };
}

async function runSeedFromCli() {
  await connectDB();
  const { users, course } = await seedDatabase();

  console.log('Seed complete');
  console.log(
    JSON.stringify(
      {
        users: users.map((user) => ({
          id: user._id,
          name: user.name,
          balance: user.balance
        })),
        course: {
          id: course._id,
          title: course.title,
          price: course.price,
          seatsLeft: course.seatsLeft
        }
      },
      null,
      2
    )
  );

  await disconnectDB();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSeedFromCli().catch(async (error) => {
    console.error('Seed failed:', error);
    await disconnectDB();
    process.exit(1);
  });
}

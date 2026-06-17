import 'dotenv/config';
import axios from 'axios';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Course } from '../src/models/Course.js';
import { Order } from '../src/models/Order.js';
import { User } from '../src/models/User.js';
import { seedDatabase } from './seed.js';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

async function waitForServer() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await axios.get(`${baseURL}/health`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Server is not responding at ${baseURL}`);
}

function simplify(response) {
  if (response.status === 'fulfilled') {
    return {
      status: response.value.status,
      data: response.value.data
    };
  }

  return {
    status: response.reason.response?.status,
    data: response.reason.response?.data || response.reason.message
  };
}

async function runUnsafeRaceTest() {
  await connectDB();
  const { users, course } = await seedDatabase();
  await waitForServer();

  console.log('Starting unsafe race test with seatsLeft = 1');

  const requests = users.map((user) =>
    axios.post(`${baseURL}/buy-unsafe`, {
      userId: user._id,
      courseId: course._id
    })
  );

  const results = await Promise.allSettled(requests);

  const [finalCourse, finalUsers, orders] = await Promise.all([
    Course.findById(course._id).lean(),
    User.find({}).sort({ name: 1 }).lean(),
    Order.find({}).lean()
  ]);

  console.log('Responses:', JSON.stringify(results.map(simplify), null, 2));
  console.log(
    'Final database state:',
    JSON.stringify(
      {
        seatsLeft: finalCourse.seatsLeft,
        users: finalUsers.map((user) => ({
          name: user.name,
          balance: user.balance
        })),
        orderCount: orders.length,
        orders: orders.map((order) => ({
          userId: order.userId,
          courseId: order.courseId
        }))
      },
      null,
      2
    )
  );

  console.log(
    'Unsafe result: if both responses succeeded while orderCount is 2, the course was oversold.'
  );

  await disconnectDB();
}

runUnsafeRaceTest().catch(async (error) => {
  console.error('Unsafe race test failed:', error.message);
  await disconnectDB();
  process.exit(1);
});

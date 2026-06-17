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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSafeRaceTest() {
  await connectDB();
  const { users, course } = await seedDatabase();
  await waitForServer();

  console.log('Starting safe race test with seatsLeft = 1');

  const requests = users.map((user) =>
    axios.post(`${baseURL}/buy`, {
      userId: user._id,
      courseId: course._id
    })
  );

  const results = await Promise.allSettled(requests);
  const simplifiedResults = results.map(simplify);

  const [finalCourse, finalUsers, orders] = await Promise.all([
    Course.findById(course._id).lean(),
    User.find({}).sort({ name: 1 }).lean(),
    Order.find({}).lean()
  ]);

  const successCount = simplifiedResults.filter((result) => result.status === 201).length;
  const failureCount = simplifiedResults.filter((result) => result.status !== 201).length;
  const hasClearError = simplifiedResults.some(
    (result) =>
      result.status !== 201 &&
      typeof result.data?.error === 'string' &&
      result.data.error.length > 0
  );
  const hasNegativeBalance = finalUsers.some((user) => user.balance < 0);

  assert(successCount === 1, `Expected exactly one success, got ${successCount}`);
  assert(failureCount === 1, `Expected exactly one failure, got ${failureCount}`);
  assert(hasClearError, 'Expected the failed request to include a clear error message');
  assert(orders.length === 1, `Expected exactly one order, got ${orders.length}`);
  assert(finalCourse.seatsLeft === 0, `Expected seatsLeft to be 0, got ${finalCourse.seatsLeft}`);
  assert(!hasNegativeBalance, 'Expected no negative balances');

  console.log('Responses:', JSON.stringify(simplifiedResults, null, 2));
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

  console.log('Safe result: all acceptance checks passed.');

  await disconnectDB();
}

runSafeRaceTest().catch(async (error) => {
  console.error('Safe race test failed:', error.message);
  await disconnectDB();
  process.exit(1);
});

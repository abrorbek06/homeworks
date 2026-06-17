import express from 'express';
import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';

const router = express.Router();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parsePurchaseBody(req) {
  const { userId, courseId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error('Invalid userId');
    error.status = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    const error = new Error('Invalid courseId');
    error.status = 400;
    throw error;
  }

  return { userId, courseId };
}

function publicError(error) {
  if (error.code === 11000) {
    return { status: 409, message: 'User has already purchased this course' };
  }

  return {
    status: error.status || 500,
    message: error.message || 'Unexpected server error'
  };
}

router.post('/buy-unsafe', async (req, res) => {
  try {
    const { userId, courseId } = parsePurchaseBody(req);

    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    if (!course) {
      return res.status(404).json({ ok: false, error: 'Course not found' });
    }

    if (course.seatsLeft <= 0) {
      return res.status(409).json({ ok: false, error: 'No seats left' });
    }

    if (user.balance < course.price) {
      return res.status(409).json({ ok: false, error: 'Insufficient balance' });
    }

    // Duplicate validation exists here, but it is still outside a transaction.
    const existingOrder = await Order.findOne({ userId, courseId });
    if (existingOrder) {
      return res
        .status(409)
        .json({ ok: false, error: 'User has already purchased this course' });
    }

    await delay(1000);

    course.seatsLeft -= 1;
    user.balance -= course.price;

    await course.save();
    await user.save();

    const order = await Order.create({ userId, courseId });

    return res.status(201).json({
      ok: true,
      message: 'Unsafe purchase completed',
      orderId: order._id
    });
  } catch (error) {
    const { status, message } = publicError(error);
    return res.status(status).json({ ok: false, error: message });
  }
});

async function runTransactionWithRetry(work) {
  const session = await mongoose.startSession();

  try {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        session.startTransaction();

        const result = await work(session);

        await session.commitTransaction();
        return result;
      } catch (error) {
        await session.abortTransaction();

        if (error.hasErrorLabel?.('TransientTransactionError') && attempt < 3) {
          continue;
        }

        throw error;
      }
    }

    throw new Error('Transaction retry limit reached');
  } finally {
    await session.endSession();
  }
}

router.post('/buy', async (req, res) => {
  try {
    const { userId, courseId } = parsePurchaseBody(req);

    const result = await runTransactionWithRetry(async (session) => {
      // Transaction operations should be awaited sequentially on the session.
      const user = await User.findById(userId).session(session);
      const course = await Course.findById(courseId).session(session);
      const existingOrder = await Order.findOne({ userId, courseId }).session(session);

      if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      if (!course) {
        const error = new Error('Course not found');
        error.status = 404;
        throw error;
      }

      if (existingOrder) {
        const error = new Error('User has already purchased this course');
        error.status = 409;
        throw error;
      }

      const seatUpdate = await Course.updateOne(
        { _id: courseId, seatsLeft: { $gt: 0 } },
        { $inc: { seatsLeft: -1 } },
        { session }
      );

      if (seatUpdate.modifiedCount !== 1) {
        const error = new Error('No seats left');
        error.status = 409;
        throw error;
      }

      const balanceUpdate = await User.updateOne(
        { _id: userId, balance: { $gte: course.price } },
        { $inc: { balance: -course.price } },
        { session }
      );

      if (balanceUpdate.modifiedCount !== 1) {
        const error = new Error('Insufficient balance');
        error.status = 409;
        throw error;
      }

      const [order] = await Order.create([{ userId, courseId }], { session });

      return {
        orderId: order._id,
        charged: course.price
      };
    });

    return res.status(201).json({
      ok: true,
      message: 'Purchase completed safely',
      ...result
    });
  } catch (error) {
    const { status, message } = publicError(error);
    return res.status(status).json({ ok: false, error: message });
  }
});

export default router;

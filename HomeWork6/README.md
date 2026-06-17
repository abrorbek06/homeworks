# MongoDB Race Condition and Transaction Demo

This project demonstrates an intentional race condition in an unsafe purchase endpoint and then fixes the same workflow with MongoDB transactions.

## Project Structure

```text
.
├── .env.example
├── package.json
├── README.md
├── scripts
│   ├── seed.js
│   ├── testSafeRace.js
│   └── testUnsafeRace.js
└── src
    ├── app.js
    ├── config
    │   └── db.js
    ├── models
    │   ├── Course.js
    │   ├── Order.js
    │   └── User.js
    ├── routes
    │   └── purchaseRoutes.js
    └── server.js
```

## Setup

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

MongoDB transactions require MongoDB to run as a replica set, even for local development. A convenient local command is:

```bash
mongod --replSet rs0 --dbpath ./mongo-data
```

Then initialize it once in `mongosh`:

```js
rs.initiate()
```

## Run The Demos

In one terminal:

```bash
npm run dev
```

In another terminal:

```bash
npm run test:unsafe
npm run test:safe
```

## What Is A Race Condition?

A race condition happens when two or more operations run at the same time and the final result depends on the order in which they happen. In this project, two buyers can read `seatsLeft = 1` before either request saves its update.

## Why The Unsafe Endpoint Fails

`POST /buy-unsafe` reads the user and course, checks the values, waits for one second, and then saves changes. During that one-second delay, another request can read the same original course state. Both requests can decide the seat is available and both can create an order, even though only one seat existed.

## How MongoDB Transactions Solve The Problem

`POST /buy` starts a session and transaction. It performs duplicate-purchase validation, conditionally decrements `seatsLeft`, conditionally decrements the user's balance, creates the order, and commits only if every step succeeds. If anything fails, the transaction aborts and MongoDB rolls back all writes from that transaction.

The safe endpoint also uses a unique compound index on `(userId, courseId)` so the database prevents duplicate purchases even under concurrency.

## Acceptance Criteria

- User, Course, and Order Mongoose schemas are implemented.
- `POST /buy-unsafe` intentionally contains a race condition with a one-second delay.
- `scripts/testUnsafeRace.js` sends two simultaneous axios requests and can show both succeeding with one original seat.
- `POST /buy` uses MongoDB sessions and transactions.
- Duplicate purchases are blocked with validation plus a unique database index.
- `scripts/testSafeRace.js` sends two simultaneous axios requests and verifies one success, one clear failure, exactly one order, `seatsLeft === 0`, and no negative balances.
- A seed script creates one course with `seatsLeft = 1` and two users with `balance = 100`.

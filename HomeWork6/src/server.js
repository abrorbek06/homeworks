import 'dotenv/config';
import { app } from './app.js';
import { connectDB } from './config/db.js';

const port = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

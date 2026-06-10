const http = require('http');
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

const PORT = process.env.PORT || 3000;
const DB_NAME = process.env.DB_NAME || 'simple_blog_db';
const MONGODB_URI = process.env.MONGODB_URI;
``
let client;
let postsCollection;

let connectionPromise;
let mongoServer;
let activeUri = 'not-connected';

async function connectToDatabase() {
  if (postsCollection) return;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    let uri = MONGODB_URI;

    if (!uri) {
      mongoServer = await MongoMemoryServer.create();
      uri = await mongoServer.getUri();
    }


    client = new MongoClient(uri);
    await client.connect();
    activeUri = uri;

    const db = client.db(DB_NAME);
    postsCollection = db.collection('posts');
    await postsCollection.createIndex({ title: 1 });
    await postsCollection.createIndex({ category: 1 });
  })();

  try {
    await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    const dbStatus = postsCollection ? 'connected' : 'disconnected';
    sendJson(res, 200, { status: 'ok', database: dbStatus, uri: activeUri });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/posts') {
    (async () => {
      try {
        await connectToDatabase();
        const posts = await postsCollection.find({}).sort({ createdAt: -1 }).toArray();
        sendJson(res, 200, posts);
      } catch (error) {
        sendJson(res, 500, { error: 'Database connection failed', details: error.message });
      }
    })();
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/posts/')) {
    const id = url.pathname.split('/').pop();

    (async () => {
      try {
        await connectToDatabase();
        const post = await postsCollection.findOne({ id });

        if (!post) {
          sendJson(res, 404, { error: 'Post not found' });
          return;
        }

        sendJson(res, 200, post);
      } catch (error) {
        sendJson(res, 500, { error: 'Database query failed', details: error.message });
      }
    })();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/posts') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        await connectToDatabase();
        const payload = JSON.parse(body);
        const newPost = {
          id: Date.now().toString(),
          title: payload.title,
          author: payload.author,
          category: payload.category,
          content: payload.content,
          createdAt: new Date()
        };

        const result = await postsCollection.insertOne(newPost);
        sendJson(res, 201, { ...newPost, _id: result.insertedId });
      } catch (error) {
        if (error instanceof SyntaxError) {
          sendJson(res, 400, { error: 'Invalid JSON' });
          return;
        }

        sendJson(res, 500, { error: 'Could not save post', details: error.message });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

server.listen(PORT, async () => {
  try {
    await connectToDatabase();
    console.log(`Simple backend server running on http://localhost:${PORT}`);
    console.log(`Connected to MongoDB at ${activeUri}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.log(`Simple backend server running on http://localhost:${PORT}`);
    console.log('Start MongoDB locally or set MONGODB_URI to a reachable server.');
  }
});

process.on('SIGINT', async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
  if (client) {
    await client.close();
  }
  process.exit(0);
});
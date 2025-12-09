const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_PATH = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Load database from disk. If missing, create with starter data.
 */
function loadDB() {
  if (!fs.existsSync(DATA_PATH)) {
    const now = new Date().toISOString();
    const defaultUsers = [
      { id: 'u1', name: 'Alex', avatar: 'https://i.pravatar.cc/150?img=5', bio: 'Frontend tinkerer', followers: ['u2'], following: ['u2'] },
      { id: 'u2', name: 'Jamie', avatar: 'https://i.pravatar.cc/150?img=3', bio: 'Back-end enthusiast', followers: ['u1'], following: ['u1'] }
    ];
    const defaultPosts = [
      { id: 'p1', userId: 'u1', content: 'Excited to ship this mini social app!', image: '', createdAt: now, likes: ['u2'] },
      { id: 'p2', userId: 'u2', content: 'API layer ready. Time for UI polish.', image: '', createdAt: now, likes: ['u1'] }
    ];
    const defaultComments = [
      { id: 'c1', postId: 'p1', userId: 'u2', text: 'Looks great!', createdAt: now },
      { id: 'c2', postId: 'p2', userId: 'u1', text: 'Let’s gooo 🚀', createdAt: now }
    ];
    const starter = { users: defaultUsers, posts: defaultPosts, comments: defaultComments };
    fs.writeFileSync(DATA_PATH, JSON.stringify(starter, null, 2));
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveDB(db) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function getUserById(db, id) {
  return db.users.find((u) => u.id === id);
}

function getPostById(db, id) {
  return db.posts.find((p) => p.id === id);
}

// USERS
app.get('/api/users', (_req, res) => {
  const db = loadDB();
  res.json(db.users);
});

app.get('/api/users/:id', (req, res) => {
  const db = loadDB();
  const user = getUserById(db, req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const { name, avatar = '', bio = '' } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  const db = loadDB();
  const newUser = { id: nanoid(6), name, avatar, bio, followers: [], following: [] };
  db.users.push(newUser);
  saveDB(db);
  res.status(201).json(newUser);
});

app.post('/api/users/:id/follow', (req, res) => {
  const { followerId } = req.body;
  const db = loadDB();
  const target = getUserById(db, req.params.id);
  const follower = getUserById(db, followerId);
  if (!target || !follower) return res.status(404).json({ message: 'User not found' });
  const isFollowing = target.followers.includes(followerId);
  if (isFollowing) {
    target.followers = target.followers.filter((id) => id !== followerId);
    follower.following = follower.following.filter((id) => id !== target.id);
  } else {
    target.followers.push(followerId);
    follower.following.push(target.id);
  }
  saveDB(db);
  res.json({ target, follower });
});

// POSTS
app.get('/api/posts', (req, res) => {
  const { userId } = req.query;
  const db = loadDB();
  const posts = userId ? db.posts.filter((p) => p.userId === userId) : db.posts;
  const enriched = posts
    .map((p) => ({
      ...p,
      user: getUserById(db, p.userId),
      commentCount: db.comments.filter((c) => c.postId === p.id).length
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(enriched);
});

app.get('/api/posts/:id', (req, res) => {
  const db = loadDB();
  const post = getPostById(db, req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  res.json(post);
});

app.post('/api/posts', (req, res) => {
  const { userId, content, image = '' } = req.body;
  if (!userId || !content) return res.status(400).json({ message: 'userId and content required' });
  const db = loadDB();
  const user = getUserById(db, userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const post = { id: nanoid(8), userId, content, image, createdAt: new Date().toISOString(), likes: [] };
  db.posts.push(post);
  saveDB(db);
  res.status(201).json(post);
});

app.post('/api/posts/:id/like', (req, res) => {
  const { userId } = req.body;
  const db = loadDB();
  const post = getPostById(db, req.params.id);
  const user = getUserById(db, userId);
  if (!post || !user) return res.status(404).json({ message: 'Not found' });
  const hasLiked = post.likes.includes(userId);
  post.likes = hasLiked ? post.likes.filter((id) => id !== userId) : [...post.likes, userId];
  saveDB(db);
  res.json(post);
});

// COMMENTS
app.get('/api/posts/:id/comments', (req, res) => {
  const db = loadDB();
  const post = getPostById(db, req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  const comments = db.comments
    .filter((c) => c.postId === post.id)
    .map((c) => ({ ...c, user: getUserById(db, c.userId) }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json(comments);
});

app.post('/api/posts/:id/comments', (req, res) => {
  const { userId, text } = req.body;
  const db = loadDB();
  const post = getPostById(db, req.params.id);
  const user = getUserById(db, userId);
  if (!post || !user) return res.status(404).json({ message: 'Not found' });
  if (!text) return res.status(400).json({ message: 'text required' });
  const comment = { id: nanoid(10), postId: post.id, userId, text, createdAt: new Date().toISOString() };
  db.comments.push(comment);
  saveDB(db);
  res.status(201).json(comment);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


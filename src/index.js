const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');
const db = require('./db');
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');
const createLocalStorage = require('./storage/local');
const createS3Storage = require('./storage/s3');

db.ensureStores();

const app = express();
app.use(express.json());

const storage =
  config.storageBackend === 's3'
    ? createS3Storage(config.s3)
    : createLocalStorage(config.localStoragePath);

// Sync usage on startup
db.writeUsers(db.recomputeUsage(db.readUsers(), db.readFiles()));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSizeBytes },
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    storageBackend: storage.type,
  });
});

app.post('/admin/users', adminMiddleware, (req, res) => {
  const { email, password, limitBytes } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }
  try {
    const user = db.createUser({
      email,
      password,
      limitBytes: limitBytes || config.defaultUserLimitBytes,
    });
    res.status(201).json({
      id: user.id,
      email: user.email,
      limitBytes: user.limitBytes,
      usedBytes: user.usedBytes,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }
  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  if (!bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      limitBytes: user.limitBytes,
      usedBytes: user.usedBytes,
      createdAt: user.createdAt,
    },
  });
});

app.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    limitBytes: req.user.limitBytes,
    usedBytes: req.user.usedBytes,
    createdAt: req.user.createdAt,
  });
});

function getUsage(userId) {
  const fresh = db.findUserById(userId);
  return (fresh && fresh.usedBytes) || 0;
}

app.get('/files', authMiddleware, (req, res) => {
  res.json(db.listFilesByUser(req.user.id));
});

app.post(
  '/files/upload',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'file is required' });
    }
    const currentUsage = getUsage(req.user.id);
    const nextUsage = currentUsage + req.file.size;
    if (nextUsage > req.user.limitBytes) {
      return res
        .status(400)
        .json({ message: 'Storage limit exceeded for this user' });
    }
    try {
      const key = path.join(req.user.id, `${uuidv4()}-${req.file.originalname}`);
      await storage.saveObject(key, req.file.buffer, req.file.mimetype);
      const file = db.addFile({
        id: uuidv4(),
        userId: req.user.id,
        originalName: req.file.originalname,
        storageKey: key,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      });
      res.status(201).json(file);
    } catch (err) {
      res.status(500).json({ message: 'Upload failed', error: err.message });
    }
  }
);

app.get('/files/:id', authMiddleware, async (req, res) => {
  const file = db.findFileById(req.params.id);
  if (!file || file.userId !== req.user.id) {
    return res.status(404).json({ message: 'File not found' });
  }
  try {
    const stream = await storage.getObjectStream(file.storageKey);
    res.setHeader(
      'Content-Type',
      file.mimeType || 'application/octet-stream'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.originalName}"`
    );
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
});

app.delete('/files/:id', authMiddleware, async (req, res) => {
  const file = db.findFileById(req.params.id);
  if (!file || file.userId !== req.user.id) {
    return res.status(404).json({ message: 'File not found' });
  }
  try {
    await storage.deleteObject(file.storageKey);
    db.removeFile(file.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
});

app.patch('/files/:id', authMiddleware, (req, res) => {
  const { filename } = req.body;
  const file = db.findFileById(req.params.id);
  if (!file || file.userId !== req.user.id) {
    return res.status(404).json({ message: 'File not found' });
  }
  if (!filename) {
    return res.status(400).json({ message: 'filename is required' });
  }
  const updated = db.updateFile(file.id, { originalName: filename });
  res.json(updated);
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `TzDrive running on port ${config.port} with backend ${storage.type}`
  );
});

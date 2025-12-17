const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const FILES_FILE = path.join(DATA_DIR, 'files.json');

function ensureStores() {
  fs.ensureDirSync(DATA_DIR);
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeJsonSync(USERS_FILE, []);
  }
  if (!fs.existsSync(FILES_FILE)) {
    fs.writeJsonSync(FILES_FILE, []);
  }
}

function readUsers() {
  ensureStores();
  return fs.readJsonSync(USERS_FILE);
}

function writeUsers(users) {
  fs.writeJsonSync(USERS_FILE, users, { spaces: 2 });
}

function readFiles() {
  ensureStores();
  return fs.readJsonSync(FILES_FILE);
}

function writeFiles(files) {
  fs.writeJsonSync(FILES_FILE, files, { spaces: 2 });
}

function recomputeUsage(users, files) {
  const usageMap = files.reduce((acc, f) => {
    acc[f.userId] = (acc[f.userId] || 0) + (f.size || 0);
    return acc;
  }, {});
  return users.map((u) => ({
    ...u,
    usedBytes: usageMap[u.id] || 0,
  }));
}

function createUser({ email, password, limitBytes }) {
  const users = readUsers();
  if (users.find((u) => u.email === email)) {
    throw new Error('User already exists');
  }
  const parsedLimit = Number(limitBytes);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
  const now = new Date().toISOString();
  const user = {
    id: uuidv4(),
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    limitBytes: limit,
    usedBytes: 0,
    createdAt: now,
  };
  users.push(user);
  writeUsers(users);
  return user;
}

function findUserByEmail(email) {
  return readUsers().find((u) => u.email === email);
}

function findUserById(id) {
  return readUsers().find((u) => u.id === id);
}

function addFile(file) {
  const files = readFiles();
  files.push(file);
  writeFiles(files);
  const users = recomputeUsage(readUsers(), files);
  writeUsers(users);
  return file;
}

function updateFile(fileId, updater) {
  const files = readFiles();
  const idx = files.findIndex((f) => f.id === fileId);
  if (idx === -1) return null;
  const updated = typeof updater === 'function' ? updater(files[idx]) : updater;
  files[idx] = { ...files[idx], ...updated };
  writeFiles(files);
  const users = recomputeUsage(readUsers(), files);
  writeUsers(users);
  return files[idx];
}

function listFilesByUser(userId) {
  return readFiles().filter((f) => f.userId === userId);
}

function findFileById(fileId) {
  return readFiles().find((f) => f.id === fileId);
}

function removeFile(fileId) {
  const files = readFiles();
  const remaining = files.filter((f) => f.id !== fileId);
  writeFiles(remaining);
  const users = recomputeUsage(readUsers(), remaining);
  writeUsers(users);
}

module.exports = {
  ensureStores,
  readUsers,
  writeUsers,
  readFiles,
  writeFiles,
  recomputeUsage,
  createUser,
  findUserByEmail,
  findUserById,
  addFile,
  updateFile,
  listFilesByUser,
  findFileById,
  removeFile,
};

const fs = require('fs/promises');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.json');

async function readDatabase() {
  const content = await fs.readFile(dbPath, 'utf8');
  return JSON.parse(content);
}

async function writeDatabase(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function getNextId(items) {
  if (!Array.isArray(items) || items.length === 0) return 1;
  return Math.max(...items.map((item) => Number(item.id) || 0)) + 1;
}

module.exports = { readDatabase, writeDatabase, getNextId };

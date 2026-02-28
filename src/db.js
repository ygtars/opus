const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');

async function connectDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

async function ensureColumn(db, table, column, ddlType) {
  const cols = await db.all(`PRAGMA table_info(${table})`);
  const hasColumn = cols.some((c) => c.name === column);
  if (!hasColumn) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddlType}`);
  }
}

async function initSchema(db) {
  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER,
      full_name TEXT NOT NULL,
      role TEXT,
      capacity_hours_per_day INTEGER DEFAULT 6,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS member_skills (
      member_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      level TEXT DEFAULT 'mid',
      PRIMARY KEY (member_id, skill_id),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      phase TEXT DEFAULT 'MVP',
      required_skill TEXT,
      estimate_hours INTEGER DEFAULT 4,
      day_index INTEGER,
      day_date TEXT,
      status TEXT DEFAULT 'todo',
      assigned_member_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS task_dependencies (
      task_id INTEGER NOT NULL,
      blocked_by_task_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, blocked_by_task_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_by_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ensureColumn(db, 'projects', 'organization_id', 'INTEGER');
  await ensureColumn(db, 'members', 'organization_id', 'INTEGER');
  await ensureColumn(db, 'tasks', 'day_date', 'TEXT');
}

module.exports = {
  connectDb,
  initSchema
};

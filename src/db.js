const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_PATH = path.join(__dirname, '..', 'data.sqlite');

async function connectDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

async function initSchema(db) {
  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  `);
}

module.exports = {
  connectDb,
  initSchema
};

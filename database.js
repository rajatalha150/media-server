const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');

class Database {
  constructor() {
    this.usePostgres = process.env.NODE_ENV === 'production';
    this.db = null;
  }

  async init() {
    if (this.usePostgres) {
      await this.initPostgres();
    } else {
      await this.initSQLite();
    }
    await this.createTables();
  }

  async initSQLite() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(path.join(__dirname, 'media.db'), (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async initPostgres() {
    this.db = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'mediaserver',
      user: process.env.DB_USER || 'mediauser',
      password: process.env.DB_PASSWORD || 'mediapass'
    });

    try {
      await this.db.connect();
      console.log('Connected to PostgreSQL database');
    } catch (error) {
      console.error('PostgreSQL connection failed, falling back to SQLite');
      this.usePostgres = false;
      await this.initSQLite();
    }
  }

  async createTables() {
    const createMediaTable = this.usePostgres ? `
      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        mime_type VARCHAR(100),
        file_size BIGINT,
        folder_path TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    ` : `
      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        folder_path TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createFoldersTable = this.usePostgres ? `
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        path TEXT NOT NULL UNIQUE,
        parent_path TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    ` : `
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        parent_path TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    if (this.usePostgres) {
      await this.db.query(createMediaTable);
      await this.db.query(createFoldersTable);
    } else {
      await new Promise((resolve, reject) => {
        this.db.run(createMediaTable, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      await new Promise((resolve, reject) => {
        this.db.run(createFoldersTable, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async addMedia(mediaData) {
    const { filename, originalName, filePath, mimeType, fileSize, folderPath } = mediaData;
    
    if (this.usePostgres) {
      const query = `
        INSERT INTO media (filename, original_name, file_path, mime_type, file_size, folder_path)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `;
      const result = await this.db.query(query, [filename, originalName, filePath, mimeType, fileSize, folderPath]);
      return result.rows[0].id;
    } else {
      return new Promise((resolve, reject) => {
        const query = `
          INSERT INTO media (filename, original_name, file_path, mime_type, file_size, folder_path)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        this.db.run(query, [filename, originalName, filePath, mimeType, fileSize, folderPath], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
    }
  }

  async addFolder(name, path, parentPath = '') {
    if (this.usePostgres) {
      const query = `
        INSERT INTO folders (name, path, parent_path)
        VALUES ($1, $2, $3) ON CONFLICT (path) DO NOTHING RETURNING id
      `;
      const result = await this.db.query(query, [name, path, parentPath]);
      return result.rows[0]?.id;
    } else {
      return new Promise((resolve, reject) => {
        const query = `
          INSERT OR IGNORE INTO folders (name, path, parent_path)
          VALUES (?, ?, ?)
        `;
        this.db.run(query, [name, path, parentPath], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
    }
  }
}

module.exports = Database;
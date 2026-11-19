const fs = require('fs');
const path = require('path');

describe('Database Migrations', () => {
  const migrationsDir = path.join(__dirname, '../migrations');

  it('should have migrations directory', () => {
    expect(fs.existsSync(migrationsDir)).toBe(true);
  });

  it('should have migration files', () => {
    const files = fs.readdirSync(migrationsDir);
    expect(files.length).toBeGreaterThan(0);
  });

  it('should have properly named migration files', () => {
    const files = fs.readdirSync(migrationsDir);
    const migrationPattern = /^\d+_[a-z0-9-]+\.js$/;

    files.forEach((file) => {
      expect(file).toMatch(migrationPattern);
    });
  });

  it('should have initial schema migration', () => {
    const files = fs.readdirSync(migrationsDir);
    const hasInitial = files.some((file) => file.includes('initial'));
    expect(hasInitial).toBe(true);
  });

  it('should have create tasks migration', () => {
    const files = fs.readdirSync(migrationsDir);
    const hasCreateTasks = files.some((file) => file.includes('tasks'));
    expect(hasCreateTasks).toBe(true);
  });

  describe('Migration file structure', () => {
    it('should have up and down functions in initial schema', () => {
      const migrationPath = path.join(migrationsDir, '1718500000000_initial-schema.js');
      const migration = require(migrationPath);

      expect(typeof migration.up).toBe('function');
      expect(typeof migration.down).toBe('function');
    });

    it('should have up and down functions in create tasks', () => {
      const migrationPath = path.join(migrationsDir, '1718500001000_create-tasks.js');
      const migration = require(migrationPath);

      expect(typeof migration.up).toBe('function');
      expect(typeof migration.down).toBe('function');
    });
  });

  describe('Migration content validation', () => {
    it('initial schema should create users table', () => {
      const migrationPath = path.join(migrationsDir, '1718500000000_initial-schema.js');
      const content = fs.readFileSync(migrationPath, 'utf8');

      expect(content).toContain('users');
      expect(content).toContain('email');
    });

    it('create tasks should create tasks table', () => {
      const migrationPath = path.join(migrationsDir, '1718500001000_create-tasks.js');
      const content = fs.readFileSync(migrationPath, 'utf8');

      expect(content).toContain('tasks');
      expect(content).toContain('title');
      expect(content).toContain('completed');
    });

    it('migrations should have proper timestamps', () => {
      const files = fs.readdirSync(migrationsDir);
      const timestamps = files.map((file) => {
        const match = file.match(/^(\d+)_/);
        return match ? parseInt(match[1], 10) : 0;
      });

      // Check that timestamps are in ascending order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }
    });
  });

  describe('Migration execution', () => {
    it('should be able to require all migration files', () => {
      const files = fs.readdirSync(migrationsDir);

      files.forEach((file) => {
        const migrationPath = path.join(migrationsDir, file);
        expect(() => {
          require(migrationPath);
        }).not.toThrow();
      });
    });

    it('should have valid JavaScript syntax', () => {
      const files = fs.readdirSync(migrationsDir);

      files.forEach((file) => {
        const migrationPath = path.join(migrationsDir, file);
        const content = fs.readFileSync(migrationPath, 'utf8');

        // Basic syntax check - should not throw when parsed
        expect(() => {
          new Function(content);
        }).not.toThrow();
      });
    });
  });
});

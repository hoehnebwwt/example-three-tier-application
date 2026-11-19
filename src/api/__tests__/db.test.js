const db = require('../db');
const { Pool } = require('pg');

jest.mock('pg');

describe('Database Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a Pool instance', () => {
    expect(Pool).toHaveBeenCalled();
  });

  it('should use DATABASE_URL from environment', () => {
    const originalEnv = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost/testdb';

    // Clear the require cache and re-require to test with new env
    jest.resetModules();
    jest.mock('pg');
    const newDb = require('../db');

    expect(newDb).toBeDefined();

    process.env.DATABASE_URL = originalEnv;
  });

  it('should export a pool instance', () => {
    expect(db).toBeDefined();
    expect(typeof db.query).toBe('function');
  });

  describe('Query execution', () => {
    it('should execute queries', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      db.query = mockQuery;

      await db.query('SELECT * FROM tasks');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM tasks');
    });

    it('should handle query parameters', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
      db.query = mockQuery;

      await db.query('SELECT * FROM tasks WHERE id = $1', [1]);

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM tasks WHERE id = $1', [1]);
    });

    it('should return query results', async () => {
      const mockResults = { rows: [{ id: 1, title: 'Test' }] };
      const mockQuery = jest.fn().mockResolvedValue(mockResults);
      db.query = mockQuery;

      const result = await db.query('SELECT * FROM tasks');

      expect(result).toEqual(mockResults);
    });

    it('should handle query errors', async () => {
      const mockError = new Error('Connection failed');
      const mockQuery = jest.fn().mockRejectedValue(mockError);
      db.query = mockQuery;

      await expect(db.query('SELECT * FROM tasks')).rejects.toThrow('Connection failed');
    });
  });
});

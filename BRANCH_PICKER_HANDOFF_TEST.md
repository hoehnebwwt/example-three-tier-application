# Migration: Add Due Date to Tasks

## Overview

This document describes the database migration that adds due date functionality to the tasks table.

## Migration Details

**Migration File:** `1718500002000_add-due-date-to-tasks.js`

### Up Migration

The `up` migration adds a `due_date` column to the `tasks` table with the following specifications:

- **Column Name:** `due_date`
- **Data Type:** `timestamp`
- **Nullable:** Yes (`notNull: false`)

This allows tasks to have an optional due date.

### Down Migration

The `down` migration drops the `due_date` column from the `tasks` table, reverting the schema to its previous state.

## Implementation

The migration uses the `pg-migrate` library to manage schema changes:

```javascript
exports.up = (pgm) => {
  pgm.addColumn('tasks', {
    due_date: { type: 'timestamp', notNull: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('tasks', 'due_date');
};
```

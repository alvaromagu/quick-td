import { db } from './db.js';

export const todoService = {
  getAllTodos() {
    return db.prepare('SELECT * FROM tasks').all();
  },

  getPendingTodos() {
    return db.prepare('SELECT * FROM tasks WHERE completed = 0').all();
  },

  getCompletedTodosByDate(date) {
    return db.prepare('SELECT * FROM tasks WHERE completed_at = ?').all(date);
  },

  createTodo(name) {
    return db.prepare('INSERT INTO tasks (task) VALUES (?)').run(name);
  },

  updateTodoName(id, newName) {
    return db
      .prepare('UPDATE tasks SET task = ? WHERE id = ?')
      .run(newName, id);
  },

  updateTodoStatuses(selectedIds, completedAt) {
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE tasks SET completed = 0, completed_at = NULL').run();
      const updateStmt = db.prepare(
        'UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?',
      );
      for (const id of selectedIds) {
        updateStmt.run(completedAt, id);
      }
      db.exec('COMMIT');
      console.log('Tasks updated successfully.');
    } catch (error) {
      db.exec('ROLLBACK');
      console.error('Transaction failed, changes rolled back:', error.message);
      throw error;
    }
  },

  deleteTodo(id) {
    return db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  },
};

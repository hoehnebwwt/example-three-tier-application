/**
 * TaskValidator - A utility class for validating task data
 */
class TaskValidator {
  /**
   * Validates a task title
   * @param {string} title - The title to validate
   * @returns {object} - { valid: boolean, error?: string }
   */
  static validateTitle(title) {
    if (!title) {
      return { valid: false, error: 'Title is required' };
    }
    if (typeof title !== 'string') {
      return { valid: false, error: 'Title must be a string' };
    }
    if (!title.trim()) {
      return { valid: false, error: 'Title cannot be empty or whitespace' };
    }
    if (title.length > 255) {
      return { valid: false, error: 'Title must be 255 characters or less' };
    }
    return { valid: true };
  }

  /**
   * Validates a task ID
   * @param {number} id - The ID to validate
   * @returns {object} - { valid: boolean, error?: string }
   */
  static validateId(id) {
    if (id === undefined || id === null) {
      return { valid: false, error: 'ID is required' };
    }
    const numId = parseInt(id, 10);
    if (isNaN(numId) || numId <= 0) {
      return { valid: false, error: 'ID must be a positive integer' };
    }
    return { valid: true };
  }

  /**
   * Validates a completed flag
   * @param {boolean} completed - The completed flag to validate
   * @returns {object} - { valid: boolean, error?: string }
   */
  static validateCompleted(completed) {
    if (typeof completed !== 'boolean') {
      return { valid: false, error: 'Completed must be a boolean' };
    }
    return { valid: true };
  }
}

module.exports = TaskValidator;

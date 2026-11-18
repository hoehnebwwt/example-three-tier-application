const TaskValidator = require('./TaskValidator');

// Simple test runner
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✓ PASS: ${message}`);
    passed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${message} (expected ${expected}, got ${actual})`);
    failed++;
  } else {
    console.log(`✓ PASS: ${message}`);
    passed++;
  }
}

console.log('\n=== TaskValidator Tests ===\n');

// Test validateTitle
console.log('Testing validateTitle:');
let result = TaskValidator.validateTitle('Buy groceries');
assert(result.valid === true, 'should return valid for a proper title');
assert(result.error === undefined, 'should have no error for valid title');

result = TaskValidator.validateTitle('');
assert(result.valid === false, 'should return invalid for empty string');
assertEqual(result.error, 'Title is required', 'should have correct error for empty string');

result = TaskValidator.validateTitle('   ');
assert(result.valid === false, 'should return invalid for whitespace-only string');
assertEqual(result.error, 'Title cannot be empty or whitespace', 'should have correct error for whitespace');

result = TaskValidator.validateTitle(123);
assert(result.valid === false, 'should return invalid for non-string input');
assertEqual(result.error, 'Title must be a string', 'should have correct error for non-string');

result = TaskValidator.validateTitle(null);
assert(result.valid === false, 'should return invalid for null input');
assertEqual(result.error, 'Title is required', 'should have correct error for null');

const longTitle = 'a'.repeat(256);
result = TaskValidator.validateTitle(longTitle);
assert(result.valid === false, 'should return invalid for title exceeding 255 characters');
assertEqual(result.error, 'Title must be 255 characters or less', 'should have correct error for long title');

const maxTitle = 'a'.repeat(255);
result = TaskValidator.validateTitle(maxTitle);
assert(result.valid === true, 'should return valid for title with exactly 255 characters');

// Test validateId
console.log('\nTesting validateId:');
result = TaskValidator.validateId(1);
assert(result.valid === true, 'should return valid for a positive integer');
assert(result.error === undefined, 'should have no error for valid ID');

result = TaskValidator.validateId('42');
assert(result.valid === true, 'should return valid for a string representation of positive integer');

result = TaskValidator.validateId(0);
assert(result.valid === false, 'should return invalid for zero');
assertEqual(result.error, 'ID must be a positive integer', 'should have correct error for zero');

result = TaskValidator.validateId(-5);
assert(result.valid === false, 'should return invalid for negative number');
assertEqual(result.error, 'ID must be a positive integer', 'should have correct error for negative');

result = TaskValidator.validateId(null);
assert(result.valid === false, 'should return invalid for null');
assertEqual(result.error, 'ID is required', 'should have correct error for null');

result = TaskValidator.validateId(undefined);
assert(result.valid === false, 'should return invalid for undefined');
assertEqual(result.error, 'ID is required', 'should have correct error for undefined');

result = TaskValidator.validateId('abc');
assert(result.valid === false, 'should return invalid for non-numeric string');
assertEqual(result.error, 'ID must be a positive integer', 'should have correct error for non-numeric string');

// Test validateCompleted
console.log('\nTesting validateCompleted:');
result = TaskValidator.validateCompleted(true);
assert(result.valid === true, 'should return valid for true');
assert(result.error === undefined, 'should have no error for true');

result = TaskValidator.validateCompleted(false);
assert(result.valid === true, 'should return valid for false');
assert(result.error === undefined, 'should have no error for false');

result = TaskValidator.validateCompleted(1);
assert(result.valid === false, 'should return invalid for non-boolean value (1)');
assertEqual(result.error, 'Completed must be a boolean', 'should have correct error for number');

result = TaskValidator.validateCompleted('true');
assert(result.valid === false, 'should return invalid for string');
assertEqual(result.error, 'Completed must be a boolean', 'should have correct error for string');

result = TaskValidator.validateCompleted(null);
assert(result.valid === false, 'should return invalid for null');
assertEqual(result.error, 'Completed must be a boolean', 'should have correct error for null');

// Summary
console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}\n`);

process.exit(failed > 0 ? 1 : 0);

const fs = require('fs');

global.window = global;
global.console = console;

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};
global.sessionStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

// Load storage.js
const code = fs.readFileSync('frontend/js/storage.js', 'utf-8');
eval(code);

console.log('--- TEST 1: Initial getAccounts ---');
const initialAccounts = Storage.getAccounts();
console.log('Initial accounts count:', initialAccounts.length);
console.log('Handles:', initialAccounts.map(a => a.handle));

console.log('--- TEST 2: Add New Account ---');
const newAcc = {
  handle: '@johndoe_cs',
  displayName: 'John Doe',
  email: 'john.doe@campus.edu',
  department: 'Computer Science & Engineering',
  semester: 5,
  role: 'STUDENT'
};
Storage.addAccount(newAcc);

console.log('--- TEST 3: Retrieve After Adding ---');
const afterAccounts = Storage.getAccounts();
console.log('Accounts count after add:', afterAccounts.length);
console.log('Handles:', afterAccounts.map(a => a.handle));

const found = afterAccounts.some(a => a.handle === '@johndoe_cs');
if (!found) {
  console.error('FAIL: @johndoe_cs NOT FOUND IN getAccounts()!');
  process.exit(1);
} else {
  console.log('SUCCESS: @johndoe_cs successfully persisted and retrieved from Storage!');
}

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSalary } from '../jobs-remotive-worker';

test('parseSalary parses k suffix ranges', () => {
  const salary = parseSalary('$55k – $75k USD');

  assert.equal(salary.currency, 'USD');
  assert.equal(salary.min, 55_000);
  assert.equal(salary.max, 75_000);
});

test('parseSalary parses decimal k suffix values', () => {
  const salary = parseSalary('€3.5k');

  assert.equal(salary.currency, 'EUR');
  assert.equal(salary.min, 3_500);
  assert.equal(salary.max, 3_500);
});

test('parseSalary parses single value with suffix and trailing text', () => {
  const salary = parseSalary('100k+ GBP');

  assert.equal(salary.currency, 'GBP');
  assert.equal(salary.min, 100_000);
  assert.equal(salary.max, 100_000);
});

test('parseSalary keeps old format without suffixes', () => {
  const salary = parseSalary('50000 - 70000 PLN');

  assert.equal(salary.currency, 'PLN');
  assert.equal(salary.min, 50_000);
  assert.equal(salary.max, 70_000);
});

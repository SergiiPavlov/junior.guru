import assert from "node:assert/strict";
import test from "node:test";

import { buildPageItems } from "./JobsPagination";

test("buildPageItems returns full range when totalPages is small", () => {
  const result = buildPageItems(2, 3);
  assert.deepEqual(result, [1, 2, 3]);
});

test("buildPageItems shows window around current page with ellipsis", () => {
  const result = buildPageItems(5, 10);
  assert.deepEqual(result, [1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
});

test("buildPageItems clamps window near the end", () => {
  const result = buildPageItems(10, 12);
  assert.deepEqual(result, [1, "ellipsis", 9, 10, 11, "ellipsis", 12]);
});

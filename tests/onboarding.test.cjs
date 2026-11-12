const test = require("node:test");
const assert = require("node:assert/strict");
const { STORAGE_KEY, shouldShowOnboarding, markOnboardingSeen } = require("../onboarding.js");

test("first-time visitors are shown the guide when no completion flag exists", () => {
  const storage = { getItem: () => null };
  assert.equal(shouldShowOnboarding(storage), true);
});

test("the guide is not automatically shown after it has been dismissed", () => {
  const storage = { getItem: (key) => key === STORAGE_KEY ? "1" : null };
  assert.equal(shouldShowOnboarding(storage), false);
});

test("dismissing the guide persists a versioned completion flag", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  assert.equal(markOnboardingSeen(storage), true);
  assert.equal(values.get(STORAGE_KEY), "1");
  assert.equal(shouldShowOnboarding(storage), false);
});

test("storage errors do not prevent the guide from being offered", () => {
  const storage = {
    getItem: () => { throw new Error("storage unavailable"); },
    setItem: () => { throw new Error("storage unavailable"); }
  };
  assert.equal(shouldShowOnboarding(storage), true);
  assert.equal(markOnboardingSeen(storage), false);
});

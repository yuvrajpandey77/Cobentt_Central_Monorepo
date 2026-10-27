import { test } from "node:test";
import assert from "node:assert/strict";
import { runAccountPurge } from "./account-purge-core";

test("billing is cancelled before any account rows are deleted", async () => {
  const calls: string[] = [];
  await runAccountPurge("user_123456", {
    cancelSubscription: async () => {
      calls.push("cancel");
      return true;
    },
    deleteAccountRows: async () => {
      calls.push("delete");
    },
  });
  assert.deepEqual(calls, ["cancel", "delete"]);
});

test("if Razorpay refuses the cancel, nothing is deleted and the error reaches the caller", async () => {
  let deleted = false;
  await assert.rejects(
    runAccountPurge("user_123456", {
      cancelSubscription: async () => {
        throw new Error("razorpay down");
      },
      deleteAccountRows: async () => {
        deleted = true;
      },
    }),
    /razorpay down/,
  );
  assert.equal(deleted, false);
});

test("an account with no subscription is still purged", async () => {
  let deleted = false;
  await runAccountPurge("user_123456", {
    cancelSubscription: async () => false,
    deleteAccountRows: async () => {
      deleted = true;
    },
  });
  assert.equal(deleted, true);
});

test("refuses an empty user id before touching anything", async () => {
  let touched = false;
  await assert.rejects(
    runAccountPurge("", {
      cancelSubscription: async () => {
        touched = true;
        return false;
      },
      deleteAccountRows: async () => {
        touched = true;
      },
    }),
    /clerkUserId is required/,
  );
  assert.equal(touched, false);
});

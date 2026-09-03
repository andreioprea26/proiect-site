import assert from "node:assert/strict";
import test from "node:test";

import {
  prepareOperationalEmail,
  resendIdempotencyKey,
  sendOperationalEmail,
} from "../../src/lib/email/delivery.ts";
import { renderOperationalEmail } from "../../src/lib/email/templates.ts";

const snapshot = {
  publicNumber: "CMD-2026-00000001",
  confirmationUrl: "http://localhost:3000/order-confirmation/test-token",
  shippingMethodName: "Curier test",
  paymentMethod: "cash_on_delivery",
  statusLabel: "Expediată",
  totalMinor: 1550,
  currency: "RON",
  recipientName: "Client Test",
  city: "Iași",
  county: "Iași",
  items: [{ productName: "Produs snapshot", quantity: 1, lineSubtotalMinor: 1050 }],
  shipment: {
    carrier: "Curier Test",
    trackingNumber: "AWB-001",
    trackingUrl: "https://tracking.example.com/AWB-001",
  },
};

test("redirect sends only to the configured test recipient", () => {
  const message = renderOperationalEmail("order_confirmation", snapshot);
  const payload = prepareOperationalEmail({ mode: "redirect", originalRecipient: "client@example.com", testRecipient: "delivered@resend.dev", from: "Test <onboarding@resend.dev>", replyTo: null, message });
  assert.equal(payload.to, "delivered@resend.dev");
  assert.match(payload.subject, /^\[TEST pentru cl\*+@example\.com\]/);
  assert.doesNotMatch(payload.subject, /client@example\.com/);
});

test("redirect refuses to fall back to the customer address", () => {
  const message = renderOperationalEmail("ready", snapshot);
  assert.throws(() => prepareOperationalEmail({ mode: "redirect", originalRecipient: "client@example.com", testRecipient: null, from: "sender@example.com", replyTo: null, message }), /email_test_recipient_missing/);
});

test("live mode preserves the real recipient without test prefix", () => {
  const message = renderOperationalEmail("ready", snapshot);
  const payload = prepareOperationalEmail({ mode: "live", originalRecipient: "client@example.com", testRecipient: "test@example.com", from: "sender@example.com", replyTo: "reply@example.com", message });
  assert.equal(payload.to, "client@example.com");
  assert.equal(payload.subject, message.subject);
  assert.equal(payload.replyTo, "reply@example.com");
});

test("order template contains snapshots and both HTML/text variants", () => {
  const message = renderOperationalEmail("order_confirmation", snapshot);
  assert.match(message.text, /Produs snapshot/);
  assert.match(message.text, /ramburs/);
  assert.match(message.html, /CMD-2026-00000001/);
  assert.doesNotMatch(message.html, /internal UUID/i);
});

test("shipped template includes legitimate tracking fields", () => {
  const message = renderOperationalEmail("shipped", snapshot);
  assert.match(message.text, /AWB-001/);
  assert.match(message.html, /https:\/\/tracking\.example\.com\/AWB-001/);
});

test("Resend idempotency is stable per attempt and changes for retry", () => {
  const notificationId = "7c000000-0000-4000-8000-000000000099";
  assert.equal(resendIdempotencyKey(notificationId, 1), resendIdempotencyKey(notificationId, 1));
  assert.notEqual(resendIdempotencyKey(notificationId, 1), resendIdempotencyKey(notificationId, 2));
  assert.doesNotMatch(resendIdempotencyKey(notificationId, 1), /@/);
});

test("sender boundary exposes payload/options without network", async () => {
  const calls = [];
  const fakeSender = async (payload, options) => {
    calls.push({ payload, options });
    return { id: "email_mock_001" };
  };
  const payload = prepareOperationalEmail({ mode: "redirect", originalRecipient: "client@example.com", testRecipient: "test@example.com", from: "sender@example.com", replyTo: null, message: renderOperationalEmail("payment_confirmation", snapshot) });
  const result = await sendOperationalEmail(fakeSender, payload, { apiKey: "not-a-real-key", idempotencyKey: "notification:test:attempt:1" });
  assert.equal(result.id, "email_mock_001");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.to, "test@example.com");
  assert.equal(calls[0].options.idempotencyKey, "notification:test:attempt:1");
});

test("provider error propagates to the orchestrator boundary", async () => {
  const failingSender = async () => { throw new Error("provider_down"); };
  await assert.rejects(() => sendOperationalEmail(failingSender, { from: "sender@example.com", to: "test@example.com", subject: "Test", html: "<p>Test</p>", text: "Test" }, { apiKey: "not-a-real-key", idempotencyKey: "notification:test:attempt:1" }), /provider_down/);
});

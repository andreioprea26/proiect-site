import type { EmailDeliveryMode } from "@/lib/config/env";

import type { RenderedOperationalEmail } from "./templates";

export type OperationalEmailPayload = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

export type OperationalEmailSender = (
  payload: OperationalEmailPayload,
  options: { apiKey: string; idempotencyKey: string },
) => Promise<{ id: string }>;

export function prepareOperationalEmail(input: {
  mode: EmailDeliveryMode;
  originalRecipient: string;
  testRecipient: string | null;
  from: string;
  replyTo: string | null;
  message: RenderedOperationalEmail;
}): OperationalEmailPayload {
  if (input.mode === "redirect" && !input.testRecipient) {
    throw new Error("email_test_recipient_missing");
  }
  return {
    from: input.from,
    to: input.mode === "live" ? input.originalRecipient : input.testRecipient as string,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    subject: input.mode === "redirect"
      ? `[TEST pentru ${maskRecipient(input.originalRecipient)}] ${input.message.subject}`
      : input.message.subject,
    html: input.message.html,
    text: input.message.text,
  };
}

function maskRecipient(value: string) {
  const [local = "", domain = ""] = value.split("@");
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export function resendIdempotencyKey(notificationId: string, attemptNumber: number) {
  return `notification:${notificationId}:attempt:${attemptNumber}`;
}

export async function sendOperationalEmail(
  sender: OperationalEmailSender,
  payload: OperationalEmailPayload,
  options: { apiKey: string; idempotencyKey: string },
) {
  return sender(payload, options);
}

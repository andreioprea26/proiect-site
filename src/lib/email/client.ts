import "server-only";

import { Resend } from "resend";

import type { OperationalEmailSender } from "./delivery";

export const sendWithResend: OperationalEmailSender = async (payload, options) => {
  const resend = new Resend(options.apiKey);
  const response = await resend.emails.send(payload, {
    idempotencyKey: options.idempotencyKey,
  });
  if (response.error || !response.data?.id) {
    throw new Error(response.error?.name || "resend_send_failed");
  }
  return { id: response.data.id };
};

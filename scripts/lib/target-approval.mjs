import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, sep } from 'node:path';
import { requireGate, digest } from './client-preflight.mjs';

// The operator owns this trust anchor, outside Git; no key generation or approval in the runner.
function mac(payload, env) {
  requireGate(/^[a-f0-9]{64}$/.test(env.CLIENT_TARGET_APPROVAL_KEY ?? ''), 'APPROVAL_OPERATOR_KEY_REQUIRED');
  return createHmac('sha256', Buffer.from(env.CLIENT_TARGET_APPROVAL_KEY, 'hex')).update(JSON.stringify(payload)).digest('hex');
}
export function externalApprovalPath(root, path) {
  requireGate(typeof path === 'string' && isAbsolute(path), 'EXTERNAL_TARGET_APPROVAL_REQUIRED');
  const rel = relative(realpathSync(root), realpathSync(path));
  requireGate(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel), 'APPROVAL_MUST_BE_OUTSIDE_REPOSITORY');
  return path;
}
export const approvalChallenge = identity => `APPROVE NON-PRODUCTION ${identity.ref} ${identity.organizationId}`;
export function issueTargetApproval(config, env, identity, answer, now = Date.now()) {
  requireGate(answer === approvalChallenge(identity), 'EXPLICIT_OWNER_APPROVAL_REQUIRED');
  const payload = { version: 1, purpose: 'client-test-preview-only', configDigest: digest(JSON.stringify(config)),
    identity, approvedAt: now, expiresAt: now + 24 * 60 * 60 * 1000 };
  return { payload, signature: mac(payload, env) };
}
export function verifyTargetApproval(root, config, env, identity, now = Date.now()) {
  const path = externalApprovalPath(root, env.CLIENT_TARGET_APPROVAL);
  const { payload, signature } = JSON.parse(readFileSync(path, 'utf8'));
  const expected = mac(payload, env);
  requireGate(typeof signature === 'string' && /^[a-f0-9]{64}$/.test(signature)
    && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex')), 'APPROVAL_SIGNATURE_INVALID');
  requireGate(payload.version === 1 && payload.purpose === 'client-test-preview-only'
    && Number.isSafeInteger(payload.approvedAt) && Number.isSafeInteger(payload.expiresAt)
    && payload.approvedAt <= now && payload.expiresAt > now && payload.expiresAt - payload.approvedAt === 86400000, 'APPROVAL_EXPIRED_OR_INVALID');
  requireGate(payload.configDigest === digest(JSON.stringify(config))
    && JSON.stringify(payload.identity) === JSON.stringify(identity), 'APPROVED_IDENTITY_OR_CONFIG_MISMATCH');
}

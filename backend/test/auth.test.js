import test from 'node:test';
import assert from 'node:assert/strict';
import { canSelfAssignRole, phoneOtpRequestSchema, registerSchema, roleSchema } from '../dist/auth.js';

test('public registration accepts a patient and supplies the patient role', () => {
  const result = registerSchema.safeParse({ phone: '+919876543210', password: 'a-long-demo-password' });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.role, 'patient');
});

test('public registration rejects self-assignment of privileged roles', () => {
  const result = registerSchema.safeParse({ phone: '+919876543210', password: 'a-long-demo-password', role: 'admin' });
  assert.equal(result.success, false);
});

test('registration requires a valid contact and a long password', () => {
  assert.equal(registerSchema.safeParse({ password: 'short' }).success, false);
  assert.equal(registerSchema.safeParse({ phone: 'bad', password: 'a-long-demo-password' }).success, false);
});

test('role validation only permits the four configured roles', () => {
  for (const role of ['patient', 'doctor', 'admin', 'seller']) assert.equal(roleSchema.safeParse(role).success, true);
  assert.equal(roleSchema.safeParse('owner').success, false);
});

test('production OTP login cannot self-assign staff roles', () => {
  assert.equal(canSelfAssignRole('production', [], 'patient'), true);
  assert.equal(canSelfAssignRole('production', [], 'admin'), false);
  assert.equal(canSelfAssignRole('production', ['doctor'], 'doctor'), true);
  assert.equal(canSelfAssignRole('production', ['doctor'], 'admin'), false);
  assert.equal(canSelfAssignRole('development', [], 'admin'), true);
});

test('phone OTP request requires a valid phone and known portal role', () => {
  assert.equal(phoneOtpRequestSchema.safeParse({ phone: '+919876543210', role: 'patient' }).success, true);
  assert.equal(phoneOtpRequestSchema.safeParse({ phone: 'bad', role: 'patient' }).success, false);
  assert.equal(phoneOtpRequestSchema.safeParse({ phone: '+919876543210', role: 'unknown' }).success, false);
});

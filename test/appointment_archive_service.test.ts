import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpsNotification, decideArchiveDisposition, type AppointmentArchiveRequest } from '../src/appointment_archive_service';

const baseRequest: AppointmentArchiveRequest = {
  appointmentId: 'apt_2026_04_18_0815',
  clinicCode: 'west-cardiology',
  appointmentStatus: 'completed',
  urgent: false,
  patient: {
    fullName: 'Jane Doe',
    dateOfBirth: '1978-05-15',
    phone: '555-0100'
  },
  pdfBase64: 'JVBERi0xLjQKJQ==',
  manualRegions: []
};

test('completed appointment is archive-ready and notification stays patient-safe', () => {
  const decision = decideArchiveDisposition(baseRequest);
  const notification = buildOpsNotification(baseRequest, decision);

  assert.equal(decision, 'ready_for_archive');
  assert.match(notification, /apt_2026_04_18_0815/);
  assert.doesNotMatch(notification, /Jane Doe/);
  assert.doesNotMatch(notification, /1978-05-15/);
  assert.doesNotMatch(notification, /555-0100/);
});

test('urgent appointment is routed to review', () => {
  const urgentRequest: AppointmentArchiveRequest = {
    ...baseRequest,
    urgent: true
  };

  assert.equal(decideArchiveDisposition(urgentRequest), 'needs_review');
});

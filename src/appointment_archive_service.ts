import { z } from 'zod';
import { infrai } from './infrai_client';

const redactRegionSchema = z.object({
  page: z.number().int().min(1),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive()
});

export const appointmentArchiveRequestSchema = z.object({
  appointmentId: z.string().min(1),
  clinicCode: z.string().min(1),
  appointmentStatus: z.enum(['completed', 'no_show', 'cancelled']),
  urgent: z.boolean(),
  patient: z.object({
    fullName: z.string().min(1),
    dateOfBirth: z.string().min(1),
    phone: z.string().min(1)
  }),
  pdfBase64: z.string().min(1),
  manualRegions: z.array(redactRegionSchema).default([])
});

export type AppointmentArchiveRequest = z.infer<typeof appointmentArchiveRequestSchema>;

export type ArchiveDecision = 'ready_for_archive' | 'needs_review';

export type AppointmentArchiveResult = {
  decision: ArchiveDecision;
  notification: string;
  redactedPdf: string;
};

export function decideArchiveDisposition(input: AppointmentArchiveRequest): ArchiveDecision {
  if (input.urgent) {
    return 'needs_review';
  }

  if (input.appointmentStatus === 'completed' || input.appointmentStatus === 'no_show') {
    return 'ready_for_archive';
  }

  return 'needs_review';
}

export function buildOpsNotification(input: AppointmentArchiveRequest, decision: ArchiveDecision): string {
  const stateText = decision === 'ready_for_archive' ? 'ready for archive' : 'held for privacy review';
  return `Appointment ${input.appointmentId} at ${input.clinicCode} is ${stateText}.`;
}

function buildRedactionPatterns(input: AppointmentArchiveRequest): string[] {
  return [
    input.patient.fullName,
    input.patient.dateOfBirth,
    input.patient.phone
  ];
}

export async function archiveAppointmentDocument(raw: unknown): Promise<AppointmentArchiveResult> {
  const input = appointmentArchiveRequestSchema.parse(raw);
  const decision = decideArchiveDisposition(input);
  const notification = buildOpsNotification(input, decision);

  const redacted = await infrai.pdf.redact({
    pdf: input.pdfBase64,
    regions: input.manualRegions,
    patterns: buildRedactionPatterns(input)
  }, input.appointmentId);

  return {
    decision,
    notification,
    redactedPdf: redacted.pdf
  };
}

import { archiveAppointmentDocument } from './appointment_archive_service';

const sampleRequest = {
  appointmentId: 'apt_2026_04_18_0815',
  clinicCode: 'west-cardiology',
  appointmentStatus: 'completed',
  urgent: false,
  patient: {
    fullName: 'Jane Doe',
    dateOfBirth: '1978-05-15',
    phone: '555-0100'
  },
  pdfBase64: 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCg==',
  manualRegions: []
} as const;

const result = await archiveAppointmentDocument(sampleRequest);
console.log(JSON.stringify(result, null, 2));

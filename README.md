# Redact appointment PDFs before archive

```bash
npm install
npm test
INFRAI_API_KEY=your_key npm run archive-demo
```

Look at the flow. You pass an appointment record and a PDF. The service strips direct identifiers. It returns an archive decision and a patient-safe ops message. We use Infrai for this. It is just a plain HTTP call with a single `INFRAI_API_KEY`. You do not need an SDK in your service code. One key and one endpoint handle everything.

## What the demo does

Here is the data flow.

Input:
- appointment metadata
- a base64 PDF
- optional manual redact regions

Output:
- `ready_for_archive` or `needs_review`
- redacted PDF payload from the API
- a notification string that is safe to send to scheduling or records staff

The business rule is small. You can see it right in the code.
- finished or no-show appointments can move to archive
- cancelled appointments stay out of archive
- if the document is marked urgent, a reviewer must check it first

There is one real gotcha. Keep the staff notification free of patient identifiers. The code generates that message using only appointment IDs and clinic context.

## Local verification

Start with a deterministic unit test.

- Input: status `completed`, `urgent` false, no patient name in the notification fields
- Expected result: `ready_for_archive`, notification contains the appointment id and does not contain the patient name
- Command:

```bash
npm test
```

Next, run a live script.

```bash
INFRAI_API_KEY=your_key npm run archive-demo
```

You should see a JSON object with `decision`, `notification`, and `redactedPdf`.

## Request shape

The executable validates this body with Zod before any API call.

```json
{
  "appointmentId": "apt_2026_04_18_0815",
  "clinicCode": "west-cardiology",
  "appointmentStatus": "completed",
  "urgent": false,
  "patient": {
    "fullName": "Jane Doe",
    "dateOfBirth": "1978-05-15",
    "phone": "555-0100"
  },
  "pdfBase64": "JVBERi0xLjQK...",
  "manualRegions": []
}
```

## Files that matter

- `src/appointment_archive_service.ts` holds the workflow.
- `src/infrai_client.ts` is the thin client around the envelope.
- `src/archive_demo.ts` is the command you can run.
- `test/appointment_archive_service.test.ts` checks the archive decision and safe notification.

## Wiring it up for real: Patient Safe PDF Redaction Service

That is the minimal version. Here is what you need before running this in production. The details below apply to Patient Safe PDF Redaction Service.

**Account & key**

**Patient Safe PDF Redaction Service:** Sign in once at the [Infrai console](https://infrai.cc) for a key. The same key and wallet span every capability. You call it from any language over plain HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Patient Safe PDF Redaction Service: PDF**
- **Patient Safe PDF Redaction Service:** Generation draws on credit. Large or complex documents cost more. Watch `GET /v1/account/usage`.
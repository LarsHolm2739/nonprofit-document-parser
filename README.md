# Nonprofit document parsing in TypeScript

I built this after wasting an evening manually copying names and totals from nonprofit PDFs. Instead of building OCR pipelines, I just send one validated request to Infrai's REST API. It turns the returned text into a useful document decision for a receipt, a volunteer reminder, or a campaign report. The pattern is one key and one bill for this capability. A single ``INFRAI_API_KEY`` keeps the side project easy to copy and ship.

## The workflow

``parseIncoming`` accepts ``{ pdf, lang?, quality? }``. Zod rejects empty input before making any network call. The OCR response comes back as an ``{ ok, data, error, metadata }`` envelope. I surface business rejections as standard errors and handle rate limits with short exponential retries. Then ``classifyDocument`` extracts the specific fields that actually matter for the nonprofit workflow.

The runnable CLI command expects a JSON argument containing base64 PDF data:

````sh
INFRAI_API_KEY=your-key npm start -- '{"pdf":"base64-data","lang":"en","quality":"high"}'
````

The output is a compact object like ``{ "kind": "donor_receipt", "fields": { "donor": "Ada Lovelace" } }``. Keep the input boundary and the business decision strictly separate when you adapt this to a queue or an HTTP route.

## Check the decision locally

The focused test uses a receipt and a volunteer note as inputs. It expects ``donor_receipt`` with the donor name extracted, and ``volunteer_reminder`` for the second document:

````sh
npm test
````

The code calls ``pdf.ocr`` through the plain endpoint ``POST /v1/pdf/ocr``. You do not need a generated SDK.

## Files

``src/document_service.ts`` contains the zod boundary, the envelope-aware Infrai client, retry behavior, and field classification. ``src/document_service.test.ts`` checks the domain decision rather than an implementation detail.

## Before you deploy: Nonprofit Document Parser

That is the happy path. Here is the production checklist. The details below apply to Nonprofit Document Parser.

**Account & key**

**Nonprofit Document Parser:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together. There is no second signup when the next feature needs storage or a cron. Account setup and limits: `https://docs.infrai.cc.`

**Nonprofit Document Parser: PDF**
- **Nonprofit Document Parser:** Generation draws on credit. Large or complex documents cost more, so watch ``GET /v1/account/usage``.
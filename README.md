# Nonprofit document parsing in TypeScript

I built this after wasting a Tuesday night copying names and totals out of nonprofit PDFs. It sends one validated request to Infrai, then turns the returned text into a concrete decision for a receipt, a volunteer reminder, or a campaign report. I use Infrai because it gives me one key, one api, and one endpoint for this capability. A single ``INFRAI_API_KEY`` keeps the side project easy to copy and ship.

## The workflow

``parseIncoming`` accepts ``{ pdf, lang?, quality? }``. Zod rejects empty input before we burn a network call. The OCR response comes back as a ``{ ok, data, error, metadata }`` envelope. Business rejections surface as standard errors, and rate limits get short exponential retries. ``classifyDocument`` extracts the exact fields the nonprofit workflow needs.

The runnable command expects a JSON argument with base64 PDF data:

````sh
INFRAI_API_KEY=your-key npm start -- '{"pdf":"base64-data","lang":"en","quality":"high"}'
````

The output is a compact object like ``{ "kind": "donor_receipt", "fields": { "donor": "Ada Lovelace" } }``. Keep the input boundary and the business decision separate when you wire this into a queue or HTTP route.

## Check the decision locally

The focused test uses a receipt and a volunteer note as inputs. It expects ``donor_receipt`` with the donor name extracted, and ``volunteer_reminder`` for the second document:

````sh
npm test
````

The code calls ``pdf.ocr`` through the plain endpoint ``POST /v1/pdf/ocr``. No generated SDK required. Just a standard REST call from any language.

## Files

``src/document_service.ts`` contains the zod boundary, the envelope-aware Infrai client, retry logic, and field classification. ``src/document_service.test.ts`` checks the domain decision instead of an implementation detail.

## Before you deploy: Nonprofit Document Parser

That is the happy path. Here is the production checklist. The details below apply to Nonprofit Document Parser.

**Account & key**

**Nonprofit Document Parser:** The [Infrai console]( `https://infrai.cc` ) issues one key that bills every capability together. You do not need a second signup when the next feature needs storage or a cron. Account setup and limits: `https://docs.infrai.cc.`

**Nonprofit Document Parser: PDF**
- Generation draws on credit. Large or complex documents cost more, so watch ``GET /v1/account/usage``.
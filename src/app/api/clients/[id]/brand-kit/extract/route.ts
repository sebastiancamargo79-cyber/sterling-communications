import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const extractSchema = z.object({
  pdfUrl: z.string().url(),
})

const responseSchema = z.object({
  primaryColor: z.string().nullable(),
  secondaryColor: z.string().nullable(),
  bgColor: z.string().nullable(),
  accentColor: z.string().nullable(),
  textColor: z.string().nullable(),
  fontHeadingName: z.string().nullable(),
  fontBodyName: z.string().nullable(),
  headingFontSize: z.string().nullable(),
  bodyFontSize: z.string().nullable(),
  cardBorderRadius: z.string().nullable(),
  layoutDensity: z.string().nullable(),
  confidence: z.record(z.number()),
})

async function downloadPdf(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Downloaded PDF file is empty')
  }

  return Buffer.from(arrayBuffer)
}

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid bundling issues
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = pdfParseModule.default

    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse module not loaded correctly')
    }

    const pdfData = await pdfParse(pdfBuffer) as { text?: string }

    if (!pdfData || typeof pdfData.text !== 'string') {
      throw new Error('pdf-parse returned no data')
    }

    const text = pdfData.text.trim()
    if (!text) {
      throw new Error('No text extracted from PDF')
    }

    // Limit to ~4000 chars to avoid huge prompts
    return text.slice(0, 4000)
  } catch (e) {
    throw new Error(`Failed to parse PDF: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const parsed = extractSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid request: ${JSON.stringify(parsed.error.flatten())}` },
        { status: 400 }
      )
    }

    const { pdfUrl } = parsed.data

    // Download and extract text from PDF
    const pdfBuffer = await downloadPdf(pdfUrl)
    const pdfText = await extractPdfText(pdfBuffer)

    const trimmedText = pdfText.trim()

    if (!trimmedText) {
      return NextResponse.json(
        { error: 'PDF text extraction returned empty. The PDF is likely image-based (scanned/designed) with no selectable text. Try a PDF that has selectable/copyable text.' },
        { status: 400 }
      )
    }

    if (trimmedText.length < 100) {
      return NextResponse.json(
        { error: `PDF text extraction returned only ${trimmedText.length} characters — too little to extract tokens. The PDF may be mostly images. Extracted text: "${trimmedText.slice(0, 200)}"` },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a brand extraction assistant analyzing brand guideline documents. Extract design tokens from the provided text.

Return ONLY a valid JSON object with these exact keys (all values can be null if not found):
{
  "primaryColor": "#hex color for primary brand color",
  "secondaryColor": "#hex color for secondary/accent",
  "bgColor": "#hex for background",
  "accentColor": "#hex for accent/rule/divider",
  "textColor": "#hex for body text",
  "fontHeadingName": "Google Font name for headings or null",
  "fontBodyName": "Google Font name for body or null",
  "headingFontSize": "size like '22px' or '1.5rem' or null",
  "bodyFontSize": "size like '13px' or '0.875rem' or null",
  "cardBorderRadius": "border-radius value like '6px' or null",
  "layoutDensity": "spacing density: 'compact', 'normal', 'airy' or null",
  "confidence": {
    "primaryColor": 0.0 to 1.0,
    "secondaryColor": 0.0 to 1.0,
    "bgColor": 0.0 to 1.0,
    "accentColor": 0.0 to 1.0,
    "textColor": 0.0 to 1.0,
    "fontHeadingName": 0.0 to 1.0,
    "fontBodyName": 0.0 to 1.0,
    "headingFontSize": 0.0 to 1.0,
    "bodyFontSize": 0.0 to 1.0,
    "cardBorderRadius": 0.0 to 1.0,
    "layoutDensity": 0.0 to 1.0
  }
}

IMPORTANT: Return ONLY valid JSON. No explanations, markdown, or code blocks.`

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Extract brand design tokens from this guideline document:\n\n${pdfText}`,
        },
      ],
    })

    const responseText = completion.choices[0]?.message?.content ?? '{}'

    // Strip markdown code fences if present, then parse JSON
    let extractedData
    try {
      const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      extractedData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: `Failed to parse AI response as JSON. Raw response: ${responseText.slice(0, 200)}` },
        { status: 500 }
      )
    }

    // Validate extracted data
    const validated = responseSchema.safeParse(extractedData)
    if (!validated.success) {
      return NextResponse.json(
        { error: `Invalid extraction response: ${JSON.stringify(validated.error.flatten())}` },
        { status: 500 }
      )
    }

    // Check if GPT-4o found anything at all
    const tokenKeys = ['primaryColor','secondaryColor','bgColor','accentColor','textColor','fontHeadingName','fontBodyName','headingFontSize','bodyFontSize','cardBorderRadius','layoutDensity'] as const
    const extractedCount = tokenKeys.filter(k => validated.data[k] !== null).length
    if (extractedCount === 0) {
      return NextResponse.json(
        { error: `GPT-4o read the PDF text (${trimmedText.length} chars) but found no brand tokens. The text may not contain explicit color codes, font names, or sizes. Text sample: "${trimmedText.slice(0, 300)}"` },
        { status: 422 }
      )
    }

    return NextResponse.json(validated.data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[POST] ${msg}` }, { status: 500 })
  }
}

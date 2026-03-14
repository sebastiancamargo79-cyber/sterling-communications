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

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('pdf')) {
    throw new Error(`Invalid content type: ${contentType}. Expected PDF.`)
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

    const pdfData = await pdfParse(pdfBuffer)

    // Validate PDF data structure
    if (!pdfData) {
      throw new Error('pdf-parse returned no data')
    }

    if (!Array.isArray(pdfData.pages)) {
      throw new Error(`Invalid PDF data structure: pages is ${typeof pdfData.pages}`)
    }

    // Get text from first 3 pages max
    const pages = pdfData.pages.slice(0, 3)
    const textChunks = pages.map((page) => page.text).filter(Boolean)

    if (textChunks.length === 0) {
      throw new Error('No text extracted from PDF')
    }

    return textChunks.join('\n\n')
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

    if (!pdfText.trim()) {
      return NextResponse.json(
        { error: 'Could not extract any text from PDF' },
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

    // Parse JSON response
    let extractedData
    try {
      extractedData = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
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

    return NextResponse.json(validated.data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[POST] ${msg}` }, { status: 500 })
  }
}

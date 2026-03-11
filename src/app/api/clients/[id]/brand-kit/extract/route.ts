import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import * as pdfjsLib from 'pdfjs-dist'

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

async function downloadPdf(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`)
  }
  return response.arrayBuffer()
}

async function extractPdfText(pdfBuffer: ArrayBuffer): Promise<string> {
  let pdf
  try {
    pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
  } catch {
    throw new Error('Failed to parse PDF document')
  }

  const textChunks: string[] = []
  const maxPages = Math.min(3, pdf.numPages)

  for (let i = 1; i <= maxPages; i++) {
    try {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => (item.str ? item.str : ''))
        .join(' ')
      textChunks.push(pageText)
    } catch (e) {
      console.warn(`Failed to extract text from page ${i}:`, e)
    }
  }

  return textChunks.join('\n\n')
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

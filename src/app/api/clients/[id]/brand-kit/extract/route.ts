import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import * as pdfjsLib from 'pdfjs-dist'
import { createCanvas } from 'canvas'

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

async function convertPdfPageToBase64(pdfBuffer: ArrayBuffer, pageNum: number): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise

  if (pageNum > pdf.numPages) {
    throw new Error(`Page ${pageNum} does not exist (PDF has ${pdf.numPages} pages)`)
  }

  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale: 2 }) // 2x scale for better quality

  const canvas = createCanvas(viewport.width, viewport.height)
  const context = canvas.getContext('2d')

  await page.render({
    canvasContext: context,
    viewport,
  }).promise

  const buffer = canvas.toBuffer('image/png')
  return buffer.toString('base64')
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

    // Download PDF
    const pdfBuffer = await downloadPdf(pdfUrl)

    // Convert first 3 pages to images
    const imageBase64Array: string[] = []
    const maxPages = 3
    let pdf
    try {
      pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse PDF document' },
        { status: 400 }
      )
    }

    const pagesToProcess = Math.min(maxPages, pdf.numPages)
    for (let i = 1; i <= pagesToProcess; i++) {
      try {
        const base64 = await convertPdfPageToBase64(pdfBuffer, i)
        imageBase64Array.push(base64)
      } catch (e) {
        console.warn(`Failed to convert page ${i}:`, e)
      }
    }

    if (imageBase64Array.length === 0) {
      return NextResponse.json(
        { error: 'Could not convert any PDF pages to images' },
        { status: 400 }
      )
    }

    // Build message content with images
    const contentParts: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string; detail: string } }> = [
      {
        type: 'text',
        text: `You are a brand extraction assistant reading brand guideline pages. Analyze these images and extract brand design tokens.

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

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.`,
      },
    ]

    // Add all images
    imageBase64Array.forEach((base64) => {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64}`,
          detail: 'high',
        },
      })
    })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: contentParts as Parameters<typeof openai.chat.completions.create>[0]['messages'][0]['content'],
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

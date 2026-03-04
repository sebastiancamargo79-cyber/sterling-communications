export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 720 },
    executablePath: await chromium.executablePath(),
    headless: true,
  })

  try {
    const page = await browser.newPage()

    // Build the preview URL using the request's origin
    const origin = req.nextUrl.origin
    const previewUrl = `${origin}/clients/${id}/newsletter/preview`

    await page.goto(previewUrl, { waitUntil: 'networkidle0', timeout: 30000 })

    // Hide the print bar for PDF output
    await page.addStyleTag({ content: '.printBar { display: none !important; }' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="newsletter-${id}.pdf"`,
      },
    })
  } finally {
    await browser.close()
  }
}

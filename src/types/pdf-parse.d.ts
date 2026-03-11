declare module 'pdf-parse' {
  interface PDFDocument {
    numpages: number
    numPages: number
    pages: Array<{
      text: string
    }>
    info: any
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, any>
  ): Promise<PDFDocument>

  export = pdfParse
}

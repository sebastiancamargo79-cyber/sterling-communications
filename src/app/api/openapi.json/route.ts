import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Sterling Communications API',
    version: '0.1.0',
    description: 'API for managing Offices and Brand Kits',
  },
  paths: {
    '/api/offices': {
      get: {
        summary: 'List offices with brand kits',
        operationId: 'listOffices',
        responses: {
          '200': {
            description: 'Array of offices, each with an optional brand kit',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    offices: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' },
                          brandKit: {
                            oneOf: [
                              {
                                type: 'object',
                                properties: {
                                  id: { type: 'string', format: 'uuid' },
                                  mode: { type: 'string', enum: ['manual', 'uploaded'] },
                                  primaryColor: { type: 'string', nullable: true },
                                  logoUrl: { type: 'string', nullable: true },
                                  guidelinesPdfUrl: { type: 'string', nullable: true },
                                },
                              },
                              { type: 'null' },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create office with brand kit',
        operationId: 'createOffice',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['name', 'mode'],
                properties: {
                  name: { type: 'string', description: 'Office name' },
                  mode: {
                    type: 'string',
                    enum: ['manual', 'uploaded'],
                    description: '"manual" requires primary_color + logo; "uploaded" requires guidelines_pdf',
                  },
                  primary_color: {
                    type: 'string',
                    description: 'CSS hex colour (required when mode=manual)',
                  },
                  logo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Logo image file (required when mode=manual)',
                  },
                  guidelines_pdf: {
                    type: 'string',
                    format: 'binary',
                    description: 'Brand guidelines PDF (required when mode=uploaded)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created office and brand kit',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    office: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                    brandKit: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        officeId: { type: 'string', format: 'uuid' },
                        mode: { type: 'string' },
                        primaryColor: { type: 'string', nullable: true },
                        logoUrl: { type: 'string', nullable: true },
                        guidelinesPdfUrl: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
          },
        },
      },
    },
  },
}

export function GET() {
  return NextResponse.json(spec)
}

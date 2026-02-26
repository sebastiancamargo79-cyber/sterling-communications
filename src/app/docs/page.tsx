import Container from '@/components/Container'
import styles from './page.module.css'

export default function DocsPage() {
  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.header}>
          <a href="/" className={styles.back}>← Home</a>
          <h1 className={styles.heading}>API Documentation</h1>
          <p className={styles.subtitle}>
            Sterling Communications REST API — v0.1.0
          </p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>OpenAPI Specification</h2>
          <p className={styles.text}>
            The full OpenAPI 3.1 specification is available as JSON:
          </p>
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.specLink}
          >
            /api/openapi.json ↗
          </a>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Endpoints</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className={`${styles.method} ${styles.get}`}>GET</span></td>
                  <td><code>/api/offices</code></td>
                  <td>List all offices with their brand kits</td>
                </tr>
                <tr>
                  <td><span className={`${styles.method} ${styles.post}`}>POST</span></td>
                  <td><code>/api/offices</code></td>
                  <td>Create an office + brand kit (multipart/form-data)</td>
                </tr>
                <tr>
                  <td><span className={`${styles.method} ${styles.get}`}>GET</span></td>
                  <td><code>/api/openapi.json</code></td>
                  <td>OpenAPI 3.1 specification</td>
                </tr>
                <tr>
                  <td><span className={`${styles.method} ${styles.get}`}>GET</span></td>
                  <td><code>/docs</code></td>
                  <td>This page</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>POST /api/offices — Form Fields</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>name</code></td>
                  <td>string</td>
                  <td>Always</td>
                  <td>Office name</td>
                </tr>
                <tr>
                  <td><code>mode</code></td>
                  <td>string</td>
                  <td>Always</td>
                  <td><code>manual</code> or <code>uploaded</code></td>
                </tr>
                <tr>
                  <td><code>primary_color</code></td>
                  <td>string</td>
                  <td>mode=manual</td>
                  <td>CSS hex colour, e.g. <code>#1a1a1a</code></td>
                </tr>
                <tr>
                  <td><code>logo</code></td>
                  <td>file (image)</td>
                  <td>mode=manual</td>
                  <td>Logo image; stored in Vercel Blob</td>
                </tr>
                <tr>
                  <td><code>guidelines_pdf</code></td>
                  <td>file (PDF)</td>
                  <td>mode=uploaded</td>
                  <td>Brand guidelines PDF; stored in Vercel Blob</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </main>
  )
}

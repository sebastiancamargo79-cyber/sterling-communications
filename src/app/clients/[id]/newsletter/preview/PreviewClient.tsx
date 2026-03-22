'use client'

import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import type { Newsletter } from '@/lib/newsletter-schema'
import type { ModuleDef } from '@/lib/module-registry'
import { extractVariantFromYaml, setVariantInYaml, serializeModuleArray } from '@/lib/module-parser'
import ModuleDesignOverlay from '../editor/ModuleDesignOverlay'
import BrokenImageHandler from '@/components/newsletter/BrokenImageHandler'
import Page1Cover from '@/components/newsletter/Page1Cover'
import Page1CoverAlt from '@/components/newsletter/Page1CoverAlt'
import Page2DirectorUpdate from '@/components/newsletter/Page2DirectorUpdate'
import Page2DirectorUpdateAlt from '@/components/newsletter/Page2DirectorUpdateAlt'
import Page3Diary from '@/components/newsletter/Page3Diary'
import Page3DiaryAlt from '@/components/newsletter/Page3DiaryAlt'
import Page4ClientStory from '@/components/newsletter/Page4ClientStory'
import Page4ClientStoryAlt from '@/components/newsletter/Page4ClientStoryAlt'
import Page5Spotlight from '@/components/newsletter/Page5Spotlight'
import Page5SpotlightAlt from '@/components/newsletter/Page5SpotlightAlt'
import Page6Tips from '@/components/newsletter/Page6Tips'
import Page6TipsAlt from '@/components/newsletter/Page6TipsAlt'
import GenericModuleCard from '@/components/newsletter/GenericModuleCard'
import { PrintButton } from '@/components/newsletter/PrintButton'
import { DownloadPdfButton } from '@/components/newsletter/DownloadPdfButton'
import styles from './PreviewClient.module.css'

function tokenToCssVar(token: string): string | null {
  const map: Record<string, string> = {
    primaryColor: '--brand-primary',
    secondaryColor: '--brand-secondary',
    bgColor: '--brand-bg',
    accentColor: '--brand-accent',
    textColor: '--brand-text',
    headingFontSize: '--brand-heading-size',
    bodyFontSize: '--brand-body-size',
    cardBorderRadius: '--brand-radius',
  }
  return map[token] ?? null
}

type UndoAction =
  | { type: 'token'; token: string; prev: string | undefined }
  | { type: 'variant'; moduleIdx: number; prevYaml: string }

interface RawBlock { name: string; yaml: string }

const KNOWN_STORAGE_KEYS: Record<string, string> = {
  Meta: 'meta',
  Cover: 'cover',
  DirectorUpdate: 'director_update',
  Events: 'events',
  ClientStory: 'client_story',
  StaffSpotlight: 'spotlight',
  Tips: 'tips',
  Community: 'community',
}

interface Props {
  clientId: string
  editionId?: string
  parsedData: Newsletter
  rawBlocks: RawBlock[]
  moduleOrder: string[]
  initialTokenOverrides: Record<string, string>
  baseStyleVars: Record<string, string>
  logoUrl?: string
  employerName: string
  allModuleDefs: ModuleDef[]
}

function ModuleWrapper({
  moduleName,
  children,
  onDesignClick,
  isDesignOpen,
}: {
  moduleName: string
  children: React.ReactNode
  onDesignClick: (name: string | null) => void
  isDesignOpen: boolean
}) {
  return (
    <div className={`${styles.moduleWrap} ${isDesignOpen ? styles.moduleWrapActive : ''}`}>
      {children}
      <button
        className={`${styles.moduleDesignBtn} ${isDesignOpen ? styles.moduleDesignBtnActive : ''}`}
        onClick={() => onDesignClick(isDesignOpen ? null : moduleName)}
        title={isDesignOpen ? 'Close design panel' : 'Open design assistant'}
      >
        {isDesignOpen ? '✕ Design' : '🎨 Design'}
      </button>
    </div>
  )
}

export default function PreviewClient({
  clientId,
  editionId,
  parsedData,
  rawBlocks: initialRawBlocks,
  moduleOrder,
  initialTokenOverrides,
  baseStyleVars,
  logoUrl,
  employerName,
  allModuleDefs,
}: Props) {
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>(initialTokenOverrides)
  const [localRawBlocks, setLocalRawBlocks] = useState<RawBlock[]>(initialRawBlocks)
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [designOverlayModule, setDesignOverlayModule] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const variantMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const block of localRawBlocks) {
      map[block.name] = extractVariantFromYaml(block.yaml)
    }
    return map
  }, [localRawBlocks])

  const styleVars = useMemo(() => {
    const vars = { ...baseStyleVars }
    for (const [token, value] of Object.entries(localOverrides)) {
      if (token === 'fontHeadingName') {
        vars['--font-heading'] = `'${value}', serif`
      } else if (token === 'fontBodyName') {
        vars['--font-body'] = `'${value}', sans-serif`
      } else {
        const cssVar = tokenToCssVar(token)
        if (cssVar && value) vars[cssVar] = value
      }
    }
    return vars
  }, [localOverrides, baseStyleVars])

  const handleApplyToken = useCallback((token: string, value: string, scope: 'edition' | 'global') => {
    if (scope === 'global') {
      // Save to brand kit in background, but also update local preview immediately
      fetch(`/api/clients/${clientId}/brand-kit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [token]: value }),
      }).catch(() => {})
    }
    // Always update local overrides so the preview reflects the change instantly
    setLocalOverrides((prev) => {
      setUndoStack((stack) => [...stack, { type: 'token', token, prev: prev[token] }])
      return { ...prev, [token]: value }
    })
    setIsDirty(scope === 'edition')
    toast.success(scope === 'global' ? 'Brand token updated globally' : 'Design change applied')
  }, [clientId])

  const handleApplyVariant = useCallback((variant: string) => {
    if (!designOverlayModule) return
    const blockIdx = localRawBlocks.findIndex((b) => b.name === designOverlayModule)
    if (blockIdx < 0) return
    const prevYaml = localRawBlocks[blockIdx].yaml
    setUndoStack((stack) => [...stack, { type: 'variant', moduleIdx: blockIdx, prevYaml }])
    setLocalRawBlocks((prev) => {
      const next = [...prev]
      next[blockIdx] = {
        ...next[blockIdx],
        yaml: setVariantInYaml(next[blockIdx].yaml, variant === 'classic' ? null : variant),
      }
      return next
    })
    setIsDirty(true)
    toast.success(`Layout switched to ${variant}`)
  }, [designOverlayModule, localRawBlocks])

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    const action = undoStack[undoStack.length - 1]
    setUndoStack((stack) => stack.slice(0, -1))
    if (action.type === 'token') {
      setLocalOverrides((prev) => {
        const next = { ...prev }
        if (action.prev === undefined) {
          delete next[action.token]
        } else {
          next[action.token] = action.prev
        }
        return next
      })
    } else {
      setLocalRawBlocks((prev) => {
        const next = [...prev]
        next[action.moduleIdx] = { ...next[action.moduleIdx], yaml: action.prevYaml }
        return next
      })
    }
    setIsDirty(true)
    toast.success('Change undone')
  }, [undoStack])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const rawContent = serializeModuleArray(localRawBlocks)
      const endpoint = editionId
        ? `/api/clients/${clientId}/newsletter/editions/${editionId}`
        : `/api/clients/${clientId}/newsletter`
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent, tokenOverrides: localOverrides }),
      })
      if (!res.ok) throw new Error('Save failed')
      setIsDirty(false)
      toast.success('Design saved')
    } catch {
      toast.error('Failed to save design')
    } finally {
      setSaving(false)
    }
  }, [clientId, editionId, localOverrides, localRawBlocks])

  const overlayBlock = designOverlayModule
    ? localRawBlocks.find((b) => b.name === designOverlayModule)
    : null
  const overlayDef = designOverlayModule
    ? allModuleDefs.find((m) => m.name === designOverlayModule)
    : null

  const renderModule = useCallback((moduleName: string): React.ReactNode => {
    const storageKey = KNOWN_STORAGE_KEYS[moduleName]
    const variant = variantMap[moduleName] ?? 'classic'
    const alt = variant === 'alternate'

    if (!storageKey) {
      const block = localRawBlocks.find((b) => b.name === moduleName)
      if (!block) return null
      const moduleDef = allModuleDefs.find((m) => m.name === moduleName)
      return (
        <ModuleWrapper
          key={moduleName}
          moduleName={moduleName}
          onDesignClick={setDesignOverlayModule}
          isDesignOpen={designOverlayModule === moduleName}
        >
          <GenericModuleCard moduleName={moduleName} label={moduleDef?.label ?? moduleName} yaml={block.yaml} />
        </ModuleWrapper>
      )
    }

    switch (storageKey) {
      case 'cover':
        if (!parsedData.cover) return null
        return (
          <ModuleWrapper key="cover" moduleName="Cover" onDesignClick={setDesignOverlayModule} isDesignOpen={designOverlayModule === 'Cover'}>
            {alt
              ? <Page1CoverAlt data={parsedData.cover} meta={parsedData.meta} logoUrl={logoUrl} />
              : <Page1Cover data={parsedData.cover} meta={parsedData.meta} logoUrl={logoUrl} />}
          </ModuleWrapper>
        )
      case 'director_update':
        if (!parsedData.director_update) return null
        return (
          <ModuleWrapper key="director_update" moduleName="DirectorUpdate" onDesignClick={setDesignOverlayModule} isDesignOpen={designOverlayModule === 'DirectorUpdate'}>
            {alt
              ? <Page2DirectorUpdateAlt data={parsedData.director_update} meta={parsedData.meta} />
              : <Page2DirectorUpdate data={parsedData.director_update} meta={parsedData.meta} />}
          </ModuleWrapper>
        )
      case 'events':
        if (!parsedData.events) return null
        return (
          <ModuleWrapper key="events" moduleName="Events" onDesignClick={setDesignOverlayModule} isDesignOpen={designOverlayModule === 'Events'}>
            {alt
              ? <Page3DiaryAlt events={parsedData.events} meta={parsedData.meta} />
              : <Page3Diary events={parsedData.events} meta={parsedData.meta} />}
          </ModuleWrapper>
        )
      case 'client_story':
        if (!parsedData.client_story) return null
        return (
          <ModuleWrapper key="client_story" moduleName="ClientStory" onDesignClick={setDesignOverlayModule} isDesignOpen={designOverlayModule === 'ClientStory'}>
            {alt
              ? <Page4ClientStoryAlt data={parsedData.client_story} meta={parsedData.meta} />
              : <Page4ClientStory data={parsedData.client_story} meta={parsedData.meta} />}
          </ModuleWrapper>
        )
      case 'spotlight':
        if (!parsedData.spotlight) return null
        return (
          <ModuleWrapper key="spotlight" moduleName="StaffSpotlight" onDesignClick={setDesignOverlayModule} isDesignOpen={designOverlayModule === 'StaffSpotlight'}>
            {alt
              ? <Page5SpotlightAlt data={parsedData.spotlight} meta={parsedData.meta} employerName={employerName} />
              : <Page5Spotlight data={parsedData.spotlight} meta={parsedData.meta} employerName={employerName} />}
          </ModuleWrapper>
        )
      default:
        return null
    }
  }, [variantMap, localRawBlocks, allModuleDefs, designOverlayModule, parsedData, logoUrl, employerName])

  return (
    <div className={styles.wrapper} style={styleVars as React.CSSProperties}>
      <BrokenImageHandler />

      <div className={styles.printBar}>
        {editionId ? (
          <a href={`/clients/${clientId}/newsletter/editor?editionId=${editionId}`} className={styles.backLink}>
            ← Back to Editor
          </a>
        ) : (
          <a href={`/clients/${clientId}`} className={styles.backLink}>← Back to Client</a>
        )}
        <span className={styles.printBarTitle}>
          {parsedData.meta.office_name} — {parsedData.meta.month} Newsletter
        </span>
        {(isDirty || undoStack.length > 0) && (
          <div className={styles.designActions}>
            {undoStack.length > 0 && (
              <button className={styles.btnUndo} onClick={handleUndo}>
                ⟲ Undo
              </button>
            )}
            {isDirty && (
              <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : '✓ Save Design'}
              </button>
            )}
          </div>
        )}
        <DownloadPdfButton clientId={clientId} />
        <PrintButton />
      </div>

      <div className={styles.pages}>
        {(() => {
          let page6Rendered = false
          return moduleOrder
            .filter((name) => name !== 'Meta')
            .map((moduleName) => {
              const storageKey = KNOWN_STORAGE_KEYS[moduleName]
              const variant = variantMap[moduleName] ?? 'classic'
              const alt = variant === 'alternate'

              if (storageKey === 'tips' || storageKey === 'community') {
                if (page6Rendered) return null
                page6Rendered = true
                if (!parsedData.tips && !parsedData.community) return null
                return (
                  <ModuleWrapper
                    key="tips_community"
                    moduleName="Tips"
                    onDesignClick={setDesignOverlayModule}
                    isDesignOpen={designOverlayModule === 'Tips'}
                  >
                    {alt
                      ? <Page6TipsAlt tips={parsedData.tips} community={parsedData.community} meta={parsedData.meta} />
                      : <Page6Tips tips={parsedData.tips} community={parsedData.community} meta={parsedData.meta} />}
                  </ModuleWrapper>
                )
              }
              return renderModule(moduleName)
            })
        })()}
      </div>

      {designOverlayModule && overlayBlock && (
        <ModuleDesignOverlay
          key={designOverlayModule}
          moduleType={designOverlayModule}
          moduleLabel={overlayDef?.label ?? designOverlayModule}
          moduleYaml={overlayBlock.yaml}
          clientId={clientId}
          editionOverrides={localOverrides}
          currentVariant={variantMap[designOverlayModule] ?? 'classic'}
          onClose={() => setDesignOverlayModule(null)}
          onApplyToken={handleApplyToken}
          onApplyVariant={handleApplyVariant}
        />
      )}
    </div>
  )
}

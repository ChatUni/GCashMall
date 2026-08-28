// Quick Create V1 — the 4-page flow (Create → Review Proposal → Ganime Studio →
// Episode Ready), built to match the product mockups. Selected via
// VITE_QUICK_CREATE_VERSION=v1 (App.tsx). Uses the app's standard TopBar; all state
// lives in quickCreateV1Store (Rule #7).

import { Show, For, Switch, Match, createMemo, createSignal, onMount, onCleanup } from 'solid-js'
import { createStore } from 'solid-js/store'
import { useNavigate, useSearchParams } from '@solidjs/router'
import TopBar from '../components/TopBar'
import { PublishEpisode } from './QuickCreate'
import GenrePicker from '../components/GenrePicker'
import { heroImage } from '../stores/quickCreateStore'
import { SocialSharePopup } from '../components/SocialShare'
import { getShareText } from '../utils/playerHelpers'
import {
  videoStorage,
  startNextEpisode as startNextEpisodeApi,
  fetchMe,
  type ProductionJob,
  type V1RoadmapEpisode,
} from '../services/dataService'
import { accountStore, accountStoreActions } from '../stores/accountStore'
import { getStoredUser, setStoredUser } from '../utils/api'
import { systemSettingsStore, systemSettingsStoreActions } from '../stores/systemSettingsStore'
import { t } from '../stores/languageStore'
import { toastStore, toastStoreActions } from '../stores/index'
import {
  quickCreateV1Store as s,
  quickCreateV1Actions as actions,
  V1_STEPPER_KEYS,
  STORY_TEMPLATES,
  STUDIO_STAGES,
} from '../stores/quickCreateV1Store'
import './QuickCreateV1.css'

const tv = () => t().quickCreateV1

// s1 storage flow: episode lives on Bunny (embed player), Share points at the app /watch
// page, and Download is hidden. s0: Cloudinary mp4, Share/Download the file directly.
const S1 = videoStorage() === 's1'
const shareBase = (): string =>
  (import.meta.env.VITE_PROD_SERVER as string) || window.location.origin

// GUSD currency logo. The generation cost is an admin-configurable system setting.
const GUSD_LOGO = 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png'

// Imagery on Cloudinary (GCash/quick create v1/*.webp), mirroring the v0 CDN set.
// Uploaded via scripts/upload-qc-v1-cloudinary.mjs.
const QC1_CDN = 'https://res.cloudinary.com/daqc8bim3/image/upload/GCash/quick%20create%20v1'
const img = (name: string): string => `${QC1_CDN}/${name}.webp`

// Emoji icon per studio stage (matches the mockup's stage-list icons)
const STAGE_ICON: Record<string, string> = {
  executiveProducer: '📋',
  characterDirector: '🎭',
  episodeDirector: '🎬',
  visualAssetDirector: '🖼️',
  audioDirector: '🎵',
  episodeProducer: '🎞️',
  renderingShots: '🎥',
  episodeRenderer: '🚀',
  transcribe: '💬',
}

// The 7 Production-Progress items map to a driving studio stage.
const PROG_ITEMS: { id: string; stage: string }[] = [
  { id: 'storyWorld', stage: 'executiveProducer' },
  { id: 'characters', stage: 'characterDirector' },
  { id: 'screenplay', stage: 'episodeDirector' },
  { id: 'storyboards', stage: 'episodeDirector' },
  { id: 'keyVisuals', stage: 'visualAssetDirector' },
  { id: 'audio', stage: 'audioDirector' },
  { id: 'finalRender', stage: 'episodeRenderer' },
]

const mmss = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const r = Math.round(sec % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

// Derive a stage's display status/percent from the store.
const stageInfo = (serverKeys: string[], displayKey: string) => {
  const status = () => {
    const relevant = s.progress.filter((c) => serverKeys.includes(c.key))
    if (relevant.some((c) => c.status === 'error')) return 'error'
    const last = serverKeys[serverKeys.length - 1]
    if (s.progress.find((c) => c.key === last)?.status === 'done') return 'done'
    if (relevant.some((c) => c.status === 'running' || c.status === 'done')) return 'running'
    return 'pending'
  }
  const pct = () => s.stagePct[displayKey] || 0
  return { status, pct }
}

// ── Shared step-progress bar (4 steps) ──

const StepBar = () => (
  <div class="qcv1-stepbar">
    <For each={V1_STEPPER_KEYS}>
      {(key, i) => {
        const n = i() + 1
        const st = createMemo(() => (s.step === n ? 'active' : s.step > n ? 'done' : 'todo'))
        return (
          <>
            <div class={`qcv1-step ${st()}`}>
              <div class="qcv1-step-dot">
                <span>{n}</span>
              </div>
              <span class="qcv1-step-label">{(tv().steps as Record<string, string>)[key]}</span>
              <Show when={st() === 'done'}>
                <span class="qcv1-step-check">✓</span>
              </Show>
            </div>
            <Show when={i() < V1_STEPPER_KEYS.length - 1}>
              <span class="qcv1-step-sep">›</span>
            </Show>
          </>
        )
      }}
    </For>
  </div>
)

// ══════════════════════════════════════ Page 1 ══════════════════════════════════════

const Page1Idea = () => {
  const p1 = () => tv().page1
  return (
    <div class="qcv1-p1">
      <div class="qcv1-p1-hero">
        {/* Same hero image + masked/scrim style as v0, sitting behind the title and
            reaching down to touch the idea input card below. */}
        <img class="qcv1-p1-hero-img" src={heroImage} alt="" />
        <div class="qcv1-p1-hero-scrim" />
        <div class="qcv1-p1-hero-text">
          <span class="qcv1-badge">⚡ {p1().badge.toUpperCase()}</span>
          <h1 class="qcv1-h1">
            {p1().titlePre}
            <span class="qcv1-accent">{p1().titleAccent}</span>
          </h1>
          <p class="qcv1-lead">{p1().subtitle}</p>
        </div>
      </div>

      <div class="qcv1-idea-card">
        <div class="qcv1-idea-card-head">
          <span class="qcv1-idea-card-title">✦ {p1().cardTitle}</span>
          <span class="qcv1-counter">{s.idea.length} / 1000</span>
        </div>
        <textarea
          class="qcv1-idea-input"
          placeholder={p1().placeholder}
          value={s.idea}
          maxLength={1000}
          onInput={(e) => actions.setIdea(e.currentTarget.value)}
          rows={4}
        />
        <div class="qcv1-idea-actions">
          <button class="qcv1-btn ghost" disabled={s.surprising} onClick={() => actions.surpriseMe()}>
            🎲 {s.surprising ? p1().surprising : p1().surpriseMe}
          </button>
          <button
            class="qcv1-btn primary qcv1-create-btn"
            disabled={!s.idea.trim() || s.proposalLoading}
            onClick={() => actions.generateProposal()}
          >
            <span class="qcv1-create-main">✦ {p1().create}</span>
            <span class="qcv1-create-sub">{p1().createSub}</span>
          </button>
        </div>
      </div>

      <Show when={s.proposalError === '__signin__'}>
        <p class="qcv1-error">{tv().signinRequired}</p>
      </Show>
      <Show when={s.proposalError && s.proposalError !== '__signin__'}>
        <p class="qcv1-error">{s.proposalError}</p>
      </Show>

      <div class="qcv1-popular">
        <h2 class="qcv1-h2">{p1().popularTitle}</h2>
        <p class="qcv1-popular-hint">🔥 {p1().popularHint}</p>
        <div class="qcv1-idea-grid">
          <For each={STORY_TEMPLATES}>
            {(id) => {
              const idea = () => (tv().ideas as Record<string, { title: string; desc: string }>)[id]
              return (
                <button class="qcv1-idea-tile" onClick={() => actions.applyTemplate(idea().desc)}>
                  <div class="qcv1-idea-thumb">
                    <img src={img(`idea-${id}`)} alt="" loading="lazy" />
                  </div>
                  <div class="qcv1-idea-body">
                    <div class="qcv1-idea-title">{idea().title}</div>
                    <div class="qcv1-idea-desc">{idea().desc}</div>
                  </div>
                </button>
              )
            }}
          </For>
        </div>
      </div>

      <div class="qcv1-tip-bar">
        <span class="qcv1-tip-icon">💡</span>
        <span>
          <b>{p1().tipLabel}</b> {p1().tip}
        </span>
        <span class="qcv1-tip-cat">🐱</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════ Page 2 ══════════════════════════════════════

// A read-mode label/value row on Page 2.
// Size a textarea to exactly fit its content, so entering edit mode doesn't jump the row
// height. A fixed `rows` can't do this — three rows is too tall for a one-line logline and
// far too short for a long summary — so measure the content instead and keep it in sync as
// the user types. Used as `ref={autoGrow}`.
//
// scrollHeight covers content + padding but NOT the border, and these controls are
// border-box, so the border has to be added back or every field lands 2px short.
// scrollHeight covers content + padding but NOT the border, and these controls are
// border-box, so the border has to be added back or the field lands 2px short.
const contentHeight = (el: HTMLTextAreaElement) => {
  const cs = getComputedStyle(el)
  return el.scrollHeight + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
}

// Size a group of textareas to the tallest one's content. Reset every height first, then
// measure, then apply — interleaving the three would let an already-resized cell influence
// the next measurement.
const fitGroup = (cells: HTMLTextAreaElement[]) => {
  if (!cells.length) return
  cells.forEach((c) => (c.style.height = 'auto'))
  const tallest = Math.max(...cells.map(contentHeight))
  cells.forEach((c) => (c.style.height = `${tallest}px`))
}

const attachAutoGrow = (el: HTMLTextAreaElement, group: () => HTMLTextAreaElement[]) => {
  const fit = () => fitGroup(group())
  el.addEventListener('input', fit)
  onCleanup(() => el.removeEventListener('input', fit))
  // Measure once the element is actually in the document (a ref fires before insertion,
  // where scrollHeight is still 0). onMount lands before paint, so there is no flash.
  onMount(fit)
}

// A standalone field: sized to exactly fit its own content, so entering edit mode doesn't
// jump the row height. A fixed `rows` can't do that — three rows is too tall for a one-line
// logline and far too short for a long summary.
const autoGrow = (el: HTMLTextAreaElement) => attachAutoGrow(el, () => [el])

// A character-row cell. The four cells are one record, so sizing each to its own content
// leaves the row ragged — grow them together to the tallest instead.
const autoGrowRow = (el: HTMLTextAreaElement) =>
  attachAutoGrow(el, () => {
    const row = el.closest('.qcv1-char-trow')
    return row ? Array.from(row.querySelectorAll('textarea')) : [el]
  })

const readRow = (label: string, value: string, strong = false) => (
  <div class="qcv1-row">
    <span class="qcv1-row-label">{label}</span>
    <span class={`qcv1-val ${strong ? 'strong' : ''}`}>{value}</span>
  </div>
)

const Page2Proposal = () => {
  const p2 = () => tv().page2
  const proposal = () => s.proposal
  const cd = () => proposal()?.creativeDirection || {}
  const roadmap = () => (proposal()?.seasonRoadmap || []).slice(0, 5)
  const selIdx = () => {
    const idx = (proposal()?.seasonRoadmap || []).findIndex((e) => e.episode === s.selectedEpisode)
    return idx < 0 ? 0 : idx
  }
  const sel = () => (proposal()?.seasonRoadmap || [])[selIdx()]

  // ── Per-section edit mode (mockup: each section/row is read-only until its Edit
  // button is clicked; Edit then becomes Save + Cancel; Cancel discards the draft). ──

  // Genres shown/edited on the series card: prefer the genres array, else fall back to
  // the model's initial genre/theme strings.
  const seriesGenres = () => {
    const g = cd().genres
    if (g && g.length) return g
    return [cd().genre || '', cd().theme || ''].filter(Boolean)
  }

  // Series Overview
  const [editSeries, setEditSeries] = createSignal(false)
  const [sd, setSd] = createStore({
    title: '',
    genres: [] as string[],
    logline: '',
    summary: '',
  })
  const startSeries = () => {
    setSd({
      title: proposal()?.project?.title || '',
      genres: seriesGenres(),
      logline: cd().logline || '',
      summary: proposal()?.seasonOverview?.overallArc || '',
    })
    setEditSeries(true)
  }
  const saveSeries = () => {
    actions.updateProposal(['project', 'title'], sd.title)
    actions.updateProposal(['creativeDirection', 'genres'], [...sd.genres])
    actions.updateProposal(['creativeDirection', 'genre'], sd.genres[0] || '')
    actions.updateProposal(['creativeDirection', 'logline'], sd.logline)
    actions.updateProposal(['seasonOverview', 'overallArc'], sd.summary)
    setEditSeries(false)
  }

  // Main Characters (per-row)
  const [editChar, setEditChar] = createSignal(-1)
  const [ccd, setCcd] = createStore({ name: '', role: '', personality: '', background: '' })
  const startChar = (i: number) => {
    const c = (proposal()?.mainCharacters || [])[i]
    setCcd({
      name: c?.name || '',
      role: c?.role || '',
      personality: c?.personality || '',
      background: c?.background || '',
    })
    setEditChar(i)
  }
  const saveChar = (i: number) => {
    actions.updateProposal(['mainCharacters', i, 'name'], ccd.name)
    actions.updateProposal(['mainCharacters', i, 'role'], ccd.role)
    actions.updateProposal(['mainCharacters', i, 'personality'], ccd.personality)
    actions.updateProposal(['mainCharacters', i, 'background'], ccd.background)
    setEditChar(-1)
  }
  const cancelChar = (i: number) => {
    // Drop a freshly-added blank row when its first edit is cancelled.
    const c = (proposal()?.mainCharacters || [])[i]
    if (c && !c.name && !c.role && !c.personality && !c.background) actions.removeCharacter(i)
    setEditChar(-1)
  }
  const addChar = () => {
    actions.addCharacter()
    startChar((proposal()?.mainCharacters || []).length - 1)
  }

  // Episode Details
  const [editEp, setEditEp] = createSignal(false)
  const [ed, setEd] = createStore({ title: '', summary: '', keyMoments: '', goal: '', ending: '' })
  const startEp = () => {
    const e = sel()
    setEd({
      title: e?.title || '',
      summary: e?.summary || '',
      keyMoments: (e?.keyMoments || []).join('\n'),
      goal: e?.goal || '',
      ending: e?.endingCliffhanger || '',
    })
    setEditEp(true)
  }
  const saveEp = () => {
    const i = selIdx()
    actions.updateProposal(['seasonRoadmap', i, 'title'], ed.title)
    actions.updateProposal(['seasonRoadmap', i, 'summary'], ed.summary)
    actions.updateProposal(
      ['seasonRoadmap', i, 'keyMoments'],
      ed.keyMoments.split('\n').map((x) => x.trim()).filter(Boolean),
    )
    actions.updateProposal(['seasonRoadmap', i, 'goal'], ed.goal)
    actions.updateProposal(['seasonRoadmap', i, 'endingCliffhanger'], ed.ending)
    setEditEp(false)
  }
  const selectEp = (n: number) => {
    setEditEp(false)
    actions.selectEpisode(n)
  }

  return (
    <Show
      when={proposal() && !(s.proposalLoading && !proposal())}
      fallback={
        <div class="qcv1-loading">
          <div class="qcv1-spinner" />
          <p>{p2().loading}</p>
        </div>
      }
    >
      <div class="qcv1-p2">
        <div class="qcv1-p2-head">
          <h1 class="qcv1-h1 sm">{p2().title}</h1>
          <p class="qcv1-lead">{p2().subtitle}</p>
        </div>

        <div class="qcv1-p2-grid">
          {/* Main column */}
          <div class="qcv1-p2-main">
            {/* Series Overview */}
            <section class="qcv1-card">
              <div class="qcv1-card-head">
                <span class="qcv1-card-title">▦ {p2().seriesOverview.toUpperCase()}</span>
                <Show
                  when={editSeries()}
                  fallback={
                    <button class="qcv1-btn tiny" onClick={startSeries}>
                      ✎ {p2().edit}
                    </button>
                  }
                >
                  <div class="qcv1-edit-actions">
                    <button class="qcv1-btn tiny" onClick={saveSeries}>
                      {p2().save}
                    </button>
                    <button class="qcv1-btn tiny ghost" onClick={() => setEditSeries(false)}>
                      {p2().cancel}
                    </button>
                  </div>
                </Show>
              </div>
              <Show
                when={editSeries()}
                fallback={
                  <>
                    {readRow(p2().seriesTitle, proposal()?.project?.title || '', true)}
                    <div class="qcv1-row">
                      <span class="qcv1-row-label">{p2().genre}</span>
                      <span class="qcv1-val qcv1-val-tags">
                        <For each={seriesGenres()}>{(g) => <span class="qcv1-ep-tag">{g}</span>}</For>
                      </span>
                    </div>
                    {readRow(p2().logline, cd().logline || '')}
                    {readRow(p2().storySummary, proposal()?.seasonOverview?.overallArc || '')}
                  </>
                }
              >
                <div class="qcv1-row">
                  <span class="qcv1-row-label">{p2().seriesTitle}</span>
                  <textarea ref={autoGrow} rows={1} class="qcv1-inline-area strong bordered" value={sd.title} onInput={(e) => setSd('title', e.currentTarget.value)} />
                </div>
                <div class="qcv1-row">
                  <span class="qcv1-row-label">{p2().genre}</span>
                  <GenrePicker
                    value={sd.genres}
                    onChange={(tags) => setSd('genres', tags)}
                    placeholder={p2().genre}
                  />
                </div>
                <div class="qcv1-row">
                  <span class="qcv1-row-label">{p2().logline}</span>
                  <textarea ref={autoGrow} rows={1} class="qcv1-inline-area bordered" value={sd.logline} onInput={(e) => setSd('logline', e.currentTarget.value)} />
                </div>
                <div class="qcv1-row">
                  <span class="qcv1-row-label">{p2().storySummary}</span>
                  <textarea ref={autoGrow} rows={1} class="qcv1-inline-area bordered" value={sd.summary} onInput={(e) => setSd('summary', e.currentTarget.value)} />
                </div>
              </Show>
            </section>

            {/* Main Characters */}
            <section class="qcv1-card">
              <div class="qcv1-card-head">
                <span class="qcv1-card-title">👥 {p2().mainCharacters.toUpperCase()}</span>
                <button class="qcv1-btn tiny" onClick={() => actions.addCharacter()}>
                  + {p2().addCharacter}
                </button>
              </div>
              <div class="qcv1-char-table">
                <div class="qcv1-char-hrow">
                  <span>{p2().colCharacter}</span>
                  <span>{p2().colRole}</span>
                  <span>{p2().colPersonality}</span>
                  <span>{p2().colBackground}</span>
                  <span>{p2().colActions}</span>
                </div>
                <For each={proposal()?.mainCharacters || []}>
                  {(char, i) => (
                    <Show
                      when={editChar() === i()}
                      fallback={
                        <div class="qcv1-char-trow">
                          <span class="qcv1-cell-val strong">{char.name}</span>
                          <span class="qcv1-cell-val">{char.role}</span>
                          <span class="qcv1-cell-val">{char.personality}</span>
                          <span class="qcv1-cell-val">{char.background}</span>
                          <button class="qcv1-row-edit" onClick={() => startChar(i())}>
                            ✎ {p2().edit}
                          </button>
                        </div>
                      }
                    >
                      <div class="qcv1-char-trow editing">
                        <textarea ref={autoGrowRow} rows={1} class="qcv1-cell bordered strong" value={ccd.name} onInput={(e) => setCcd('name', e.currentTarget.value)} />
                        <textarea ref={autoGrowRow} rows={1} class="qcv1-cell bordered" value={ccd.role} onInput={(e) => setCcd('role', e.currentTarget.value)} />
                        <textarea ref={autoGrowRow} rows={1} class="qcv1-cell bordered" value={ccd.personality} onInput={(e) => setCcd('personality', e.currentTarget.value)} />
                        <textarea ref={autoGrowRow} rows={1} class="qcv1-cell bordered" value={ccd.background} onInput={(e) => setCcd('background', e.currentTarget.value)} />
                        <div class="qcv1-row-edit-actions">
                          <button class="qcv1-mini save" onClick={() => saveChar(i())}>
                            {p2().save}
                          </button>
                          <button class="qcv1-mini" onClick={() => cancelChar(i())}>
                            {p2().cancel}
                          </button>
                        </div>
                      </div>
                    </Show>
                  )}
                </For>
              </div>
            </section>

            {/* Season 1 Overview */}
            <section class="qcv1-card">
              <div class="qcv1-card-head">
                <span class="qcv1-card-title">▦ {p2().season.toUpperCase()}</span>
              </div>
              <div class="qcv1-season">
                <div class="qcv1-ep-list">
                  <For each={roadmap()}>
                    {(ep) => (
                      <button
                        class={`qcv1-ep-item ${s.selectedEpisode === ep.episode ? 'active' : ''}`}
                        onClick={() => selectEp(ep.episode)}
                      >
                        <span class="qcv1-ep-num">{ep.episode}</span>
                        <span class="qcv1-ep-text">
                          <span class="qcv1-ep-label">
                            {p2().episodeWord} {ep.episode}
                          </span>
                          <span class="qcv1-ep-name">{ep.title}</span>
                        </span>
                      </button>
                    )}
                  </For>
                </div>
                <Show when={sel()}>
                  <div class="qcv1-ep-details">
                    <div class="qcv1-card-head">
                      <span class="qcv1-card-subtitle">
                        {p2().episodeWord} {sel()!.episode} {p2().episodeDetails.toUpperCase()}
                      </span>
                      <Show
                        when={editEp()}
                        fallback={
                          <button class="qcv1-btn tiny" onClick={startEp}>
                            ✎ {p2().editEpisode}
                          </button>
                        }
                      >
                        <div class="qcv1-edit-actions">
                          <button class="qcv1-btn tiny" onClick={saveEp}>
                            {p2().save}
                          </button>
                          <button class="qcv1-btn tiny ghost" onClick={() => setEditEp(false)}>
                            {p2().cancel}
                          </button>
                        </div>
                      </Show>
                    </div>
                    <Show
                      when={editEp()}
                      fallback={
                        <>
                          {readRow(p2().epTitle, sel()!.title || '', true)}
                          {readRow(p2().epSummary, sel()!.summary || '')}
                          <div class="qcv1-row">
                            <span class="qcv1-row-label">{p2().keyMoments}</span>
                            <ul class="qcv1-km-list">
                              <For each={sel()!.keyMoments || []}>{(km) => <li>{km}</li>}</For>
                            </ul>
                          </div>
                          {readRow(p2().goal, sel()!.goal || '')}
                          {readRow(p2().ending, sel()!.endingCliffhanger || '')}
                        </>
                      }
                    >
                      <div class="qcv1-row">
                        <span class="qcv1-row-label">{p2().epTitle}</span>
                        <input class="qcv1-inline-input bordered" value={ed.title} onInput={(e) => setEd('title', e.currentTarget.value)} />
                      </div>
                      <div class="qcv1-row">
                        <span class="qcv1-row-label">{p2().epSummary}</span>
                        <textarea ref={autoGrow} rows={1} class="qcv1-inline-area bordered" value={ed.summary} onInput={(e) => setEd('summary', e.currentTarget.value)} />
                      </div>
                      <div class="qcv1-row">
                        <span class="qcv1-row-label">{p2().keyMoments}</span>
                        <textarea ref={autoGrow} rows={1} class="qcv1-inline-area bordered km" value={ed.keyMoments} onInput={(e) => setEd('keyMoments', e.currentTarget.value)} />
                      </div>
                      <div class="qcv1-row">
                        <span class="qcv1-row-label">{p2().goal}</span>
                        <textarea ref={autoGrow} rows={1} class="qcv1-inline-area bordered" value={ed.goal} onInput={(e) => setEd('goal', e.currentTarget.value)} />
                      </div>
                      <div class="qcv1-row">
                        <span class="qcv1-row-label">{p2().ending}</span>
                        <textarea ref={autoGrow} rows={1} class="qcv1-inline-area bordered" value={ed.ending} onInput={(e) => setEd('ending', e.currentTarget.value)} />
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div class="qcv1-p2-side">
            <section class="qcv1-card qcv1-ai">
              <span class="qcv1-card-title">✦ {p2().aiAssistant.toUpperCase()}</span>
              <p class="qcv1-ai-sub">{p2().aiSub}</p>
              <div class="qcv1-ai-input-wrap">
                <input
                  class="qcv1-ai-input"
                  placeholder={p2().aiPlaceholder}
                  value={s.aiEditInstruction}
                  disabled={s.aiEditing}
                  onInput={(e) => actions.setAiEditInstruction(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && actions.applyAiEdit()}
                />
                <button class="qcv1-ai-send" disabled={!s.aiEditInstruction.trim() || s.aiEditing} onClick={() => actions.applyAiEdit()}>
                  {s.aiEditing ? '…' : '➤'}
                </button>
              </div>
              <p class="qcv1-ai-ex-title">{p2().aiExamplesTitle}</p>
              <For each={p2().aiExamples}>
                {(ex) => (
                  <button class="qcv1-ai-example" disabled={s.aiEditing} onClick={() => { actions.setAiEditInstruction(ex); actions.applyAiEdit() }}>
                    {ex}
                  </button>
                )}
              </For>
              <Show when={s.aiEditError}>
                <p class="qcv1-error sm">{s.aiEditError}</p>
              </Show>
            </section>
            <section class="qcv1-card qcv1-tip-card">
              <span class="qcv1-tip-icon">💡</span>
              <div>
                <b>{p2().tipTitle}</b>
                <p>{p2().tip}</p>
              </div>
            </section>
          </div>
        </div>

        {/* Bottom action bar */}
        <div class="qcv1-bottombar">
          <button class="qcv1-btn ghost" onClick={() => actions.goToStep(1)}>
            ← {p2().back}
          </button>
          <div class="qcv1-bottombar-right">
            <button class="qcv1-btn ghost" disabled={s.proposalLoading} onClick={() => actions.regenerateProposal()}>
              ⟳ {s.proposalLoading ? p2().applying : p2().regenerate}
            </button>
            <button class="qcv1-btn primary" onClick={() => actions.approve()}>
              {p2().approve} →
            </button>
          </div>
        </div>
        <p class="qcv1-footer-note">🔒 {p2().footerNote}</p>
      </div>
    </Show>
  )
}

// ══════════════════════════════════════ Page 3 ══════════════════════════════════════

const Page3Studio = () => {
  const st = () => tv().studio
  const navigate = useNavigate()
  const previewShot = () => s.episodeShots[s.previewIndex]
  const previewVideo = () =>
    s.videos.find((v) => v.shot_number === previewShot()?.n) || s.videos[s.previewIndex]
  const previewImg = () => previewVideo()?.coverUrl || ''
  const total = () => s.videoTotal || s.episodeShots.length || 0
  const currentShotNum = () => Math.min(s.videoDone + 1, total() || 1)
  // Progress of the shot currently rendering: the server sends an average across all
  // shots, so back out the in-progress shot's own fraction (resets each shot).
  const currentShotPct = () => {
    const tot = total()
    if (!tot) return 0
    const frac = (s.videoPercent / 100) * tot - s.videoDone
    return Math.round(Math.max(0, Math.min(1, frac)) * 100)
  }

  // Time estimate: start from a baseline for a 480p/30s episode, then refine from the
  // observed render rate once shot generation begins.
  const PER_SHOT_SEC = 150
  const estRemainingSec = () => {
    if (s.episodeVideo || s.percent >= 100) return 0
    const tot = total() || 4
    if (!s.renderStartMs) return tot * PER_SHOT_SEC
    const doneFrac = (s.videoDone + currentShotPct() / 100) / tot
    const elapsed = (Date.now() - s.renderStartMs) / 1000
    if (doneFrac > 0.02) return Math.max(0, Math.round(elapsed / doneFrac - elapsed))
    return Math.max(0, Math.round(tot * PER_SHOT_SEC - elapsed))
  }
  const fmtETA = (sec: number) => {
    if (sec <= 0) return '—'
    const m = Math.floor(sec / 60)
    const r = Math.round(sec % 60)
    return m > 0 ? `${m} min ${r} sec` : `${r} sec`
  }

  return (
    <div class="qcv1-p3">
      <div class="qcv1-p3-top">
        <div class="qcv1-p3-head">
          <h1 class="qcv1-h1">{st().title}</h1>
          <p class="qcv1-lead">{st().subtitle}</p>
        </div>
        <div class="qcv1-p3-cards">
          <div class="qcv1-est-card">
            <span class="qcv1-est-label">{st().estRemaining}</span>
            <div class="qcv1-est-row">
              <span class="qcv1-est-time">{fmtETA(estRemainingSec())}</span>
              <span class="qcv1-est-pct">{s.percent}%</span>
            </div>
            <div class="qcv1-progress-outer">
              <div class="qcv1-progress-inner" style={{ width: `${s.percent}%` }} />
            </div>
          </div>
          <div class="qcv1-know-card">
            <span class="qcv1-know-title">✦ {st().didYouKnow}</span>
            <p>{st().didYouKnowText}</p>
          </div>
        </div>
      </div>

      <div class="qcv1-p3-grid">
        {/* Stage list */}
        <div class="qcv1-stage-list">
          <For each={STUDIO_STAGES}>
            {(stage) => {
              const info = stageInfo(stage.serverKeys, stage.key)
              const isShots = stage.key === 'renderingShots'
              const meta = () =>
                (st().stages as Record<string, { name: string; desc: string }>)[stage.key]
              // The Rendering Shots row shows a live "n/total" count and the current
              // shot's own progress (which resets between shots).
              const name = () =>
                isShots && total() > 0 ? `${meta().name} ${currentShotNum()}/${total()}` : meta().name
              const pct = () => (isShots ? currentShotPct() : info.pct())
              return (
                <div class={`qcv1-stage ${info.status()}`}>
                  <span class="qcv1-stage-icon">{STAGE_ICON[stage.key]}</span>
                  <div class="qcv1-stage-body">
                    <div class="qcv1-stage-name">{name()}</div>
                    <div class="qcv1-stage-desc">{meta().desc}</div>
                    <Show when={info.status() === 'running'}>
                      <div class="qcv1-stage-bar">
                        <div class="qcv1-stage-bar-in" style={{ width: `${pct()}%` }} />
                      </div>
                    </Show>
                  </div>
                  <div class="qcv1-stage-status">
                    <Switch>
                      <Match when={info.status() === 'done'}>
                        <span class="qcv1-st-complete">{st().status.complete} <span class="qcv1-check-circle">✓</span></span>
                      </Match>
                      <Match when={info.status() === 'running'}>
                        <span class="qcv1-st-running">{st().status.inProgress} {pct()}%</span>
                      </Match>
                      <Match when={info.status() === 'error'}>
                        <span class="qcv1-st-error">{st().status.error}</span>
                      </Match>
                      <Match when={true}>
                        <span class="qcv1-st-queued">{st().status.queued} ⋯</span>
                      </Match>
                    </Switch>
                  </div>
                </div>
              )
            }}
          </For>
        </div>

        {/* Live preview + production progress */}
        <div class="qcv1-preview-col">
          <div class="qcv1-preview-card">
            <div class="qcv1-preview-head">
              <span class="qcv1-preview-title">{st().livePreview.toUpperCase()}</span>
              <Show when={s.videoTotal > 0 && s.videoDone < s.videoTotal}>
                <span class="qcv1-render-badge">
                  ◔ {st().renderingShot} {currentShotNum()} {st().of} {s.videoTotal}
                </span>
              </Show>
            </div>
            <div class="qcv1-preview-body">
              <div class="qcv1-preview-left">
                <div class="qcv1-preview-ep-title">
                  {st().creatingEpisode} {s.episodeNumber}
                </div>
                <div class="qcv1-preview-ep-sub">
                  {s.proposal?.seasonRoadmap?.[s.episodeNumber - 1]?.title || ''}
                </div>
                <Show when={previewShot()}>
                  <div class="qcv1-current-shot">
                    <span class="qcv1-current-shot-label">{st().currentShot.toUpperCase()}</span>
                    <div class="qcv1-current-shot-title">Shot {previewShot()!.n}</div>
                    <div class="qcv1-current-shot-loc">{previewShot()!.location}</div>
                    <p class="qcv1-current-shot-sum">{previewShot()!.summary}</p>
                  </div>
                </Show>
              </div>
              <div class="qcv1-preview-right">
                <Show when={s.episodeShots.length > 1}>
                  <button class="qcv1-preview-nav left" onClick={() => actions.prevShot()}>‹</button>
                </Show>
                <div class="qcv1-preview-image">
                  <Show when={previewImg()} fallback={<div class="qcv1-preview-placeholder">🎬</div>}>
                    <img src={previewImg()} alt="" />
                  </Show>
                </div>
                <Show when={s.episodeShots.length > 1}>
                  <button class="qcv1-preview-nav right" onClick={() => actions.nextShot()}>›</button>
                </Show>
              </div>
            </div>
          </div>

          <div class="qcv1-prod-progress">
            <span class="qcv1-prod-title">{st().productionProgress.toUpperCase()}</span>
            <div class="qcv1-prod-row">
              <For each={PROG_ITEMS}>
                {(item, i) => {
                  const stage = STUDIO_STAGES.find((x) => x.key === item.stage)!
                  const info = stageInfo(stage.serverKeys, stage.key)
                  return (
                    <>
                      <div class={`qcv1-prod-item ${info.status()}`}>
                        <div class="qcv1-prod-thumb">
                          <img src={img(`prog-${item.id}`)} alt="" loading="lazy" />
                          <Show when={info.status() === 'pending'}>
                            <span class="qcv1-prod-lock">🔒</span>
                          </Show>
                        </div>
                        <span class="qcv1-prod-label">{(st().prog as Record<string, string>)[item.id]}</span>
                        <span class={`qcv1-prod-status ${info.status()}`}>
                          <Switch>
                            <Match when={info.status() === 'done'}>{st().status.complete} ✓</Match>
                            <Match when={info.status() === 'running'}>{info.pct()}%</Match>
                            <Match when={true}>{st().status.queued}</Match>
                          </Switch>
                        </span>
                      </div>
                      <Show when={i() < PROG_ITEMS.length - 1}>
                        <span class="qcv1-prod-dots">··</span>
                      </Show>
                    </>
                  )
                }}
              </For>
            </div>
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div class="qcv1-log-card">
        <div class="qcv1-card-head">
          <span class="qcv1-card-title">{st().activityLog.toUpperCase()}</span>
          <span class="qcv1-view-log">{st().viewFullLog} ⧉</span>
        </div>
        <div class="qcv1-log-lines">
          <For each={s.activityLog}>
            {(line) => {
              const text = () => {
                if (line.text) return line.text
                if (line.key.startsWith('rendering:'))
                  return `${st().log.rendering} ${line.key.slice(10)}`
                if (line.key.startsWith('transcribe:'))
                  return (st().log as Record<string, string>)[line.key.slice(11)] || line.key
                return (st().log as Record<string, string>)[line.key] || line.key
              }
              return (
                <div class="qcv1-log-line">
                  <span class="qcv1-log-time">{line.time}</span>
                  <span class="qcv1-log-text">{text()}</span>
                </div>
              )
            }}
          </For>
        </div>
      </div>

      <Show when={s.produceError}>
        <p class="qcv1-error">{s.produceError}</p>
      </Show>

      {/* Finalizing banner — shown once every shot has rendered but the stitched episode
          isn't ready yet (audio/composition + encode). Reassures the user the studio will
          advance on its own, so step 3 doesn't look frozen. */}
      <Show when={s.producing && !s.episodeVideo && s.videoTotal > 0 && s.videoDone >= s.videoTotal}>
        <p class="qcv1-finalizing">⏳ {st().finalizing}</p>
      </Show>

      {/* Bottom bar */}
      <div class="qcv1-bottombar">
        <button class="qcv1-btn ghost" onClick={() => actions.goToStep(2)}>
          ← {st().backToProposal}
        </button>
        <div class="qcv1-saved-note">
          ☁ {st().savedCloud} {st().savedCloudSub}
        </div>
        <div class="qcv1-bottombar-right">
          <button class="qcv1-btn ghost" onClick={() => navigate('/')}>
            🚪 {st().exitStudio}
          </button>
          {/* Enabled only once the episode video is ready; it then opens the Ready page (the
              studio also auto-advances there on its own). Disabled while still producing. */}
          <button
            class="qcv1-btn primary"
            disabled={!s.episodeVideo}
            onClick={() => actions.goToStep(4)}
          >
            ▶ {st().stayWatch}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════ Page 4 ══════════════════════════════════════

const Page4Ready = () => {
  const r = () => tv().ready
  const navigate = useNavigate()
  const ep1 = () =>
    s.proposal?.seasonRoadmap?.[s.episodeNumber - 1] || s.proposal?.seasonRoadmap?.[0]
  const title = () => ep1()?.title || s.proposal?.project?.title || 'Episode 1'
  const cd = () => s.proposal?.creativeDirection || {}
  const totalTime = () => (s.totalTimeSec > 0 ? mmss(s.totalTimeSec) : '—')
  const today = () => {
    try {
      return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }
  // Prefer the generated episode's actual beats; fall back to the proposal roadmap.
  const keyMoments = () =>
    s.episodeKeyMoments.length ? s.episodeKeyMoments : ep1()?.keyMoments || []
  const kmTime = (i: number, n: number) => mmss(Math.round(((i + 1) / (n + 1)) * 30))
  // Episodes that already have a production (generated or generating).
  const producedNums = () => new Set(s.seriesEpisodes.map((e) => e.episode))
  // What's Next = roadmap episodes with no production yet (and not the current one).
  const nextEpisodes = () =>
    (s.proposal?.seasonRoadmap || []).filter(
      (e) => !producedNums().has(e.episode) && e.episode !== s.episodeNumber,
    )

  // "What's Next": confirm dialog → balance check → charge/unlock → generate the episode.
  const [nextEp, setNextEp] = createSignal<V1RoadmapEpisode | null>(null)
  const [charging, setCharging] = createSignal(false)
  const cost = () => systemSettingsStore.nextEpisodeCost ?? 0.99
  const balance = () => accountStore.balance
  const canAfford = () => balance() >= cost()
  const goTopUp = () => {
    setNextEp(null)
    navigate('/account?tab=wallet')
  }
  const confirmNext = async () => {
    const ep = nextEp()
    if (!ep || charging() || !s.jobId) return
    if (!canAfford()) return goTopUp() // client-side balance check
    setCharging(true)
    try {
      const res = await startNextEpisodeApi(s.jobId, ep.episode)
      if (!res.success || !res.data) {
        if (res.error === 'Insufficient balance') {
          toastStoreActions.show(r().insufficientBalance, 'error')
          goTopUp()
        } else {
          toastStoreActions.show(res.error || 'Failed', 'error')
        }
        return
      }
      if (res.data.charged && typeof res.data.balance === 'number') {
        accountStoreActions.setBalance(res.data.balance)
      }
      setNextEp(null)
      actions.startNextEpisode(res.data.jobId, ep.episode)
    } finally {
      setCharging(false)
    }
  }

  const download = () => {
    if (!s.episodeVideo) return
    const a = document.createElement('a')
    a.href = s.episodeVideo
    a.download = `${title()}.mp4`
    a.click()
  }
  const [shareOpen, setShareOpen] = createSignal(false)
  const shareCover = () => s.videos.find((v) => v.coverUrl)?.coverUrl || ''
  // s1: share the app /watch page (full watch, no trial limit). s0: share the mp4.
  const shareUrl = () => (S1 ? `${shareBase()}/watch/${s.jobId}` : s.episodeVideo)
  // Only Creator-Program members (publishers) may publish. On click, re-check with the
  // server (allowUpload can change after joining) and refresh the cached user; fall back
  // to the cached value if the request fails.
  const [joinPrompt, setJoinPrompt] = createSignal(false)
  const cachedAllowUpload = () =>
    ((accountStore.user || getStoredUser()) as { allowUpload?: boolean } | null)?.allowUpload === true
  const publish = async () => {
    let allowed = cachedAllowUpload()
    try {
      const me = await fetchMe()
      if (me) {
        accountStoreActions.setUser(me)
        setStoredUser(me)
        allowed = me.allowUpload === true
      }
    } catch {
      /* keep the cached decision */
    }
    if (allowed) actions.openPublish()
    else setJoinPrompt(true)
  }
  const soon = () => toastStoreActions.show(r().editBtn, 'info')

  const ActionCard = (props: {
    icon: string
    title: string
    desc: string
    btn: string
    onClick: () => void
    primary?: boolean
    disabled?: boolean
  }) => (
    <div class="qcv1-action-card">
      <div class="qcv1-action-head">
        <span class="qcv1-action-icon">{props.icon}</span>
        <div>
          <div class="qcv1-action-title">{props.title}</div>
          <div class="qcv1-action-desc">{props.desc}</div>
        </div>
      </div>
      <button
        class={`qcv1-btn ${props.primary ? 'primary' : 'ghost'} qcv1-action-btn`}
        disabled={props.disabled}
        onClick={() => props.onClick()}
      >
        {props.btn}
      </button>
    </div>
  )

  return (
    <div class="qcv1-p4">
      <div class="qcv1-p4-grid">
        {/* Main */}
        <div class="qcv1-p4-main">
          <div class="qcv1-p4-head">
            <div>
              <h1 class="qcv1-h1">
                {r().episodeWord} {s.episodeNumber} {r().readySuffix} 🎉
              </h1>
              <p class="qcv1-lead">{r().subtitle}</p>
            </div>
            <div class="qcv1-time-card">
              <span class="qcv1-time-label">🕐 {r().totalTime}</span>
              <span class="qcv1-time-val">{totalTime()}</span>
            </div>
          </div>

          <Show
            when={s.episodeVideo}
            fallback={
              <div class="qcv1-loading tall">
                <div class="qcv1-spinner" />
                <p>{r().rendering}</p>
              </div>
            }
          >
            {/* s1: the episode is on Bunny — play via the embed iframe. s0: Cloudinary mp4. */}
            <Show
              when={S1}
              fallback={<video src={s.episodeVideo} controls playsinline class="qcv1-video" />}
            >
              <div class="qcv1-embed">
                <iframe
                  src={`${s.episodeVideo}?autoplay=false&preload=true`}
                  loading="lazy"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowfullscreen
                />
              </div>
            </Show>
          </Show>

          <div class="qcv1-ep-card">
            <div class="qcv1-ep-card-left">
              <div class="qcv1-ep-card-head">
                <span class="qcv1-ep-icon">🎬</span>
                <div>
                  <div class="qcv1-ep-eyebrow">
                    {r().episodeWord} {s.episodeNumber}
                  </div>
                  <div class="qcv1-ep-big-title">{title()}</div>
                </div>
              </div>
              <div class="qcv1-ep-tags">
                <Show when={cd().genre}><span class="qcv1-ep-tag">{cd().genre}</span></Show>
                <Show when={cd().theme}><span class="qcv1-ep-tag">{cd().theme}</span></Show>
                <Show when={cd().tone}><span class="qcv1-ep-tag">{cd().tone}</span></Show>
              </div>
              <div class="qcv1-ep-meta">
                <span>🕐 0:30</span>
                <span>📺 480p</span>
                <span>📅 {today()}</span>
              </div>
              <p class="qcv1-ep-summary">{ep1()?.summary || ''}</p>
            </div>
            <div class="qcv1-ep-card-right">
              <span class="qcv1-km-title">{r().keyMoments}</span>
              <For each={keyMoments()}>
                {(km, i) => (
                  <div class="qcv1-km-row">
                    <span class="qcv1-km-time">{kmTime(i(), keyMoments().length)}</span>
                    <span class="qcv1-km-text">{km}</span>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Generated Episodes — every produced episode of this series */}
          <Show when={s.seriesEpisodes.length > 0}>
            <div class="qcv1-next">
              <div class="qcv1-next-head">
                <b>{r().generatedEpisodes}</b>
              </div>
              <div class="qcv1-next-grid">
                <For each={s.seriesEpisodes}>
                  {(ep) => (
                    <button
                      class={`qcv1-next-card gen ${ep.episode === s.episodeNumber ? 'active' : ''}`}
                      onClick={() => actions.openProduction(ep.jobId)}
                    >
                      <div class="qcv1-next-thumb">
                        <Show when={ep.cover} fallback={<span>🎬</span>}>
                          <img src={ep.cover} alt="" />
                        </Show>
                      </div>
                      <div class="qcv1-next-eyebrow">
                        {r().episodeWord} {ep.episode}
                      </div>
                      <div class="qcv1-next-title">{ep.title}</div>
                      <div class="qcv1-next-genstatus">
                        {ep.status === 'done' ? `▶ ${r().watchBtn}` : r().generatingLabel}
                      </div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <Show when={nextEpisodes().length > 0}>
            <div class="qcv1-next">
              <div class="qcv1-next-head">
                <b>{r().whatsNext}</b> <span class="qcv1-next-sub">{r().whatsNextSub}</span>
              </div>
              <div class="qcv1-next-grid">
                <For each={nextEpisodes()}>
                  {(ep, i) => (
                    <div class={`qcv1-next-card ${i() === 0 ? 'active' : ''}`}>
                      <div class="qcv1-next-thumb">🎞️</div>
                      <div class="qcv1-next-eyebrow">{r().episodeWord} {ep.episode}</div>
                      <div class="qcv1-next-title">{ep.title}</div>
                      <div class="qcv1-next-desc">{ep.summary}</div>
                      <button class="qcv1-btn ghost sm full qcv1-next-btn" onClick={() => setNextEp(ep)}>
                        <span>{r().createEpisode} {ep.episode} →</span>
                        <span class="qcv1-next-price">
                          <img src={GUSD_LOGO} alt="GUSD" class="qcv1-gusd" /> {cost().toFixed(2)}
                        </span>
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>

        {/* Action sidebar */}
        <div class="qcv1-p4-side">
          <ActionCard icon="▶" title={r().watchTitle} desc={r().watchDesc} btn={`${r().watchBtn} ▶`} primary onClick={() => document.querySelector('.qcv1-video')?.scrollIntoView({ behavior: 'smooth' })} />
          <ActionCard icon="🔗" title={r().shareTitle} desc={r().shareDesc} btn={`${r().shareBtn} ⧉`} onClick={() => setShareOpen(true)} disabled={!s.episodeVideo} />
          <Show when={!S1}>
            <ActionCard icon="⬇" title={r().downloadTitle} desc={r().downloadDesc} btn={`${r().downloadBtn} ⬇`} onClick={download} disabled={!s.episodeVideo} />
          </Show>
          <ActionCard icon="✎" title={r().editTitle} desc={r().editDesc} btn={`${r().editBtn} ⧉`} onClick={soon} />
          <ActionCard
            icon="▣"
            title={r().publishTitle}
            desc={r().publishDesc.replace('{n}', String(s.episodeNumber))}
            btn={r().publishBtn.replace('{n}', String(s.episodeNumber))}
            onClick={publish}
          />
        </div>
      </div>

      {/* Bottom bar. When resumed from My Series, the Studio is no longer available. */}
      <div class="qcv1-bottombar">
        <Show when={!s.resumed} fallback={<span />}>
          <button class="qcv1-btn ghost" onClick={() => actions.goToStep(3)}>
            ← {r().backToStudio}
          </button>
        </Show>
        <div class="qcv1-saved-note">☁ {r().savedCloud} {r().savedCloudSub}</div>
        <button class="qcv1-btn primary" onClick={() => navigate('/account')}>
          ▦ {r().goToMySeries}
        </button>
      </div>

      <Show when={shareOpen()}>
        <SocialSharePopup
          url={shareUrl()}
          text={getShareText(title(), 1)}
          imageUrl={shareCover()}
          title={r().shareTitle}
          closeLabel={r().close}
          onClose={() => setShareOpen(false)}
        />
      </Show>

      {/* Publishing requires Creator Program membership */}
      <Show when={joinPrompt()}>
        <div class="qcv1-modal-overlay" onClick={() => setJoinPrompt(false)}>
          <div class="qcv1-modal" onClick={(e) => e.stopPropagation()}>
            <div class="qcv1-modal-eyebrow">✦ {r().joinEyebrow}</div>
            <h3 class="qcv1-modal-title">{r().joinTitle}</h3>
            <p class="qcv1-modal-summary">{r().joinDesc}</p>
            <div class="qcv1-modal-actions">
              <button class="qcv1-btn ghost" onClick={() => setJoinPrompt(false)}>
                {r().cancel}
              </button>
              <button class="qcv1-btn primary" onClick={() => navigate('/creator-program')}>
                {r().joinBtn}
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Generate-next-episode confirm dialog */}
      <Show when={nextEp()}>
        <div class="qcv1-modal-overlay" onClick={() => !charging() && setNextEp(null)}>
          <div class="qcv1-modal" onClick={(e) => e.stopPropagation()}>
            <div class="qcv1-modal-eyebrow">
              {r().episodeWord} {nextEp()!.episode}
            </div>
            <h3 class="qcv1-modal-title">{nextEp()!.title}</h3>
            <p class="qcv1-modal-summary">{nextEp()!.summary}</p>
            <Show when={nextEp()!.endingCliffhanger}>
              <p class="qcv1-modal-hook">🎬 {nextEp()!.endingCliffhanger}</p>
            </Show>
            <div class="qcv1-modal-cost">
              <span>
                {r().generateCostPre} {nextEp()!.episode} {r().generateCostMid}
              </span>
              <span class="qcv1-modal-price">
                <img src={GUSD_LOGO} alt="GUSD" class="qcv1-gusd" /> <b>{cost().toFixed(2)}</b>
              </span>
            </div>
            <div class="qcv1-modal-balance">
              <span>{r().yourBalance}</span>
              <span class={`qcv1-modal-bal ${canAfford() ? '' : 'low'}`}>
                <img src={GUSD_LOGO} alt="GUSD" class="qcv1-gusd" /> {balance().toFixed(2)}
              </span>
            </div>
            <Show when={!canAfford()}>
              <p class="qcv1-error sm">{r().insufficientBalance}</p>
            </Show>
            <div class="qcv1-modal-actions">
              <button class="qcv1-btn ghost" disabled={charging()} onClick={() => setNextEp(null)}>
                {r().cancel}
              </button>
              <Show
                when={canAfford()}
                fallback={
                  <button class="qcv1-btn secondary" onClick={goTopUp}>
                    {r().topUp}
                  </button>
                }
              >
                <button class="qcv1-btn primary" disabled={charging()} onClick={confirmNext}>
                  {charging() ? r().generatingNext : r().continueGenerate}
                </button>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

// ── Toast + root ──

const Toast = () => (
  <Show when={toastStore.isVisible}>
    <div class={`qcv1-toast ${toastStore.type}`}>{toastStore.message}</div>
  </Show>
)

// The genres to pre-fill the publish page's tags with.
const publishTags = (): string[] => {
  const cd = s.proposal?.creativeDirection || {}
  return cd.genres?.length ? cd.genres : [cd.genre || '', cd.theme || ''].filter(Boolean)
}

// Adapt the v1 production/proposal into the shape the (shared) v0 PublishEpisode reads.
const v1PublishProduction = (): ProductionJob => {
  const p = s.proposal
  const cd = p?.creativeDirection || {}
  const epNum = s.episodeNumber || 1
  const ep1 = p?.seasonRoadmap?.[epNum - 1] || p?.seasonRoadmap?.[0]
  const cover = s.videos.find((v) => v.coverUrl)?.coverUrl || ''
  return {
    status: 'done',
    jobId: s.jobId || undefined,
    // seriesId (once published) puts PublishEpisode into edit mode: it fetches the saved
    // series and shows the saved cover/title/description/tags instead of the defaults.
    seriesId: s.seriesId || undefined,
    ideaTitle: p?.project?.title || '',
    cover,
    seriesCover: cover,
    episodeVideo: s.episodeVideo,
    episodeLength: 30,
    genre: null,
    artStyle: null,
    videos: s.videos as ProductionJob['videos'],
    episodes: [
      { n: epNum, title: ep1?.title || p?.project?.title || `Episode ${epNum}`, desc: ep1?.summary || '', cover },
    ],
    calls: { executiveProducer: { series_blueprint: { logline: cd.logline || '' } } },
  } as ProductionJob
}

const QuickCreateV1 = () => {
  const [params] = useSearchParams()
  const resumeId = typeof params.production === 'string' ? params.production : ''
  // Set synchronously (before first render) so resuming from My Series shows a loader
  // instead of flashing Page 1 while openProduction fetches the real step.
  if (resumeId) actions.setResuming(true)

  onMount(() => {
    // Ensure the follow-up-episode cost (system setting) is loaded for Page 4.
    if (!systemSettingsStore.loaded) systemSettingsStoreActions.load()
    if (resumeId) actions.openProduction(resumeId, params.publish === '1')
  })

  return (
    <div class="qcv1-page">
      <TopBar />
      <Show
        when={!s.resuming}
        fallback={
          <div class="qcv1-content">
            <div class="qcv1-loading tall">
              <div class="qcv1-spinner" />
            </div>
          </div>
        }
      >
        <Show when={!s.wantPublish}>
          <StepBar />
        </Show>
        <div class="qcv1-content">
          <Show
            when={s.wantPublish && s.jobId}
            fallback={
              <Switch>
                <Match when={s.step === 1}>
                  <Page1Idea />
                </Match>
                <Match when={s.step === 2}>
                  <Page2Proposal />
                </Match>
                <Match when={s.step === 3}>
                  <Page3Studio />
                </Match>
                <Match when={s.step === 4}>
                  <Page4Ready />
                </Match>
              </Switch>
            }
          >
          {/* The shared v0 publish page, fed the v1 production. */}
          <PublishEpisode
            production={v1PublishProduction()}
            jobId={s.jobId!}
            fallbackTitle={s.proposal?.project?.title || ''}
            episodeLength={30}
            defaultTags={publishTags()}
            onClose={() => actions.closePublish()}
            onPublished={(id) => actions.setSeriesId(id)}
          />
          </Show>
        </div>
      </Show>
      <Toast />
    </div>
  )
}

export default QuickCreateV1

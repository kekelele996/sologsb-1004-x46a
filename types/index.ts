export type ScriptStatus = 'draft' | 'review' | 'returned' | 'approved'
export type DeviceKind = 'desktop' | 'tablet' | 'mobile' | 'kiosk'
/** 译稿段落的对位复核状态：current 已按当前母版复核，stale 母版改动后待复核 */
export type ReviewState = 'current' | 'stale'

export interface Hall {
  id: string
  name: string
  description: string
}

export interface Segment {
  id: string
  label: string
  content: string
  locked: boolean
  /** 母版段落（中文）修订号，内容每次改动 +1 */
  rev?: number
  /** 译稿段落锚定的母版段落 id；null 表示在待接入清单中尚未对位 */
  masterId?: string | null
  /** 译稿段落相对母版的复核状态 */
  reviewState?: ReviewState
  /** 最近一次复核时锚定的母版修订号；与母版 rev 不一致即为待复核 */
  masterRev?: number
  /** 来源标记，如 legacy-import 表示旧译稿接入 */
  origin?: string
  /** 脱离对位或导入时的说明，例如“母版段落已拆分，请重新对位” */
  note?: string
}

export interface LanguageDraft {
  id: string
  languageId: string
  title: string
  narration: string
  accessibility: string
  durationMinutes: number
  sources: string
  status: ScriptStatus
  segments: Segment[]
  updatedAt: string
}

export interface Exhibit {
  id: string
  hallId: string
  code: string
  title: string
  order: number
  drafts: LanguageDraft[]
}

export interface Language {
  id: string
  code: string
  label: string
  shortLabel: string
}

export interface VersionSnapshot {
  id: string
  exhibitId: string
  languageId: string
  name: string
  createdAt: string
  draft: LanguageDraft
}

/** 段落对齐板的一行：一个母版段加各语言锚定到它的译稿段 */
export interface AlignmentRow {
  master: Segment
  cells: Record<string, Segment[]>
}

export interface InboxGroup {
  languageId: string
  segments: Segment[]
}

export interface PersistedState {
  schemaVersion?: number
  halls: Hall[]
  exhibits: Exhibit[]
  versions: VersionSnapshot[]
  selectedHallId: string
  selectedExhibitId: string
  selectedLanguageId: string
  lastSavedAt: string
}

export interface DiffLine {
  type: 'same' | 'add' | 'remove'
  text: string
}

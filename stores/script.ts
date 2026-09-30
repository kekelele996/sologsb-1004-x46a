import { defineStore } from 'pinia'
import type {
  AlignmentRow, Exhibit, Hall, InboxGroup, Language, LanguageDraft,
  PersistedState, ReviewState, ScriptStatus, Segment, VersionSnapshot
} from '~/types'

export const LANGUAGES: Language[] = [
  { id: 'zh', code: 'zh-CN', label: '简体中文', shortLabel: '中' },
  { id: 'en', code: 'en-US', label: 'English', shortLabel: 'EN' },
  { id: 'ja', code: 'ja-JP', label: '日本語', shortLabel: '日' }
]

const STORAGE_KEY = 'museum-script-studio-v1'
export const SCHEMA_VERSION = 2
export const ORIGIN_LEGACY = 'legacy-import'
let uidCounter = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(uidCounter++).toString(36)}`

/* ---------- 段落构造 ---------- */

function zhSegment(id: string, label: string, content: string, locked = false, note?: string): Segment {
  return { id, label, content, locked, rev: 1, ...(note ? { note } : {}) }
}
function trSegment(
  prefix: string, index: number, label: string, content: string,
  opts: { masterId?: string | null; reviewState?: ReviewState; masterRev?: number; locked?: boolean; origin?: string; note?: string } = {}
): Segment {
  const { masterId = null, reviewState = 'stale', masterRev, locked = false, origin, note } = opts
  return {
    id: `${prefix}-${index + 1}`, label, content, locked,
    masterId, reviewState, ...(masterRev !== undefined ? { masterRev } : {}),
    ...(origin ? { origin } : {}), ...(note ? { note } : {})
  }
}

/* ---------- 演示数据 ---------- */

function demoState(): PersistedState {
  const halls: Hall[] = [
    { id: 'hall-ancient', name: '文明肇始厅', description: '史前至先秦文明，共 18 个展项' },
    { id: 'hall-silk', name: '丝路交融厅', description: '丝绸之路上的器物、信仰与生活' },
    { id: 'hall-city', name: '城市记忆厅', description: '近现代城市空间与市民生活' }
  ]
  const exhibits: Exhibit[] = [
    {
      id: 'exhibit-jade', hallId: 'hall-ancient', code: 'A-03', title: '玉琮：沟通天地的礼器', order: 3,
      drafts: [
        {
          id: 'draft-jade-zh', languageId: 'zh', title: '玉琮：沟通天地的礼器',
          narration: '这件玉琮出土于长江下游的良渚遗址。它外方内圆，四角雕刻神人兽面纹，体现了新石器时代晚期精湛的玉器工艺。',
          accessibility: '玉琮为深青色，高约二十厘米。触摸模型可感受方形四角与中央圆孔；圆孔贯穿器身。',
          durationMinutes: 2.5, sources: '《中国玉器全集》第一卷；本馆藏品档案 1987-J-042',
          status: 'approved', updatedAt: '2026-09-28T08:35:00.000Z',
          segments: [
            zhSegment('jade-zh-1', '开场定位', '这件玉琮来自距今约五千年的良渚文化。', true),
            zhSegment('jade-zh-2', '器物观察', '它外方内圆，四角雕刻神人兽面纹。', true),
            // 第 3 段母版刚改写过（rev 2），英文待复核、日文已定稿锁定保留
            zhSegment('jade-zh-3', '文化含义', '玉琮是良渚社会沟通天地的礼器，也标志着持有者的权力与身份。', false, '2026-09-28 补充良渚社会背景'),
            zhSegment('jade-zh-4', '参观提示', '请沿展柜顺时针观察，触摸复制品前先使用免洗消毒液。')
          ]
        },
        {
          id: 'draft-jade-en', languageId: 'en', title: 'Jade Cong: A Ritual Object Between Heaven and Earth',
          narration: 'This jade cong was made by the Liangzhu culture. Its square exterior and circular bore embody an early Chinese vision of the cosmos.',
          accessibility: 'The object is dark green. A tactile model shows four corners, carved faces, and a central circular opening.',
          durationMinutes: 2.3, sources: 'Complete Collection of Chinese Jades, Vol. 1; Museum accession 1987-J-042',
          status: 'review', updatedAt: '2026-09-24T02:15:00.000Z',
          segments: [
            trSegment('jade-en', 0, 'Introduction', 'This jade cong is about five thousand years old.', { masterId: 'jade-zh-1', reviewState: 'current', masterRev: 1, locked: true }),
            trSegment('jade-en', 1, 'Visual description', 'Its square body encloses a circular opening, while spirit-and-animal motifs cover the corners.', { masterId: 'jade-zh-2', reviewState: 'current', masterRev: 1 }),
            // 母版第 3 段已更新到 rev 2：未锁定译稿自动回到待复核
            trSegment('jade-en', 2, 'Meaning', 'Jade cong is understood as a ritual link between heaven and earth.', { masterId: 'jade-zh-3', reviewState: 'stale', masterRev: 1 }),
            trSegment('jade-en', 3, 'Visit note', 'Walk clockwise around the case and sanitize your hands before touching the replica.', { masterId: 'jade-zh-4', reviewState: 'current', masterRev: 1 }),
            // 旧译稿：母版里已找不到对应段，留在待接入清单，不覆盖任何现有段
            trSegment('jade-en', 4, 'Provenance note (old)', 'Acquired in 1987 from a Liangzhu cemetery excavation; donated in 1992.', { masterId: null, reviewState: 'stale', origin: ORIGIN_LEGACY, note: '旧译稿：母版中无对应段落，请重新对位' })
          ]
        },
        {
          id: 'draft-jade-ja', languageId: 'ja', title: '玉琮：天と地を結ぶ礼器',
          narration: 'こちらは良渚文化の玉琮です。外側は方形、中央は円形で、四隅には神人獣面文が刻まれています。',
          accessibility: '暗い青緑色の玉製です。複製模型では四つの角と中央の円孔を触って確認できます。',
          durationMinutes: 2.6, sources: '『中国玉器全集』第一巻；収蔵資料 1987-J-042',
          status: 'draft', updatedAt: '2026-09-21T06:10:00.000Z',
          segments: [
            trSegment('jade-ja', 0, '導入', '約五千年前の良渚文化を代表する玉琮です。', { masterId: 'jade-zh-1', reviewState: 'current', masterRev: 1, locked: true }),
            trSegment('jade-ja', 1, '観察', '外側は方形、中央は円形で、四隅に精緻な文様があります。', { masterId: 'jade-zh-2', reviewState: 'current', masterRev: 1 }),
            // 已定稿锁定：母版改动不使其失效，内容照旧保留，仅提示母版已更新
            trSegment('jade-ja', 2, '意味', '天地を結ぶ礼器として、力と身分を象徴しました。', { masterId: 'jade-zh-3', reviewState: 'current', masterRev: 1, locked: true }),
            trSegment('jade-ja', 3, '見学のヒント', '展示ケースを時計回りにご覧ください。複製模型に触れる前に手指消毒をお願いします。', { masterId: 'jade-zh-4', reviewState: 'current', masterRev: 1 })
          ]
        }
      ]
    },
    {
      id: 'exhibit-bronze', hallId: 'hall-ancient', code: 'A-08', title: '青铜爵与礼制', order: 8,
      drafts: [
        {
          id: 'draft-bronze-zh', languageId: 'zh', title: '青铜爵与礼制',
          narration: '爵是最早的青铜酒器之一。三足稳定器身，长流便于倾倒，柱饰则与商周礼仪密切相关。',
          accessibility: '器物为青铜色，器口一侧有长流，底部三足支撑。复制件配有可触摸的局部纹样。',
          durationMinutes: 3, sources: '《殷周青铜器通论》；展品说明卡 A-08',
          status: 'returned', updatedAt: '2026-09-23T11:20:00.000Z',
          segments: [
            zhSegment('bronze-zh-1', '器物介绍', '这是一件商代青铜爵，用于温酒和饮酒。'),
            zhSegment('bronze-zh-2', '结构说明', '三足使器身稳定，前端的流便于倾倒。'),
            zhSegment('bronze-zh-3', '礼制背景', '青铜器数量与形制反映了使用者的身份。'),
            zhSegment('bronze-zh-4', '修改说明', '审校意见：补充“柱饰”的用途，并核对年代。')
          ]
        },
        {
          id: 'draft-bronze-en', languageId: 'en', title: 'Bronze Jue and Ritual Order',
          narration: 'The jue was among the earliest bronze drinking vessels. Its tripod base, pouring spout, and posts were closely tied to Shang and Zhou ritual.',
          accessibility: 'The tactile replica includes the long spout, tripod feet, and raised posts.',
          durationMinutes: 2.8, sources: 'A General Survey of Yin-Zhou Bronzes; Gallery label A-08',
          status: 'draft', updatedAt: '2026-09-22T09:00:00.000Z',
          segments: [
            trSegment('bronze-en', 0, 'Object', 'This bronze jue dates to the Shang dynasty.', { masterId: 'bronze-zh-1', reviewState: 'current', masterRev: 1 }),
            trSegment('bronze-en', 1, 'Structure', 'Three legs support the body; the long spout guides the pour.', { masterId: 'bronze-zh-2', reviewState: 'current', masterRev: 1 })
          ]
        }
      ]
    },
    {
      id: 'exhibit-silk', hallId: 'hall-silk', code: 'B-02', title: '织机与丝路纹样', order: 2,
      drafts: [{
        id: 'draft-silk-zh', languageId: 'zh', title: '织机与丝路纹样',
        narration: '织机把一根根丝线组织成布匹，也把不同地区的图案与故事连接在一起。',
        accessibility: '体验区提供放大纹样、凸点经纬结构以及可操作的小型织机模型。',
        durationMinutes: 4, sources: '馆内教育活动资料；丝绸之路纺织史专题',
        status: 'draft', updatedAt: '2026-09-20T03:00:00.000Z',
        segments: [
          zhSegment('silk-zh-1', '序言', '丝绸不只是一种材料，也是交流的媒介。'),
          zhSegment('silk-zh-2', '互动', '请试着推动梭子，观察经纬线如何交会。')
        ]
      }]
    }
  ]
  return {
    schemaVersion: SCHEMA_VERSION,
    halls,
    exhibits,
    versions: [],
    selectedHallId: halls[0].id,
    selectedExhibitId: exhibits[0].id,
    selectedLanguageId: 'zh',
    lastSavedAt: new Date().toISOString()
  }
}

/* ---------- 纯函数：规范化、迁移、对齐计算 ---------- */

/** 给单个展项补齐段落对齐字段（旧数据/恢复版本都会经过这里） */
function normalizeExhibit(exhibit: Exhibit): Exhibit {
  const zh = exhibit.drafts.find(d => d.languageId === 'zh')
  if (!zh) return exhibit
  zh.segments.forEach((seg, i) => {
    if (!seg.id) seg.id = `${exhibit.id}-zh-${i + 1}`
    if (typeof seg.rev !== 'number' || seg.rev < 1) seg.rev = 1
    if (!('masterId' in seg)) seg.masterId = undefined
  })
  const masterIds = new Set(zh.segments.map(s => s.id))
  exhibit.drafts.forEach(draft => {
    if (draft.languageId === 'zh') return
    draft.segments.forEach((seg, i) => {
      if (!seg.id) seg.id = `${draft.id}-seg-${i + 1}`
      if (!('masterId' in seg)) {
        // v1 数据：按段落序号建立基线对位
        const byIndex = zh.segments[i]
        seg.masterId = byIndex ? byIndex.id : null
      }
      if (seg.masterId && !masterIds.has(seg.masterId)) {
        // 锚点在结构上已消失（拆分/合并/删除）：脱离到待接入清单，锁定与内容原样保留
        seg.note = seg.note || '母版段落已拆分、合并或删除，请重新对位'
        seg.masterId = null
      }
      if (!seg.reviewState) seg.reviewState = 'current'
      if (seg.masterId) {
        const master = zh.segments.find(s => s.id === seg.masterId)
        if (typeof seg.masterRev !== 'number') seg.masterRev = master ? master.rev! : 1
      }
    })
  })
  return exhibit
}

/** 依据母版 rev 重算所有未锁定译稿段的复核状态；锁定（已定稿）段落永远不被自动失效 */
function reconcileStaleness(exhibit: Exhibit): Exhibit {
  const zh = exhibit.drafts.find(d => d.languageId === 'zh')
  if (!zh) return exhibit
  exhibit.drafts.forEach(draft => {
    if (draft.languageId === 'zh') return
    draft.segments.forEach(seg => {
      if (seg.locked || !seg.masterId) return
      const master = zh.segments.find(s => s.id === seg.masterId)
      if (!master) {
        seg.masterId = null
        seg.reviewState = 'stale'
        seg.note = seg.note || '母版段落已拆分、合并或删除，请重新对位'
        return
      }
      seg.reviewState = (seg.masterRev ?? master.rev!) >= master.rev! ? 'current' : 'stale'
    })
  })
  return exhibit
}

function draftOf(exhibit: Exhibit | undefined, languageId: string): LanguageDraft | undefined {
  return exhibit?.drafts.find(d => d.languageId === languageId)
}

function buildAlignmentRows(exhibit: Exhibit): AlignmentRow[] {
  const zh = draftOf(exhibit, 'zh')
  if (!zh) return []
  return zh.segments.map(master => ({
    master,
    cells: Object.fromEntries(
      LANGUAGES.filter(l => l.id !== 'zh').map(lang => {
        const draft = draftOf(exhibit, lang.id)
        return [lang.id, draft ? draft.segments.filter(s => s.masterId === master.id) : []]
      })
    ) as Record<string, Segment[]>
  }))
}

function buildInbox(exhibit: Exhibit): InboxGroup[] {
  return LANGUAGES
    .filter(l => l.id !== 'zh')
    .map(lang => ({
      languageId: lang.id,
      segments: draftOf(exhibit, lang.id)?.segments.filter(s => s.masterId == null) || []
    }))
    .filter(group => group.segments.length > 0)
}

/* ---------- 旧译稿导入：先在副本上整体构建，出错即抛 ---------- */

interface ImportedSegment { label: string; content: string }
interface ParsedImport {
  languageId: string
  title?: string
  narration?: string
  accessibility?: string
  durationMinutes?: number
  sources?: string
  status?: ScriptStatus
  segments: ImportedSegment[]
}

function parseLegacy(raw: string): ParsedImport[] {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error('不是合法的 JSON，请检查格式（可使用示例）。')
  }
  const payload = json as { language?: string; languageId?: string; segments?: unknown[]; drafts?: unknown[] }
  const rawDrafts: unknown[] = Array.isArray(payload.drafts)
    ? payload.drafts
    : (typeof payload.language === 'string' || typeof payload.languageId === 'string') && Array.isArray(payload.segments)
      ? [json]
      : []
  if (!rawDrafts.length) throw new Error('缺少 drafts 列表，或顶层缺少 language 与 segments 字段。')
  return rawDrafts.map((item, index) => {
    const d = item as Record<string, unknown>
    const languageId = String(d.languageId ?? d.language ?? '')
    if (languageId === 'zh') throw new Error(`第 ${index + 1} 份是中文稿：母版由内容部门维护，旧稿导入只接收英文/日文。`)
    if (!LANGUAGES.some(l => l.id === languageId)) throw new Error(`第 ${index + 1} 份语言代码无法识别（应为 en 或 ja）。`)
    let segments: ImportedSegment[]
    if (Array.isArray(d.segments) && d.segments.length) {
      segments = (d.segments as unknown[]).map((s, si) => {
        const seg = s as Record<string, unknown>
        const content = String(seg?.content ?? '').trim()
        if (!content) throw new Error(`第 ${index + 1} 份第 ${si + 1} 段内容为空。`)
        return { label: String(seg?.label ?? `段落 ${si + 1}`).trim() || `段落 ${si + 1}`, content }
      })
    } else if (typeof d.narration === 'string' && d.narration.trim()) {
      segments = d.narration.split(/\n{2,}|\r\n\r\n/).map((text, si) => ({ label: `段落 ${si + 1}`, content: text.trim() })).filter(s => s.content)
    } else {
      throw new Error(`第 ${index + 1} 份没有任何段落（segments 为空且无 narration）。`)
    }
    if (!segments.length) throw new Error(`第 ${index + 1} 份没有有效段落。`)
    const status = d.status as ScriptStatus | undefined
    if (status && !['draft', 'review', 'returned', 'approved'].includes(status)) throw new Error(`第 ${index + 1} 份状态值无法识别。`)
    const duration = d.durationMinutes === undefined ? undefined : Number(d.durationMinutes)
    if (duration !== undefined && (!Number.isFinite(duration) || duration < 0)) throw new Error(`第 ${index + 1} 份朗读时长不是非负数字。`)
    return {
      languageId,
      ...(typeof d.title === 'string' && d.title.trim() ? { title: d.title.trim() } : {}),
      ...(typeof d.narration === 'string' && d.narration.trim() ? { narration: d.narration.trim() } : {}),
      ...(typeof d.accessibility === 'string' && d.accessibility.trim() ? { accessibility: d.accessibility.trim() } : {}),
      ...(duration !== undefined ? { durationMinutes: duration } : {}),
      ...(typeof d.sources === 'string' && d.sources.trim() ? { sources: d.sources.trim() } : {}),
      ...(status ? { status } : {}),
      segments
    }
  })
}

export const useScriptStore = defineStore('museum-script', {
  state: () => ({
    schemaVersion: SCHEMA_VERSION as number,
    halls: [] as Hall[],
    exhibits: [] as Exhibit[],
    versions: [] as VersionSnapshot[],
    selectedHallId: '',
    selectedExhibitId: '',
    selectedLanguageId: 'zh',
    lastSavedAt: '',
    hydrated: false,
    past: [] as string[],
    future: [] as string[],
    notice: ''
  }),
  getters: {
    selectedHall(state): Hall | undefined {
      return state.halls.find(hall => hall.id === state.selectedHallId)
    },
    hallExhibits(state): Exhibit[] {
      return state.exhibits.filter(exhibit => exhibit.hallId === state.selectedHallId).sort((a, b) => a.order - b.order)
    },
    selectedExhibit(state): Exhibit | undefined {
      return state.exhibits.find(exhibit => exhibit.id === state.selectedExhibitId)
    },
    selectedDraft(): LanguageDraft | undefined {
      return this.selectedExhibit?.drafts.find(draft => draft.languageId === this.selectedLanguageId)
    },
    masterDraft(): LanguageDraft | undefined {
      return this.selectedExhibit?.drafts.find(d => d.languageId === 'zh')
    },
    alignmentRows(): AlignmentRow[] {
      return this.selectedExhibit ? buildAlignmentRows(this.selectedExhibit) : []
    },
    inboxGroups(): InboxGroup[] {
      return this.selectedExhibit ? buildInbox(this.selectedExhibit) : []
    },
    wordCount(): number {
      return (this.selectedDraft?.narration || '').replace(/\s/g, '').length
    },
    canUndo(state): boolean { return state.past.length > 0 },
    canRedo(state): boolean { return state.future.length > 0 }
  },
  actions: {
    hydrate() {
      if (this.hydrated || typeof localStorage === 'undefined') return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const data = JSON.parse(saved) as PersistedState
          if (!data.halls?.length || !data.exhibits?.length) throw new Error('empty')
          data.exhibits.forEach(exhibit => { normalizeExhibit(exhibit); reconcileStaleness(exhibit) })
          data.versions?.forEach(v => { normalizeExhibit({ id: v.exhibitId, hallId: '', code: '', title: '', order: 0, drafts: [v.draft] } as Exhibit) })
          this.$patch({ ...data, schemaVersion: SCHEMA_VERSION, hydrated: true })
        } catch {
          this.resetDemo()
        }
      } else {
        this.resetDemo()
      }
      this.ensureSelection()
      this.hydrated = true
    },
    resetDemo() {
      this.$patch({ ...demoState(), hydrated: true, past: [], future: [] })
      this.persist()
      this.notice = '示例数据已就绪：英文第 3 段正待复核，英文还有 1 段旧稿在待接入清单。'
    },
    snapshot(): string {
      return JSON.stringify({ halls: this.halls, exhibits: this.exhibits, versions: this.versions })
    },
    commit(mutator: () => void) {
      this.past.push(this.snapshot())
      if (this.past.length > 50) this.past.shift()
      this.future = []
      mutator()
      this.lastSavedAt = new Date().toISOString()
      this.persist()
    },
    persist() {
      if (typeof localStorage === 'undefined') return
      const data: PersistedState = {
        schemaVersion: SCHEMA_VERSION,
        halls: this.halls, exhibits: this.exhibits, versions: this.versions,
        selectedHallId: this.selectedHallId, selectedExhibitId: this.selectedExhibitId,
        selectedLanguageId: this.selectedLanguageId, lastSavedAt: this.lastSavedAt
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
    ensureSelection() {
      if (!this.halls.some(hall => hall.id === this.selectedHallId)) this.selectedHallId = this.halls[0]?.id || ''
      const inHall = this.exhibits.filter(exhibit => exhibit.hallId === this.selectedHallId)
      if (!inHall.some(exhibit => exhibit.id === this.selectedExhibitId)) this.selectedExhibitId = inHall[0]?.id || ''
      const exhibit = this.selectedExhibit
      if (!exhibit?.drafts.some(draft => draft.languageId === this.selectedLanguageId)) this.selectedLanguageId = exhibit?.drafts[0]?.languageId || 'zh'
    },
    selectHall(id: string) {
      this.selectedHallId = id
      const exhibit = this.exhibits.find(item => item.hallId === id)
      this.selectedExhibitId = exhibit?.id || ''
      this.ensureSelection()
      this.persist()
    },
    selectExhibit(id: string) {
      this.selectedExhibitId = id
      this.ensureSelection()
      this.persist()
    },
    selectLanguage(id: string) {
      this.selectedLanguageId = id
      this.persist()
    },
    updateDraft(patch: Partial<Pick<LanguageDraft, 'title' | 'narration' | 'accessibility' | 'durationMinutes' | 'sources'>>) {
      const draft = this.selectedDraft
      if (!draft) return
      this.commit(() => Object.assign(draft, patch, { updatedAt: new Date().toISOString() }))
      this.notice = '改动已自动保存到浏览器。'
    },

    /* ---- 母版段落维护：中文稿是唯一锚点，结构/内容变化会联动译稿 ---- */

    findSegment(exhibitId: string, languageId: string, segmentId: string) {
      const exhibit = this.exhibits.find(e => e.id === exhibitId)
      const draft = exhibit?.drafts.find(d => d.languageId === languageId)
      return { exhibit, draft, segment: draft?.segments.find(s => s.id === segmentId) }
    },
    updateSegment(id: string, patch: Partial<Pick<Segment, 'label' | 'content'>>) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !segment || segment.locked) return
      this.commit(() => {
        const contentChanged = draft.languageId === 'zh' && typeof patch.content === 'string' && patch.content !== segment.content
        Object.assign(segment, patch)
        if (contentChanged) this.invalidateMaster(segment)
      })
    },
    /** 母版段落内容改动：rev +1，未锁定译稿段回到待复核；锁定/已定稿段保留不动 */
    invalidateMaster(master: Segment) {
      master.rev = (master.rev ?? 1) + 1
      const exhibit = this.selectedExhibit
      if (!exhibit) return
      exhibit.drafts.forEach(d => {
        if (d.languageId === 'zh') return
        d.segments.forEach(seg => {
          if (seg.locked || seg.masterId !== master.id) return
          seg.reviewState = 'stale'
        })
      })
      const staleCount = exhibit.drafts
        .filter(d => d.languageId !== 'zh')
        .reduce((n, d) => n + d.segments.filter(s => !s.locked && s.masterId === master.id && s.reviewState === 'stale').length, 0)
      const keptCount = exhibit.drafts
        .filter(d => d.languageId !== 'zh')
        .reduce((n, d) => n + d.segments.filter(s => s.locked && s.masterId === master.id).length, 0)
      this.notice = `母版段落已更新：${staleCount} 段译稿回到待复核` + (keptCount ? `，${keptCount} 段已定稿锁定、照旧保留` : '') + '。'
    },
    toggleLock(languageId?: string, id?: string) {
      const lang = languageId ?? this.selectedLanguageId
      const segment = this.selectedExhibit?.drafts.find(d => d.languageId === lang)?.segments.find(item => item.id === (id ?? ''))
      if (!segment) return
      this.commit(() => { segment.locked = !segment.locked })
      this.notice = segment.locked ? '段落已锁定，母版改动不会使其失效。' : '段落已解锁。'
    },
    addSegment() {
      const draft = this.selectedDraft
      if (!draft) return
      this.commit(() => {
        if (draft.languageId === 'zh') {
          draft.segments.push({ id: uid('seg-zh'), label: `新母版段 ${draft.segments.length + 1}`, content: '', locked: false, rev: 1 })
        } else {
          // 直接新增的译稿段没有母版锚点，先进待接入清单，避免静对错位
          draft.segments.push({ id: uid('seg-tr'), label: `新段落 ${draft.segments.length + 1}`, content: '', locked: false, masterId: null, reviewState: 'stale', note: '新增译稿尚未对位母版' })
        }
      })
    },
    removeSegment(languageId?: string, id?: string) {
      const lang = languageId ?? this.selectedLanguageId
      const draft = this.selectedExhibit?.drafts.find(d => d.languageId === lang)
      const segment = draft?.segments.find(item => item.id === (id ?? ''))
      if (!draft || !segment || segment.locked) return
      this.commit(() => {
        if (lang === 'zh') this.detachChildren(segment.id, '母版段落已删除，请重新对位')
        draft.segments = draft.segments.filter(item => item.id !== segment.id)
      })
      this.notice = lang === 'zh' ? '母版段落已删除，相关译稿段保留在待接入清单。' : '译稿段落已删除。'
    },
    /** 译稿段脱离母版锚点：未锁定的进清单待复核；锁定段内容、锁和复核结论一并保留 */
    detachChildren(masterId: string, note: string) {
      const exhibit = this.selectedExhibit
      if (!exhibit) return
      exhibit.drafts.forEach(d => {
        if (d.languageId === 'zh') return
        d.segments.forEach(seg => {
          if (seg.masterId !== masterId) return
          seg.masterId = null
          if (!seg.locked) seg.reviewState = 'stale'
          seg.note = note
        })
      })
    },
    splitSegment(id: string, firstText: string, secondText: string): boolean {
      const zh = this.masterDraft
      const master = zh?.segments.find(s => s.id === id)
      if (!zh || !master || master.locked) return false
      const a = firstText.trim()
      const b = secondText.trim()
      if (!a || !b) { this.notice = '拆分后的两段都需要内容。'; return false }
      this.commit(() => {
        const index = zh.segments.findIndex(s => s.id === id)
        const label = master.label
        const segA: Segment = { id: uid('seg-zh'), label: `${label}（上）`, content: a, locked: false, rev: 1 }
        const segB: Segment = { id: uid('seg-zh'), label: `${label}（下）`, content: b, locked: false, rev: 1 }
        zh.segments.splice(index, 1, segA, segB)
        this.detachChildren(id, '母版段落已拆分，请重新对位（定稿段已保留）')
      })
      this.notice = '母版段落已拆为两段；原译稿段保留内容进入待接入清单，可重新对位。'
      return true
    },
    mergeSegments(ids: string[]) {
      const zh = this.masterDraft
      if (!zh || ids.length < 2) { this.notice = '请至少勾选两段母版再合并。'; return }
      const picked = ids.map(id => zh.segments.find(s => s.id === id)).filter(Boolean) as Segment[]
      if (picked.some(s => s.locked)) { this.notice = '勾选段落中包含锁定段，请先解锁。'; return }
      this.commit(() => {
        const firstIndex = zh.segments.findIndex(s => s.id === picked[0].id)
        const idsToRemove = new Set(picked.slice(1).map(s => s.id))
        const merged: Segment = {
          id: uid('seg-zh'),
          label: `${picked[0].label}（合并）`,
          content: picked.map(s => s.content.trim()).filter(Boolean).join('\n'),
          locked: false,
          rev: 1,
          note: '由多段母版合并'
        }
        picked.forEach(s => this.detachChildren(s.id, '母版段落已合并，请重新对位（定稿段已保留）'))
        zh.segments = zh.segments.filter(s => !idsToRemove.has(s.id) && s.id !== picked[0].id)
        zh.segments.splice(firstIndex, 0, merged)
      })
      this.notice = '母版段落已合并；原译稿段保留内容进入待接入清单，可重新对位。'
    },

    /* ---- 翻译岗位：复核与对位 ---- */

    markReviewed(languageId: string, id: string) {
      const segment = this.selectedExhibit?.drafts.find(d => d.languageId === languageId)?.segments.find(s => s.id === id)
      if (!segment || !segment.masterId) return
      const master = this.masterDraft?.segments.find(s => s.id === segment.masterId)
      this.commit(() => {
        segment.reviewState = 'current'
        segment.masterRev = master?.rev ?? segment.masterRev
        segment.note = segment.origin ? '旧译稿已按当前母版复核对位' : undefined
      })
      this.notice = '该段已按当前母版复核，状态转为已对位。'
    },
    attachSegment(languageId: string, id: string, masterId: string) {
      if (!masterId) return
      const draft = this.selectedExhibit?.drafts.find(d => d.languageId === languageId)
      const segment = draft?.segments.find(s => s.id === id)
      if (!segment) return
      const master = this.masterDraft?.segments.find(s => s.id === masterId)
      this.commit(() => {
        segment.masterId = masterId
        // 新对位一律先待复核，以当前母版 rev 为基线；锁定段不强制改状态
        segment.reviewState = segment.locked ? segment.reviewState : 'stale'
        segment.masterRev = master ? master.rev! - 1 : segment.masterRev
        segment.note = segment.origin ? '旧译稿已对位母版，待逐段复核' : '已对位母版，待复核'
      })
      this.notice = `“${segment.label}”已对到母版段“${master?.label ?? ''}”，状态为待复核。`
    },
    detachSegment(languageId: string, id: string) {
      const segment = this.selectedExhibit?.drafts.find(d => d.languageId === languageId)?.segments.find(s => s.id === id)
      if (!segment) return
      this.commit(() => {
        segment.masterId = null
        if (!segment.locked) segment.reviewState = 'stale'
        segment.note = '手动移回待接入清单'
      })
      this.notice = '已移回待接入清单。'
    },
    /** 在某个母版格内起稿：缺语言文稿时创建该语言文稿，但不写标题等任何已有字段 */
    startTranslation(languageId: string, masterId: string) {
      const exhibit = this.selectedExhibit
      const master = this.masterDraft?.segments.find(s => s.id === masterId)
      if (!exhibit || !master) return
      this.commit(() => {
        let draft = exhibit.drafts.find(d => d.languageId === languageId)
        if (!draft) {
          draft = {
            id: uid('draft'), languageId, title: '', narration: '', accessibility: '',
            durationMinutes: 0, sources: '', status: 'draft',
            segments: [], updatedAt: new Date().toISOString()
          }
          exhibit.drafts.push(draft)
        }
        draft.segments.push({
          id: uid('seg-tr'), label: `${master.label} 译稿`, content: '', locked: false,
          masterId, reviewState: 'stale', masterRev: Math.max(0, (master.rev ?? 1) - 1)
        })
        draft.updatedAt = new Date().toISOString()
      })
      this.selectedLanguageId = languageId
      this.notice = '已在该母版段下建立译稿段落，请填写译文后标记复核。'
    },

    /* ---- 旧译稿批量接入：整份校验，失败回滚到接入前 ---- */

    importLegacy(raw: string): { ok: boolean; message: string } {
      let parsed: ParsedImport[]
      try {
        parsed = parseLegacy(raw)
      } catch (error) {
        // 接入失败：不触碰现有数据，也不占用撤销栈
        return { ok: false, message: (error as Error).message }
      }
      const exhibit = this.selectedExhibit
      const zh = exhibit?.drafts.find(d => d.languageId === 'zh')
      if (!exhibit || !zh) return { ok: false, message: '当前展项没有中文母版，无法对位，请先由内容部门建立母版。' }

      // 深拷贝当前状态构建目标版本；构建过程中任何异常都直接抛出，当前状态不变
      let candidate: Exhibit
      const alignedByLang: Record<string, boolean> = {}
      try {
        candidate = JSON.parse(JSON.stringify(exhibit)) as Exhibit
        normalizeExhibit(candidate)
        for (const incoming of parsed) {
          let draft = candidate.drafts.find(d => d.languageId === incoming.languageId)
          const created = !draft
          if (!draft) {
            draft = {
              id: uid('draft'), languageId: incoming.languageId, title: '', narration: '', accessibility: '',
              durationMinutes: 0, sources: '', status: 'draft', segments: [], updatedAt: new Date().toISOString()
            }
            candidate.drafts.push(draft)
          }
          // 只填充原本为空的字段，已有标题/来源等一律不覆盖
          if (incoming.title && !draft.title) draft.title = incoming.title
          if (incoming.narration && !draft.narration) draft.narration = incoming.narration
          if (incoming.accessibility && !draft.accessibility) draft.accessibility = incoming.accessibility
          if (incoming.sources && !draft.sources) draft.sources = incoming.sources
          if (incoming.durationMinutes !== undefined && !draft.durationMinutes) draft.durationMinutes = incoming.durationMinutes
          if (incoming.status && created) draft.status = incoming.status

          // 仅当该语言每个母版格都为空且段数一致时自动对位；否则全部进待接入清单
          const everyCellEmpty = zh.segments.every(m => !draft!.segments.some(s => s.masterId === m.id))
          const autoAlign = everyCellEmpty && incoming.segments.length === zh.segments.length
          alignedByLang[incoming.languageId] = autoAlign
          incoming.segments.forEach((seg, i) => {
            const masterId = autoAlign ? zh.segments[i].id : null
            draft!.segments.push({
              id: uid('seg-import'),
              label: seg.label,
              content: seg.content,
              locked: false,
              masterId,
              reviewState: 'stale',
              masterRev: masterId ? Math.max(0, zh.segments[i].rev! - 1) : undefined,
              origin: ORIGIN_LEGACY,
              note: autoAlign ? '旧译稿已按段自动对位，待逐段复核' : '旧译稿未能与母版段数对应，保留在待接入清单，请手动对位'
            })
          })
          draft.updatedAt = new Date().toISOString()
        }
        // 构建完成后再做一次一致性校验
        normalizeExhibit(candidate)
        reconcileStaleness(candidate)
      } catch (error) {
        return { ok: false, message: `接入处理中断：${(error as Error).message}；已回滚到接入前版本，现有译稿未改动。` }
      }

      const summary: string[] = []
      this.commit(() => {
        const index = this.exhibits.findIndex(e => e.id === exhibit.id)
        this.exhibits[index] = candidate
      })
      for (const incoming of parsed) {
        const lang = LANGUAGES.find(l => l.id === incoming.languageId)?.label ?? incoming.languageId
        const aligned = alignedByLang[incoming.languageId]
        summary.push(`${lang} ${incoming.segments.length} 段${aligned ? '已按段自动对位（待复核）' : '已收入待接入清单（未覆盖现有文稿）'}`)
      }
      this.notice = `旧译稿接入完成：${summary.join('；')}。`
      return { ok: true, message: this.notice }
    },

    setStatus(status: ScriptStatus) {
      const draft = this.selectedDraft
      if (!draft) return
      this.commit(() => { draft.status = status; draft.updatedAt = new Date().toISOString() })
      this.notice = `状态已更新为“${this.statusLabel(status)}”。`
    },
    statusLabel(status: ScriptStatus) {
      return ({ draft: '草稿', review: '待审', returned: '退回', approved: '已定稿' })[status]
    },
    createVersion(name?: string) {
      const draft = this.selectedDraft
      if (!draft) return
      const version: VersionSnapshot = {
        id: `version-${Date.now()}`,
        exhibitId: this.selectedExhibitId,
        languageId: this.selectedLanguageId,
        name: name || `${new Date().toLocaleString('zh-CN', { hour12: false })} 快照`,
        createdAt: new Date().toISOString(),
        draft: JSON.parse(JSON.stringify(draft))
      }
      this.commit(() => this.versions.unshift(version))
      this.notice = '已保存当前版本，可在版本页比较或恢复。'
    },
    restoreVersion(id: string) {
      const version = this.versions.find(item => item.id === id)
      if (!version) return
      this.commit(() => {
        const exhibit = this.exhibits.find(item => item.id === version.exhibitId)
        if (!exhibit) return
        const restored = JSON.parse(JSON.stringify(version.draft)) as LanguageDraft
        const index = exhibit.drafts.findIndex(item => item.languageId === version.languageId)
        if (index >= 0) exhibit.drafts[index] = restored
        else exhibit.drafts.push(restored)
        normalizeExhibit(exhibit)
        reconcileStaleness(exhibit)
      })
      this.selectedExhibitId = version.exhibitId
      this.selectedLanguageId = version.languageId
      this.notice = '版本已恢复，并按当前母版重新计算对位复核状态。'
    },
    undo() {
      const state = this.past.pop()
      if (!state) return
      this.future.push(this.snapshot())
      this.$patch(JSON.parse(state))
      this.exhibits.forEach(exhibit => { normalizeExhibit(exhibit); reconcileStaleness(exhibit) })
      this.lastSavedAt = new Date().toISOString()
      this.ensureSelection()
      this.persist()
      this.notice = '已撤销上一步。'
    },
    redo() {
      const state = this.future.pop()
      if (!state) return
      this.past.push(this.snapshot())
      this.$patch(JSON.parse(state))
      this.exhibits.forEach(exhibit => { normalizeExhibit(exhibit); reconcileStaleness(exhibit) })
      this.lastSavedAt = new Date().toISOString()
      this.ensureSelection()
      this.persist()
      this.notice = '已重做。'
    },
    completionFor(exhibit: Exhibit, languageId: string): number {
      const draft = exhibit.drafts.find(item => item.languageId === languageId)
      if (!draft) return 0
      const checks = [draft.title, draft.narration, draft.accessibility, draft.sources, draft.segments.length > 0 ? 'segments' : '']
      return Math.round(checks.filter(Boolean).length / checks.length * 100)
    },
    staleCountFor(exhibit: Exhibit, languageId: string): number {
      const draft = exhibit.drafts.find(d => d.languageId === languageId)
      if (!draft) return 0
      return draft.segments.filter(s => s.reviewState === 'stale').length
    }
  }
})

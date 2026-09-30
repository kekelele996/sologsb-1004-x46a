import { defineStore } from 'pinia'
import type { Exhibit, Hall, Language, LanguageDraft, PersistedState, ScriptStatus, Segment, VersionSnapshot } from '~/types'

export const LANGUAGES: Language[] = [
  { id: 'zh', code: 'zh-CN', label: '简体中文', shortLabel: '中' },
  { id: 'en', code: 'en-US', label: 'English', shortLabel: 'EN' },
  { id: 'ja', code: 'ja-JP', label: '日本語', shortLabel: '日' }
]

const STORAGE_KEY = 'museum-script-studio-v1'

const segments = (prefix: string, values: Array<[string, string, boolean?, string?]>): Segment[] => values.map(([label, content, locked, sourceSegmentId], index) => ({
  id: `${prefix}-${index + 1}`,
  label,
  content,
  locked: Boolean(locked),
  ...(sourceSegmentId ? { sourceSegmentId } : {})
}))

const cloneSegments = (items: Segment[]): Segment[] => JSON.parse(JSON.stringify(items))

/** 把粘贴的旧译稿拆成段落：空行分段优先，只有一块时退化为按行分段 */
export function parseImportBlocks(text: string): string[] {
  let blocks = text.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean)
  if (blocks.length <= 1) blocks = text.split('\n').map(item => item.trim()).filter(Boolean)
  return blocks
}

/** 在靠近中点的句子边界处把内容切成两段，用于母版段落拆分 */
function splitContentAtSentence(content: string): [string, string] {
  if (!content) return ['', '']
  const mid = content.length / 2
  const sentenceEnd = /[。！？.!?]\s*/g
  let best = -1
  let bestDist = Infinity
  let match: RegExpExecArray | null
  while ((match = sentenceEnd.exec(content))) {
    const at = match.index + match[0].length
    const dist = Math.abs(at - mid)
    if (dist < bestDist) { bestDist = dist; best = at }
  }
  if (best <= 0 || best >= content.length) {
    const newlineAt = content.indexOf('\n', mid)
    best = newlineAt > 0 ? newlineAt : Math.round(mid)
  }
  return [content.slice(0, best).trim(), content.slice(best).trim()]
}

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
          status: 'approved', updatedAt: '2026-09-23T08:35:00.000Z',
          segments: segments('jade-zh', [
            ['开场定位', '这件玉琮来自距今约五千年的良渚文化。', true],
            ['器物观察', '它外方内圆，四角雕刻神人兽面纹。', true],
            ['文化含义', '玉琮常被看作沟通天地的礼器，也象征权力与身份。'],
            ['参观提示', '请沿展柜顺时针观察，触摸复制品前先使用免洗消毒液。']
          ])
        },
        {
          id: 'draft-jade-en', languageId: 'en', title: 'Jade Cong: A Ritual Object Between Heaven and Earth',
          narration: 'This jade cong was made by the Liangzhu culture. Its square exterior and circular bore embody an early Chinese vision of the cosmos.',
          accessibility: 'The object is dark green. A tactile model shows four corners, carved faces, and a central circular opening.',
          durationMinutes: 2.3, sources: 'Complete Collection of Chinese Jades, Vol. 1; Museum accession 1987-J-042',
          status: 'review', updatedAt: '2026-09-24T02:15:00.000Z',
          segments: segments('jade-en', [
            ['Introduction', 'This jade cong is about five thousand years old.', true, 'jade-zh-1'],
            ['Visual description', 'Its square body encloses a circular opening, while spirit-and-animal motifs cover the corners.', false, 'jade-zh-2'],
            ['Meaning', 'Jade cong is understood as a ritual link between heaven and earth.', false, 'jade-zh-3']
          ]),
          pendingSegments: [
            { id: 'jade-en-pending-1', label: '待匹配 1', locked: false, content: 'The museum is open daily from 9:00 to 17:00; last admission is at 16:30. Closed on Mondays.' }
          ]
        },
        {
          id: 'draft-jade-ja', languageId: 'ja', title: '玉琮：天と地を結ぶ礼器',
          narration: 'こちらは良渚文化の玉琮です。外側は方形、中央は円形で、四隅には神人獣面文が刻まれています。',
          accessibility: '暗い青緑色の玉製です。複製模型では四つの角と中央の円孔を触って確認できます。',
          durationMinutes: 2.6, sources: '『中国玉器全集』第一巻；収蔵資料 1987-J-042',
          status: 'draft', updatedAt: '2026-09-21T06:10:00.000Z',
          segments: segments('jade-ja', [
            ['導入', '約五千年前の良渚文化を代表する玉琮です。', false, 'jade-zh-1'],
            ['観察', '外側は方形、中央は円形で、四隅に精緻な文様があります。', false, 'jade-zh-2'],
            ['意味', '天地を結ぶ礼器として、力と身分を象徴しました。', false, 'jade-zh-3']
          ])
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
          segments: segments('bronze-zh', [
            ['器物介绍', '这是一件商代青铜爵，用于温酒和饮酒。'],
            ['结构说明', '三足使器身稳定，前端的流便于倾倒。'],
            ['礼制背景', '青铜器数量与形制反映了使用者的身份。'],
            ['修改说明', '审校意见：补充“柱饰”的用途，并核对年代。']
          ])
        },
        {
          id: 'draft-bronze-en', languageId: 'en', title: 'Bronze Jue and Ritual Order',
          narration: 'The jue was among the earliest bronze drinking vessels. Its tripod base, pouring spout, and posts were closely tied to Shang and Zhou ritual.',
          accessibility: 'The tactile replica includes the long spout, tripod feet, and raised posts.',
          durationMinutes: 2.8, sources: 'A General Survey of Yin-Zhou Bronzes; Gallery label A-08',
          status: 'draft', updatedAt: '2026-09-22T09:00:00.000Z',
          segments: segments('bronze-en', [['Object', 'This bronze jue dates to the Shang dynasty.', false, 'bronze-zh-1'], ['Structure', 'Three legs support the body; the long spout guides the pour.', false, 'bronze-zh-2']])
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
        segments: segments('silk-zh', [['序言', '丝绸不只是一种材料，也是交流的媒介。'], ['互动', '请试着推动梭子，观察经纬线如何交会。']])
      }]
    }
  ]
  return {
    halls,
    exhibits,
    versions: [],
    selectedHallId: halls[0].id,
    selectedExhibitId: exhibits[0].id,
    selectedLanguageId: 'zh',
    lastSavedAt: new Date().toISOString()
  }
}

export const useScriptStore = defineStore('museum-script', {
  state: () => ({
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
    /** 当前展项的中文母版草稿 */
    masterDraft(): LanguageDraft | undefined {
      return this.selectedExhibit?.drafts.find(draft => draft.languageId === 'zh')
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
          this.$patch({ ...data, hydrated: true })
          if (!this.halls.length || !this.exhibits.length) this.resetDemo()
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
      this.notice = '示例数据已就绪，可直接开始编辑。'
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
    updateSegment(id: string, patch: Partial<Pick<Segment, 'label' | 'content'>>) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !segment || segment.locked) return
      const before = draft.languageId === 'zh' ? cloneSegments(draft.segments) : null
      this.commit(() => {
        Object.assign(segment, patch)
        // 译稿段落被重新编辑，说明已复核，失效标记清除
        if (segment.stale && patch.content !== undefined) segment.stale = false
        if (before) this.propagateMasterChange(before, draft.segments)
      })
    },
    toggleLock(id: string) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !segment) return
      this.commit(() => {
        if (segment.locked) {
          segment.locked = false
          // 锁定期间母版已变更：解锁后该段进入待复核
          if (segment.sourceUpdated) { segment.stale = true; segment.sourceUpdated = false }
        } else {
          segment.locked = true
          segment.stale = false
          segment.sourceUpdated = false
        }
      })
      this.notice = segment.locked ? '段落已锁定，避免误改；母版再改也会保留原文。' : '段落已解锁。'
    },
    addSegment() {
      const draft = this.selectedDraft
      if (!draft) return
      const before = draft.languageId === 'zh' ? cloneSegments(draft.segments) : null
      this.commit(() => {
        draft.segments.push({ id: `segment-${Date.now()}`, label: `新段落 ${draft.segments.length + 1}`, content: '', locked: false })
        if (before) this.propagateMasterChange(before, draft.segments)
      })
    },
    removeSegment(id: string) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !segment || segment.locked) return
      const before = draft.languageId === 'zh' ? cloneSegments(draft.segments) : null
      this.commit(() => {
        draft.segments = draft.segments.filter(item => item.id !== id)
        if (before) this.propagateMasterChange(before, draft.segments)
      })
    },
    /** 把母版（或任意语言）段落从句子中点拆成两段；母版拆分后，受影响译稿段落失效待复核 */
    splitSegment(id: string) {
      const draft = this.selectedDraft
      const index = draft?.segments.findIndex(item => item.id === id) ?? -1
      if (!draft || index < 0) return
      const segment = draft.segments[index]
      if (!segment || segment.locked) return
      const before = draft.languageId === 'zh' ? cloneSegments(draft.segments) : null
      this.commit(() => {
        const [first, second] = splitContentAtSentence(segment.content)
        segment.content = first
        draft.segments.splice(index + 1, 0, {
          id: `segment-${Date.now()}`,
          label: `${segment.label}（续）`,
          content: second,
          locked: false,
          ...(segment.sourceSegmentId ? { sourceSegmentId: segment.sourceSegmentId } : {})
        })
        if (before) this.propagateMasterChange(before, draft.segments)
      })
      this.notice = '段落已拆分；母版拆分后，其他语言受影响段落已回到待复核。'
    },
    /** 与下一段合并；母版合并后，受影响译稿段落失效待复核 */
    mergeSegment(id: string) {
      const draft = this.selectedDraft
      const index = draft?.segments.findIndex(item => item.id === id) ?? -1
      if (!draft || index < 0) return
      const segment = draft.segments[index]
      const next = draft.segments[index + 1]
      if (!segment || !next || segment.locked || next.locked) return
      const before = draft.languageId === 'zh' ? cloneSegments(draft.segments) : null
      this.commit(() => {
        segment.content = `${segment.content}${segment.content && next.content ? '\n' : ''}${next.content}`
        draft.segments.splice(index + 1, 1)
        if (before) this.propagateMasterChange(before, draft.segments)
      })
      this.notice = '段落已合并；母版合并后，其他语言受影响段落已回到待复核。'
    },
    /**
     * 中文母版段落变更后，把影响传播给其他语言：
     * 对齐到受影响母版段落的译稿段落，未锁定的标记 stale（待复核）；
     * 已定稿锁定的段落原文保留，仅记 sourceUpdated；出现失效段落时文稿退回待审。
     */
    propagateMasterChange(before: Segment[], after: Segment[]) {
      const afterMap = new Map(after.map(item => [item.id, item]))
      const affected = new Set<string>()
      for (const oldSeg of before) {
        const newSeg = afterMap.get(oldSeg.id)
        if (!newSeg) affected.add(oldSeg.id)
        else if (newSeg.label !== oldSeg.label || newSeg.content !== oldSeg.content) affected.add(oldSeg.id)
      }
      if (!affected.size) return
      const exhibit = this.selectedExhibit
      if (!exhibit) return
      for (const draft of exhibit.drafts) {
        if (draft.languageId === 'zh') continue
        let staleAdded = false
        for (const seg of draft.segments) {
          if (!seg.sourceSegmentId || !affected.has(seg.sourceSegmentId)) continue
          if (seg.locked) {
            // 已定稿锁定：原文照旧保留，仅提示母版已更新
            if (!seg.sourceUpdated) seg.sourceUpdated = true
          } else if (!seg.stale) {
            seg.stale = true
            staleAdded = true
          }
        }
        if (staleAdded && draft.status === 'approved') draft.status = 'review'
      }
    },
    /** 接旧译稿：按段落顺序对齐中文母版；接不上的按语言留存；不覆盖任何现有译文；失败整体回滚 */
    importTranslations(languageId: string, text: string): boolean {
      const exhibit = this.selectedExhibit
      if (!exhibit) return false
      if (languageId === 'zh') {
        this.notice = '中文母版直接维护即可，无需接稿。'
        return false
      }
      const master = exhibit.drafts.find(item => item.languageId === 'zh')
      if (!master || !master.segments.length) {
        this.notice = '请先在中文母版中建立段落，再按段落接稿。'
        return false
      }
      const blocks = parseImportBlocks(text)
      if (!blocks.length) {
        this.notice = '没有识别到可导入的段落：每段一行，或空行分段后再试。'
        return false
      }
      const before = this.snapshot()
      try {
        let draft = exhibit.drafts.find(item => item.languageId === languageId)
        let created = false
        if (!draft) {
          created = true
          draft = {
            id: `draft-${exhibit.id}-${languageId}`,
            languageId,
            title: '',
            narration: '',
            accessibility: '',
            durationMinutes: 0,
            sources: '',
            status: 'draft',
            segments: [],
            pendingSegments: [],
            updatedAt: new Date().toISOString()
          }
        }
        const existingSources = new Set(
          draft.segments.map(item => item.sourceSegmentId).filter((item): item is string => Boolean(item))
        )
        const newSegments: Segment[] = []
        const pending: Segment[] = []
        blocks.forEach((content, index) => {
          const source = master.segments[index]
          if (source && !existingSources.has(source.id)) {
            newSegments.push({
              id: `segment-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
              label: `段落 ${index + 1}`,
              content,
              locked: false,
              sourceSegmentId: source.id,
              stale: true
            })
          } else {
            pending.push({
              id: `pending-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
              label: source ? `已有译文·待匹配 ${index + 1}` : `待匹配 ${index + 1}`,
              content,
              locked: false
            })
          }
        })
        this.commit(() => {
          draft!.segments.push(...newSegments)
          draft!.pendingSegments = [...(draft!.pendingSegments || []), ...pending]
          if (created) exhibit.drafts.push(draft!)
          draft!.updatedAt = new Date().toISOString()
        })
        const langName = languageId === 'en' ? '英文' : '日文'
        this.notice = `接稿完成：${newSegments.length} 段已对齐母版并标记待复核，${pending.length} 段接不上已按${langName}留存，未覆盖任何现有译文。`
        return true
      } catch {
        this.$patch(JSON.parse(before))
        this.lastSavedAt = new Date().toISOString()
        this.persist()
        this.notice = '接稿失败，已回滚到导入前版本，没有覆盖任何稿件。'
        return false
      }
    },
    /** 待匹配段落手动对齐到母版段落（已有译文的母版段落不覆盖） */
    alignPending(pendingId: string, masterSegmentId: string) {
      const draft = this.selectedDraft
      const pending = draft?.pendingSegments?.find(item => item.id === pendingId)
      if (!draft || !pending) return
      if (draft.segments.some(item => item.sourceSegmentId === masterSegmentId)) {
        this.notice = '该母版段落已有译文，未覆盖；请改选其他母版段落。'
        return
      }
      this.commit(() => {
        draft.pendingSegments = (draft.pendingSegments || []).filter(item => item.id !== pendingId)
        draft.segments.push({
          ...pending,
          id: `segment-${Date.now()}`,
          sourceSegmentId: masterSegmentId,
          stale: true
        })
      })
      this.notice = '已对齐到母版段落，状态为待复核。'
    },
    removePending(pendingId: string) {
      const draft = this.selectedDraft
      if (!draft) return
      this.commit(() => {
        draft.pendingSegments = (draft.pendingSegments || []).filter(item => item.id !== pendingId)
      })
    },
    /** 译稿段落重新对齐到母版段落（母版拆分/合并后） */
    realignSegment(segmentId: string, masterSegmentId: string) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === segmentId)
      if (!draft || !segment || segment.locked) return
      if (draft.segments.some(item => item.id !== segmentId && item.sourceSegmentId === masterSegmentId)) {
        this.notice = '该母版段落已有其他译文，未覆盖。'
        return
      }
      this.commit(() => {
        segment.sourceSegmentId = masterSegmentId
        segment.stale = false
        segment.sourceUpdated = false
      })
      this.notice = '已重新对齐母版段落。'
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
        const index = exhibit.drafts.findIndex(item => item.languageId === version.languageId)
        const restored = JSON.parse(JSON.stringify(version.draft)) as LanguageDraft
        if (index >= 0) exhibit.drafts[index] = restored
        else exhibit.drafts.push(restored)
      })
      this.selectedExhibitId = version.exhibitId
      this.selectedLanguageId = version.languageId
      this.notice = '版本已恢复，并作为一次可撤销操作保存。'
    },
    undo() {
      const state = this.past.pop()
      if (!state) return
      this.future.push(this.snapshot())
      this.$patch(JSON.parse(state))
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
    }
  }
})

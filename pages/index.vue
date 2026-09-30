<script setup lang="ts">
import type { DeviceKind, DiffLine, LanguageDraft, ScriptStatus, Segment } from '~/types'
import { LANGUAGES, useScriptStore } from '~/stores/script'

const store = useScriptStore()
const activeTab = ref('align')
const device = ref<DeviceKind>('desktop')
const versionDialog = ref(false)
const versionName = ref('')
const leftFilter = ref('')
const compareA = ref('')
const compareB = ref('')
const helpDialog = ref(false)
const deleteTarget = ref<{ languageId: string; id: string } | null>(null)

// 母版拆分 / 合并
const splitDialog = ref(false)
const splitTarget = ref('')
const splitA = ref('')
const splitB = ref('')
const mergeIds = ref<string[]>([])

// 旧译稿接入
const importDialog = ref(false)
const importText = ref('')
const importError = ref('')

// 手动对位
const attachDialog = ref(false)
const attachTarget = ref<{ languageId: string; id: string } | null>(null)
const attachMasterId = ref('')

const statusOptions: Array<{ value: ScriptStatus; label: string; color: string }> = [
  { value: 'draft', label: '草稿', color: 'grey' },
  { value: 'review', label: '待审', color: 'warning' },
  { value: 'returned', label: '退回', color: 'error' },
  { value: 'approved', label: '已定稿', color: 'success' }
]
const deviceOptions: Array<{ value: DeviceKind; label: string }> = [
  { value: 'desktop', label: '桌面大屏' },
  { value: 'tablet', label: '平板导览' },
  { value: 'mobile', label: '手机导览' },
  { value: 'kiosk', label: '馆内触摸屏' }
]
const translatedLanguages = LANGUAGES.filter(item => item.id !== 'zh')

const IMPORT_SAMPLE = JSON.stringify({
  drafts: [
    {
      language: 'ja',
      title: '織機とシルクロードの文様',
      segments: [
        { label: '序章', content: 'シルクは素材であるだけでなく、人々を結ぶ交流の媒体でもあります。' },
        { label: '体験', content: '梭を動かして、たて糸とよこ糸がどのように交わるかをご覧ください。' }
      ]
    }
  ]
}, null, 2)

const draft = computed(() => store.selectedDraft)
const exhibit = computed(() => store.selectedExhibit)
const currentLanguage = computed(() => LANGUAGES.find(item => item.id === store.selectedLanguageId))
const currentStatus = computed(() => statusOptions.find(item => item.value === draft.value?.status) || statusOptions[0])
const filteredExhibits = computed(() => store.hallExhibits.filter(item => !leftFilter.value || `${item.code} ${item.title}`.toLowerCase().includes(leftFilter.value.toLowerCase())))
const versions = computed(() => store.versions.filter(item => item.exhibitId === store.selectedExhibitId && item.languageId === store.selectedLanguageId))
const selectedVersionA = computed(() => versions.value.find(item => item.id === compareA.value))
const selectedVersionB = computed(() => versions.value.find(item => item.id === compareB.value))
const diffLines = computed<DiffLine[]>(() => {
  const before = selectedVersionA.value?.draft.narration || ''
  const after = selectedVersionB.value?.draft.narration || ''
  return buildDiff(before, after)
})
const staleTotal = computed(() => exhibit.value ? translatedLanguages.reduce((n, lang) => n + store.staleCountFor(exhibit.value!, lang.id), 0) : 0)
const inboxTotal = computed(() => store.inboxGroups.reduce((n, group) => n + group.segments.length, 0))
const attachItems = computed(() => store.alignmentRows.map((row, index) => ({
  value: row.master.id,
  title: `母版 ${index + 1} · ${row.master.label || '未命名段落'}`,
  subtitle: row.master.content.slice(0, 40)
})))

onMounted(() => {
  store.hydrate()
  syncCompareSelection()
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
watch(versions, syncCompareSelection)
watch(() => store.selectedExhibitId, () => { mergeIds.value = [] })

function syncCompareSelection() {
  if (!versions.value.some(item => item.id === compareA.value)) compareA.value = versions.value[1]?.id || versions.value[0]?.id || ''
  if (!versions.value.some(item => item.id === compareB.value)) compareB.value = versions.value[0]?.id || ''
}
function handleKeydown(event: KeyboardEvent) {
  const modifier = event.metaKey || event.ctrlKey
  if (!modifier) return
  if (event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? store.redo() : store.undo()
  }
  if (event.key.toLowerCase() === 'y') {
    event.preventDefault()
    store.redo()
  }
  if (event.key.toLowerCase() === 's') {
    event.preventDefault()
    store.createVersion('键盘快捷保存')
  }
}
function saveDraftField(field: 'title' | 'narration' | 'accessibility' | 'durationMinutes' | 'sources', event: Event) {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value
  store.updateDraft({ [field]: field === 'durationMinutes' ? Number(value) : value } as Partial<LanguageDraft>)
}
function saveSegment(id: string, field: 'label' | 'content', event: Event) {
  store.updateSegment(id, { [field]: (event.target as HTMLInputElement | HTMLTextAreaElement).value })
}
function submitVersion() {
  store.createVersion(versionName.value.trim() || undefined)
  versionName.value = ''
  versionDialog.value = false
}
function confirmDelete() {
  if (deleteTarget.value) store.removeSegment(deleteTarget.value.languageId, deleteTarget.value.id)
  deleteTarget.value = null
}
function buildDiff(before: string, after: string): DiffLine[] {
  const a = before.split(/(?<=[。！？.!?])\s*/).filter(Boolean)
  const b = after.split(/(?<=[。！？.!?])\s*/).filter(Boolean)
  const rows = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1])
  }
  const result: DiffLine[] = []
  let i = 0, j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { result.push({ type: 'same', text: a[i] }); i++; j++ }
    else if (rows[i + 1][j] >= rows[i][j + 1]) { result.push({ type: 'remove', text: a[i] }); i++ }
    else { result.push({ type: 'add', text: b[j] }); j++ }
  }
  while (i < a.length) result.push({ type: 'remove', text: a[i++] })
  while (j < b.length) result.push({ type: 'add', text: b[j++] })
  return result
}
function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}
function segmentLabel(segment: Segment) { return segment.label || '未命名段落' }
function languageLabel(id: string) { return LANGUAGES.find(item => item.id === id)?.label ?? id }
function masterSegment(segment: Segment): Segment | undefined {
  return segment.masterId ? store.masterDraft?.segments.find(item => item.id === segment.masterId) : undefined
}
/** 锁定（已定稿）段在母版更新后仍保留：只提示“定稿保留”，不失效 */
function isKeptFinal(segment: Segment): boolean {
  if (!segment.locked || !segment.masterId) return false
  const master = masterSegment(segment)
  return Boolean(master && (segment.masterRev ?? master.rev ?? 1) < (master.rev ?? 1))
}
function editInLanguage(languageId: string) {
  store.selectLanguage(languageId)
  activeTab.value = 'editor'
}

/* 母版拆分 / 合并 */
function openSplit(id: string) {
  const segment = store.masterDraft?.segments.find(item => item.id === id)
  if (!segment) return
  splitTarget.value = id
  splitA.value = segment.content
  splitB.value = ''
  splitDialog.value = true
}
function submitSplit() {
  if (!splitTarget.value) return
  if (store.splitSegment(splitTarget.value, splitA.value, splitB.value)) splitDialog.value = false
}
function toggleMerge(id: string) {
  mergeIds.value = mergeIds.value.includes(id) ? mergeIds.value.filter(item => item !== id) : [...mergeIds.value, id]
}
function doMerge() {
  if (mergeIds.value.length < 2) return
  store.mergeSegments(mergeIds.value)
  mergeIds.value = []
}

/* 旧译稿接入 */
function openImport() {
  importText.value = ''
  importError.value = ''
  importDialog.value = true
}
function fillImportSample() {
  importText.value = IMPORT_SAMPLE
  importError.value = ''
}
function submitImport() {
  const result = store.importLegacy(importText.value)
  if (result.ok) {
    importText.value = ''
    importError.value = ''
    importDialog.value = false
  } else {
    importError.value = result.message
  }
}

/* 手动对位 */
function openAttach(languageId: string, id: string) {
  attachTarget.value = { languageId, id }
  attachMasterId.value = ''
  attachDialog.value = true
}
function attachItemSubtitle(item: unknown): string {
  return (item as { subtitle?: string })?.subtitle ?? ''
}
function confirmAttach() {
  if (!attachTarget.value || !attachMasterId.value) return
  store.attachSegment(attachTarget.value.languageId, attachTarget.value.id, attachMasterId.value)
  attachTarget.value = null
}
</script>

<template>
  <v-app class="workspace-shell">
    <a class="skip-link" href="#main-workspace">跳到主要内容</a>
    <v-app-bar color="surface" flat border>
      <template #prepend><v-app-bar-nav-icon aria-label="打开项目导航" /></template>
      <v-app-bar-title>
        <span class="project-mark">博物声</span>
        <span class="text-caption text-medium-emphasis ms-3 d-none d-md-inline">展陈脚本工作台</span>
      </v-app-bar-title>
      <v-spacer />
      <v-chip v-if="staleTotal" class="me-2" color="warning" variant="tonal" size="small" style="cursor:pointer" @click="activeTab = 'align'">
        <span class="status-dot" style="background:currentColor" />{{ staleTotal }} 段译稿待复核
      </v-chip>
      <v-chip class="me-2 d-none d-sm-flex" :color="currentStatus.color" variant="tonal" size="small">
        <span class="status-dot" :style="{ background: 'currentColor' }" />{{ currentStatus.label }}
      </v-chip>
      <v-btn variant="text" prepend-icon="mdi-keyboard-outline" class="d-none d-md-flex" @click="helpDialog = true">快捷键</v-btn>
      <v-btn color="primary" prepend-icon="mdi-content-save-outline" @click="versionDialog = true">保存版本</v-btn>
    </v-app-bar>

    <v-navigation-drawer permanent width="320" color="surface" border>
      <div class="pa-4">
        <div class="section-title mb-2">展厅</div>
        <v-select
          :model-value="store.selectedHallId"
          :items="store.halls"
          item-title="name"
          item-value="id"
          hide-details
          aria-label="选择展厅"
          @update:model-value="store.selectHall"
        />
        <div class="d-flex align-center justify-space-between mt-5 mb-2">
          <div class="section-title">展项</div>
          <v-chip size="x-small" variant="tonal">{{ filteredExhibits.length }} 项</v-chip>
        </div>
        <v-text-field v-model="leftFilter" density="compact" hide-details prepend-inner-icon="mdi-magnify" placeholder="筛选展项" aria-label="筛选展项" />
        <v-list class="mt-2 bg-transparent" nav>
          <v-list-item
            v-for="item in filteredExhibits"
            :key="item.id"
            :active="item.id === store.selectedExhibitId"
            color="primary"
            rounded="lg"
            @click="store.selectExhibit(item.id)"
          >
            <template #prepend><v-chip size="small" variant="outlined">{{ item.code }}</v-chip></template>
            <v-list-item-title class="font-weight-medium">{{ item.title }}</v-list-item-title>
            <v-list-item-subtitle class="d-flex align-center ga-2">
              <span>{{ item.drafts.length }} 种语言</span>
              <v-chip v-if="translatedLanguages.reduce((n, l) => n + store.staleCountFor(item, l.id), 0) > 0" color="warning" size="x-small" variant="tonal">有待复核</v-chip>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>
      <v-divider />
      <div class="pa-4">
        <div class="section-title mb-3">多语言完成度</div>
        <div v-for="lang in LANGUAGES" :key="lang.id" class="mb-3">
          <button class="d-flex align-center w-100 border-0 bg-transparent text-left pa-0" :aria-pressed="lang.id === store.selectedLanguageId" @click="store.selectLanguage(lang.id)">
            <v-avatar size="32" :color="lang.id === store.selectedLanguageId ? 'primary' : 'grey-lighten-2'" :class="lang.id === store.selectedLanguageId ? 'text-white' : ''">{{ lang.shortLabel }}</v-avatar>
            <div class="ms-3 flex-grow-1">
              <div class="text-body-2 font-weight-medium d-flex align-center ga-2">
                {{ lang.label }}
                <v-chip v-if="lang.id !== 'zh' && exhibit && store.staleCountFor(exhibit, lang.id) > 0" color="warning" size="x-small" variant="tonal">{{ store.staleCountFor(exhibit, lang.id) }} 待复核</v-chip>
              </div>
              <v-progress-linear class="mt-1" :model-value="exhibit ? store.completionFor(exhibit, lang.id) : 0" :color="lang.id === store.selectedLanguageId ? 'primary' : 'secondary'" height="5" rounded />
            </div>
            <span class="text-caption ms-3">{{ exhibit ? store.completionFor(exhibit, lang.id) : 0 }}%</span>
          </button>
        </div>
      </div>
    </v-navigation-drawer>

    <v-main id="main-workspace" style="background:#f4f0e8">
      <div class="pa-3 pa-md-6">
        <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-5">
          <div>
            <div class="text-caption text-medium-emphasis mb-1">{{ store.selectedHall?.name }} / {{ exhibit?.code }}</div>
            <h1 class="text-h4 font-weight-bold project-mark">{{ exhibit?.title || '请选择展项' }}</h1>
            <div class="text-body-2 text-medium-emphasis mt-2">
              当前语言：{{ currentLanguage?.label }} ·
              {{ draft?.updatedAt ? `最后更新 ${formatTime(draft.updatedAt)}` : '尚未建立文稿' }}
            </div>
          </div>
          <div class="d-flex ga-2">
            <v-btn variant="outlined" prepend-icon="mdi-undo" :disabled="!store.canUndo" @click="store.undo">撤销</v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-redo" :disabled="!store.canRedo" @click="store.redo">重做</v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-history" @click="activeTab = 'versions'">版本</v-btn>
          </div>
        </div>

        <v-alert v-if="store.notice" class="mb-4" color="secondary" variant="tonal" closable @click:close="store.notice = ''">{{ store.notice }}</v-alert>

        <v-tabs v-model="activeTab" color="primary" bg-color="surface" rounded="lg" class="mb-4 px-2">
          <v-tab value="align">段落对齐</v-tab>
          <v-tab value="editor">脚本编辑</v-tab>
          <v-tab value="versions">版本比较</v-tab>
          <v-tab value="preview">设备预览</v-tab>
          <v-tab value="sources">资料核对</v-tab>
        </v-tabs>

        <v-window v-model="activeTab" :touch="false">
          <!-- ============ 段落对齐 ============ -->
          <v-window-item value="align">
            <v-card class="script-card pa-4 pa-md-6">
              <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
                <div>
                  <div class="section-title">段落对齐</div>
                  <div class="text-h6 font-weight-bold mt-1">以中文母版段落为锚，英 / 日译稿逐段对位</div>
                </div>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip color="warning" variant="tonal" size="small">{{ staleTotal }} 段待复核</v-chip>
                  <v-chip color="secondary" variant="tonal" size="small">{{ inboxTotal }} 段待接入</v-chip>
                  <v-btn color="primary" variant="tonal" prepend-icon="mdi-import" @click="openImport">接入旧译稿</v-btn>
                </div>
              </div>
              <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                母版段落一改版，锚定它且未锁定的译稿段自动回到“待复核”；已定稿锁定的段落照旧保留。拆分、合并或删除母版段后，译稿段会带内容进入下方“待接入清单”，可重新对位。
              </v-alert>

              <div class="align-board" role="table" aria-label="中文母版与英日译稿段落对位表">
                <div class="align-row align-head" role="row">
                  <div role="columnheader">中文母版（内容部门维护）</div>
                  <div v-for="lang in translatedLanguages" :key="lang.id" role="columnheader">{{ lang.label }}</div>
                </div>
                <div v-for="(row, rowIndex) in store.alignmentRows" :key="row.master.id" class="align-row" role="row">
                  <div class="align-master" role="cell">
                    <div class="d-flex align-center ga-2 flex-wrap">
                      <span class="text-caption text-medium-emphasis">母版 {{ rowIndex + 1 }}</span>
                      <strong>{{ segmentLabel(row.master) }}</strong>
                      <v-chip size="x-small" variant="outlined">第 {{ row.master.rev ?? 1 }} 版</v-chip>
                      <v-chip v-if="row.master.locked" color="success" size="x-small" variant="tonal">🔒 已锁定</v-chip>
                    </div>
                    <p class="master-content">{{ row.master.content || '（空段落）' }}</p>
                    <div v-if="row.master.note" class="text-caption text-medium-emphasis">改动说明：{{ row.master.note }}</div>
                  </div>
                  <div v-for="lang in translatedLanguages" :key="lang.id" class="align-cell" role="cell">
                    <div v-for="seg in row.cells[lang.id]" :key="seg.id" class="tr-card" :class="{ stale: seg.reviewState === 'stale' && !seg.locked, locked: seg.locked, kept: isKeptFinal(seg) }">
                      <div class="d-flex align-center ga-1 flex-wrap mb-1">
                        <v-chip v-if="isKeptFinal(seg)" color="warning" size="x-small" variant="tonal" prepend-icon="mdi-lock-check">母版已更新·定稿保留</v-chip>
                        <v-chip v-else-if="seg.locked" color="success" size="x-small" variant="tonal">🔒 已锁定</v-chip>
                        <v-chip v-else-if="seg.reviewState === 'stale'" color="warning" size="x-small" variant="tonal">待复核</v-chip>
                        <v-chip v-else color="success" size="x-small" variant="tonal">已对位</v-chip>
                        <v-chip v-if="seg.origin === 'legacy-import'" color="secondary" size="x-small" variant="outlined">旧译稿</v-chip>
                      </div>
                      <div class="tr-label">{{ segmentLabel(seg) }}</div>
                      <p class="tr-content">{{ seg.content || '（尚未填写译文）' }}</p>
                      <div v-if="seg.note" class="text-caption text-warning-darken-2 mb-1">{{ seg.note }}</div>
                      <div class="d-flex align-center ga-1 flex-wrap">
                        <v-btn v-if="seg.reviewState === 'stale' && !seg.locked" size="x-small" variant="tonal" color="success" prepend-icon="mdi-check" @click="store.markReviewed(lang.id, seg.id)">标记已复核</v-btn>
                        <v-btn size="x-small" variant="text" prepend-icon="mdi-pencil-outline" @click="editInLanguage(lang.id)">编辑</v-btn>
                        <v-btn size="x-small" variant="text" prepend-icon="mdi-link" @click="openAttach(lang.id, seg.id)">改对母版段</v-btn>
                        <v-btn size="x-small" variant="text" prepend-icon="mdi-link-off" :disabled="seg.locked" @click="store.detachSegment(lang.id, seg.id)">移回清单</v-btn>
                        <v-btn icon size="x-small" variant="text" :aria-label="seg.locked ? '解锁段落' : '锁定段落'" @click="store.toggleLock(lang.id, seg.id)">{{ seg.locked ? '🔒' : '🔓' }}</v-btn>
                        <v-btn icon="mdi-delete-outline" size="x-small" variant="text" color="error" :disabled="seg.locked" :aria-label="`删除 ${lang.label} 段落 ${segmentLabel(seg)}`" @click="deleteTarget = { languageId: lang.id, id: seg.id }" />
                      </div>
                    </div>
                    <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" block @click="store.startTranslation(lang.id, row.master.id)">补译此段</v-btn>
                  </div>
                </div>
              </div>

              <template v-if="store.inboxGroups.length">
                <v-divider class="my-6" />
                <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-3">
                  <div>
                    <div class="section-title">待接入清单</div>
                    <div class="text-body-2 text-medium-emphasis mt-1">接不上当前母版的译稿按语言原样保留；重新对位前不会覆盖任何文稿。</div>
                  </div>
                </div>
                <v-row>
                  <v-col v-for="group in store.inboxGroups" :key="group.languageId" cols="12" md="6">
                    <v-card variant="tonal" class="pa-4 inbox-card" color="secondary">
                      <div class="d-flex align-center justify-space-between mb-3">
                        <strong>{{ languageLabel(group.languageId) }}</strong>
                        <v-chip size="small" variant="tonal">{{ group.segments.length }} 段未对位</v-chip>
                      </div>
                      <div v-for="seg in group.segments" :key="seg.id" class="tr-card" :class="{ locked: seg.locked }">
                        <div class="d-flex align-center ga-1 flex-wrap mb-1">
                          <v-chip color="secondary" size="x-small" variant="tonal">待接入</v-chip>
                          <v-chip v-if="seg.origin === 'legacy-import'" color="secondary" size="x-small" variant="outlined">旧译稿</v-chip>
                          <v-chip v-if="seg.locked" color="success" size="x-small" variant="tonal">🔒 定稿已保留</v-chip>
                        </div>
                        <div class="tr-label">{{ segmentLabel(seg) }}</div>
                        <p class="tr-content">{{ seg.content }}</p>
                        <div v-if="seg.note" class="text-caption text-medium-emphasis mb-1">{{ seg.note }}</div>
                        <div class="d-flex align-center ga-1 flex-wrap">
                          <v-btn size="x-small" color="primary" variant="tonal" prepend-icon="mdi-link-variant" @click="openAttach(group.languageId, seg.id)">对位到母版段</v-btn>
                          <v-btn size="x-small" variant="text" prepend-icon="mdi-pencil-outline" @click="editInLanguage(group.languageId)">编辑</v-btn>
                          <v-btn icon size="x-small" variant="text" :aria-label="seg.locked ? '解锁段落' : '锁定段落'" @click="store.toggleLock(group.languageId, seg.id)">{{ seg.locked ? '🔒' : '🔓' }}</v-btn>
                          <v-btn icon="mdi-delete-outline" size="x-small" variant="text" color="error" :disabled="seg.locked" :aria-label="`删除未对位段落 ${segmentLabel(seg)}`" @click="deleteTarget = { languageId: group.languageId, id: seg.id }" />
                        </div>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>
              </template>
            </v-card>
          </v-window-item>

          <!-- ============ 脚本编辑 ============ -->
          <v-window-item value="editor">
            <v-empty-state v-if="!draft" icon="mdi-script-text-outline" title="尚未选择展项" text="请从左侧选择一个展厅和展项。" />
            <v-row v-else>
              <v-col cols="12" lg="8">
                <v-card class="script-card pa-4 pa-md-6">
                  <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
                    <div>
                      <div class="section-title">当前文稿</div>
                      <div class="text-h6 font-weight-bold mt-1">{{ currentLanguage?.label }}</div>
                    </div>
                    <div class="d-flex flex-wrap ga-2">
                      <v-select
                        :model-value="draft.status"
                        :items="statusOptions"
                        item-title="label"
                        item-value="value"
                        label="审校状态"
                        hide-details
                        style="min-width:150px"
                        @update:model-value="store.setStatus"
                      />
                      <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="store.addSegment">
                        {{ draft.languageId === 'zh' ? '新增母版段' : '新增译稿段' }}
                      </v-btn>
                    </div>
                  </div>
                  <v-alert v-if="draft.languageId === 'zh'" type="success" variant="tonal" density="compact" class="mb-4">
                    这是中文母版。改动段落内容并失焦保存后，英 / 日译稿中未锁定的对位段落会自动回到“待复核”，已定稿锁定段不受影响。
                  </v-alert>
                  <v-alert v-else type="warning" variant="tonal" density="compact" class="mb-4">
                    译稿按段落对位中文母版；母版改版后受影响段落会标记“待复核”，复核后点“标记已复核”即可恢复已对位。
                  </v-alert>

                  <v-text-field label="展项标题" :model-value="draft.title" hint="面向观众的主标题" persistent-hint @change="saveDraftField('title', $event)" />
                  <v-row class="mt-2">
                    <v-col cols="12" md="5">
                      <v-text-field label="预计朗读时长（分钟）" type="number" min="0" step="0.5" :model-value="draft.durationMinutes" @change="saveDraftField('durationMinutes', $event)" />
                    </v-col>
                    <v-col cols="12" md="7">
                      <v-text-field label="资料来源" :model-value="draft.sources" hint="书籍、档案号或专家核验记录" persistent-hint @change="saveDraftField('sources', $event)" />
                    </v-col>
                  </v-row>

                  <div class="section-title mt-6 mb-2">完整讲解词</div>
                  <v-textarea label="讲解词" rows="7" auto-grow counter :model-value="draft.narration" @change="saveDraftField('narration', $event)" />

                  <div class="section-title mt-6 mb-2">无障碍描述</div>
                  <v-textarea label="无障碍描述" rows="4" auto-grow hint="描述尺寸、材质、色彩与可触摸特征，避免只依赖视觉" persistent-hint :model-value="draft.accessibility" @change="saveDraftField('accessibility', $event)" />
                </v-card>

                <v-card class="script-card pa-4 pa-md-6 mt-5">
                  <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
                    <div>
                      <div class="section-title">{{ draft.languageId === 'zh' ? '母版段落' : '分段校对' }}</div>
                      <div class="text-body-2 text-medium-emphasis mt-1">
                        {{ draft.languageId === 'zh' ? '勾选多段可合并；单段可拆分。锁定段不能改、不能拆分或合并。' : '锁定段落不会被编辑，也不会因母版改动失效；可在撤销中恢复。' }}
                      </div>
                    </div>
                    <div class="d-flex ga-2">
                      <v-chip variant="tonal">{{ draft.segments.filter(item => item.locked).length }}/{{ draft.segments.length }} 已锁定</v-chip>
                      <v-btn v-if="draft.languageId === 'zh'" color="primary" variant="tonal" size="small" prepend-icon="mdi-call-merge" :disabled="mergeIds.length < 2" @click="doMerge">合并勾选（{{ mergeIds.length }}）</v-btn>
                    </div>
                  </div>
                  <div class="d-flex flex-column ga-3">
                    <div v-for="(segment, index) in draft.segments" :key="segment.id" class="segment-row" :class="{ locked: segment.locked }">
                      <div class="d-flex align-center ga-2 flex-wrap">
                        <v-checkbox-btn v-if="draft.languageId === 'zh'" :model-value="mergeIds.includes(segment.id)" color="primary" :aria-label="`勾选母版第 ${index + 1} 段用于合并`" @update:model-value="toggleMerge(segment.id)" />
                        <v-btn icon size="small" variant="text" :aria-label="segment.locked ? '解锁段落' : '锁定段落'" @click="store.toggleLock(draft.languageId, segment.id)">
                          {{ segment.locked ? '🔒' : '🔓' }}
                        </v-btn>
                        <v-text-field :model-value="segment.label" density="compact" hide-details variant="plain" :readonly="segment.locked" :aria-label="`第 ${index + 1} 段标题`" class="flex-grow-1" @change="saveSegment(segment.id, 'label', $event)" />
                        <v-chip v-if="draft.languageId === 'zh'" size="x-small" variant="outlined">第 {{ segment.rev ?? 1 }} 版</v-chip>
                        <v-chip v-else-if="isKeptFinal(segment)" color="warning" size="x-small" variant="tonal">母版已更新·定稿保留</v-chip>
                        <v-chip v-else-if="segment.locked" color="success" size="small" variant="tonal">已确认</v-chip>
                        <v-chip v-else-if="segment.reviewState === 'stale'" color="warning" size="small" variant="tonal">待复核</v-chip>
                        <v-chip v-else color="success" size="small" variant="tonal">已对位</v-chip>
                        <v-btn v-if="draft.languageId === 'zh'" icon="mdi-call-split" size="small" variant="text" :disabled="segment.locked" :aria-label="`拆分第 ${index + 1} 个母版段`" @click="openSplit(segment.id)" />
                        <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" :disabled="segment.locked" :aria-label="`删除第 ${index + 1} 段`" @click="deleteTarget = { languageId: draft.languageId, id: segment.id }" />
                      </div>

                      <div v-if="draft.languageId !== 'zh'" class="seg-align-meta mt-2">
                        <template v-if="masterSegment(segment)">
                          <span class="text-caption">对位于母版段：{{ masterSegment(segment)?.label }}</span>
                          <v-btn v-if="segment.reviewState === 'stale' && !segment.locked" size="x-small" variant="text" color="success" @click="store.markReviewed(draft.languageId, segment.id)">标记已复核</v-btn>
                          <v-btn size="x-small" variant="text" :disabled="segment.locked" @click="store.detachSegment(draft.languageId, segment.id)">移回待接入清单</v-btn>
                        </template>
                        <span v-else class="text-caption text-warning-darken-2">尚未对位母版（在待接入清单）</span>
                        <v-btn v-if="!masterSegment(segment)" size="x-small" variant="text" @click="openAttach(draft.languageId, segment.id)">对位到母版段</v-btn>
                      </div>

                      <v-textarea class="mt-2" :model-value="segment.content" rows="2" auto-grow hide-details :readonly="segment.locked" :aria-label="segmentLabel(segment)" @change="saveSegment(segment.id, 'content', $event)" />
                      <div v-if="segment.note" class="text-caption text-medium-emphasis mt-1">{{ segment.note }}</div>
                    </div>
                  </div>
                </v-card>
              </v-col>

              <v-col cols="12" lg="4">
                <v-card class="script-card pa-5">
                  <div class="section-title mb-4">同展项语言进度</div>
                  <div v-for="lang in LANGUAGES" :key="lang.id" class="d-flex align-center ga-3 mb-4">
                    <v-progress-circular :model-value="store.completionFor(exhibit!, lang.id)" size="52" width="5" :color="lang.id === store.selectedLanguageId ? 'primary' : 'secondary'">
                      {{ store.completionFor(exhibit!, lang.id) }}
                    </v-progress-circular>
                    <div class="flex-grow-1">
                      <div class="font-weight-medium d-flex align-center ga-2">
                        {{ lang.label }}
                        <v-chip v-if="lang.id !== 'zh' && store.staleCountFor(exhibit!, lang.id) > 0" color="warning" size="x-small" variant="tonal">{{ store.staleCountFor(exhibit!, lang.id) }} 待复核</v-chip>
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ exhibit?.drafts.find(item => item.languageId === lang.id) ? store.statusLabel(exhibit!.drafts.find(item => item.languageId === lang.id)!.status) : '尚未创建' }}
                      </div>
                    </div>
                    <v-btn size="small" variant="text" :disabled="lang.id === store.selectedLanguageId" @click="store.selectLanguage(lang.id)">切换</v-btn>
                  </div>
                </v-card>
                <v-card class="script-card pa-5 mt-5">
                  <div class="section-title mb-3">审校检查</div>
                  <v-list density="compact" class="bg-transparent">
                    <v-list-item :prepend-icon="draft.narration.length > 80 ? 'mdi-check-circle' : 'mdi-alert-circle'" :title="`讲解词 ${draft.narration.length} 字`" />
                    <v-list-item :prepend-icon="draft.accessibility.length > 30 ? 'mdi-check-circle' : 'mdi-alert-circle'" :title="`无障碍描述 ${draft.accessibility.length} 字`" />
                    <v-list-item :prepend-icon="draft.sources ? 'mdi-check-circle' : 'mdi-alert-circle'" :title="draft.sources ? '资料来源已填写' : '缺少资料来源'" />
                    <v-list-item :prepend-icon="staleTotal ? 'mdi-alert-circle' : 'mdi-check-circle'" :title="staleTotal ? `${staleTotal} 段译稿待复核` : '译稿均与当前母版对位'" />
                  </v-list>
                  <v-alert class="mt-3" type="info" variant="tonal" density="compact">
                    估算语速约 {{ Math.max(1, Math.round(draft.narration.length / 220 * 10) / 10) }} 分钟，请与目标时长核对。
                  </v-alert>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- ============ 版本比较 ============ -->
          <v-window-item value="versions">
            <v-empty-state v-if="!draft" icon="mdi-history" title="尚未选择展项" text="请从左侧选择一个展厅和展项。" />
            <v-card v-else class="script-card pa-4 pa-md-6">
              <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
                <div>
                  <div class="section-title">版本比较</div>
                  <div class="text-h6 font-weight-bold mt-1">选择同一展项、同一语言的两个快照</div>
                </div>
                <v-btn color="primary" prepend-icon="mdi-content-save-plus-outline" @click="versionDialog = true">保存当前版本</v-btn>
              </div>
              <v-alert v-if="versions.length < 2" type="info" variant="tonal">至少保存两个版本后即可比较。当前有 {{ versions.length }} 个版本。</v-alert>
              <template v-else>
                <v-row>
                  <v-col cols="12" md="6"><v-select v-model="compareA" :items="versions" item-title="name" item-value="id" label="基准版本" /></v-col>
                  <v-col cols="12" md="6"><v-select v-model="compareB" :items="versions" item-title="name" item-value="id" label="目标版本" /></v-col>
                </v-row>
                <div class="d-flex ga-4 text-caption text-medium-emphasis mb-2">
                  <span><span class="status-dot" style="background:#9b2c25" /> 删除</span>
                  <span><span class="status-dot" style="background:#2f6b45" /> 新增</span>
                </div>
                <div class="rounded-lg border pa-3 bg-white">
                  <p v-for="(line, index) in diffLines" :key="index" class="diff-line" :class="`diff-${line.type}`">{{ line.text }}</p>
                  <div v-if="!diffLines.length" class="text-medium-emphasis pa-4">所选版本内容一致。</div>
                </div>
                <v-list class="mt-4 bg-transparent">
                  <v-list-item v-for="version in versions" :key="version.id" :title="version.name" :subtitle="formatTime(version.createdAt)">
                    <template #append><v-btn variant="outlined" size="small" @click="store.restoreVersion(version.id)">恢复此版</v-btn></template>
                  </v-list-item>
                </v-list>
              </template>
            </v-card>
          </v-window-item>

          <!-- ============ 设备预览 ============ -->
          <v-window-item value="preview">
            <v-empty-state v-if="!draft" icon="mdi-monitor-cellphone" title="尚未选择展项" text="请从左侧选择一个展厅和展项。" />
            <v-card v-else class="script-card pa-4 pa-md-6">
              <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
                <div>
                  <div class="section-title">设备排版预览</div>
                  <div class="text-h6 font-weight-bold mt-1">以展项实际阅读顺序预览</div>
                </div>
                <v-btn-toggle v-model="device" mandatory variant="outlined" divided>
                  <v-btn v-for="item in deviceOptions" :key="item.value" :value="item.value">{{ item.label }}</v-btn>
                </v-btn-toggle>
              </div>
              <div class="preview-frame" :class="device">
                <div class="preview-content">
                  <div class="text-overline text-medium-emphasis">{{ exhibit?.code }} · {{ currentLanguage?.label }}</div>
                  <h2 class="text-h4 font-weight-bold mt-2">{{ draft.title }}</h2>
                  <p class="text-body-1 mt-6" style="line-height:1.9;white-space:pre-wrap">{{ draft.narration }}</p>
                  <v-divider class="my-6" />
                  <div class="section-title">无障碍描述</div>
                  <p class="text-body-2 mt-2" style="line-height:1.8;white-space:pre-wrap">{{ draft.accessibility }}</p>
                  <div class="mt-7 text-caption text-medium-emphasis">预计讲解 {{ draft.durationMinutes }} 分钟</div>
                </div>
              </div>
            </v-card>
          </v-window-item>

          <!-- ============ 资料核对 ============ -->
          <v-window-item value="sources">
            <v-empty-state v-if="!draft" icon="mdi-book-open-outline" title="尚未选择展项" text="请从左侧选择一个展厅和展项。" />
            <v-row v-else>
              <v-col cols="12" md="7">
                <v-card class="script-card pa-5">
                  <div class="section-title mb-3">来源与核验记录</div>
                  <v-textarea :model-value="draft.sources" rows="8" @change="saveDraftField('sources', $event)" />
                  <v-alert class="mt-4" type="warning" variant="tonal">发布前请由内容负责人逐条核对来源。当前无障碍描述与实物尺寸需由教育部门复核。</v-alert>
                </v-card>
              </v-col>
              <v-col cols="12" md="5">
                <v-card class="script-card pa-5">
                  <div class="section-title mb-3">段落锁定概况</div>
                  <v-timeline density="compact" side="end">
                    <v-timeline-item v-for="segment in draft.segments" :key="segment.id" :dot-color="segment.locked ? 'success' : 'grey'" size="small">
                      <div class="font-weight-medium">{{ segment.label }}</div>
                      <div class="text-caption text-medium-emphasis">{{ segment.locked ? '已锁定，审校确认' : '编辑中' }}</div>
                    </v-timeline-item>
                  </v-timeline>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </div>
    </v-main>

    <!-- 旧译稿接入 -->
    <v-dialog v-model="importDialog" max-width="720">
      <v-card class="pa-3">
        <v-card-title>接入旧译稿（当前展项：{{ exhibit?.code }} {{ exhibit?.title }}）</v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-3">
            规则：整份 JSON 校验通过后一次性写入；该语言段数与母版一致且各对位格为空时自动按段落对位（待复核），否则全部进入待接入清单按语言保留；不会覆盖任何已有文稿；任一处校验失败则整体回滚，本次导入不落库。
          </v-alert>
          <v-alert v-if="importError" type="error" variant="tonal" density="compact" class="mb-3" title="接入失败，已回滚到接入前版本">{{ importError }}</v-alert>
          <v-textarea
            v-model="importText"
            rows="14"
            class="mono"
            label="旧译稿 JSON"
            placeholder='{"drafts":[{"language":"en","segments":[{"label":"...","content":"..."}]}]}'
            hint="支持 {drafts:[...]} 或单份 {language, segments}；没有分段时可用两个换行切分 narration。"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" prepend-icon="mdi-file-document-outline" @click="fillImportSample">填入示例</v-btn>
          <v-spacer />
          <v-btn @click="importDialog = false">取消</v-btn>
          <v-btn color="primary" prepend-icon="mdi-import" @click="submitImport">校验并接入</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 母版拆分 -->
    <v-dialog v-model="splitDialog" max-width="640">
      <v-card class="pa-3">
        <v-card-title>拆分母版段落</v-card-title>
        <v-card-text>
          <p class="mb-3 text-medium-emphasis">拆分后原译稿段落保留内容进入待接入清单（已定稿锁定段一并保留），再分别对到两段。</p>
          <v-textarea v-model="splitA" rows="3" auto-grow label="上半段内容" class="mb-3" />
          <v-textarea v-model="splitB" rows="3" auto-grow label="下半段内容" placeholder="粘贴或输入拆分出的新段落" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="splitDialog = false">取消</v-btn><v-btn color="primary" prepend-icon="mdi-call-split" @click="submitSplit">确认拆分</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 手动对位 -->
    <v-dialog :model-value="Boolean(attachTarget)" max-width="520" @update:model-value="(v: boolean) => !v && (attachTarget = null)">
      <v-card class="pa-3">
        <v-card-title>对位到母版段落</v-card-title>
        <v-card-text>
          <p class="mb-3 text-medium-emphasis">对位后状态为“待复核”，需逐段复核确认；原译文不会被改动。</p>
          <v-select v-model="attachMasterId" :items="attachItems" item-title="title" item-value="value" label="选择母版段">
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :title="item.title" :subtitle="attachItemSubtitle(item.raw)" />
            </template>
          </v-select>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="attachTarget = null">取消</v-btn><v-btn color="primary" :disabled="!attachMasterId" prepend-icon="mdi-link-variant" @click="confirmAttach">确认对位</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(deleteTarget)" max-width="440" @update:model-value="deleteTarget = null">
      <v-card class="pa-3">
        <v-card-title>删除这个段落？</v-card-title>
        <v-card-text>{{ deleteTarget?.languageId === 'zh' ? '删除母版段后，其译稿段会保留内容进入待接入清单。' : '删除后可使用撤销恢复。' }}</v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="deleteTarget = null">取消</v-btn><v-btn color="error" @click="confirmDelete">删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="versionDialog" max-width="520">
      <v-card class="pa-3">
        <v-card-title>保存版本快照</v-card-title>
        <v-card-text>
          <p class="mb-4 text-medium-emphasis">将当前“{{ draft?.title }}”的完整内容和锁定状态保存为只读版本。</p>
          <v-text-field v-model="versionName" label="版本名称（可选）" autofocus @keyup.enter="submitVersion" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="versionDialog = false">取消</v-btn><v-btn color="primary" @click="submitVersion">保存快照</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="helpDialog" max-width="520">
      <v-card class="pa-3">
        <v-card-title>键盘操作</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item prepend-icon="mdi-apple-keyboard-command" title="Ctrl / ⌘ + Z" subtitle="撤销上一步编辑" />
            <v-list-item prepend-icon="mdi-redo" title="Ctrl / ⌘ + Shift + Z" subtitle="重做" />
            <v-list-item prepend-icon="mdi-content-save-outline" title="Ctrl / ⌘ + S" subtitle="保存当前版本快照" />
            <v-list-item prepend-icon="mdi-keyboard-tab" title="Tab / Shift + Tab" subtitle="在字段、状态与段落操作之间移动" />
          </v-list>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn color="primary" @click="helpDialog = false">知道了</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar :model-value="Boolean(store.notice)" timeout="2600" location="bottom right" @update:model-value="store.notice = ''">
      {{ store.notice }}
      <template #actions><v-btn variant="text" @click="store.notice = ''">关闭</v-btn></template>
    </v-snackbar>
  </v-app>
</template>

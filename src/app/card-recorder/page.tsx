'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  LayoutGrid,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { readFileAsText } from '@/lib/file-utils'

const STORE_KEY = 'card_recorder_v1'

interface SubCard {
  id: string
  text?: string
  time?: string
  note?: string
  createdAt?: number
}

interface MainCard {
  id: string
  title: string
  summary?: string
  updatedAt: number
  children: SubCard[]
}

type ModalState =
  | { type: 'main-card'; card?: MainCard }
  | { type: 'sub-card'; card: MainCard; sub?: SubCard }
  | { type: 'view-sub'; card: MainCard; sub: SubCard }
  | null

const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

function fmtTime(v?: string | number) {
  if (v === undefined || v === null || v === '') return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const ghostBtn =
  'flex items-center gap-1.5 rounded-xl border bg-white/60 px-4 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'
const fieldCls =
  'w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:border-brand focus:outline-none'

export default function CardRecorderPage() {
  const [loaded, setLoaded] = useState(false)
  const { isAuth, setPrivateKey } = useAuthStore()
  const [cards, setCards] = useState<MainCard[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const keyInputRef = useRef<HTMLInputElement>(null)
  const pendingActionRef = useRef<(() => void) | null>(null)

  // 弹窗草稿
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [text, setText] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (Array.isArray(data?.cards)) setCards(data.cards)
      }
    } catch {}
    setLoaded(true)
  }, [])

  const persist = (next: MainCard[]) => {
    setCards(next)
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ cards: next }))
    } catch {
      toast.error('本地存储不可用，请用导出/导入备份')
    }
  }

  const childCount = useMemo(() => cards.reduce((n, c) => n + (c.children?.length || 0), 0), [cards])
  const activeCard = cards.find(c => c.id === activeId) || null

  /* ---------- 主卡片 ---------- */
  const openMainModal = (card?: MainCard) => {
    setTitle(card?.title || '')
    setSummary(card?.summary || '')
    setModal({ type: 'main-card', card })
  }

  const submitMain = () => {
    if (!modal || modal.type !== 'main-card') return
    const t = title.trim()
    if (!t) {
      toast.error('请填写标题')
      return
    }
    if (modal.card) {
      persist(cards.map(c => (c.id === modal.card!.id ? { ...c, title: t, summary: summary.trim(), updatedAt: Date.now() } : c)))
      toast.success('已保存')
    } else {
      const card: MainCard = { id: uid(), title: t, summary: summary.trim(), updatedAt: Date.now(), children: [] }
      persist([card, ...cards])
      toast.success('已创建主卡片')
    }
    setModal(null)
  }

  const delCard = (card: MainCard) => {
    const count = card.children?.length || 0
    if (!confirm(`确定删除主卡片「${card.title || '未命名'}」及其 ${count} 条子卡片？`)) return
    requireAuth(() => {
      persist(cards.filter(c => c.id !== card.id))
      if (activeId === card.id) setActiveId(null)
      toast.success('已删除主卡片')
    })
  }

  /* ---------- 子卡片 ---------- */
  const openSubModal = (card: MainCard, sub?: SubCard) => {
    setText(sub?.text || '')
    setTime(sub?.time?.slice(0, 16) || '')
    setNote(sub?.note || '')
    setModal({ type: 'sub-card', card, sub })
  }

  const submitSub = () => {
    if (!modal || modal.type !== 'sub-card') return
    const t = text.trim()
    const ti = time
    const n = note.trim()
    if (!t && !ti && !n) {
      toast.error('至少填写一项')
      return
    }
    const target = modal.card
    if (modal.sub) {
      const subId = modal.sub.id
      persist(
        cards.map(c =>
          c.id === target.id
            ? { ...c, updatedAt: Date.now(), children: (c.children || []).map(s => (s.id === subId ? { ...s, text: t, time: ti, note: n } : s)) }
            : c
        )
      )
      toast.success('已保存')
    } else {
      const sub: SubCard = { id: uid(), text: t, time: ti, note: n, createdAt: Date.now() }
      persist(
        cards.map(c => (c.id === target.id ? { ...c, updatedAt: Date.now(), children: [sub, ...(c.children || [])] } : c))
      )
      toast.success('已添加子卡片')
    }
    setModal(null)
  }

  const delSub = (card: MainCard, subId: string) => {
    if (!confirm('确定删除这条子卡片？')) return
    requireAuth(() => {
      persist(
        cards.map(c => (c.id === card.id ? { ...c, updatedAt: Date.now(), children: (c.children || []).filter(s => s.id !== subId) } : c))
      )
      toast.success('已删除子卡片')
    })
  }

  /* ---------- 导入 / 导出 ---------- */
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ cards }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'card-recorder.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await readFileAsText(file))
      if (!Array.isArray(data?.cards)) throw new Error('bad format')
      if (activeCard) {
        // 详情视图：把导入文件里的所有子卡合并进当前主卡（按 id 去重）
        const incoming = (data.cards as MainCard[]).flatMap(c => c.children || [])
        if (incoming.length === 0) throw new Error('该文件没有子卡片')
        const subMap = new Map<string, SubCard>()
        ;(activeCard.children || []).forEach(s => subMap.set(s.id, s))
        incoming.forEach(s => subMap.set(s.id || uid(), s))
        const merged = Array.from(subMap.values())
        persist(cards.map(c => (c.id === activeCard.id ? { ...c, children: merged, updatedAt: Date.now() } : c)))
        toast.success(`已导入 ${incoming.length} 条子卡到「${activeCard.title}」（共 ${merged.length} 条）`)
      } else {
        // 列表视图：合并主卡片（按 id 去重，同 id 覆盖，新增追加）
        const incoming = data.cards as MainCard[]
        const map = new Map<string, MainCard>()
        cards.forEach(c => map.set(c.id, c))
        incoming.forEach(c => map.set(c.id || uid(), { ...c, children: (c.children || []).map(s => ({ ...s, id: s.id || uid() })) }))
        persist(Array.from(map.values()))
        toast.success(`导入成功：新增 ${incoming.length} 张主卡（共 ${map.size} 张）`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('卡片导入失败:', error)
      toast.error(`导入失败：${msg}`)
    }
    e.target.value = ''
  }

  /* ---------- 鉴权：写操作需先导入密钥 ---------- */
  const requireAuth = (action: () => void) => {
    if (!isAuth) {
      pendingActionRef.current = action
      keyInputRef.current?.click()
      return
    }
    action()
  }

  const handlePrivateKeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await readFileAsText(file)
      await setPrivateKey(text)
      toast.success('密钥导入成功')
      const action = pendingActionRef.current
      pendingActionRef.current = null
      if (action) action()
    } catch {
      toast.error('读取密钥文件失败')
    }
    e.target.value = ''
  }

  /* ---------- 渲染 ---------- */
  return (
    <div className='mx-auto max-w-4xl px-6 py-16'>
      <input ref={importRef} type='file' accept='application/json' className='hidden' onChange={handleImportFile} />
      <input ref={keyInputRef} type='file' accept='.pem' className='hidden' onChange={handlePrivateKeyChange} />

      {/* 头部 */}
      <div className='mb-8 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <LayoutGrid className='text-brand h-6 w-6' />
          <h1 className='text-xl font-medium'>卡片记录</h1>
          {loaded && (
            <span className='text-secondary rounded-full border bg-white/60 px-3 py-1 text-xs backdrop-blur-sm'>
              {cards.length} 主卡 · {childCount} 子卡
            </span>
          )}
        </div>
        {!activeCard && (
          <div className='flex flex-wrap items-center gap-2'>
            <button onClick={() => requireAuth(() => importRef.current?.click())} className={ghostBtn}>
              <Upload className='h-4 w-4' />
              导入
            </button>
            <button onClick={handleExport} className={ghostBtn}>
              <Download className='h-4 w-4' />
              导出
            </button>
            <button onClick={() => openMainModal()} className='brand-btn flex items-center gap-1.5 px-4'>
              <Plus className='h-4 w-4' />
              新建主卡片
            </button>
          </div>
        )}
      </div>

      {!loaded ? (
        <div className='min-h-[40vh]' />
      ) : activeCard ? (
        /* ========== 详情视图 ========== */
        <div>
          <button
            onClick={() => setActiveId(null)}
            className='text-secondary mb-4 flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-brand/10 hover:text-brand'
          >
            <ArrowLeft className='h-4 w-4' />
            返回卡片列表
          </button>

          {/* 主卡信息 */}
          <section className='relative mb-6 overflow-hidden rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur-sm'>
            <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand to-[#4fd1c5]' />
            <h2 className='mb-2 flex items-center gap-2.5 text-[22px] font-bold'>
              <CalendarDays className='text-brand h-5 w-5' />
              {activeCard.title || '未命名卡片'}
            </h2>
            <p className='text-secondary max-w-2xl text-sm leading-relaxed whitespace-pre-wrap'>
              {activeCard.summary || '（无概要）'}
            </p>
            <div className='mt-4 flex flex-wrap gap-2'>
              <button onClick={() => openMainModal(activeCard)} className={`${ghostBtn} !px-3 !py-1.5`}>
                <Pencil className='h-3.5 w-3.5' />
                编辑主卡
              </button>
              <button onClick={() => openSubModal(activeCard)} className={`${ghostBtn} !px-3 !py-1.5`}>
                <Plus className='h-3.5 w-3.5' />
                添加子卡片
              </button>
              <button onClick={() => requireAuth(() => importRef.current?.click())} className={`${ghostBtn} !px-3 !py-1.5`}>
                <Upload className='h-3.5 w-3.5' />
                导入子卡
              </button>
              <button
                onClick={() => delCard(activeCard)}
                className='flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-3 py-1.5 text-sm text-red-500 backdrop-blur-sm transition-colors hover:bg-red-100'
              >
                <Trash2 className='h-3.5 w-3.5' />
                删除主卡
              </button>
            </div>
          </section>

          {/* 子卡片区 */}
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='text-secondary text-xs font-bold tracking-widest uppercase'>
              子卡片记录 · {(activeCard.children || []).length}
            </h3>
            <button onClick={() => openSubModal(activeCard)} className='brand-btn flex items-center gap-1.5 px-3 py-1.5 text-sm'>
              <Plus className='h-3.5 w-3.5' />
              添加子卡片
            </button>
          </div>

          {(activeCard.children || []).length === 0 ? (
            <div className='text-secondary rounded-2xl border border-dashed p-8 text-center text-sm'>
              还没有子卡片，点击「添加子卡片」记录更细的内容（文本 / 时间 / 备注）
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {(activeCard.children || []).map(sub => (
                <div
                  key={sub.id}
                  onClick={() => setModal({ type: 'view-sub', card: activeCard, sub })}
                  className='cursor-pointer rounded-2xl border bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md'
                >
                  {sub.text && (
                    <div className='mb-2 flex items-start gap-2 text-sm leading-relaxed'>
                      <FileText className='text-brand mt-0.5 h-4 w-4 shrink-0' />
                      <span className='break-words line-clamp-2 whitespace-pre-wrap'>{sub.text}</span>
                    </div>
                  )}
                  {sub.time && (
                    <div className='text-brand mb-2 flex items-center gap-2 text-sm font-medium'>
                      <Clock3 className='h-4 w-4 shrink-0' />
                      {fmtTime(sub.time)}
                    </div>
                  )}
                  {sub.note && (
                    <div className='flex items-start gap-2 text-sm text-gray-500 italic'>
                      <MapPin className='text-brand mt-0.5 h-4 w-4 shrink-0' />
                      <span className='break-words line-clamp-3 whitespace-pre-wrap'>{sub.note}</span>
                    </div>
                  )}
                  {!sub.text && !sub.time && !sub.note && <p className='text-secondary text-sm'>（空记录）</p>}
                  <div className='mt-3 flex justify-end gap-1 border-t border-dashed pt-3'>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        openSubModal(activeCard, sub)
                      }}
                      className='rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-brand/10 hover:text-brand'
                    >
                      <Pencil className='h-4 w-4' />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        delSub(activeCard, sub.id)
                      }}
                      className='rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : cards.length === 0 ? (
        /* 空状态 */
        <div className='text-secondary flex min-h-[40vh] flex-col items-center justify-center gap-3'>
          <LayoutGrid className='text-brand h-12 w-12 opacity-60' />
          <p className='font-semibold'>还没有任何主卡片</p>
          <p className='text-sm'>点击右上角「新建主卡片」开始记录</p>
        </div>
      ) : (
        /* ========== 列表视图 ========== */
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {cards.map(card => (
            <div
              key={card.id}
              onClick={() => setActiveId(card.id)}
              className='group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-brand/45 hover:shadow-md'
            >
              <div className='absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand to-[#4fd1c5] opacity-0 transition-opacity group-hover:opacity-100' />
              <div className='absolute top-3 right-3 flex gap-1 opacity-55 transition-opacity group-hover:opacity-100'>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    openMainModal(card)
                  }}
                  className='rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-brand/10 hover:text-brand'
                >
                  <Pencil className='h-4 w-4' />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    delCard(card)
                  }}
                  className='rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
              <h3 className='mr-14 mb-2 text-[17px] leading-snug font-bold break-words'>{card.title || '未命名卡片'}</h3>
              <p className='line-clamp-2 min-h-[42px] text-[13px] leading-relaxed text-gray-500'>{card.summary || '（无概要）'}</p>
              <div className='mt-3.5 flex items-center justify-between text-xs text-gray-500'>
                <span className='bg-brand/10 text-brand flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold'>
                  <LayoutGrid className='h-3 w-3' />
                  {(card.children || []).length} 子卡
                </span>
                <span>{fmtTime(card.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 主卡片弹窗 */}
      <DialogModal open={modal?.type === 'main-card'} onClose={() => setModal(null)} className='card static w-[470px] max-sm:w-full'>
        {modal?.type === 'main-card' && (
          <div>
            <h3 className='mb-4 flex items-center gap-2 text-lg font-bold'>
              <LayoutGrid className='text-brand h-5 w-5' />
              {modal.card ? '编辑主卡片' : '新建主卡片'}
            </h3>
            <div className='mb-4'>
              <label className='text-secondary mb-1.5 block text-xs font-semibold'>标题</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder='例如：毕业设计进度' className={fieldCls} />
            </div>
            <div className='mb-4'>
              <label className='text-secondary mb-1.5 block text-xs font-semibold'>概要</label>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder='一句话描述这张卡片的内容…'
                rows={3}
                className={`${fieldCls} resize-none`}
              />
            </div>
            <div className='flex justify-end gap-2.5'>
              <button onClick={() => setModal(null)} className='rounded-xl border bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'>
                取消
              </button>
              <button onClick={() => requireAuth(submitMain)} className='brand-btn px-5'>
                {modal.card ? '保存' : '创建'}
              </button>
            </div>
          </div>
        )}
      </DialogModal>

      {/* 子卡片弹窗 */}
      <DialogModal open={modal?.type === 'sub-card'} onClose={() => setModal(null)} className='card static w-[470px] max-sm:w-full'>
        {modal?.type === 'sub-card' && (
          <div>
            <h3 className='mb-4 flex items-center gap-2 text-lg font-bold'>
              <FileText className='text-brand h-5 w-5' />
              {modal.sub ? '编辑子卡片' : '添加子卡片'}
            </h3>
            <div className='mb-4'>
              <label className='text-secondary mb-1.5 block text-xs font-semibold'>文本</label>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder='记录要点、想法…' rows={3} className={`${fieldCls} resize-none`} />
            </div>
            <div className='mb-4'>
              <label className='text-secondary mb-1.5 block text-xs font-semibold'>时间</label>
              <input type='datetime-local' value={time} onChange={e => setTime(e.target.value)} className={fieldCls} />
            </div>
            <div className='mb-4'>
              <label className='text-secondary mb-1.5 block text-xs font-semibold'>备注</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder='补充信息、来源、待办…' rows={2} className={`${fieldCls} resize-none`} />
            </div>
            <div className='flex justify-end gap-2.5'>
              <button onClick={() => setModal(null)} className='rounded-xl border bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'>
                取消
              </button>
              <button onClick={() => requireAuth(submitSub)} className='brand-btn px-5'>
                {modal.sub ? '保存' : '添加'}
              </button>
            </div>
          </div>
        )}
      </DialogModal>

      {/* 子卡片阅读模式弹窗（像看书一样自然） */}
      <DialogModal open={modal?.type === 'view-sub'} onClose={() => setModal(null)} className='card static w-[580px] max-w-[94vw] max-sm:w-full'>
        {modal?.type === 'view-sub' && (
          <div>
            <div className='max-h-[68vh] overflow-y-auto pr-1 pt-1 pb-2'>
              {/* 标题：有正文时 text 作标题 */}
              {modal.sub.text && modal.sub.note && (
                <h3 className='mb-3 text-[22px] leading-snug font-bold text-gray-900 break-words'>{modal.sub.text}</h3>
              )}
              {/* 元信息行 */}
              {(modal.sub.time || modal.card.title) && (
                <div className='text-secondary mb-5 flex items-center gap-2 border-b border-dashed pb-4 text-xs'>
                  {modal.sub.time && (
                    <>
                      <Clock3 className='h-3.5 w-3.5 shrink-0' />
                      <span>{fmtTime(modal.sub.time)}</span>
                    </>
                  )}
                  {modal.sub.time && modal.card.title && <span className='text-gray-300'>·</span>}
                  {modal.card.title && <span className='truncate'>{modal.card.title}</span>}
                </div>
              )}
              {/* 正文 */}
              <p className='text-[15px] leading-[2] whitespace-pre-wrap break-words text-gray-700'>
                {modal.sub.note || modal.sub.text || '（空记录）'}
              </p>
            </div>
            <div className='mt-4 flex justify-end gap-2.5 border-t border-gray-100 pt-4'>
              <button
                onClick={() => {
                  const c = modal.card
                  const s = modal.sub
                  setModal(null)
                  openSubModal(c, s)
                }}
                className='rounded-xl border bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'
              >
                编辑
              </button>
              <button onClick={() => setModal(null)} className='brand-btn px-5'>
                关闭
              </button>
            </div>
          </div>
        )}
      </DialogModal>
    </div>
  )
}







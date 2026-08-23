'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Plus, X, Check, Calendar, Trash2, ListChecks, Tags, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import initialList from './list.json'
import { getFestival } from './festivals'
import { pushSchedule } from './services/push-schedule'
import type { ScheduleItem, SubTask, CustomField } from './services/push-schedule'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')

let uid = 0
const nextId = () => 'id_' + Date.now().toString(36) + '_' + (uid++).toString(36)

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const newSubTask = (): SubTask => ({ id: nextId(), title: '', description: '', done: false })
const newField = (): CustomField => ({ id: nextId(), key: '', value: '' })
const newItem = (date?: string): ScheduleItem => ({
  id: nextId(),
  date: date ?? dayjs().format('YYYY-MM-DD'),
  title: '',
  description: '',
  done: false,
  subTasks: [],
  fields: []
})
const cloneItem = (item: ScheduleItem): ScheduleItem => ({
  ...item,
  subTasks: item.subTasks.map(s => ({ ...s })),
  fields: item.fields.map(f => ({ ...f }))
})

interface CardDetailProps {
  draft: ScheduleItem
  setDraft: (d: ScheduleItem) => void
}

function CardDetail({ draft, setDraft }: CardDetailProps) {
  const update = (patch: Partial<ScheduleItem>) => setDraft({ ...draft, ...patch })

  const updateSubTask = (id: string, patch: Partial<SubTask>) => {
    update({ subTasks: draft.subTasks.map(s => (s.id === id ? { ...s, ...patch } : s)) })
  }
  const removeSubTask = (id: string) => {
    update({ subTasks: draft.subTasks.filter(s => s.id !== id) })
  }
  const updateField = (id: string, patch: Partial<CustomField>) => {
    update({ fields: draft.fields.map(f => (f.id === id ? { ...f, ...patch } : f)) })
  }
  const removeField = (id: string) => {
    update({ fields: draft.fields.filter(f => f.id !== id) })
  }

  return (
    <div className='space-y-5'>
      {/* 基础信息 */}
      <div className='flex items-center justify-between gap-3'>
        <input
          type='date'
          value={draft.date}
          onChange={e => update({ date: e.target.value })}
          className='rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm'
        />
        <button
          onClick={() => update({ done: !draft.done })}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            draft.done ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600'
          }`}
        >
          <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${draft.done ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
            {draft.done && <Check className='h-3 w-3 text-white' />}
          </span>
          {draft.done ? '已完成' : '未完成'}
        </button>
      </div>
      <input
        type='text'
        value={draft.title}
        onChange={e => update({ title: e.target.value })}
        placeholder='任务标题'
        className='w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base font-medium focus:outline-none'
      />
      <textarea
        value={draft.description}
        onChange={e => update({ description: e.target.value })}
        placeholder='任务描述（可选）'
        rows={2}
        className='w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none'
      />

      {/* 子任务 */}
      <div className='rounded-xl border border-gray-100 bg-gray-50/60 p-3'>
        <div className='mb-2 flex items-center justify-between'>
          <p className='flex items-center gap-1.5 text-sm font-medium text-gray-700'>
            <ListChecks className='h-4 w-4' />
            子任务
          </p>
          <button
            onClick={() => update({ subTasks: [...draft.subTasks, newSubTask()] })}
            className='flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-brand hover:text-brand'
          >
            <Plus className='h-3 w-3' />
            添加子任务
          </button>
        </div>
        {draft.subTasks.length === 0 && (
          <p className='py-2 text-center text-xs text-gray-400'>暂无子任务</p>
        )}
        <div className='space-y-2'>
          {draft.subTasks.map(sub => (
            <div key={sub.id} className='flex items-start gap-2 rounded-lg bg-white p-2'>
              <button
                onClick={() => updateSubTask(sub.id, { done: !sub.done })}
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  sub.done ? 'border-green-500 bg-green-500' : 'border-gray-300'
                }`}
              >
                {sub.done && <Check className='h-3 w-3 text-white' />}
              </button>
              <div className='flex-1 space-y-1'>
                <input
                  type='text'
                  value={sub.title}
                  onChange={e => updateSubTask(sub.id, { title: e.target.value })}
                  placeholder='子任务标题'
                  className={`w-full bg-transparent text-sm focus:outline-none ${sub.done ? 'text-gray-400 line-through' : ''}`}
                />
                <input
                  type='text'
                  value={sub.description}
                  onChange={e => updateSubTask(sub.id, { description: e.target.value })}
                  placeholder='子任务描述（可选）'
                  className='w-full bg-transparent text-xs text-gray-500 focus:outline-none'
                />
              </div>
              <button
                onClick={() => removeSubTask(sub.id)}
                className='text-gray-300 transition-colors hover:text-red-500'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 自定义字段 */}
      <div className='rounded-xl border border-gray-100 bg-gray-50/60 p-3'>
        <div className='mb-2 flex items-center justify-between'>
          <p className='flex items-center gap-1.5 text-sm font-medium text-gray-700'>
            <Tags className='h-4 w-4' />
            自定义字段
          </p>
          <button
            onClick={() => update({ fields: [...draft.fields, newField()] })}
            className='flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-brand hover:text-brand'
          >
            <Plus className='h-3 w-3' />
            添加字段
          </button>
        </div>
        {draft.fields.length === 0 && (
          <p className='py-2 text-center text-xs text-gray-400'>暂无自定义字段（如优先级、标签、链接等）</p>
        )}
        <div className='space-y-2'>
          {draft.fields.map(field => (
            <div key={field.id} className='flex items-center gap-2 rounded-lg bg-white p-2'>
              <input
                type='text'
                value={field.key}
                onChange={e => updateField(field.id, { key: e.target.value })}
                placeholder='字段名（如 优先级）'
                className='w-1/3 bg-transparent text-sm font-medium focus:outline-none'
              />
              <input
                type='text'
                value={field.value}
                onChange={e => updateField(field.id, { value: e.target.value })}
                placeholder='字段值（如 高）'
                className='flex-1 bg-transparent text-sm text-gray-600 focus:outline-none'
              />
              <button
                onClick={() => removeField(field.id)}
                className='text-gray-300 transition-colors hover:text-red-500'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ScheduleCardProps {
  item: ScheduleItem
  onOpen: (item: ScheduleItem) => void
}

function DetailCard({ item, onOpen }: ScheduleCardProps) {
  const doneSubTasks = item.subTasks.filter(s => s.done).length
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen(item)}
      className={`group relative w-full rounded-xl border bg-white/70 p-3.5 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        item.done ? 'opacity-60' : ''
      }`}
    >
      <div className='mb-1.5 flex items-center justify-between gap-2'>
        <p className={`text-sm font-medium ${item.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {item.title || '未命名任务'}
        </p>
        {item.done && (
          <span className='flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700'>
            <Check className='h-3 w-3' />
            已完成
          </span>
        )}
      </div>
      {item.description && (
        <p className='line-clamp-2 text-xs leading-relaxed text-gray-500'>{item.description}</p>
      )}
      {(item.subTasks.length > 0 || item.fields.length > 0) && (
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          {item.subTasks.length > 0 && (
            <span className='flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-600'>
              <ListChecks className='h-3 w-3' />
              {doneSubTasks}/{item.subTasks.length} 子任务
            </span>
          )}
          {item.fields.length > 0 && (
            <span className='flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs text-purple-600'>
              <Tags className='h-3 w-3' />
              {item.fields.length} 字段
            </span>
          )}
        </div>
      )}
    </motion.button>
  )
}

export default function Page() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialList as ScheduleItem[])
  const [originalSchedule, setOriginalSchedule] = useState<ScheduleItem[]>(initialList as ScheduleItem[])
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ScheduleItem | null>(null)
  const [viewMonth, setViewMonth] = useState(() => dayjs().format('YYYY-MM'))
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [pendingEdit, setPendingEdit] = useState(false)
  const keyInputRef = useRef<HTMLInputElement>(null)
  const { isAuth, setPrivateKey } = useAuthStore()
  const { siteContent } = useConfigStore()
  const hideEditButton = siteContent.hideEditButton ?? false

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        if (!isAuth) {
          setPendingEdit(true)
          keyInputRef.current?.click()
        } else {
          setIsEditMode(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode, isAuth])

  // 初始化：优先读取 localStorage 缓存，实现与时间轴页数据联动
  useEffect(() => {
    const cached = localStorage.getItem('schedule_cache_v1')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) {
          setSchedule(parsed)
          setOriginalSchedule(parsed)
        }
      } catch {}
    }
  }, [])

  // schedule 变化时自动同步到 localStorage，保证时间轴页随时联动
  useEffect(() => {
    localStorage.setItem('schedule_cache_v1', JSON.stringify(schedule))
  }, [schedule])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await pushSchedule({ schedule })
      setOriginalSchedule(schedule)
      setIsEditMode(false)
      toast.success('保存成功！')
    } catch (error: any) {
      console.error('Failed to save schedule:', error)
      toast.error(`保存失败: ${error?.message || '未知错误'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveClick = () => {
    if (!isAuth) {
      keyInputRef.current?.click()
    } else {
      void handleSave()
    }
  }

  const handleCancel = () => {
    setSchedule(originalSchedule)
    setIsEditMode(false)
    setEditingId(null)
    setDraft(null)
  }

  const handleChoosePrivateKey = async (file: File) => {
    try {
      const text = await file.text()
      await setPrivateKey(text)
      if (pendingEdit) {
        setPendingEdit(false)
        setIsEditMode(true)
      } else {
        await handleSave()
      }
    } catch (error) {
      console.error('Failed to read private key:', error)
      toast.error('读取密钥文件失败')
    }
  }

  const openEdit = (item: ScheduleItem) => {
    setEditingId(item.id)
    setDraft(cloneItem(item))
  }

  const handleAddNew = (date?: string) => {
    const item = newItem(date)
    setSchedule(prev => [...prev, item])
    setEditingId(item.id)
    setDraft(cloneItem(item))
  }

  const handleDelete = (id: string) => {
    setSchedule(prev => prev.filter(i => i.id !== id))
    toast.success('已删除')
  }

  const applyDraft = () => {
    if (!draft || !editingId) return
    const title = draft.title.trim()
    if (!title) {
      toast.error('请填写任务标题')
      return
    }
    setSchedule(prev => prev.map(i => (i.id === editingId ? cloneItem(draft) : i)))
    setEditingId(null)
    setDraft(null)
  }

  const closeDraft = () => {
    setEditingId(null)
    setDraft(null)
  }

  /* ---------- 日历数据 ---------- */
  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>()
    schedule.forEach(item => {
      const arr = map.get(item.date)
      if (arr) arr.push(item)
      else map.set(item.date, [item])
    })
    return map
  }, [schedule])

  const monthStart = dayjs(viewMonth).startOf('month')
  const firstWeekday = monthStart.day() // 0 = 周日
  const totalCells = Math.ceil((firstWeekday + monthStart.daysInMonth()) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => monthStart.add(i - firstWeekday, 'day'))
  const todayStr = dayjs().format('YYYY-MM-DD')

  const switchMonth = (diff: number) => {
    const m = diff >= 0 ? monthStart.add(diff, 'month') : monthStart.subtract(-diff, 'month')
    setViewMonth(m.format('YYYY-MM'))
    if (!m.isSame(dayjs(selectedDate), 'month')) {
      setSelectedDate(m.format('YYYY-MM-DD'))
    }
  }

  const goToday = () => {
    setViewMonth(dayjs().format('YYYY-MM'))
    setSelectedDate(todayStr)
  }

  const buttonText = isAuth ? '保存' : '导入密钥'
  const selectedItems = byDate.get(selectedDate) ?? []
  const total = schedule.length
  const done = schedule.filter(i => i.done).length

  return (
    <>
      <input
        ref={keyInputRef}
        type='file'
        accept='.pem'
        className='hidden'
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file) await handleChoosePrivateKey(file)
          if (e.currentTarget) e.currentTarget.value = ''
        }}
      />
      <div className='mx-auto max-w-5xl px-6 py-16 max-sm:px-4'>
        {/* 标题栏 */}
        <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <span className='flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 ring-1 ring-brand/10'>
              <Calendar className='text-brand h-5 w-5' />
            </span>
            <h1 className='text-xl font-semibold leading-tight'>日程计划</h1>
          </div>
          {/* 月份切换 */}
          <div className='flex items-center gap-1.5'>
            <button
              onClick={() => switchMonth(-1)}
              className='bg-card flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:border-brand hover:text-brand hover:shadow-sm'
              aria-label='上一月'
            >
              <ChevronLeft className='h-4 w-4' />
            </button>
            <span className='min-w-[110px] bg-gradient-to-r from-brand to-purple-500 bg-clip-text text-center text-sm font-bold tabular-nums text-transparent'>{monthStart.format('YYYY年M月')}</span>
            <button
              onClick={() => switchMonth(1)}
              className='bg-card flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:border-brand hover:text-brand hover:shadow-sm'
              aria-label='下一月'
            >
              <ChevronRight className='h-4 w-4' />
            </button>
            <button
              onClick={goToday}
              className='ml-1 rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition-all hover:bg-brand hover:text-white'
            >
              今天
            </button>
          </div>
        </div>

        {/* 日历容器：渐变光晕背景 */}
        <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand/5 via-transparent to-purple-500/5 p-3 max-sm:p-1.5'>
          {/* 背景装饰光斑 */}
          <span aria-hidden className='pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-brand/10 blur-3xl' />
          <span aria-hidden className='pointer-events-none absolute -bottom-14 -left-14 h-48 w-48 rounded-full bg-purple-400/10 blur-3xl' />

          {/* 星期表头 */}
          <div className='grid grid-cols-7 gap-px overflow-hidden rounded-t-2xl border border-b-0 border-gray-100 bg-gray-100'>
            {WEEK_LABELS.map((w, i) => (
              <div
                key={w}
                className={`py-2.5 text-center text-xs font-medium ${
                  i === 0 || i === 6 ? 'bg-brand/5 text-brand' : 'bg-white/80 text-gray-500'
                }`}
              >
                周{w}
              </div>
            ))}
          </div>

          {/* 日历网格 */}
          <div className='grid grid-cols-7 gap-px overflow-hidden rounded-b-2xl border border-gray-100 bg-gray-100'>
          {cells.map(day => {
              const dateStr = day.format('YYYY-MM-DD')
              const inMonth = day.month() === monthStart.month()
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const dayItems = byDate.get(dateStr) ?? []
              const visibleItems = dayItems.slice(0, 2)
              const moreCount = dayItems.length - visibleItems.length
              const isWeekend = day.day() === 0 || day.day() === 6
              const festival = getFestival(dateStr)
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`group relative flex min-h-[76px] flex-col gap-1 p-1.5 text-left align-top transition-all sm:min-h-[96px] sm:p-2 ${
                    inMonth ? (isToday ? 'bg-brand/[0.04]' : 'bg-white') : 'bg-gray-50/60'} ${isSelected ? 'ring-2 ring-inset ring-brand' : 'hover:bg-brand/5 hover:shadow-sm'} ${!inMonth ? 'opacity-45' : ''}`}
                >
                  {/* 有日程的日期加左上角小角标 */}
                  {dayItems.length > 0 && inMonth && !isSelected && (
                    <span className='absolute left-0 top-0 h-1.5 w-1.5 rounded-tr-full rounded-bl-full bg-brand/40' />
                  )}
                  <span
                    className={`relative mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs transition-transform group-hover:scale-110 sm:ml-0 sm:mr-auto ${
                      isToday
                        ? 'bg-brand text-white shadow-md shadow-brand/30'
                        : isSelected
                          ? 'bg-brand/10 font-semibold text-brand'
                          : isWeekend && inMonth
                            ? 'text-brand/70 group-hover:text-brand'
                            : inMonth
                              ? 'text-gray-700 group-hover:text-brand'
                              : 'text-gray-400'
                    }`}
                  >
                  {isToday && (
                    <span aria-hidden className='absolute inset-0 animate-ping rounded-full bg-brand opacity-40 [animation-duration:2.2s]' />
                  )}
                  <span className='relative'>{day.date()}</span>
                </span>
                <div className='hidden w-full flex-col gap-1 sm:flex'>
                  {visibleItems.map(item => (
                    <span
                      key={item.id}
                      onClick={e => {
                        e.stopPropagation()
                        openEdit(item)
                      }}
                      role='button'
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.stopPropagation()
                          openEdit(item)
                        }
                      }}
                      title={item.title}
                      className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] leading-snug transition-all group-hover:translate-x-0.5 hover:opacity-80 ${
                        item.done ? 'bg-green-50 text-green-600 line-through' : 'bg-brand/10 text-brand'
                      }`}
                    >
                      {item.title || '未命名'}
                    </span>
                  ))}
                  {moreCount > 0 && (
                    <span className='text-secondary px-1.5 text-[11px]'>还有 {moreCount} 条…</span>
                  )}
                </div>
                {/* 节日角标 */}
                {inMonth && festival && (
                  <span
                    title={festival.name}
                    className={`pointer-events-none absolute right-1 bottom-1 flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] leading-none font-medium ${festival.cls}`}
                  >
                    <span className='text-[11px] leading-none'>{festival.emoji}</span>
                    <span className='max-sm:hidden'>{festival.name}</span>
                  </span>
                )}
                {/* 小屏圆点标记 */}
                {dayItems.length > 0 && (
                  <div className='mx-auto mt-auto flex items-center gap-0.5 sm:hidden'>
                    {dayItems.slice(0, 3).map(item => (
                      <span
                        key={item.id}
                        className={`h-1.5 w-1.5 rounded-full ${item.done ? 'bg-green-400' : 'bg-brand'}`}
                      />
                    ))}
                  </div>
                )}
                </button>
              )
            })}
            </div>

            {/* 选中日期详情 */}
            <motion.div layout className='mt-4'>
              <div className='mb-3 flex items-center justify-between'>
                <p className='flex items-center gap-2 text-sm font-medium text-gray-700'>
                  <CalendarDays className='text-brand h-4 w-4' />
                  {dayjs(selectedDate).format('M月D日')}
                  <span className='text-secondary font-normal'>
                    · {selectedItems.length > 0 ? `${selectedItems.length} 项日程` : '暂无日程'}
                  </span>
                </p>
                {isEditMode && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAddNew(selectedDate)}
                    className='flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:border-brand hover:text-brand'
                  >
                    <Plus className='h-3.5 w-3.5' />
                    添加到此日
                  </motion.button>
                )}
              </div>
              {selectedItems.length > 0 ? (
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                  {selectedItems.map(item => (
                    <div key={item.id} className='relative'>
                      <DetailCard item={item} onOpen={openEdit} />
                      {isEditMode && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className='absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500 shadow-sm transition-colors hover:bg-red-500 hover:text-white'
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                !isEditMode && (
                  <div className='flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 py-10 text-center'>
                    <CalendarDays className='text-gray-200 h-10 w-10' />
                    <p className='text-secondary text-sm'>这一天没有安排</p>
                    <p className='text-secondary text-xs'>点击右上角「编辑」可添加日程</p>
                  </div>
                )
              )}
            </motion.div>
          </div>
        </div>

      {/* 右上角操作按钮 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        className='fixed top-4 right-6 z-50 flex gap-3 max-sm:hidden'
      >
        {isEditMode ? (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              disabled={isSaving}
              className='rounded-xl border bg-white/60 px-6 py-2 text-sm'
            >
              取消
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveClick}
              disabled={isSaving}
              className='brand-btn px-6'
            >
              {isSaving ? '保存中...' : buttonText}
            </motion.button>
          </>
        ) : (
          !hideEditButton && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!isAuth) {
                  setPendingEdit(true)
                  keyInputRef.current?.click()
                } else {
                  setIsEditMode(true)
                }
              }}
              className='bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'
            >
              编辑
            </motion.button>
          )
        )}
      </motion.div>

      {/* 编辑弹窗 */}
      <DialogModal
        open={editingId !== null && draft !== null}
        onClose={closeDraft}
        className='card static w-[640px] max-sm:w-full'
      >
        {draft && (
          <div className='space-y-4'>
            <CardDetail draft={draft} setDraft={setDraft} />
            <div className='flex gap-3'>
              <button
                onClick={closeDraft}
                className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'
              >
                取消
              </button>
              <button onClick={applyDraft} className='brand-btn flex-1 justify-center px-4'>
                确定
              </button>
            </div>
          </div>
        )}
      </DialogModal>
    </>
  )
}

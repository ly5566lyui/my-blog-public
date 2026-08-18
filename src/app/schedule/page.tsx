'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Plus, X, Check, Calendar, Trash2, ListChecks, Tags } from 'lucide-react'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import initialList from './list.json'
import { pushSchedule } from './services/push-schedule'
import type { ScheduleItem, SubTask, CustomField } from './services/push-schedule'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')

let uid = 0
const nextId = () => 'id_' + Date.now().toString(36) + '_' + (uid++).toString(36)

const newSubTask = (): SubTask => ({ id: nextId(), title: '', description: '', done: false })
const newField = (): CustomField => ({ id: nextId(), key: '', value: '' })
const newItem = (): ScheduleItem => ({
  id: nextId(),
  date: dayjs().format('YYYY-MM-DD'),
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
}interface ScheduleCardProps {
  item: ScheduleItem
  isEditMode: boolean
  onOpen: (item: ScheduleItem) => void
  onDelete: (id: string) => void
}

function ScheduleCard({ item, isEditMode, onOpen, onDelete }: ScheduleCardProps) {
  const doneSubTasks = item.subTasks.filter(s => s.done).length
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-2xl border bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        item.done ? 'opacity-60' : ''
      }`}
    >
      <button onClick={() => onOpen(item)} className='w-full text-left'>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <span className='flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand'>
            <Calendar className='h-3 w-3' />
            {dayjs(item.date).format('M月D日')}
          </span>
          {item.done && (
            <span className='flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700'>
              <Check className='h-3 w-3' />
              已完成
            </span>
          )}
        </div>
        <p className={`text-base font-medium ${item.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {item.title || '未命名任务'}
        </p>
        {item.description && (
          <p className='mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500'>{item.description}</p>
        )}
        {(item.subTasks.length > 0 || item.fields.length > 0) && (
          <div className='mt-3 flex flex-wrap items-center gap-2'>
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
      </button>
      {isEditMode && (
        <button
          onClick={() => onDelete(item.id)}
          className='absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-red-500 hover:text-white'
        >
          <Trash2 className='h-3.5 w-3.5' />
        </button>
      )}
    </motion.div>
  )
}

export default function Page() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialList as ScheduleItem[])
  const [originalSchedule, setOriginalSchedule] = useState<ScheduleItem[]>(initialList as ScheduleItem[])
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ScheduleItem | null>(null)
  const keyInputRef = useRef<HTMLInputElement>(null)
  const { isAuth, setPrivateKey } = useAuthStore()
  const { siteContent } = useConfigStore()
  const hideEditButton = siteContent.hideEditButton ?? false

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setIsEditMode(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode])

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
  }const handleCancel = () => {
    setSchedule(originalSchedule)
    setIsEditMode(false)
    setEditingId(null)
    setDraft(null)
  }

  const handleChoosePrivateKey = async (file: File) => {
    try {
      const text = await file.text()
      await setPrivateKey(text)
      await handleSave()
    } catch (error) {
      console.error('Failed to read private key:', error)
      toast.error('读取密钥文件失败')
    }
  }

  const openEdit = (item: ScheduleItem) => {
    setEditingId(item.id)
    setDraft(cloneItem(item))
  }

  const handleAddNew = () => {
    const item = newItem()
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

  const buttonText = isAuth ? '保存' : '导入密钥'
  const sortedList = [...schedule].sort((a, b) => b.date.localeCompare(a.date))
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
      <div className='mx-auto max-w-4xl px-6 py-16'>
        <div className='mb-8 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Calendar className='text-brand h-6 w-6' />
            <h1 className='text-xl font-medium'>日程计划</h1>
          </div>
          {total > 0 && (
            <div className='text-secondary text-sm'>
              已完成 {done}/{total}
            </div>
          )}
        </div>

        {sortedList.length === 0 && !isEditMode ? (
          <div className='text-secondary flex min-h-[40vh] items-center justify-center'>
            <p>暂无日程安排，点击右上角编辑添加</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {sortedList.map(item => (
              <ScheduleCard
                key={item.id}
                item={item}
                isEditMode={isEditMode}
                onOpen={openEdit}
                onDelete={handleDelete}
              />
            ))}
            {isEditMode && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddNew}
                className='flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-brand hover:text-brand'
              >
                <Plus className='h-6 w-6' />
                <span className='text-sm'>添加新日程</span>
              </motion.button>
            )}
          </div>
        )}
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
              onClick={() => setIsEditMode(true)}
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
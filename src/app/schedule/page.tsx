'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Plus, X, Check, Calendar } from 'lucide-react'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import initialList from './list.json'
import { pushSchedule } from './services/push-schedule'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

interface ScheduleItem {
date: string
content: string
done: boolean
}

export default function Page() {
const [schedule, setSchedule] = useState<ScheduleItem[]>(initialList as ScheduleItem[])
const [originalSchedule, setOriginalSchedule] = useState<ScheduleItem[]>(initialList as ScheduleItem[])
const [isEditMode, setIsEditMode] = useState(false)
const [isSaving, setIsSaving] = useState(false)
const [isManageOpen, setIsManageOpen] = useState(false)
const [draftSchedule, setDraftSchedule] = useState<ScheduleItem[]>([])
const [newContent, setNewContent] = useState('')
const [newDate, setNewDate] = useState(dayjs().format('YYYY-MM-DD'))
const keyInputRef = useRef<HTMLInputElement>(null)
const addInputRef = useRef<HTMLInputElement>(null)
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
}

const handleCancel = () => {
setSchedule(originalSchedule)
setIsEditMode(false)
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

const openManageDialog = () => {
setDraftSchedule(schedule)
setNewContent('')
setIsManageOpen(true)
}

const handleAddDraft = () => {
const value = newContent.trim()
if (!value) {
toast.error('请输入日程内容')
return
}
setDraftSchedule(prev => [...prev, { date: newDate, content: value, done: false }])
setNewContent('')
}

const handleRemoveDraft = (index: number) => {
setDraftSchedule(prev => prev.filter((_, i) => i !== index))
}

const handleToggleDone = (index: number) => {
setDraftSchedule(prev => prev.map((item, i) => i === index ? { ...item, done: !item.done } : item))
}

const handleDateChange = (index: number, date: string) => {
setDraftSchedule(prev => prev.map((item, i) => i === index ? { ...item, date } : item))
}

const applyManageChanges = () => {
const cleaned = draftSchedule.map(item => ({
...item,
content: item.content.trim()
})).filter(item => item.content)
if (cleaned.length === 0) {
toast.error('请至少添加一条日程')
return
}
setSchedule(cleaned)
setIsManageOpen(false)
toast.success('已更新列表')
}

const cancelManageChanges = () => {
setIsManageOpen(false)
setDraftSchedule([])
setNewContent('')
}

const buttonText = isAuth ? '保存' : '导入密钥'

const groupedSchedule = useMemo(() => {
const groups: Record<string, ScheduleItem[]> = {}
const sorted = [...schedule].sort((a, b) => b.date.localeCompare(a.date))
sorted.forEach(item => {
if (!groups[item.date]) groups[item.date] = []
groups[item.date].push(item)
})
return groups
}, [schedule])

const sortedDates = Object.keys(groupedSchedule).sort((a, b) => b.localeCompare(a))
const total = schedule.length
const done = schedule.filter(i => i.done).length

// Inline add (only in edit mode)
const handleInlineAdd = () => {
const value = newContent.trim()
if (!value) {
toast.error('请输入日程内容')
return
}
const newItem: ScheduleItem = { date: newDate, content: value, done: false }
setSchedule(prev => [...prev, newItem])
setNewContent('')
// Auto save
toast.success('已添加，点击保存按钮提交到仓库')
}

const handleInlineToggleDone = (index: number) => {
const flatList = [...schedule].sort((a, b) => b.date.localeCompare(a.date))
const total = flatList.length
const actualIndex = total - 1 - index
setSchedule(prev => prev.map((item, i) => i === actualIndex ? { ...item, done: !item.done } : item))
}

return (
<>
<input ref={keyInputRef} type='file' accept='.pem' className='hidden'
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

{/* Inline add bar - always visible in edit mode */}
{isEditMode && (
<div className='mb-6 flex items-center gap-3 rounded-xl border bg-white/60 p-3'>
<input
type='date'
value={newDate}
onChange={e => setNewDate(e.target.value)}
className='w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm'
/>
<input
ref={addInputRef}
type='text'
value={newContent}
onChange={e => setNewContent(e.target.value)}
onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAdd() } }}
placeholder='输入日程内容，回车添加'
className='flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none'
/>
<motion.button
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
onClick={handleInlineAdd}
className='brand-btn flex items-center gap-1 px-4 py-2 text-sm'>
<Plus className='h-4 w-4' />
添加
</motion.button>
</div>
)}

{sortedDates.length === 0 && !isEditMode ? (
<div className='text-secondary flex min-h-[40vh] items-center justify-center'>
<p>暂无日程安排，点击右上角编辑添加</p>
</div>
) : (
<div className='space-y-8'>
{sortedDates.map(date => (
<div key={date}>
<h2 className='text-secondary mb-3 text-sm font-medium'>{dayjs(date).format('YYYY年M月D日 dddd')}</h2>
<div className='space-y-2'>
{groupedSchedule[date].map((item, index) => (
<div key={index} className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${item.done ? 'opacity-50' : ''}`}>
<div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${item.done ? 'bg-brand border-brand' : 'border-gray-300'}`}>
{item.done && <Check className='h-3 w-3 text-white' />}
</div>
<p className={`flex-1 leading-relaxed ${item.done ? 'line-through text-gray-400' : ''}`}>{item.content}</p>
</div>
))}
</div>
</div>
))}
</div>
)}
</div>

{/* Edit mode buttons */}
<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='fixed top-4 right-6 z-50 flex gap-3 max-sm:hidden'>
{isEditMode ? (
<>
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCancel} disabled={isSaving} className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>取消</motion.button>
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openManageDialog} className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>批量管理</motion.button>
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={isSaving} className='brand-btn px-6'>{isSaving ? '保存中...' : buttonText}</motion.button>
</>
) : (
!hideEditButton && (
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsEditMode(true)} className='bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>编辑</motion.button>
)
)}
</motion.div>

{/* Manage dialog */}
<DialogModal open={isManageOpen} onClose={cancelManageChanges} className='card static w-[600px] max-sm:w-full'>
<div className='space-y-4'>
<div className='flex items-center gap-3'>
<input type='text' value={newContent} onChange={e => setNewContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDraft() } }} placeholder='新增日程' className='flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none' />
<button onClick={handleAddDraft} className='brand-btn flex items-center gap-1 px-4 py-2 text-sm'><Plus className='h-4 w-4' />新增</button>
</div>
<div className='max-h-[400px] space-y-2 overflow-y-auto pr-1'>
{draftSchedule.length === 0 && <p className='text-secondary py-6 text-center text-sm'>暂无内容</p>}
{draftSchedule.map((item, index) => (
<div key={index} className='group flex items-start gap-3 rounded-lg px-3 py-2 text-sm'>
<button onClick={() => handleToggleDone(index)} className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${item.done ? 'bg-brand border-brand' : 'border-gray-300'}`}>
{item.done && <Check className='h-3 w-3 text-white' />}
</button>
<input type='date' value={item.date} onChange={e => handleDateChange(index, e.target.value)} className='w-32 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs' />
<p className={`flex-1 leading-relaxed text-gray-800 ${item.done ? 'line-through text-gray-400' : ''}`}>{item.content}</p>
<button onClick={() => handleRemoveDraft(index)} className='text-gray-400 transition-colors hover:text-red-500'><X className='h-4 w-4' /></button>
</div>
))}
</div>
<div className='mt-4 flex gap-3'>
<button onClick={cancelManageChanges} className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'>取消</button>
<button onClick={applyManageChanges} className='brand-btn flex-1 justify-center px-4'>保存</button>
</div>
</div>
</DialogModal>
</>
)
}

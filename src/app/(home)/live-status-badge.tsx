'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Moon, Radio, Save, LoaderCircle, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { readFileAsText } from '@/lib/file-utils'
import { pushJsonFile } from '@/lib/push-json'
import initialStatus from '@/config/live-status.json'

export type LiveStatus = {
	emoji: string
	text: string
	activity: string
	mode: 'online' | 'busy' | 'sleepy' | 'away'
	autoSleepy: boolean
	sleepStartHour: number
	sleepEndHour: number
	updatedAt: string
}

const STORAGE_KEY = 'mcy-live-status-v1'

const PRESETS: Array<Pick<LiveStatus, 'emoji' | 'text' | 'activity' | 'mode'>> = [
	{ emoji: '💻', text: '正在写代码', activity: '在 VS Code 里折腾项目', mode: 'online' },
	{ emoji: '🎮', text: '正在打鸣潮', activity: '索拉里斯探险中', mode: 'busy' },
	{ emoji: '🎧', text: '听歌摸鱼中', activity: '戴着耳机放空', mode: 'online' },
	{ emoji: '📚', text: '正在学习', activity: '认真啃文档和笔记', mode: 'busy' },
	{ emoji: '☕', text: '咖啡续命', activity: '短暂休息一下', mode: 'away' },
	{ emoji: '💤', text: '正在梦游', activity: '电量不足，稍后再联系', mode: 'sleepy' }
]

function isNightSleepHour(start: number, end: number): boolean {
	const hour = new Date().getHours()
	if (start <= end) return hour >= start && hour < end
	return hour >= start || hour < end
}

export default function LiveStatusBadge() {
	const { isAuth, setPrivateKey } = useAuthStore()
	const keyInputRef = useRef<HTMLInputElement>(null)
	const [status, setStatus] = useState<LiveStatus>(initialStatus as LiveStatus)
	const [open, setOpen] = useState(false)
	const [draft, setDraft] = useState<LiveStatus>(initialStatus as LiveStatus)
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY)
			if (raw) {
				const parsed = JSON.parse(raw) as LiveStatus
				if (parsed?.updatedAt && new Date(parsed.updatedAt).getTime() > new Date(initialStatus.updatedAt).getTime()) {
					setStatus(parsed)
					setDraft(parsed)
				}
			}
		} catch {
			// ignore invalid storage
		}
	}, [])

	const effective = useMemo(() => {
		const sleepyNow = status.autoSleepy && isNightSleepHour(status.sleepStartHour, status.sleepEndHour)
		if (sleepyNow) {
			return {
				emoji: '💤',
				text: '深夜梦游中',
				activity: `自动休眠时段（${status.sleepStartHour}:00 - ${status.sleepEndHour}:00）`,
				mode: 'sleepy' as const
			}
		}
		return status
	}, [status])

	const dotClass =
		effective.mode === 'online'
			? 'bg-emerald-400'
			: effective.mode === 'busy'
				? 'bg-amber-400'
				: effective.mode === 'sleepy'
					? 'bg-indigo-400'
					: 'bg-slate-400'

	const saveToGitHub = async (next: LiveStatus) => {
		setIsSaving(true)
		try {
			await pushJsonFile('src/config/live-status.json', next, `chore(status): 更新在线状态为「${next.text}」`)
			setStatus(next)
			setDraft(next)
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
			toast.success('在线状态已同步到仓库，部署后全站生效')
			setOpen(false)
		} catch (error: any) {
			console.error('[LiveStatus] 同步失败', error)
			toast.error(`同步失败：${error?.message || '请检查密钥或网络'}`)
		} finally {
			setIsSaving(false)
		}
	}

	const handlePublishClick = () => {
		const next: LiveStatus = {
			...draft,
			text: draft.text.trim() || '在线中',
			updatedAt: new Date().toISOString()
		}
		if (!isAuth) {
			setDraft(next)
			keyInputRef.current?.click()
			return
		}
		void saveToGitHub(next)
	}

	const handleLocalPreview = () => {
		const next: LiveStatus = {
			...draft,
			text: draft.text.trim() || '在线中',
			updatedAt: new Date().toISOString()
		}
		setStatus(next)
		setDraft(next)
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
		toast.success('已本地更新状态预览')
		setOpen(false)
	}

	const handleKeyFile = async (file: File) => {
		try {
			const pem = await readFileAsText(file)
			await setPrivateKey(pem)
			const next: LiveStatus = {
				...draft,
				text: draft.text.trim() || '在线中',
				updatedAt: new Date().toISOString()
			}
			await saveToGitHub(next)
		} catch (error: any) {
			toast.error(`读取密钥失败：${error?.message || '未知错误'}`)
		}
	}

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={e => {
					const f = e.target.files?.[0]
					if (f) void handleKeyFile(f)
					e.currentTarget.value = ''
				}}
			/>

			<button
				type='button'
				onClick={e => {
					e.stopPropagation()
					setDraft(status)
					setOpen(true)
				}}
				title={effective.activity}
				className='mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-3 py-1 text-xs text-primary shadow-xs backdrop-blur-sm transition hover:bg-white/85'>
				<span className='relative flex h-2 w-2'>
					{effective.mode === 'online' && <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />}
					<span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
				</span>
				<span>{effective.emoji}</span>
				<span className='max-w-[140px] truncate font-medium'>{effective.text}</span>
			</button>

			<DialogModal open={open} onClose={() => setOpen(false)} className='card max-h-[88vh] w-[460px] max-w-[92vw] overflow-y-auto'>
				<div className='mb-4 flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<Radio className='text-brand h-4 w-4' />
						<h3 className='text-base font-semibold'>我在干嘛 · 实时状态</h3>
					</div>
					<span className='text-secondary text-xs'>更新于 {dayjs(status.updatedAt).format('MM/DD HH:mm')}</span>
				</div>

				<div className='mb-4 rounded-2xl border bg-white/50 p-3.5 text-left'>
					<div className='flex items-center gap-2 text-sm font-medium'>
						<span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`} />
						<span>
							{effective.emoji} {effective.text}
						</span>
					</div>
					{effective.activity && <p className='text-secondary mt-1 text-xs'>{effective.activity}</p>}
				</div>

				<div className='mb-4 text-left'>
					<div className='text-secondary mb-2 text-xs'>快速切换预设</div>
					<div className='grid grid-cols-2 gap-2'>
						{PRESETS.map(item => (
							<button
								key={item.text}
								type='button'
								onClick={() => setDraft(prev => ({ ...prev, ...item }))}
								className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
									draft.text === item.text ? 'border-brand bg-brand/10 font-medium' : 'bg-white/50 hover:bg-white/80'
								}`}>
								<span>{item.emoji}</span>
								<span className='truncate'>{item.text}</span>
							</button>
						))}
					</div>
				</div>

				<div className='space-y-3 text-left'>
					<div className='grid grid-cols-[72px_1fr] gap-2'>
						<input
							value={draft.emoji}
							onChange={e => setDraft(prev => ({ ...prev, emoji: e.target.value }))}
							placeholder='💻'
							className='rounded-xl border bg-white/70 px-3 py-2 text-center text-sm'
						/>
						<input
							value={draft.text}
							onChange={e => setDraft(prev => ({ ...prev, text: e.target.value }))}
							placeholder='当前状态短语'
							maxLength={24}
							className='rounded-xl border bg-white/70 px-3 py-2 text-sm'
						/>
					</div>

					<input
						value={draft.activity}
						onChange={e => setDraft(prev => ({ ...prev, activity: e.target.value }))}
						placeholder='补充一句正在做什么...'
						maxLength={60}
						className='w-full rounded-xl border bg-white/70 px-3 py-2 text-sm'
					/>

					<label className='flex items-center justify-between rounded-xl border bg-white/40 px-3 py-2 text-xs'>
						<span className='flex items-center gap-1.5'>
							<Moon className='text-brand h-3.5 w-3.5' />
							深夜自动切换为「梦游中」（{draft.sleepStartHour}:00 - {draft.sleepEndHour}:00）
						</span>
						<input
							type='checkbox'
							checked={draft.autoSleepy}
							onChange={e => setDraft(prev => ({ ...prev, autoSleepy: e.target.checked }))}
							className='accent-brand h-4 w-4'
						/>
					</label>
				</div>

				<div className='mt-5 flex items-center justify-end gap-2'>
					<button type='button' onClick={handleLocalPreview} className='rounded-xl border bg-white/60 px-4 py-2 text-xs font-medium hover:bg-white/90'>
						仅本地预览
					</button>
					<button
						type='button'
						onClick={handlePublishClick}
						disabled={isSaving}
						className='brand-btn px-4 py-2 text-xs disabled:opacity-60'>
						{isSaving ? <LoaderCircle className='h-3.5 w-3.5 animate-spin' /> : isAuth ? <Save className='h-3.5 w-3.5' /> : <KeyRound className='h-3.5 w-3.5' />}
						{isSaving ? '同步中...' : isAuth ? '同步到 GitHub' : '导入密钥并同步'}
					</button>
				</div>
			</DialogModal>
		</>
	)
}

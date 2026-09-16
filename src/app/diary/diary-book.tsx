'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, CalendarDays, Edit3, KeyRound, Leaf, LoaderCircle, LockKeyhole, Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/hooks/use-auth'
import { verifyAuth } from '@/lib/auth'
import { readFileAsText } from '@/lib/file-utils'

type DiaryEntry = {
	id: string
	title: string
	content: string
	mood: string
	createdAt: string
	updatedAt: string
}

const STORAGE_KEY = 'senyu-diary-entries-v1'
const moods = ['平静', '开心', '期待', '怀念', '有点累']
type AuthStatus = 'checking' | 'locked' | 'validating' | 'authenticated'

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	weekday: 'short'
})

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
	hour: '2-digit',
	minute: '2-digit'
})

function createId() {
	return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function DiaryBook() {
	const { isAuth, setPrivateKey, clearAuth, refreshAuthState } = useAuthStore()
	const keyInputRef = useRef<HTMLInputElement>(null)
	const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
	const [authError, setAuthError] = useState<string | null>(null)
	const [entries, setEntries] = useState<DiaryEntry[]>([])
	const [hydrated, setHydrated] = useState(false)
	const [editorOpen, setEditorOpen] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [title, setTitle] = useState('')
	const [content, setContent] = useState('')
	const [mood, setMood] = useState(moods[0])
	const isAuthenticated = authStatus === 'authenticated' && isAuth

	useEffect(() => {
		let active = true

		void (async () => {
			await refreshAuthState()
			if (!useAuthStore.getState().isAuth) {
				if (active) setAuthStatus('locked')
				return
			}

			const verified = await verifyAuth()
			if (!active) return
			if (verified) {
				setAuthError(null)
				setAuthStatus('authenticated')
			} else {
				setAuthError('已缓存的身份已失效，请重新导入管理密钥。')
				setAuthStatus('locked')
			}
		})()

		return () => {
			active = false
		}
	}, [refreshAuthState])

	useEffect(() => {
		if (!isAuthenticated) {
			setEntries([])
			setHydrated(false)
			return
		}
		try {
			const stored = window.localStorage.getItem(STORAGE_KEY)
			if (stored) setEntries(JSON.parse(stored) as DiaryEntry[])
		} catch (error) {
			console.error('[Diary] 读取本地日记失败', error)
			toast.error('本地日记读取失败')
		} finally {
			setHydrated(true)
		}
	}, [isAuthenticated])

	useEffect(() => {
		if (!isAuthenticated || !hydrated) return
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
		} catch (error) {
			console.error('[Diary] 保存本地日记失败', error)
			toast.error('日记没有保存成功')
		}
	}, [entries, hydrated, isAuthenticated])

	const sortedEntries = useMemo(() => [...entries].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [entries])

	const resetEditor = () => {
		setEditingId(null)
		setTitle('')
		setContent('')
		setMood(moods[0])
	}

	const requireAuth = () => {
		if (isAuthenticated) return true
		toast.error('日记已锁定，请先验证身份')
		return false
	}

	const openNewEntry = () => {
		if (!requireAuth()) return
		resetEditor()
		setEditorOpen(true)
	}

	const openEditEntry = (entry: DiaryEntry) => {
		if (!requireAuth()) return
		setEditingId(entry.id)
		setTitle(entry.title)
		setContent(entry.content)
		setMood(entry.mood)
		setEditorOpen(true)
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const closeEditor = () => {
		setEditorOpen(false)
		resetEditor()
	}

	const saveEntry = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!requireAuth()) return
		const cleanContent = content.trim()
		if (!cleanContent) {
			toast.error('先写下一点内容吧')
			return
		}

		const now = new Date().toISOString()
		if (editingId) {
			setEntries(current =>
				current.map(entry => (entry.id === editingId ? { ...entry, title: title.trim(), content: cleanContent, mood, updatedAt: now } : entry))
			)
			toast.success('日记已更新')
		} else {
			setEntries(current => [...current, { id: createId(), title: title.trim(), content: cleanContent, mood, createdAt: now, updatedAt: now }])
			toast.success('这一页已收好')
		}
		closeEditor()
	}

	const deleteEntry = (entry: DiaryEntry) => {
		if (!requireAuth()) return
		if (!window.confirm(`确定删除“${entry.title || '无题日记'}”吗？`)) return
		setEntries(current => current.filter(item => item.id !== entry.id))
		toast.success('日记已删除')
	}

	const handlePrivateKeySelection = async (file: File) => {
		setAuthStatus('validating')
		setAuthError(null)
		clearAuth()

		try {
			const pem = await readFileAsText(file)
			await setPrivateKey(pem)
			const verified = await verifyAuth()
			if (!verified) {
				setAuthError('密钥无效或暂时无法连接 GitHub，请检查后重试。')
				setAuthStatus('locked')
				return
			}

			setAuthStatus('authenticated')
			toast.success('身份验证成功')
		} catch (error) {
			console.error('[Diary] 导入管理密钥失败', error)
			clearAuth()
			setAuthError('密钥文件无法读取，请选择正确的 PEM 文件。')
			setAuthStatus('locked')
		}
	}

	if (!isAuthenticated) {
		const isBusy = authStatus === 'checking' || authStatus === 'validating'

		return (
			<>
				<input
					ref={keyInputRef}
					type='file'
					accept='.pem'
					className='hidden'
					onChange={event => {
						const file = event.target.files?.[0]
						if (file) void handlePrivateKeySelection(file)
						event.currentTarget.value = ''
					}}
				/>
				<div className='flex min-h-full items-center justify-center px-4 pt-24 pb-32 sm:px-6'>
					<section className='w-full max-w-md rounded-[32px] border border-white/70 bg-[#fffdf6]/82 px-6 py-9 text-center shadow-[0_24px_60px_-38px_rgba(48,68,53,0.62)] backdrop-blur-xl sm:px-9'>
						<Link
							href='/'
							className='mb-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d7dfd2] bg-white/55 px-4 text-sm text-[#536453] transition hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e]'>
							<ArrowLeft aria-hidden='true' className='size-4' />
							回到木牌
						</Link>
						<div className='mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-[#e4ebdf] text-[#45604b]'>
							{isBusy ? <LoaderCircle aria-hidden='true' className='size-7 animate-spin' /> : <LockKeyhole aria-hidden='true' className='size-7' />}
						</div>
						<h1 className='text-2xl font-semibold tracking-[-0.03em] text-[#304438]'>木牌日记已锁定</h1>
						<p className='mx-auto mt-3 max-w-sm text-sm leading-7 text-[#68746c]'>
							{isBusy ? '正在确认管理员身份……' : '这里只向站点管理员开放，请导入本项目使用的 GitHub App 管理密钥。'}
						</p>
						{authError && (
							<p role='alert' className='mt-4 rounded-2xl bg-[#f5e7e2] px-4 py-3 text-left text-sm leading-6 text-[#88483e]'>
								{authError}
							</p>
						)}
						<button
							type='button'
							disabled={isBusy}
							onClick={() => keyInputRef.current?.click()}
							className='mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#3f6248] px-6 text-sm font-medium text-white shadow-[0_14px_30px_-18px_rgba(39,70,47,0.9)] transition hover:-translate-y-0.5 hover:bg-[#31543c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0'>
							{isBusy ? <LoaderCircle aria-hidden='true' className='size-4 animate-spin' /> : <KeyRound aria-hidden='true' className='size-4' />}
							{isBusy ? '正在验证' : '导入管理密钥'}
						</button>
						<p className='mt-4 text-xs leading-5 text-[#8a928a]'>密钥用于向 GitHub 验证本仓库的管理权限，缓存行为遵循站点设置。</p>
					</section>
				</div>
			</>
		)
	}

	return (
		<div className='min-h-full px-4 pt-24 pb-32 sm:px-6 sm:pt-28'>
			<div className='mx-auto w-full max-w-[920px]'>
				<header className='mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
					<div>
						<Link
							href='/'
							className='mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/60 bg-white/45 px-4 text-sm text-[#536453] shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e]'>
							<ArrowLeft aria-hidden='true' className='size-4' />
							回到木牌
						</Link>
						<div className='mb-3 flex items-center gap-2 text-sm font-medium tracking-[0.18em] text-[#6d7e68]'>
							<Leaf aria-hidden='true' className='size-4' />
							藤蔓里的日常
						</div>
						<h1 className='text-4xl font-semibold tracking-[-0.04em] text-[#2f4538] sm:text-5xl'>木牌日记</h1>
						<p className='mt-3 max-w-xl text-sm leading-7 text-[#66716a] sm:text-base'>写下今天的心情和小事。内容只保存在你当前使用的浏览器中。</p>
					</div>
					<button
						type='button'
						onClick={openNewEntry}
						className='inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#3f6248] px-6 text-sm font-medium text-white shadow-[0_14px_30px_-18px_rgba(39,70,47,0.9)] transition hover:-translate-y-0.5 hover:bg-[#31543c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e]'>
						<Plus aria-hidden='true' className='size-4' />
						写一篇
					</button>
				</header>

				{editorOpen && (
					<section className='mb-8 overflow-hidden rounded-[32px] border border-white/70 bg-[#fffdf6]/88 shadow-[0_24px_60px_-38px_rgba(48,68,53,0.55)] backdrop-blur-xl'>
						<div className='flex items-center justify-between border-b border-[#dfe6d9] px-5 py-4 sm:px-7'>
							<div className='flex items-center gap-2 font-medium text-[#3b5142]'>
								<BookOpen aria-hidden='true' className='size-4' />
								{editingId ? '继续写这一页' : '翻开新的一页'}
							</div>
							<button
								type='button'
								onClick={closeEditor}
								className='flex size-11 items-center justify-center rounded-full text-[#66716a] transition hover:bg-[#e8eee4] hover:text-[#314a38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e]'
								aria-label='关闭编辑器'>
								<X aria-hidden='true' className='size-5' />
							</button>
						</div>
						<form onSubmit={saveEntry} className='space-y-5 p-5 sm:p-7'>
							<div className='grid gap-5 sm:grid-cols-[1fr_180px]'>
								<label className='grid gap-2 text-sm font-medium text-[#526258]'>
									标题 <span className='font-normal text-[#889087]'>（可不填）</span>
									<input
										value={title}
										onChange={event => setTitle(event.target.value)}
										maxLength={60}
										placeholder='比如：风很轻的傍晚'
										className='min-h-12 rounded-2xl border border-[#d9e1d4] bg-white/70 px-4 text-base text-[#2f4035] transition outline-none placeholder:text-[#9ca49c] focus:border-[#6e8b68] focus:ring-4 focus:ring-[#6e8b68]/10'
									/>
								</label>
								<label className='grid gap-2 text-sm font-medium text-[#526258]'>
									今天的心情
									<select
										value={mood}
										onChange={event => setMood(event.target.value)}
										className='min-h-12 rounded-2xl border border-[#d9e1d4] bg-white/70 px-4 text-base text-[#2f4035] transition outline-none focus:border-[#6e8b68] focus:ring-4 focus:ring-[#6e8b68]/10'>
										{moods.map(item => (
											<option key={item}>{item}</option>
										))}
									</select>
								</label>
							</div>
							<label className='grid gap-2 text-sm font-medium text-[#526258]'>
								正文
								<textarea
									value={content}
									onChange={event => setContent(event.target.value)}
									maxLength={8000}
									placeholder='此刻想记住什么？'
									className='min-h-52 resize-y rounded-[24px] border border-[#d9e1d4] bg-white/70 bg-[linear-gradient(to_bottom,transparent_31px,#e8ece4_32px)] bg-[length:100%_32px] px-5 py-4 text-base leading-8 text-[#2f4035] transition outline-none placeholder:text-[#9ca49c] focus:border-[#6e8b68] focus:ring-4 focus:ring-[#6e8b68]/10'
								/>
							</label>
							<div className='flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between'>
								<span className='text-xs text-[#858d84]'>{content.length} / 8000 字</span>
								<div className='flex gap-3'>
									<button
										type='button'
										onClick={closeEditor}
										className='min-h-11 flex-1 rounded-full border border-[#cad5c6] px-5 text-sm text-[#506052] transition hover:bg-[#edf1e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e] sm:flex-none'>
										取消
									</button>
									<button
										type='submit'
										className='inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#3f6248] px-5 text-sm font-medium text-white transition hover:bg-[#31543c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e] sm:flex-none'>
										<Save aria-hidden='true' className='size-4' />
										保存这一页
									</button>
								</div>
							</div>
						</form>
					</section>
				)}

				{!hydrated ? (
					<div className='rounded-[32px] border border-white/60 bg-white/35 p-12 text-center text-sm text-[#718075] backdrop-blur-md'>正在翻开日记……</div>
				) : sortedEntries.length === 0 ? (
					<section className='rounded-[32px] border border-dashed border-[#aebda9] bg-white/35 px-6 py-16 text-center backdrop-blur-md'>
						<div className='mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-[#e2eadf] text-[#48624d]'>
							<BookOpen aria-hidden='true' className='size-6' />
						</div>
						<h2 className='text-xl font-medium text-[#354b3c]'>这本日记还是空的</h2>
						<p className='mt-2 text-sm leading-6 text-[#6d786f]'>从一句话开始，留下今天的第一页。</p>
						<button
							type='button'
							onClick={openNewEntry}
							className='mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#3f6248] px-5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#31543c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e]'>
							<Plus aria-hidden='true' className='size-4' />
							写第一篇
						</button>
					</section>
				) : (
					<div className='grid gap-5 sm:grid-cols-2'>
						{sortedEntries.map(entry => (
							<article
								key={entry.id}
								className='group relative flex min-h-64 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#fffdf7]/82 p-6 shadow-[0_22px_50px_-40px_rgba(43,62,47,0.75)] backdrop-blur-lg transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_60px_-38px_rgba(43,62,47,0.68)]'>
								<div aria-hidden='true' className='absolute top-0 right-8 left-8 h-px bg-gradient-to-r from-transparent via-[#81987b]/55 to-transparent' />
								<div className='mb-5 flex items-start justify-between gap-3'>
									<div className='min-w-0'>
										<div className='mb-2 flex items-center gap-2 text-xs text-[#758078]'>
											<CalendarDays aria-hidden='true' className='size-3.5' />
											<time dateTime={entry.createdAt}>{dateFormatter.format(new Date(entry.createdAt))}</time>
										</div>
										<h2 className='truncate text-xl font-medium text-[#304438]'>{entry.title || '无题日记'}</h2>
									</div>
									<span className='shrink-0 rounded-full bg-[#e8eee4] px-3 py-1 text-xs text-[#526553]'>{entry.mood}</span>
								</div>
								<p className='line-clamp-5 flex-1 text-[15px] leading-7 whitespace-pre-wrap text-[#59655d]'>{entry.content}</p>
								<div className='mt-6 flex items-center justify-between border-t border-[#e1e7dc] pt-4'>
									<span className='text-xs text-[#8a928a]'>更新于 {timeFormatter.format(new Date(entry.updatedAt))}</span>
									<div className='flex gap-1'>
										<button
											type='button'
											onClick={() => openEditEntry(entry)}
											className='flex size-11 items-center justify-center rounded-full text-[#536653] transition hover:bg-[#e7eee3] hover:text-[#304b37] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e]'
											aria-label={`编辑${entry.title || '无题日记'}`}>
											<Edit3 aria-hidden='true' className='size-4' />
										</button>
										<button
											type='button'
											onClick={() => deleteEntry(entry)}
											className='flex size-11 items-center justify-center rounded-full text-[#8a625b] transition hover:bg-[#f4e6e2] hover:text-[#8a3f35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b4e43]'
											aria-label={`删除${entry.title || '无题日记'}`}>
											<Trash2 aria-hidden='true' className='size-4' />
										</button>
									</div>
								</div>
							</article>
						))}
					</div>
				)}
			</div>
		</div>
	)
}


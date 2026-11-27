'use client'

import { useMemo, useRef, useState } from 'react'
import { BookOpen, Clapperboard, Download, Film, Gamepad2, KeyRound, LoaderCircle, Pencil, Plus, Save, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { readFileAsText } from '@/lib/file-utils'
import { pushJsonFile } from '@/lib/push-json'
import initialMedia from './list.json'
import type { MediaCategory, MediaItem, MediaStatus } from './types'

const CATEGORY_META: Record<MediaCategory, { label: string; unit: string }> = {
	anime: { label: '番剧', unit: '集' },
	game: { label: '游戏', unit: '小时' },
	movie: { label: '电影', unit: '部' },
	book: { label: '书籍', unit: '页' }
}

const STATUS_META: Record<MediaStatus, { label: string; cls: string }> = {
	doing: { label: '进行中', cls: 'bg-brand/15 text-brand' },
	done: { label: '已完成', cls: 'bg-emerald-500/15 text-emerald-700' },
	wish: { label: '想看/想玩', cls: 'bg-amber-500/15 text-amber-700' }
}

function CategoryIcon({ category, className }: { category: MediaCategory; className?: string }) {
	if (category === 'anime') return <Clapperboard className={className} />
	if (category === 'game') return <Gamepad2 className={className} />
	if (category === 'movie') return <Film className={className} />
	return <BookOpen className={className} />
}

export default function MediaPage() {
	const { isAuth, setPrivateKey } = useAuthStore()
	const keyInputRef = useRef<HTMLInputElement>(null)
	const [items, setItems] = useState<MediaItem[]>(initialMedia as MediaItem[])
	const [originalItems, setOriginalItems] = useState<MediaItem[]>(initialMedia as MediaItem[])
	const [categoryFilter, setCategoryFilter] = useState<'all' | MediaCategory>('all')
	const [statusFilter, setStatusFilter] = useState<'all' | MediaStatus>('all')
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	// Add/Edit dialog
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [title, setTitle] = useState('')
	const [category, setCategory] = useState<MediaCategory>('anime')
	const [status, setStatus] = useState<MediaStatus>('doing')
	const [cover, setCover] = useState('')
	const [rating, setRating] = useState(4)
	const [progress, setProgress] = useState('0')
	const [total, setTotal] = useState('12')
	const [unit, setUnit] = useState('集')
	const [review, setReview] = useState('')
	const [url, setUrl] = useState('')

	// Bangumi import dialog
	const [bgmOpen, setBgmOpen] = useState(false)
	const [bgmUsername, setBgmUsername] = useState('')
	const [bgmImporting, setBgmImporting] = useState(false)

	const filtered = useMemo(() => {
		return items.filter(item => {
			if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
			if (statusFilter !== 'all' && item.status !== statusFilter) return false
			return true
		})
	}, [items, categoryFilter, statusFilter])

	const openCreate = () => {
		setEditingId(null)
		setTitle('')
		setCategory('anime')
		setStatus('doing')
		setCover('')
		setRating(4)
		setProgress('0')
		setTotal('12')
		setUnit('集')
		setReview('')
		setUrl('')
		setDialogOpen(true)
	}

	const openEdit = (item: MediaItem) => {
		setEditingId(item.id)
		setTitle(item.title)
		setCategory(item.category)
		setStatus(item.status)
		setCover(item.cover || '')
		setRating(item.rating)
		setProgress(String(item.progress))
		setTotal(String(item.total))
		setUnit(item.unit || CATEGORY_META[item.category].unit)
		setReview(item.review)
		setUrl(item.url || '')
		setDialogOpen(true)
	}

	const handleSaveItem = () => {
		if (!title.trim()) {
			toast.error('请填写作品名称')
			return
		}
		const pNum = Math.max(0, Number(progress) || 0)
		const tNum = Math.max(1, Number(total) || 1)
		const nextEntry: MediaItem = {
			id: editingId ?? `media-${Date.now().toString(36)}`,
			title: title.trim(),
			category,
			status,
			cover: cover.trim() || undefined,
			rating,
			progress: pNum,
			total: tNum,
			unit: unit.trim() || CATEGORY_META[category].unit,
			review: review.trim(),
			url: url.trim() || undefined,
			updatedAt: dayjs().format('YYYY-MM-DD')
		}
		if (editingId) {
			setItems(prev => prev.map(i => (i.id === editingId ? nextEntry : i)))
		} else {
			setItems(prev => [nextEntry, ...prev])
		}
		setDialogOpen(false)
	}

	const bumpProgress = (id: string) => {
		setItems(prev =>
			prev.map(i => {
				if (i.id !== id) return i
				const nextP = Math.min(i.total, i.progress + 1)
				return {
					...i,
					progress: nextP,
					status: nextP >= i.total ? 'done' : i.status,
					updatedAt: dayjs().format('YYYY-MM-DD')
				}
			})
		)
	}

	const handleDelete = (id: string) => {
		if (!window.confirm('确定删除这条记录吗？')) return
		setItems(prev => prev.filter(i => i.id !== id))
	}

	const handleImportBangumi = async () => {
		const user = bgmUsername.trim()
		if (!user) {
			toast.error('请输入 Bangumi 用户名或 UID')
			return
		}
		setBgmImporting(true)
		try {
			const res = await fetch(`https://api.bgm.tv/v0/users/${encodeURIComponent(user)}/collections?limit=30`)
			if (!res.ok) throw new Error(`Bangumi 接口返回 ${res.status}`)
			const json = (await res.json()) as {
				data?: Array<{
					subject_id: number
					subject_type: number
					type: number
					rate?: number
					ep_status?: number
					comment?: string
					updated_at?: string
					subject?: {
						name?: string
						name_cn?: string
						eps?: number
						images?: { common?: string; medium?: string }
					}
				}>
			}
			const list = json.data ?? []
			if (list.length === 0) throw new Error('未获取到收藏数据')

			const mapCat = (t: number): MediaCategory => (t === 4 ? 'game' : t === 1 ? 'book' : t === 6 ? 'movie' : 'anime')
			const mapStatus = (t: number): MediaStatus => (t === 2 ? 'done' : t === 1 ? 'wish' : 'doing')

			const imported: MediaItem[] = list.map(entry => {
				const cat = mapCat(entry.subject_type)
				const eps = entry.subject?.eps || 12
				return {
					id: `bgm-${entry.subject_id}`,
					title: entry.subject?.name_cn || entry.subject?.name || `Subject #${entry.subject_id}`,
					category: cat,
					status: mapStatus(entry.type),
					cover: entry.subject?.images?.common || entry.subject?.images?.medium || undefined,
					rating: entry.rate ? Math.max(1, Math.min(5, Math.round(entry.rate / 2))) : 4,
					progress: entry.ep_status ?? (entry.type === 2 ? eps : 0),
					total: eps,
					unit: CATEGORY_META[cat].unit,
					review: entry.comment || '',
					url: `https://bgm.tv/subject/${entry.subject_id}`,
					updatedAt: entry.updated_at ? dayjs(entry.updated_at).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
				}
			})

			setItems(prev => {
				const existingIds = new Set(prev.map(i => i.id))
				const merged = [...imported.filter(i => !existingIds.has(i.id)), ...prev]
				return merged
			})
			setIsEditMode(true)
			setBgmOpen(false)
			toast.success(`已导入 ${imported.length} 条 Bangumi 收藏，点击「保存同步」即可推送到仓库`)
		} catch (error: any) {
			toast.error(`导入失败：${error?.message || '请检查用户名或网络'}`)
		} finally {
			setBgmImporting(false)
		}
	}

	const pushToGitHub = async () => {
		setIsSaving(true)
		try {
			await pushJsonFile('src/app/media/list.json', items, 'docs(media): 更新追番/游戏/书影音墙')
			setOriginalItems(items)
			setIsEditMode(false)
			toast.success('书影音列表已同步到 GitHub，部署完成后生效')
		} catch (error: any) {
			toast.error(`同步失败：${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	const handlePublishClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
			return
		}
		void pushToGitHub()
	}

	const handleKeyFile = async (file: File) => {
		try {
			const pem = await readFileAsText(file)
			await setPrivateKey(pem)
			await pushToGitHub()
		} catch (error: any) {
			toast.error(`密钥读取失败：${error?.message || '未知错误'}`)
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

			<div className='mx-auto min-h-screen max-w-[1060px] px-4 pt-24 pb-28 sm:px-6'>
				<header className='mb-6 flex flex-wrap items-end justify-between gap-4'>
					<div>
						<div className='text-brand mb-1 flex items-center gap-1.5 text-xs font-medium tracking-widest uppercase'>
							<Clapperboard className='h-3.5 w-3.5' />
							Media &amp; Game Wall
						</div>
						<h1 className='text-3xl font-bold'>追番 · 游戏 · 书影音墙</h1>
						<p className='text-secondary mt-1 text-sm'>记录正在追的番、通关的游戏、看过的电影与读过的书，支持 Bangumi 一键同步。</p>
					</div>

					<div className='flex flex-wrap items-center gap-2'>
						<button
							type='button'
							onClick={() => setBgmOpen(true)}
							className='inline-flex items-center gap-1.5 rounded-xl border bg-white/65 px-3.5 py-2 text-xs font-medium backdrop-blur-sm hover:bg-white/90'>
							<Download className='text-brand h-3.5 w-3.5' />
							Bangumi 导入
						</button>

						{isEditMode ? (
							<>
								<button
									type='button'
									onClick={() => {
										setItems(originalItems)
										setIsEditMode(false)
									}}
									className='rounded-xl border bg-white/65 px-3.5 py-2 text-xs font-medium'>
									取消
								</button>
								<button type='button' onClick={openCreate} className='inline-flex items-center gap-1 rounded-xl border bg-white/80 px-3.5 py-2 text-xs font-medium'>
									<Plus className='h-3.5 w-3.5' />
									添加作品
								</button>
								<button type='button' onClick={handlePublishClick} disabled={isSaving} className='brand-btn px-4 py-2 text-xs disabled:opacity-60'>
									{isSaving ? <LoaderCircle className='h-3.5 w-3.5 animate-spin' /> : isAuth ? <Save className='h-3.5 w-3.5' /> : <KeyRound className='h-3.5 w-3.5' />}
									{isSaving ? '保存中...' : isAuth ? '保存同步' : '导入密钥并保存'}
								</button>
							</>
						) : (
							<button type='button' onClick={() => setIsEditMode(true)} className='rounded-xl border bg-white/65 px-4 py-2 text-xs font-medium backdrop-blur-sm hover:bg-white/90'>
								管理列表
							</button>
						)}
					</div>
				</header>

				{/* 分类 + 状态筛选 */}
				<div className='mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-white/60 p-3 backdrop-blur-md'>
					<div className='flex flex-wrap gap-1.5 text-xs'>
						{([
							['all', `全部 (${items.length})`],
							['anime', '番剧'],
							['game', '游戏'],
							['movie', '电影'],
							['book', '书籍']
						] as const).map(([key, label]) => (
							<button
								key={key}
								type='button'
								onClick={() => setCategoryFilter(key)}
								className={`rounded-xl px-3 py-1.5 font-medium transition ${
									categoryFilter === key ? 'bg-brand text-white' : 'text-secondary hover:bg-white/80'
								}`}>
								{label}
							</button>
						))}
					</div>

					<div className='flex flex-wrap gap-1.5 text-xs'>
						{([
							['all', '全部状态'],
							['doing', '进行中'],
							['done', '已完成'],
							['wish', '想看/想玩']
						] as const).map(([key, label]) => (
							<button
								key={key}
								type='button'
								onClick={() => setStatusFilter(key)}
								className={`rounded-xl px-3 py-1.5 font-medium transition ${
									statusFilter === key ? 'bg-primary text-white' : 'text-secondary hover:bg-white/80'
								}`}>
								{label}
							</button>
						))}
					</div>
				</div>

				{/* 作品卡片网格 */}
				{filtered.length === 0 ? (
					<div className='text-secondary rounded-[32px] border border-dashed bg-white/45 py-16 text-center text-sm backdrop-blur-sm'>
						这个分类下暂时还没有记录，点击「添加作品」或「Bangumi 导入」开始收藏吧
					</div>
				) : (
					<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
						{filtered.map(item => {
							const pct = Math.min(100, Math.round((item.progress / Math.max(1, item.total)) * 100))
							const statusMeta = STATUS_META[item.status]
							return (
								<div key={item.id} className='flex flex-col justify-between rounded-[28px] border bg-white/65 p-4 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/80'>
									<div className='flex gap-3.5'>
										{item.cover ? (
											<img src={item.cover} alt={item.title} className='h-24 w-[70px] shrink-0 rounded-2xl border object-cover' />
										) : (
											<div className='bg-brand/10 text-brand flex h-24 w-[70px] shrink-0 items-center justify-center rounded-2xl border'>
												<CategoryIcon category={item.category} className='h-6 w-6' />
											</div>
										)}

										<div className='min-w-0 flex-1'>
											<div className='flex items-start justify-between gap-2'>
												{item.url ? (
													<a href={item.url} target={item.url.startsWith('http') ? '_blank' : undefined} rel='noreferrer' className='line-clamp-2 text-sm font-semibold hover:text-brand'>
														{item.title}
													</a>
												) : (
													<h3 className='line-clamp-2 text-sm font-semibold'>{item.title}</h3>
												)}
												{isEditMode && (
													<div className='flex shrink-0 gap-1'>
														<button type='button' onClick={() => openEdit(item)} className='rounded-lg p-1 hover:bg-white'>
															<Pencil className='h-3.5 w-3.5' />
														</button>
														<button type='button' onClick={() => handleDelete(item.id)} className='rounded-lg p-1 text-rose-500 hover:bg-rose-50'>
															<Trash2 className='h-3.5 w-3.5' />
														</button>
													</div>
												)}
											</div>

											<div className='mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]'>
												<span className='rounded-full bg-white/80 px-2 py-0.5 text-secondary'>{CATEGORY_META[item.category].label}</span>
												<span className={`rounded-full px-2 py-0.5 font-medium ${statusMeta.cls}`}>{statusMeta.label}</span>
											</div>

											<div className='mt-2 flex items-center gap-0.5'>
												{Array.from({ length: 5 }).map((_, i) => (
													<Star key={i} className={`h-3.5 w-3.5 ${i < item.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
												))}
											</div>
										</div>
									</div>

									{item.review && <p className='text-secondary mt-3 line-clamp-2 text-xs leading-relaxed'>{item.review}</p>}

									<div className='mt-3 border-t border-white/70 pt-3'>
										<div className='mb-1.5 flex items-center justify-between text-[11px] text-secondary'>
											<span>
												进度：{item.progress} / {item.total} {item.unit || CATEGORY_META[item.category].unit}
											</span>
											<div className='flex items-center gap-2'>
												{isEditMode && item.progress < item.total && (
													<button
														type='button'
														onClick={() => bumpProgress(item.id)}
														className='rounded-md bg-brand/15 px-1.5 py-0.5 text-[11px] font-medium text-brand hover:bg-brand/25'>
														+1
													</button>
												)}
												<span>{item.updatedAt}</span>
											</div>
										</div>
										<div className='h-1.5 overflow-hidden rounded-full bg-white/80'>
											<div className='bg-linear h-full rounded-full transition-all duration-300' style={{ width: `${pct}%` }} />
										</div>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</div>

			{/* 添加/编辑弹窗 */}
			<DialogModal open={dialogOpen} onClose={() => setDialogOpen(false)} className='card max-h-[88vh] w-[480px] max-w-[92vw] overflow-y-auto'>
				<h3 className='mb-4 text-base font-semibold'>{editingId ? '编辑作品' : '添加新作品'}</h3>
				<div className='space-y-3 text-xs'>
					<input value={title} onChange={e => setTitle(e.target.value)} placeholder='作品名称 *' className='w-full rounded-xl border bg-white/80 px-3 py-2 text-sm' />

					<div className='grid grid-cols-2 gap-2'>
						<select
							value={category}
							onChange={e => {
								const nextCat = e.target.value as MediaCategory
								setCategory(nextCat)
								setUnit(CATEGORY_META[nextCat].unit)
							}}
							className='rounded-xl border bg-white/80 px-3 py-2'>
							<option value='anime'>番剧</option>
							<option value='game'>游戏</option>
							<option value='movie'>电影</option>
							<option value='book'>书籍</option>
						</select>
						<select value={status} onChange={e => setStatus(e.target.value as MediaStatus)} className='rounded-xl border bg-white/80 px-3 py-2'>
							<option value='doing'>进行中</option>
							<option value='done'>已完成</option>
							<option value='wish'>想看/想玩</option>
						</select>
					</div>

					<div className='grid grid-cols-3 gap-2'>
						<input value={progress} onChange={e => setProgress(e.target.value)} type='number' placeholder='当前进度' className='rounded-xl border bg-white/80 px-3 py-2' />
						<input value={total} onChange={e => setTotal(e.target.value)} type='number' placeholder='总数' className='rounded-xl border bg-white/80 px-3 py-2' />
						<input value={unit} onChange={e => setUnit(e.target.value)} placeholder='单位 如 集/小时' className='rounded-xl border bg-white/80 px-3 py-2' />
					</div>

					<div className='flex items-center justify-between rounded-xl border bg-white/60 px-3 py-2'>
						<span className='text-secondary'>个人评分</span>
						<div className='flex gap-1'>
							{[1, 2, 3, 4, 5].map(n => (
								<button key={n} type='button' onClick={() => setRating(n)}>
									<Star className={`h-4 w-4 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
								</button>
							))}
						</div>
					</div>

					<input value={cover} onChange={e => setCover(e.target.value)} placeholder='可选：封面图片 URL' className='w-full rounded-xl border bg-white/80 px-3 py-2' />
					<input value={url} onChange={e => setUrl(e.target.value)} placeholder='可选：作品详情链接' className='w-full rounded-xl border bg-white/80 px-3 py-2' />
					<textarea value={review} onChange={e => setReview(e.target.value)} rows={3} placeholder='一句话锐评或游玩感受...' className='w-full rounded-xl border bg-white/80 px-3 py-2' />
				</div>

				<div className='mt-5 flex justify-end gap-2'>
					<button type='button' onClick={() => setDialogOpen(false)} className='rounded-xl border bg-white/60 px-4 py-2 text-xs'>
						取消
					</button>
					<button type='button' onClick={handleSaveItem} className='brand-btn px-4 py-2 text-xs'>
						确定
					</button>
				</div>
			</DialogModal>

			{/* Bangumi 导入弹窗 */}
			<DialogModal open={bgmOpen} onClose={() => setBgmOpen(false)} className='card w-[420px] max-w-[92vw]'>
				<h3 className='mb-2 text-base font-semibold'>从 Bangumi 一键导入</h3>
				<p className='text-secondary mb-4 text-xs leading-relaxed'>输入你的 Bangumi 用户名或数字 UID，自动拉取最近 30 条公开的追番/游戏/书籍收藏。</p>
				<input
					value={bgmUsername}
					onChange={e => setBgmUsername(e.target.value)}
					placeholder='例如：sai 或数字 UID'
					className='w-full rounded-xl border bg-white/80 px-3 py-2 text-sm'
				/>
				<div className='mt-4 flex justify-end gap-2'>
					<button type='button' onClick={() => setBgmOpen(false)} className='rounded-xl border bg-white/60 px-4 py-2 text-xs'>
						取消
					</button>
					<button type='button' onClick={() => void handleImportBangumi()} disabled={bgmImporting} className='brand-btn px-4 py-2 text-xs disabled:opacity-60'>
						{bgmImporting ? <LoaderCircle className='h-3.5 w-3.5 animate-spin' /> : <Download className='h-3.5 w-3.5' />}
						{bgmImporting ? '导入中...' : '开始导入'}
					</button>
				</div>
			</DialogModal>
		</>
	)
}

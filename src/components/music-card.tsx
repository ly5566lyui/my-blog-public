'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from '../app/(home)/stores/config-store'
import { CARD_SPACING } from '@/consts'
import MusicSVG from '@/svgs/music.svg'
import PlaySVG from '@/svgs/play.svg'
import { HomeDraggableLayer } from '../app/(home)/home-draggable-layer'
import { ListMusic, Pause, Plus, SkipBack, SkipForward, Trash2, LoaderCircle, Download } from 'lucide-react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { toast } from 'sonner'
import { DialogModal } from '@/components/dialog-modal'
import initialTracks from '@/config/music-list.json'

export type MusicTrack = {
	id: string
	title: string
	artist?: string
	url: string
	lrc?: string
}

type LrcLine = {
	time: number
	text: string
}

const STORAGE_KEY = 'mcy-music-playlist-v1'

function parseLrc(raw?: string): LrcLine[] {
	if (!raw) return []
	const lines: LrcLine[] = []
	const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g
	for (const line of raw.split(/\r?\n/)) {
		const text = line.replace(regex, '').trim()
		if (!text) continue
		let match: RegExpExecArray | null
		regex.lastIndex = 0
		while ((match = regex.exec(line)) !== null) {
			const min = Number(match[1])
			const sec = Number(match[2])
			const ms = match[3] ? Number(match[3].padEnd(3, '0')) : 0
			lines.push({ time: min * 60 + sec + ms / 1000, text })
		}
	}
	return lines.sort((a, b) => a.time - b.time)
}

function formatTime(sec: number): string {
	if (!Number.isFinite(sec) || sec < 0) return '0:00'
	const m = Math.floor(sec / 60)
	const s = Math.floor(sec % 60)
	return `${m}:${String(s).padStart(2, '0')}`
}

export default function MusicCard() {
	const pathname = usePathname()
	const center = useCenterStore()
	const { cardStyles, siteContent } = useConfigStore()
	const styles = cardStyles.musicCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard
	const calendarCardStyles = cardStyles.calendarCard

	const [tracks, setTracks] = useState<MusicTrack[]>(initialTracks as MusicTrack[])
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentIndex, setCurrentIndex] = useState(0)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [panelOpen, setPanelOpen] = useState(false)
	const [panelTab, setPanelTab] = useState<'playlist' | 'lyrics' | 'import'>('playlist')

	// Import / add track states
	const [neteaseId, setNeteaseId] = useState('')
	const [importing, setImporting] = useState(false)
	const [newTitle, setNewTitle] = useState('')
	const [newArtist, setNewArtist] = useState('')
	const [newUrl, setNewUrl] = useState('')
	const [newLrc, setNewLrc] = useState('')

	const audioRef = useRef<HTMLAudioElement | null>(null)
	const tracksRef = useRef<MusicTrack[]>(tracks)
	const currentIndexRef = useRef(0)
	const activeLyricRef = useRef<HTMLButtonElement | null>(null)

	useEffect(() => {
		tracksRef.current = tracks
	}, [tracks])

	// Load custom playlist from localStorage
	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY)
			if (raw) {
				const parsed = JSON.parse(raw) as MusicTrack[]
				if (Array.isArray(parsed) && parsed.length > 0) {
					setTracks(parsed)
				}
			}
		} catch {
			// ignore
		}
	}, [])

	const saveTracksLocal = (next: MusicTrack[]) => {
		setTracks(next)
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
		} catch {
			// ignore
		}
	}

	const currentTrack = tracks[currentIndex] ?? tracks[0]
	const lrcLines = useMemo(() => parseLrc(currentTrack?.lrc), [currentTrack?.lrc])
	const activeLyricIndex = useMemo(() => {
		if (lrcLines.length === 0) return -1
		let idx = -1
		for (let i = 0; i < lrcLines.length; i++) {
			if (currentTime >= lrcLines[i].time) idx = i
			else break
		}
		return idx
	}, [lrcLines, currentTime])

	const activeLyricText = activeLyricIndex >= 0 ? lrcLines[activeLyricIndex]?.text : ''

	useEffect(() => {
		if (panelOpen && panelTab === 'lyrics' && activeLyricRef.current) {
			activeLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}
	}, [activeLyricIndex, panelOpen, panelTab])

	const isHomePage = pathname === '/'

	const position = useMemo(() => {
		if (!isHomePage) {
			return {
				x: center.width - styles.width - 16,
				y: center.height - styles.height - 16
			}
		}

		return {
			x: styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardStyles.width / 2 - styles.offset,
			y: styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardStyles.offset + CARD_SPACING + calendarCardStyles.height + CARD_SPACING
		}
	}, [isPlaying, isHomePage, center, styles, hiCardStyles, clockCardStyles, calendarCardStyles])

	const { x, y } = position

	useEffect(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio()
		}
		const audio = audioRef.current

		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime || 0)
			if (audio.duration) setDuration(audio.duration)
		}

		const handleLoadedMetadata = () => {
			setDuration(audio.duration || 0)
			setCurrentTime(audio.currentTime || 0)
		}

		const handleEnded = () => {
			const len = tracksRef.current.length || 1
			const nextIndex = (currentIndexRef.current + 1) % len
			currentIndexRef.current = nextIndex
			setCurrentIndex(nextIndex)
			setCurrentTime(0)
		}

		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('loadedmetadata', handleLoadedMetadata)
		audio.addEventListener('ended', handleEnded)

		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
			audio.removeEventListener('ended', handleEnded)
		}
	}, [])

	useEffect(() => {
		currentIndexRef.current = currentIndex
		const track = tracks[currentIndex]
		if (audioRef.current && track) {
			const shouldPlay = isPlaying
			audioRef.current.pause()
			audioRef.current.src = track.url
			audioRef.current.loop = false
			setCurrentTime(0)
			setDuration(0)
			if (shouldPlay) {
				audioRef.current.play().catch(console.error)
			}
		}
	}, [currentIndex, tracks])

	useEffect(() => {
		if (!audioRef.current) return
		if (isPlaying) {
			audioRef.current.play().catch(console.error)
		} else {
			audioRef.current.pause()
		}
	}, [isPlaying])

	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause()
				audioRef.current.src = ''
			}
		}
	}, [])

	const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

	const seekTo = (ratio: number) => {
		if (!audioRef.current || !duration) return
		const nextTime = Math.max(0, Math.min(duration, ratio * duration))
		audioRef.current.currentTime = nextTime
		setCurrentTime(nextTime)
	}

	const seekToSeconds = (sec: number) => {
		if (!audioRef.current) return
		audioRef.current.currentTime = Math.max(0, sec)
		setCurrentTime(Math.max(0, sec))
		if (!isPlaying) setIsPlaying(true)
	}

	const togglePlayPause = () => setIsPlaying(prev => !prev)

	const nextSong = () => {
		if (tracks.length === 0) return
		setCurrentIndex(prev => (prev + 1) % tracks.length)
		setIsPlaying(true)
	}

	const prevSong = () => {
		if (tracks.length === 0) return
		setCurrentIndex(prev => (prev - 1 + tracks.length) % tracks.length)
		setIsPlaying(true)
	}

	const handleImportNetease = async () => {
		const id = neteaseId.trim().replace(/[^0-9]/g, '')
		if (!id) {
			toast.error('请输入网易云歌单 ID')
			return
		}
		setImporting(true)
		try {
			const res = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${id}`)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const list = (await res.json()) as Array<{ title?: string; name?: string; author?: string; artist?: string; url?: string; lrc?: string }>
			if (!Array.isArray(list) || list.length === 0) throw new Error('歌单为空或接口暂不可用')

			const imported: MusicTrack[] = await Promise.all(
				list.slice(0, 20).map(async (item, idx) => {
					let lrcText = ''
					if (item.lrc && /^https?:\/\//.test(item.lrc)) {
						try {
							const lrcRes = await fetch(item.lrc)
							if (lrcRes.ok) lrcText = await lrcRes.text()
						} catch {
							// ignore lyric fetch failure
						}
					}
					return {
						id: `netease-${id}-${idx}`,
						title: item.title || item.name || `曲目 ${idx + 1}`,
						artist: item.author || item.artist || '网易云音乐',
						url: item.url || '',
						lrc: lrcText
					}
				})
			)
			const valid = imported.filter(t => t.url)
			if (valid.length === 0) throw new Error('未解析到可播放的音频地址')

			saveTracksLocal([...tracks, ...valid])
			toast.success(`成功导入 ${valid.length} 首歌曲`)
			setNeteaseId('')
			setPanelTab('playlist')
		} catch (error: any) {
			toast.error(`导入失败：${error?.message || '请稍后重试或手动添加链接'}`)
		} finally {
			setImporting(false)
		}
	}

	const handleAddManual = () => {
		if (!newTitle.trim() || !newUrl.trim()) {
			toast.error('请填写歌名和音频链接')
			return
		}
		const item: MusicTrack = {
			id: `custom-${Date.now()}`,
			title: newTitle.trim(),
			artist: newArtist.trim() || '自定义曲目',
			url: newUrl.trim(),
			lrc: newLrc.trim() || undefined
		}
		saveTracksLocal([...tracks, item])
		setNewTitle('')
		setNewArtist('')
		setNewUrl('')
		setNewLrc('')
		toast.success('已添加到歌单')
		setPanelTab('playlist')
	}

	const handleRemoveTrack = (id: string) => {
		if (tracks.length <= 1) {
			toast.error('至少保留一首歌曲')
			return
		}
		const idx = tracks.findIndex(t => t.id === id)
		const next = tracks.filter(t => t.id !== id)
		saveTracksLocal(next)
		if (idx <= currentIndex && currentIndex > 0) {
			setCurrentIndex(prev => Math.max(0, prev - 1))
		}
	}

	if (!isHomePage && !isPlaying) {
		return null
	}

	return (
		<>
			<HomeDraggableLayer cardKey='musicCard' x={x} y={y} width={styles.width} height={styles.height}>
				<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className={clsx('flex items-center gap-2.5 px-4 py-3', !isHomePage && 'fixed')}>
					{siteContent.enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-10.webp'
								alt='Christmas decoration'
								className='pointer-events-none absolute'
								style={{ width: 120, left: -8, top: -12, opacity: 0.8 }}
							/>
							<img
								src='/images/christmas/snow-11.webp'
								alt='Christmas decoration'
								className='pointer-events-none absolute'
								style={{ width: 80, right: -10, top: -12, opacity: 0.8 }}
							/>
						</>
					)}

					<button
						type='button'
						onClick={() => setPanelOpen(true)}
						title='打开歌单与滚动歌词'
						className='shrink-0 transition-transform hover:scale-105'>
						<MusicSVG className={clsx('h-7 w-7', isPlaying && 'animate-pulse')} />
					</button>

					<div className='min-w-0 flex-1'>
						<div className='flex items-center justify-between gap-2'>
							<div className='text-primary truncate text-xs font-medium' title={activeLyricText || currentTrack?.title}>
								{isPlaying && activeLyricText ? activeLyricText : currentTrack?.title || '未选择音乐'}
							</div>
							{duration > 0 && <span className='text-secondary shrink-0 text-[10px] tabular-nums'>{formatTime(currentTime)}</span>}
						</div>

						<div
							role='slider'
							aria-label='播放进度'
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={Math.round(progress)}
							tabIndex={0}
							onClick={e => {
								const rect = e.currentTarget.getBoundingClientRect()
								seekTo((e.clientX - rect.left) / rect.width)
							}}
							className='mt-1.5 h-2 cursor-pointer rounded-full bg-white/60'>
							<div className='bg-linear h-full rounded-full transition-all duration-200' style={{ width: `${progress}%` }} />
						</div>
					</div>

					<button
						type='button'
						onClick={togglePlayPause}
						aria-label={isPlaying ? '暂停' : '播放'}
						className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white transition-opacity hover:opacity-80'>
						{isPlaying ? <Pause className='text-brand h-4 w-4' /> : <PlaySVG className='text-brand ml-0.5 h-4 w-4' />}
					</button>
					<button
						type='button'
						onClick={nextSong}
						aria-label='下一首'
						className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 transition-opacity hover:opacity-60'>
						<SkipForward className='text-brand h-3.5 w-3.5' />
					</button>
					<button
						type='button'
						onClick={() => setPanelOpen(true)}
						aria-label='歌单与歌词'
						className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 transition-opacity hover:opacity-70'>
						<ListMusic className='text-secondary h-3.5 w-3.5' />
					</button>
				</Card>
			</HomeDraggableLayer>

			<DialogModal open={panelOpen} onClose={() => setPanelOpen(false)} className='card max-h-[85vh] w-[520px] max-w-[92vw] overflow-y-auto'>
				<div className='mb-4 flex items-center justify-between'>
					<div>
						<h3 className='text-base font-semibold'>{currentTrack?.title}</h3>
						<p className='text-secondary text-xs'>{currentTrack?.artist || '本地歌单'}</p>
					</div>
					<div className='flex items-center gap-2'>
						<button type='button' onClick={prevSong} className='flex h-8 w-8 items-center justify-center rounded-full border bg-white/70 hover:bg-white'>
							<SkipBack className='text-brand h-3.5 w-3.5' />
						</button>
						<button type='button' onClick={togglePlayPause} className='flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white'>
							{isPlaying ? <Pause className='h-4 w-4' /> : <PlaySVG className='ml-0.5 h-4 w-4 text-white' />}
						</button>
						<button type='button' onClick={nextSong} className='flex h-8 w-8 items-center justify-center rounded-full border bg-white/70 hover:bg-white'>
							<SkipForward className='text-brand h-3.5 w-3.5' />
						</button>
					</div>
				</div>

				<div className='mb-4'>
					<div
						onClick={e => {
							const rect = e.currentTarget.getBoundingClientRect()
							seekTo((e.clientX - rect.left) / rect.width)
						}}
						className='h-2 cursor-pointer rounded-full bg-white/70'>
						<div className='bg-linear h-full rounded-full transition-all duration-150' style={{ width: `${progress}%` }} />
					</div>
					<div className='text-secondary mt-1 flex justify-between text-[11px] tabular-nums'>
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>

				<div className='mb-4 flex gap-2 border-b pb-2 text-xs'>
					{([
						['playlist', `歌单 (${tracks.length})`],
						['lyrics', '滚动歌词'],
						['import', '导入 / 添加']
					] as const).map(([key, label]) => (
						<button
							key={key}
							type='button'
							onClick={() => setPanelTab(key)}
							className={`rounded-xl px-3 py-1.5 font-medium transition ${
								panelTab === key ? 'bg-brand text-white' : 'bg-white/50 text-secondary hover:bg-white/80'
							}`}>
							{label}
						</button>
					))}
				</div>

				{panelTab === 'playlist' && (
					<div className='max-h-[300px] space-y-1.5 overflow-y-auto pr-1'>
						{tracks.map((track, idx) => {
							const active = idx === currentIndex
							return (
								<div
									key={track.id}
									className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
										active ? 'border-brand bg-brand/10' : 'bg-white/50 hover:bg-white/80'
									}`}>
									<button
										type='button'
										onClick={() => {
											setCurrentIndex(idx)
											setIsPlaying(true)
										}}
										className='min-w-0 flex-1 text-left'>
										<div className='truncate font-medium'>{track.title}</div>
										<div className='text-secondary truncate text-xs'>{track.artist || '未知艺术家'}</div>
									</button>
									<button
										type='button'
										onClick={() => handleRemoveTrack(track.id)}
										aria-label='移除歌曲'
										className='text-secondary ml-2 rounded-lg p-1.5 hover:bg-rose-50 hover:text-rose-500'>
										<Trash2 className='h-3.5 w-3.5' />
									</button>
								</div>
							)
						})}
					</div>
				)}

				{panelTab === 'lyrics' && (
					<div className='max-h-[300px] space-y-2 overflow-y-auto rounded-2xl bg-white/40 p-4 text-center'>
						{lrcLines.length === 0 ? (
							<div className='text-secondary py-10 text-xs'>当前曲目暂无同步歌词</div>
						) : (
							lrcLines.map((line, idx) => (
								<button
									key={`${line.time}-${idx}`}
									ref={idx === activeLyricIndex ? activeLyricRef : null}
									type='button'
									onClick={() => seekToSeconds(line.time)}
									className={`block w-full rounded-lg px-2 py-1 text-sm transition ${
										idx === activeLyricIndex ? 'text-brand scale-105 font-semibold' : 'text-secondary hover:text-primary text-xs'
									}`}>
									{line.text}
								</button>
							))
						)}
					</div>
				)}

				{panelTab === 'import' && (
					<div className='space-y-4 text-left text-xs'>
						<div className='rounded-2xl border bg-white/50 p-3'>
							<div className='mb-2 font-medium'>一键导入网易云公开歌单（Meting API）</div>
							<div className='flex gap-2'>
								<input
									value={neteaseId}
									onChange={e => setNeteaseId(e.target.value)}
									placeholder='粘贴网易云歌单 ID，例如 3778678'
									className='flex-1 rounded-xl border bg-white/80 px-3 py-2 text-xs'
								/>
								<button
									type='button'
									onClick={() => void handleImportNetease()}
									disabled={importing}
									className='brand-btn px-3 py-2 text-xs disabled:opacity-60'>
									{importing ? <LoaderCircle className='h-3.5 w-3.5 animate-spin' /> : <Download className='h-3.5 w-3.5' />}
									导入
								</button>
							</div>
						</div>

						<div className='space-y-2 rounded-2xl border bg-white/50 p-3'>
							<div className='font-medium'>手动添加曲目与 LRC 歌词</div>
							<div className='grid grid-cols-2 gap-2'>
								<input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder='歌名 *' className='rounded-xl border bg-white/80 px-3 py-2' />
								<input value={newArtist} onChange={e => setNewArtist(e.target.value)} placeholder='歌手' className='rounded-xl border bg-white/80 px-3 py-2' />
							</div>
							<input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder='音频直链 URL (mp3/m4a/ogg) *' className='w-full rounded-xl border bg-white/80 px-3 py-2' />
							<textarea
								value={newLrc}
								onChange={e => setNewLrc(e.target.value)}
								rows={3}
								placeholder='可选：粘贴 LRC 歌词，例如 [00:12.00]第一句歌词'
								className='w-full rounded-xl border bg-white/80 px-3 py-2'
							/>
							<div className='flex justify-end'>
								<button type='button' onClick={handleAddManual} className='brand-btn px-3 py-1.5 text-xs'>
									<Plus className='h-3.5 w-3.5' />
									添加到歌单
								</button>
							</div>
						</div>
					</div>
				)}
			</DialogModal>
		</>
	)
}

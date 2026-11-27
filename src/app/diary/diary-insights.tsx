'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Shuffle, Sparkles, Search, X } from 'lucide-react'
import dayjs from 'dayjs'
import picturesList from '@/app/pictures/list.json'
import type { DiaryEntry } from './types'

type PictureItem = {
	id: string
	uploadedAt: string
	description?: string
	images?: string[]
}

const MOOD_COLORS: Record<string, { cell: string; dot: string }> = {
	平静: { cell: 'bg-[#6ba37a]', dot: 'bg-[#6ba37a]' },
	开心: { cell: 'bg-[#eab308]', dot: 'bg-[#eab308]' },
	期待: { cell: 'bg-[#38bdf8]', dot: 'bg-[#38bdf8]' },
	怀念: { cell: 'bg-[#a78bfa]', dot: 'bg-[#a78bfa]' },
	有点累: { cell: 'bg-[#fb7185]', dot: 'bg-[#fb7185]' }
}

interface DiaryInsightsProps {
	entries: DiaryEntry[]
	selectedMood: string
	onSelectMood: (mood: string) => void
	searchQuery: string
	onSearchChange: (q: string) => void
	onJumpToEntry: (id: string) => void
}

export default function DiaryInsights({
	entries,
	selectedMood,
	onSelectMood,
	searchQuery,
	onSearchChange,
	onJumpToEntry
}: DiaryInsightsProps) {
	const [randomMemory, setRandomMemory] = useState<{
		kind: 'diary' | 'picture'
		id: string
		title: string
		excerpt: string
		date: string
		image?: string
	} | null>(null)

	// Build map: YYYY-MM-DD -> entries on that day
	const byDate = useMemo(() => {
		const map = new Map<string, DiaryEntry[]>()
		for (const entry of entries) {
			const key = dayjs(entry.createdAt).format('YYYY-MM-DD')
			const arr = map.get(key) ?? []
			arr.push(entry)
			map.set(key, arr)
		}
		return map
	}, [entries])

	// Last 26 weeks (182 days) aligned to Sunday
	const heatmapWeeks = useMemo(() => {
		const today = dayjs().startOf('day')
		const end = today.add(6 - today.day(), 'day')
		const totalDays = 26 * 7
		const start = end.subtract(totalDays - 1, 'day')
		const weeks: Array<Array<{ dateStr: string; isFuture: boolean; dayEntries: DiaryEntry[] }>> = []
		for (let w = 0; w < 26; w++) {
			const col: Array<{ dateStr: string; isFuture: boolean; dayEntries: DiaryEntry[] }> = []
			for (let d = 0; d < 7; d++) {
				const cur = start.add(w * 7 + d, 'day')
				const dateStr = cur.format('YYYY-MM-DD')
				col.push({
					dateStr,
					isFuture: cur.isAfter(today),
					dayEntries: byDate.get(dateStr) ?? []
				})
			}
			weeks.push(col)
		}
		return weeks
	}, [byDate])

	// Mood counts
	const moodCounts = useMemo(() => {
		const counts = new Map<string, number>()
		for (const e of entries) {
			counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1)
		}
		return Array.from(counts.entries())
	}, [entries])

	// Time capsule: same month-day in past years, or same day-of-month in earlier months
	const capsuleItems = useMemo(() => {
		const today = dayjs()
		const todayStr = today.format('YYYY-MM-DD')
		const md = today.format('MM-DD')
		const dayOfMonth = today.date()

		const sameMdDiaries = entries.filter(e => {
			const d = dayjs(e.createdAt)
			return d.format('YYYY-MM-DD') !== todayStr && d.format('MM-DD') === md
		})
		if (sameMdDiaries.length > 0) {
			return { label: '往年今日', items: sameMdDiaries }
		}

		const sameDomDiaries = entries.filter(e => {
			const d = dayjs(e.createdAt)
			return d.format('YYYY-MM-DD') !== todayStr && d.date() === dayOfMonth
		})
		if (sameDomDiaries.length > 0) {
			return { label: '往月今日', items: sameDomDiaries }
		}

		return { label: '时光胶囊', items: [] as DiaryEntry[] }
	}, [entries])

	const pickRandomMemory = () => {
		const pool: Array<{ kind: 'diary' | 'picture'; id: string; title: string; excerpt: string; date: string; image?: string }> = [
			...entries.map(e => ({
				kind: 'diary' as const,
				id: e.id,
				title: e.title || '无题日记',
				excerpt: e.content,
				date: dayjs(e.createdAt).format('YYYY/MM/DD')
			})),
			...(picturesList as PictureItem[]).map(p => ({
				kind: 'picture' as const,
				id: p.id,
				title: '相册回忆',
				excerpt: p.description || '一张留存的瞬间',
				date: dayjs(p.uploadedAt).format('YYYY/MM/DD'),
				image: p.images?.[0]
			}))
		]
		if (pool.length === 0) return
		const picked = pool[Math.floor(Math.random() * pool.length)]
		setRandomMemory(picked)
	}

	return (
		<section className='mb-8 space-y-4'>
			{/* 时光胶囊 + 随机回忆 */}
			<div className='rounded-[28px] border border-white/70 bg-[#fffdf7]/80 p-5 shadow-[0_18px_40px_-32px_rgba(43,62,47,0.6)] backdrop-blur-lg'>
				<div className='flex flex-wrap items-center justify-between gap-3'>
					<div className='flex items-center gap-2 text-sm font-medium text-[#354c3e]'>
						<Sparkles className='size-4 text-[#55784e]' />
						<span>{capsuleItems.label}</span>
						{capsuleItems.items.length > 0 ? (
							<span className='rounded-full bg-[#e8eee4] px-2.5 py-0.5 text-xs text-[#4f6452]'>找到 {capsuleItems.items.length} 段回忆</span>
						) : (
							<span className='text-xs font-normal text-[#7a867e]'>今天暂无同日记录，试试随机翻阅一页吧</span>
						)}
					</div>
					<button
						type='button'
						onClick={pickRandomMemory}
						className='inline-flex items-center gap-1.5 rounded-full border border-[#cbd7c7] bg-white/70 px-3.5 py-1.5 text-xs font-medium text-[#3f6248] transition hover:bg-white'>
						<Shuffle className='size-3.5' />
						随机翻阅回忆
					</button>
				</div>

				{capsuleItems.items.length > 0 && !randomMemory && (
					<div className='mt-3 grid gap-2 sm:grid-cols-2'>
						{capsuleItems.items.slice(0, 2).map(item => (
							<button
								key={item.id}
								type='button'
								onClick={() => onJumpToEntry(item.id)}
								className='rounded-2xl border border-[#e3eae0] bg-white/65 p-3 text-left transition hover:bg-white'>
								<div className='flex items-center justify-between text-xs text-[#78857d]'>
									<span>{dayjs(item.createdAt).format('YYYY/MM/DD')}</span>
									<span>{item.mood}</span>
								</div>
								<div className='mt-1 truncate text-sm font-medium text-[#2f4538]'>{item.title || '无题日记'}</div>
								<p className='mt-1 line-clamp-2 text-xs text-[#616e66]'>{item.content}</p>
							</button>
						))}
					</div>
				)}

				{randomMemory && (
					<div className='mt-3 flex items-start gap-3 rounded-2xl border border-[#dbe4d6] bg-white/75 p-3.5'>
						{randomMemory.image && (
							<img src={randomMemory.image} alt='memory' className='h-14 w-14 shrink-0 rounded-xl object-cover' />
						)}
						<div className='min-w-0 flex-1'>
							<div className='flex items-center justify-between gap-2 text-xs text-[#76827a]'>
								<span>
									{randomMemory.kind === 'diary' ? '📖 日记回忆' : '📷 相册回忆'} · {randomMemory.date}
								</span>
								<button
									type='button'
									onClick={() => setRandomMemory(null)}
									className='rounded-full p-0.5 text-[#76827a] hover:bg-[#edf2ea]'>
									<X className='size-3.5' />
								</button>
							</div>
							<div className='mt-1 text-sm font-medium text-[#2f4538]'>{randomMemory.title}</div>
							<p className='mt-1 line-clamp-2 text-xs leading-relaxed text-[#5e6a63]'>{randomMemory.excerpt}</p>
							{randomMemory.kind === 'diary' && (
								<button
									type='button'
									onClick={() => onJumpToEntry(randomMemory.id)}
									className='mt-2 text-xs font-medium text-[#3f6248] underline-offset-2 hover:underline'>
									跳转到这篇日记 →
								</button>
							)}
						</div>
					</div>
				)}
			</div>

			{/* 写作与心情热力图 */}
			<div className='rounded-[28px] border border-white/70 bg-[#fffdf7]/80 p-5 shadow-[0_18px_40px_-32px_rgba(43,62,47,0.6)] backdrop-blur-lg'>
				<div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
					<div className='flex items-center gap-2 text-sm font-medium text-[#354c3e]'>
						<CalendarDays className='size-4 text-[#55784e]' />
						<span>近半年写作与心情热力图</span>
						<span className='text-xs font-normal text-[#7a867e]'>共 {entries.length} 篇</span>
					</div>
					<div className='flex flex-wrap items-center gap-2 text-[11px] text-[#6d7a72]'>
						{Object.entries(MOOD_COLORS).map(([m, c]) => (
							<span key={m} className='inline-flex items-center gap-1'>
								<span className={`inline-block size-2.5 rounded-[3px] ${c.dot}`} />
								{m}
							</span>
						))}
					</div>
				</div>

				<div className='overflow-x-auto pb-1'>
					<div className='inline-flex gap-1'>
						{heatmapWeeks.map((week, wIdx) => (
							<div key={wIdx} className='flex flex-col gap-1'>
								{week.map(cell => {
									const first = cell.dayEntries[0]
									const colorClass = cell.isFuture
										? 'bg-transparent'
										: first
											? (MOOD_COLORS[first.mood]?.cell ?? 'bg-[#6ba37a]')
											: 'bg-[#e8eee4]/80'
									const tip = first
										? `${cell.dateStr} · ${first.title || '无题日记'}（${first.mood}）`
										: cell.dateStr
									return (
										<button
											key={cell.dateStr}
											type='button'
											disabled={!first}
											onClick={() => first && onJumpToEntry(first.id)}
											title={tip}
											className={`size-3 rounded-[3px] transition ${colorClass} ${first ? 'cursor-pointer hover:scale-125' : 'cursor-default'}`}
										/>
									)
								})}
							</div>
						))}
					</div>
				</div>

				{/* 搜索与心情筛选栏 */}
				<div className='mt-4 flex flex-col gap-3 border-t border-[#e5ece2] pt-4 sm:flex-row sm:items-center sm:justify-between'>
					<div className='flex flex-wrap gap-1.5'>
						<button
							type='button'
							onClick={() => onSelectMood('全部')}
							className={`rounded-full px-3 py-1 text-xs transition ${
								selectedMood === '全部' ? 'bg-[#3f6248] text-white' : 'bg-[#edf2ea] text-[#4f6353] hover:bg-[#dfe8db]'
							}`}>
							全部 ({entries.length})
						</button>
						{moodCounts.map(([m, count]) => (
							<button
								key={m}
								type='button'
								onClick={() => onSelectMood(selectedMood === m ? '全部' : m)}
								className={`rounded-full px-3 py-1 text-xs transition ${
									selectedMood === m ? 'bg-[#3f6248] text-white' : 'bg-[#edf2ea] text-[#4f6353] hover:bg-[#dfe8db]'
								}`}>
								{m} ({count})
							</button>
						))}
					</div>

					<div className='relative w-full sm:w-56'>
						<Search className='pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#7c8880]' />
						<input
							value={searchQuery}
							onChange={e => onSearchChange(e.target.value)}
							placeholder='搜索日记标题或内容...'
							className='w-full rounded-full border border-[#d7e1d3] bg-white/75 py-1.5 pr-8 pl-8 text-xs text-[#2f4035] outline-none placeholder:text-[#96a29a] focus:border-[#55784e]'
						/>
						{searchQuery && (
							<button
								type='button'
								onClick={() => onSearchChange('')}
								className='absolute top-1/2 right-2.5 -translate-y-1/2 text-[#7c8880] hover:text-[#2f4035]'>
								<X className='size-3.5' />
							</button>
						)}
					</div>
				</div>
			</div>
		</section>
	)
}

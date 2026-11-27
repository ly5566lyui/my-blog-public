'use client'

import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { CARD_SPACING, CARD_SPACING_SM } from '@/consts'
import diaryList from '@/app/diary/list.json'
import type { DiaryEntry } from '@/app/diary/types'
import dayjs from 'dayjs'
import Link from 'next/link'
import { HomeDraggableLayer } from './home-draggable-layer'

const sortedDiaries = [...(diaryList as DiaryEntry[])].sort(
	(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
)

export default function DiaryCard() {
	const center = useCenterStore()
	const { cardStyles } = useConfigStore()
	const styles = cardStyles.diaryCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard
	const calendarCardStyles = cardStyles.calendarCard
	const musicCardStyles = cardStyles.musicCard

	const musicCardX =
		musicCardStyles.offsetX !== null
			? center.x + musicCardStyles.offsetX
			: center.x + CARD_SPACING + hiCardStyles.width / 2 - musicCardStyles.offset
	const musicCardY =
		musicCardStyles.offsetY !== null
			? center.y + musicCardStyles.offsetY
			: center.y - clockCardStyles.offset + CARD_SPACING + calendarCardStyles.height + CARD_SPACING

	const x = styles.offsetX !== null ? center.x + styles.offsetX : musicCardX
	const y = styles.offsetY !== null ? center.y + styles.offsetY : musicCardY + musicCardStyles.height + CARD_SPACING_SM

	const latest = sortedDiaries[0]

	return (
		<HomeDraggableLayer cardKey='diaryCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='flex flex-col justify-between max-sm:static'>
				<div className='flex items-center justify-between'>
					<h2 className='text-secondary text-sm'>日记</h2>
					{sortedDiaries.length > 0 && <span className='text-secondary text-xs'>共 {sortedDiaries.length} 篇</span>}
				</div>

				{latest ? (
					<Link href='/diary' className='mt-2 flex flex-1 flex-col justify-between transition-opacity hover:opacity-80'>
						<div>
							<h3 className='line-clamp-1 text-sm font-medium'>{latest.title || '无题'}</h3>
							<p className='text-secondary mt-1 line-clamp-2 text-xs leading-relaxed'>{latest.content}</p>
						</div>
						<div className='text-secondary mt-2 flex items-center justify-between text-xs'>
							<span>{dayjs(latest.createdAt).format('YYYY/M/D')}</span>
							{latest.mood && <span>{latest.mood}</span>}
						</div>
					</Link>
				) : (
					<Link href='/diary' className='flex flex-1 items-center justify-center transition-opacity hover:opacity-80'>
						<span className='text-secondary text-xs'>暂无日记，点击记录</span>
					</Link>
				)}
			</Card>
		</HomeDraggableLayer>
	)
}

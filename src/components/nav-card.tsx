'use client'

import Card from '@/components/card'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { motion } from 'motion/react'
import { useCenterStore } from '@/hooks/use-center'
import { CARD_SPACING } from '@/consts'
import ScrollOutlineSVG from '@/svgs/scroll-outline.svg'
import ScrollFilledSVG from '@/svgs/scroll-filled.svg'
import ProjectsFilledSVG from '@/svgs/projects-filled.svg'
import ProjectsOutlineSVG from '@/svgs/projects-outline.svg'
import AboutFilledSVG from '@/svgs/about-filled.svg'
import AboutOutlineSVG from '@/svgs/about-outline.svg'
import ShareFilledSVG from '@/svgs/share-filled.svg'
import ShareOutlineSVG from '@/svgs/share-outline.svg'
import WebsiteFilledSVG from '@/svgs/website-filled.svg'
import WebsiteOutlineSVG from '@/svgs/website-outline.svg'
import ScheduleOutlineSVG from '@/svgs/schedule-outline.svg'
import ScheduleFilledSVG from '@/svgs/schedule-filled.svg'
import TimelineOutlineSVG from '@/svgs/timeline-outline.svg'
import TimelineFilledSVG from '@/svgs/timeline-filled.svg'
import CardRecordOutlineSVG from '@/svgs/card-record-outline.svg'
import CardRecordFilledSVG from '@/svgs/card-record-filled.svg'
import { BookOpen, Camera, Clapperboard, Clock, Compass, Gamepad2, ImageIcon, Link2, MapPin, PenLine, Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { cn } from '@/lib/utils'
import { useSize } from '@/hooks/use-size'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { HomeDraggableLayer } from '@/app/(home)/home-draggable-layer'

type IconComp = ComponentType<{ className?: string }>

const ICON_MAP: Record<string, { outline: IconComp; filled: IconComp }> = {
	scroll: { outline: ScrollOutlineSVG, filled: ScrollFilledSVG },
	projects: { outline: ProjectsOutlineSVG, filled: ProjectsFilledSVG },
	about: { outline: AboutOutlineSVG, filled: AboutFilledSVG },
	share: { outline: ShareOutlineSVG, filled: ShareFilledSVG },
	schedule: { outline: ScheduleOutlineSVG, filled: ScheduleFilledSVG },
	website: { outline: WebsiteOutlineSVG, filled: WebsiteFilledSVG },
	timeline: { outline: TimelineOutlineSVG, filled: TimelineFilledSVG },
	'card-record': { outline: CardRecordOutlineSVG, filled: CardRecordFilledSVG },
	diary: { outline: BookOpen, filled: BookOpen },
	footprints: { outline: MapPin, filled: MapPin },
	media: { outline: Clapperboard, filled: Clapperboard },
	image: { outline: ImageIcon, filled: ImageIcon },
	pictures: { outline: Camera, filled: Camera },
	game: { outline: Gamepad2, filled: Gamepad2 },
	clock: { outline: Clock, filled: Clock },
	write: { outline: PenLine, filled: PenLine },
	compass: { outline: Compass, filled: Compass },
	sparkles: { outline: Sparkles, filled: Sparkles },
	link: { outline: Link2, filled: Link2 }
}

const extraSize = 8

export default function NavCard() {
	const pathname = usePathname()
	const center = useCenterStore()
	const [show, setShow] = useState(false)
	const { maxSM } = useSize()
	const [hoveredIndex, setHoveredIndex] = useState<number>(0)
	const { siteContent, cardStyles, navItems } = useConfigStore()
	const styles = cardStyles.navCard
	const hiCardStyles = cardStyles.hiCard

	const list = useMemo(
		() =>
			navItems.map(item => {
				const icons = ICON_MAP[item.icon] ?? ICON_MAP.link
				return {
					...item,
					iconComp: icons.outline,
					iconActiveComp: icons.filled
				}
			}),
		[navItems]
	)

	const activeIndex = useMemo(() => {
		const index = list.findIndex(item => pathname === item.href)
		return index >= 0 ? index : undefined
	}, [pathname, list])

	useEffect(() => {
		if (hoveredIndex >= list.length && list.length > 0) {
			setHoveredIndex(0)
		}
	}, [hoveredIndex, list.length])

	useEffect(() => {
		setShow(true)
	}, [])

	let form = useMemo(() => {
		if (pathname == '/') return 'full'
		else if (pathname == '/write') return 'mini'
		else return 'icons'
	}, [pathname])
	if (maxSM) form = 'icons'

	const itemHeight = form === 'full' ? 52 : 28

	let position = useMemo(() => {
		if (form === 'full') {
			const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - hiCardStyles.width / 2 - styles.width - CARD_SPACING
			const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 - styles.height
			return { x, y }
		}

		return {
			x: 24,
			y: 16
		}
	}, [form, center, styles, hiCardStyles])

	const size = useMemo(() => {
		if (form === 'mini') return { width: 64, height: 64 }
		else if (form === 'icons') {
			const count = list.length + 1
			const naturalWidth = count * (itemHeight + 24) + 24
			const maxWidth = center.width > 0 ? Math.max(200, center.width - 32) : naturalWidth
			return { width: Math.min(naturalWidth, maxWidth), height: itemHeight + 24 + 24 }
		} else {
			return { width: styles.width, height: styles.height }
		}
	}, [form, styles, list.length, itemHeight, center.width])

	useEffect(() => {
		if (form === 'icons' && activeIndex !== undefined && hoveredIndex !== activeIndex) {
			const timer = setTimeout(() => {
				setHoveredIndex(activeIndex)
			}, 1500)
			return () => clearTimeout(timer)
		}
	}, [hoveredIndex, activeIndex, form])

	if (maxSM) position = { x: center.x - size.width / 2, y: 16 }

	if (show)
		return (
			<HomeDraggableLayer cardKey='navCard' x={position.x} y={position.y} width={size.width} height={size.height}>
				<Card
					order={styles.order}
					width={size.width}
					height={size.height}
					x={position.x}
					y={position.y}
					className={clsx('overflow-hidden', form === 'mini' && 'p-3', form === 'icons' && 'flex items-center gap-6 overflow-x-auto p-3 scrollbar-none')}>
					{form === 'full' && siteContent.enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-4.webp'
								alt='Christmas decoration'
								className='pointer-events-none absolute'
								style={{ width: 160, left: -18, top: -20, opacity: 0.9 }}
							/>
						</>
					)}

					{form !== 'icons' && (
						<Link className='flex items-center gap-3' href='/'>
							<Image src='/images/avatar.png' alt='avatar' width={40} height={40} style={{ boxShadow: ' 0 12px 20px -5px #E2D9CE' }} className='rounded-full' />
							{form === 'full' && <span className='font-averia mt-1 text-2xl leading-none font-medium'>{siteContent.meta.title}</span>}
						</Link>
					)}

					{(form === 'full' || form === 'icons') && (
						<>
							{form !== 'icons' && <div className='text-secondary mt-5 text-sm uppercase'>General</div>}

							<div
								className={cn(
									'relative mt-2 space-y-2',
									form === 'full' &&
										'overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200',
									form === 'icons' && 'mt-0 flex shrink-0 items-center gap-6 space-y-0'
								)}
								style={form === 'full' ? { maxHeight: Math.max(160, size.height - 124) } : undefined}>
								{form === 'icons' && (
									<Link className='flex shrink-0 items-center' href='/'>
										<Image src='/images/avatar.png' alt='avatar' width={28} height={28} style={{ boxShadow: ' 0 8px 16px -4px #E2D9CE' }} className='rounded-full' />
									</Link>
								)}
								{list.length > 0 && (
									<motion.div
										className='absolute max-w-[230px] rounded-full border'
										layoutId='nav-hover'
										initial={false}
										animate={
											form === 'icons'
												? {
														left: (hoveredIndex + 1) * (itemHeight + 24) - extraSize,
														top: -extraSize,
														width: itemHeight + extraSize * 2,
														height: itemHeight + extraSize * 2
													}
												: { top: hoveredIndex * (itemHeight + 8), left: 0, width: '100%', height: itemHeight }
										}
										transition={{
											type: 'spring',
											stiffness: 400,
											damping: 30
										}}
										style={{ backgroundImage: 'linear-gradient(to right bottom, var(--color-border) 60%, var(--color-card) 100%)' }}
									/>
								)}

								{list.map((item, index) => {
									const isExternal = /^https?:\/\//.test(item.href)
									const linkContent = (
										<>
											<div className='flex h-7 w-7 shrink-0 items-center justify-center'>
												{hoveredIndex == index ? <item.iconActiveComp className='text-brand absolute h-6 w-6' /> : <item.iconComp className='absolute h-6 w-6' />}
											</div>
											{form !== 'icons' && <span className={clsx('truncate', index == hoveredIndex && 'text-primary font-medium')}>{item.label}</span>}
										</>
									)
									const cls = cn('text-secondary text-md relative z-10 flex shrink-0 items-center gap-3 rounded-full px-5 py-3', form === 'icons' && 'p-0')

									return isExternal ? (
										<a
											key={item.id}
											href={item.href}
											target='_blank'
											rel='noreferrer'
											title={item.label}
											className={cls}
											onMouseEnter={() => setHoveredIndex(index)}>
											{linkContent}
										</a>
									) : (
										<Link key={item.id} href={item.href} title={item.label} className={cls} onMouseEnter={() => setHoveredIndex(index)}>
											{linkContent}
										</Link>
									)
								})}
							</div>
						</>
					)}
				</Card>
			</HomeDraggableLayer>
		)
}

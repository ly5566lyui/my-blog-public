'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CARD_SPACING, CARD_SPACING_SM } from '@/consts'
import { useCenterStore } from '@/hooks/use-center'
import { useSize } from '@/hooks/use-size'
import { useConfigStore } from './stores/config-store'
import { HomeDraggableLayer } from './home-draggable-layer'

type BadgeApi = {
	pulse: () => void
	flip: () => void
	reset: () => void
	dispose: () => void
}

type BadgeWindow = Window & {
	mountWoodBadge?: (canvas: HTMLCanvasElement, options: Record<string, unknown>) => BadgeApi | null
}

const scriptLoads = new Map<string, Promise<void>>()

function loadScript(src: string): Promise<void> {
	const cached = scriptLoads.get(src)
	if (cached) return cached

	const task = new Promise<void>((resolve, reject) => {
		const existing = document.querySelector<HTMLScriptElement>(`script[data-hangtag="${src}"]`)
		if (existing?.dataset.loaded === 'true') {
			resolve()
			return
		}

		const element = existing ?? document.createElement('script')
		const handleLoad = () => {
			element.dataset.loaded = 'true'
			resolve()
		}
		const handleError = () => {
			scriptLoads.delete(src)
			reject(new Error(`木牌脚本加载失败：${src}`))
		}

		element.addEventListener('load', handleLoad, { once: true })
		element.addEventListener('error', handleError, { once: true })
		if (!existing) {
			element.src = src
			element.async = false
			element.dataset.hangtag = src
			document.head.appendChild(element)
		}
	})

	scriptLoads.set(src, task)
	return task
}

export default function SwingSign() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const apiRef = useRef<BadgeApi | null>(null)
	const [failed, setFailed] = useState(false)
	const [ready, setReady] = useState(false)
	const router = useRouter()
	const center = useCenterStore()
	const { maxSM } = useSize()
	const { cardStyles } = useConfigStore()
	const styles = cardStyles.swingSign
	const navCardStyles = cardStyles.navCard
	const hiCardStyles = cardStyles.hiCard

	const navCardX =
		navCardStyles.offsetX !== null ? center.x + navCardStyles.offsetX : center.x - hiCardStyles.width / 2 - navCardStyles.width - CARD_SPACING
	const defaultX = Math.max(8, navCardX - styles.width - CARD_SPACING_SM)
	const defaultY = navCardStyles.offsetY !== null ? center.y + navCardStyles.offsetY : center.y - styles.height / 2

	const x = styles.offsetX !== null ? center.x + styles.offsetX : defaultX
	const y = styles.offsetY !== null ? center.y + styles.offsetY : defaultY
	const isPositioned = maxSM || center.x !== 0 || center.y !== 0

	useEffect(() => {
		let disposed = false
		const canvas = canvasRef.current
		if (!canvas) return

		try {
			const probe = document.createElement('canvas')
			if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) {
				setFailed(true)
				return
			}
		} catch {
			setFailed(true)
			return
		}

		void (async () => {
			try {
				await loadScript('/hang-tag/three.bundle.js')
				await loadScript('/hang-tag/wood-module.js')
				if (disposed) return

				const mount = (window as BadgeWindow).mountWoodBadge
				if (typeof mount !== 'function') throw new Error('mountWoodBadge 未注册')
				const api = mount(canvas, {
					widget: true,
					eventSource: canvas,
					onPick: (zone: unknown) => {
						if (zone === 'upper') apiRef.current?.flip()
						if (zone === 'lower') router.push('/diary')
					}
				})
				if (!api) throw new Error('木牌初始化失败')
				apiRef.current = api
				setReady(true)
			} catch (error) {
				console.error('[SwingSign]', error)
				if (!disposed) setFailed(true)
			}
		})()

		return () => {
			disposed = true
			apiRef.current?.dispose()
			apiRef.current = null
		}
	}, [router])

	useEffect(() => {
		if (!ready) return
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
		const timer = window.setTimeout(() => apiRef.current?.pulse(), 1100)
		return () => window.clearTimeout(timer)
	}, [ready])

	return (
		<HomeDraggableLayer cardKey='swingSign' x={x} y={y} width={styles.width} height={styles.height}>
			<section
				aria-label='藤蔓木牌隐藏入口'
				style={
					maxSM
						? undefined
						: {
								left: x,
								top: y,
								width: styles.width,
								height: styles.height,
								visibility: isPositioned ? 'visible' : 'hidden'
							}
				}
				className='group absolute z-20 overflow-visible max-sm:relative max-sm:h-[320px] max-sm:w-[min(86vw,320px)] max-sm:shrink-0'>
				{failed ? (
					<div className='absolute inset-5 flex flex-col items-center justify-center gap-3 rounded-[28px] border border-white/50 bg-white/25 text-center text-sm text-[#40584b]'>
						<span>木牌暂时没能显示</span>
					</div>
				) : (
					<canvas
						ref={canvasRef}
						aria-label='可拖拽的藤蔓木牌：轻点上半部翻面，轻点下半部进入木牌日记'
						className='block h-full w-full touch-none transition-opacity duration-700'
						style={{ opacity: ready ? 1 : 0 }}
					/>
				)}

				<button
					type='button'
					onClick={() => apiRef.current?.flip()}
					className='sr-only focus:not-sr-only focus:fixed focus:bottom-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-[#3f6248] focus:px-5 focus:py-3 focus:text-sm focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-[#55784e]'>
					翻转木牌
				</button>
				<button
					type='button'
					onClick={() => router.push('/diary')}
					className='sr-only focus:not-sr-only focus:fixed focus:bottom-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-[#3f6248] focus:px-5 focus:py-3 focus:text-sm focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-[#55784e]'>
					进入木牌日记
				</button>
			</section>
		</HomeDraggableLayer>
	)
}


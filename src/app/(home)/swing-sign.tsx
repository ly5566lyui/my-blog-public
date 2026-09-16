'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type BadgeApi = { pulse: () => void; flip: () => void; reset: () => void; dispose: () => void }
type PlaqueBox = { x: number; y: number; w: number; h: number }

function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[data-hangtag="${src}"]`)) {
			resolve()
			return
		}
		const el = document.createElement('script')
		el.src = src
		el.async = false
		el.dataset.hangtag = src
		el.onload = () => resolve()
		el.onerror = () => reject(new Error('load failed: ' + src))
		document.head.appendChild(el)
	})
}

/**
 * 藤蔓木牌「随心记」
 * 画布铺满整个首屏（透明，露出博客自己的背景），木牌不再受小画框裁切；
 * 为了不挡住页面点击，canvas 本身不接收指针事件，
 * 改由一块跟随木牌屏幕位置的隐形热区（hotspot）来接收拖拽。
 */
export default function SwingSign() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const hotspotRef = useRef<HTMLDivElement>(null)
	const apiRef = useRef<BadgeApi | null>(null)
	const [failed, setFailed] = useState(false)
	const [ready, setReady] = useState(false)
	const pathname = usePathname()
	const router = useRouter()

	useEffect(() => {
		let disposed = false
		const canvas = canvasRef.current
		const hotspot = hotspotRef.current
		if (!canvas || !hotspot) return

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

		;(async () => {
			try {
				await loadScript('/hang-tag/three.bundle.js')
				await loadScript('/hang-tag/wood-module.js')
				if (disposed) return
				const mount = (
					window as unknown as {
						mountWoodBadge?: (c: HTMLCanvasElement, o: Record<string, unknown>) => BadgeApi | null
					}
				).mountWoodBadge
				if (typeof mount !== 'function') throw new Error('mountWoodBadge missing')
				const api = mount(canvas, {
					widget: true,
					eventSource: hotspot,
					onPlaqueBox: (box: PlaqueBox) => {
						if (disposed) return
						hotspot.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`
						hotspot.style.width = `${box.w}px`
						hotspot.style.height = `${box.h}px`
					},
					onPick: () => router.push('/blog')
				})
				if (!api) throw new Error('init returned null')
				apiRef.current = api
				setReady(true)
			} catch (err) {
				console.error('[SwingSign]', err)
				if (!disposed) setFailed(true)
			}
		})()

		return () => {
			disposed = true
			try {
				apiRef.current?.dispose()
			} catch {
				/* noop */
			}
			apiRef.current = null
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// 就绪后轻弹一下，提示这块牌子可以玩
	useEffect(() => {
		if (!ready) return
		const t = setTimeout(() => {
			try {
				apiRef.current?.pulse()
			} catch {
				/* noop */
			}
		}, 1600)
		return () => clearTimeout(t)
	}, [ready])

	if (failed || pathname !== '/') return null

	return (
		<div
			aria-label='随心记'
			className='pointer-events-none fixed inset-0 z-30 overflow-hidden'
		>
			<canvas
				ref={canvasRef}
				className='block h-full w-full'
				style={{ opacity: ready ? 1 : 0, transition: 'opacity .6s ease' }}
			/>
			{/* 隐形热区：尺寸位置每帧跟随木牌，只有牌子上才有指针事件 */}
			<div
				ref={hotspotRef}
				className='pointer-events-auto absolute left-0 top-0 h-[300px] w-[200px] touch-none will-change-transform'
				style={{ opacity: 0 }}
			/>
		</div>
	)
}

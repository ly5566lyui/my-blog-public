'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type BadgeApi = { pulse: () => void; flip: () => void; reset: () => void; dispose: () => void }

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

export default function SwingSign() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const apiRef = useRef<BadgeApi | null>(null)
	const [failed, setFailed] = useState(false)
	const [ready, setReady] = useState(false)
	const pathname = usePathname()

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

		;(async () => {
			try {
				await loadScript('/hang-tag/three.bundle.js')
				await loadScript('/hang-tag/wood-module.js')
				if (disposed) return
				const mount = (window as unknown as { mountWoodBadge?: (c: HTMLCanvasElement, o: object) => BadgeApi | null }).mountWoodBadge
				if (typeof mount !== 'function') throw new Error('mountWoodBadge missing')
				const api = mount(canvas, { widget: true })
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
		<div className='pointer-events-none fixed left-1/2 top-0 z-40 -translate-x-1/2' aria-label='随心记'>
			<div className='relative h-[260px] w-[180px] max-sm:h-[220px] max-sm:w-[150px]'>
				<canvas
					ref={canvasRef}
					className='pointer-events-auto block h-full w-full touch-none'
					style={{ opacity: ready ? 1 : 0, transition: 'opacity .6s ease' }}
				/>
			</div>
		</div>
	)
}
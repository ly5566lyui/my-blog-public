'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpenText, RotateCcw, Sparkles } from 'lucide-react'

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
					onPick: () => router.push('/blog')
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
		const timer = window.setTimeout(() => apiRef.current?.pulse(), 1100)
		return () => window.clearTimeout(timer)
	}, [ready])

	return (
		<section
			aria-label='藤蔓木牌：随心记入口'
			className='group relative z-20 h-[430px] w-[min(92vw,360px)] shrink-0 overflow-hidden rounded-[40px] border bg-white/18 shadow-[0_30px_80px_-45px_rgba(53,79,47,0.55)] backdrop-blur-[2px] min-[1400px]:top-10 min-[1400px]:right-auto min-[1400px]:bottom-auto min-[1400px]:left-4 min-[1400px]:h-[420px] min-[1400px]:w-[220px] sm:fixed sm:right-3 sm:bottom-3 sm:h-[350px] sm:w-[190px] sm:rounded-[30px] sm:border-white/35'>
			<div className='pointer-events-none absolute inset-x-5 top-4 z-10 flex items-center justify-between font-mono text-[9px] tracking-[0.18em] text-[#49634b]/70 uppercase'>
				<span>Field notes</span>
				<span className='hidden items-center gap-1.5 sm:flex'>
					<i className='h-1.5 w-1.5 rounded-full bg-[#7b9a52] shadow-[0_0_10px_#7b9a52]' />
					Alive
				</span>
			</div>

			{failed ? (
				<button
					type='button'
					onClick={() => router.push('/blog')}
					className='absolute inset-5 flex flex-col items-center justify-center gap-3 rounded-[28px] border border-white/50 bg-white/25 text-center text-sm text-[#40584b]'>
					<BookOpenText aria-hidden='true' className='h-6 w-6' />
					<span>进入随心记</span>
				</button>
			) : (
				<canvas
					ref={canvasRef}
					aria-label='可拖拽、可翻面的藤蔓木牌；点击进入随心记'
					className='block h-full w-full touch-none transition-opacity duration-700'
					style={{ opacity: ready ? 1 : 0 }}
				/>
			)}

			<div className='absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-1.5 px-3'>
				<button
					type='button'
					onClick={() => apiRef.current?.pulse()}
					className='flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-white/55 text-[#456047] shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e]'
					aria-label='轻弹木牌'>
					<Sparkles aria-hidden='true' className='h-4 w-4' />
				</button>
				<button
					type='button'
					onClick={() => router.push('/blog')}
					className='flex h-10 items-center gap-2 rounded-full border border-white/60 bg-[#365b43]/90 px-4 text-xs font-medium tracking-wide text-white shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[#294c36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e]'>
					<BookOpenText aria-hidden='true' className='h-4 w-4' />
					随心记
				</button>
				<button
					type='button'
					onClick={() => apiRef.current?.flip()}
					className='flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-white/55 text-[#456047] shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55784e]'
					aria-label='翻转木牌'>
					<RotateCcw aria-hidden='true' className='h-4 w-4' />
				</button>
			</div>
		</section>
	)
}

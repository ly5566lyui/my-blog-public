'use client'
import { useEffect, useRef, useState } from 'react'
import { RefreshCwIcon, FlipHorizontal2Icon, ActivityIcon } from 'lucide-react'
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
	const [hint, setHint] = useState(true)
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
				const api = mount(canvas, { widget: false })
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

	// 就绪后轻弹一下 + 提示渐隐
	useEffect(() => {
		if (!ready) return
		const t = setTimeout(() => apiRef.current?.pulse(), 1500)
		const t2 = setTimeout(() => setHint(false), 8000)
		return () => {
			clearTimeout(t)
			clearTimeout(t2)
		}
	}, [ready])

	// 只在首页渲染
	if (failed || pathname !== '/') return null

	const btn =
		'pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-md transition hover:bg-white/15 hover:text-white active:scale-90'

	return (
		<section
			className='relative w-full overflow-hidden rounded-b-[28px] bg-[#101710] max-sm:rounded-b-[20px]'
			style={{ height: 'clamp(420px, 58vh, 560px)' }}
			aria-label='藤蔓木牌 随心记'
		>
			{/* 深色场景画布 */}
			<canvas ref={canvasRef} className='block h-full w-full touch-none' style={{ opacity: ready ? 1 : 0, transition: 'opacity .8s ease' }} />

			{/* 角落装饰文字 */}
			<div className='pointer-events-none absolute top-5 left-6 font-serif text-xs tracking-[0.22em] text-white/40 uppercase'>
				随心记
				<span className='mt-1 block text-[9px] font-mono tracking-[0.18em] normal-case opacity-60'>SUI XIN JI — FIELD NOTE</span>
			</div>

			{/* 操作按钮 */}
			<div className='absolute right-4 bottom-4 flex items-center gap-2'>
				<button type='button' className={btn} title='弹跳' aria-label='弹跳' onClick={() => apiRef.current?.pulse()}>
					<ActivityIcon className='size-4' />
				</button>
				<button type='button' className={btn} title='翻面' aria-label='翻面' onClick={() => apiRef.current?.flip()}>
					<FlipHorizontal2Icon className='size-4' />
				</button>
				<button type='button' className={btn} title='归位' aria-label='归位' onClick={() => apiRef.current?.reset()}>
					<RefreshCwIcon className='size-4' />
				</button>
			</div>

			{/* 底部提示 */}
			<p
				className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-white/50 uppercase transition-opacity duration-700 max-sm:hidden ${hint ? 'opacity-100' : 'opacity-0'}`}
			>
				拖住木牌 · 感受藤绳回弹
			</p>
		</section>
	)
}
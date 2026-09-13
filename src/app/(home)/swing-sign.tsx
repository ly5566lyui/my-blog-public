'use client'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

const MAX_ANGLE = 30 // 最大摆角(度)
const OMEGA = 4.2 // 角频率 rad/s（决定摆动快慢，周期约 1.5s）
const DAMPING = 1.4 // 阻尼系数（越大停得越快）
const SWING_LEN = 180 // 等效摆长(px)，用于把拖动位移换算成角速度

export default function SwingSign() {
	const angleRef = useRef(0)
	const velRef = useRef(0)
	const draggingRef = useRef(false)
	const lastXRef = useRef(0)
	const lastTimeRef = useRef(0)
	const rafRef = useRef<number | undefined>(undefined)
	const plankRef = useRef<HTMLDivElement>(null)

	const apply = () => {
		if (plankRef.current) plankRef.current.style.transform = `rotate(${angleRef.current}deg)`
	}

	const startLoop = () => {
		if (rafRef.current) return
		let last = performance.now()
		const loop = (t: number) => {
			const dt = Math.min((t - last) / 1000, 0.032)
			last = t
			if (!draggingRef.current) {
				// 阻尼简谐运动（谐振衰减）
				const acc = -OMEGA * OMEGA * angleRef.current - DAMPING * velRef.current
				velRef.current += acc * dt
				angleRef.current += velRef.current * dt
				// 停摆判定
				if (Math.abs(angleRef.current) < 0.12 && Math.abs(velRef.current) < 0.5) {
					angleRef.current = 0
					velRef.current = 0
					rafRef.current = undefined
					apply()
					return
				}
				apply()
			}
			rafRef.current = requestAnimationFrame(loop)
		}
		rafRef.current = requestAnimationFrame(loop)
	}

	useEffect(() => {
		startLoop()
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const onPointerDown = (e: ReactPointerEvent) => {
		draggingRef.current = true
		lastXRef.current = e.clientX
		lastTimeRef.current = performance.now()
		;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
	}

	const onPointerMove = (e: ReactPointerEvent) => {
		if (!draggingRef.current) return
		const now = performance.now()
		const dt = Math.max((now - lastTimeRef.current) / 1000, 0.001)
		const dx = e.clientX - lastXRef.current
		const dAngle = (dx / SWING_LEN) * (180 / Math.PI)
		angleRef.current = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angleRef.current + dAngle))
		velRef.current = dAngle / dt // 拖动角速度，松手后作为摆动的初速
		lastXRef.current = e.clientX
		lastTimeRef.current = now
		apply()
	}

	const endDrag = () => {
		if (!draggingRef.current) return
		draggingRef.current = false
		startLoop() // 物理循环接管，自然谐振衰减
	}

	return (
		<div
			className='fixed left-1/2 top-10 z-20 -translate-x-1/2 cursor-grab touch-none select-none active:cursor-grabbing max-sm:top-1 max-sm:scale-[0.55]'
			style={{ transformOrigin: '50% 0px' }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
			onLostPointerCapture={endDrag}
		>
			<div ref={plankRef} className='relative' style={{ transform: 'rotate(0deg)', transformOrigin: '50% 0px' }}>
				{/* 绳子：顶部挂点汇聚 -> 牌子左右上角 */}
				<svg width='180' height='52' viewBox='0 0 180 52' className='block'>
					<path d='M90 0 L18 52' stroke='#8d6e63' strokeWidth='3' fill='none' strokeLinecap='round' />
					<path d='M90 0 L162 52' stroke='#8d6e63' strokeWidth='3' fill='none' strokeLinecap='round' />
					<circle cx='90' cy='0' r='4.5' fill='#5d4037' />
					<circle cx='90' cy='0' r='2' fill='#4e342e' />
				</svg>
				{/* 木牌 */}
				<div
					className='relative mx-auto h-[104px] w-[180px] rounded-2xl border-[3px] border-[#5d3a1a] shadow-[0_10px_24px_rgba(0,0,0,0.35),inset_0_2px_6px_rgba(255,255,255,0.25)]'
					style={{
						background:
							'repeating-linear-gradient(90deg, rgba(0,0,0,0.07) 0 2px, transparent 2px 13px), linear-gradient(180deg,#9c6b38 0%,#8a5a2b 45%,#7a4f24 100%)'
					}}
				>
					{/* 绳孔 */}
					<span className='absolute top-1.5 left-4 h-2.5 w-2.5 rounded-full bg-[#4a2f15] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]' />
					<span className='absolute top-1.5 right-4 h-2.5 w-2.5 rounded-full bg-[#4a2f15] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]' />
					{/* 文字 */}
					<div className='flex h-full items-center justify-center'>
						<span
							className='pl-[0.35em] text-3xl font-medium tracking-[0.35em] text-[#4a2c0f]'
							style={{ textShadow: '0 1px 0 rgba(255,255,255,0.25)' }}
						>
							随心记
						</span>
					</div>
					{/* 藤蔓覆盖层 */}
					<svg viewBox='0 0 180 104' className='pointer-events-none absolute inset-0' width='180' height='104'>
						<g fill='none' strokeLinecap='round'>
							<path d='M-4 96 Q 30 78 52 88 T 118 66 T 184 74' stroke='#2e7d32' strokeWidth='3.5' />
							<path d='M52 88 Q 58 60 78 52' stroke='#2e7d32' strokeWidth='3' />
							<path d='M118 66 Q 126 40 148 34' stroke='#2e7d32' strokeWidth='3' />
							<path d='M40 86 Q 20 68 8 44' stroke='#388e3c' strokeWidth='2.5' />
							<path d='M90 52 Q 92 32 100 20' stroke='#43a047' strokeWidth='2' />
						</g>
						<g>
							<ellipse cx='78' cy='50' rx='13' ry='6.5' fill='#66bb6a' transform='rotate(-18 78 50)' />
							<ellipse cx='96' cy='58' rx='11' ry='5.5' fill='#81c784' transform='rotate(24 96 58)' />
							<ellipse cx='148' cy='32' rx='12' ry='6' fill='#4caf50' transform='rotate(-28 148 32)' />
							<ellipse cx='130' cy='38' rx='10' ry='5' fill='#66bb6a' transform='rotate(30 130 38)' />
							<ellipse cx='58' cy='82' rx='10' ry='5' fill='#388e3c' transform='rotate(-40 58 82)' />
							<ellipse cx='30' cy='80' rx='12' ry='6' fill='#66bb6a' transform='rotate(20 30 80)' />
							<ellipse cx='8' cy='44' rx='11' ry='5.5' fill='#81c784' transform='rotate(-30 8 44)' />
							<ellipse cx='22' cy='58' rx='9' ry='4.5' fill='#4caf50' transform='rotate(35 22 58)' />
							<ellipse cx='112' cy='62' rx='9' ry='4.5' fill='#388e3c' transform='rotate(-20 112 62)' />
							<ellipse cx='164' cy='60' rx='11' ry='5.5' fill='#66bb6a' transform='rotate(-45 164 60)' />
							<ellipse cx='178' cy='70' rx='9' ry='4.5' fill='#81c784' transform='rotate(15 178 70)' />
							<ellipse cx='44' cy='36' rx='10' ry='5' fill='#4caf50' transform='rotate(25 44 36)' />
							<ellipse cx='102' cy='18' rx='8' ry='4' fill='#66bb6a' transform='rotate(-15 102 18)' />
						</g>
					</svg>
				</div>
			</div>
		</div>
	)
}
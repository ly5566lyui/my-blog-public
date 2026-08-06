"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import { DotLottiePlayer } from "@dotlottie/react-player"
import { useSize } from "@/hooks/use-size"

const STORAGE_KEY = "cat-animation-pos"
const W = 140
const H = 100

export function CatAnimation() {
  const { maxSM } = useSize()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const p = JSON.parse(saved)
        if (typeof p.x === "number" && typeof p.y === "number") {
          setPos(p)
          return
        }
      }
    } catch {}
    setPos({ x: 16, y: typeof window !== "undefined" ? window.innerHeight - H - 16 : 200 })
  }, [])

  const posRef = useRef(pos)
  posRef.current = pos
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    if (posRef.current) {
      dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: posRef.current.x, origY: posRef.current.y }
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    setPos({
      x: Math.max(0, dragRef.current.origX + e.clientX - dragRef.current.startX),
      y: Math.max(0, dragRef.current.origY + e.clientY - dragRef.current.startY),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    if (!dragRef.current.dragging) return
    dragRef.current.dragging = false
    if (posRef.current) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)) } catch {}
    }
  }, [])

  if (!pos) return null
  const scale = maxSM ? 0.75 : 1

  return (
    <div
      className="fixed z-50 cursor-grab select-none active:cursor-grabbing"
      style={{ left: pos.x, top: pos.y, width: W * scale, height: H * scale, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <DotLottiePlayer src="/lottie/cat.json" autoplay loop style={{ width: W * scale, height: H * scale }} />
    </div>
  )
}

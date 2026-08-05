"use client"

import { DotLottieReact } from "@dotlottie/react-player"
import { useSize } from "@/hooks/use-size"

export function CatAnimation() {
  const { maxSM } = useSize()

  return (
    <div className={"fixed bottom-4 right-4 z-50 cursor-pointer select-none " + (maxSM ? "scale-75" : "")}>
      <DotLottieReact
        src="/lottie/cat.json"
        autoplay
        loop
        style={{ width: 140, height: 100 }}
      />
    </div>
  )
}


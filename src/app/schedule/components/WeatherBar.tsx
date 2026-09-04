'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, MapPin, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { fetchWeather, getCityCoord, type WeatherData } from '../utils/weather'

interface WeatherBarProps {
  defaultCity?: string
}

export default function WeatherBar({ defaultCity = '北京' }: WeatherBarProps) {
  const [city, setCity] = useState(defaultCity)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const loadWeather = async (cityName: string) => {
    const coord = getCityCoord(cityName)
    if (!coord) return
    setLoading(true)
    try {
      const data = await fetchWeather(coord.lat, coord.lon)
      setWeather(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWeather(city)
    const timer = setInterval(() => loadWeather(city), 30 * 60 * 1000) // 30 分钟刷新
    return () => clearInterval(timer)
  }, [city])

  if (!weather) return null

  return (
    <div className='card mb-4 overflow-hidden'>
      <button
        onClick={() => setExpanded(!expanded)}
        className='flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50/50'
      >
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-1.5 text-sm font-medium text-gray-600'>
            <MapPin className='h-4 w-4 text-brand' />
            {city}
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-2xl font-light tabular-nums text-gray-900'>
              {weather.current.temp}°
            </span>
            <span className='text-sm text-gray-500'>
              {weather.current.description}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={e => {
              e.stopPropagation()
              loadWeather(city)
            }}
            disabled={loading}
            className='rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand disabled:opacity-50'
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? (
            <ChevronUp className='h-4 w-4 text-gray-400' />
          ) : (
            <ChevronDown className='h-4 w-4 text-gray-400' />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='overflow-hidden border-t border-gray-100'
          >
            <div className='grid grid-cols-7 gap-px bg-gray-100 p-px'>
              {weather.daily.slice(0, 7).map(day => {
                const date = new Date(day.date)
                const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
                return (
                  <div key={day.date} className='flex flex-col items-center gap-1 bg-white p-2'>
                    <span className='text-xs text-gray-500'>周{weekDay}</span>
                    <span className='text-xs text-gray-400'>{date.getDate()}日</span>
                    <span className='text-sm font-medium text-gray-700'>
                      {day.tempMax}°
                    </span>
                    <span className='text-xs text-gray-400'>
                      {day.tempMin}°
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
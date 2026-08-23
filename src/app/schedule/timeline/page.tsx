'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Calendar, Check, Download, PencilLine, CalendarDays } from 'lucide-react'
import initialList from '../list.json'
import type { ScheduleItem } from '../services/push-schedule'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')

const STORAGE_KEY = 'schedule_cache_v1'

function splitDate(date: string) {
  const parts = date.split('-')
  if (parts.length !== 3) return null
  return { y: parts[0], m: parts[1], d: parts[2] }
}

export default function TimelinePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialList as ScheduleItem[])

  // 初始化：优先读取 localStorage 缓存，与日历页数据联动
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) setSchedule(parsed)
      } catch {}
    }
  }, [])

  // 排序（早 → 晚）
  const sortedList = useMemo(
    () => [...schedule].sort((a, b) => a.date.localeCompare(b.date)),
    [schedule]
  )

  // 按月分组
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>()
    sortedList.forEach(item => {
      const monthKey = dayjs(item.date).format('YYYY-MM')
      const arr = map.get(monthKey)
      if (arr) arr.push(item)
      else map.set(monthKey, [item])
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [sortedList])

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(sortedList, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schedule-${dayjs().format('YYYYMMDD')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='mx-auto max-w-3xl px-6 py-16 max-sm:px-4'>
      {/* 头部 */}
      <div className='mb-8 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <Calendar className='text-brand h-6 w-6' />
          <h1 className='text-xl font-medium'>日程时间轴</h1>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={handleExport}
            disabled={sortedList.length === 0}
            className='flex items-center gap-1.5 rounded-xl border bg-white/60 px-4 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80 disabled:opacity-40'
          >
            <Download className='h-4 w-4' />
            导出 JSON
          </button>
          <Link href='/schedule' className='brand-btn flex items-center gap-1.5 px-4'>
            <PencilLine className='h-4 w-4' />
            前往编辑
          </Link>
        </div>
      </div>

      {sortedList.length === 0 ? (
        <div className='flex min-h-[40vh] flex-col items-center justify-center gap-4'>
          <CalendarDays className='text-gray-300 h-16 w-16' />
          <p className='text-secondary text-sm'>暂无日程安排</p>
          <Link href='/schedule' className='brand-btn flex items-center gap-1.5 px-5 py-2'>
            <PencilLine className='h-4 w-4' />
            前往日历添加
          </Link>
        </div>
      ) : (
        <div className='space-y-8'>
          {grouped.map(([monthKey, monthItems]) => {
            return (
              <div key={monthKey}>
                {/* 月份标题 */}
                <h2 className='mb-4 text-lg font-semibold text-gray-800'>
                  {dayjs(monthKey + '-01').format('YYYY年M月')}
                </h2>

                {/* 时间轴 */}
                <div className='relative ml-2'>
                  {/* 时间轴主线 */}
                  <div className='absolute top-2 bottom-2 left-[64px] w-0.5 rounded bg-gray-200 max-sm:left-[46px]' />

                  {monthItems.map(item => {
                    const d = splitDate(item.date)
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='relative mb-5 grid grid-cols-[64px_1fr] gap-[18px] max-sm:grid-cols-[46px_1fr] max-sm:gap-3'
                      >
                        {/* 左侧日期 */}
                        <div className='pt-4 text-right'>
                          {d ? (
                            <>
                              <div className='text-[15px] leading-tight font-bold'>{d.d}</div>
                              <div className='text-secondary text-[11px] leading-tight'>
                                {d.m}月 {d.y.slice(2)}
                              </div>
                            </>
                          ) : (
                            <div className='pt-1 text-xs'>{item.date}</div>
                          )}
                        </div>

                        {/* 节点 */}
                        <div
                          className={`absolute top-5 left-[58px] z-10 h-3.5 w-3.5 rounded-full border-[3px] bg-white max-sm:left-[40px] ${
                            item.done ? 'border-green-500' : 'border-brand'
                          }`}
                        />

                        {/* 卡片 */}
                        <article className='rounded-2xl border bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md'>
                          <div className='mb-1 flex flex-wrap items-center gap-2'>
                            <h3 className={`text-base font-semibold ${item.done ? 'text-secondary line-through' : ''}`}>
                              {item.title || '未命名'}
                            </h3>
                            {item.done && (
                              <span className='flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700'>
                                <Check className='h-3 w-3' />
                                已完成
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className='text-secondary text-[13px] leading-relaxed'>{item.description}</p>
                          )}
                          {item.subTasks.length > 0 && (
                            <div className='mt-3 space-y-1 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5'>
                              {item.subTasks.map(s => (
                                <div key={s.id} className='flex items-center gap-2 py-0.5 text-[13px]'>
                                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.done ? 'bg-green-500' : 'bg-gray-300'}`} />
                                  <span className={s.done ? 'text-secondary line-through' : ''}>{s.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </article>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

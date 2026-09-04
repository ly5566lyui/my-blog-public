// 法定假日与调休：使用 NateScarlet/holiday-cn 数据源（与 MacCalendar 同款）
// 数据结构：{ "2024": { "2024-01-01": { "isOffDay": true, "name": "元旦" }, ... } }

const HOLIDAY_BASE = 'https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/'

export interface HolidayInfo {
  name: string
  isOffDay: boolean
}

const cache = new Map<string, Record<string, HolidayInfo>>()

async function fetchYear(year: number): Promise<Record<string, HolidayInfo>> {
  const cached = cache.get(String(year))
  if (cached) return cached
  try {
    const res = await fetch(`${HOLIDAY_BASE}${year}.json`)
    if (!res.ok) return {}
    const data = await res.json()
    cache.set(String(year), data)
    return data
  } catch {
    return {}
  }
}

/** 获取某天的假日信息（无假日返回 null） */
export async function getHoliday(date: Date): Promise<HolidayInfo | null> {
  const year = date.getFullYear()
  const dayData = await fetchYear(year)
  const key = date.toISOString().slice(0, 10) // YYYY-MM-DD
  return dayData[key] || null
}

/** 判断是否为工作日（考虑调休） */
export async function isWorkday(date: Date): Promise<boolean> {
  const info = await getHoliday(date)
  return info ? !info.isOffDay : date.getDay() !== 0 && date.getDay() !== 6
}

/** 判断是否为法定假日 */
export async function isHoliday(date: Date): Promise<boolean> {
  const info = await getHoliday(date)
  return info?.isOffDay === true
}
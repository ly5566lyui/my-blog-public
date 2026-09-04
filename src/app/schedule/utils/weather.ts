// 天气查询：使用 Open-Meteo API（免 Key，支持 7 日预报）
// API: https://api.open-meteo.com/v1/forecast?latitude=xx&longitude=xx&daily=temperature_2m_max,temperature_2m_min,weathercode

export interface DailyWeather {
  date: string
  tempMax: number
  tempMin: number
  code: number // WMO weather code
  description: string
}

export interface WeatherData {
  current: {
    temp: number
    code: number
    description: string
  }
  daily: DailyWeather[]
}

const WMO_CODES: Record<number, string> = {
  0: '晴',
  1: '大部晴',
  2: '多云',
  3: '阴天',
  45: '雾',
  48: '霜雾',
  51: '小毛毛雨',
  53: '中毛毛雨',
  55: '大毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '阵雨',
  81: '强阵雨',
  82: '暴雨',
  85: '阵雪',
  86: '强阵雪',
  95: '雷暴',
  96: '雷暴伴冰雹',
  99: '雷暴伴大冰雹'
}

function getWeatherDesc(code: number): string {
  return WMO_CODES[code] || '未知'
}

/** 获取天气数据 */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=Asia%2FShanghai`
  
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Weather fetch failed')
    const data = await res.json()
    
    return {
      current: {
        temp: data.current_weather.temperature,
        code: data.current_weather.weathercode,
        description: getWeatherDesc(data.current_weather.weathercode)
      },
      daily: data.daily.time.map((t: string, i: number) => ({
        date: t,
        tempMax: data.daily.temperature_2m_max[i],
        tempMin: data.daily.temperature_2m_min[i],
        code: data.daily.weathercode[i],
        description: getWeatherDesc(data.daily.weathercode[i])
      }))
    }
  } catch {
    // 离线/失败时返回默认数据
    return {
      current: { temp: 26, code: 0, description: '晴' },
      daily: []
    }
  }
}

/** 获取城市坐标（简化版，实际可接 GeoDB 或本地存储） */
export function getCityCoord(city: string): { lat: number; lon: number } | null {
  const coords: Record<string, { lat: number; lon: number }> = {
    '北京': { lat: 39.9042, lon: 116.4074 },
    '上海': { lat: 31.2304, lon: 121.4737 },
    '广州': { lat: 23.1291, lon: 113.2644 },
    '深圳': { lat: 22.5431, lon: 114.0579 },
    '杭州': { lat: 30.2741, lon: 120.1551 },
    '成都': { lat: 30.5728, lon: 104.0668 },
  }
  return coords[city] || null
}
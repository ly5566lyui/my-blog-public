'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Compass, Globe, KeyRound, LoaderCircle, MapPin, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { readFileAsText } from '@/lib/file-utils'
import { pushJsonFile } from '@/lib/push-json'
import initialFootprints from './list.json'
import diaryList from '@/app/diary/list.json'
import picturesList from '@/app/pictures/list.json'
import type { DiaryEntry } from '@/app/diary/types'
import type { FootprintItem, FootprintStatus } from './types'

type PictureItem = {
	id: string
	uploadedAt: string
	description?: string
	images?: string[]
}

const CITY_PRESETS: Array<{ city: string; region: string; country: string; lat: number; lng: number }> = [
	{ city: '北京', region: '北京', country: '中国', lat: 39.9042, lng: 116.4074 },
	{ city: '上海', region: '上海', country: '中国', lat: 31.2304, lng: 121.4737 },
	{ city: '广州', region: '广东', country: '中国', lat: 23.1291, lng: 113.2644 },
	{ city: '深圳', region: '广东', country: '中国', lat: 22.5431, lng: 114.0579 },
	{ city: '成都', region: '四川', country: '中国', lat: 30.5728, lng: 104.0668 },
	{ city: '宜宾', region: '四川', country: '中国', lat: 28.7518, lng: 104.6433 },
	{ city: '重庆', region: '重庆', country: '中国', lat: 29.563, lng: 106.5516 },
	{ city: '杭州', region: '浙江', country: '中国', lat: 30.2741, lng: 120.1551 },
	{ city: '南京', region: '江苏', country: '中国', lat: 32.0603, lng: 118.7969 },
	{ city: '苏州', region: '江苏', country: '中国', lat: 31.2989, lng: 120.5853 },
	{ city: '武汉', region: '湖北', country: '中国', lat: 30.5928, lng: 114.3055 },
	{ city: '西安', region: '陕西', country: '中国', lat: 34.3416, lng: 108.9398 },
	{ city: '长沙', region: '湖南', country: '中国', lat: 28.2282, lng: 112.9388 },
	{ city: '厦门', region: '福建', country: '中国', lat: 24.4798, lng: 118.0894 },
	{ city: '青岛', region: '山东', country: '中国', lat: 36.0671, lng: 120.3826 },
	{ city: '昆明', region: '云南', country: '中国', lat: 25.0389, lng: 102.7183 },
	{ city: '大理', region: '云南', country: '中国', lat: 25.6065, lng: 100.2676 },
	{ city: '拉萨', region: '西藏', country: '中国', lat: 29.65, lng: 91.1 },
	{ city: '三亚', region: '海南', country: '中国', lat: 18.2528, lng: 109.5119 },
	{ city: '哈尔滨', region: '黑龙江', country: '中国', lat: 45.8038, lng: 126.535 },
	{ city: '香港', region: '香港', country: '中国', lat: 22.3193, lng: 114.1694 },
	{ city: '台北', region: '台湾', country: '中国', lat: 25.033, lng: 121.5654 },
	{ city: '东京', region: '关东', country: '日本', lat: 35.6762, lng: 139.6503 },
	{ city: '大阪', region: '关西', country: '日本', lat: 34.6937, lng: 135.5023 },
	{ city: '首尔', region: '首都圈', country: '韩国', lat: 37.5665, lng: 126.978 },
	{ city: '新加坡', region: '新加坡', country: '新加坡', lat: 1.3521, lng: 103.8198 },
	{ city: '曼谷', region: '曼谷', country: '泰国', lat: 13.7563, lng: 100.5018 },
	{ city: '伦敦', region: '英格兰', country: '英国', lat: 51.5072, lng: -0.1276 },
	{ city: '巴黎', region: '法兰西岛', country: '法国', lat: 48.8566, lng: 2.3522 },
	{ city: '纽约', region: '纽约州', country: '美国', lat: 40.7128, lng: -74.006 }
]

const STATUS_META: Record<FootprintStatus, { label: string; color: string; badge: string }> = {
	lived: { label: '常居', color: '#35bfab', badge: 'bg-brand/15 text-brand' },
	visited: { label: '去过', color: '#10b981', badge: 'bg-emerald-500/15 text-emerald-700' },
	wishlist: { label: '想去', color: '#f59e0b', badge: 'bg-amber-500/15 text-amber-700' }
}

const CHINA_BOUNDS = { minLng: 73, maxLng: 136, minLat: 17, maxLat: 54 }
const WORLD_BOUNDS = { minLng: -175, maxLng: 180, minLat: -58, maxLat: 80 }

function project(lat: number, lng: number, mode: 'china' | 'world') {
	const b = mode === 'china' ? CHINA_BOUNDS : WORLD_BOUNDS
	const x = ((lng - b.minLng) / (b.maxLng - b.minLng)) * 800
	const y = ((b.maxLat - lat) / (b.maxLat - b.minLat)) * 460
	return { x, y }
}

function inBounds(lat: number, lng: number, mode: 'china' | 'world') {
	const b = mode === 'china' ? CHINA_BOUNDS : WORLD_BOUNDS
	return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat
}

export default function FootprintsPage() {
	const { isAuth, setPrivateKey } = useAuthStore()
	const keyInputRef = useRef<HTMLInputElement>(null)
	const [items, setItems] = useState<FootprintItem[]>(initialFootprints as FootprintItem[])
	const [originalItems, setOriginalItems] = useState<FootprintItem[]>(initialFootprints as FootprintItem[])
	const [mapMode, setMapMode] = useState<'china' | 'world'>('china')
	const [selectedId, setSelectedId] = useState<string | null>((initialFootprints as FootprintItem[])[0]?.id ?? null)
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)

	// Form state
	const [city, setCity] = useState('')
	const [region, setRegion] = useState('')
	const [country, setCountry] = useState('中国')
	const [lat, setLat] = useState('30.5728')
	const [lng, setLng] = useState('104.0668')
	const [status, setStatus] = useState<FootprintStatus>('visited')
	const [date, setDate] = useState(dayjs().format('YYYY-MM'))
	const [note, setNote] = useState('')

	const selectedItem = useMemo(() => items.find(i => i.id === selectedId) ?? items[0] ?? null, [items, selectedId])

	const stats = useMemo(() => {
		const visited = items.filter(i => i.status === 'visited' || i.status === 'lived').length
		const wishlist = items.filter(i => i.status === 'wishlist').length
		const regions = new Set(items.filter(i => i.status !== 'wishlist').map(i => i.region)).size
		return { visited, wishlist, regions }
	}, [items])

	// Auto-link diaries and pictures mentioning this city or region
	const linkedMemories = useMemo(() => {
		if (!selectedItem) return { diaries: [] as DiaryEntry[], pictures: [] as PictureItem[] }
		const keys = [selectedItem.city, selectedItem.region].filter(Boolean)
		const diaries = (diaryList as DiaryEntry[]).filter(d => keys.some(k => d.title.includes(k) || d.content.includes(k)))
		const pictures = (picturesList as PictureItem[]).filter(p => keys.some(k => (p.description || '').includes(k)))
		return { diaries, pictures }
	}, [selectedItem])

	const openCreate = () => {
		setEditingId(null)
		setCity('')
		setRegion('')
		setCountry('中国')
		setLat('30.5728')
		setLng('104.0668')
		setStatus('visited')
		setDate(dayjs().format('YYYY-MM'))
		setNote('')
		setDialogOpen(true)
	}

	const openEdit = (item: FootprintItem) => {
		setEditingId(item.id)
		setCity(item.city)
		setRegion(item.region)
		setCountry(item.country)
		setLat(String(item.lat))
		setLng(String(item.lng))
		setStatus(item.status)
		setDate(item.date)
		setNote(item.note)
		setDialogOpen(true)
	}

	const applyPreset = (presetName: string) => {
		const found = CITY_PRESETS.find(c => c.city === presetName)
		if (!found) return
		setCity(found.city)
		setRegion(found.region)
		setCountry(found.country)
		setLat(String(found.lat))
		setLng(String(found.lng))
	}

	const handleSaveDraft = () => {
		const latNum = Number(lat)
		const lngNum = Number(lng)
		if (!city.trim() || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
			toast.error('请填写城市名称和有效经纬度')
			return
		}
		if (editingId) {
			setItems(prev =>
				prev.map(i =>
					i.id === editingId
						? { ...i, city: city.trim(), region: region.trim(), country: country.trim(), lat: latNum, lng: lngNum, status, date, note: note.trim() }
						: i
				)
			)
		} else {
			const created: FootprintItem = {
				id: `fp-${Date.now().toString(36)}`,
				city: city.trim(),
				region: region.trim(),
				country: country.trim(),
				lat: latNum,
				lng: lngNum,
				status,
				date,
				note: note.trim()
			}
			setItems(prev => [...prev, created])
			setSelectedId(created.id)
		}
		setDialogOpen(false)
	}

	const handleDelete = (id: string) => {
		if (!window.confirm('确定删除这个足迹点吗？')) return
		setItems(prev => prev.filter(i => i.id !== id))
	}

	const pushToGitHub = async () => {
		setIsSaving(true)
		try {
			await pushJsonFile('src/app/footprints/list.json', items, 'docs(footprints): 更新点亮足迹地图')
			setOriginalItems(items)
			setIsEditMode(false)
			toast.success('足迹已同步到 GitHub，部署完成后生效')
		} catch (error: any) {
			toast.error(`同步失败：${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	const handlePublishClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
			return
		}
		void pushToGitHub()
	}

	const handleKeyFile = async (file: File) => {
		try {
			const pem = await readFileAsText(file)
			await setPrivateKey(pem)
			await pushToGitHub()
		} catch (error: any) {
			toast.error(`密钥读取失败：${error?.message || '未知错误'}`)
		}
	}

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={e => {
					const f = e.target.files?.[0]
					if (f) void handleKeyFile(f)
					e.currentTarget.value = ''
				}}
			/>

			<div className='mx-auto min-h-screen max-w-[1060px] px-4 pt-24 pb-28 sm:px-6'>
				<header className='mb-6 flex flex-wrap items-end justify-between gap-4'>
					<div>
						<div className='text-brand mb-1 flex items-center gap-1.5 text-xs font-medium tracking-widest uppercase'>
							<Compass className='h-3.5 w-3.5' />
							Footprints Map
						</div>
						<h1 className='text-3xl font-bold'>点亮足迹地图</h1>
						<p className='text-secondary mt-1 text-sm'>记录去过的城市、常居之地和想去清单，自动关联站内日记与相册回忆。</p>
					</div>

					<div className='flex flex-wrap items-center gap-2'>
						<div className='flex rounded-xl border bg-white/60 p-1 text-xs backdrop-blur-sm'>
							<button
								type='button'
								onClick={() => setMapMode('china')}
								className={`rounded-lg px-3 py-1.5 font-medium transition ${mapMode === 'china' ? 'bg-brand text-white' : 'text-secondary hover:text-primary'}`}>
								中国视角
							</button>
							<button
								type='button'
								onClick={() => setMapMode('world')}
								className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition ${mapMode === 'world' ? 'bg-brand text-white' : 'text-secondary hover:text-primary'}`}>
								<Globe className='h-3.5 w-3.5' />
								世界视角
							</button>
						</div>

						{isEditMode ? (
							<>
								<button
									type='button'
									onClick={() => {
										setItems(originalItems)
										setIsEditMode(false)
									}}
									className='rounded-xl border bg-white/65 px-3.5 py-2 text-xs font-medium'>
									取消
								</button>
								<button type='button' onClick={openCreate} className='inline-flex items-center gap-1 rounded-xl border bg-white/80 px-3.5 py-2 text-xs font-medium'>
									<Plus className='h-3.5 w-3.5' />
									点亮新城市
								</button>
								<button type='button' onClick={handlePublishClick} disabled={isSaving} className='brand-btn px-4 py-2 text-xs disabled:opacity-60'>
									{isSaving ? <LoaderCircle className='h-3.5 w-3.5 animate-spin' /> : isAuth ? <Save className='h-3.5 w-3.5' /> : <KeyRound className='h-3.5 w-3.5' />}
									{isSaving ? '保存中...' : isAuth ? '保存同步' : '导入密钥并保存'}
								</button>
							</>
						) : (
							<button type='button' onClick={() => setIsEditMode(true)} className='rounded-xl border bg-white/65 px-4 py-2 text-xs font-medium backdrop-blur-sm hover:bg-white/90'>
								管理足迹
							</button>
						)}
					</div>
				</header>

				{/* 统计条 */}
				<div className='mb-6 grid grid-cols-3 gap-3'>
					<div className='rounded-3xl border bg-white/60 p-4 text-center backdrop-blur-md'>
						<div className='text-brand text-2xl font-bold'>{stats.visited}</div>
						<div className='text-secondary mt-0.5 text-xs'>已点亮城市</div>
					</div>
					<div className='rounded-3xl border bg-white/60 p-4 text-center backdrop-blur-md'>
						<div className='text-emerald-600 text-2xl font-bold'>{stats.regions}</div>
						<div className='text-secondary mt-0.5 text-xs'>涉足省份/地区</div>
					</div>
					<div className='rounded-3xl border bg-white/60 p-4 text-center backdrop-blur-md'>
						<div className='text-amber-500 text-2xl font-bold'>{stats.wishlist}</div>
						<div className='text-secondary mt-0.5 text-xs'>想去清单</div>
					</div>
				</div>

				{/* 地图 + 城市详情 */}
				<div className='grid gap-5 lg:grid-cols-[1.6fr_1fr]'>
					<div className='relative overflow-hidden rounded-[32px] border bg-white/65 p-4 shadow-sm backdrop-blur-md'>
						<svg viewBox='0 0 800 460' className='h-auto w-full rounded-2xl bg-gradient-to-br from-[#e8f6f3] via-[#f2f8f7] to-[#e6f1f6]'>
							{/* 经纬网格 */}
							{Array.from({ length: 9 }).map((_, i) => (
								<line key={`v-${i}`} x1={(i + 1) * 80} y1={0} x2={(i + 1) * 80} y2={460} stroke='#334f52' strokeOpacity={0.07} strokeDasharray='4 4' />
							))}
							{Array.from({ length: 5 }).map((_, i) => (
								<line key={`h-${i}`} x1={0} y1={(i + 1) * 76} x2={800} y2={(i + 1) * 76} stroke='#334f52' strokeOpacity={0.07} strokeDasharray='4 4' />
							))}

							{/* 轮廓参考 */}
							{mapMode === 'china' ? (
								<path
									d='M130,155 L205,118 L295,128 L370,112 L460,92 L545,62 L630,72 L685,112 L645,165 L605,198 L628,248 L600,315 L535,365 L455,392 L375,382 L315,342 L245,322 L165,275 L105,215 Z'
									fill='#ffffff'
									fillOpacity={0.72}
									stroke='#35bfab'
									strokeOpacity={0.35}
									strokeWidth={2}
								/>
							) : (
								<g fill='#ffffff' fillOpacity={0.72} stroke='#35bfab' strokeOpacity={0.3} strokeWidth={1.5}>
									<path d='M95,95 L230,85 L255,155 L210,205 L145,190 L95,140 Z' />
									<path d='M215,235 L275,245 L295,320 L250,395 L220,350 Z' />
									<path d='M365,90 L465,85 L485,150 L435,165 L370,145 Z' />
									<path d='M375,180 L470,185 L495,290 L440,350 L395,290 Z' />
									<path d='M485,90 L685,85 L715,185 L625,245 L515,215 L485,155 Z' />
									<path d='M625,295 L725,305 L735,375 L645,380 Z' />
								</g>
							)}

							{/* 城市足迹点 */}
							{items
								.filter(i => inBounds(i.lat, i.lng, mapMode))
								.map(item => {
									const { x, y } = project(item.lat, item.lng, mapMode)
									const meta = STATUS_META[item.status]
									const isSelected = selectedItem?.id === item.id
									return (
										<g key={item.id} onClick={() => setSelectedId(item.id)} className='cursor-pointer'>
											<circle cx={x} cy={y} r={isSelected ? 18 : 12} fill={meta.color} fillOpacity={0.22}>
												<animate attributeName='r' values='10;20;10' dur='2.6s' repeatCount='indefinite' />
												<animate attributeName='fill-opacity' values='0.32;0.06;0.32' dur='2.6s' repeatCount='indefinite' />
											</circle>
											<circle cx={x} cy={y} r={isSelected ? 7 : 5.5} fill={meta.color} stroke='#ffffff' strokeWidth={2.5} />
											<text x={x} y={y - 12} textAnchor='middle' fontSize='12' fontWeight={isSelected ? '700' : '500'} fill='#334f52'>
												{item.city}
											</text>
										</g>
									)
								})}
						</svg>

						<div className='mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-secondary'>
							<div className='flex items-center gap-3'>
								{Object.entries(STATUS_META).map(([k, v]) => (
									<span key={k} className='inline-flex items-center gap-1'>
										<span className='inline-block h-2.5 w-2.5 rounded-full' style={{ backgroundColor: v.color }} />
										{v.label}
									</span>
								))}
							</div>
							<span>点击地图上的发光城市点查看回忆</span>
						</div>
					</div>

					{/* 右侧详情 + 关联回忆 */}
					<div className='flex flex-col rounded-[32px] border bg-white/65 p-5 shadow-sm backdrop-blur-md'>
						{selectedItem ? (
							<>
								<div className='flex items-start justify-between gap-2'>
									<div>
										<div className='flex items-center gap-2'>
											<MapPin className='text-brand h-4 w-4' />
											<h2 className='text-xl font-bold'>{selectedItem.city}</h2>
											<span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_META[selectedItem.status].badge}`}>
												{STATUS_META[selectedItem.status].label}
											</span>
										</div>
										<p className='text-secondary mt-1 text-xs'>
											{selectedItem.country} · {selectedItem.region} · {selectedItem.date}
										</p>
									</div>
									{isEditMode && (
										<div className='flex gap-1'>
											<button type='button' onClick={() => openEdit(selectedItem)} className='rounded-lg p-1.5 hover:bg-white'>
												<Pencil className='h-4 w-4' />
											</button>
											<button type='button' onClick={() => handleDelete(selectedItem.id)} className='rounded-lg p-1.5 text-rose-500 hover:bg-rose-50'>
												<Trash2 className='h-4 w-4' />
											</button>
										</div>
									)}
								</div>

								<p className='text-primary mt-4 rounded-2xl bg-white/60 p-3.5 text-sm leading-relaxed'>{selectedItem.note || '这里留下了我的足迹。'}</p>

								<div className='mt-5 flex-1 space-y-3'>
									<div className='text-secondary text-xs font-medium'>自动关联的站内回忆</div>
									{linkedMemories.diaries.length === 0 && linkedMemories.pictures.length === 0 ? (
										<div className='text-secondary rounded-2xl border border-dashed bg-white/40 p-4 text-center text-xs'>
											在日记或相册描述里提到「{selectedItem.city}」即可自动关联到这里
										</div>
									) : (
										<div className='space-y-2'>
											{linkedMemories.diaries.map(d => (
												<Link key={d.id} href='/diary' className='block rounded-2xl border bg-white/70 p-3 transition hover:bg-white'>
													<div className='text-xs font-medium'>📖 {d.title || '无题日记'}</div>
													<p className='text-secondary mt-1 line-clamp-2 text-xs'>{d.content}</p>
												</Link>
											))}
											{linkedMemories.pictures.map(p => (
												<Link key={p.id} href='/pictures' className='flex items-center gap-3 rounded-2xl border bg-white/70 p-2.5 transition hover:bg-white'>
													{p.images?.[0] && <img src={p.images[0]} alt='' className='h-11 w-11 shrink-0 rounded-xl object-cover' />}
													<div className='min-w-0 flex-1'>
														<div className='text-xs font-medium'>📷 相册记录</div>
														<p className='text-secondary mt-0.5 line-clamp-2 text-xs'>{p.description}</p>
													</div>
												</Link>
											))}
										</div>
									)}
								</div>
							</>
						) : (
							<div className='text-secondary flex flex-1 items-center justify-center text-sm'>还没有足迹，点击右上角「管理足迹」点亮第一座城市吧</div>
						)}
					</div>
				</div>

				{/* 全部足迹列表 */}
				<div className='mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3'>
					{items.map(item => (
						<button
							key={item.id}
							type='button'
							onClick={() => setSelectedId(item.id)}
							className={`rounded-2xl border p-4 text-left backdrop-blur-sm transition ${
								selectedItem?.id === item.id ? 'border-brand bg-white/85 shadow-sm' : 'bg-white/55 hover:bg-white/75'
							}`}>
							<div className='flex items-center justify-between'>
								<span className='font-semibold'>{item.city}</span>
								<span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_META[item.status].badge}`}>{STATUS_META[item.status].label}</span>
							</div>
							<div className='text-secondary mt-1 text-xs'>
								{item.region} · {item.date}
							</div>
							{item.note && <p className='text-secondary mt-2 line-clamp-2 text-xs'>{item.note}</p>}
						</button>
					))}
				</div>
			</div>

			<DialogModal open={dialogOpen} onClose={() => setDialogOpen(false)} className='card max-h-[88vh] w-[460px] max-w-[92vw] overflow-y-auto'>
				<h3 className='mb-4 text-base font-semibold'>{editingId ? '编辑足迹' : '点亮新城市'}</h3>
				<div className='space-y-3 text-xs'>
					<div>
						<label className='text-secondary mb-1 block'>快速选择常用城市（自动填坐标）</label>
						<select
							defaultValue=''
							onChange={e => applyPreset(e.target.value)}
							className='w-full rounded-xl border bg-white/80 px-3 py-2 text-xs'>
							<option value=''>-- 从内置 30 个热门城市选择 --</option>
							{CITY_PRESETS.map(c => (
								<option key={c.city} value={c.city}>
									{c.city}（{c.country} · {c.region}）
								</option>
							))}
						</select>
					</div>

					<div className='grid grid-cols-3 gap-2'>
						<input value={city} onChange={e => setCity(e.target.value)} placeholder='城市 *' className='rounded-xl border bg-white/80 px-3 py-2' />
						<input value={region} onChange={e => setRegion(e.target.value)} placeholder='省份/地区' className='rounded-xl border bg-white/80 px-3 py-2' />
						<input value={country} onChange={e => setCountry(e.target.value)} placeholder='国家' className='rounded-xl border bg-white/80 px-3 py-2' />
					</div>

					<div className='grid grid-cols-2 gap-2'>
						<input value={lat} onChange={e => setLat(e.target.value)} placeholder='纬度 lat' className='rounded-xl border bg-white/80 px-3 py-2' />
						<input value={lng} onChange={e => setLng(e.target.value)} placeholder='经度 lng' className='rounded-xl border bg-white/80 px-3 py-2' />
					</div>

					<div className='grid grid-cols-2 gap-2'>
						<select value={status} onChange={e => setStatus(e.target.value as FootprintStatus)} className='rounded-xl border bg-white/80 px-3 py-2'>
							<option value='visited'>去过</option>
							<option value='lived'>常居</option>
							<option value='wishlist'>想去</option>
						</select>
						<input value={date} onChange={e => setDate(e.target.value)} placeholder='时间 如 2026-10' className='rounded-xl border bg-white/80 px-3 py-2' />
					</div>

					<textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder='写一句对这座城市的印象或故事...' className='w-full rounded-xl border bg-white/80 px-3 py-2' />
				</div>

				<div className='mt-5 flex justify-end gap-2'>
					<button type='button' onClick={() => setDialogOpen(false)} className='rounded-xl border bg-white/60 px-4 py-2 text-xs'>
						取消
					</button>
					<button type='button' onClick={handleSaveDraft} className='brand-btn px-4 py-2 text-xs'>
						确定
					</button>
				</div>
			</DialogModal>
		</>
	)
}

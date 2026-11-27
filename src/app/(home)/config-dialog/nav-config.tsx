'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { NavItemConfig } from '../stores/config-store'

const ICON_OPTIONS = [
	{ value: 'scroll', label: '文章 (Scroll)' },
	{ value: 'diary', label: '日记 (Book)' },
	{ value: 'schedule', label: '日程 (Schedule)' },
	{ value: 'footprints', label: '足迹 (MapPin)' },
	{ value: 'media', label: '追番书影音 (Media)' },
	{ value: 'projects', label: '项目 (Projects)' },
	{ value: 'share', label: '分享 (Share)' },
	{ value: 'website', label: '博客 (Website)' },
	{ value: 'timeline', label: '时间轴 (Timeline)' },
	{ value: 'card-record', label: '卡片记录 (Card)' },
	{ value: 'about', label: '关于 (About)' },
	{ value: 'image', label: '图片工具 (Image)' },
	{ value: 'pictures', label: '相册 (Camera)' },
	{ value: 'game', label: '游戏 (Gamepad)' },
	{ value: 'clock', label: '时钟 (Clock)' },
	{ value: 'write', label: '写作 (Pen)' },
	{ value: 'sparkles', label: '互动/特效 (Sparkles)' },
	{ value: 'link', label: '通用链接 (Link)' }
]

const PAGE_PRESETS: Array<{ label: string; href: string; icon: string }> = [
	{ label: '图片工具箱', href: '/image-toolbox', icon: 'image' },
	{ label: '鸣潮抽卡分析', href: '/wuthering-waves', icon: 'game' },
	{ label: '相册回忆', href: '/pictures', icon: 'pictures' },
	{ label: '专注时钟', href: '/clock', icon: 'clock' },
	{ label: 'Live2D 看板', href: '/live2d', icon: 'sparkles' },
	{ label: '灵感闪念', href: '/snippets', icon: 'scroll' },
	{ label: '写文章', href: '/write', icon: 'write' },
	{ label: '足迹地图', href: '/footprints', icon: 'footprints' },
	{ label: '追番书影音', href: '/media', icon: 'media' },
	{ label: '我的日记', href: '/diary', icon: 'diary' }
]

interface NavConfigProps {
	navItemsData: NavItemConfig[]
	setNavItemsData: React.Dispatch<React.SetStateAction<NavItemConfig[]>>
}

export function NavConfig({ navItemsData, setNavItemsData }: NavConfigProps) {
	const [label, setLabel] = useState('')
	const [href, setHref] = useState('')
	const [icon, setIcon] = useState('link')

	const handleAdd = () => {
		const cleanLabel = label.trim()
		const cleanHref = href.trim()
		if (!cleanLabel || !cleanHref) {
			toast.error('请填写导航名称和跳转路径')
			return
		}
		const item: NavItemConfig = {
			id: `nav-${Date.now().toString(36)}`,
			label: cleanLabel,
			href: cleanHref,
			icon
		}
		setNavItemsData(prev => [...prev, item])
		setLabel('')
		setHref('')
		setIcon('link')
	}

	const handleAddPreset = (preset: { label: string; href: string; icon: string }) => {
		if (navItemsData.some(item => item.href === preset.href)) {
			toast.info(`导航栏里已经有「${preset.label}」了`)
			return
		}
		setNavItemsData(prev => [
			...prev,
			{
				id: `nav-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
				...preset
			}
		])
		toast.success(`已添加「${preset.label}」到导航栏`)
	}

	const moveItem = (index: number, delta: -1 | 1) => {
		const target = index + delta
		if (target < 0 || target >= navItemsData.length) return
		setNavItemsData(prev => {
			const next = [...prev]
			const [moved] = next.splice(index, 1)
			next.splice(target, 0, moved)
			return next
		})
	}

	const removeItem = (id: string) => {
		setNavItemsData(prev => prev.filter(item => item.id !== id))
	}

	const updateItem = (id: string, patch: Partial<NavItemConfig>) => {
		setNavItemsData(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)))
	}

	return (
		<div className='space-y-4'>
			{/* 一键添加站内页面 */}
			<div className='rounded-2xl border bg-white/40 p-3'>
				<div className='text-secondary mb-2 text-xs'>一键添加站内已有页面：</div>
				<div className='flex flex-wrap gap-1.5'>
					{PAGE_PRESETS.map(p => {
						const exists = navItemsData.some(item => item.href === p.href)
						return (
							<button
								key={p.href}
								type='button'
								disabled={exists}
								onClick={() => handleAddPreset(p)}
								className={`rounded-xl border px-2.5 py-1 text-xs transition ${
									exists ? 'cursor-default border-transparent bg-white/30 text-gray-400' : 'bg-white/70 hover:border-brand hover:bg-white'
								}`}>
								{exists ? `✓ ${p.label}` : `+ ${p.label}`}
							</button>
						)
					})}
				</div>
			</div>

			{/* 自定义新增 */}
			<div className='grid grid-cols-[1fr_1fr_130px_auto] gap-2'>
				<input
					value={label}
					onChange={e => setLabel(e.target.value)}
					placeholder='显示名称（如：相册）'
					className='bg-secondary/10 rounded-xl border px-3 py-2 text-xs'
				/>
				<input
					value={href}
					onChange={e => setHref(e.target.value)}
					placeholder='路径或网址（/pictures 或 https://）'
					className='bg-secondary/10 rounded-xl border px-3 py-2 text-xs'
				/>
				<select value={icon} onChange={e => setIcon(e.target.value)} className='bg-secondary/10 rounded-xl border px-2 py-2 text-xs'>
					{ICON_OPTIONS.map(opt => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
				<button type='button' onClick={handleAdd} className='brand-btn px-3 py-2 text-xs'>
					<Plus className='h-3.5 w-3.5' />
					添加
				</button>
			</div>

			{/* 当前导航项列表 */}
			<div className='max-h-[300px] space-y-2 overflow-y-auto pr-1'>
				{navItemsData.map((item, idx) => (
					<div key={item.id} className='grid grid-cols-[1fr_1fr_120px_auto] items-center gap-2 rounded-xl border bg-white/50 px-2.5 py-2'>
						<input
							value={item.label}
							onChange={e => updateItem(item.id, { label: e.target.value })}
							className='bg-secondary/10 rounded-lg border px-2.5 py-1.5 text-xs'
						/>
						<input
							value={item.href}
							onChange={e => updateItem(item.id, { href: e.target.value })}
							className='bg-secondary/10 rounded-lg border px-2.5 py-1.5 text-xs'
						/>
						<select
							value={item.icon}
							onChange={e => updateItem(item.id, { icon: e.target.value })}
							className='bg-secondary/10 rounded-lg border px-2 py-1.5 text-xs'>
							{ICON_OPTIONS.map(opt => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
						<div className='flex items-center gap-0.5'>
							<button
								type='button'
								disabled={idx === 0}
								onClick={() => moveItem(idx, -1)}
								className='rounded-lg p-1 text-secondary hover:bg-white disabled:opacity-30'
								aria-label='上移'>
								<ArrowUp className='h-3.5 w-3.5' />
							</button>
							<button
								type='button'
								disabled={idx === navItemsData.length - 1}
								onClick={() => moveItem(idx, 1)}
								className='rounded-lg p-1 text-secondary hover:bg-white disabled:opacity-30'
								aria-label='下移'>
								<ArrowDown className='h-3.5 w-3.5' />
							</button>
							<button
								type='button'
								onClick={() => removeItem(item.id)}
								className='rounded-lg p-1 text-rose-500 hover:bg-rose-50'
								aria-label='删除'>
								<Trash2 className='h-3.5 w-3.5' />
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

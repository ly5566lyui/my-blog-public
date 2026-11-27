export type MediaCategory = 'anime' | 'game' | 'movie' | 'book'
export type MediaStatus = 'doing' | 'done' | 'wish'

export type MediaItem = {
	id: string
	title: string
	category: MediaCategory
	status: MediaStatus
	cover?: string
	rating: number
	progress: number
	total: number
	unit?: string
	review: string
	url?: string
	updatedAt: string
}

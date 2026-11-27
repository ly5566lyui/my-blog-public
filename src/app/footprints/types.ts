export type FootprintStatus = 'visited' | 'lived' | 'wishlist'

export type FootprintItem = {
	id: string
	city: string
	region: string
	country: string
	lat: number
	lng: number
	status: FootprintStatus
	date: string
	note: string
}

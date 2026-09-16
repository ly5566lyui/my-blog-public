import type { Metadata } from 'next'
import DiaryBook from './diary-book'

export const metadata: Metadata = {
	title: '木牌日记',
	description: '在藤蔓木牌后，收藏当下的心情与日常。'
}

export default function DiaryPage() {
	return <DiaryBook />
}


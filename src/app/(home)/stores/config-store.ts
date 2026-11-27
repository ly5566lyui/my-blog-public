import { create } from 'zustand'
import siteContent from '@/config/site-content.json'
import cardStyles from '@/config/card-styles.json'
import initialNavItems from '@/config/nav-items.json'

export type SiteContent = typeof siteContent
export type CardStyles = typeof cardStyles
export type NavItemConfig = {
	id: string
	label: string
	href: string
	icon: string
}

interface ConfigStore {
	siteContent: SiteContent
	cardStyles: CardStyles
	navItems: NavItemConfig[]
	regenerateKey: number
	configDialogOpen: boolean
	setSiteContent: (content: SiteContent) => void
	setCardStyles: (styles: CardStyles) => void
	setNavItems: (items: NavItemConfig[]) => void
	resetSiteContent: () => void
	resetCardStyles: () => void
	resetNavItems: () => void
	regenerateBubbles: () => void
	setConfigDialogOpen: (open: boolean) => void
}

export const useConfigStore = create<ConfigStore>(set => ({
	siteContent: { ...siteContent },
	cardStyles: { ...cardStyles },
	navItems: [...(initialNavItems as NavItemConfig[])],
	regenerateKey: 0,
	configDialogOpen: false,
	setSiteContent: (content: SiteContent) => {
		set({ siteContent: content })
	},
	setCardStyles: (styles: CardStyles) => {
		set({ cardStyles: styles })
	},
	setNavItems: (items: NavItemConfig[]) => {
		set({ navItems: items })
	},
	resetSiteContent: () => {
		set({ siteContent: { ...siteContent } })
	},
	resetCardStyles: () => {
		set({ cardStyles: { ...cardStyles } })
	},
	resetNavItems: () => {
		set({ navItems: [...(initialNavItems as NavItemConfig[])] })
	},
	regenerateBubbles: () => {
		set(state => ({ regenerateKey: state.regenerateKey + 1 }))
	},
	setConfigDialogOpen: (open: boolean) => {
		set({ configDialogOpen: open })
	}
}))

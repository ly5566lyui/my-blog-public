import { createInstallationToken, getInstallationId, GH_API, signAppJwt } from './github-client'
import { GITHUB_CONFIG } from '@/consts'
import { useAuthStore } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { decrypt, encrypt } from './aes256-util'

const GITHUB_TOKEN_CACHE_KEY = 'github_token'
const GITHUB_PEM_CACHE_KEY = 'p_info'

function getTokenFromCache(): string | null {
	if (typeof sessionStorage === 'undefined') return null
	try {
		return sessionStorage.getItem(GITHUB_TOKEN_CACHE_KEY)
	} catch {
		return null
	}
}

function saveTokenToCache(token: string): void {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.setItem(GITHUB_TOKEN_CACHE_KEY, token)
	} catch (error) {
		console.error('Failed to save token to cache:', error)
	}
}

function clearTokenCache(): void {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.removeItem(GITHUB_TOKEN_CACHE_KEY)
	} catch (error) {
		console.error('Failed to clear token cache:', error)
	}
}

export async function getPemFromCache(): Promise<string | null> {
	if (typeof sessionStorage === 'undefined') return null
	try {
		// 解密缓存中的 pem
		const encryptedPem = sessionStorage.getItem(GITHUB_PEM_CACHE_KEY)
		if (!encryptedPem) return null
		return await decrypt(encryptedPem, GITHUB_CONFIG.ENCRYPT_KEY)
	} catch {
		return null
	}
}

export async function savePemToCache(pem: string): Promise<void> {
	if (typeof sessionStorage === 'undefined') return
	try {
		// 加密 pem 后存储
		const encryptedPem = await encrypt(pem, GITHUB_CONFIG.ENCRYPT_KEY)
		sessionStorage.setItem(GITHUB_PEM_CACHE_KEY, encryptedPem)
	} catch (error) {
		console.error('Failed to save pem to cache:', error)
	}
}

function clearPemCache(): void {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.removeItem(GITHUB_PEM_CACHE_KEY)
	} catch (error) {
		console.error('Failed to clear pem cache:', error)
	}
}

export function clearAllAuthCache(): void {
	clearTokenCache()
	clearPemCache()
}

export async function hasAuth(): Promise<boolean> {
	return !!getTokenFromCache() || !!(await getPemFromCache())
}

/**
 * 统一的认证 Token 获取
 * 自动处理缓存、签发等逻辑
 * @returns GitHub Installation Token
 */
export async function getAuthToken(): Promise<string> {
	// 1. 先尝试从缓存获取 token
	const cachedToken = getTokenFromCache()
	if (cachedToken) {
		toast.info('使用缓存的令牌...')
		return cachedToken
	}

	// 2. 获取私钥（从缓存）
	const privateKey = useAuthStore.getState().privateKey
	if (!privateKey) {
		throw new Error('需要先设置私钥。请使用 useAuth().setPrivateKey()')
	}

	toast.info('正在签发 JWT...')
	const jwt = signAppJwt(GITHUB_CONFIG.APP_ID, privateKey)

	toast.info('正在获取安装信息...')
	const installationId = await getInstallationId(jwt, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO)

	toast.info('正在创建安装令牌...')
	const token = await createInstallationToken(jwt, installationId)

	saveTokenToCache(token)

	return token
}

/**
 * 向 GitHub 发起最小化请求，确认当前缓存令牌或 PEM 确实有权访问本仓库。
 * 不只依赖“缓存中存在字段”来判定已鉴权。
 */
export async function verifyAuth(): Promise<boolean> {
	try {
		const token = await getAuthToken()
		const response = await fetch(`${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28'
			}
		})

		if (!response.ok) throw new Error(`auth verification failed: ${response.status}`)
		return true
	} catch (error) {
		console.error('[Auth] 身份验证失败', error)
		clearAllAuthCache()
		useAuthStore.setState({ isAuth: false, privateKey: null })
		return false
	}
}


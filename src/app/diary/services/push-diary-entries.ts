import { GITHUB_CONFIG } from '@/consts'
import { getAuthToken } from '@/lib/auth'
import { createBlob, createCommit, createTree, getRef, toBase64Utf8, updateRef, type TreeItem } from '@/lib/github-client'
import type { DiaryEntry } from '../types'

export async function pushDiaryEntries(entries: DiaryEntry[]): Promise<void> {
	const token = await getAuthToken()
	const ref = `heads/${GITHUB_CONFIG.BRANCH}`
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, ref)
	const content = JSON.stringify(entries, null, '\t')
	const blob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(content), 'base64')
	const treeItems: TreeItem[] = [
		{
			path: 'src/app/diary/list.json',
			mode: '100644',
			type: 'blob',
			sha: blob.sha
		}
	]
	const tree = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, refData.sha)
	const commit = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, '更新木牌日记', tree.sha, [refData.sha])
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, ref, commit.sha)
}


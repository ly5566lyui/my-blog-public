import { GITHUB_CONFIG } from '@/consts'
import { getAuthToken } from '@/lib/auth'
import { createBlob, createCommit, createTree, getRef, toBase64Utf8, updateRef, type TreeItem } from '@/lib/github-client'

export async function pushJsonFile(repoPath: string, data: unknown, commitMessage: string): Promise<void> {
	const token = await getAuthToken()
	const ref = `heads/${GITHUB_CONFIG.BRANCH}`
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, ref)
	const content = JSON.stringify(data, null, '\t') + '\n'
	const blob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(content), 'base64')
	const treeItems: TreeItem[] = [
		{
			path: repoPath,
			mode: '100644',
			type: 'blob',
			sha: blob.sha
		}
	]
	const tree = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, refData.sha)
	const commit = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, tree.sha, [refData.sha])
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, ref, commit.sha)
}

import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { toast } from 'sonner'

export interface SubTask {
id: string
title: string
description: string
done: boolean
}

export interface CustomField {
id: string
key: string
value: string
}

export interface ScheduleItem {
id: string
date: string
title: string
description: string
done: boolean
subTasks: SubTask[]
fields: CustomField[]
}

export type PushScheduleParams = {
schedule: ScheduleItem[]
}

export async function pushSchedule(params: PushScheduleParams): Promise<void> {
const { schedule } = params
const token = await getAuthToken()
toast.info('正在获取分支信息...')
const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
const latestCommitSha = refData.sha
const commitMessage = `更新日程计划`

toast.info('正在准备文件...')
const treeItems: TreeItem[] = []
const scheduleJson = JSON.stringify(schedule, null, '	')
const scheduleBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(scheduleJson), 'base64')
treeItems.push({
path: 'src/app/schedule/list.json',
mode: '100644',
type: 'blob',
sha: scheduleBlob.sha
})
toast.info('正在创建文件树...')
const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
toast.info('正在创建提交...')
const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])
toast.info('正在更新分支...')
await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)
toast.success('发布成功！')
}

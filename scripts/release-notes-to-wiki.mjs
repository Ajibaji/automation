import { includedUserStories } from './user-story-extractor.mjs'
import { request } from '../ado/shared/scripts/ado-request.mjs'
import { getSuccessfulDeployments } from '../ado/shared/scripts/ado-api.mjs'

async function createReleaseNotesMarkdown(userStories, commitId, repoName) {
	let output = `##  ${dateString} - Commit [${commitId}](https://dev.azure.com/{organisation}/{project}/_git/${repoName}/commit/${commitId})\n`
	output = output + '### Features:\n'
	userStories.filter(workItem => {
		if (workItem.fields['System.WorkItemType'] === 'User Story') {
			output = `${output}- ${workItem.fields['System.Title']}\n`
		}
	})

	output = output + '### Bugs:\n'
	userStories.filter(workItem => {
		if (workItem.fields['System.WorkItemType'] === 'Bug') {
			output = `${output}- ${workItem.fields['System.Title']}\n`
		}
	})

	return output
}

let apiToken
if (process.env.API_TOKEN) {
	apiToken = process.env.API_TOKEN
} else {
	console.error(`API_TOKEN not set. Should be a PAT token.
    Get one here: https://dev.azure.com/{organisation}/_usersSettings/tokens`)
	process.exit(1)
}

const triggeringRepo = process.env.TRIGGERING_REPO
const commitId = process.env.COMMIT_ID
const dateObj = new Date()
const dateString = `${dateObj.getDate()}/${dateObj.getMonth()+ 1}/${dateObj.getFullYear()}`

const lastSuccessfulDeploys = await getSuccessfulDeployments(apiToken, process.env.ADO_ENVIRONMENT_ID)
let userStories
if (lastSuccessfulDeploys.length == 1) {
	console.log('length is 1')
	userStories = [ {
		id: 1,
		fields: {
			'System.WorkItemType': 'User Story',
			'System.Title': 'First deploy',
		},
	} ]
} else {
	const lastSuccessfulBuildId = lastSuccessfulDeploys[0]?.owner?.id
	const secondToLastSuccessfulBuildId = lastSuccessfulDeploys.find((value) => {
		return value.owner.id != lastSuccessfulBuildId
	}).owner.id
	userStories = await includedUserStories(apiToken, secondToLastSuccessfulBuildId, lastSuccessfulBuildId)
}
const newContent = (await createReleaseNotesMarkdown(userStories, commitId, triggeringRepo)) + '\n'
const wikiPagePath = `/_apis/wiki/wikis/${process.env.SYSTEM_TEAMPROJECT}.wiki/pages/${process.env.WIKI_PAGE_ID}`
const existingWikiContent = (await request(apiToken, wikiPagePath + '?includeContent=True', true))
const updatedContent = newContent + existingWikiContent.content
const patchPayload = {
	content: updatedContent,
}

let etag = existingWikiContent.headers.etag
etag = etag.replace(/"/g, '')
const headers = { 
	'if-match': etag,
	'Content-Type': 'application/json',
}

console.log('Updating wiki...')
const response = await request(apiToken, wikiPagePath + '?api-version=6.0-preview.1', true, 'PATCH', headers, JSON.stringify(patchPayload))
if (response.code === 200) {
	console.log('DONE')
	console.log('\nFollowing release notes added to wiki:\n')
	console.log(newContent)
} else {
	console.error('FAILED')
	console.log(response.status)
	process.exit(1)
}

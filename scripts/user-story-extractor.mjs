import * as ado from '../ado/shared/scripts/ado-api.mjs'

export async function getPipelineWebLink(apiToken, buildId) {
	const build = await ado.getBuild(apiToken, buildId)
	return build?._links?.web?.href
}

export async function includedUserStories(apiToken, curBuildId, newBuildId) {
	console.log(`Determining changes between build IDs From: [${curBuildId}] To: [${newBuildId}]`)
	const workItems = await ado.getWorkItemsBetweenBuilds(apiToken, curBuildId, newBuildId, true)
	if (workItems) {
		const filteredWorkItems = workItems.filter(filterWorkItemsForBugOrUserStory)
		return mergeDuplicateWorkItemsWithTasks(filteredWorkItems)
	} else {
		return []
	}
}

function mergeDuplicateWorkItemsWithTasks(detailedWorkItems) {
	const newArray = new Map()

	detailedWorkItems.forEach((item) => {
		if (newArray.has(item.id)) {
			const newItem = newArray.get(item.id)

			if (item.taskName) {
				newItem.taskNames.push(item.taskName)
			}

			if (item.taskId) {
				newItem.taskIds.push(item.taskId)
			}

			newArray.set(item.id, {
				...item,
				...newItem,
			})
		} else {
			item.taskNames = [ ]
			if (item.taskName) {
				item.taskNames.push(item.taskName)
			}

			item.taskIds = [ ]
			if (item.taskId) {
				item.taskIds.push(item.taskId)
			}

			newArray.set(item.id, item)
		}
	})

	return Array.from(newArray.values())
}

function filterWorkItemsForBugOrUserStory(detailedWorkItem) {
	const workItemType = detailedWorkItem.fields['System.WorkItemType']
	return ([ 'Bug', 'User Story' ].findIndex(i => i === workItemType)) > -1
}

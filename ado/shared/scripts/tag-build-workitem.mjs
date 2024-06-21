import { getWorkItemIdsFromBuildId, tagWorkItem } from './ado-api.mjs'

/**
 * This command will query ado for any workitems associated with the current build
 * Its designed to run in the pipeline (using default env var BUILD_BUILDID)
 * and takes a param to then tag any work items
 * 
 * Logic as to if this command should be used should be done outside of this command
 * - its purely to tag if you know you want to do that
 */
async function main() {
    let apiToken
    if (process.env.API_TOKEN) {
        apiToken = process.env.API_TOKEN
    } else {
        console.error(`API_TOKEN not set. Should be a PAT token.
    Get one here: https://dev.azure.com/{organisation}/_usersSettings/tokens`)
        process.exit(1)
    }
    const buildId = process.env.BUILD_BUILDID
    if (!buildId) {
        console.error('Missing env var BUILD_BUILDID')
        process.exit(1)        
    }

    const usage = function() {
        console.error('node tag-build-workitem.mjs tag_to_add')
        process.exit(1)
    }
    const tag = process.argv[2]
    if (!tag || tag === '-h') {
        usage()
    }

    const workItemIds = await getWorkItemIdsFromBuildId(apiToken, buildId)
    for (const workItemId of workItemIds) {
        const workItem = await tagWorkItem(apiToken, workItemId, tag)
        console.log(`Added tag ${tag} to WorkItem: ${workItemId} [${workItem.fields['System.Title']}]`)
    }
}

main().then(() => {
	console.log('Complete')
})


import { getSuccessDeploymentBuildId, getTaggedWorkItemsBetweenBuilds } from './ado-api.mjs'

/**
 * This command will query ado
 *  - get the last successful deployment to the specifed environment
 *  - get all work items between the current build and the last deployment
 *  - check if any of those work items have the specified tag
 * Its designed to run in the pipeline (using default env var BUILD_BUILDID)
 * and takes an environment id & search tag
 * 
 * Returns true if any work item has the specified tag
 * 
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
        console.error('node query-tag-in-build.mjs environmentId search_tag [debug] [first-run]')
        process.exit(1)
    }
    const environmentId = process.argv[2]
    if (!environmentId || environmentId === '-h') {
        usage()
    }
    const searchTag = process.argv[3]
    if (!searchTag) {
        usage()
    }
    const debug = process.argv[4]
    const firstRun = process.argv[5]
    if (debug) {
        console.log(`// Current buildId: ${buildId}`)
        console.log(`// environmentId: ${environmentId}`)
        console.log(`// searchTag: ${searchTag}`)
        console.log(`// firstRun: ${firstRun}`)
    }

    if (firstRun) {
        if (debug) {
            console.log(`// First run flag set. Returning true`)
        }
        console.log('true')
        process.exit(0)        
    }

    let prevBuildId = await getSuccessDeploymentBuildId(apiToken, environmentId, 0, debug)
    if (debug) {
        console.log(`// Previous successful buildId: ${prevBuildId}`)
    }

    // process.env.PREV_BUILDID should only be used for debugging
    if (process.env.PREV_BUILDID) {
        prevBuildId = process.env.PREV_BUILDID
        if (debug) {
            console.log(`// Overriding prev buildId: ${prevBuildId}`)
        }
    }

    // if we're not able to find a previous deployment, its either a query failure, or a first deployment
    if (!prevBuildId) {
        if (debug) {
            console.log(`// Unable to locate previous successful build. Failing`)
        }
        console.log('false')
        process.exit(0)        
    }

    const taggedWorkItems = await getTaggedWorkItemsBetweenBuilds(apiToken, buildId, prevBuildId, searchTag, debug)
    if (debug && taggedWorkItems.length > 0) {
        console.log(`// Found ${searchTag} in the following work items`)
        for (const taggedWorkItem of taggedWorkItems) {
            console.log(`// * [${taggedWorkItem.id}] ${taggedWorkItem.fields['System.Title']}`)
        }
    }
    console.log(taggedWorkItems.length > 0 ? 'true' : 'false')
}

// output in main will be used in ado pipeline tasks
main()

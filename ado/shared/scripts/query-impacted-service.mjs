import { runQuery } from './ado-api.mjs'

/**
 * This command will query ado to find any impacted services 
 * Its designed to run anywhere
 * and takes a search tag for the service name
 * 
 * Returns true if there is an open impacted ticket; or false
 * 
 */
 async function isImpactedService(apiToken, serviceTag, impactedTag) {
    const areaPath = '<AREA_PATH>'
    const query = `Select [System.Id],
        [System.Title], 
        [System.State] 
        From WorkItems 
        Where [System.Tags] CONTAINS '${serviceTag}' 
        AND [System.Tags] CONTAINS '${impactedTag}'
        AND [System.AreaPath] UNDER '${areaPath}'
        AND [System.State] <> 'Done'  
        AND [System.State] <> 'Closed' 
        AND [System.State] <> 'Removed'
    `

    const response = await runQuery(apiToken, query)
    return response?.workItems?.length > 0
}

async function main() {
    let apiToken
    if (process.env.API_TOKEN) {
        apiToken = process.env.API_TOKEN
    } else {
        console.error(`API_TOKEN not set. Should be a PAT token.
    Get one here: https://dev.azure.com/{organisation}/_usersSettings/tokens`)
        process.exit(1)
    }
    const usage = function() {
        console.error('node query-impacted-service.mjs serviceTag [impactedTag=dependency-impacted]')
        process.exit(1)
    }
    const serviceTag = process.argv[2]
    if (!serviceTag || serviceTag === '-h') {
        usage()
    }
    let impactedTag = process.argv[3]
    if (!impactedTag) {
        impactedTag = 'dependency-impacted'
    }
    const isImpacted = await isImpactedService(apiToken, serviceTag, impactedTag)
    console.log(isImpacted ? 'true' : 'false')
}

// output in main will be used in ado pipeline tasks
main()


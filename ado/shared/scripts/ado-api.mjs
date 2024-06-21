import { request } from './ado-request.mjs'

export async function getWorkItemIdsFromBuildId(apiToken, buildId) {
    const workItems = await request(apiToken, `/_apis/build/builds/${buildId}/workitems`)
    return workItems.value.map(x => parseInt(x.id))
}

export async function getWorkItem(apiToken, workItemId, loadParentForTask) {
    let path = `/_apis/wit/workitems/${workItemId}`
    if (loadParentForTask) {
        path = `${path}?$expand=relations`
    }
    let workItem = await request(apiToken, path)
    if (loadParentForTask) {
        const workItemType = workItem.fields['System.WorkItemType']

        // For tasks, get the parent work item
        if (workItemType === 'Task') {
            const parent = workItem.relations.filter(item => item.rel === 'System.LinkTypes.Hierarchy-Reverse')
            if (parent && parent.length > 0 && parent[0].url.indexOf('/_apis/') >= 0) {
                // request already has a base url; so just take the tail end of the url to work with that
                const parentWorkItem = await request(apiToken, `/_apis/${parent[0].url.split('/_apis/')[1]}`)

                // store a couple of new fields on the object about the original task
                parentWorkItem.taskName = workItem.fields['System.Title']
                parentWorkItem.taskId = workItem.id

                // resign the returned work item to the parent work item
                workItem = parentWorkItem
            }
        }
    }

    return workItem
}

export async function getWorkItemRevision(apiToken, workItemId) {
    const workItem = await getWorkItem(apiToken, workItemId, false)
    if (!workItem.rev) {
        throw new Error(`Unable to find revision for work item ${workItemId}`)
    }

    return workItem.rev
}

export async function tagWorkItem(apiToken, workItemId, tag) {
    const currentWorkItemRevision = await getWorkItemRevision(apiToken, workItemId)
    const patchBody = [
        {
            op: "test",
            path: "/rev",
            value: currentWorkItemRevision
        },
        {
            op: "add",
            path: "/fields/System.Tags",
            value: tag
        }
    ]

    const response = await request(apiToken, `/_apis/wit/workitems/${workItemId}?api-version=6.0`, true, 'PATCH', null, JSON.stringify(patchBody))
    return response
}

export async function getSuccessfulDeployments(apiToken, environmentId, debug = false, retry = 5) {
    const deployments = (await request(apiToken, `/_apis/distributedtask/environments/${environmentId}/environmentdeploymentrecords`))
    if (!deployments.value) {
        if (debug) {
            console.log(`// Query deployments is missing a valid response. Retries: ${retry}. Returning empty array. ${JSON.stringify(deployments)}`)
        }
        if (retry > 0) {
            return getSuccessfulDeployments(apiToken, environmentId, debug, retry - 1)
        }
        return []
    }
    // Sort into reverse order by owner - Owner should represent the order
    // the build was sent to the pipeline. If the match, try using the name as a decimal no,
    // though these likely match too
    const sortedDeployments = deployments.value.sort((a, b) => {
        if (+b?.owner?.id === +a?.owner?.id) {
            return +b?.owner?.name - +a?.owner?.name
        }
        return +b?.owner?.id - +a?.owner?.id
    })
    return sortedDeployments.filter(deployment => {
        if (deployment.result === 'succeeded' || deployment.result === 'succeededWithIssues') {
            return true
        }
    })
}

// expected that position would be 0 for last, or 1 for second to last
export async function getSuccessDeploymentBuildId(apiToken, environmentId, position, debug = false) {
    const deployments = await getSuccessfulDeployments(apiToken, environmentId, debug)
    return deployments[position]?.owner?.id
}

export async function getWorkItemsBetweenBuilds(apiToken, currentBuildId, previousBuildId, loadParentForTask) {
    const workItemIds = (await request(apiToken, `/_apis/build/workitems?fromBuildId=${currentBuildId}&toBuildId=${previousBuildId}`)).value
    if (workItemIds) {
        const workItems = await Promise.all(workItemIds.map((workItem) => getWorkItem(apiToken, workItem.id, loadParentForTask)))
        return workItems
    } else {
        return []
    }
}

export async function getTaggedWorkItemsBetweenBuilds(apiToken, currentBuildId, previousBuildId, tag) {
    return (await getWorkItemsBetweenBuilds(apiToken, currentBuildId, previousBuildId, false)).filter(x => x.fields['System.Tags']?.split('; ').includes(tag))
}

export async function runQuery(apiToken, query) {
    const response = await request(apiToken, `/_apis/wit/wiql?api-version=6.0`, true, 'POST', null, JSON.stringify({ query }))
    if (response.code !== 200) {
        throw new Error(`Unable to run query ${response.message}`)
    }
    return response
}

export async function getBuild(apiToken, buildId) {
    const response = await request(apiToken, `/_apis/build/builds/${buildId}`)
    return response
}

export async function getBuildStatus(apiToken, definitionId) {
    const responseSvg = await request(apiToken, `/_apis/build/status/${definitionId}`, false, 'GET', null, '', false)

    const statuses = ['partially succeeded', 'succeeded', 'failed']
    for (const status of statuses) {
        if (responseSvg.indexOf(status) >= 0) {
            return status
        }
    }

    return 'unknown'
}

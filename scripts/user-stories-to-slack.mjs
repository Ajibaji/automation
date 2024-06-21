/*
  This is a portable nodejs script (no 3rd party deps) that can be ran before deployment
  to create a wiki entry with release notes for the impending deployment.

  Release notes are in mardown format and conisist of a list of a list of all Work-Items
  contained in the relase.

  The environment variable API_TOKEN must be set with a PAT token. See here for details:
  https://dev.azure.com/{ado-org-name}/_usersSettings/tokens

  e.g.
  [Title of work-item pulled from ADO](hyperling to work-item in ADO Boards)
  
  To run manually for now, until proper local support is done, define the following environment variables

  API_TOKEN (A user token to allow the script to read from ADO)
  BUILD_ARTIFACTSTAGINGDIRECTORY (A local directory to write the release notes to)
  SERVICE_NAME (A name to identify the service in the release notes filename)
  DEPLOYMENT_ENV (PROD or INT)
  FROM_ENVIRONMENT_ID (The numerical ID of the environment with stories waiting to be deployed, normally the QA or INT env for the service)
  TO_ENVIRONMENT_ID(The numerical ID of the environment the stories are waiting to be deployed to, normally the INT or PROD env for the service)
  TARGET_DEPLOYMENT_ID (used to override the TO_ENVIRONMENT_ID, or use ? to query the user every run)
  FROM_BUILD_ID (Used to override the build number used as the base when comparing stories)
  SLACK_ALERT_URL (The URL of a slack webhook if you want to test the notification messages being posted, instead of just the output release notes)
  BUILD_DEFINITION_ID (The pipeline build definition id - for linking)
*/
import { createInterface } from 'readline'
import { postNoChangeToSlack, postNotesToSlack } from './post-to-slack.mjs'
import { getPipelineWebLink, includedUserStories } from './user-story-extractor.mjs'
import { getBuildStatus, getSuccessfulDeployments } from '../ado/shared/scripts/ado-api.mjs'
//import dotenv from 'dotenv'
//import path from 'path'

async function getSuccessfulDeploymentsForPipeline(apiToken, environmentId, pipelineId) {
	const deployments = await getSuccessfulDeployments(apiToken, environmentId)
	return deployments.filter(deployment => {
		return +deployment.definition.id === +pipelineId
	})
}

async function runChangeCheck() {
	let apiToken
	if (process.env.API_TOKEN) {
		apiToken = process.env.API_TOKEN
	} else {
		console.error(`API_TOKEN not set. Should be a PAT token.
      Get one here: https://dev.azure.com/{ado-org-name}/_usersSettings/tokens`)
		process.exit(1)
	}
	const deploymentEnv = process.env.DEPLOYMENT_ENV || 'PROD' // 'PROD' or 'INT'
	const serviceName = process.env.SERVICE_NAME
	const organisation = process.env.SYSTEM_TEAMFOUNDATIONSERVERURI || 'https://dev.azure.com/{ado-org-name}/'
	const project = process.env.SYSTEM_TEAMPROJECT || '{ado-project-name}'
	const pipelineType = process.env.PIPELINE_TYPE || 'sequential' // 'sequential' or 'streamlined'
	const buildDefinitionId = process.env.BUILD_DEFINITION_ID
	const buildLatestUrl = `https://dev.azure.com/{ado-org-name}/{ado-project-name}/_build/latest?definitionId=${buildDefinitionId}&branchName=main`
	let fromEnvironmentId = process.env.FROM_ENVIRONMENT_ID
	let toEnvironmentId = process.env.TO_ENVIRONMENT_ID
	let fromDeploymentEnv = ''
	let toDeploymentEnv = ''
	let targetDeploymentId = process.env.TARGET_DEPLOYMENT_ID
	let newBuildId 
	let curBuildId

	if (!Number.isInteger(parseInt(fromEnvironmentId))) {
		console.error(`FROM_ENVIRONMENT_ID is missing or not a number (${fromEnvironmentId})`)
		process.exit(1)
	}
	if (!Number.isInteger(parseInt(toEnvironmentId))) {
		console.error(`TO_ENVIRONMENT_ID is missing or not a number (${toEnvironmentId})`)
		process.exit(1)
	}

	if (deploymentEnv.toLowerCase() === 'prod') {
		fromDeploymentEnv = 'INT'
		toDeploymentEnv = 'PROD'
	} else if (deploymentEnv.toLowerCase() === 'int') {
		if (pipelineType === 'sequential') {
			fromDeploymentEnv = 'QA'
			toDeploymentEnv = 'INT'	
		} else if (pipelineType === 'streamlined') {
			fromDeploymentEnv = 'DEV'
			toDeploymentEnv = 'INT'	
		}
	} else {
		console.log(`Invalid deployment env specified in process.env.DEPLOYMENT_ENV: [${deploymentEnv}] service: [${serviceName}]`)
		process.exit(1)
	}

	if (targetDeploymentId === '?') {
		targetDeploymentId = await askUser('Enter buildId of target deployment')
	} else if (!targetDeploymentId) {
		targetDeploymentId = (await getSuccessfulDeploymentsForPipeline(apiToken, toEnvironmentId, buildDefinitionId))[0]?.owner?.id
	}

	if (!targetDeploymentId) {
		curBuildId = process.env.FROM_BUILD_ID || (await getSuccessfulDeploymentsForPipeline(apiToken, fromEnvironmentId, buildDefinitionId))
		curBuildId = curBuildId [curBuildId.length-1]?.owner?.id
		newBuildId = (await getSuccessfulDeploymentsForPipeline(apiToken, fromEnvironmentId, buildDefinitionId))[0]?.owner?.id
	} else {
		curBuildId = targetDeploymentId
		newBuildId = process.env.FROM_BUILD_ID || (await getSuccessfulDeploymentsForPipeline(apiToken, fromEnvironmentId, buildDefinitionId))[0]?.owner?.id
	}

	const releaseWebLink = await getPipelineWebLink(apiToken, newBuildId)

	if (newBuildId === curBuildId) {
		console.log(`${serviceName}-${fromDeploymentEnv} build [${curBuildId}] matches ${toDeploymentEnv} build so nothing needs to be done`)
		await postNoChangeToSlack(serviceName, deploymentEnv, newBuildId)
		process.exitCode = 0
		return
	}

	async function askUser(question) {
		const readline = createInterface({
			input: process.stdin,
			output: process.stdout,
		})
		const answer = await new Promise(resolve => {
			readline.question(`${question} `, resolve)
		})
		readline.close()
		return answer?.length > 0 ? answer : null
	}

	const userStories = await includedUserStories(apiToken, curBuildId, newBuildId)
	const buildStatus = await getBuildStatus(apiToken, buildDefinitionId)

	await postNotesToSlack(`${organisation}${project}`, serviceName, deploymentEnv, newBuildId, userStories, releaseWebLink, buildStatus, buildLatestUrl)
}

runChangeCheck().then(() => {
	console.log('Complete')
})


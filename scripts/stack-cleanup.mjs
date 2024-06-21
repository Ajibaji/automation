import { execSync } from 'child_process'

const ACTIVE_STACK_STATUSES = [
	'CREATE_COMPLETE',
	'CREATE_IN_PROGRESS',
	'DELETE_FAILED',
	'IMPORT_COMPLETE',
	'IMPORT_IN_PROGRESS',
	'IMPORT_ROLLBACK_COMPLETE',
	'IMPORT_ROLLBACK_FAILED',
	'IMPORT_ROLLBACK_IN_PROGRESS',
	'REVIEW_IN_PROGRESS',
	'ROLLBACK_COMPLETE',
	'ROLLBACK_FAILED',
	'ROLLBACK_IN_PROGRESS',
	'UPDATE_COMPLETE',
	'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
	'UPDATE_IN_PROGRESS',
	'UPDATE_ROLLBACK_COMPLETE',
	'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS',
	'UPDATE_ROLLBACK_FAILED',
	'UPDATE_ROLLBACK_IN_PROGRESS',
]

function getStacks(awsRegion, stackNamePrefix) {
	try {
		const awsOutput = execSync(`aws --region ${awsRegion} cloudformation list-stacks --stack-status-filter "${ACTIVE_STACK_STATUSES.join('" "')}" --query "StackSummaries[?!ParentId && starts_with(StackName, '${stackNamePrefix}')].StackName"`)
		const stacks = JSON.parse(awsOutput.toString())
		return stacks
	} catch (err) {
		console.log(`Error running aws cloudformation list-stacks: ${err.toString()}`)
	}

	return null
}

function deleteStack(awsRegion, stackName) {
	try {
		const awsOutput = execSync(`aws --region ${awsRegion} cloudformation delete-stack --stack-name ${stackName}`)
		console.log(awsOutput.toString())
		return true
	} catch (err) {
		console.log(`Error running aws cloudformation delete-stack ${stackName}: ${err.toString()}`)
	}

	return false
}

const { AWS_REGION, STACK_NAME_PREFIX } = process.env

const stacks = getStacks(AWS_REGION, STACK_NAME_PREFIX)
if (!stacks) {
	console.log(`Error when searching for stacks for ${STACK_NAME_PREFIX}`)
	process.exit(1)
}
if (stacks.length === 0) {
	console.log(`There are no active stacks for ${STACK_NAME_PREFIX}`)
	process.exit(0)
}

let deleteStackErrors = []
for (const stack of stacks) {
	console.log(`Attempting to delete: ${stack}`)

	const deleted = deleteStack(AWS_REGION, stack)
	if (deleted) {
		console.log(`Cloudformation accepted delete request for ${stack}`)
	} else {
		console.log(`Error attempting to delete stack: ${stack}`)
		deleteStackErrors.push(stack)
	}

	const sleepSeconds = 60
	console.log(`Sleeping for ${sleepSeconds}s to help with rate limits in Cloudformation when calling delete on api gateway`)
	await new Promise(resolve => setTimeout(resolve, sleepSeconds * 1000))
}

if (deleteStackErrors.length > 0) {
	console.log(`There was an error deleting 1 or more stacks: ${deleteStackErrors.join(', ')}`)
	process.exit(1)
}

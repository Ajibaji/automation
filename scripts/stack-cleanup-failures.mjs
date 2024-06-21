import { execSync } from 'child_process'

const FAILED_STACK_STATUSES = [
	'DELETE_FAILED',
]

function getFailedStacks(awsRegion) {
	try {
		const awsOutput = execSync(`aws --region ${awsRegion} cloudformation list-stacks --stack-status-filter "${FAILED_STACK_STATUSES.join('" "')}" --query "StackSummaries[*].StackName"`)
		const stacks = JSON.parse(awsOutput.toString())
		return stacks
	} catch (err) {
		console.log(`Error running aws cloudformation list-stacks: ${err.toString()}`)
	}

	return null
}

const { AWS_REGION } = process.env

const stacks = getFailedStacks(AWS_REGION)
if (!stacks) {
	console.log('Error when searching for failed stacks')
	process.exit(1)
} else if (stacks.length > 0) {
	console.log('The following stacks failed to delete and should be manually deleted:')
	for (const stack of stacks) {
		console.log(stack)
	}
	process.exit(1)
}

console.log('Success: There are no failed stacks')
process.exit(0)


import * as https from 'https'

export async function postNotesToSlack(baseUrl, serviceName, deploymentEnv, newBuildId, userStories, releaseWebLink, buildStatus, buildLatestUrl) {
	// We have a couple of cases where we tweak the output a bit
	// * For Production, the buttons appear as red
	// * For the Last Pipeline Build, we:
	//   - add status to the detail line (date/build id)
	//   - a warning line to re-run the process
	//   - a button to link to the latest build pipeline
	// Note that this is only shown for build failures in the non production cases, 
	//    as a failure for the main branch is related to a failure in the dev -> int deployment 
	//    and very unlikely to be in the int -> prod deployment

	const isProd = deploymentEnv.toUpperCase() === 'PROD'
	const changeList = await buildSlackMarkdown(baseUrl, userStories)

	const changeListMd = changeList.length > 0 ? {
		type: 'section',
		text: {
			type: 'mrkdwn',
			text: changeList,
		},
	} : {
		type: 'section',
		text: {
			type: 'mrkdwn',
			text: 'No changes detected',
		},
	}

	let button = {
		type: 'button',
		text: {
			type: 'plain_text',
			text: 'View Release Pipeline',
		},
		url: releaseWebLink,
		action_id: 'actionId-0',
	}
	if (isProd) {
		button.style = 'danger'
	}

	let buildStatusButton = {
		type: 'button',
		text: {
			type: 'plain_text',
			text: 'View Latest Build Pipeline Failure',
		},
		url: buildLatestUrl,
		action_id: 'actionId-1',
	}
	if (isProd) {
		buildStatusButton.style = 'danger'
	}

	let buttonArray = [ button ]
	if (buildStatus === 'failed' && !isProd) {
		buttonArray.push(buildStatusButton)
	}

	const date = new Date()

	const payload = {
		blocks: [ {
			type: 'header',
			text: {
				type: 'plain_text',
				text: `${serviceName} ${deploymentEnv.toUpperCase()} Stories Ready For Release`,
				emoji: true,
			},
		},
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: isProd ?
					`Date: \`${date.toLocaleDateString('en-GB')}\` Build ID: \`${newBuildId}\`` :
					`Date: \`${date.toLocaleDateString('en-GB')}\` Build ID: \`${newBuildId}\` Latest Build Pipeline Status: \`${buildStatus}\``,
			},
		},
		...(buildStatus === 'failed' && !isProd ? [ {
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: 'Latest Build Pipeline Failed. Re-run to ensure this succeeds before attempting to release these changes.',
			},
		} ] : []),
		{
			type: 'divider',
		},
		changeListMd,
		{
			type: 'actions',
			elements: buttonArray,
		},
		],
	}

	return postToSlack(payload)
}

export async function postNoChangeToSlack(serviceName, deploymentEnv, newBuildId) {
	const date = new Date()

	return postPlainTextWithMarkDownToSlack(
		`${serviceName} ${deploymentEnv.toUpperCase()} - No changes detected vs previous deployment`,
		`Date: \`${date.toLocaleDateString('en-GB')}\` Build ID: \`${newBuildId}\``,
	)
}

export async function postPlainTextWithMarkDownToSlack(bodyText, markDownText) {
	const payload = {
		blocks: [ {
			type: 'section',
			text: {
				type: 'plain_text',
				text: bodyText,
				emoji: true,
			},
		},
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: markDownText,
			},
		},
		],
	}

	return postToSlack(payload)	
}

export async function postSimpleHeaderNotesToSlack(headerText, bodyText) {
	const payload = {
		blocks: [ {
			type: 'header',
			text: {
				type: 'plain_text',
				text: headerText,
				emoji: true,
			},
		},
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: bodyText,
			},
		},
		],
	}

	postToSlack(payload)
}

export async function postToSlack(payload) {
	if (!process.env.SLACK_ALERT_URL) {
		console.log('Skipping posting to slack as SLACK_ALERT_URL is not set')
		console.log(JSON.stringify(payload, null, 4))
		return
	}

	try {

		const postData = JSON.stringify(payload)

		const options = {
			hostname: 'hooks.slack.com',
			port: 443,
			path: `${process.env.SLACK_ALERT_URL}`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length,
			},
		}

		return new Promise((resolve, reject) => {
			const req = https.request(options, (res) => {
				res.setEncoding('utf8')
				let responseBody = ''

				res.on('data', (chunk) => {
					responseBody += chunk
				})

				res.on('end', () => {
					console.log(responseBody)
				})
			})

			req.on('error', (err) => {
				reject(err)
			})

			req.write(postData)
			req.end()
		})

	} catch (err) {
		console.log(err)

	}
}

export async function buildSlackMarkdown(baseUrl, userStories) {
	let changeList = []
	for (const [ index, userStory ] of userStories.entries()) {
		changeList.push(await addLineEntry(baseUrl, userStory, index))
	}
	return changeList.join('')
}

async function addLineEntry(baseUrl, userStory, index) {
	const userStoryUrl = `${baseUrl}/_workitems/edit/${userStory.id}`
	const assignedTo = userStory.fields['System.AssignedTo']?.['displayName'] || 'Unknown'
	const transformedLine = (`${index + 1} - ~${userStoryUrl}|${userStory.fields['System.Title']}# ${userStory.taskIds.length > 0 ? '[Task(s): ' + userStory.taskIds.join(', ') + ']' : ''} - ${assignedTo}\n`)
		.replace('&', '&amp;')
		.replace('<', '&lt;')
		.replace('>', '&gt;')
		.replace('~', '<')
		.replace('#', '>')
	return transformedLine 
}


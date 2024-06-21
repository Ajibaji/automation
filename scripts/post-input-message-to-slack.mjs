import { postPlainTextWithMarkDownToSlack } from './post-to-slack.mjs'

async function main() {
	const usage = function() {
		console.error('node post-input-message-to-slack.mjs msg')
		process.exit(1)
	}
	const msg = process.argv[2]
	if (!msg || msg === '-h') {
		usage()
	}

	let startDate = new Date()
	postPlainTextWithMarkDownToSlack(
		msg,
		`Date: \`${startDate.toLocaleDateString('en-GB')}\``,
	)
}

// output in main will be used in ado pipeline tasks
main()

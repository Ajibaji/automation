import * as https from 'https'

export function request(apiToken, path, resolveHeaders = false, method = 'GET', extraHeaders = null, payload = '', isJson = true) {
	let retries = 0
	let error
	while (retries < 5) {
		try {
			error = undefined
			const response = runRequest(apiToken, path, resolveHeaders, method, extraHeaders, payload, isJson)
			return response
		} catch (err) {
			// store the last error we get - if the retries don't sort it out, then will throw at the very end
			// but as some processes read stdin/stderr for results, we don't want to log if it will resolve by itself
			error = err
		}
		retries++
	}

	if (error) {
		console.error(error)
		throw error
	}
}

export function runRequest(apiToken, path, resolveHeaders = false, method = 'GET', extraHeaders = null, payload = '', isJson = true) {
	const hostname = process.env.ADO_HOSTNAME || 'dev.azure.com'
	const organisation = process.env.SYSTEM_TEAMFOUNDATIONSERVERURI || `https://${hostname}/{organisation}/`
	const project = process.env.SYSTEM_TEAMPROJECT || '{project}'

	const headers = buildHeaders(apiToken, method)
	let options = {
		hostname,
		port: 443,
		path: `${organisation}${project}${path}`,
		method,
		headers,
	}
	if (extraHeaders) {
		options.headers = { ...options.headers, ...extraHeaders }
	}

	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			res.setEncoding('utf8')
			let responseBody = ''

			res.on('data', (chunk) => {
				responseBody += chunk
			})

			res.on('end', () => {
				if (isJson) {
					try {
						let response = JSON.parse(responseBody)
						if (res.statusCode >= 300) {
							const errMsg = `${res.statusCode} error in http request ${options.path}. ${response.message}`
							reject(new Error(errMsg))
							return
						} else if ('typeName' in response && response['typeName'].indexOf('Exception') >= 0) {
							const errMsg = `Inner error in http request ${options.path}. ${response['typeName']}. ${response.message}`
							reject(new Error(errMsg))
							return
						}

						if (resolveHeaders) {
							response.headers = res.headers
							response.code = res.statusCode
							response.status = res.statusMessage
						}
						resolve(response)
					} catch (err) {
						const errMsg = `Unable to parse json response for ${options.path}. Resp: ${responseBody}`
						reject(new Error(errMsg))
					}
				} else {
					resolve(responseBody)
				}
			})
		})

		req.on('error', (err) => {
			reject(err)
		})
		if (method === 'PATCH' || method === 'POST') {
			req.write(payload)
		}
		req.end()
	})
}

function buildHeaders(apiToken, method) {
	const buffer = Buffer.from(`:${apiToken}`, 'utf8')
	const accessToken = buffer.toString('base64')
	return {
		'Accept': 'application/json',
		'Authorization': `Basic ${accessToken}`,
		'Content-Type': method === 'PATCH' ? 'application/json-patch+json' : 'application/json',
	}
}

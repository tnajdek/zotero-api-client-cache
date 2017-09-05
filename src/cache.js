'use strict';

const { storageFilter } = require('./utils');

const {
	ApiResponse,
	SingleReadResponse,
	MultiReadResponse
} = require('zotero-api-client/lib/response');

const keysWhitelist = [
	'resource',
	'apiAuthorityPart',
	'contentType',
	'format',
	'include',
	'content',
	'style',
	'itemKey',
	'collectionKey',
	'searchKey',
	'itemType',
	'qmode',
	'since',
	'tag',
	'sort',
	'direction',
	'limit',
	'start'
];

function cache(config) {
	if(config.method !== 'get') {
		return config;
	}

	const options = keysWhitelist.reduce((aggr, key) => {
		if(key in config) {
			aggr[key] = config[key]
		}
		return aggr;
	}, {});

	storageFilter(this.storage, this.prefix, cacheEntry => cacheEntry.expires < Date.now());
	
	const key = `${this.prefix}-${JSON.stringify(options)}`;

	if('response' in config && 'source' in config && config.source != 'cache') {
		const responseType = config.response.constructor.name;
		const source = config.source;
		const queryType = Object.keys(config.resource).pop();
		const expires = Date.now() + 1000 * (this.cacheTimes[queryType] || this.cacheTimes.default || 30);

		const value = JSON.stringify({
			responseType,
			source,
			options,
			expires,
			data: config.response.raw
		});

		this.storage.setItem(key, value);
	}

	if(!('response' in config)) {
		const cached = JSON.parse(this.storage.getItem(key));
		if(cached && cached.expires > Date.now()) {
			var apiResponse;
			switch (cached.responseType) {
				case 'ApiResponse':
					apiResponse = new ApiResponse(
						cached.data,
						cached.options,
						new Response(cached.data)
					);
				break;  
				case 'SingleReadResponse':
					apiResponse = new SingleReadResponse(
						cached.data,
						cached.options,
						new Response(cached.data)
					);
				break;  
				case 'MultiReadResponse':
					apiResponse = new MultiReadResponse(
						cached.data,
						cached.options,
						new Response(cached.data)
					);
				break;  
			}

			return {
				...options,
				response: apiResponse,
				source: 'cache'
			}
		}
	}
	return { ...config };
}

module.exports = cache;
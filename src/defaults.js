'use strict';

module.exports = { 
	prefix: 'zotero-api-client-cache',
	storage: typeof window != 'undefined' && 'localStorage' in window && window.localStorage || {},
	cacheTimes: {
		top: 60,
		trash: 60,
		children: 60,
		groups: 60,
		subcollections: 60,
		itemTypes: 60 * 60 * 24,
		itemFields: 60 * 60 * 24,
		creatorFields: 60 * 60 * 24,
		itemTypeFields: 60 * 60 * 24,
		itemTypeCreatorTypes: 60 * 60 * 24,
		template: 60,
		library: 60,
		collections: 60,
		items: 60,
		searches: 60,
		tags: 60,
		default: 30
	}
};
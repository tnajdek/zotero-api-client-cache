'use strict';

const { storageFilter } = require('./utils');

module.exports = ({ storage, prefix, ef }) => {
	const invalidate = function(target, value = null) {
		if(!target) {
			return false;
		}

		storageFilter(storage, prefix, cacheEntry => {
			return cacheEntry 
				&& 'options' in cacheEntry 
				&& 'resource' in cacheEntry.options
				&& target in cacheEntry.options.resource
				&& cacheEntry.options.resource[target] === value;
		});
		
		return ef.bind(this)({});
	}

	return invalidate;
}
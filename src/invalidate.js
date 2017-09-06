'use strict';

const { storageFilter, get } = require('./utils');

module.exports = ({ storage, prefix, ef }) => {
	const invalidate = function(target, value = null) {
		if(!target) {
			return false;
		}
		if(typeof target === 'string') {
			target = { [target]: value };
		}

		if(Object.keys(target).length === 0) {
			return false;
		}

		storageFilter(storage, prefix, cacheEntry => {
			if(!cacheEntry || !('options' in cacheEntry)) {
				return false;
			}

			return Object.keys(target).reduce((isMatch, key) => {
				return get(cacheEntry.options, key) === target[key] && isMatch;
			}, true);
		});
		
		return ef.bind(this)({});
	}

	return invalidate;
}
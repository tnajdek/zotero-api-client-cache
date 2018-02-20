'use strict';

const storageFilter = (storage, prefix, filter) => {
	const keysToDelete = [];
	
	for(let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if(key.startsWith(prefix)) {
			try {
				let cacheEntry = JSON.parse(storage.getItem(key));
				if(filter(cacheEntry)) {
					keysToDelete.push(key);	
				}
			} catch(_) {
				keysToDelete.push(key);
			}
		}
	}

	keysToDelete.forEach(key => {
		storage.removeItem(key);
	});
};

const get = (src, path, fallback) => {
	if(src === null) {
		return fallback;
	}
	if(!path || !path.length) {
		return src;
	}

	const parts = Array.isArray(path) ? path : path.split('.');
	
	var obj = src;
	var i, ii;

	for(i = 0, ii = parts.length; i < ii; i++) {
		if(!obj.propertyIsEnumerable(parts[i])) {
			return fallback;
		}

		obj = obj[parts[i]];

		if(obj === null) {
			return (i !== ii - 1) ? fallback : obj;
		}
	}

	return obj;
}

module.exports = { storageFilter, get };
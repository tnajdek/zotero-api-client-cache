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

module.exports = { storageFilter };
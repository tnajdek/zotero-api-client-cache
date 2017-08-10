'use strict';

const cache = require('./cache');
const defaults = require('./defaults');

function extenderFactory(opts = {}) {
	const cacheExecutor = cache.bind({
		...defaults,
		...opts
	});

	const extender = function(config) {
		config.executors = [cacheExecutor, ...config.executors, cacheExecutor];
	}

	return extender;
}

module.exports = extenderFactory;
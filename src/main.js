'use strict';

const cache = require('./cache');
const invalidateFactory = require('./invalidate');
const defaults = require('./defaults');

function extenderFactory(opts = {}) {
	const cacheExecutor = cache.bind({
		...defaults,
		...opts
	});

	const extender = function(options) {
		const { config, ef, functions } = options;

		functions.invalidate = invalidateFactory({
			...defaults,
			...opts,
			...options
		});

		return ef.bind(config)({
			executors: [cacheExecutor, ...options.config.executors, cacheExecutor]
		});

	}

	return extender;
}

module.exports = extenderFactory;
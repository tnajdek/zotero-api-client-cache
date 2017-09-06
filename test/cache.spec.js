/* eslint-env mocha */
'use strict';

require('isomorphic-fetch');

const assert = require('chai').assert;
const tk = require('timekeeper');
const {
	ApiResponse,
	SingleReadResponse
} = require('zotero-api-client/lib/response');
const defaults = require('../src/defaults');

const itemTypesDataFixture = require('./fixtures/item-types-data');
const itemFixture = require('./fixtures/item');
const extenderFactory = require('./../src/main');
const invalidateFactory = require('./../src/invalidate');

class FakeStore {
	constructor() { this.clear(); }
	getItem(key) { return key in this.storage && this.storage[key] || null }
	setItem(key, value) { this.storage[key] = value }
	removeItem(key) { delete this.storage[key] }
	clear() { this.storage = {} }
	key(key) {
		const sortedKeys = Object.keys(this.storage).sort();
		return sortedKeys[key];
	}
	get length() {
		return Object.keys(this.storage).length;
	}
}

describe('Zotero Api Cache Plugin', () => {
	var fakeStore, cache, invalidate;

	beforeEach(() => {
		fakeStore = new FakeStore();
		cache = require('../src/cache').bind({ ...defaults, storage: fakeStore });
		invalidate = invalidateFactory({
			storage: fakeStore,
			prefix: 'zotero-api-client-cache',
			functions: {},
			config: {},
			ef: function(conf) {
				return { ...this, ...conf }
			}
		});
	});

	it('should cache and return type/field data', () => {
		const config = Object.freeze({
			method: 'get',
			resource: {
				itemTypes: null
			}
		});

		const stage1 = cache(config);
		assert.notProperty(stage1, 'response');
		assert.notProperty(stage1, 'source');
		
		const stage2 = cache(Object.freeze({ // eslint-disable-line no-unused-vars
			...config, 
			response: new ApiResponse(
				itemTypesDataFixture,
				config,
				new Response(itemTypesDataFixture)
			),
			source: 'request'
		}));
		const stage3 = cache(config);

		assert.instanceOf(stage3.response, ApiResponse);
		assert.deepEqual(stage3.response.getData(), itemTypesDataFixture);
		assert.equal(stage3.source, 'cache');
	});

	it('should cache and return correct items', () => {
		const configItem1 = Object.freeze({
			method: 'get',
			resource: {
				library: 'u123',
				items: 'ABCD2345'
			}
		});
		const configItem2 = Object.freeze({
			method: 'get',
			resource: {
				library: 'u123',
				items: 'EEFFGGHH'
			}
		});

		const configItem3 = Object.freeze({
			method: 'get',
			ifModifiedSinceVersion: 42,
			resource: {
				library: 'u123',
				items: 'IIJJKKLL'
			}
		});

		const stage2 = cache(Object.freeze({ // eslint-disable-line no-unused-vars
			...configItem1,
			response: new SingleReadResponse(
				itemFixture,
				configItem1,
				new Response(itemFixture)
			),
			source: 'request'
		}));

		const stage3 = cache(configItem1);
		assert.instanceOf(stage3.response, SingleReadResponse);
		assert.deepEqual(stage3.response.getData(), itemFixture.data);
		assert.equal(stage3.source, 'cache');

		const stage3Bogus = cache(configItem2);
		assert.notProperty(stage3Bogus, 'response');
		assert.notProperty(stage3Bogus, 'source');

		const stage3VersionMismatch = cache(configItem3);
		assert.notProperty(stage3VersionMismatch, 'response');
		assert.notProperty(stage3VersionMismatch, 'source');
	});

	it('should cache for configured time only', () => {
		const startTime = new Date(1.5e+12);
		const stage3Time = new Date(1.5e+12 + 7.2e+6); //2 hours later
		const stage4Time = new Date(1.5e+12 + 8.64e+7 + 1); //24 hours and 1 second later
		tk.travel(startTime);

		const config = Object.freeze({
			method: 'get',
			resource: {
				itemTypes: null
			}
		});

		const stage1 = cache(config);
		assert.notProperty(stage1, 'response');
		assert.notProperty(stage1, 'source');
		
		const stage2 = cache(Object.freeze({ // eslint-disable-line no-unused-vars
			...config, 
			response: new ApiResponse(
				itemTypesDataFixture,
				config,
				new Response(itemTypesDataFixture)
			),
			source: 'request'
		}));

		tk.travel(stage3Time);
		const stage3 = cache(config);
		assert.instanceOf(stage3.response, ApiResponse);
		assert.deepEqual(stage3.response.getData(), itemTypesDataFixture);
		assert.equal(stage3.source, 'cache');

		tk.travel(stage4Time);
		const stage4 = cache(config);
		assert.notProperty(stage4, 'response');
		assert.notProperty(stage4, 'source');
	});

	it('should clean up expired keys', () => {
		const startTime = new Date(1.5e+12);
		const stage3Time = new Date(1.5e+12 + 30 * 1000);
		const stage4Time = new Date(1.5e+12 + 61 * 1000);
		tk.travel(startTime);

		const configItem1 = Object.freeze({
			method: 'get',
			resource: {
				library: 'u123',
				items: 'ABCD2345'
			}
		});
		const configItem2 = Object.freeze({
			method: 'get',
			resource: {
				library: 'u123',
				items: 'EEFFGGHH'
			}
		});
		const configItem3 = Object.freeze({
			method: 'get',
			resource: {
				library: 'u123',
				items: 'IIJJKKLL'
			}
		});

		const stage1 = cache(configItem1);
		assert.notProperty(stage1, 'response');
		assert.notProperty(stage1, 'source');
		
		cache(Object.freeze({ // eslint-disable-line no-unused-vars
			...configItem1,
			response: new SingleReadResponse(
				itemFixture,
				configItem1,
				new Response(itemFixture)
			),
			source: 'request'
		}));

		cache(Object.freeze({ // eslint-disable-line no-unused-vars
			...configItem2,
			response: new SingleReadResponse(
				itemFixture,
				configItem2,
				new Response(itemFixture)
			),
			source: 'request'
		}));
		cache(configItem3);

		assert.equal(Object.keys(fakeStore.storage).length, 2);

		tk.travel(stage3Time);
		cache(configItem1);
		cache(configItem2);
		cache(configItem3);
		assert.equal(Object.keys(fakeStore.storage).length, 2);

		tk.travel(stage4Time);
		cache(configItem1);
		cache(configItem2);
		cache(configItem3);
		assert.equal(Object.keys(fakeStore.storage).length, 0);

		const stage3 = cache(configItem1);
		assert.notProperty(stage3, 'response');
		assert.notProperty(stage3, 'source');

		tk.travel(stage4Time);
		const stage4 = cache(configItem2);
		assert.notProperty(stage4, 'response');
		assert.notProperty(stage4, 'source');
	});

	it('installs an executor', () => {
		const options = {
			functions: {},
			config: {
				executors: ['foo', 'bar']
			},
			ef: function(conf) {
				return { ...this, ...conf }
			}
		};
		const extender = extenderFactory();
		assert.isFunction(extender);

		const newConfig = extender(options);

		assert.lengthOf(newConfig.executors, 4);
		assert.isFunction(newConfig.executors[0]);
		assert.isFunction(newConfig.executors[3]);
	});

	it('installs an executor with custom config', () => {
		const options = {
			functions: {},
			config: {
				executors: ['foo', 'bar'],
				method: 'get',
				resource: {
					itemTypes: null
				}
			},
			ef: function(conf) {
				return { ...this, ...conf }
			}
		};
		const extender = extenderFactory({
			prefix: 'foobar',
			storage: fakeStore
		});
		
		assert.isFunction(extender);

		const newConfig = extender(options);

		newConfig.executors[0]({
			...options.config, 
			response: new ApiResponse(
				itemTypesDataFixture,
				options,
				new Response(itemTypesDataFixture)
			),
			source: 'request'
		});

		assert.match(fakeStore.key(0), /^foobar/);
	});

	it('installs the "invalidate" function', () => {
		const options = {
			functions: {},
			config: {
				executors: ['foo']
			},
			ef: function(conf) {
				return { ...this, ...conf }
			}
		};
		const extender = extenderFactory();
		extender(options);

		assert.deepEqual(Object.keys(options.functions), ['invalidate']);
		assert.isFunction(options.functions.invalidate);
	});

	it('invalidates cache', () => {
		const config = Object.freeze({
			method: 'get',
			resource: {
				itemTypes: null
			}
		});

		const stage1 = cache(config);
		assert.notProperty(stage1, 'response');
		assert.notProperty(stage1, 'source');
		
		const stage2 = cache(Object.freeze({ // eslint-disable-line no-unused-vars
			...config, 
			response: new ApiResponse(
				itemTypesDataFixture,
				config,
				new Response(itemTypesDataFixture)
			),
			source: 'request'
		}));

		const stage3 = cache(config);
		assert.instanceOf(stage3.response, ApiResponse);
		assert.deepEqual(stage3.response.getData(), itemTypesDataFixture);
		assert.equal(stage3.source, 'cache');

		invalidate('resource.itemTypes');

		const stage4 = cache(config);
		assert.notProperty(stage4, 'response');
		assert.notProperty(stage4, 'source');
	});

	it('invalidates cache with complex targets specifically', () => {
		const config1 = Object.freeze({
			method: 'get',
			limit: 33,
			resource: {
				library: 'u123',
				items: 'ABCD2345'
			}
		});
		const config2 = Object.freeze({
			method: 'get',
			limit: 50,
			resource: {
				library: 'u123',
				items: 'ABCD2345'
			}
		});

		cache(config1);
		cache(config2);

		cache(Object.freeze({ // eslint-disable-line no-unused-vars
			...config1, 
			response: new ApiResponse(
				itemFixture,
				config1,
				new Response(itemFixture)
			),
			source: 'request'
		}));

		cache(Object.freeze({ // eslint-disable-line no-unused-vars
			...config2, 
			response: new ApiResponse(
				itemFixture,
				config2,
				new Response(itemFixture)
			),
			source: 'request'
		}));

		invalidate({'resource.items': 'ABCD2345', 'limit': 33});

		const fromCache1 = cache(config1);
		assert.notProperty(fromCache1, 'response');
		assert.notProperty(fromCache1, 'source');

		const fromCache2 = cache(config2);
		assert.instanceOf(fromCache2.response, ApiResponse);
		assert.deepEqual(fromCache2.response.getData(), itemFixture);
		assert.equal(fromCache2.source, 'cache');
	});
});
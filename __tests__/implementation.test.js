import fs from 'fs';
import path from 'path';
import invariant from 'assert';
import * as babel from '@babel/core';
import tmp from 'tmp-promise';
import _ from 'lodash';
import codegen from '../src/codegen';
import { getConfig } from '../src/config';

const BABEL_CONFIG = {
    presets: [
        '@babel/preset-flow',
        [
            '@babel/preset-env',
            {
                modules: 'commonjs',
            },
        ],
    ],
};

const RUNTIME_HELPERS = path.resolve(__dirname, '..', 'src', 'runtimeHelpers.ts');

tmp.setGracefulCleanup();
jest.setTimeout(10000);

expect.extend({
    toBeError(received, message = '', errorType = 'Error') {
        const regex = _.isRegExp(message) ? message : new RegExp(_.escapeRegExp(message));
        const pass = _.isError(received) && regex.test(received.message) && received.name === errorType;
        if (pass) {
            return {
                message: () => `expected ${received} not to be an error with message matching: ${message}}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be ${errorType} with message matching: ${message}}`,
                pass: false,
            };
        }
    },
});

async function createDataLoaders(config, cb) {
    await tmp.withFile(
        async ({ path }) => {
            const loadersCode = await babel.transformAsync(codegen(config, RUNTIME_HELPERS), BABEL_CONFIG);
            fs.writeFileSync(path, 'const regeneratorRuntime = require("regenerator-runtime");');
            fs.appendFileSync(path, loadersCode.code);
            // Import the generated code into memory :scream:
            // TODO: maybe do this in a vm or something?
            const getLoaders = require(path).default;
            await cb(getLoaders);
        },
        { dir: path.join(__dirname, 'test-tmp-files') },
    );
}

test('non batch endpoint', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: false,
                docsLink: 'example.com/docs/foo',
            },
        },
    };

    const resources = {
        foo: jest
            .fn()
            .mockReturnValueOnce(
                Promise.resolve({
                    message: 'knock knock',
                    message_suffix: '!',
                }),
            )
            .mockReturnValueOnce(
                Promise.resolve({
                    message: "who's there",
                    message_suffix: '?',
                }),
            ),
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([{ bar_id: 1 }, { bar_id: 2 }]);
        expect(results).toEqual([
            { message: 'knock knock', message_suffix: '!' },
            { message: "who's there", message_suffix: '?' },
        ]);
    });
});

test('batch endpoint', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids }) => {
            expect(foo_ids).toEqual([1, 2, 3]);
            return Promise.resolve([
                { foo_id: 1, foo_value: 'hello' },
                { foo_id: 2, foo_value: 'world' },
                { foo_id: 3, foo_value: '!' },
            ]);
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([{ foo_id: 1 }, { foo_id: 2 }, { foo_id: 3 }]);
        expect(results).toEqual([
            { foo_id: 1, foo_value: 'hello' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: '!' },
        ]);
    });
});

test('batch endpoint (with reorderResultsByKey)', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                reorderResultsByKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids }) => {
            expect(foo_ids).toEqual([1, 2, 3]);
            return Promise.resolve([
                { foo_id: 2, foo_value: 'world' },
                { foo_id: 1, foo_value: 'hello' },
                { foo_id: 3, foo_value: '!' },
            ]);
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([{ foo_id: 1 }, { foo_id: 2 }, { foo_id: 3 }]);
        expect(results).toEqual([
            { foo_id: 1, foo_value: 'hello' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: '!' },
        ]);
    });
});

test('batch endpoint (with nestedPath)', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                nestedPath: 'foos',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids }) => {
            expect(foo_ids).toEqual([1, 2, 3]);
            return Promise.resolve({
                foos: [
                    { foo_id: 1, foo_value: 'hello' },
                    { foo_id: 2, foo_value: 'world' },
                    { foo_id: 3, foo_value: '!' },
                ],
            });
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([{ foo_id: 1 }, { foo_id: 2 }, { foo_id: 3 }]);
        expect(results).toEqual([
            { foo_id: 1, foo_value: 'hello' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: '!' },
        ]);
    });
});

test('batch endpoint (with commaSeparatedBatchKey)', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                commaSeparatedBatchKey: true,
            },
        },
    };

    const resources = {
        foo: ({ foo_ids }) => {
            expect(foo_ids).toEqual('1,2,3');
            return Promise.resolve([
                { foo_id: 1, foo_value: 'hello' },
                { foo_id: 2, foo_value: 'world' },
                { foo_id: 3, foo_value: '!' },
            ]);
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([{ foo_id: 1 }, { foo_id: 2 }, { foo_id: 3 }]);
        expect(results).toEqual([
            { foo_id: 1, foo_value: 'hello' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: '!' },
        ]);
    });
});

test('batch endpoint (multiple requests)', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 2])) {
                expect(include_extra_info).toBe(false);
                return Promise.resolve([
                    { foo_id: 1, foo_value: 'hello' },
                    { foo_id: 2, foo_value: 'world' },
                ]);
            }

            if (_.isEqual(foo_ids, [3])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 3,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: false },
            { foo_id: 3, include_extra_info: true },
        ]);

        expect(results).toEqual([
            { foo_id: 1, foo_value: 'hello' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

test('batch endpoint (multiple requests) with propertyBatchKey', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                propertyBatchKey: 'properties',
                propertyNewKey: 'property',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, properties, include_extra_info }) => {
            if (_.isEqual(foo_ids, [2, 1])) {
                expect(include_extra_info).toBe(false);
                return Promise.resolve([
                    { foo_id: 1, rating: 3, name: 'Burger King' },
                    { foo_id: 2, rating: 4, name: 'In N Out' },
                ]);
            }

            if (_.isEqual(foo_ids, [3])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 3,
                        rating: 5,
                        name: 'Shake Shack',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 2, property: 'name', include_extra_info: false },
            { foo_id: 1, property: 'rating', include_extra_info: false },
            { foo_id: 3, property: 'rating', include_extra_info: true },
        ]);

        expect(results).toEqual([
            { foo_id: 2, name: 'In N Out' },
            { foo_id: 1, rating: 3 },
            { foo_id: 3, rating: 5 },
        ]);
    });
});

test('batch endpoint (multiple requests) with propertyBatchKey returned in a nested object ', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                propertyBatchKey: 'properties',
                propertyNewKey: 'property',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, properties, include_extra_info }) => {
            if (_.isEqual(foo_ids, [2, 1])) {
                expect(include_extra_info).toBe(false);
                return Promise.resolve([
                    { foo_id: 1, properties: { rating: 3, name: 'Burger King' } },
                    { foo_id: 2, properties: { rating: 4, name: 'In N Out' } },
                ]);
            }

            if (_.isEqual(foo_ids, [3])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 3,
                        properties: {
                            rating: 5,
                            name: 'Shake Shack',
                        },
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 2, property: 'name', include_extra_info: false },
            { foo_id: 1, property: 'rating', include_extra_info: false },
            { foo_id: 3, property: 'rating', include_extra_info: true },
        ]);

        expect(results).toEqual([
            { foo_id: 2, properties: { name: 'In N Out' } },
            { foo_id: 1, properties: { rating: 3 } },
            { foo_id: 3, properties: { rating: 5 } },
        ]);
    });
});

test('batch endpoint (multiple requests) with propertyBatchKey that rejects', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                propertyBatchKey: 'properties',
                propertyNewKey: 'property',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, properties, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                return Promise.reject('yikes');
            }
            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 2,
                        name: 'Burger King',
                        rating: 3,
                    },
                    {
                        foo_id: 4,
                        name: 'In N Out',
                        rating: 3.5,
                    },
                    {
                        foo_id: 5,
                        name: 'Shake Shack',
                        rating: 4,
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, property: 'name', include_extra_info: false },
            { foo_id: 2, property: 'rating', include_extra_info: true },
            { foo_id: 3, property: 'name', include_extra_info: false },
            { foo_id: 4, property: 'rating', include_extra_info: true },
            { foo_id: 5, property: 'name', include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(/yikes/, 'NonError'),
            { foo_id: 2, rating: 3 },
            expect.toBeError(/yikes/, 'NonError'),
            { foo_id: 4, rating: 3.5 },
            { foo_id: 5, name: 'Shake Shack' },
        ]);
    });
});

test('batch endpoint (multiple requests) with propertyBatchKey error handling', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                propertyBatchKey: 'properties',
                propertyNewKey: 'property',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, properties, include_extra_info }) => {
            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 2,
                        name: 'Burger King',
                        rating: 3,
                    },
                    {
                        foo_id: 4,
                        name: 'In N Out',
                        rating: 3.5,
                    },
                    {
                        foo_id: 5,
                        name: 'Shake Shack',
                        rating: 4,
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                throw new Error('yikes');
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, property: 'name', include_extra_info: false },
            { foo_id: 2, property: 'rating', include_extra_info: true },
            { foo_id: 3, property: 'name', include_extra_info: false },
            { foo_id: 4, property: 'rating', include_extra_info: true },
            { foo_id: 5, property: 'name', include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(/yikes/),
            { foo_id: 2, rating: 3 },
            expect.toBeError(/yikes/),
            { foo_id: 4, rating: 3.5 },
            { foo_id: 5, name: 'Shake Shack' },
        ]);
    });
});

test('batch endpoint with propertyBatchKey without reorderResultsByKey throws error for response with non existant items', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                propertyBatchKey: 'properties',
                propertyNewKey: 'property',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, bar }) => {
            if (_.isEqual(foo_ids, [1, 2, 3])) {
                return Promise.resolve([
                    {
                        foo_id: 1,
                        name: 'Shake Shack',
                        rating: 4,
                    },
                    // deliberately omit 2
                    {
                        foo_id: 3,
                        name: 'Burger King',
                        rating: 3,
                    },
                ]);
            } else if (_.isEqual(foo_ids, [4])) {
                return Promise.resolve([
                    {
                        foo_id: 4,
                        name: 'In N Out',
                        rating: 3.5,
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, property: 'name', include_extra_info: true },
            { foo_id: 2, property: 'rating', include_extra_info: true },
            { foo_id: 3, property: 'rating', include_extra_info: true },
            { foo_id: 4, property: 'rating', include_extra_info: false },
        ]);

        expect(results).toMatchObject([
            { foo_id: 1, name: 'Shake Shack' },
            expect.toBeError(
                'Could not find key = "2" in the response dict. Or your response does not follow the type we support.',
                'BatchItemNotFoundError',
            ),
            { foo_id: 3, rating: 3 },
            { foo_id: 4, rating: 3.5 },
        ]);
    });
});

test('batch endpoint (multiple requests) with propertyBatchKey different response structure', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                propertyBatchKey: 'properties',
                propertyNewKey: 'property',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, properties, include_extra_info }) => {
            if (_.isEqual(foo_ids, [2, 1]) && _.isEqual(properties, ['name', 'rating'])) {
                expect(include_extra_info).toBe(false);
                return Promise.resolve([
                    { 1: { rating: 3, name: 'Burger King' } },
                    { 2: { rating: 4, name: 'In N Out' } },
                ]);
            }

            if (_.isEqual(foo_ids, [3]) && _.isEqual(properties, ['rating'])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        3: {
                            rating: 5,
                            extra_stuff: 'lorem ipsum',
                        },
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 2, property: 'name', include_extra_info: false },
            { foo_id: 1, property: 'rating', include_extra_info: false },
            { foo_id: 3, property: 'rating', include_extra_info: true },
        ]);

        expect(results).toEqual([{ 2: { name: 'In N Out' } }, { 1: { rating: 3 } }, { 3: { rating: 5 } }]);
    });
});

test('batch endpoint that rejects', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                return Promise.reject('yikes');
            }

            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 2,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 4,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 5,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: false },
            { foo_id: 4, include_extra_info: true },
            { foo_id: 5, include_extra_info: true },
        ]);
        // NonError comes from the default error handler which uses ensure-error
        expect(results).toMatchObject([
            expect.toBeError(/yikes/, 'NonError'),
            { foo_id: 2, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(/yikes/, 'NonError'),
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_id: 5, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

test('batch endpoint (multiple requests, default error handling)', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                throw new Error('yikes');
            }

            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 2,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 4,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 5,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: false },
            { foo_id: 4, include_extra_info: true },
            { foo_id: 5, include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(/yikes/),
            { foo_id: 2, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(/yikes/),
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_id: 5, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

test('batch endpoint (multiple requests, custom error handling)', async () => {
    async function errorHandler(resourcePath, error) {
        expect(resourcePath).toEqual(['foo']);
        expect(error.message).toBe('yikes');
        return new Error('hello from custom error handler');
    }

    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                throw new Error('yikes');
            }

            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 2,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 4,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 5,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources, { errorHandler });

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: false },
            { foo_id: 4, include_extra_info: true },
            { foo_id: 5, include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(/hello from custom error handler/),
            { foo_id: 2, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(/hello from custom error handler/),
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_id: 5, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

test('batch endpoint (multiple requests, error handling, nestedPath)', async () => {
    const config = {
        eek: true,
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                nestedPath: 'foo_data',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                return new Error('yikes');
            }

            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve({
                    foo_data: [
                        {
                            foo_id: 2,
                            foo_value: 'greetings',
                            extra_stuff: 'lorem ipsum',
                        },
                        {
                            foo_id: 4,
                            foo_value: 'greetings',
                            extra_stuff: 'lorem ipsum',
                        },
                        {
                            foo_id: 5,
                            foo_value: 'greetings',
                            extra_stuff: 'lorem ipsum',
                        },
                    ],
                });
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: false },
            { foo_id: 4, include_extra_info: true },
            { foo_id: 5, include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(/yikes/),
            { foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(/yikes/),
            { foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

test('batch endpoint (multiple requests, error handling - non array response)', async () => {
    const config = {
        eek: true,
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                return new Error('yikes');
            }

            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                // Deliberately returning an object, not an array
                return Promise.resolve({
                    foo: 'bar',
                });
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: false },
            { foo_id: 4, include_extra_info: true },
            { foo_id: 5, include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError('yikes'),
            expect.toBeError('[dataloader-codegen :: foo] Expected response to be an array'),
            expect.toBeError('yikes'),
            expect.toBeError('[dataloader-codegen :: foo] Expected response to be an array'),
            expect.toBeError('[dataloader-codegen :: foo] Expected response to be an array'),
        ]);
    });
});

test('batch endpoint (multiple requests, error handling, with reordering)', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                reorderResultsByKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                return new Error('yikes');
            }

            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                // return items deliberately out of order
                return Promise.resolve([
                    {
                        foo_id: 4,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 5,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 2,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: false },
            { foo_id: 4, include_extra_info: true },
            { foo_id: 5, include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(/yikes/),
            { foo_id: 2, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(/yikes/),
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_id: 5, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

/**
 * Without reorderResultsByKey:
 * If we requested 3 items, but the resource only returns 2, we don't know which
 * response is missing. It's unsafe to return any results, so we must throw an
 * error for the whole set of requests.
 */
test('batch endpoint without reorderResultsByKey throws error for response with non existant items', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, bar }) => {
            if (_.isEqual(foo_ids, [1, 2, 3])) {
                return Promise.resolve([
                    {
                        foo_id: 1,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    // deliberately omit 2
                    {
                        foo_id: 3,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            } else if (_.isEqual(foo_ids, [4])) {
                return Promise.resolve([
                    {
                        foo_id: 4,
                        foo_value: 'greetings',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: true },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: true },
            { foo_id: 4, include_extra_info: false },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(
                '[dataloader-codegen :: foo] Resource returned 2 items, but we requested 3 items',
                'BatchItemNotFoundError',
            ),
            expect.toBeError(
                '[dataloader-codegen :: foo] Resource returned 2 items, but we requested 3 items',
                'BatchItemNotFoundError',
            ),
            expect.toBeError(
                '[dataloader-codegen :: foo] Resource returned 2 items, but we requested 3 items',
                'BatchItemNotFoundError',
            ),
            { foo_id: 4, foo_value: 'greetings' },
        ]);
    });
});

test('batch endpoint with reorderResultsByKey handles response with non existant items', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                reorderResultsByKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, bar }) => {
            if (_.isEqual(foo_ids, [1, 2, 3])) {
                return Promise.resolve([
                    {
                        foo_id: 1,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    // deliberately omit 2
                    {
                        foo_id: 3,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            } else if (_.isEqual(foo_ids, [4])) {
                return Promise.resolve([
                    {
                        foo_id: 4,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, bar: true },
            { foo_id: 2, bar: true },
            { foo_id: 3, bar: true },
            { foo_id: 4, bar: false },
        ]);

        expect(results).toMatchObject([
            { foo_id: 1, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(
                '[dataloader-codegen :: foo] Response did not contain item with foo_id = 2',
                'BatchItemNotFoundError',
            ),
            { foo_id: 3, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

test('batch endpoint with isResponseDictionary handles a response that returns a dictionary', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/foos',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                isResponseDictionary: true,
            },
        },
    };

    const resources = {
        foo: ({ foo_ids }) => {
            expect(foo_ids).toEqual([1, 2, 3]);
            return Promise.resolve({
                2: { foo_id: 2, foo_value: 'world' },
                1: { foo_id: 1, foo_value: 'hello' },
                3: { foo_id: 3, foo_value: '!' },
            });
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([{ foo_id: 1 }, { foo_id: 2 }, { foo_id: 3 }]);
        expect(results).toEqual([
            { foo_id: 1, foo_value: 'hello' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: '!' },
        ]);
    });
});

test('batch endpoint with isBatchKeyASet handles a response', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                isBatchKeyASet: true,
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 2])) {
                expect(include_extra_info).toBe(false);
                return Promise.resolve([
                    { foo_id: 1, foo_value: 'hello' },
                    { foo_id: 2, foo_value: 'world' },
                ]);
            }

            if (_.isEqual(foo_ids, [3])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 3,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: false },
            { foo_id: 3, include_extra_info: true },
        ]);

        expect(results).toEqual([
            { foo_id: 1, foo_value: 'hello' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

test('batch endpoint with isResponseDictionary handles a response that returns a dictionary, with a missing item', async () => {
    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/foos',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
                isResponseDictionary: true,
            },
        },
    };

    const resources = {
        foo: ({ foo_ids }) => {
            expect(foo_ids).toEqual([1, 2, 3]);
            return Promise.resolve({
                1: { foo_id: 1, foo_value: 'hello' },
                3: { foo_id: 3, foo_value: '!' },
            });
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources);

        const results = await loaders.foo.loadMany([{ foo_id: 1 }, { foo_id: 2 }, { foo_id: 3 }]);
        expect(results).toEqual([
            { foo_id: 1, foo_value: 'hello' },
            expect.toBeError(
                '[dataloader-codegen :: foo] Could not find key = "2" in the response dict',
                'BatchItemNotFoundError',
            ),
            { foo_id: 3, foo_value: '!' },
        ]);
    });
});

test('middleware can transform the request args and the resource response', async () => {
    function before(resourcePath, resourceArgs) {
        expect(resourcePath).toEqual(['foo']);
        expect(resourceArgs).toEqual([{ foo_ids: [100, 200, 300] }]);

        // modify the arguments to the resource
        return [{ foo_ids: [1, 2, 3] }];
    }

    function after(resourcePath, response) {
        expect(resourcePath).toEqual(['foo']);
        expect(response).toEqual([
            { foo_id: 1, foo_value: 'hello' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: '!' },
        ]);

        return [
            { foo_id: 1, foo_value: 'goodbye' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: '?' },
        ];
    }

    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids }) => {
            expect(foo_ids).toEqual([1, 2, 3]);
            return Promise.resolve([
                { foo_id: 1, foo_value: 'hello' },
                { foo_id: 2, foo_value: 'world' },
                { foo_id: 3, foo_value: '!' },
            ]);
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources, { resourceMiddleware: { before, after } });

        const results = await loaders.foo.loadMany([{ foo_id: 100 }, { foo_id: 200 }, { foo_id: 300 }]);
        expect(results).toEqual([
            { foo_id: 1, foo_value: 'goodbye' },
            { foo_id: 2, foo_value: 'world' },
            { foo_id: 3, foo_value: '?' },
        ]);
    });
});

test('[isBatchResource: true] returning custom errors from error handler is supported', async () => {
    class MyCustomError extends Error {
        constructor(...args) {
            super(...args);
            this.name = this.constructor.name;
            this.foo = 'bar';
            Error.captureStackTrace(this, MyCustomError);
        }
    }

    function errorHandler(resourcePath, error) {
        expect(resourcePath).toEqual(['foo']);
        expect(error.message).toBe('yikes');
        return new MyCustomError('hello from custom error object');
    }

    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                throw new Error('yikes');
            }

            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 2,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 4,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 5,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources, { errorHandler });

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: false },
            { foo_id: 4, include_extra_info: true },
            { foo_id: 5, include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(/hello from custom error object/, 'MyCustomError'),
            { foo_id: 2, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(/hello from custom error object/, 'MyCustomError'),
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_id: 5, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);

        expect(results[0]).toHaveProperty('foo', 'bar');
        expect(results[2]).toHaveProperty('foo', 'bar');
    });
});

test('[isBatchResource: false] returning custom errors from error handler is supported', async () => {
    class MyCustomError extends Error {
        constructor(...args) {
            super(...args);
            this.name = this.constructor.name;
            this.foo = 'bar';
            Error.captureStackTrace(this, MyCustomError);
        }
    }

    function errorHandler(resourcePath, error) {
        expect(resourcePath).toEqual(['foo']);
        expect(error.message).toBe('yikes');
        return new MyCustomError('hello from custom error object');
    }

    const config = {
        resources: {
            foo: {
                isBatchResource: false,
                docsLink: 'example.com/docs/bar',
            },
        },
    };

    const resources = {
        foo: ({ foo_id, include_extra_info }) => {
            if ([1, 3].includes(foo_id)) {
                expect(include_extra_info).toBe(false);
                throw new Error('yikes');
            }

            if ([2, 4, 5].includes(foo_id)) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve({
                    foo_id,
                    foo_value: 'greetings',
                    extra_stuff: 'lorem ipsum',
                });
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources, { errorHandler });

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: false },
            { foo_id: 4, include_extra_info: true },
            { foo_id: 5, include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(/hello from custom error object/, 'MyCustomError'),
            { foo_id: 2, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(/hello from custom error object/, 'MyCustomError'),
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_id: 5, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);

        expect(results[0]).toHaveProperty('foo', 'bar');
        expect(results[2]).toHaveProperty('foo', 'bar');
    });
});

test('bail if errorHandler does not return an error', async () => {
    class MyCustomError extends Error {
        constructor(...args) {
            super(...args);
            this.name = this.constructor.name;
            this.foo = 'bar';
            Error.captureStackTrace(this, MyCustomError);
        }
    }

    function errorHandler(resourcePath, error) {
        expect(resourcePath).toEqual(['foo']);
        expect(error.message).toBe('yikes');
        return 'not an Error object';
    }

    const config = {
        resources: {
            foo: {
                isBatchResource: true,
                docsLink: 'example.com/docs/bar',
                batchKey: 'foo_ids',
                newKey: 'foo_id',
            },
        },
    };

    const resources = {
        foo: ({ foo_ids, include_extra_info }) => {
            if (_.isEqual(foo_ids, [1, 3])) {
                expect(include_extra_info).toBe(false);
                throw new Error('yikes');
            }

            if (_.isEqual(foo_ids, [2, 4, 5])) {
                expect(include_extra_info).toBe(true);
                return Promise.resolve([
                    {
                        foo_id: 2,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 4,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                    {
                        foo_id: 5,
                        foo_value: 'greetings',
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async (getLoaders) => {
        const loaders = getLoaders(resources, { errorHandler });

        const results = await loaders.foo.loadMany([
            { foo_id: 1, include_extra_info: false },
            { foo_id: 2, include_extra_info: true },
            { foo_id: 3, include_extra_info: false },
            { foo_id: 4, include_extra_info: true },
            { foo_id: 5, include_extra_info: true },
        ]);

        expect(results).toMatchObject([
            expect.toBeError(/errorHandler did not return an Error object. Instead, got string: 'not an Error object'/),
            { foo_id: 2, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(/errorHandler did not return an Error object. Instead, got string: 'not an Error object'/),
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_id: 5, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

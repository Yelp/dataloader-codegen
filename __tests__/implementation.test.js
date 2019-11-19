import fs from 'fs';
import path from 'path';
import invariant from 'assert';
import * as babel from '@babel/core';
import tmp from 'tmp-promise';
import _ from 'lodash';
import codegen from '../src/codegen';
import { getConfig } from '../src/config';

const CONFIG_PATH = path.join(__dirname, 'fixtures', 'config.yaml');
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
    toBeError(received, message = '') {
        const regex = _.isRegExp(message) ? message : new RegExp(_.escapeRegExp(message));
        const pass = _.isError(received) && regex.test(received.message);
        if (pass) {
            return {
                message: () => `expected ${received} not to be an error with message matching: ${message}}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be an error with message matching: ${message}}`,
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

    await createDataLoaders(config, async getLoaders => {
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

    await createDataLoaders(config, async getLoaders => {
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

    await createDataLoaders(config, async getLoaders => {
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

    await createDataLoaders(config, async getLoaders => {
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

    await createDataLoaders(config, async getLoaders => {
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

    await createDataLoaders(config, async getLoaders => {
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

test('batch endpoint (multiple requests, error handling)', async () => {
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
                return new Error('yikes');
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

    await createDataLoaders(config, async getLoaders => {
        const loaders = getLoaders(resources);

        // .loadMany will tank the whole batch load if there's any errors
        // @see https://github.com/graphql/dataloader/issues/41
        const results = await Promise.all(
            [
                { foo_id: 1, include_extra_info: false },
                { foo_id: 2, include_extra_info: true },
                { foo_id: 3, include_extra_info: false },
                { foo_id: 4, include_extra_info: true },
                { foo_id: 5, include_extra_info: true },
            ].map(key => {
                return loaders.foo.load(key).catch(err => err);
            }),
        );

        expect(results).toMatchObject([
            expect.toBeError(/yikes/),
            { foo_id: 2, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError(/yikes/),
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

    await createDataLoaders(config, async getLoaders => {
        const loaders = getLoaders(resources);

        // .loadMany will tank the whole batch load if there's any errors
        // @see https://github.com/graphql/dataloader/issues/41
        const results = await Promise.all(
            [
                { foo_id: 1, include_extra_info: false },
                { foo_id: 2, include_extra_info: true },
                { foo_id: 3, include_extra_info: false },
                { foo_id: 4, include_extra_info: true },
                { foo_id: 5, include_extra_info: true },
            ].map(key => {
                return loaders.foo.load(key).catch(err => err);
            }),
        );

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

    await createDataLoaders(config, async getLoaders => {
        const loaders = getLoaders(resources);

        // .loadMany will tank the whole batch load if there's any errors
        // @see https://github.com/graphql/dataloader/issues/41
        const results = await Promise.all(
            [
                { foo_id: 1, include_extra_info: false },
                { foo_id: 2, include_extra_info: true },
                { foo_id: 3, include_extra_info: false },
                { foo_id: 4, include_extra_info: true },
                { foo_id: 5, include_extra_info: true },
            ].map(key => {
                return loaders.foo.load(key).catch(err => err);
            }),
        );

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

    await createDataLoaders(config, async getLoaders => {
        const loaders = getLoaders(resources);

        // .loadMany will tank the whole batch load if there's any errors
        // @see https://github.com/graphql/dataloader/issues/41
        const results = await Promise.all(
            [
                { foo_id: 1, include_extra_info: false },
                { foo_id: 2, include_extra_info: true },
                { foo_id: 3, include_extra_info: false },
                { foo_id: 4, include_extra_info: true },
                { foo_id: 5, include_extra_info: true },
            ].map(key => {
                return loaders.foo.load(key).catch(err => err);
            }),
        );

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
                        extra_stuff: 'lorem ipsum',
                    },
                ]);
            }
        },
    };

    await createDataLoaders(config, async getLoaders => {
        const loaders = getLoaders(resources);

        // .loadMany will tank the whole batch load if there's any errors
        // @see https://github.com/graphql/dataloader/issues/41
        const results = await Promise.all(
            [
                { foo_id: 1, bar: true },
                { foo_id: 2, bar: true },
                { foo_id: 3, bar: true },
                { foo_id: 4, bar: false },
            ].map(key => {
                return loaders.foo.load(key).catch(err => err);
            }),
        );

        expect(results).toMatchObject([
            expect.toBeError('[dataloader-codegen :: foo] Resource returned 2 items, but we requested 3 items'),
            expect.toBeError('[dataloader-codegen :: foo] Resource returned 2 items, but we requested 3 items'),
            expect.toBeError('[dataloader-codegen :: foo] Resource returned 2 items, but we requested 3 items'),
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
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

    await createDataLoaders(config, async getLoaders => {
        const loaders = getLoaders(resources);

        // .loadMany will tank the whole batch load if there's any errors
        // @see https://github.com/graphql/dataloader/issues/41
        const results = await Promise.all(
            [
                { foo_id: 1, bar: true },
                { foo_id: 2, bar: true },
                { foo_id: 3, bar: true },
                { foo_id: 4, bar: false },
            ].map(key => {
                return loaders.foo.load(key).catch(err => err);
            }),
        );

        expect(results).toMatchObject([
            { foo_id: 1, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            expect.toBeError('[dataloader-codegen :: foo] Response did not contain item with foo_id = 2'),
            { foo_id: 3, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
            { foo_id: 4, foo_value: 'greetings', extra_stuff: 'lorem ipsum' },
        ]);
    });
});

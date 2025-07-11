import { strict as assert } from 'node:assert';
import { ResourceConfig, BatchResourceConfig, NonBatchResourceConfig } from './config';
import { getLoaderTypeKey, getLoaderTypeVal } from './genType';
import { errorPrefix } from './runtimeHelpers';

function getLoaderComment(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>): string {
    const configComment = JSON.stringify(resourceConfig, null, 2)
        .split('\n')
        .map((line) => `* ${line}`)
        .join('\n');

    return `
        /**
         * ===============================================================
         * Generated DataLoader: ${resourcePath.join('.')}
         * ===============================================================
         *
         * Resource Config:
         *
         * \`\`\`json
         ${configComment}
         * \`\`\`
         */
    `;
}

function callResource(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>): string {
    // The reference at runtime to where the underlying resource lives
    const resourceReference = ['resources', ...resourcePath].join('.');

    // Call the underlying resource, wrapped with our middleware and error handling.
    // Uses an iife so the result variable is assignable at the callsite (for readability)
    return `
        (async _resourceArg => {
            // Make a re-assignable variable so eslint doesn't complain
            let __resourceArgs = [_resourceArg] as const;

            if (options && options.resourceMiddleware && options.resourceMiddleware.before) {
                __resourceArgs = await options.resourceMiddleware.before(
                    ${JSON.stringify(resourcePath)},
                    __resourceArgs
                );
            }

            let _response;
            try {
                // Finally, call the resource!
                _response = await ${resourceReference}(...__resourceArgs);
            } catch (error) {
                const errorHandler = (options && typeof options.errorHandler === 'function') ? options.errorHandler : defaultErrorHandler;

                /**
                 * Apply some error handling to catch and handle all errors/rejected promises. errorHandler must return an Error object.
                 *
                 * If we let errors here go unhandled here, it will bubble up and DataLoader will return an error for all
                 * keys requested. We can do slightly better by returning the error object for just the keys in this batch request.
                 */
                _response = await errorHandler(${JSON.stringify(resourcePath)}, error);

                // Check that errorHandler actually returned an Error object, and turn it into one if not.
                if (!(_response instanceof Error)) {
                    _response = new Error([
                        \`${errorPrefix(
                            resourcePath,
                        )} Caught an error, but errorHandler did not return an Error object.\`,
                        \`Instead, got \${typeof _response}: \${util.inspect(_response)}\`,
                    ].join(' '));
                }
            }

            if (options && options.resourceMiddleware && options.resourceMiddleware.after) {
                _response = await options.resourceMiddleware.after(
                    ${JSON.stringify(resourcePath)},
                    _response
                );
            }

            return _response;
        })
    `;
}

/**
 * This is a helper to implement the batch logic, shared between getBatchLoader and getPropertyBatchLoader
 */
function batchLoaderLogic(resourceConfig: BatchResourceConfig, resourcePath: ReadonlyArray<string>) {
    return `
            // Map the request groups to a list of Promises - one for each request
            const groupedResults = await Promise.all(requestGroups.map(async requestIDs => {
                /**
                 * Select a set of elements in "keys", where all non-batch
                 * keys should be identical.
                 *
                 * We're going to smoosh all these together into one payload to
                 * send to the resource as a batch request!
                 */
                const requests = requestIDs.map(id => keys[id]);

                ${(() => {
                    const { batchKey, newKey, commaSeparatedBatchKey, isBatchKeyASet } = resourceConfig;

                    let requestsMap = `requests.map(k => k['${newKey}'])`;
                    if (isBatchKeyASet === true) {
                        requestsMap = `new Set(${requestsMap})`;
                    }

                    let batchKeyParam = `['${batchKey}']: ${requestsMap}`;
                    if (commaSeparatedBatchKey === true) {
                        batchKeyParam = `${batchKeyParam}.join(',')`;
                    }

                    return `
                        // For now, we assume that the dataloader key should be the first argument to the resource
                        // @see https://github.com/Yelp/dataloader-codegen/issues/56
                        const resourceArg = {
                            ..._.omit(requests[0], '${resourceConfig.newKey}'),
                            ${batchKeyParam},
                        };
                    `;
                })()}

                // Any-type so this is re-assignable to the 'nestedPath' without TS complaining
                let response: any = await ${callResource(resourceConfig, resourcePath)}(resourceArg);

                if (!(response instanceof Error)) {
                    ${(() => {
                        if (typeof resourceConfig.nestedPath === 'string') {
                            return `
                                /**
                                 * Un-nest the actual data from the resource return value.
                                 *
                                 * e.g.
                                 * \`\`\`js
                                 * {
                                 *   foos: [
                                 *     { id: 1, value: 'hello' },
                                 *     { id: 2, value: 'world' },
                                 *   ]
                                 * }
                                 * \`\`\`
                                 *
                                 * Becomes
                                 *
                                 * \`\`\`js
                                 * [
                                 *   { id: 1, value: 'hello' },
                                 *   { id: 2, value: 'world' },
                                 * ]
                                 * \`\`\`
                                 */
                                response = _.get(
                                    response,
                                    '${resourceConfig.nestedPath}',
                                    new Error(
                                        [
                                            '${errorPrefix(resourcePath)}',
                                            'Tried to un-nest the response from the resource, but',
                                            ".get(response, '${resourceConfig.nestedPath}')",
                                            'was empty!',
                                        ].join(' ')
                                    ),
                                );
                            `;
                        } else {
                            return '';
                        }
                    })()}
                }

                if (!(response instanceof Error)) {
                    ${(() => {
                        if (resourceConfig.isResponseDictionary === true) {
                            return `
                                if (typeof response !== 'object') {
                                    response = new Error(
                                        [
                                            '${errorPrefix(resourcePath)}',
                                            'Expected response to be an dictionary!',
                                        ].join(' ')
                                    );
                                }
                            `;
                        } else {
                            return `
                                if (!Array.isArray(response)) {
                                    response = new Error(
                                        [
                                            '${errorPrefix(resourcePath)}',
                                            'Expected response to be an array!',
                                        ].join(' ')
                                    );
                                }
                            `;
                        }
                    })()}
                }

                ${(() => {
                    const { reorderResultsByKey, isResponseDictionary, propertyBatchKey } = resourceConfig;
                    if (
                        !isResponseDictionary &&
                        reorderResultsByKey == null &&
                        /**
                         * When there's propertyBatchKey and propertyNewKey, the resource might
                         * contain less number of items that we requested. It's valid, so we
                         * should skip the check.
                         */
                        !(typeof propertyBatchKey === 'string')
                    ) {
                        return `
                            if (!(response instanceof Error)) {
                                /**
                                * Check to see the resource contains the same number
                                * of items that we requested. If not, since there's
                                * no "reorderResultsByKey" specified for this resource,
                                * we don't know _which_ key's response is missing. Therefore
                                * it's unsafe to return the response array back.
                                */
                                if (response.length !== requests.length) {
                                    /**
                                    * We must return errors for all keys in this group :(
                                    */
                                    response = new BatchItemNotFoundError([
                                        \`${errorPrefix(
                                            resourcePath,
                                        )} Resource returned \${response.length} items, but we requested \${requests.length} items.\`,
                                        'Add reorderResultsByKey to the config for this resource to be able to handle a partial response.',
                                    ].join(' '));
                                }
                            }
                        `;
                    } else {
                        return '';
                    }
                })()}

                ${(() => {
                    const { newKey, isResponseDictionary } = resourceConfig;
                    if (isResponseDictionary === true) {
                        return `
                            if (!(response instanceof Error)) {
                                response = resultsDictToList(
                                    response,
                                    requests.map(request => request['${newKey}']),
                                    ${JSON.stringify(resourcePath)},
                                );
                            }
                        `;
                    } else {
                        return '';
                    }
                })()}

                /**
                 * If the resource returns an Error, we'll want to copy and
                 * return that error as the return value for every request in
                 * this group.
                 *
                 * This allow the error to be cached, and allows the rest of the
                 * requests made by this DataLoader to succeed.
                 *
                 * @see https://github.com/graphql/dataloader#caching-errors
                 */
                if (response instanceof Error) {
                    response = requestIDs.map(requestId => {
                        /**
                         * Since we're returning an error object and not the
                         * expected return type from the resource, this element
                         * would be unsortable, since it wouldn't have the
                         * "reorderResultsByKey" attribute.
                         *
                         * Let's add it to the error object, as "reorderResultsByValue".
                         *
                         * (If we didn't specify that this resource needs
                         * sorting, then this will be "null" and won't be used.)
                         */
                        const reorderResultsByValue = ${
                            typeof resourceConfig.reorderResultsByKey === 'string'
                                ? `keys[requestId]['${resourceConfig.newKey}']`
                                : 'null'
                        }

                        return new CaughtResourceError(
                            \`${errorPrefix(
                                resourcePath,
                            )} Caught error during call to resource. Error: \${response.stack}\`,
                            response,
                            reorderResultsByValue
                        );
                    });
                }

                ${(() => {
                    const { reorderResultsByKey, newKey } = resourceConfig;

                    if (typeof reorderResultsByKey === 'string') {
                        return `
                            response = sortByKeys({
                                items: response,
                                keys: requests.map(k => k['${newKey}']),
                                prop: '${reorderResultsByKey}',
                                resourcePath: ${JSON.stringify(resourcePath)},
                            })
                        `;
                    } else {
                        return '';
                    }
                })()}
    `;
}

function getBatchLoader(resourceConfig: BatchResourceConfig, resourcePath: ReadonlyArray<string>) {
    assert(
        resourceConfig.isBatchResource === true,
        `${errorPrefix(resourcePath)} Expected getBatchLoader to be called with a batch resource config`,
    );
    assert(
        typeof resourceConfig.batchKey === 'string' && typeof resourceConfig.newKey === 'string',
        `${errorPrefix(resourcePath)} Expected both batchKey and newKey for a batch resource`,
    );
    // The reference at runtime to where the underlying resource lives
    const resourceReference = ['resources', ...resourcePath].join('.');

    return `\
        new DataLoader<
            ${getLoaderTypeKey(resourceConfig, resourcePath)},
            ${getLoaderTypeVal(resourceConfig, resourcePath)},
            // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
            string,
        >(${getLoaderComment(resourceConfig, resourcePath)} async (keys) => {
            invariant(typeof ${resourceReference} === 'function', [
                '${errorPrefix(resourcePath)} ${resourceReference} is not a function.',
                'Did you pass in an instance of ${resourcePath.join('.')} to "getLoaders"?',
            ].join(' '));

            /**
             * Chunk up the "keys" array to create a set of "request groups".
             *
             * We're about to hit a batch resource. In addition to the batch
             * key, the resource may take other arguments too. When batching
             * up requests, we'll want to look out for where those other
             * arguments differ, and send multiple requests so we don't get
             * back the wrong info.
             *
             * In other words, we'll potentially want to send _multiple_
             * requests to the underlying resource batch method in this
             * dataloader body.
             *
             * ~~~ Why? ~~~
             *
             * Consider what happens when we get called with arguments where
             * the non-batch keys differ.
             *
             * Example:
             *
             * \`\`\`js
             * loaders.foo.load({ foo_id: 2, include_private_data: true });
             * loaders.foo.load({ foo_id: 3, include_private_data: false });
             * loaders.foo.load({ foo_id: 4, include_private_data: false });
             * \`\`\`
             *
             * If we collected everything up and tried to send the one
             * request to the resource as a batch request, how do we know
             * what the value for "include_private_data" should be? We're
             * going to have to group these up up and send two requests to
             * the resource to make sure we're requesting the right stuff.
             *
             * e.g. We'd need to make the following set of underlying resource
             * calls:
             *
             * \`\`\`js
             * foo({ foo_ids: [ 2 ], include_private_data: true });
             * foo({ foo_ids: [ 3, 4 ], include_private_data: false });
             * \`\`\`
             *
             * ~~~ tl;dr ~~~
             *
             * When we have calls to .load with differing non batch key args,
             * we'll need to send multiple requests to the underlying
             * resource to make sure we get the right results back.
             *
             * Let's create the request groups, where each element in the
             * group refers to a position in "keys" (i.e. a call to .load)
             *
             * Example:
             *
             * \`\`\`js
             * partitionItems('bar_id', [
             *   { bar_id: 7, include_extra_info: true },
             *   { bar_id: 8, include_extra_info: false },
             *   { bar_id: 9, include_extra_info: true },
             * ])
             * \`\`\`
             *
             * Returns:
             * \`[ [ 0, 2 ], [ 1 ] ]\`
             *
             * We'll refer to each element in the group as a "request ID".
             */
            const requestGroups = partitionItems('${resourceConfig.newKey}', keys);

                ${batchLoaderLogic(resourceConfig, resourcePath)}

                return response;
            }))

            return unPartitionResults(requestGroups, groupedResults);
         },
         {
             ...cacheKeyOptions,
             ${resourceConfig.maxBatchSize ? `maxBatchSize: ${resourceConfig.maxBatchSize},` : ''}
         }
     )`;
}

function getPropertyBatchLoader(resourceConfig: BatchResourceConfig, resourcePath: ReadonlyArray<string>) {
    assert(
        resourceConfig.isBatchResource === true,
        `${errorPrefix(resourcePath)} Expected getBatchLoader to be called with a batch resource config`,
    );
    assert(
        typeof resourceConfig.batchKey === 'string' && typeof resourceConfig.newKey === 'string',
        `${errorPrefix(resourcePath)} Expected both batchKey and newKey for a batch resource`,
    );
    assert(
        typeof resourceConfig.propertyBatchKey === 'string' && typeof resourceConfig.responseKey === 'string',
        `${errorPrefix(resourcePath)} Expected propertyBatchKey and responseKey for a property batch resource`,
    );
    // The reference at runtime to where the underlying resource lives
    const resourceReference = ['resources', ...resourcePath].join('.');

    return `\
        new DataLoader<
            ${getLoaderTypeKey(resourceConfig, resourcePath)},
            ${getLoaderTypeVal(resourceConfig, resourcePath)},
            // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
            string,
        >(${getLoaderComment(resourceConfig, resourcePath)} async (keys) => {
            invariant(typeof ${resourceReference} === 'function', [
                '${errorPrefix(resourcePath)} ${resourceReference} is not a function.',
                'Did you pass in an instance of ${resourcePath.join('.')} to "getLoaders"?',
            ].join(' '));

            /**
             * When we have calls to .load with differing non batch key args,
             * we'll need to send multiple requests to the underlying
             * resource to make sure we get the right results back.
             *
             * Let's create the request groups, where each element in the
             * group refers to a position in "keys" (i.e. a call to .load)
             *
             * Example:
             *
             * \`\`\`js
             * partitionItems(['bar_id', 'properties'], [
             *   { bar_id: 7, properties: ['property_1'], include_extra_info: true },
             *   { bar_id: 8, properties: ['property_2'], include_extra_info: false },
             *   { bar_id: 9, properties: ['property_3'], include_extra_info: true },
             * ])
             * \`\`\`
             *
             * Returns:
             * \`[ [ 0, 2 ], [ 1 ] ]\`
             *
             * We'll refer to each element in the group as a "request ID".
             */
            const requestGroups = partitionItems([
                '${resourceConfig.newKey}',
                '${resourceConfig.propertyBatchKey}'
            ], keys);

                ${batchLoaderLogic(resourceConfig, resourcePath)}

                return response;
            }))

            /**
             *  The resource might contain less number of items that we requested.
             *  We need the value of batchKey and propertyBatchKey in requests group to help us split the results
             *  back up into the order that they were requested.
             */
            const batchKeyPartition = getBatchKeysForPartitionItems(
                '${resourceConfig.newKey}',
                ['${resourceConfig.newKey}', '${resourceConfig.propertyBatchKey}'],
                keys
            );
            const propertyBatchKeyPartiion = getBatchKeysForPartitionItems(
                '${resourceConfig.propertyBatchKey}',
                ['${resourceConfig.newKey}', '${resourceConfig.propertyBatchKey}'],
                keys
            );
            return unPartitionResultsByBatchKeyPartition(
                '${resourceConfig.newKey}',
                '${resourceConfig.propertyBatchKey}',
                '${resourceConfig.responseKey}',
                batchKeyPartition,
                propertyBatchKeyPartiion,
                requestGroups,
                groupedResults
            );
         },
         {
             ...cacheKeyOptions,
            ${resourceConfig.maxBatchSize ? `maxBatchSize: ${resourceConfig.maxBatchSize},` : ''}
         }
     )`;
}

function getNonBatchLoader(resourceConfig: NonBatchResourceConfig, resourcePath: ReadonlyArray<string>) {
    assert(
        resourceConfig.isBatchResource === false,
        `${errorPrefix(resourcePath)} Expected getNonBatchLoader to be called with a non-batch endpoint config`,
    );

    // The reference at runtime to where the underlying resource lives
    const resourceReference = ['resources', ...resourcePath].join('.');

    return `\
        new DataLoader<
            ${getLoaderTypeKey(resourceConfig, resourcePath)},
            ${getLoaderTypeVal(resourceConfig, resourcePath)},
            // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
            string,
        >(${getLoaderComment(resourceConfig, resourcePath)} async (keys) => {
            const responses = await Promise.all(keys.map(async key => {
                invariant(typeof ${resourceReference} === 'function', [
                    '${errorPrefix(resourcePath)} ${resourceReference} is not a function.',
                    'Did you pass in an instance of ${resourcePath.join('.')} to "getLoaders"?',
                ].join(' '));

                // For now, we assume that the dataloader key should be the first argument to the resource
                // @see https://github.com/Yelp/dataloader-codegen/issues/56
                const resourceArg = key;

                return await ${callResource(resourceConfig, resourcePath)}(resourceArg);
            }));

            return responses;
        },
        {
            ...cacheKeyOptions
        })`;
}

export default function getLoaderImplementation(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>) {
    if (resourceConfig.isBatchResource) {
        if (typeof resourceConfig.propertyBatchKey === 'string') {
            return getPropertyBatchLoader(resourceConfig, resourcePath);
        } else {
            return getBatchLoader(resourceConfig, resourcePath);
        }
    } else {
        return getNonBatchLoader(resourceConfig, resourcePath);
    }
}

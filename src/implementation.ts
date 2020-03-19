import { ResourceConfig, BatchResourceConfig, NonBatchResourceConfig } from './config';
import assert from './assert';
import { getLoaderTypeKey, getLoaderTypeVal } from './genTypeFlow';
import { errorPrefix } from './runtimeHelpers';

function getLoaderComment(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>): string {
    const configComment = JSON.stringify(resourceConfig, null, 2)
        .split('\n')
        .map(line => `* ${line}`)
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

function getBatchLoader(resourceConfig: BatchResourceConfig, resourcePath: ReadonlyArray<string>) {
    assert(
        resourceConfig.isBatchResource === true,
        `${errorPrefix(resourcePath)} Expected getBatchLoader to be called with a batch resource config`,
    );

    // The reference at runtime to where the underlying resource lives
    const resourceReference = ['resources', ...resourcePath].join('.');

    return `\
        new DataLoader<
            ${getLoaderTypeKey(resourceConfig, resourcePath)},
            ${getLoaderTypeVal(resourceConfig, resourcePath)}
        >(${getLoaderComment(resourceConfig, resourcePath)} async (keys) => {
            if (typeof ${resourceReference} !== 'function') {
                return Promise.reject([
                    '${errorPrefix(resourcePath)} ${resourceReference} is not a function.',
                    'Did you pass in an instance of ${resourcePath.join('.')} to "getLoaders"?',
                ].join(' '));
            }

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
             * partitionItems([
             *   { bar_id: 7, include_extra_info: true },
             *   { bar_id: 8, include_extra_info: false },
             *   { bar_id: 9, include_extra_info: true },
             * ], 'bar_id')
             * \`\`\`
             *
             * Returns:
             * \`[ [ 0, 2 ], [ 1 ] ]\`
             *
             * We'll refer to each element in the group as a "request ID".
             */
            const requestGroups = partitionItems('${resourceConfig.newKey}', keys);

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
                    const { batchKey, newKey, commaSeparatedBatchKey } = resourceConfig;

                    let batchKeyParam = `['${batchKey}']: requests.map(k => k['${newKey}'])`;
                    if (commaSeparatedBatchKey === true) {
                        batchKeyParam = `${batchKeyParam}.join(',')`;
                    }

                    return `
                        let resourceArgs = [{
                            ..._.omit(requests[0], '${resourceConfig.newKey}'),
                            ${batchKeyParam},
                        }];

                        if (options && options.resourceMiddleware && options.resourceMiddleware.before) {
                            resourceArgs = await options.resourceMiddleware.before(${JSON.stringify(
                                resourcePath,
                            )}, resourceArgs);
                        }

                        // Finally, call the resource!
                        let response = await ${resourceReference}(...resourceArgs);

                        if (options && options.resourceMiddleware && options.resourceMiddleware.after) {
                            response = await options.resourceMiddleware.after(${JSON.stringify(
                                resourcePath,
                            )}, response);
                        }
                    `;
                })()}

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
                            if (!(response instanceof Error)) {
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
                            }
                        `;
                    } else {
                        return '';
                    }
                })()}

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
                    const { reorderResultsByKey, isResponseDictionary } = resourceConfig;

                    if (!isResponseDictionary && reorderResultsByKey == null) {
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

                                    // Tell flow that "response" is actually an error object.
                                    // (This is so we can pass it as 'cause' to CaughtResourceError)
                                    invariant(response instanceof Error, 'expected BatchItemNotFoundError to be an Error');
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

                        // Tell flow that "response" is actually an error object.
                        // (This is so we can pass it as 'cause' to CaughtResourceError)
                        invariant(response instanceof Error, 'expected response to be an error');

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

                return response;
            }))

            // Split the results back up into the order that they were requested
            return unPartitionResults(requestGroups, groupedResults);
         },
         {
             ${
                 /**
                  * TODO: Figure out why directly passing `cacheKeyOptions` causes
                  * flow errors :(
                  */ ''
             }
             ...cacheKeyOptions
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
            ${getLoaderTypeVal(resourceConfig, resourcePath)}
        >(${getLoaderComment(resourceConfig, resourcePath)} async (keys) => {
            const response = await Promise.all(keys.map(key => {
                if (typeof ${resourceReference} !== 'function') {
                    return Promise.reject([
                        '${errorPrefix(resourcePath)} ${resourceReference} is not a function.',
                        'Did you pass in an instance of ${resourcePath.join('.')} to "getLoaders"?',
                    ].join(' '));
                }

                return ${resourceReference}(key);
            }));

            return response;
        },
        {
            ...cacheKeyOptions
        })`;
}

export default function getLoaderImplementation(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>) {
    const loader = resourceConfig.isBatchResource
        ? getBatchLoader(resourceConfig, resourcePath)
        : getNonBatchLoader(resourceConfig, resourcePath);

    return loader;
}

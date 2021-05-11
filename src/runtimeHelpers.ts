/**
 * @file These functions get referenced in the codegen'd output. Also may be
 * imported by human-defined dataloaders.
 */

import _ from 'lodash';
import AggregateError from 'aggregate-error';
import ensureError from 'ensure-error';
import invariant from 'assert';
import objectHash from 'object-hash';

export function errorPrefix(resourcePath: ReadonlyArray<string>): string {
    return `[dataloader-codegen :: ${resourcePath.join('.')}]`;
}

/**
 * An error reflects missing item in response. It follows similar structure to ApolloError that has an `extension` field.
 * This makes it easier to link and integrate with apollo-server
 * @see https://github.com/apollographql/apollo-server/blob/faba52c689c22472a19fcb65d78925df549077f7/packages/apollo-server-errors/src/index.ts#L3
 */
export class BatchItemNotFoundError extends Error {
    readonly extensions: Record<string, any>;

    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        this.extensions = {
            code: 'BATCH_ITEM_NOT_FOUND_ERROR',
        };
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * An error class used internally to wrap an error returned from a batch resource call.
 * Should be caught and handled internally - never exposed to the outside world.
 * When created, we store the `reorderResultsByValue` - this lets the ordering logic know
 * where in the return array to place this object. (We do this so we can add extra attributes
 * to the error object in a typesafe way)
 */
export class CaughtResourceError extends Error {
    cause: Error;
    reorderResultsByValue: string | number | null;

    constructor(message: string, cause: Error, reorderResultsByValue: string | number | null) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
        this.cause = cause;
        this.reorderResultsByValue = reorderResultsByValue;
    }
}

/**
 * DataLoader options that use object-hash to calculate a cache key. This allows
 * the use of objects, arrays, etc. as keys. We use it in "passthrough" mode so
 * that it stringifies objects but doesn't waste time hashing them.
 */
export const cacheKeyOptions = {
    cacheKeyFn: (key: any) => objectHash(key, { algorithm: 'passthrough' }),
};

/**
 * Take in all objects passed to .load(), and bucket them by the non
 * batchKey attributes.
 *
 * We use this to chunk up the requests to the resource.
 *
 * Example:
 * ```js
 * partitionItems('bar_id', [
 *   { bar_id: 2, include_extra_info: true },
 *   { bar_id: 3, include_extra_info: false },
 *   { bar_id: 4, include_extra_info: true },
 * ])
 * ```
 *
 * Returns:
 * `[ [ 0, 2 ], [ 1 ] ]`
 *
 * TODO: add generic instead of 'object' for the items array argument
 */
export function partitionItems(
    ignoreKeys: Array<string> | string,
    items: ReadonlyArray<object>,
): ReadonlyArray<ReadonlyArray<number>> {
    const groups: {
        [key: string]: Array<number>;
    } = {};
    items.forEach((item, i) => {
        const hash = objectHash(_.omit(item, ignoreKeys), { algorithm: 'passthrough' });
        groups[hash] = groups[hash] || [];
        groups[hash].push(i);
    });

    return Object.values(groups);
}

/**
 * This function is only called when we have secondaryBatchKey, and it's
 * used to map result to the order of requests.
 *
 * Example:
 * ```js
 * partitionItems(
 *    'bar_id',
 *    ['bar_id', 'property'],
 *    [
 *      { bar_id: 2, property: 'name', include_extra_info: true },
 *      { bar_id: 3, property: 'rating', include_extra_info: false },
 *      { bar_id: 2, property: 'rating', include_extra_info: true },
 *    ])
 * ```
 *
 * Returns:
 * `[ [ 2, 2 ], [ 3 ] ]`
 *
 * TODO: add generic instead of 'object' for the items array argument
 */
export function getBatchKeyForPartitionItems(
    batchKey: string,
    ignoreKeys: Array<string>,
    items: ReadonlyArray<object>,
): ReadonlyArray<ReadonlyArray<number>> {
    const groups: {
        [key: string]: Array<number>;
    } = {};
    items.forEach((item, i) => {
        const hash = objectHash(_.omit(item, ignoreKeys), { algorithm: 'passthrough' });
        groups[hash] = groups[hash] || [];
        groups[hash].push(items[i][batchKey]);
    });

    return Object.values(groups);
}
/**
 * Utility function to sort array of objects by a list of corresponding IDs
 *
 * Example:
 * ```js
 * sortByKeys({
 *   items: [ { id: 2, name: 'mark' }, { id: 1, name: 'ryan' } ],
 *   keys: [1, 2],
 *   prop: 'id',
 *   resourcePath: ['UserService', 'getUsers'],
 * })
 * ```
 *
 * Returns:
 * ```js
 * [ { id: 1, name: 'ryan' }, { id: 2, name: 'mark' } ]
 * ```
 *
 * Items could be null, or contain unknown errors. If this is the case, we don't
 * know where in the results array the error should go, since there'll be no id
 * field to key off of. In this case, we have to throw an error and throw away
 * all results :/
 *
 * TODO: Extend this to support endpionts that use multiple keys for sorting
 */
export function sortByKeys<V>({
    /** List of objects returned by a batch endpoint */
    items,
    /** The IDs we originally requested from the endpoint */
    keys,
    /** The attribute of each element in `items` that maps it to an element in `keys`. */
    prop,
    /** Some path that indicates what resource this is being used on. Used for stack traces. */
    resourcePath,
}: {
    items: ReadonlyArray<V>;
    keys: ReadonlyArray<string | number>;
    prop: string;
    resourcePath: ReadonlyArray<string>;
}): ReadonlyArray<V | BatchItemNotFoundError> {
    // Construct a Map of: Map<item key, item>
    const itemsMap: Map<string | number, V | BatchItemNotFoundError> = new Map();

    items.forEach((item: V) => {
        invariant(item != null, `${errorPrefix(resourcePath)} Cannot sort list of items containing an falsey element`);

        if (_.isError(item)) {
            /* istanbul ignore if: sanity check */
            if (!(item instanceof CaughtResourceError)) {
                throw new AggregateError([
                    new Error(
                        `${errorPrefix(resourcePath)} Cannot sort list of items containg an unknown error: ${
                            item.message
                        }`,
                    ),
                    item,
                ]);
            }

            const { reorderResultsByValue } = item;

            /* istanbul ignore if: sanity check */
            if (typeof reorderResultsByValue !== 'string' && typeof reorderResultsByValue !== 'number') {
                throw new Error(
                    [
                        `${errorPrefix(resourcePath)} Cannot sort list of items if CaughtResourceError`,
                        'does not contain a string or number value for reorderResultsByValue',
                    ].join(' '),
                );
            }

            itemsMap.set(String(reorderResultsByValue), item);
        } else {
            // @ts-ignore: TODO: Work how to tell typescript item[prop] exists
            invariant(item[prop] != null, `${errorPrefix(resourcePath)} Could not find property "${prop}" in item`);
            // @ts-ignore: TODO: Work how to tell typescript item[prop] exists
            itemsMap.set(String(item[prop]), item);
        }
    });

    // Loop through the keys and for each one retrieve proper item. For missing
    // items, generate an BatchItemNotFoundError. (This can be caught specifically in resolvers.)
    return keys.map(
        (key) =>
            itemsMap.get(String(key)) ||
            new BatchItemNotFoundError(
                `${errorPrefix(resourcePath)} Response did not contain item with ${prop} = ${String(key)}`,
            ),
    );
}

/**
 * Perform the inverse mapping from partitionItems on the nested results we get
 * back from the service.
 *
 * Example
 * ```js
 * unPartitionResults(
 *   [ [0, 2], [1] ],
 *   [ [ { foo: 'foo' }, { bar: 'bar' } ], [ {'baz': 'baz'} ] ],
 * )
 * ```
 *
 * Returns:
 * ```
 * [
 *   { foo: 'foo' },
 *   { baz: 'baz' },
 *   { bar: 'bar' },
 * ]
 */
export function unPartitionResults<T>(
    /** Should be a nested array of IDs, as generated by partitionItems */
    requestGroups: ReadonlyArray<ReadonlyArray<number>>,
    /** The results back from the service, in the same shape as groups */
    resultGroups: ReadonlyArray<ReadonlyArray<T | CaughtResourceError | BatchItemNotFoundError>>,
): ReadonlyArray<T | Error> {
    /**
     * e.g. with our inputs, produce:
     * ```js
     * [
     *   [
     *      { order: 0, result: { foo: 'foo' } },
     *      { order: 2, result: { bar: 'bar' } },
     *   ],
     *   [
     *      { order: 1, result: { baz: 'baz' } },
     *   ]
     * ]
     * ```
     */
    const zippedGroups = requestGroups.map((ids, i) => ids.map((id, j) => ({ order: id, result: resultGroups[i][j] })));

    /**
     * Flatten and sort the groups - e.g.:
     * ```js
     * [
     *   { order: 0, result: { foo: 'foo' } },
     *   { order: 1, result: { baz: 'baz' } },
     *   { order: 2, result: { bar: 'bar' } }
     * ]
     * ```
     */
    const sortedResults: ReadonlyArray<{ order: number; result: T | Error }> = _.sortBy(_.flatten(zippedGroups), [
        'order',
    ]);

    // Now that we have a sorted array, return the actual results!
    return sortedResults
        .map((r) => r.result)
        .map((result) => {
            if (result instanceof CaughtResourceError) {
                return result.cause;
            } else {
                return result;
            }
        });
}

/**
 * Perform the inverse mapping from partitionItems on the nested results we get
 * back from the service. This function is only called when we have secondaryBatchKey.
 * We assume the batchKey is inside the response here.
 *
 * Example
 * ```js
 * unPartitionResultsByBatchKeyList(
 *   [ [2, 2], [1] ]
 *   [ [0, 2], [1] ],
 *   [
 *      [ { bar_id: 2, name: 'Burger King', rating: 3 } ],
 *      [ { bar_id: 1, name: 'In N Out', rating: 4 }  ]
 *   ],
 * )
 * ```
 *
 * Returns:
 * ```
 * [
 *   { bar_id: 2, name: 'Burger King', rating: 3 }，
 *   { bar_id: 1, name: 'In N Out', rating: 4 }，
 *   { bar_id: 2, name: 'Burger King', rating: 3 }，
 * ]
 */
export function unPartitionResultsByBatchKeyPartition<T>(
    groupByBatchKey,
    /** Should be a nested array of IDs, as generated by partitionItems */
    requestGroups: ReadonlyArray<ReadonlyArray<number>>,
    /** The results back from the service, in the same shape as groups */
    resultGroups: ReadonlyArray<ReadonlyArray<T | CaughtResourceError | BatchItemNotFoundError>>,
): ReadonlyArray<T | Error> {
    /**
     * e.g. with our inputs, produce:
     * ```js
     * [
     *   [
     *      { order: 0, result: { bar_id: 2, name: 'Burger King', rating: 3 },
     *      { order: 2, result: { bar_id: 2, name: 'Burger King', rating: 3 } },
     *   ],
     *   [
     *      { order: 1, result: { bar_id: 1, name: 'In N Out', rating: 4 } },
     *   ]
     * ]
     * ```
     */
    const zippedGroups = requestGroups.map(function (ids, i) {
        return ids.map(function (id, j) {
            for (const element of Object.values(resultGroups)[i]) {
                if (groupByBatchKey[i][j] in element || Object.values(element).includes(groupByBatchKey[i][j])) {
                    return { order: id, result: element };
                }
            }
        });
    });
    /**
     * Flatten and sort the groups - e.g.:
     * ```js
     * [
     *   { order: 0, result: { bar_id: 2, name: 'Burger King', rating: 3 } },
     *   { order: 1, result: { bar_id: 1, name: 'In N Out', rating: 4 } },
     *   { order: 2, result: { bar_id: 2, name: 'Burger King', rating: 3 } }
     * ]
     * ```
     */
    const sortedResults: ReadonlyArray<{ order: number; result: T | Error }> = _.sortBy(_.flatten(zippedGroups), [
        'order',
    ]);

    // Now that we have a sorted array, return the actual results!
    return sortedResults
        .map((r) => r.result)
        .map((result) => {
            if (result instanceof CaughtResourceError) {
                return result.cause;
            } else {
                return result;
            }
        });
}

/**
 * Turn a dictionary of results into an ordered list
 *
 * Example
 * ```js
 * resultsDictToList(
 *   {
 *     '3': { foo: '!' },
 *     '1': { foo: 'hello' },
 *     '2': { foo: 'world' },
 *   },
 *   [1, 2, 3],
 *   resourcePath: ['FooService', 'getFoos'],
 * )
 * ```
 *
 * Returns:
 * ```
 * [
 *   { foo: 'hello' },
 *   { foo: 'world' },
 *   { foo: '!' },
 * ]
 */
export function resultsDictToList<V>(
    /**
     * A dictionary of results. Object keys that were numbers will get turned into strings by JavaScript.
     * @see https://stackoverflow.com/a/3633390
     */
    response: { [key: string]: V },
    /** The IDs we originally requested from the endpoint */
    keys: ReadonlyArray<string | number>,
    /** Some path that indicates what resource this is being used on. Used for stack traces. */
    resourcePath: ReadonlyArray<string>,
): ReadonlyArray<V | Error> {
    return keys.map(
        (key) =>
            response[String(key)] ||
            new BatchItemNotFoundError(
                `${errorPrefix(resourcePath)} Could not find key = "${String(key)}" in the response dict.`,
            ),
    );
}

/**
 * If no errorHandler option is passed to dataloader-codegen, we will use this by default.
 */
export async function defaultErrorHandler(resourcePath: ReadonlyArray<string>, error: any): Promise<Error> {
    // The error handler must return an error object. Turn all rejected strings/objects into errors.
    return ensureError(error);
}

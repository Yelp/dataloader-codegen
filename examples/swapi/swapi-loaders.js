// @flow strict-local

/**
 * !!! THIS FILE IS AUTO-GENERATED. CHANGES MAY BE OVERWRITTEN !!!
 */

import _ from 'lodash';
import invariant from 'assert';
import DataLoader from 'dataloader';
import {
    CaughtResourceError,
    cacheKeyOptions,
    partitionItems,
    sortByKeys,
    unPartitionResults,
    resultsDictToList,
} from 'dataloader-codegen/lib/runtimeHelpers';

/**
 * ===============================
 * BEGIN: printResourceTypeImports()
 * ===============================
 */
import type { SWAPIClientlibTypes } from './swapi';

/**
 * ===============================
 * END: printResourceTypeImports()
 * ===============================
 */

// https://github.com/facebook/flow/issues/7709#issuecomment-530501257
type ExtractArg = <Arg, Ret>([(Arg) => Ret]) => Arg;
type ExtractPromisedReturnValue<A> = <R>((...A) => Promise<R>) => R;

export type DataLoaderCodegenOptions = {|
    resourceMiddleware?: {|
        before?: <T>(resourcePath: $ReadOnlyArray<string>, resourceArgs: T) => T,
        after?: <T>(resourcePath: $ReadOnlyArray<string>, response: T) => T,
    |},
|};

/**
 * ===============================
 * BEGIN: printResourcesType()
 * ===============================
 */
type ResourcesType = SWAPIClientlibTypes;

/**
 * ===============================
 * END: printResourcesType()
 * ===============================
 */

export type LoadersType = $ReadOnly<{|
    getPlanets: DataLoader<
        {|
            ...$Diff<
                $Call<ExtractArg, [$PropertyType<ResourcesType, 'getPlanets'>]>,
                {
                    planet_ids: $PropertyType<
                        $Call<ExtractArg, [$PropertyType<ResourcesType, 'getPlanets'>]>,
                        'planet_ids',
                    >,
                },
            >,
            ...{|
                planet_id: $ElementType<
                    $PropertyType<$Call<ExtractArg, [$PropertyType<ResourcesType, 'getPlanets'>]>, 'planet_ids'>,
                    0,
                >,
            |},
        |},
        $ElementType<
            $Call<
                ExtractPromisedReturnValue<[$Call<ExtractArg, [$PropertyType<ResourcesType, 'getPlanets'>]>]>,
                $PropertyType<ResourcesType, 'getPlanets'>,
            >,
            0,
        >,
    >,
    getPeople: DataLoader<
        {|
            ...$Diff<
                $Call<ExtractArg, [$PropertyType<ResourcesType, 'getPeople'>]>,
                {
                    people_ids: $PropertyType<
                        $Call<ExtractArg, [$PropertyType<ResourcesType, 'getPeople'>]>,
                        'people_ids',
                    >,
                },
            >,
            ...{|
                person_id: $ElementType<
                    $PropertyType<$Call<ExtractArg, [$PropertyType<ResourcesType, 'getPeople'>]>, 'people_ids'>,
                    0,
                >,
            |},
        |},
        $ElementType<
            $Call<
                ExtractPromisedReturnValue<[$Call<ExtractArg, [$PropertyType<ResourcesType, 'getPeople'>]>]>,
                $PropertyType<ResourcesType, 'getPeople'>,
            >,
            0,
        >,
    >,
    getVehicles: DataLoader<
        {|
            ...$Diff<
                $Call<ExtractArg, [$PropertyType<ResourcesType, 'getVehicles'>]>,
                {
                    vehicle_ids: $PropertyType<
                        $Call<ExtractArg, [$PropertyType<ResourcesType, 'getVehicles'>]>,
                        'vehicle_ids',
                    >,
                },
            >,
            ...{|
                vehicle_id: $ElementType<
                    $PropertyType<$Call<ExtractArg, [$PropertyType<ResourcesType, 'getVehicles'>]>, 'vehicle_ids'>,
                    0,
                >,
            |},
        |},
        $ElementType<
            $Call<
                ExtractPromisedReturnValue<[$Call<ExtractArg, [$PropertyType<ResourcesType, 'getVehicles'>]>]>,
                $PropertyType<ResourcesType, 'getVehicles'>,
            >,
            0,
        >,
    >,
    getRoot: DataLoader<
        $Call<ExtractArg, [$PropertyType<ResourcesType, 'getRoot'>]>,
        $Call<
            ExtractPromisedReturnValue<[$Call<ExtractArg, [$PropertyType<ResourcesType, 'getRoot'>]>]>,
            $PropertyType<ResourcesType, 'getRoot'>,
        >,
    >,
|}>;

export default function getLoaders(resources: ResourcesType, options?: DataLoaderCodegenOptions): LoadersType {
    return Object.freeze({
        getPlanets: new DataLoader<
            {|
                ...$Diff<
                    $Call<ExtractArg, [$PropertyType<ResourcesType, 'getPlanets'>]>,
                    {
                        planet_ids: $PropertyType<
                            $Call<ExtractArg, [$PropertyType<ResourcesType, 'getPlanets'>]>,
                            'planet_ids',
                        >,
                    },
                >,
                ...{|
                    planet_id: $ElementType<
                        $PropertyType<$Call<ExtractArg, [$PropertyType<ResourcesType, 'getPlanets'>]>, 'planet_ids'>,
                        0,
                    >,
                |},
            |},
            $ElementType<
                $Call<
                    ExtractPromisedReturnValue<[$Call<ExtractArg, [$PropertyType<ResourcesType, 'getPlanets'>]>]>,
                    $PropertyType<ResourcesType, 'getPlanets'>,
                >,
                0,
            >,
        >(
            /**
             * ===============================================================
             * Generated DataLoader: getPlanets
             * ===============================================================
             *
             * Resource Config:
             *
             * ```json
             * {
             *   "docsLink": "https://swapi.co/documentation#planets",
             *   "isBatchResource": true,
             *   "batchKey": "planet_ids",
             *   "newKey": "planet_id"
             * }
             * ```
             */
            async keys => {
                if (typeof resources.getPlanets !== 'function') {
                    return Promise.reject(
                        [
                            '[dataloader-codegen :: getPlanets] resources.getPlanets is not a function.',
                            'Did you pass in an instance of getPlanets to "getLoaders"?',
                        ].join(' '),
                    );
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
                 * ```js
                 * loaders.foo.load({ foo_id: 2, include_private_data: true });
                 * loaders.foo.load({ foo_id: 3, include_private_data: false });
                 * loaders.foo.load({ foo_id: 4, include_private_data: false });
                 * ```
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
                 * ```js
                 * foo({ foo_ids: [ 2 ], include_private_data: true });
                 * foo({ foo_ids: [ 3, 4 ], include_private_data: false });
                 * ```
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
                 * ```js
                 * partitionItems([
                 *   { bar_id: 7, include_extra_info: true },
                 *   { bar_id: 8, include_extra_info: false },
                 *   { bar_id: 9, include_extra_info: true },
                 * ], 'bar_id')
                 * ```
                 *
                 * Returns:
                 * `[ [ 0, 2 ], [ 1 ] ]`
                 *
                 * We'll refer to each element in the group as a "request ID".
                 */
                const requestGroups = partitionItems('planet_id', keys);

                // Map the request groups to a list of Promises - one for each request
                const groupedResults = await Promise.all(
                    requestGroups.map(async requestIDs => {
                        /**
                         * Select a set of elements in "keys", where all non-batch
                         * keys should be identical.
                         *
                         * We're going to smoosh all these together into one payload to
                         * send to the resource as a batch request!
                         */
                        const requests = requestIDs.map(id => keys[id]);

                        let resourceArgs = [
                            {
                                ..._.omit(requests[0], 'planet_id'),
                                ['planet_ids']: requests.map(k => k['planet_id']),
                            },
                        ];

                        if (options && options.resourceMiddleware && options.resourceMiddleware.before) {
                            resourceArgs = await options.resourceMiddleware.before(['getPlanets'], resourceArgs);
                        }

                        // Finally, call the resource!
                        let response = await resources.getPlanets(...resourceArgs);

                        if (options && options.resourceMiddleware && options.resourceMiddleware.after) {
                            response = await options.resourceMiddleware.after(['getPlanets'], response);
                        }

                        if (!(response instanceof Error)) {
                            if (!Array.isArray(response)) {
                                response = new Error(
                                    ['[dataloader-codegen :: getPlanets]', 'Expected response to be an array!'].join(
                                        ' ',
                                    ),
                                );
                            }
                        }

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
                                response = new Error(
                                    [
                                        `[dataloader-codegen :: getPlanets] Resource returned ${response.length} items, but we requested ${requests.length} items.`,
                                        'Add reorderResultsByKey to the config for this resource to be able to handle a partial response.',
                                    ].join(' '),
                                );
                            }
                        }

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
                                const reorderResultsByValue = null;

                                // Tell flow that "response" is actually an error object.
                                // (This is so we can pass it as 'cause' to CaughtResourceError)
                                invariant(response instanceof Error, 'expected response to be an error');

                                return new CaughtResourceError(
                                    `[dataloader-codegen :: getPlanets] Caught error during call to resource. Error: ${response.stack}`,
                                    response,
                                    reorderResultsByValue,
                                );
                            });
                        }

                        return response;
                    }),
                );

                // Split the results back up into the order that they were requested
                return unPartitionResults(requestGroups, groupedResults);
            },
            {
                ...cacheKeyOptions,
            },
        ),
        getPeople: new DataLoader<
            {|
                ...$Diff<
                    $Call<ExtractArg, [$PropertyType<ResourcesType, 'getPeople'>]>,
                    {
                        people_ids: $PropertyType<
                            $Call<ExtractArg, [$PropertyType<ResourcesType, 'getPeople'>]>,
                            'people_ids',
                        >,
                    },
                >,
                ...{|
                    person_id: $ElementType<
                        $PropertyType<$Call<ExtractArg, [$PropertyType<ResourcesType, 'getPeople'>]>, 'people_ids'>,
                        0,
                    >,
                |},
            |},
            $ElementType<
                $Call<
                    ExtractPromisedReturnValue<[$Call<ExtractArg, [$PropertyType<ResourcesType, 'getPeople'>]>]>,
                    $PropertyType<ResourcesType, 'getPeople'>,
                >,
                0,
            >,
        >(
            /**
             * ===============================================================
             * Generated DataLoader: getPeople
             * ===============================================================
             *
             * Resource Config:
             *
             * ```json
             * {
             *   "docsLink": "https://swapi.co/documentation#people",
             *   "isBatchResource": true,
             *   "batchKey": "people_ids",
             *   "newKey": "person_id"
             * }
             * ```
             */
            async keys => {
                if (typeof resources.getPeople !== 'function') {
                    return Promise.reject(
                        [
                            '[dataloader-codegen :: getPeople] resources.getPeople is not a function.',
                            'Did you pass in an instance of getPeople to "getLoaders"?',
                        ].join(' '),
                    );
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
                 * ```js
                 * loaders.foo.load({ foo_id: 2, include_private_data: true });
                 * loaders.foo.load({ foo_id: 3, include_private_data: false });
                 * loaders.foo.load({ foo_id: 4, include_private_data: false });
                 * ```
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
                 * ```js
                 * foo({ foo_ids: [ 2 ], include_private_data: true });
                 * foo({ foo_ids: [ 3, 4 ], include_private_data: false });
                 * ```
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
                 * ```js
                 * partitionItems([
                 *   { bar_id: 7, include_extra_info: true },
                 *   { bar_id: 8, include_extra_info: false },
                 *   { bar_id: 9, include_extra_info: true },
                 * ], 'bar_id')
                 * ```
                 *
                 * Returns:
                 * `[ [ 0, 2 ], [ 1 ] ]`
                 *
                 * We'll refer to each element in the group as a "request ID".
                 */
                const requestGroups = partitionItems('person_id', keys);

                // Map the request groups to a list of Promises - one for each request
                const groupedResults = await Promise.all(
                    requestGroups.map(async requestIDs => {
                        /**
                         * Select a set of elements in "keys", where all non-batch
                         * keys should be identical.
                         *
                         * We're going to smoosh all these together into one payload to
                         * send to the resource as a batch request!
                         */
                        const requests = requestIDs.map(id => keys[id]);

                        let resourceArgs = [
                            {
                                ..._.omit(requests[0], 'person_id'),
                                ['people_ids']: requests.map(k => k['person_id']),
                            },
                        ];

                        if (options && options.resourceMiddleware && options.resourceMiddleware.before) {
                            resourceArgs = await options.resourceMiddleware.before(['getPeople'], resourceArgs);
                        }

                        // Finally, call the resource!
                        let response = await resources.getPeople(...resourceArgs);

                        if (options && options.resourceMiddleware && options.resourceMiddleware.after) {
                            response = await options.resourceMiddleware.after(['getPeople'], response);
                        }

                        if (!(response instanceof Error)) {
                            if (!Array.isArray(response)) {
                                response = new Error(
                                    ['[dataloader-codegen :: getPeople]', 'Expected response to be an array!'].join(
                                        ' ',
                                    ),
                                );
                            }
                        }

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
                                response = new Error(
                                    [
                                        `[dataloader-codegen :: getPeople] Resource returned ${response.length} items, but we requested ${requests.length} items.`,
                                        'Add reorderResultsByKey to the config for this resource to be able to handle a partial response.',
                                    ].join(' '),
                                );
                            }
                        }

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
                                const reorderResultsByValue = null;

                                // Tell flow that "response" is actually an error object.
                                // (This is so we can pass it as 'cause' to CaughtResourceError)
                                invariant(response instanceof Error, 'expected response to be an error');

                                return new CaughtResourceError(
                                    `[dataloader-codegen :: getPeople] Caught error during call to resource. Error: ${response.stack}`,
                                    response,
                                    reorderResultsByValue,
                                );
                            });
                        }

                        return response;
                    }),
                );

                // Split the results back up into the order that they were requested
                return unPartitionResults(requestGroups, groupedResults);
            },
            {
                ...cacheKeyOptions,
            },
        ),
        getVehicles: new DataLoader<
            {|
                ...$Diff<
                    $Call<ExtractArg, [$PropertyType<ResourcesType, 'getVehicles'>]>,
                    {
                        vehicle_ids: $PropertyType<
                            $Call<ExtractArg, [$PropertyType<ResourcesType, 'getVehicles'>]>,
                            'vehicle_ids',
                        >,
                    },
                >,
                ...{|
                    vehicle_id: $ElementType<
                        $PropertyType<$Call<ExtractArg, [$PropertyType<ResourcesType, 'getVehicles'>]>, 'vehicle_ids'>,
                        0,
                    >,
                |},
            |},
            $ElementType<
                $Call<
                    ExtractPromisedReturnValue<[$Call<ExtractArg, [$PropertyType<ResourcesType, 'getVehicles'>]>]>,
                    $PropertyType<ResourcesType, 'getVehicles'>,
                >,
                0,
            >,
        >(
            /**
             * ===============================================================
             * Generated DataLoader: getVehicles
             * ===============================================================
             *
             * Resource Config:
             *
             * ```json
             * {
             *   "docsLink": "https://swapi.co/documentation#vehicles",
             *   "isBatchResource": true,
             *   "batchKey": "vehicle_ids",
             *   "newKey": "vehicle_id"
             * }
             * ```
             */
            async keys => {
                if (typeof resources.getVehicles !== 'function') {
                    return Promise.reject(
                        [
                            '[dataloader-codegen :: getVehicles] resources.getVehicles is not a function.',
                            'Did you pass in an instance of getVehicles to "getLoaders"?',
                        ].join(' '),
                    );
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
                 * ```js
                 * loaders.foo.load({ foo_id: 2, include_private_data: true });
                 * loaders.foo.load({ foo_id: 3, include_private_data: false });
                 * loaders.foo.load({ foo_id: 4, include_private_data: false });
                 * ```
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
                 * ```js
                 * foo({ foo_ids: [ 2 ], include_private_data: true });
                 * foo({ foo_ids: [ 3, 4 ], include_private_data: false });
                 * ```
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
                 * ```js
                 * partitionItems([
                 *   { bar_id: 7, include_extra_info: true },
                 *   { bar_id: 8, include_extra_info: false },
                 *   { bar_id: 9, include_extra_info: true },
                 * ], 'bar_id')
                 * ```
                 *
                 * Returns:
                 * `[ [ 0, 2 ], [ 1 ] ]`
                 *
                 * We'll refer to each element in the group as a "request ID".
                 */
                const requestGroups = partitionItems('vehicle_id', keys);

                // Map the request groups to a list of Promises - one for each request
                const groupedResults = await Promise.all(
                    requestGroups.map(async requestIDs => {
                        /**
                         * Select a set of elements in "keys", where all non-batch
                         * keys should be identical.
                         *
                         * We're going to smoosh all these together into one payload to
                         * send to the resource as a batch request!
                         */
                        const requests = requestIDs.map(id => keys[id]);

                        let resourceArgs = [
                            {
                                ..._.omit(requests[0], 'vehicle_id'),
                                ['vehicle_ids']: requests.map(k => k['vehicle_id']),
                            },
                        ];

                        if (options && options.resourceMiddleware && options.resourceMiddleware.before) {
                            resourceArgs = await options.resourceMiddleware.before(['getVehicles'], resourceArgs);
                        }

                        // Finally, call the resource!
                        let response = await resources.getVehicles(...resourceArgs);

                        if (options && options.resourceMiddleware && options.resourceMiddleware.after) {
                            response = await options.resourceMiddleware.after(['getVehicles'], response);
                        }

                        if (!(response instanceof Error)) {
                            if (!Array.isArray(response)) {
                                response = new Error(
                                    ['[dataloader-codegen :: getVehicles]', 'Expected response to be an array!'].join(
                                        ' ',
                                    ),
                                );
                            }
                        }

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
                                response = new Error(
                                    [
                                        `[dataloader-codegen :: getVehicles] Resource returned ${response.length} items, but we requested ${requests.length} items.`,
                                        'Add reorderResultsByKey to the config for this resource to be able to handle a partial response.',
                                    ].join(' '),
                                );
                            }
                        }

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
                                const reorderResultsByValue = null;

                                // Tell flow that "response" is actually an error object.
                                // (This is so we can pass it as 'cause' to CaughtResourceError)
                                invariant(response instanceof Error, 'expected response to be an error');

                                return new CaughtResourceError(
                                    `[dataloader-codegen :: getVehicles] Caught error during call to resource. Error: ${response.stack}`,
                                    response,
                                    reorderResultsByValue,
                                );
                            });
                        }

                        return response;
                    }),
                );

                // Split the results back up into the order that they were requested
                return unPartitionResults(requestGroups, groupedResults);
            },
            {
                ...cacheKeyOptions,
            },
        ),
        getRoot: new DataLoader<
            $Call<ExtractArg, [$PropertyType<ResourcesType, 'getRoot'>]>,
            $Call<
                ExtractPromisedReturnValue<[$Call<ExtractArg, [$PropertyType<ResourcesType, 'getRoot'>]>]>,
                $PropertyType<ResourcesType, 'getRoot'>,
            >,
        >(
            /**
             * ===============================================================
             * Generated DataLoader: getRoot
             * ===============================================================
             *
             * Resource Config:
             *
             * ```json
             * {
             *   "docsLink": "https://swapi.co/documentation#root",
             *   "isBatchResource": false
             * }
             * ```
             */
            async keys => {
                const response = await Promise.all(
                    keys.map(key => {
                        if (typeof resources.getRoot !== 'function') {
                            return Promise.reject(
                                [
                                    '[dataloader-codegen :: getRoot] resources.getRoot is not a function.',
                                    'Did you pass in an instance of getRoot to "getLoaders"?',
                                ].join(' '),
                            );
                        }

                        return resources.getRoot(key);
                    }),
                );

                return response;
            },
            {
                ...cacheKeyOptions,
            },
        ),
    });
}

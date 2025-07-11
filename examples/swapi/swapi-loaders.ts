/**
 * !!! THIS FILE IS AUTO-GENERATED. CHANGES MAY BE OVERWRITTEN !!!
 */

import util from "util";
import _ from "lodash";
import invariant from "assert";
import DataLoader from "dataloader";
import {
  BatchItemNotFoundError,
  cacheKeyOptions,
  CaughtResourceError,
  defaultErrorHandler,
  getBatchKeysForPartitionItems,
  partitionItems,
  resultsDictToList,
  sortByKeys,
  unPartitionResults,
  unPartitionResultsByBatchKeyPartition,
} from "dataloader-codegen/lib/runtimeHelpers";

/**
 * ===============================
 * BEGIN: printResourceTypeImports()
 * ===============================
 */
import type { SWAPIClientlibTypes } from "./swapi";

/**
 * ===============================
 * END: printResourceTypeImports()
 * ===============================
 */

type PromisedReturnType<F extends (...args: any) => Promise<any>> = F extends (
  ...args: any
) => Promise<infer R>
  ? R
  : never;

type Values<T> = T[keyof T];

export type DataLoaderCodegenOptions = {
  errorHandler?: (
    resourcePath: ReadonlyArray<string>,
    // We don't know what type the resource might throw, so we have to type error to "any" :(
    error: any,
  ) => Promise<Error>;
  resourceMiddleware?: {
    before?: <T>(
      resourcePath: ReadonlyArray<string>,
      resourceArgs: T,
    ) => Promise<T>;
    after?: <T>(resourcePath: ReadonlyArray<string>, response: T) => Promise<T>;
  };
};

type GetSetType<T> = T extends Set<infer U> ? U : never;

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

export type LoadersType = Readonly<{
  getPlanets: DataLoader<
    Omit<Parameters<ResourcesType["getPlanets"]>[0], "planet_ids"> & {
      planet_id: NonNullable<
        Parameters<ResourcesType["getPlanets"]>[0]["planet_ids"]
      >[0];
    },
    PromisedReturnType<ResourcesType["getPlanets"]>[0],
    // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
    string
  >;
  getPeople: DataLoader<
    Omit<Parameters<ResourcesType["getPeople"]>[0], "people_ids"> & {
      person_id: NonNullable<
        Parameters<ResourcesType["getPeople"]>[0]["people_ids"]
      >[0];
    },
    PromisedReturnType<ResourcesType["getPeople"]>[0],
    // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
    string
  >;
  getVehicles: DataLoader<
    Omit<Parameters<ResourcesType["getVehicles"]>[0], "vehicle_ids"> & {
      vehicle_id: NonNullable<
        Parameters<ResourcesType["getVehicles"]>[0]["vehicle_ids"]
      >[0];
    },
    PromisedReturnType<ResourcesType["getVehicles"]>[0],
    // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
    string
  >;
  getFilms: DataLoader<
    Omit<Parameters<ResourcesType["getFilms"]>[0], "film_ids"> & {
      film_id: GetSetType<Parameters<ResourcesType["getFilms"]>[0]["film_ids"]>;
    },
    PromisedReturnType<ResourcesType["getFilms"]>[0],
    // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
    string
  >;
  getFilmsV2: DataLoader<
    Omit<Parameters<ResourcesType["getFilmsV2"]>[0], "film_ids"> & {
      film_id: NonNullable<
        Parameters<ResourcesType["getFilmsV2"]>[0]["film_ids"]
      >[0];
    },
    PromisedReturnType<ResourcesType["getFilmsV2"]>["properties"][0],
    // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
    string
  >;
  getRoot: DataLoader<
    Parameters<ResourcesType["getRoot"]>[0],
    PromisedReturnType<ResourcesType["getRoot"]>,
    // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
    string
  >;
}>;

export default function getLoaders(
  resources: ResourcesType,
  options?: DataLoaderCodegenOptions,
): LoadersType {
  return Object.freeze({
    getPlanets: new DataLoader<
      Omit<Parameters<ResourcesType["getPlanets"]>[0], "planet_ids"> & {
        planet_id: NonNullable<
          Parameters<ResourcesType["getPlanets"]>[0]["planet_ids"]
        >[0];
      },
      PromisedReturnType<ResourcesType["getPlanets"]>[0],
      // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
      string
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
       *   "docsLink": "https://swapi.info/documentation#planets",
       *   "isBatchResource": true,
       *   "batchKey": "planet_ids",
       *   "newKey": "planet_id"
       * }
       * ```
       */
      async (keys) => {
        invariant(
          typeof resources.getPlanets === "function",
          [
            "[dataloader-codegen :: getPlanets] resources.getPlanets is not a function.",
            'Did you pass in an instance of getPlanets to "getLoaders"?',
          ].join(" "),
        );

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
         * partitionItems('bar_id', [
         *   { bar_id: 7, include_extra_info: true },
         *   { bar_id: 8, include_extra_info: false },
         *   { bar_id: 9, include_extra_info: true },
         * ])
         * ```
         *
         * Returns:
         * `[ [ 0, 2 ], [ 1 ] ]`
         *
         * We'll refer to each element in the group as a "request ID".
         */
        const requestGroups = partitionItems("planet_id", keys);

        // Map the request groups to a list of Promises - one for each request
        const groupedResults = await Promise.all(
          requestGroups.map(async (requestIDs) => {
            /**
             * Select a set of elements in "keys", where all non-batch
             * keys should be identical.
             *
             * We're going to smoosh all these together into one payload to
             * send to the resource as a batch request!
             */
            const requests = requestIDs.map((id) => keys[id]);

            // For now, we assume that the dataloader key should be the first argument to the resource
            // @see https://github.com/Yelp/dataloader-codegen/issues/56
            const resourceArg = {
              ..._.omit(requests[0], "planet_id"),
              ["planet_ids"]: requests.map((k) => k["planet_id"]),
            };

            // Any-type so this is re-assignable to the 'nestedPath' without TS complaining
            let response: any = await (async (_resourceArg) => {
              // Make a re-assignable variable so eslint doesn't complain
              let __resourceArgs = [_resourceArg] as const;

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.before
              ) {
                __resourceArgs = await options.resourceMiddleware.before(
                  ["getPlanets"],
                  __resourceArgs,
                );
              }

              let _response;
              try {
                // Finally, call the resource!
                _response = await resources.getPlanets(...__resourceArgs);
              } catch (error) {
                const errorHandler =
                  options && typeof options.errorHandler === "function"
                    ? options.errorHandler
                    : defaultErrorHandler;

                /**
                 * Apply some error handling to catch and handle all errors/rejected promises. errorHandler must return an Error object.
                 *
                 * If we let errors here go unhandled here, it will bubble up and DataLoader will return an error for all
                 * keys requested. We can do slightly better by returning the error object for just the keys in this batch request.
                 */
                _response = await errorHandler(["getPlanets"], error);

                // Check that errorHandler actually returned an Error object, and turn it into one if not.
                if (!(_response instanceof Error)) {
                  _response = new Error(
                    [
                      `[dataloader-codegen :: getPlanets] Caught an error, but errorHandler did not return an Error object.`,
                      `Instead, got ${typeof _response}: ${util.inspect(_response)}`,
                    ].join(" "),
                  );
                }
              }

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.after
              ) {
                _response = await options.resourceMiddleware.after(
                  ["getPlanets"],
                  _response,
                );
              }

              return _response;
            })(resourceArg);

            if (!(response instanceof Error)) {
            }

            if (!(response instanceof Error)) {
              if (!Array.isArray(response)) {
                response = new Error(
                  [
                    "[dataloader-codegen :: getPlanets]",
                    "Expected response to be an array!",
                  ].join(" "),
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
                response = new BatchItemNotFoundError(
                  [
                    `[dataloader-codegen :: getPlanets] Resource returned ${response.length} items, but we requested ${requests.length} items.`,
                    "Add reorderResultsByKey to the config for this resource to be able to handle a partial response.",
                  ].join(" "),
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
              response = requestIDs.map((requestId) => {
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

        return unPartitionResults(requestGroups, groupedResults);
      },
      {
        ...cacheKeyOptions,
      },
    ),
    getPeople: new DataLoader<
      Omit<Parameters<ResourcesType["getPeople"]>[0], "people_ids"> & {
        person_id: NonNullable<
          Parameters<ResourcesType["getPeople"]>[0]["people_ids"]
        >[0];
      },
      PromisedReturnType<ResourcesType["getPeople"]>[0],
      // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
      string
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
       *   "docsLink": "https://swapi.info/documentation#people",
       *   "isBatchResource": true,
       *   "batchKey": "people_ids",
       *   "newKey": "person_id"
       * }
       * ```
       */
      async (keys) => {
        invariant(
          typeof resources.getPeople === "function",
          [
            "[dataloader-codegen :: getPeople] resources.getPeople is not a function.",
            'Did you pass in an instance of getPeople to "getLoaders"?',
          ].join(" "),
        );

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
         * partitionItems('bar_id', [
         *   { bar_id: 7, include_extra_info: true },
         *   { bar_id: 8, include_extra_info: false },
         *   { bar_id: 9, include_extra_info: true },
         * ])
         * ```
         *
         * Returns:
         * `[ [ 0, 2 ], [ 1 ] ]`
         *
         * We'll refer to each element in the group as a "request ID".
         */
        const requestGroups = partitionItems("person_id", keys);

        // Map the request groups to a list of Promises - one for each request
        const groupedResults = await Promise.all(
          requestGroups.map(async (requestIDs) => {
            /**
             * Select a set of elements in "keys", where all non-batch
             * keys should be identical.
             *
             * We're going to smoosh all these together into one payload to
             * send to the resource as a batch request!
             */
            const requests = requestIDs.map((id) => keys[id]);

            // For now, we assume that the dataloader key should be the first argument to the resource
            // @see https://github.com/Yelp/dataloader-codegen/issues/56
            const resourceArg = {
              ..._.omit(requests[0], "person_id"),
              ["people_ids"]: requests.map((k) => k["person_id"]),
            };

            // Any-type so this is re-assignable to the 'nestedPath' without TS complaining
            let response: any = await (async (_resourceArg) => {
              // Make a re-assignable variable so eslint doesn't complain
              let __resourceArgs = [_resourceArg] as const;

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.before
              ) {
                __resourceArgs = await options.resourceMiddleware.before(
                  ["getPeople"],
                  __resourceArgs,
                );
              }

              let _response;
              try {
                // Finally, call the resource!
                _response = await resources.getPeople(...__resourceArgs);
              } catch (error) {
                const errorHandler =
                  options && typeof options.errorHandler === "function"
                    ? options.errorHandler
                    : defaultErrorHandler;

                /**
                 * Apply some error handling to catch and handle all errors/rejected promises. errorHandler must return an Error object.
                 *
                 * If we let errors here go unhandled here, it will bubble up and DataLoader will return an error for all
                 * keys requested. We can do slightly better by returning the error object for just the keys in this batch request.
                 */
                _response = await errorHandler(["getPeople"], error);

                // Check that errorHandler actually returned an Error object, and turn it into one if not.
                if (!(_response instanceof Error)) {
                  _response = new Error(
                    [
                      `[dataloader-codegen :: getPeople] Caught an error, but errorHandler did not return an Error object.`,
                      `Instead, got ${typeof _response}: ${util.inspect(_response)}`,
                    ].join(" "),
                  );
                }
              }

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.after
              ) {
                _response = await options.resourceMiddleware.after(
                  ["getPeople"],
                  _response,
                );
              }

              return _response;
            })(resourceArg);

            if (!(response instanceof Error)) {
            }

            if (!(response instanceof Error)) {
              if (!Array.isArray(response)) {
                response = new Error(
                  [
                    "[dataloader-codegen :: getPeople]",
                    "Expected response to be an array!",
                  ].join(" "),
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
                response = new BatchItemNotFoundError(
                  [
                    `[dataloader-codegen :: getPeople] Resource returned ${response.length} items, but we requested ${requests.length} items.`,
                    "Add reorderResultsByKey to the config for this resource to be able to handle a partial response.",
                  ].join(" "),
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
              response = requestIDs.map((requestId) => {
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

        return unPartitionResults(requestGroups, groupedResults);
      },
      {
        ...cacheKeyOptions,
      },
    ),
    getVehicles: new DataLoader<
      Omit<Parameters<ResourcesType["getVehicles"]>[0], "vehicle_ids"> & {
        vehicle_id: NonNullable<
          Parameters<ResourcesType["getVehicles"]>[0]["vehicle_ids"]
        >[0];
      },
      PromisedReturnType<ResourcesType["getVehicles"]>[0],
      // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
      string
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
       *   "docsLink": "https://swapi.info/documentation#vehicles",
       *   "isBatchResource": true,
       *   "batchKey": "vehicle_ids",
       *   "newKey": "vehicle_id"
       * }
       * ```
       */
      async (keys) => {
        invariant(
          typeof resources.getVehicles === "function",
          [
            "[dataloader-codegen :: getVehicles] resources.getVehicles is not a function.",
            'Did you pass in an instance of getVehicles to "getLoaders"?',
          ].join(" "),
        );

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
         * partitionItems('bar_id', [
         *   { bar_id: 7, include_extra_info: true },
         *   { bar_id: 8, include_extra_info: false },
         *   { bar_id: 9, include_extra_info: true },
         * ])
         * ```
         *
         * Returns:
         * `[ [ 0, 2 ], [ 1 ] ]`
         *
         * We'll refer to each element in the group as a "request ID".
         */
        const requestGroups = partitionItems("vehicle_id", keys);

        // Map the request groups to a list of Promises - one for each request
        const groupedResults = await Promise.all(
          requestGroups.map(async (requestIDs) => {
            /**
             * Select a set of elements in "keys", where all non-batch
             * keys should be identical.
             *
             * We're going to smoosh all these together into one payload to
             * send to the resource as a batch request!
             */
            const requests = requestIDs.map((id) => keys[id]);

            // For now, we assume that the dataloader key should be the first argument to the resource
            // @see https://github.com/Yelp/dataloader-codegen/issues/56
            const resourceArg = {
              ..._.omit(requests[0], "vehicle_id"),
              ["vehicle_ids"]: requests.map((k) => k["vehicle_id"]),
            };

            // Any-type so this is re-assignable to the 'nestedPath' without TS complaining
            let response: any = await (async (_resourceArg) => {
              // Make a re-assignable variable so eslint doesn't complain
              let __resourceArgs = [_resourceArg] as const;

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.before
              ) {
                __resourceArgs = await options.resourceMiddleware.before(
                  ["getVehicles"],
                  __resourceArgs,
                );
              }

              let _response;
              try {
                // Finally, call the resource!
                _response = await resources.getVehicles(...__resourceArgs);
              } catch (error) {
                const errorHandler =
                  options && typeof options.errorHandler === "function"
                    ? options.errorHandler
                    : defaultErrorHandler;

                /**
                 * Apply some error handling to catch and handle all errors/rejected promises. errorHandler must return an Error object.
                 *
                 * If we let errors here go unhandled here, it will bubble up and DataLoader will return an error for all
                 * keys requested. We can do slightly better by returning the error object for just the keys in this batch request.
                 */
                _response = await errorHandler(["getVehicles"], error);

                // Check that errorHandler actually returned an Error object, and turn it into one if not.
                if (!(_response instanceof Error)) {
                  _response = new Error(
                    [
                      `[dataloader-codegen :: getVehicles] Caught an error, but errorHandler did not return an Error object.`,
                      `Instead, got ${typeof _response}: ${util.inspect(_response)}`,
                    ].join(" "),
                  );
                }
              }

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.after
              ) {
                _response = await options.resourceMiddleware.after(
                  ["getVehicles"],
                  _response,
                );
              }

              return _response;
            })(resourceArg);

            if (!(response instanceof Error)) {
            }

            if (!(response instanceof Error)) {
              if (!Array.isArray(response)) {
                response = new Error(
                  [
                    "[dataloader-codegen :: getVehicles]",
                    "Expected response to be an array!",
                  ].join(" "),
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
                response = new BatchItemNotFoundError(
                  [
                    `[dataloader-codegen :: getVehicles] Resource returned ${response.length} items, but we requested ${requests.length} items.`,
                    "Add reorderResultsByKey to the config for this resource to be able to handle a partial response.",
                  ].join(" "),
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
              response = requestIDs.map((requestId) => {
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

        return unPartitionResults(requestGroups, groupedResults);
      },
      {
        ...cacheKeyOptions,
      },
    ),
    getFilms: new DataLoader<
      Omit<Parameters<ResourcesType["getFilms"]>[0], "film_ids"> & {
        film_id: GetSetType<
          Parameters<ResourcesType["getFilms"]>[0]["film_ids"]
        >;
      },
      PromisedReturnType<ResourcesType["getFilms"]>[0],
      // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
      string
    >(
      /**
       * ===============================================================
       * Generated DataLoader: getFilms
       * ===============================================================
       *
       * Resource Config:
       *
       * ```json
       * {
       *   "docsLink": "https://swapi.info/documentation#films",
       *   "isBatchResource": true,
       *   "batchKey": "film_ids",
       *   "newKey": "film_id",
       *   "isBatchKeyASet": true
       * }
       * ```
       */
      async (keys) => {
        invariant(
          typeof resources.getFilms === "function",
          [
            "[dataloader-codegen :: getFilms] resources.getFilms is not a function.",
            'Did you pass in an instance of getFilms to "getLoaders"?',
          ].join(" "),
        );

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
         * partitionItems('bar_id', [
         *   { bar_id: 7, include_extra_info: true },
         *   { bar_id: 8, include_extra_info: false },
         *   { bar_id: 9, include_extra_info: true },
         * ])
         * ```
         *
         * Returns:
         * `[ [ 0, 2 ], [ 1 ] ]`
         *
         * We'll refer to each element in the group as a "request ID".
         */
        const requestGroups = partitionItems("film_id", keys);

        // Map the request groups to a list of Promises - one for each request
        const groupedResults = await Promise.all(
          requestGroups.map(async (requestIDs) => {
            /**
             * Select a set of elements in "keys", where all non-batch
             * keys should be identical.
             *
             * We're going to smoosh all these together into one payload to
             * send to the resource as a batch request!
             */
            const requests = requestIDs.map((id) => keys[id]);

            // For now, we assume that the dataloader key should be the first argument to the resource
            // @see https://github.com/Yelp/dataloader-codegen/issues/56
            const resourceArg = {
              ..._.omit(requests[0], "film_id"),
              ["film_ids"]: new Set(requests.map((k) => k["film_id"])),
            };

            // Any-type so this is re-assignable to the 'nestedPath' without TS complaining
            let response: any = await (async (_resourceArg) => {
              // Make a re-assignable variable so eslint doesn't complain
              let __resourceArgs = [_resourceArg] as const;

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.before
              ) {
                __resourceArgs = await options.resourceMiddleware.before(
                  ["getFilms"],
                  __resourceArgs,
                );
              }

              let _response;
              try {
                // Finally, call the resource!
                _response = await resources.getFilms(...__resourceArgs);
              } catch (error) {
                const errorHandler =
                  options && typeof options.errorHandler === "function"
                    ? options.errorHandler
                    : defaultErrorHandler;

                /**
                 * Apply some error handling to catch and handle all errors/rejected promises. errorHandler must return an Error object.
                 *
                 * If we let errors here go unhandled here, it will bubble up and DataLoader will return an error for all
                 * keys requested. We can do slightly better by returning the error object for just the keys in this batch request.
                 */
                _response = await errorHandler(["getFilms"], error);

                // Check that errorHandler actually returned an Error object, and turn it into one if not.
                if (!(_response instanceof Error)) {
                  _response = new Error(
                    [
                      `[dataloader-codegen :: getFilms] Caught an error, but errorHandler did not return an Error object.`,
                      `Instead, got ${typeof _response}: ${util.inspect(_response)}`,
                    ].join(" "),
                  );
                }
              }

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.after
              ) {
                _response = await options.resourceMiddleware.after(
                  ["getFilms"],
                  _response,
                );
              }

              return _response;
            })(resourceArg);

            if (!(response instanceof Error)) {
            }

            if (!(response instanceof Error)) {
              if (!Array.isArray(response)) {
                response = new Error(
                  [
                    "[dataloader-codegen :: getFilms]",
                    "Expected response to be an array!",
                  ].join(" "),
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
                response = new BatchItemNotFoundError(
                  [
                    `[dataloader-codegen :: getFilms] Resource returned ${response.length} items, but we requested ${requests.length} items.`,
                    "Add reorderResultsByKey to the config for this resource to be able to handle a partial response.",
                  ].join(" "),
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
              response = requestIDs.map((requestId) => {
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

                return new CaughtResourceError(
                  `[dataloader-codegen :: getFilms] Caught error during call to resource. Error: ${response.stack}`,
                  response,
                  reorderResultsByValue,
                );
              });
            }

            return response;
          }),
        );

        return unPartitionResults(requestGroups, groupedResults);
      },
      {
        ...cacheKeyOptions,
      },
    ),
    getFilmsV2: new DataLoader<
      Omit<Parameters<ResourcesType["getFilmsV2"]>[0], "film_ids"> & {
        film_id: NonNullable<
          Parameters<ResourcesType["getFilmsV2"]>[0]["film_ids"]
        >[0];
      },
      PromisedReturnType<ResourcesType["getFilmsV2"]>["properties"][0],
      // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
      string
    >(
      /**
       * ===============================================================
       * Generated DataLoader: getFilmsV2
       * ===============================================================
       *
       * Resource Config:
       *
       * ```json
       * {
       *   "docsLink": "https://swapi.info/documentation#films",
       *   "isBatchResource": true,
       *   "batchKey": "film_ids",
       *   "newKey": "film_id",
       *   "nestedPath": "properties",
       *   "propertyBatchKey": "properties",
       *   "responseKey": "id"
       * }
       * ```
       */
      async (keys) => {
        invariant(
          typeof resources.getFilmsV2 === "function",
          [
            "[dataloader-codegen :: getFilmsV2] resources.getFilmsV2 is not a function.",
            'Did you pass in an instance of getFilmsV2 to "getLoaders"?',
          ].join(" "),
        );

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
         * ```js
         * partitionItems(['bar_id', 'properties'], [
         *   { bar_id: 7, properties: ['property_1'], include_extra_info: true },
         *   { bar_id: 8, properties: ['property_2'], include_extra_info: false },
         *   { bar_id: 9, properties: ['property_3'], include_extra_info: true },
         * ])
         * ```
         *
         * Returns:
         * `[ [ 0, 2 ], [ 1 ] ]`
         *
         * We'll refer to each element in the group as a "request ID".
         */
        const requestGroups = partitionItems(["film_id", "properties"], keys);

        // Map the request groups to a list of Promises - one for each request
        const groupedResults = await Promise.all(
          requestGroups.map(async (requestIDs) => {
            /**
             * Select a set of elements in "keys", where all non-batch
             * keys should be identical.
             *
             * We're going to smoosh all these together into one payload to
             * send to the resource as a batch request!
             */
            const requests = requestIDs.map((id) => keys[id]);

            // For now, we assume that the dataloader key should be the first argument to the resource
            // @see https://github.com/Yelp/dataloader-codegen/issues/56
            const resourceArg = {
              ..._.omit(requests[0], "film_id"),
              ["film_ids"]: requests.map((k) => k["film_id"]),
            };

            // Any-type so this is re-assignable to the 'nestedPath' without TS complaining
            let response: any = await (async (_resourceArg) => {
              // Make a re-assignable variable so eslint doesn't complain
              let __resourceArgs = [_resourceArg] as const;

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.before
              ) {
                __resourceArgs = await options.resourceMiddleware.before(
                  ["getFilmsV2"],
                  __resourceArgs,
                );
              }

              let _response;
              try {
                // Finally, call the resource!
                _response = await resources.getFilmsV2(...__resourceArgs);
              } catch (error) {
                const errorHandler =
                  options && typeof options.errorHandler === "function"
                    ? options.errorHandler
                    : defaultErrorHandler;

                /**
                 * Apply some error handling to catch and handle all errors/rejected promises. errorHandler must return an Error object.
                 *
                 * If we let errors here go unhandled here, it will bubble up and DataLoader will return an error for all
                 * keys requested. We can do slightly better by returning the error object for just the keys in this batch request.
                 */
                _response = await errorHandler(["getFilmsV2"], error);

                // Check that errorHandler actually returned an Error object, and turn it into one if not.
                if (!(_response instanceof Error)) {
                  _response = new Error(
                    [
                      `[dataloader-codegen :: getFilmsV2] Caught an error, but errorHandler did not return an Error object.`,
                      `Instead, got ${typeof _response}: ${util.inspect(_response)}`,
                    ].join(" "),
                  );
                }
              }

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.after
              ) {
                _response = await options.resourceMiddleware.after(
                  ["getFilmsV2"],
                  _response,
                );
              }

              return _response;
            })(resourceArg);

            if (!(response instanceof Error)) {
              /**
               * Un-nest the actual data from the resource return value.
               *
               * e.g.
               * ```js
               * {
               *   foos: [
               *     { id: 1, value: 'hello' },
               *     { id: 2, value: 'world' },
               *   ]
               * }
               * ```
               *
               * Becomes
               *
               * ```js
               * [
               *   { id: 1, value: 'hello' },
               *   { id: 2, value: 'world' },
               * ]
               * ```
               */
              response = _.get(
                response,
                "properties",
                new Error(
                  [
                    "[dataloader-codegen :: getFilmsV2]",
                    "Tried to un-nest the response from the resource, but",
                    ".get(response, 'properties')",
                    "was empty!",
                  ].join(" "),
                ),
              );
            }

            if (!(response instanceof Error)) {
              if (!Array.isArray(response)) {
                response = new Error(
                  [
                    "[dataloader-codegen :: getFilmsV2]",
                    "Expected response to be an array!",
                  ].join(" "),
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
              response = requestIDs.map((requestId) => {
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

                return new CaughtResourceError(
                  `[dataloader-codegen :: getFilmsV2] Caught error during call to resource. Error: ${response.stack}`,
                  response,
                  reorderResultsByValue,
                );
              });
            }

            return response;
          }),
        );

        /**
         *  The resource might contain less number of items that we requested.
         *  We need the value of batchKey and propertyBatchKey in requests group to help us split the results
         *  back up into the order that they were requested.
         */
        const batchKeyPartition = getBatchKeysForPartitionItems(
          "film_id",
          ["film_id", "properties"],
          keys,
        );
        const propertyBatchKeyPartiion = getBatchKeysForPartitionItems(
          "properties",
          ["film_id", "properties"],
          keys,
        );
        return unPartitionResultsByBatchKeyPartition(
          "film_id",
          "properties",
          "id",
          batchKeyPartition,
          propertyBatchKeyPartiion,
          requestGroups,
          groupedResults,
        );
      },
      {
        ...cacheKeyOptions,
      },
    ),
    getRoot: new DataLoader<
      Parameters<ResourcesType["getRoot"]>[0],
      PromisedReturnType<ResourcesType["getRoot"]>,
      // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
      string
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
       *   "docsLink": "https://swapi.info/documentation#root",
       *   "isBatchResource": false
       * }
       * ```
       */
      async (keys) => {
        const responses = await Promise.all(
          keys.map(async (key) => {
            invariant(
              typeof resources.getRoot === "function",
              [
                "[dataloader-codegen :: getRoot] resources.getRoot is not a function.",
                'Did you pass in an instance of getRoot to "getLoaders"?',
              ].join(" "),
            );

            // For now, we assume that the dataloader key should be the first argument to the resource
            // @see https://github.com/Yelp/dataloader-codegen/issues/56
            const resourceArg = key;

            return await (async (_resourceArg) => {
              // Make a re-assignable variable so eslint doesn't complain
              let __resourceArgs = [_resourceArg] as const;

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.before
              ) {
                __resourceArgs = await options.resourceMiddleware.before(
                  ["getRoot"],
                  __resourceArgs,
                );
              }

              let _response;
              try {
                // Finally, call the resource!
                _response = await resources.getRoot(...__resourceArgs);
              } catch (error) {
                const errorHandler =
                  options && typeof options.errorHandler === "function"
                    ? options.errorHandler
                    : defaultErrorHandler;

                /**
                 * Apply some error handling to catch and handle all errors/rejected promises. errorHandler must return an Error object.
                 *
                 * If we let errors here go unhandled here, it will bubble up and DataLoader will return an error for all
                 * keys requested. We can do slightly better by returning the error object for just the keys in this batch request.
                 */
                _response = await errorHandler(["getRoot"], error);

                // Check that errorHandler actually returned an Error object, and turn it into one if not.
                if (!(_response instanceof Error)) {
                  _response = new Error(
                    [
                      `[dataloader-codegen :: getRoot] Caught an error, but errorHandler did not return an Error object.`,
                      `Instead, got ${typeof _response}: ${util.inspect(_response)}`,
                    ].join(" "),
                  );
                }
              }

              if (
                options &&
                options.resourceMiddleware &&
                options.resourceMiddleware.after
              ) {
                _response = await options.resourceMiddleware.after(
                  ["getRoot"],
                  _response,
                );
              }

              return _response;
            })(resourceArg);
          }),
        );

        return responses;
      },
      {
        ...cacheKeyOptions,
      },
    ),
  });
}

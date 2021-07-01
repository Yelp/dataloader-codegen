# dataloader-codegen API Documentation

This is the full documentation for the options you can pass to dataloader-codegen.

## Command Line Interface

```bash
$ dataloader-codegen --config string --output string
```

See `$ dataloader-codegen --help` for all available options.

## Generated `getLoaders` function

The output file that dataloader-codegen generates exports a default `getLoaders` function.

You probably want to call `getLoaders` per network request, and attatch the loaders to the context object for the resolvers to access.

### API

```js
getLoaders(resources[, options])
```

### `getLoaders` arguments

-   **`resources`**

    An object containing _resources_. A resource is typically a wrapper around a fetch statement if you're already using [swagger codegen](https://github.com/OpenAPITools/openapi-generator) or something similar, but these can be any function that returns data.

    You must describe the shape and behaviour of the resources you want to use the config file (documented below).

-   **`options`**

    (Optional) Object containing options to augment the runtime behaviour of the loaders.

    See the type definition here: https://github.com/Yelp/dataloader-codegen/blob/6ce10/src/codegen.ts#L85-L90

    -   **`errorHandler`**

        (Optional) Provide a function to wrap the underlying resource call. Useful if you want to handle 'expected' errors or rejected promises from the resource function (e.g. 4xxs, 5xxs) before handing over to the resolver method.

        Must return an Error object.

        **Interface:**

        ```js
        (resourcePath: $ReadOnlyArray<string>, error: any): Promise<Error>,
        ```

    -   **`resourceMiddleware`**

        (Optional) Object containing functions to run before and after the resource runs.

        -   **`before`**

            (Optional) Takes in the arguments about to be passed to the resource. This is a good place to log
            calls to resources / transform the request.

            **Interface**:

            ```js
            (resourcePath: $ReadOnlyArray<string>, resourceArgs: T): Promise<T>
            ```

        -   **`after`**

            (Optional) Takes in the response from the resource. Returns a modified response.

            **Interface**:

            ```js
            (resourcePath: $ReadOnlyArray<string>, response: T): Promise<T>
            ```

### Example

To see an example call to `getLoaders`, [check out the SWAPI example](./examples/swapi/swapi-server.js) or [the tests](./__tests__/implementation.test.js).

## Config File

The config file should be a [YAML](https://yaml.org/) file in the following format:

```yaml
resources:
    string:
        [...string:]
            isBatchResource: boolean
            docsLink: string
            batchKey: string                  (can only use if isBatchResource=true)
            newKey: string                    (can only use if isBatchResource=true)
            reorderResultsKey: ?string        (can only use if isBatchResource=true)
            nestedPath: ?string               (can only use if isBatchResource=true)
            commaSeparatedBatchKey: ?string   (can only use if isBatchResource=true)
            isResponseDictionary: ?boolean    (can only use if isBatchResource=true)
            isBatchKeyASet: ?boolean          (can only use if isBatchResource=true)
            propertyBatchKey: ?string         (can only use if isBatchResource=true)

typings:
    language: flow
    embedResourcesType:
        imports: string
        ResourcesType: string
```

### Example

To see an example config, [check out the SWAPI example](./examples/swapi/swapi.dataloader-config.yaml).

### `resources`

Describes the shape and behaviour of the resources object you will pass to `getLoaders`. Supports an arbitrary level of nesting.

**Note:** You only need to specify the resources that you want to generate loaders for - you don't need to describe _everything_ that's in the resources object if you only need a subset.

#### `resources` Parameters

| Key                      | Value Description                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isBatchResource`        | Is this a batch resource? (Can you pass it a list of keys and get a list of results back?)                                                                                                                                                               |
| `docsLink`               | The URL for the documentation of the resource. Useful for others to verify information is correct, and may be used in stack traces.                                                                                                                      |
| `batchKey`               | The argument to the resource that represents the list of entities we want to fetch. (e.g. 'user_ids')                                                                                                                                                    |
| `newKey`                 | The argument we'll replace the batchKey with - should be a singular version of the `batchKey` (e.g. 'user_id')                                                                                                                                           |
| `reorderResultsByKey`    | (Optional) If the resource itself does not guarantee ordering, use this to specify which key in the response objects corresponds to an element in `batchKey`. Transforms and re-order the response to the same order as requested from the DataLoaders.  |
| `nestedPath`             | (Optional) If the resource returns the list of results in a nested path (e.g. `{ results: [ 1, 2, 3 ] }`), this tells the DataLoader where in the response to find the results. (e.g. 'results').                                                        |
| `commaSeparatedBatchKey` | (Optional) Set to true if the interface of the resource takes the batch key as a comma separated list (rather than an array of IDs, as is more common). Default: false                                                                                   |
| `isResponseDictionary`   | (Optional) Set to true if the batch resource returns the results as a dictionary with key mapped to values (instead of a list of items). If this option is supplied `reorderResultsByKey` should not be. Default: false                                  |
| `isBatchKeyASet`         | (Optional) Set to true if the interface of the resource takes the batch key as a set (rather than an array). For example, when using a generated clientlib based on swagger where `uniqueItems: true` is set for the batchKey parameter. Default: false. |
| `propertyBatchKey`       | (Optional) The argument to the resource that represents the nested list of optional properties we want to fetch. (e.g. usually 'properties' or 'features').                                                                                              |

### `typings`

Use this to generate type definitions for the generated DataLoaders. At this time, we only support Flow. (Please open an issue if you're interested in helping us support TypeScript!)

#### `typings` Parameters

| Key                                | Value Description                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `language`                         | Must be 'flow' until we support other options.                                                                                                 |
| `embedResourcesType.imports`       | Lets you inject an arbitrary import statement into the generated file, to help you write the type statement below.                             |
| `embedResourcesType.ResourcesType` | Inject code to describe the shape of the resources object you're going to pass into `getLoaders`. Should start with `type ResourcesType = ...` |
|                                    |

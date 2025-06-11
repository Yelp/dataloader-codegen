import _ from 'lodash';
import { GlobalConfig, ResourceConfig } from './config';

/**
 * Get the reference to the type representing the resource function this resource
 */
export function getResourceTypeReference(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>) {
    return `ResourcesType${resourcePath.map((segment) => `['${segment}']`).join('')}`;
}

function getResourceArg(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>) {
    // TODO: We assume that the resource accepts a single dict argument. Let's
    // make thie configurable to handle resources that use seperate arguments.
    return `Parameters<${getResourceTypeReference(resourceConfig, resourcePath)}>[0]`;
}

/**
 * Extract the type T from a Set<T> resource (in this case a batchKey's resource)
 * using its `.has(T)`'s function paremeter type
 */
export function getNewKeyTypeFromBatchKeySetType(batchKey: string, resourceArgs: string) {
    return `Parameters<${resourceArgs}['${batchKey}']['has']>[0]`;
}

export function getLoaderTypeKey(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>) {
    // TODO: We assume that the resource accepts a single dict argument. Let's
    // make this configurable to handle resources that use seperate arguments.
    const resourceArgs = getResourceArg(resourceConfig, resourcePath);

    if (resourceConfig.isBatchResource) {
        // Extract newKeyType from the batch key's Array's type
        // We add NonNullable before batch key element type to force the batch key to be required, regardless if the OpenAPI spec specifies it as being optional
        let newKeyType = `${resourceConfig.newKey}: NonNullable<${resourceArgs}['${resourceConfig.batchKey}']>[0]`;

        if (resourceConfig.isBatchKeyASet) {
            /**
             * New key's type has to be extracted differently if the batch key's resource
             * expects them in the form of a Set
             */
            newKeyType = `${resourceConfig.newKey}: ${getNewKeyTypeFromBatchKeySetType(
                resourceConfig.batchKey,
                resourceArgs,
            )}`;
        }

        return `Omit<${resourceArgs}, '${resourceConfig.batchKey}'> & { ${newKeyType} }`;
    }

    return resourceArgs;
}

export function getLoaderTypeVal(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>) {
    let retVal = `PromisedReturnType<${getResourceTypeReference(resourceConfig, resourcePath)}>`;

    if (resourceConfig.isBatchResource) {
        /**
         * If the response is nested in some path, unwrap it.
         *
         * Example:
         * ```js
         * {
         *   businesses: [
         *     { id: 1, name: 'foo' },
         *     { id: 2, name: 'bar' }
         *   ]
         * }
         * ```
         *
         * Becomes:
         * ```js
         * [
         *   { id: 1, name: 'foo' },
         *   { id: 2, name: 'bar' }
         * ]
         * ```
         */
        if (resourceConfig.nestedPath) {
            retVal = `${retVal}['${resourceConfig.nestedPath}']`;
        }
        retVal = resourceConfig.isResponseDictionary ? `Values<${retVal}>` : `${retVal}[0]`;
    }

    return retVal;
}

export function getLoaderType(resourceConfig: ResourceConfig, resourcePath: ReadonlyArray<string>) {
    const key = getLoaderTypeKey(resourceConfig, resourcePath);
    const val = getLoaderTypeVal(resourceConfig, resourcePath);

    return `DataLoader<
        ${key},
        ${val},
        // This third argument is the cache key type. Since we use objectHash in cacheKeyOptions, this is "string".
        string,
    >`;
}

export function getLoadersTypeMap(
    config: object,
    paths: ReadonlyArray<ReadonlyArray<string>>,
    current: ReadonlyArray<string>,
) {
    if (_.isEqual(paths, [[]])) {
        return getLoaderType(_.get(config, current.join('.')), current);
    }

    const nextValues = _.uniq(paths.map((p) => p[0]));

    const objectProperties: ReadonlyArray<string> = nextValues.map(
        (nextVal: any) =>
            `${nextVal}: ${getLoadersTypeMap(
                config,
                paths.filter((p) => p[0] === nextVal).map((p) => p.slice(1)),
                [...current, nextVal],
            )},`,
    );

    return `Readonly<{
        ${objectProperties.join('\n')}
    }>`;
}

export function getResourceTypings(
    config: GlobalConfig,
): { printResourceTypeImports: () => string; printResourcesType: () => string } {
    if (
        config.typings &&
        config.typings.embedResourcesType &&
        config.typings.embedResourcesType.imports &&
        config.typings.embedResourcesType.ResourcesType
    ) {
        return {
            printResourceTypeImports: () => config.typings.embedResourcesType.imports,
            printResourcesType: () => config.typings.embedResourcesType.ResourcesType,
        };
    }

    return {
        printResourceTypeImports: () => '',
        printResourcesType: () => '',
    };
}

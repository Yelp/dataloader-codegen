import _ from 'lodash';
import prettier from 'prettier';
import { GlobalConfig, getResourcePaths } from './config';
import { getLoaderType, getLoadersTypeMap, getResourceTypings } from './genTypeFlow';
import getLoaderImplementation from './implementation';

function getLoaders(config: object, paths: Array<Array<string>>, current: Array<string>) {
    if (_.isEqual(paths, [[]])) {
        return getLoaderImplementation(_.get(config, current.join('.')), current);
    }

    const nextValues = _.uniq(paths.map(p => p[0]));

    const objectProperties: Array<string> = nextValues.map(
        nextVal =>
            `${nextVal}: ${getLoaders(
                config,
                paths.filter(p => p[0] === nextVal).map(p => p.slice(1)),
                [...current, nextVal],
            )},`,
    );

    return `Object.freeze({
        ${objectProperties.join('\n')}
    })`;
}

export default function codegen(
    /**
     * The user specified config object, defining the shape and behaviour of
     * the resources. May be arbitrarily nested, hence the 'any' type.
     * (Read from dataloader-config.yaml)
     */
    config: GlobalConfig,
    /**
     * Path to the helpers referenced in the generated dataloaders.
     * (Swapped out at test time to refer to the local version of the file)
     */
    /* istanbul ignore next */
    runtimeHelpers: string = 'dataloader-codegen/lib/runtimeHelpers',
) {
    const types = getResourcePaths(config.resources)
        .map(resourcePath => getLoaderType(_.get(config.resources, resourcePath.join('.')), resourcePath))
        .join('\n');

    const { printResourceTypeImports, printResourcesType } = getResourceTypings(config);

    const output = `
        // @flow strict-local

        /**
         * !!! THIS FILE IS AUTO-GENERATED. CHANGES MAY BE OVERWRITTEN !!!
         */

        import util from 'util';
        import _ from 'lodash';
        import invariant from 'assert';
        import DataLoader from 'dataloader';
        import {
            BatchItemNotFoundError,
            cacheKeyOptions,
            CaughtResourceError,
            defaultErrorHandler,
            partitionItems,
            resultsDictToList,
            sortByKeys,
            unPartitionResults,
        } from '${runtimeHelpers}';


        /**
         * ===============================
         * BEGIN: printResourceTypeImports()
         * ===============================
         */
        ${printResourceTypeImports()}
        /**
         * ===============================
         * END: printResourceTypeImports()
         * ===============================
         */

        // https://github.com/facebook/flow/issues/7709#issuecomment-530501257
        type ExtractArg = <Arg, Ret>([Arg => Ret]) => Arg;
        type ExtractPromisedReturnValue<A> = <R>((...A) => Promise<R>) => R;

        export type DataLoaderCodegenOptions = {|
            errorHandler?: (resourcePath: $ReadOnlyArray<string>, error: any) => Promise<Error>,
            resourceMiddleware?: {|
                before?: <T>(resourcePath: $ReadOnlyArray<string>, resourceArgs: T) => Promise<T>,
                after?: <T>(resourcePath: $ReadOnlyArray<string>, response: T) => Promise<T>,
            |};
        |};

        /**
         * ===============================
         * BEGIN: printResourcesType()
         * ===============================
         */
        ${printResourcesType()}
        /**
         * ===============================
         * END: printResourcesType()
         * ===============================
         */

        export type LoadersType = ${getLoadersTypeMap(config.resources, getResourcePaths(config.resources), [])};

        export default function getLoaders(resources: ResourcesType, options?: DataLoaderCodegenOptions): LoadersType {
            return ${getLoaders(config.resources, getResourcePaths(config.resources), [])};
        }
    `;

    return prettier.format(output, { parser: 'babel' });
}

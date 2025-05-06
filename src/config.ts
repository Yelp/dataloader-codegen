import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';

export interface GlobalConfig {
    typings: {
        language: 'flow';
        embedResourcesType: {
            imports: string;
            ResourcesType: string;
        };
    };
    // `resources` could be some arbitrarily deeply nested BatchResourceConfig
    // TODO: tighten this up somehow
    resources: any;
}

export interface BatchResourceConfig {
    isBatchResource: true;
    batchKey: string;
    newKey: string;
    reorderResultsByKey?: string;
    nestedPath?: string;
    commaSeparatedBatchKey?: boolean;
    // TODO: Assert somehow/somewhere that both isResponseDictionary and reorderResultsByKey aren't set
    isResponseDictionary?: boolean;
    isBatchKeyASet?: boolean;
    propertyBatchKey?: string;
    responseKey?: string;
    maxBatchSize?: number;
}

export interface NonBatchResourceConfig {
    isBatchResource: false;
}

export type ResourceConfig = BatchResourceConfig | NonBatchResourceConfig;

const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true });

/**
 * Ensure the config file the user specifies meets our specification. Bail out of the app if not!
 */
function assertConfigValidity(config: string, processExit = process.exit) {
    const validate = ajv.compile(SCHEMA);
    const valid = validate(config);

    if (!valid) {
        console.error('Could not codegen dataloaders! Schema is invalid:');
        console.error(JSON.stringify(validate.errors, null, 2));
        processExit(1);
    }
}

/**
 * Returns the user specified config for dataloader-codegen
 */
export function getConfig(
    /**
     * Path to the config file. Might be undefined if the user did not specify
     * (in which case we should look for 'dataloader-codegen.config.yaml' in the
     * project root)
     */
    configFilePath: string | null | undefined,
): GlobalConfig {
    if (configFilePath == null) {
        configFilePath = path.join(process.cwd(), 'dataloader-config.yaml');
    }

    if (!fs.existsSync(configFilePath)) {
        throw new Error(`Could not find config file at: ${configFilePath}`);
    }

    const fileContents = fs.readFileSync(configFilePath, 'utf8');
    const config = yaml.safeLoad(fileContents);

    assertConfigValidity(config);

    return config;
}

export function getResourcePaths(resources: any): Array<Array<string>> {
    const resourcePaths: Array<Array<string>> = [];

    function visitObject(obj: object, path: Array<string>) {
        Object.entries(obj).forEach(([key, value]) => {
            if (Object.keys(value).includes('isBatchResource')) {
                resourcePaths.push([...path, key]);
            } else {
                visitObject(value, [...path, key]);
            }
        });
    }

    visitObject(resources, []);

    return resourcePaths;
}

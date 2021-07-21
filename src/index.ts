#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import codegen from './codegen';
import { getConfig } from './config';
import SwaggerParser from '@apidevtools/swagger-parser';

interface CLIArgs {
    config: string;
    output: string;
}

function writeLoaders(args: CLIArgs) {
    const config = getConfig(args.config);
    const output = codegen(config);

    assert(typeof args.config === 'string', 'expected args.config to be set!');
    assert(typeof args.output === 'string', 'expected args.output to be set!');
    fs.writeFileSync(args.output, output);
}

// return if two arrays have exact same values (order doesn't matter)
function arraysEqual(a: Array<string>, b: Array<string>) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    a.sort();
    b.sort();
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// return all values of the key in object
function findVal(object: any, key: string, array: Array<string>) {
    Object.keys(object).some(function (k) {
        if (k === key) {
            array.push(...object[k]);
        }
        if (object[k] && typeof object[k] === 'object') {
            findVal(object[k], key, array);
        } else {
            return;
        }
    });
    return array;
}

function verifyBatchPropertyResource(args: CLIArgs) {
    const resources: object = getConfig(args.config).resources;

    Object.entries(resources).forEach(([key, value]) => {
        if (Object.keys(value).includes('propertyBatchKey')) {
            const propertyBatchKey = value['propertyBatchKey'];
            if (
                !value.hasOwnProperty('swaggerFile') ||
                !value.hasOwnProperty('swaggerPath') ||
                !value.hasOwnProperty('swaggerMethod')
            ) {
                throw new Error('Missing swagger info, please add them in yout dataloader-cofig.yaml file!');
            }
            const swaggerFile = value['swaggerFile'];
            const swaggerPath = value['swaggerPath'];
            const swaggerMethod = value['swaggerMethod'];

            // parse swagger file, so that all $ref pointers will be resolved.
            SwaggerParser.validate(swaggerFile, (err, api) => {
                if (err) {
                    console.error(err);
                } else {
                    var object = api.paths[swaggerPath][swaggerMethod]['responses']['200'];
                    // The resource may return the list of results in a nested path, we need to handle that
                    if (value.hasOwnProperty('nestedPath')) {
                        object =
                            api.paths[swaggerPath][swaggerMethod]['responses']['200']['schema'][value['nestedPath']];
                    }
                    // Find all the fields that are listed `required` in the swagger spec
                    const requiredList = findVal(object, 'required', []);
                    const requiredId = value.hasOwnProperty('swaggerRequiredId') ? value['swaggerRequiredId'] : [];
                    if (!arraysEqual(requiredId, requiredList)) {
                        throw new Error(
                            'Sorry, your endpoint does not match the requirement for using propertyBatchKey, please read.',
                        );
                    }
                }
            });
        }
    });
}

function main() {
    const argv = yargs
        .options({
            config: {
                type: 'string',
                describe: 'path to the dataloader config file',
                demandOption: true,
            },
            output: {
                type: 'string',
                describe: 'path to the output file this tool will create (parent directory must exist)',
                demandOption: true,
            },
        })
        .help().argv;
    verifyBatchPropertyResource(argv);
    //  writeLoaders(argv);
}

if (!process.env.NODE_ENV) {
    main();
}

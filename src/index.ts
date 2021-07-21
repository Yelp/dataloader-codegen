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

/**
 * If two arrays have the same items (order doesn't matter)
 */
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

/**
 * Find all values of the intput key in an object recursively
 */
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

/**
 * Throw erros when resource uses propertyBatchKey feature but doesn't have optional properties
 */
function verifyBatchPropertyResource(args: CLIArgs) {
    const resources: object = getConfig(args.config).resources;

    Object.entries(resources).forEach(([key, value]) => {
        if (Object.keys(value).includes('propertyBatchKey')) {
            const propertyBatchKey = value['propertyBatchKey'];
            if (
                !value.hasOwnProperty('swaggerLink') ||
                !value.hasOwnProperty('swaggerPath') ||
                !value.hasOwnProperty('httpMethod')
            ) {
                throw new Error(`Missing swagger info for ${key}, please add them in the dataloader-cofig.yaml file!`);
            }
            const swaggerLink = value['swaggerLink'];
            const swaggerPath = value['swaggerPath'];
            const httpMethod = value['httpMethod'];

            // parse swagger file, so that all $ref pointers will be resolved.
            SwaggerParser.validate(swaggerLink, (err, api) => {
                if (err) {
                    console.error(err);
                } else {
                    if (typeof api !== 'object' || typeof api.paths[swaggerPath][httpMethod] !== 'object') {
                        throw new Error(
                            `Cannot find the swagger response definition for ${key}, please make sure you have correct swagger info in the dataloader-cofig.yaml file!`,
                        );
                    } else {
                        var swaggerResponse: any = api.paths[swaggerPath][httpMethod]['responses']['200'];
                        // The resource may return the list of results in a nested path and properties are under the nestedPath
                        if (value.hasOwnProperty('nestedPath')) {
                            swaggerResponse =
                                api.paths[swaggerPath][httpMethod]['responses']['200']['schema'][value['nestedPath']];
                        }
                        // Find all the fields that are `required` in the swagger spec
                        const requiredList = findVal(swaggerResponse, 'required', []);
                        const requiredKeys = value.hasOwnProperty('swaggeRequiredKeys')
                            ? value['swaggeRequiredKeys']
                            : [];
                        if (!arraysEqual(requiredKeys, requiredList)) {
                            throw new Error(
                                'Sorry, your swagger endpoint does not match the requirement of using propertyBatchKey ' +
                                    ', please read https://github.com/Yelp/dataloader-codegen/blob/master/README.md',
                            );
                        }
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
    writeLoaders(argv);
}

if (!process.env.NODE_ENV) {
    main();
}

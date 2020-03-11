#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import codegen from './codegen';
import { getConfig } from './config';

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

    writeLoaders(argv);
}

if (!process.env.NODE_ENV) {
    main();
}

import { AssertionError } from 'assert';

// TODO: Figure out how to use the native Node assert module with TypeScript
// @see https://github.com/microsoft/TypeScript/pull/32695

// export default function assert(condition: boolean, msg?: string): asserts condition {
//     if (!condition) {
//         throw new Error(msg)
//     }
// }

export default function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error(msg);
    }
}

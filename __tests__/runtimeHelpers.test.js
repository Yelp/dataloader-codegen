import { unPartitionResults } from '../src/runtimeHelpers';

describe('unPartitionResults', () => {
    it('should perform inverse mapping for result without Error', () => {
        expect(unPartitionResults([[0, 2], [1]], [[{ foo: 'foo' }, { bar: 'bar' }], [{ baz: 'baz' }]])).toEqual([
            { foo: 'foo' },
            { baz: 'baz' },
            { bar: 'bar' },
        ]);
    });

    it('should perform inverse mapping for result with some Error in resultGroups', () => {
        const customError = new Error('bar error');
        expect(unPartitionResults([[0, 2], [1]], [[{ foo: 'foo' }, customError], [{ baz: 'baz' }]])).toEqual([
            { foo: 'foo' },
            { baz: 'baz' },
            customError,
        ]);
    });

    it('should perform inverse mapping for result with all Error in one resultGroup', () => {
        const customError = new Error('foo error');
        expect(unPartitionResults([[0, 2], [1]], [[customError, customError], [{ baz: 'baz' }]])).toEqual([
            customError,
            { baz: 'baz' },
            customError,
        ]);
    });
});

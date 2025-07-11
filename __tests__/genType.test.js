import { getResourceTypeReference, getNewKeyTypeFromBatchKeySetType, getLoaderTypeKey } from '../src/genType';

it('getResourceTypeReference converts a resource path to a valid reference', () => {
    expect(getResourceTypeReference(null, ['foo', 'bar', 'baz'])).toBe("ResourcesType['foo']['bar']['baz']");
});

it('getNewKeyTypeFromBatchKeySetType returns a newKey type with a valid value', () => {
    expect(getNewKeyTypeFromBatchKeySetType('bKey', "ResourcesType['foo']['bar']['baz']")).toBe(
        `GetSetType<ResourcesType['foo']['bar']['baz']['bKey']>`,
    );
});

it('getLoaderTypeKey forces a nullable batchKey to be strictly non-nullable', () => {
    expect(
        getLoaderTypeKey(
            {
                isBatchResource: true,
                newKey: 'test_id',
                batchKey: 'test_ids',
            },
            ['a', 'b'],
        ),
    ).toBe(
        `Omit<Parameters<ResourcesType['a']['b']>[0], 'test_ids'> & { test_id: NonNullable<Parameters<ResourcesType['a']['b']>[0]['test_ids']>[0] }`,
    );
});

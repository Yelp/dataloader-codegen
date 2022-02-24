import { getResourceTypeReference, getNewKeyTypeFromBatchKeySetType, getLoaderTypeKey } from '../src/genTypeFlow';

it('getResourceTypeReference converts a resource path to a valid reference', () => {
    expect(getResourceTypeReference(null, ['foo', 'bar', 'baz'])).toBe(
        "$PropertyType<$PropertyType<$PropertyType<ResourcesType, 'foo'>, 'bar'>, 'baz'>",
    );
});

it('getNewKeyTypeFromBatchKeySetType returns a newKey type with a valid value', () => {
    expect(
        getNewKeyTypeFromBatchKeySetType(
            'bKey',
            "$PropertyType<$PropertyType<$PropertyType<ResourcesType, 'foo'>, 'bar'>, 'baz'>",
        ),
    ).toBe(`\
        $Call<
            ExtractArg,
            [$PropertyType<$PropertyType<$PropertyType<$PropertyType<$PropertyType<ResourcesType, 'foo'>, 'bar'>, 'baz'>, 'bKey'>, 'has'>]
        >`);
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
    ).toBe(`\{|
            ...$Diff<        $Call<
            ExtractArg,
            [$PropertyType<$PropertyType<ResourcesType, 'a'>, 'b'>]
        >, {
                test_ids: $PropertyType<        $Call<
            ExtractArg,
            [$PropertyType<$PropertyType<ResourcesType, 'a'>, 'b'>]
        >, 'test_ids'>
            }>,
            ...{| test_id: $ElementType<$NonMaybeType<$PropertyType<        $Call<
            ExtractArg,
            [$PropertyType<$PropertyType<ResourcesType, 'a'>, 'b'>]
        >, 'test_ids'>>, 0> |}
        |}`);
});

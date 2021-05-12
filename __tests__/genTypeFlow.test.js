import { getResourceTypeReference, getNewKeyTypeFromBatchKeySetType } from '../src/genTypeFlow';

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

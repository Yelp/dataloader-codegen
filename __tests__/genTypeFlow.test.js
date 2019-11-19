import { getResourceTypeReference } from '../src/genTypeFlow';

it('getResourceTypeReference converts a resource path to a valid reference', () => {
    expect(getResourceTypeReference(null, ['foo', 'bar', 'baz'])).toBe(
        "$PropertyType<$PropertyType<$PropertyType<ResourcesType, 'foo'>, 'bar'>, 'baz'>",
    );
});

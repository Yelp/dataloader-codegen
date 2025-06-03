/**
 * Fake clientlib for a fake "Space People" REST API server.
 * https://example.com/space-api
 * @flow
 */

const { inspect } = require('util');

export type Planet = $ReadOnly<{|
    id: number,
    name: string,
    diameter: number,
    gravity: string,
    climate: string,
    population: number,
    residents: $ReadOnlyArray<number>,
|}>;

export type Person = $ReadOnly<{|
    id: number,
    name: string,
    height: number,
    hair_color: string,
    home_planet: number,
|}>;

export type SpacePeopleClientlibTypes = {|
    getPlanets: ({| planet_ids: $ReadOnlyArray<number> |}) => Promise<$ReadOnlyArray<Planet>>,
    getPeople: ({| people_ids: $ReadOnlyArray<number> |}) => Promise<$ReadOnlyArray<Person>>,
|};

const FAKE_PLANETS: $ReadOnlyArray<Planet> = [
    {
        id: 1,
        name: 'Proxima Centauri',
        diameter: 12000,
        gravity: '1 standard',
        climate: 'hot',
        population: 500000,
        residents: [1, 2, 3],
    },
    {
        id: 2,
        name: 'Kepler-186f',
        diameter: 8000,
        gravity: '0.8 standard',
        climate: 'icy',
        population: 200000,
        residents: [4, 5],
    },
];

const FAKE_PEOPLE: $ReadOnlyArray<Person> = [
    {
        id: 1,
        name: 'Alice',
        height: 180,
        hair_color: 'blue',
        home_planet: 1,
    },
    {
        id: 2,
        name: 'Bob',
        height: 175,
        hair_color: 'green',
        home_planet: 1,
    },
    {
        id: 3,
        name: 'Charlie',
        height: 165,
        hair_color: 'red',
        home_planet: 1,
    },
    {
        id: 4,
        name: 'Dave',
        height: 190,
        hair_color: 'none',
        home_planet: 2,
    },
    {
        id: 5,
        name: 'Eve',
        height: 170,
        hair_color: 'blue',
        home_planet: 2,
    },
];

function CreateSpacePeopleClientlib(): SpacePeopleClientlibTypes {
    return {
        getPlanets: ({ planet_ids }) =>
            Promise.resolve(
                planet_ids.map((id) => {
                    const planet = FAKE_PLANETS.find((p) => p.id === id);
                    if (!planet) {
                        throw new Error(`Planet with id ${inspect(id)} not found`);
                    }
                    return planet;
                }),
            ),
        getPeople: ({ people_ids }) =>
            Promise.resolve(
                people_ids.map((id) => {
                    const person = FAKE_PEOPLE.find((p) => p.id === id);
                    if (!person) {
                        throw new Error(`Person with id ${inspect(id)} not found`);
                    }
                    return person;
                }),
            ),
    };
}

module.exports = CreateSpacePeopleClientlib;

/**
 * Clientlib for a subset of data in https://swapi.dev/
 * @flow
 */

import { property } from 'lodash';
import { number } from 'yargs';

const url = require('url');
const fetch = require('node-fetch').default;
const SWAPI_URL = 'https://swapi.dev/api/';

export type SWAPI_Planet = $ReadOnly<{|
    name: string,
    rotation_period: string,
    orbital_period: string,
    diameter: string,
    climate: string,
    gravity: string,
    terrain: string,
    surface_water: string,
    population: string,
    residents: $ReadOnlyArray<string>,
    films: $ReadOnlyArray<string>,
    created: string,
    edited: string,
    url: string,
|}>;

export type SWAPI_Person = $ReadOnly<{|
    name: string,
    height: string,
    mass: string,
    hair_color: string,
    skin_color: string,
    eye_color: string,
    birth_year: string,
    gender: string,
    homeworld: string,
    films: $ReadOnlyArray<string>,
    species: $ReadOnlyArray<string>,
    vehicles: $ReadOnlyArray<string>,
    starships: $ReadOnlyArray<string>,
    created: string,
    edited: string,
    url: string,
|}>;

export type SWAPI_Film = $ReadOnly<{|
    title: string,
    episode_id: number,
    opening_crawl: string,
    director: string,
    producer: string,
    release_date: string,
    species: $ReadOnlyArray<string>,
    starships: $ReadOnlyArray<string>,
    vehicles: $ReadOnlyArray<string>,
    characters: $ReadOnlyArray<string>,
    planets: $ReadOnlyArray<string>,
    url: string,
    created: string,
    edited: string,
|}>;

export type SWAPI_Film_V2 = $ReadOnly<{|
    properties: $ReadOnlyArray<{|
        film_id: number,
        title: string,
        episode_id: number,
        director: string,
        producer: string,
    |}>,
|}>;

export type SWAPI_Film_V3 = $ReadOnly<{|
    film_id: number,
    properties: {|
        title: string,
        episode_id: number,
        director: string,
        producer: string,
    |},
|}>;

export type SWAPI_Film_V4 = $ReadOnly<{|
    [number]: {|
        title: string,
        episode_id: number,
        director: string,
        producer: string,
    |},
|}>;

export type SWAPI_Vehicle = $ReadOnly<{|
    name: string,
    key: string,
|}>;

type SWAPI_Root = $ReadOnly<{|
    people: string,
    planets: string,
    films: string,
    species: string,
    vehicles: string,
    starships: string,
|}>;

export type SWAPIClientlibTypes = {|
    getPlanets: ({| planet_ids: $ReadOnlyArray<number> |}) => Promise<$ReadOnlyArray<SWAPI_Planet>>,
    getPeople: ({| people_ids: $ReadOnlyArray<number> |}) => Promise<$ReadOnlyArray<SWAPI_Person>>,
    getVehicles: ({| vehicle_ids: $ReadOnlyArray<number> |}) => Promise<$ReadOnlyArray<SWAPI_Vehicle>>,
    getFilms: ({| film_ids: Set<number> |}) => Promise<$ReadOnlyArray<SWAPI_Film>>,
    getRoot: ({||}) => Promise<SWAPI_Root>,
    // create fake resource with different interfaces to test batch properties feature
    getFilmsV2: ({|
        film_ids: $ReadOnlyArray<number>,
        properties: $ReadOnlyArray<string>,
    |}) => Promise<SWAPI_Film_V2>,
    getFilmsV3: ({|
        film_ids: $ReadOnlyArray<number>,
        properties: $ReadOnlyArray<string>,
    |}) => Promise<$ReadOnlyArray<SWAPI_Film_V3>>,
    getFilmsV4: ({|
        film_ids: $ReadOnlyArray<number>,
        properties: $ReadOnlyArray<string>,
    |}) => Promise<$ReadOnlyArray<SWAPI_Film_V4>>,
|};

module.exports = function (): SWAPIClientlibTypes {
    return {
        getPlanets: ({ planet_ids }) =>
            Promise.all(
                planet_ids.map((id) => fetch(url.resolve(SWAPI_URL, `planets/${id}`)).then((res) => res.json())),
            ),
        getPeople: ({ people_ids }) =>
            Promise.all(
                people_ids.map((id) => fetch(url.resolve(SWAPI_URL, `people/${id}`)).then((res) => res.json())),
            ),
        getVehicles: ({ vehicle_ids }) =>
            Promise.all(
                vehicle_ids.map((id) => fetch(url.resolve(SWAPI_URL, `vehicles/${id}`)).then((res) => res.json())),
            ),
        getFilms: ({ film_ids }) =>
            Promise.all(
                [...film_ids].map((id) => fetch(url.resolve(SWAPI_URL, `films/${id}`)).then((res) => res.json())),
            ),
        getRoot: ({}) => fetch(SWAPI_URL).then((res) => res.json()),
        getFilmsV2: ({ film_ids, properties }) => {
            return Promise.resolve({
                properties: [
                    {
                        film_id: 4,
                        director: 'George Lucas',
                        producer: 'Rick McCallum',
                        episode_id: 1,
                        title: 'The Phantom Menace',
                    },
                ],
            });
        },
        getFilmsV3: ({ film_ids, properties }) => {
            return Promise.resolve([
                {
                    film_id: 4,
                    properties: {
                        director: 'George Lucas',
                        producer: 'Rick McCallum',
                        episode_id: 1,
                        title: 'The Phantom Menace',
                    },
                },
            ]);
        },
        getFilmsV4: ({ film_ids, properties }) => {
            return Promise.resolve([
                {
                    4: {
                        director: 'George Lucas',
                        producer: 'Rick McCallum',
                        episode_id: 1,
                        title: 'The Phantom Menace',
                    },
                },
            ]);
        },
    };
};

/**
 * Clientlib for a subset of data in https://swapi.info/
 */

import { URL } from 'url';
import fetch from 'node-fetch';
const SWAPI_URL = 'https://swapi.info/api/';

export type SWAPI_Planet = Readonly<{
    name: string;
    rotation_period: string;
    orbital_period: string;
    diameter: string;
    climate: string;
    gravity: string;
    terrain: string;
    surface_water: string;
    population: string;
    residents: ReadonlyArray<string>;
    films: ReadonlyArray<string>;
    created: string;
    edited: string;
    url: string;
}>;

export type SWAPI_Person = Readonly<{
    name: string;
    height: string;
    mass: string;
    hair_color: string;
    skin_color: string;
    eye_color: string;
    birth_year: string;
    gender: string;
    homeworld: string;
    films: ReadonlyArray<string>;
    species: ReadonlyArray<string>;
    vehicles: ReadonlyArray<string>;
    starships: ReadonlyArray<string>;
    created: string;
    edited: string;
    url: string;
}>;

export type SWAPI_Film = Readonly<{
    title: string;
    episode_id: number;
    opening_crawl: string;
    director: string;
    producer: string;
    release_date: string;
    species: ReadonlyArray<string>;
    starships: ReadonlyArray<string>;
    vehicles: ReadonlyArray<string>;
    characters: ReadonlyArray<string>;
    planets: ReadonlyArray<string>;
    url: string;
    created: string;
    edited: string;
}>;

export type SWAPI_Film_V2 = Readonly<{
    properties: ReadonlyArray<{
        id: number;
        title: string | null;
        episode_id: number | null;
        director: string | null;
        producer: string | null;
    }>;
}>;

export type SWAPI_Vehicle = Readonly<{
    name: string;
    key: string;
}>;

type SWAPI_Root = Readonly<{
    people: string;
    planets: string;
    films: string;
    species: string;
    vehicles: string;
    starships: string;
}>;

export type SWAPIClientlibTypes = {
    getPlanets: (args: { planet_ids: ReadonlyArray<number> }) => Promise<ReadonlyArray<SWAPI_Planet>>;
    getPeople: (args: { people_ids: ReadonlyArray<number> }) => Promise<ReadonlyArray<SWAPI_Person>>;
    getVehicles: (args: { vehicle_ids: ReadonlyArray<number> }) => Promise<ReadonlyArray<SWAPI_Vehicle>>;
    getFilms: (args: { film_ids: Set<number> }) => Promise<ReadonlyArray<SWAPI_Film>>;
    getFilmsV2: (args: {
        film_ids: ReadonlyArray<number>;
        properties: ReadonlyArray<string>;
    }) => Promise<SWAPI_Film_V2>;
    getRoot: (args: {}) => Promise<SWAPI_Root>;
};

export default function (): SWAPIClientlibTypes {
    return {
        getPlanets: ({ planet_ids }) =>
            Promise.all(
                planet_ids.map((id) => fetch(new URL(`planets/${id}`, SWAPI_URL).toString()).then((res) => res.json())),
            ),
        getPeople: ({ people_ids }) =>
            Promise.all(
                people_ids.map((id) => fetch(new URL(`people/${id}`, SWAPI_URL).toString()).then((res) => res.json())),
            ),
        getVehicles: ({ vehicle_ids }) =>
            Promise.all(
                vehicle_ids.map((id) =>
                    fetch(new URL(`vehicles/${id}`, SWAPI_URL).toString()).then((res) => res.json()),
                ),
            ),
        getFilms: ({ film_ids }) =>
            Promise.all(
                Array.from(film_ids).map((id) =>
                    fetch(new URL(`films/${id}`, SWAPI_URL).toString()).then((res) => res.json()),
                ),
            ),
        getFilmsV2: ({ film_ids, properties }) => {
            return Promise.resolve({
                properties: [
                    {
                        id: 4,
                        director: 'George Lucas',
                        producer: 'Rick McCallum',
                        episode_id: 1,
                        title: 'The Phantom Menace',
                    },
                ],
            });
        },
        getRoot: ({}) => fetch(SWAPI_URL).then((res) => res.json()),
    };
}

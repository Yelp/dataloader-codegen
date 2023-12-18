/**
 * Typescript version clientlib for a subset of data in https://swapi.dev/
 */

import fetch from 'node-fetch';
import * as url from 'url';
const SWAPI_URL = 'https://swapi.dev/api/';

export interface SWAPI_Planet {
    readonly name: string;
    readonly rotation_period: string;
    readonly orbital_period: string;
    readonly diameter: string;
    readonly climate: string;
    readonly gravity: string;
    readonly terrain: string;
    readonly surface_water: string;
    readonly population: string;
    readonly residents: readonly string[];
    readonly films: readonly string[];
    readonly created: string;
    readonly edited: string;
    readonly url: string;
}

export interface SWAPI_Person {
    readonly name: string,
    readonly height: string,
    readonly mass: string,
    readonly hair_color: string,
    readonly skin_color: string,
    readonly eye_color: string,
    readonly birth_year: string,
    readonly gender: string,
    readonly homeworld: string,
    readonly films: readonly string[],
    readonly species: readonly string[],
    readonly vehicles: readonly string[],
    readonly starships: readonly string[],
    readonly created: string,
    readonly edited: string,
    readonly url: string,
}

export interface SWAPI_Film {
    readonly title: string;
    readonly episode_id: number;
    readonly opening_crawl: string;
    readonly director: string;
    readonly producer: string;
    readonly release_date: string;
    readonly species: readonly string[];
    readonly starships: readonly string[];
    readonly vehicles: readonly string[];
    readonly characters: readonly string[];
    readonly planets: readonly string[];
    readonly url: string;
    readonly created: string;
    readonly edited: string;
}

export interface SWAPI_Film_V2 {
    readonly properties: ReadonlyArray<{
        id: number;
        title?: string;
        episode_id?: number;
        director?: string;
        producer?: string;
    }>;
}

export interface SWAPI_Vehicle {
    readonly name: string;
    readonly key: string;
}

interface SWAPI_Root {
    readonly people: string;
    readonly planets: string;
    readonly films: string;
    readonly species: string;
    readonly vehicles: string;
    readonly starships: string;
}

export interface SWAPIClientlibTypes {
    getPlanets: (params: { readonly planet_ids: readonly number[] }) => Promise<readonly SWAPI_Planet[]>;
    getPeople: (params: { readonly people_ids: readonly number[] }) => Promise<readonly SWAPI_Person[]>;
    getVehicles: (params: { readonly vehicle_ids: readonly number[] }) => Promise<readonly SWAPI_Vehicle[]>;
    getFilms: (params: { film_ids: Set<number> }) => Promise<readonly SWAPI_Film[]>;
    getFilmsV2: (params: { 
        readonly film_ids: readonly number[];
        readonly properties: readonly string[];
    }) => Promise<SWAPI_Film_V2>;
    getRoot: (params: {}) => Promise<SWAPI_Root>;
}

export default function(): SWAPIClientlibTypes {
    return {
        getPlanets: ({ planet_ids: planetIds }) =>
            Promise.all(
                planetIds.map((id) => fetch(url.resolve(SWAPI_URL, `planets/${id}`)).then((res) => res.json())),
            ),
        getPeople: ({ people_ids: peopleIds }) =>
            Promise.all(
                peopleIds.map((id) => fetch(url.resolve(SWAPI_URL, `people/${id}`)).then((res) => res.json())),
            ),
        getVehicles: ({ vehicle_ids: vehicleIds }) =>
            Promise.all(
                vehicleIds.map((id) => fetch(url.resolve(SWAPI_URL, `vehicles/${id}`)).then((res) => res.json())),
            ),
        getFilms: ({ film_ids: filmIds }) =>
            Promise.all(
                [...filmIds].map((id) => fetch(url.resolve(SWAPI_URL, `films/${id}`)).then((res) => res.json())),
            ),
        getFilmsV2: ({ film_ids: filmIds, properties }) => {
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
};
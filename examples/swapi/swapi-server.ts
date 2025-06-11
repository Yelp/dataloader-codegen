import { graphql, buildSchema } from 'graphql';
import StarWarsAPI from './swapi';
import createSwapiLoaders from './swapi-loaders';

const createSWAPIServer = () => {
    const swapiLoaders = createSwapiLoaders(StarWarsAPI());

    const schema = buildSchema(/* GraphQL */ `
        type Planet {
            name: String
            climate: String
            diameter: String
        }

        type Film {
            title: String
            episodeNumber: Int
            director: String
        }

        type Query {
            planet(id: Int): Planet
            film(id: Int): Film
            filmv2(id: Int): Film
        }
    `);

    class PlanetModel {
        id: number;

        constructor(id: number) {
            this.id = id;
        }

        async name(): Promise<string | Error | undefined> {
            const response = await swapiLoaders.getPlanets.load({ planet_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.name;
            }
        }

        async climate(): Promise<string | Error | undefined> {
            const response = await swapiLoaders.getPlanets.load({ planet_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.climate;
            }
        }

        async diameter(): Promise<string | Error | undefined> {
            const response = await swapiLoaders.getPlanets.load({ planet_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.diameter;
            }
        }
    }

    class FilmModel {
        id: number;

        constructor(id: number) {
            this.id = id;
        }

        async title(): Promise<string | Error | undefined> {
            const response = await swapiLoaders.getFilms.load({ film_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.title;
            }
        }

        async episodeNumber(): Promise<number | Error | undefined> {
            const response = await swapiLoaders.getFilms.load({ film_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.episode_id;
            }
        }

        async director(): Promise<string | Error | undefined> {
            const response = await swapiLoaders.getFilms.load({ film_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.director;
            }
        }
    }

    class FilmModelV2 {
        id: number;

        constructor(id: number) {
            this.id = id;
        }

        async title(): Promise<string | null | Error | undefined> {
            const response = await swapiLoaders.getFilmsV2.load({ film_id: this.id, properties: ['title'] });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.title;
            }
        }

        async episodeNumber(): Promise<number | null | Error | undefined> {
            const response = await swapiLoaders.getFilmsV2.load({ film_id: this.id, properties: ['episode_id'] });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.episode_id;
            }
        }

        async director(): Promise<string | null | Error | undefined> {
            const response = await swapiLoaders.getFilmsV2.load({ film_id: this.id, properties: ['director'] });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.director;
            }
        }
    }

    const root = {
        planet: ({ id }: { id: number }) => {
            return new PlanetModel(id);
        },
        film: ({ id }: { id: number }) => {
            return new FilmModel(id);
        },
        filmv2: ({ id }: { id: number }) => {
            return new FilmModelV2(id);
        },
    };

    return { schema, root };
};

const runQuery = (query: string) => {
    const { schema, root } = createSWAPIServer();
    return graphql(schema, query, root);
};

runQuery(/* GraphQL */ `
    query {
        alderaan: planet(id: 2) {
            name
            climate
            diameter
        }
        hoth: planet(id: 4) {
            name
        }
        dagobah: planet(id: 5) {
            name
        }

        meh: film(id: 1) {
            title
            episodeNumber
            director
        }
        theBest: film(id: 4) {
            title
            episodeNumber
            director
        }
        theBestV2: filmv2(id: 4) {
            title
            episodeNumber
            director
        }
    }
`).then((result) => {
    console.log(JSON.stringify(result, null, 4));
});

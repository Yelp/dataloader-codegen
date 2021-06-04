// @flow

const { graphql, buildSchema } = require('graphql');
const StarWarsAPI = require('./swapi');
const createSwapiLoaders = require('./swapi-loaders');

const createSWAPIServer = () => {
    const swapiLoaders = createSwapiLoaders.default(StarWarsAPI());

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
            filmv3(id: Int): Film
            filmv4(id: Int): Film
        }
    `);

    class PlanetModel {
        id: number;

        constructor(id: number) {
            this.id = id;
        }

        async name() {
            const response = await swapiLoaders.getPlanets.load({ planet_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.name;
            }
        }

        async climate() {
            const response = await swapiLoaders.getPlanets.load({ planet_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.climate;
            }
        }

        async diameter() {
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

        async title() {
            const response = await swapiLoaders.getFilms.load({ film_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.title;
            }
        }

        async episodeNumber() {
            const response = await swapiLoaders.getFilms.load({ film_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.episode_id;
            }
        }

        async director() {
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

        async title() {
            const response = await swapiLoaders.getFilmsV2.load({ film_id: this.id, property: 'title' });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.title;
            }
        }

        async episodeNumber() {
            const response = await swapiLoaders.getFilmsV2.load({ film_id: this.id, property: 'episode_id' });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.episode_id;
            }
        }

        async director() {
            const response = await swapiLoaders.getFilmsV2.load({ film_id: this.id, property: 'director' });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.director;
            }
        }
    }

    class FilmModelV3 {
        id: number;

        constructor(id: number) {
            this.id = id;
        }

        async title() {
            const response = await swapiLoaders.getFilmsV3.load({ film_id: this.id, property: 'title' });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.properties.title;
            }
        }

        async episodeNumber() {
            const response = await swapiLoaders.getFilmsV3.load({ film_id: this.id, property: 'episode_id' });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.properties.episode_id;
            }
        }

        async director() {
            const response = await swapiLoaders.getFilmsV3.load({ film_id: this.id, property: 'director' });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.properties.director;
            }
        }
    }

    class FilmModelV4 {
        id: number;

        constructor(id: number) {
            this.id = id;
        }

        async title() {
            const response = await swapiLoaders.getFilmsV4.load({ film_id: this.id, property: 'title' });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response[this.id].title;
            }
        }

        async episodeNumber() {
            const response = await swapiLoaders.getFilmsV4.load({ film_id: this.id, property: 'episode_id' });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response[this.id].episode_id;
            }
        }

        async director() {
            const response = await swapiLoaders.getFilmsV4.load({ film_id: this.id, property: 'director' });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response[this.id].director;
            }
        }
    }

    const root = {
        planet: ({ id }) => {
            return new PlanetModel(id);
        },
        film: ({ id }) => {
            return new FilmModel(id);
        },
        filmv2: ({ id }) => {
            return new FilmModelV2(id);
        },
        filmv3: ({ id }) => {
            return new FilmModelV3(id);
        },
        filmv4: ({ id }) => {
            return new FilmModelV4(id);
        },
    };

    return { schema, root };
};

const runQuery = (query) => {
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
        theBestV3: filmv3(id: 4) {
            title
            episodeNumber
            director
        }
        theBestV4: filmv4(id: 4) {
            title
            episodeNumber
            director
        }
    }
`).then((result) => {
    console.log(JSON.stringify(result, null, 4));
});

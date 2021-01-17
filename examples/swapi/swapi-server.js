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

        type Query {
            planet(id: Int): Planet
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

    const root = {
        planet: ({ id }) => {
            return new PlanetModel(id);
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
    }
`).then((result) => {
    console.log(JSON.stringify(result, null, 4));
});

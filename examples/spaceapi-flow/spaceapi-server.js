// @flow

const assert = require('assert');
const { graphql, buildSchema } = require('graphql');
const CreateSpacePeopleClientlib = require('./clientlib');
const createLoaders = require('./spaceapi-loaders');

const createServer = () => {
    const loaders = createLoaders.default(CreateSpacePeopleClientlib());

    const schema = buildSchema(/* GraphQL */ `
        type Planet {
            id: ID
            name: String
            climate: String
            diameter: String
        }

        type Person {
            id: ID
            name: String
            height: Int
            hairColor: String
            homePlanet: Planet
        }

        type Query {
            planet(id: Int): Planet
            person(id: Int): Person
        }
    `);

    class PlanetModel {
        id: number;

        constructor(id: number) {
            this.id = id;
        }

        async name() {
            const response = await loaders.getPlanets.load({ planet_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.name;
            }
        }

        async climate() {
            const response = await loaders.getPlanets.load({ planet_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.climate;
            }
        }

        async diameter() {
            const response = await loaders.getPlanets.load({ planet_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.diameter;
            }
        }
    }

   class PersonModel {
        id: number;

        constructor(id: number) {
            this.id = id;
        }

        async name() {
            const response = await loaders.getPeople.load({ person_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.name;
            }
        }

        async height() {
            const response = await loaders.getPeople.load({ person_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.height;
            }
        }

        async hairColor() {
            const response = await loaders.getPeople.load({ person_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return response.hair_color;
            }
        }

        async homePlanet() {
            const response = await loaders.getPeople.load({ person_id: this.id });

            if (response instanceof Error) {
                return response;
            }

            if (response) {
                return new PlanetModel(response.home_planet);
            }
        }
    }

    const root = {
        planet: ({ id }) => {
            return new PlanetModel(id);
        },
        person: ({ id }) => {
            return new PersonModel(id);
        },
    };

    return { schema, root };
};

const runQuery = (query) => {
    const { schema, root } = createServer();
    return graphql({ schema, source: query, rootValue: root });
};

runQuery(/* GraphQL */ `
    fragment PlanetFields on Planet {
        id
        name
        climate
        diameter
    }

    fragment PersonFields on Person {
        id
        name
        height
        hairColor
        homePlanet {
            ...PlanetFields
        }
    }

    query {
        # Get Planets
        proxima_centauri: planet(id: 1) {
            ...PlanetFields
        }
        kepler_186f: planet(id: 2) {
            ...PlanetFields
        }
       
        # Get People
        alice: person(id: 1) {
            ...PersonFields
        }
        eve: person(id: 5) {
            ...PersonFields
        }
    }
`).then((result) => {
    console.log(JSON.stringify(result, null, 4));
    assert.partialDeepStrictEqual({
        "data": {
            "proxima_centauri": {
                "id": "1",
                "name": "Proxima Centauri",
                "climate": "hot",
                "diameter": "12000"
            },
            "kepler_186f": {
                "id": "2",
                "name": "Kepler-186f",
                "climate": "icy",
                "diameter": "8000"
            },
            "alice": {
                "id": "1",
                "name": "Alice",
                "height": 180,
                "hairColor": "blue",
                "homePlanet": {
                    "id": "1",
                    "name": "Proxima Centauri",
                    "climate": "hot",
                    "diameter": "12000"
                }
            },
            "eve": {
                "id": "5",
                "name": "Eve",
                "height": 170,
                "hairColor": "blue",
                "homePlanet": {
                    "id": "2",
                    "name": "Kepler-186f",
                    "climate": "icy",
                    "diameter": "8000"
                }
            }
        }
    }, result)
});

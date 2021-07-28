# 🤖 dataloader-codegen

[![npm](https://img.shields.io/npm/v/dataloader-codegen.svg)](https://yarn.pm/dataloader-codegen)
[![Build Status](https://api.travis-ci.com/Yelp/dataloader-codegen.svg?branch=master)](https://travis-ci.com/github/Yelp/dataloader-codegen)

dataloader-codegen is an opinionated JavaScript library for automagically generating [DataLoaders](https://github.com/graphql/dataloader) over a set of resources (e.g. HTTP endpoints), with a predictable interface, and maintains type safety.

Read more about the motivation behind this library in our recent blog post: https://engineeringblog.yelp.com/2020/04/open-sourcing-dataloader-codegen.html

![header](./images/header.png)

**Features**:

-   🚚 Supports Batched + Non Batched Resources
-   ✨ Predictable DataLoader Interfaces
-   🐛 Error Handling
-   🔒 Type Safety (Flow)
-   🔧 Resource Middleware

## Install

```bash
$ yarn add --dev dataloader-codegen
```

## Why?

_See: https://engineeringblog.yelp.com/2020/04/open-sourcing-dataloader-codegen.html_

We believe the DataLoader layer should be (mostly) transparent when implementing
a GraphQL server over a set of existing resources (e.g. HTTP API Endpoints).

When fetching data, GraphQL resolver authors should think in terms of the
underlying _resources_ that they're already familiar with, not an invented set
of human defined DataLoaders.

With dataloader-codegen, we build a **1:1 mapping of resources to DataLoaders**:

<img src="https://raw.githubusercontent.com/Yelp/dataloader-codegen/master/images/mapping.png" height="400" />

This makes it super easy to find the DataLoaders you want - there will be
exactly 1 DataLoader available per resource, with a predictable name and interface.

This means **reduced risk of making unnecessary HTTP requests.**

If there were (accidentally!) multiple DataLoaders created for a single
endpoint, we potentially lose out on batched requests to that resource.

By keeping the mapping of one DataLoader per resource, we reduce that risk
and can make a more efficient set of HTTP requests to the underlying resource.

## Usage

1. Create `dataloader-config.yaml` to describe the shape and behaviour of your resources. (See [the docs](./API_DOCS.md) for detailed info.)

    **Example**

    ```yaml
    resources:
        getPeople:
            docsLink: https://swapi.dev/documentation#people
            isBatchResource: true
            batchKey: people_ids
            newKey: person_id
        getPlanets:
            docsLink: https://swapi.dev/documentation#planets
            isBatchResource: true
            batchKey: planet_ids
            newKey: planet_id
        ...
    ```

    _(Can be arbitrarily nested. See the [swapi example](./examples/swapi/swapi.dataloader-config.yaml) for an example.)_

2. Call `dataloader-codegen` and pass in your config file:

    ```bash
    $ dataloader-codegen --config swapi.dataloader-config.yaml --output __codegen__/swapi-loaders.js
    ```

    See `--help` for more options.

3. Import the generated loaders and use them in your [resolver methods](https://www.apollographql.com/docs/graphql-tools/resolvers/):

    ```js
    import getLoaders from './__codegen__/swapi-loaders';

    // StarWarsAPI is a clientlib containing fetch calls to swapi.dev
    // getLoaders is the function that dataloader-codegen generates for us
    const swapiLoaders = getLoaders(StarWarsAPI);

    class Planet {
        constructor(id) {
            this.id = id;
        }

        async diameter() {
            const { diameter } = await swapiLoaders.getPlanets.load({ planet_id: this.id });

            return diameter;
        }
    }
    ```

    Check out the [swapi example](./examples/swapi/swapi-server.js) to see a working example of this.

## Batch Resources

The [DataLoader `.load` interface](https://github.com/graphql/dataloader#loadkey)
accepts a single key and returns a single value. For [batch resources](https://www.codementor.io/blog/batch-endpoints-6olbjay1hd), we'll need to transform the DataLoader interface accordingly.

**Example**

Consider the following resource that returns information about users:

```js
const getUserInfo = (args: {
    user_ids: Array<number>,
    locale: string,
    include_slow_fields?: boolean,
}): Promise<Array<UserInfo>> => fetch('/userInfo', args);
```

This is a [batch resource](https://www.codementor.io/blog/batch-endpoints-6olbjay1hd) that accepts a list of users (`user_ids`) and returns a list of corresponding user objects (`Array<UserInfo>`).

For the DataLoader version of this, we'll want to instead ask for a **single** user
object at a time. This means we need to transform the interface in the following
ways:

1. Call `.load` with the same arguments, but switch "user_ids" to "user_id".

2. Return a _single_ `UserInfo` object from `.load`, instead of an _array_ of
   `UserInfo` objects.

![demo!](./images/demo.png)

We can control this by specifying `batchKey` and `newKey` in the config to
describe the relevant argument in the resource and DataLoader respectively.

The config for our `getUserInfo` would therefore look like this:

```yaml
resources:
    getUserInfo:
        isBatchResource: true
        batchKey: user_ids
        newKey: user_id
```

See [the full docs](./API_DOCS.md) for more information on how to configure resources.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Releasing

See [PUBLISH.md](PUBLISH.md)

## License

[MIT](https://choosealicense.com/licenses/mit/)

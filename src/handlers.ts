import { FastifyRequest, FastifyReply } from 'fastify';

import { Stat } from 'models/Stat';
import { PokemonWithStats } from 'models/PokemonWithStats';

export interface Pokemon extends PokemonWithStats {
  name: string;
  url: string;
  stats: Array<Stat>
}

interface AllPokemon {
  results: [Pokemon];
}

interface IQueryString extends FastifyRequest {
  query: {
    offset: string | number | undefined;
    limit: string | number | undefined;
  }
}

interface IParams extends FastifyRequest {
  params: {
    name: string
  }
}

export const apiFetch = (url: string): Promise<any> => {
  const https = require('https');
  const options = {
    agent: new https.Agent({ keepAlive: true }),
  };

  const request = new Promise((resolve, reject) => {
    https.get(url, options, (response) => {
      let data = '';
      if (response.statusCode === 404) {
        reject(new Error('could not find the pokemon'));
      }

      // A chunk of data has been received.
      response.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });

      response.on('error', (error) => {
        reject(error);
      });
    });
  });

  return request;
};

export const computeResponse = (response: Pokemon) => {
  const statSum = response?.stats.reduce((acc, curr) => {
    const sum = acc + curr.base_stat;
    return sum;
  }, 0);
  const average = statSum / response.stats.length;

  return average;
};

export async function getPokemon(request: IQueryString, reply: FastifyReply): Promise<void> {
  const { offset } = request.query || 20;
  const { limit } = request.query || 20;

  const apiURL = `https://pokeapi.co/api/v2/pokemon/?offset=${offset}&limit=${limit}`;
  try {
    const pokemonsRequest = apiFetch(apiURL) as Promise<AllPokemon>;
    const { results } = await pokemonsRequest;

    if (!results) {
      reply.code(404);
      throw new Error('Fetching pokemon went wrong');
    }

    const pokemonsRequestsArray = results.map((element) => apiFetch(element.url)) as Promise<Pokemon>[];
    const resultsAllPokemons = await Promise.all(pokemonsRequestsArray);
    const allpokemonsWithAverageStats = resultsAllPokemons.map((element) => ({ ...element, average: computeResponse(element) }));
    reply.send(allpokemonsWithAverageStats);
  } catch (error) {
    reply.code(500);
    reply.send({ message: 'something went wrong' })
  }
}

export async function getPokemonByName(request: IParams, reply: FastifyReply): Promise<void> {
  const { name } = request.params;

  const apiURL = 'https://pokeapi.co/api/v2/pokemon/';
  const urlApiPokeman = `${apiURL}${name.trim()}`;

  try {
    const promise = await apiFetch(urlApiPokeman) as Promise<Pokemon>;
    const result = await promise;

    if (!result) {
      reply.code(404)
      throw new Error('Fetching pokemon went wrong')
    }

    const pokemonWithAverageStat = { ...result, average: computeResponse(result) };
    reply.send(pokemonWithAverageStat);
  } catch (error) {
    reply.code(500)
    reply.send({ message: 'something went wrong' })
  }
}

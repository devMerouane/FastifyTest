import { FastifyInstance, RouteShorthandOptions } from 'fastify';

import { getPokemonByName, getPokemon } from './handlers';

export default function router(fastify: FastifyInstance, _opts: RouteShorthandOptions, next): void {
  fastify.get('/poke/:name', getPokemonByName);
  fastify.get('/poke/', getPokemon);
  next()
}

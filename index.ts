// | API               | Endpoint                                                       | Documentation                                                       |
// |-------------------|----------------------------------------------------------------|---------------------------------------------------------------------|
// | Search Actors     | https://api.themoviedb.org/3/search/person                     | https://developers.themoviedb.org/3/search/search-people            |
// | Get Actor Credits | https://api.themoviedb.org/3/person/{person_id}/movie_credits  | https://developers.themoviedb.org/3/people/get-person-movie-credits |
// | Get Movie Credits | https://api.themoviedb.org/3/movie/{movie_id}/credits          | https://developers.themoviedb.org/3/movies/get-movie-credits        |
// You may use this API key to try out the API in the documentation links above:

// <redacted>
// For more information about authentication, check out this documentation https://developer.themoviedb.org/docs/authentication-application

// The Bacon number of an actor or actress is the number of degrees of separation (see Six degrees of separation) they have from actor Kevin Bacon, as defined by the game known as Six Degrees of Kevin Bacon

import createClient from 'openapi-fetch'
import { paths } from './tmdb'

const client = createClient<paths>({
  baseUrl: 'https://api.themoviedb.org',
  headers: { authorization: `Bearer ${process.env.TOKEN}` },
})

// Given an actor/actress's name, find the bacon number

const kevinBaconId = 4724

/**
 * Actor doesn't exist: throw error or -1?
 * Not connected to Kevin Bacon: -1
 * Kevin Bacon himself: 0
 * In the same movie: 1
 * One movie away: 2
 */
async function getBaconNumberForActorName(actorName: string): Promise<number> {
  // search for actor by name
  const actorRes = await client.GET('/3/search/person', {
    params: { query: { query: actorName } },
  })
  const actor = actorRes.data?.results?.[0]
  if (!actor) {
    throw new Error(`Actor not found: ${actorName}`)
  }
  console.log('Will get bacon number for ', actorName, actor.id)
  console.log('Bacon number is', 4724)
  return getBaconNumber(actor.id!)

  // get all movies of given actor
  // get credit for each of the movies and look for kevin bacon
}

// share movie with "n" people
// bacon number: b

// n, n^2, n^3, n^b
// O(n)
// b = 3, n, n^2 = n^2
// b = 4, n^2, n^2 = n^2
// O(n^(b/2))

async function getAdjacentActors(actorIds: number[]): Promise<Set<number>> {
  console.log(`[getAdjacentActors] Getting adjacent actors for ${actorIds}`)
  const movieId2dArray = await Promise.all(
    actorIds.map(async (actorId) => {
      const res = await client.GET('/3/person/{person_id}/movie_credits', {
        params: { path: { person_id: actorId } },
      })
      // cast here is actually movie, not actors
      return res.data?.cast?.map((a) => a.id!) ?? []
    }),
  )
  const movieIds = new Set(movieId2dArray.flat())

  const actorId2dArray = await Promise.all(
    [...movieIds].map(async (movieId) => {
      const res = await client.GET('/3/movie/{movie_id}/credits', {
        params: { path: { movie_id: movieId } },
      })
      return res.data?.cast?.map((a) => a.id!) ?? []
    }),
  )
  const adjacentActorIds = new Set(actorId2dArray.flat())
  // Delete initial actor ids from the adjacency list
  actorIds.forEach((id) => adjacentActorIds.delete(id))
  console.log(
    `[getAdjacentActors] actorIds=${actorIds} adjacent=${
      //   [
      //   ...adjacentActorIds,
      // ].join(',')
      adjacentActorIds.size
    }`,
  )
  return adjacentActorIds
}

async function getBaconNumber(startActorId: number): Promise<number> {
  const start = {
    queue: [{ actorId: startActorId, baconNumber: 0 }],
    visited: new Set([startActorId]),
    baconNumber: 0,
  }
  const end = {
    queue: [{ actorId: kevinBaconId, baconNumber: 0 }],
    visited: new Set([kevinBaconId]),
    baconNumber: 0,
  }

  while (true) {
    if (!start.queue.length || !end.queue.length) {
      break
    }
    const current = start.baconNumber <= end.baconNumber ? start : end
    const other = current === start ? end : start
    let [item] = current.queue.splice(0, 1)
    if (!item) {
      break
    }
    console.log(
      '[getBaconNumber] Processing from',
      current === start ? 'start' : 'end',
      {
        baconNumber: current.baconNumber,
        actorId: item.actorId,
        otherBaconNumber: other.baconNumber,
      },
    )
    if (other.visited.has(item.actorId)) {
      return other.baconNumber + item.baconNumber
    }
    const adjacentIds = await getAdjacentActors([item.actorId])
    // performance optimization so we don't need to visit further adjacencies
    for (const id of adjacentIds) {
      if (other.visited.has(id)) {
        return other.baconNumber + item.baconNumber + 1
      }
    }

    const toQueue = [...adjacentIds].filter((id) => !current.visited.has(id))
    console.log(
      `[getBaconNumber] ${item.actorId} not adjacent, will queue ${toQueue.length}`,
    )
    for (const id of toQueue) {
      current.queue.push({ actorId: id, baconNumber: item.baconNumber + 1 })
      current.visited.add(id)
      current.baconNumber = item.baconNumber
    }
  }
  return -1

  // get all movies of given actor
  // get credit for each of the movies and look for kevin bacon
}

async function main() {
  // const res = await client.GET('/3/search/person', {
  //   params: { query: { query: 'Jennifer Lawrence' } },
  // })
  // const kevinBacon = res.data?.results?.[0]
  // console.log(kevinBacon)
  // console.log(await getBaconNumberForActorName('Jennifer Lawrence'))
  // console.log(await getBaconNumberForActorName('Kevin Bacon'))
  // console.log(await getBaconNumberForActorName('Colman Domingo')) // 1
  console.log(await getBaconNumberForActorName('Emma Watson')) // 2
  // console.log(await getBaconNumberForActorName('Julianne Moore'))
  // console.log(await getAdjacentActors(kevinBaconId))
  // console.log(await getAdjacentActors(91671))
}
main()

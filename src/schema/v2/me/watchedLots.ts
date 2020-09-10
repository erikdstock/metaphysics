import { ResolverContext } from "types/graphql"
import { pageable } from "relay-cursor-paging"
import { convertConnectionArgsToGravityArgs } from "lib/helpers"
import { connectionFromArraySlice, connectionFromArray } from "graphql-relay"

import { connectionWithCursorInfo } from "../fields/pagination"
import { ArtworkType } from "../artwork"

import { GraphQLFieldConfig, GraphQLEnumType } from "graphql"

const COLLECTION_ID = "saved-artwork"

const WatchedLotsConnection = connectionWithCursorInfo({
  name: "WatchedLots",
  nodeType: ArtworkType,
})

export const {
  connectionType: WatchedLotsConnectionType,
  edgeType: WatchedLotEdgeType,
} = WatchedLotsConnection

export const WatchedLots: GraphQLFieldConfig<any, ResolverContext> = {
  type: WatchedLotsConnection.connectionType,
  args: pageable({
    sort: {
      type: new GraphQLEnumType({
        name: "WatchedLotsArtworkSorts",
        values: {
          POSITION_ASC: {
            value: "position",
          },
          POSITION_DESC: {
            value: "-position",
          },
        },
      }),
    },
  }),
  resolve: (_source, options, { collectionArtworksLoader }) => {
    if (!collectionArtworksLoader) return null

    const gravityOptions = Object.assign(
      { total_count: true, in_auction: true, private: true },
      convertConnectionArgsToGravityArgs(options)
    )
    // Adds a default case for the sort
    gravityOptions.sort = gravityOptions.sort || "-position"
    delete gravityOptions.page // this can't also be used with the offset in gravity
    return collectionArtworksLoader(COLLECTION_ID, gravityOptions)
      .then(({ body, headers }) => {
        console.log("&&&&&&&&&&&&&&", body)
        return connectionFromArraySlice(body, options, {
          arrayLength: parseInt(headers["x-total-count"] || "0", 10),
          sliceStart: gravityOptions.offset,
        })
      })
      .catch((e) => {
        console.log("CATCH CATCH CATCH")
        console.log(e)
        // For some users with no favourites, Gravity produces an error of "Collection Not Found".
        // This can cause the Gravity endpoint to produce a 404, so we will intercept the error
        // and return an empty list instead.
        return connectionFromArray([], options)
      })
  },
}

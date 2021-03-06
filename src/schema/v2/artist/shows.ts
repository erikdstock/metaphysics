import { pageable } from "relay-cursor-paging"
import {
  GraphQLInt,
  GraphQLString,
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
} from "graphql"
import ShowSorts from "schema/v2/sorts/show_sorts"
import { merge, defaults, reject, includes, omit } from "lodash"
import { createPageCursors } from "schema/v2/fields/pagination"
import { convertConnectionArgsToGravityArgs } from "lib/helpers"
import { connectionFromArraySlice } from "graphql-relay"
import { ResolverContext } from "types/graphql"
import { ShowsConnection } from "../show"

// TODO: Fix upstream, for now we remove shows from certain Partner types
const blacklistedPartnerTypes = [
  "Private Dealer",
  "Demo",
  "Private Collector",
  "Auction",
]
export function showsWithBlacklistedPartnersRemoved(shows) {
  return reject(shows, show => {
    if (show.partner) {
      return includes(blacklistedPartnerTypes, show.partner.type)
    }
    if (show.galaxy_partner_id) {
      return false
    }
    return true
  })
}

const ShowArgs: GraphQLFieldConfigArgumentMap = {
  active: {
    type: GraphQLBoolean,
  },
  atAFair: {
    type: GraphQLBoolean,
  },
  isReference: {
    type: GraphQLBoolean,
  },
  size: {
    type: GraphQLInt,
    description: "The number of PartnerShows to return",
  },
  soloShow: {
    type: GraphQLBoolean,
  },
  status: {
    type: GraphQLString,
  },
  topTier: {
    type: GraphQLBoolean,
  },
  visibleToPublic: {
    type: GraphQLBoolean,
  },
  sort: {
    type: ShowSorts,
  },
}

export const ShowsConnectionField: GraphQLFieldConfig<
  { id: string },
  ResolverContext
> = {
  type: ShowsConnection.connectionType,
  args: pageable(ShowArgs),
  resolve: ({ id }, args, { relatedShowsLoader }) => {
    const pageOptions = convertConnectionArgsToGravityArgs(args)
    const { page, size, offset } = pageOptions
    const gravityArgs = omit(args, ["first", "after", "last", "before"])
    return relatedShowsLoader(
      defaults(gravityArgs, pageOptions, {
        artist_id: id,
        sort: "-end_at",
        total_count: true,
      })
    )
      .then(({ body, headers = {} }) => {
        const whitelistedShows = showsWithBlacklistedPartnersRemoved(body)
        return { body: whitelistedShows, headers }
      })
      .then(({ body, headers }) => {
        const totalCount = parseInt(headers["x-total-count"] || "0", 10)
        const totalPages = Math.ceil(totalCount / size)

        return merge(
          {
            pageCursors: createPageCursors(pageOptions, totalCount),
            totalCount,
          },
          connectionFromArraySlice(body, args, {
            arrayLength: totalCount,
            sliceStart: offset,
          }),
          {
            pageInfo: {
              hasPreviousPage: page > 1,
              hasNextPage: page < totalPages,
            },
          }
        )
      })
  },
}

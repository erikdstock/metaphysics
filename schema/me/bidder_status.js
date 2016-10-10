/* @flow */

import {
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

import gravity from '../../lib/loaders/gravity';
import { LotStandingType } from './lot_standing';


export default {
  type: LotStandingType,
  description: 'The current user\'s status relating to bids on artworks',
  args: {
    sale_id: {
      type: new GraphQLNonNull(GraphQLString),
    },
    artwork_id: {
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  resolve: (root, { sale_id, artwork_id }, { rootValue: { accessToken } }) =>
    Promise
      .all([
        gravity.with(accessToken)('me/lot_standings', {
          sale_id,
          artwork_id,
        }),
      ])
      .then(([lotStanding]) => {
        if (lotStanding.length === 0) return null;
        return lotStanding[0];
      }),
};

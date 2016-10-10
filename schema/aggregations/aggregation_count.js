/* @flow */

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
} from 'graphql';

import { IDFields } from '../object_identification';

export const AggregationCountType = new GraphQLObjectType({
  name: 'AggregationCount',
  description: 'One item in an aggregation',
  fields: {
    ...IDFields,
    name: {
      type: GraphQLString,
    },
    count: {
      type: GraphQLInt,
    },
  },
});

export default {
  type: AggregationCountType,
  resolve: ({ name, count }, id) => ({ id, name, count }),
};

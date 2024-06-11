import { Helpers, StandardErrorFn, StandardError } from '../helpers';
import { NodeExpansion } from './node_expansion';
import { type TreePartBuild } from './tree_part_build';

const { freeze } = Helpers;

// interface PartialTreeStartGroupBuild {
//   build: () => NodeExpansion | undefined,
//   error: StandardErrorFn
// }

const TupleStartBuild = freeze({
  make: () => {}
});
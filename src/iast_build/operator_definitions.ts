import { Helpers, raise } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';

const { freeze, memoize, makeCounter } = Helpers;

type OperatorRelation = 'binary' | 'unary';

interface OperatorDefinitionMut {
  representation: string;
  precedence: number;
  relation: OperatorRelation;
};

export type OperatorDefinition = Readonly<OperatorDefinitionMut>;

export type OperatorDefinitionDictionary = Readonly<{
  [representation: string]: OperatorDefinition | undefined
}>;

const operandRelationships = freeze({
  binary: 'binary',
  unary : 'unary'
});

function intoMappingFor(pred: (s: OperatorRelation) => boolean)
  : OperatorDefinitionDictionary
{
  const mappings = OperatorDefinitions.
    fullListing().
    filter(({ relation }) => pred(relation)).
    map((def: OperatorDefinition): OperatorDefinitionDictionary =>
      ({ [def.representation]: def }));
  return Object.assign({}, ...mappings);
}

const unaryMappings = memoize((): OperatorDefinitionDictionary =>
  intoMappingFor((rel: OperatorRelation) => rel === 'unary'));
const binaryMappings = memoize((): OperatorDefinitionDictionary =>
  intoMappingFor((rel: OperatorRelation) => rel === 'binary'));
const allMappings = memoize((): OperatorDefinitionDictionary =>
  intoMappingFor((_0: OperatorRelation) => true));

export const OperatorDefinitions = freeze({
  unaryMappings,
  binaryMappings,
  assertIsOperator(op: string): void {
    if (allMappings()[op] !== undefined)
      { return; }

    raise(`"${op}" is not on the operator definition map`);
  },
  fullListing: memoize((): Readonly<OperatorDefinition[]> => {
    const counter = makeCounter();
    const { binary, unary } = operandRelationships;
    const {
      kLet, kAnd, kOr, kIs, kNot, kComma, kPlus, kMinus, kMultiply, kDivide,
      kDot, kEquality, kCall, kAssignment
    } = OperatorNamingSchema;
    return [
      { representation: kLet       , relation: unary  },
      { representation: kComma     , relation: binary },
      { representation: kIs        , relation: binary },
      { representation: kEquality  , relation: binary },
      { representation: kAssignment, relation: binary },
      { representation: kPlus      , relation: binary },
      { representation: kMinus     , relation: binary },
      { representation: kMultiply  , relation: binary },
      { representation: kMinus     , relation: unary  },
      { representation: kDivide    , relation: binary },
      { representation: kNot       , relation: unary  },
      { representation: kAnd       , relation: binary },
      { representation: kOr        , relation: binary },
      { representation: kCall      , relation: binary },
      { representation: kDot       , relation: binary },
      
    ].map(({ representation, relation }:
            { representation: string, relation: OperatorRelation }) =>
          ({ representation, precedence: counter(), relation }));
  }),
});

import { Helpers } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';

const { freeze, memoize, makeCounter } = Helpers;

interface OperatorDefinitionMut {
  representation: string,
  precedence: number,
  operandRelation: string
}

export type OperatorDefinition = Readonly<OperatorDefinitionMut>;

export type OperatorDefinitionDictionary = Readonly<{
  [representation: string]: OperatorDefinition | undefined
}>;

const makeListingFunction = (operandRelation: string) => {
  let sListing: OperatorDefinitionDictionary | undefined;
  return (): OperatorDefinitionDictionary => {
    if (sListing)
      { return sListing; }
    const listingArray = OperatorDefinitions.
      fullListing().
      reduce((prev: OperatorDefinition[], def: OperatorDefinition) => {
        if (def.operandRelation === operandRelation)
          { return [...prev, def]; }
        return prev;
      }, [] as OperatorDefinition[]).
      map((def: OperatorDefinition) => ({ [def.representation]: def }));
    return sListing =
      Object.assign({} as OperatorDefinitionDictionary, ...listingArray);
  };
};

const operandRelationships = freeze({
  binary: 'binary',
  unary : 'unary' ,
  fringe: 'fringe'
});

export const OperatorDefinitions = freeze({
  fullListing: (() => {
    const counter = makeCounter();
    
    let sFullListing: OperatorDefinition[] | undefined;
    return (): Readonly<OperatorDefinition[]> => {
      if (sFullListing) return sFullListing;
      const { binary, unary } = OperatorDefinitions.operandRelationships;
      const call = OperatorNamingSchema.kCall;
      const asgn = OperatorNamingSchema.kAssignment;
      const {
        kLet, kAnd, kOr, kIs, kNot, kComma, kPlus, kMinus, kMultiply, kDivide,
        kDot, kEquality
      } = OperatorNamingSchema;
      return sFullListing =
        [
          { representation: kLet     , operandRelation: unary  },
          { representation: kComma   , operandRelation: binary },
          { representation: kIs      , operandRelation: binary },
          { representation: kEquality, operandRelation: binary },
          { representation: asgn     , operandRelation: binary },
          { representation: kPlus    , operandRelation: binary },
          { representation: kMinus   , operandRelation: binary },
          { representation: kMultiply, operandRelation: binary },
          { representation: kMinus   , operandRelation: unary  },
          { representation: kDivide  , operandRelation: binary },
          { representation: kNot     , operandRelation: unary  },
          { representation: kAnd     , operandRelation: binary },
          { representation: kOr      , operandRelation: binary },
          { representation: call     , operandRelation: binary },
          { representation: kDot     , operandRelation: binary }
        ].
          map(({ representation, operandRelation }:
                { representation: string, operandRelation: string }) =>
              ({ representation, precedence: counter(), operandRelation }));
    };
  })(),
  isAnOperator : (() => {
    let sRepresentations: { [representation: string]: boolean } | undefined;
    const fn = (str: string) => {
      if (sRepresentations) return !!sRepresentations[str];

      const repArray = OperatorDefinitions.
        fullListing().
        map((def: OperatorDefinition) => ({ [def.representation] : true }));
      sRepresentations = Object.assign({}, ...repArray);
      return fn(str);
    };
    return fn;
  })(),
  unaryListing : memoize(makeListingFunction(operandRelationships.unary )),
  binaryListing: memoize(makeListingFunction(operandRelationships.binary)),
  operandRelationships
});

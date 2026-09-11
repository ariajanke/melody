import { Helpers, raise } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';

const { freeze, memoize } = Helpers;

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

interface OperatorDefinitionFactory {
  holdIncrement(): OperatorDefinitionFactory;
  continueIncrement(): OperatorDefinitionFactory;
  binary(representation: string): OperatorDefinitionFactory;    
  unary(representation: string): OperatorDefinitionFactory;
  finish(): Readonly<OperatorDefinition[]>;
};

const OperatorDefinitionFactory = freeze({
  make(): OperatorDefinitionFactory
  {
    let mPrecValue = 0;
    let mIncrement = 1;
    let mFinished = false;
    let mOperators: OperatorDefinition[] = [];
    const verifyNotFinished = () => {
      if (!mFinished)
        { return inst; }

      raise('Already finished!');
    };
    const increment = () => {
      mPrecValue += mIncrement;
      return mPrecValue;
    };
    const push = (representation: string, relation: OperatorRelation) => {
      const precedence = increment();
      mOperators.push(freeze({ representation, relation, precedence }));
      return verifyNotFinished();
    };
    const { binary, unary } = operandRelationships;
    const inst = freeze({
      holdIncrement() {
        mIncrement = 0;
        return verifyNotFinished();
      },
      continueIncrement() {
        mIncrement = 1;
        return verifyNotFinished();
      },
      binary: (representation: string) =>
        push(representation, binary),
      unary: (representation: string) =>
        push(representation, unary),
      finish: memoize((): Readonly<OperatorDefinition[]> => {
        mFinished = true;
        return mOperators;
      })
    });
    return inst;
  }
});

export const OperatorDefinitions = freeze({
  unaryMappings,
  binaryMappings,
  assertIsOperator(op: string): void {
    if (allMappings()[op] !== undefined)
      { return; }

    raise(`"${op}" is not on the operator definition map`);
  },
  fullListing: memoize((): Readonly<OperatorDefinition[]> => {
    const {
      kLet, kAnd, kOr, kIs, kNot, kComma, kPlus, kMinus, kMultiply, kDivide,
      kDot, kEquality, kCall, kAssignment
    } = OperatorNamingSchema;
    const factory = OperatorDefinitionFactory.make();
    return factory.
      unary (kLet).
      binary(kComma).
      binary(kIs).
      binary(kEquality).
      binary(kAssignment).
      binary(kPlus).
      binary(kMinus).
      binary(kMultiply).
      binary(kDivide).
      unary(kNot).
      binary(kAnd).
      binary(kOr).
      unary(kMinus).holdIncrement().
      binary(kCall).binary(kDot).continueIncrement().
      finish();
  }),
});

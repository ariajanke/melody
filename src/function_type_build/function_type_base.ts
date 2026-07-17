import { CodeWriter } from '../code_writer';
import { FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;
const makeUid = () => memoize(Symbol);
const { emptyTuple } = TupleObjectFactory;

const common = memoize(() => freeze({
  parameters: emptyTuple,
  returns: emptyTuple,
  receiver: emptyTuple,
  simpleEmit: (_0: CodeWriter) =>
    raise('This function cannot be simply emitted'),
  emit(_0: FunctionType,
       _1: FunctionType,
       _2: CodeWriter)
  {
    raise('This function cannot be emitted (at least this way).');
  },
  uid: () => raise('should not be reached')
}));

function makeNewEmitlessEmpty() {
  return freeze({
    ...common(),
    uid: makeUid()
  });
}

const emitEmptyTuple = memoize((): FunctionType =>
  freeze({
    ...makeNewEmitlessEmpty(),
    simpleEmit(_0: CodeWriter) {},
  }));

export const FunctionTypeBase = freeze({
  makeNewEmitlessEmpty,
  emitEmptyTuple
});

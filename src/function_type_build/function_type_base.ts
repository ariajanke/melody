import { CodeWriter } from '../code_writer';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;
// const { kContextName, kNoneName } = FunctionNamingSchema;
const makeUid = () => memoize(Symbol);
const { emptyTuple } = TupleObjectFactory;
// const raiseCannotEmit = (_0: CodeWriter) =>
//   { raise('Must implement "emit" function'); };

const common = memoize(() => freeze({
  parameters: emptyTuple,
  returns: emptyTuple,
  // emit: raiseCannotEmit,
  simpleEmit(_0: CodeWriter) {
    raise('This function cannot be simply emitted');
  },
  emit(_0: FunctionType,
       _1: FunctionType,
       _2: CodeWriter)
  {
    raise('This function cannot be emitted (at least this way).');
  },
  
  
  // actualReceiver: () => raise('Must implement "actualReceiver" function'),
}));

const make = (receiver: ObjectType) => freeze({
  ...common(),
  // alternateReceiver: () => receiverName,
  receiver: () => receiver,
  uid: makeUid()
});

export const FunctionTypeBase = freeze({
  makeDefaults: (): FunctionType => make(TupleObjectFactory.emptyTuple()),
  // receivedByContext: (): FunctionType => make(kContextName),
  // receivedByLexical: (): FunctionType => make(undefined)
});

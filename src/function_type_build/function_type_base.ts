import { CodeWriter } from '../code_writer';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;
const { kContextName, kNoneName } = FunctionNamingSchema;
const makeUid = () => memoize(Symbol);
const { emptyTuple } = TupleObjectFactory;
const raiseCannotEmit = (_0: CodeWriter) =>
  { raise('Must implement "emit" function'); };

const common = memoize(() => freeze({
  parameters: emptyTuple,
  returns: emptyTuple,
  emit: raiseCannotEmit,
  actualReceiver: () => raise('Must implement "actualReceiver" function'),
}));

const make = (receiverName: string | undefined) => freeze({
  ...common(),
  alternateReceiver: () => receiverName,
  uid: makeUid()
});

export const FunctionTypeBase = freeze({
  receivedByNone: (): FunctionType => make(kNoneName),
  receivedByContext: (): FunctionType => make(kContextName),
  receivedByLexical: (): FunctionType => make(undefined)
});

import { CodeWriter } from '../code_writer';
import { DastNode } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError, raise } from '../helpers';
import { ContextFrameSnapshot } from './context_frame_stack';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectFactory } from './tuple_type_factory';

const { freeze, memoize } = Helpers;
const { kAssignmentOperator } = FunctionNamingSchema;

const kLogToConsole = false;
const kAssignmentNotAValidCallName =
  `"${kAssignmentOperator}" is not a valid call name, DAST build should have ` +
  `stripped it out and replaced it with the appropriate fringe accessor`;

function make
  (mCallName: DastNode,
   mReceiver: DastNode,
   mArgs: DastNode,
   mContext: ContextFrameSnapshot)
  : FunctionTypeBuild
{
  const { error, setErrorMessage, setErrorFn } = StandardError.make();
  const mIntoFunctionTypeBuild = mContext.intoBuildFor;

  const callNameStr = memoize((): string | undefined => {
    const callNameStr = mCallName.asString();
    if (!callNameStr) {
      return setErrorMessage('Cannot use node as a call name');
    } else if (callNameStr === kAssignmentOperator) {
      raise(kAssignmentNotAValidCallName);
    }

    if (kLogToConsole) {
      console.log(`Looking up call "${callNameStr}" on receiver ` +
                  `"${mReceiver.asString()}" with args "${mArgs.asString()}"`);
    }
    return callNameStr;
  });

  const contextSelfFtype = () =>
    mContext.receiverResolution().
    mapExpectedToReceiverAccessor(mContext.referenceType()) ??
    raise('no self reference function <context>');

  const lexicalReceiver = memoize(() => {
    const receiverBuild = mIntoFunctionTypeBuild(mReceiver);
    return receiverBuild.functionType() ?? setErrorFn(receiverBuild.error);
  });

  const callFunctionType = memoize(() => {
    if (!lexicalReceiver() || !args())
      { return undefined; }

    const callFunctionType = lexicalReceiver()!.
      returns().
      lookUp(callNameStr()!)?.
      byParameters( args()!.returns() );
    if (!callFunctionType) {
      const msg =
        `cannot find function "${callNameStr()}" ` +
        `on receiver "${mReceiver.asString()}" ` +
        `(type: "${lexicalReceiver()!.returns().name()}") ` +
        `for args "${mArgs.asString()}"`;
      return setErrorMessage(msg);
    }

    return callFunctionType;
  });

  const receiverFtype = memoize(() => {
    if (!callFunctionType())
      { return undefined; }

    if (contextSelfFtype().uid() !== lexicalReceiver()?.uid())
      { return lexicalReceiver(); }

    const ftype = mContext.
      receiverResolution().
      mapExpectedToReceiverAccessor( callFunctionType()!.receiver() );
    if (!ftype) {
      return setErrorMessage('Cannot resolve receiver retrieval');
    }

    const { emptyTuple } = TupleObjectFactory;
    if (ftype.receiver().uid() !== emptyTuple().uid())
      { raise('Receiver resolution is behaving poorly'); }
    return ftype;
  });

  const args = memoize(() => {
    const argsBuild = mIntoFunctionTypeBuild(mArgs);
    return argsBuild.functionType() ?? setErrorFn(argsBuild.error);
  });

  const functionType = memoize((): FunctionType | undefined => {
    if (!callFunctionType()  || !receiverFtype() || !args())
      { return undefined; }

    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: callFunctionType()!.returns,
      simpleEmit(writer: CodeWriter) {
        callFunctionType()!.emit(receiverFtype()!, args()!, writer);
        return writer;
      }
    });
  });

  return freeze({ functionType, error });
}

export const CallFunctionBuild = freeze({ make });

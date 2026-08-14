import { CodeWriter } from '../code_writer';
import { DastNode } from '../dast_build';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError, raise } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { ContextFrameSnapshot } from './context_frame_stack';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectFactory } from './tuple_type_factory';

const { freeze, memoize } = Helpers;
const { kAssignment } = OperatorNamingSchema;

const kLogToConsole = false;
const kAssignmentNotAValidCallName =
  `"${kAssignment}" is not a valid call name, DAST build should have ` +
  `stripped it out and replaced it with the appropriate fringe accessor`;

function make
  (mCallName: string,
   mReceiver: DastNode,
   mArgs: DastNode,
   mContext: ContextFrameSnapshot)
  : FunctionTypeBuild
{
  const mIntoFunctionTypeBuild = mContext.intoBuildFor;
  const { emptyTuple } = TupleObjectFactory;

  const callNameStr = memoize((): string | undefined => {
    if (mCallName === kAssignment) {
      raise(kAssignmentNotAValidCallName);
    }

    if (kLogToConsole) {
      console.log(`Looking up call "${mCallName}" on receiver ` +
                  `"${mReceiver.asString()}" with args "${mArgs.asString()}"`);
    }
    return mCallName;
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
    if (!lexicalReceiver() || !args() || !callNameStr())
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

  const receiverFtype = memoize((): FunctionType | undefined => {
    if (!callFunctionType())
      { return undefined; }

    if (contextSelfFtype().uid() !== lexicalReceiver()?.uid())
      { return lexicalReceiver(); }

    const rec = callFunctionType()!.receiver();
    const ftype = mContext.receiverResolution().
      mapExpectedToReceiverAccessor(rec);
    if (!ftype) {
      return setErrorMessage(`Cannot resolve receiver for function ` +
                             `'${callNameStr()}' on type '${rec.name()}'`);
    }

    if (ftype.receiver().uid() !== emptyTuple().uid())
      { raise('Receiver resolution is behaving poorly'); }
    return ftype;
  });

  const args = memoize((): FunctionType | undefined => {
    const argsBuild = mIntoFunctionTypeBuild(mArgs);
    return argsBuild.functionType() ?? setErrorFn(argsBuild.error);
  });

  const { error, setErrorMessage, setErrorFn } = StandardError.make();

  const functionType = memoize((): FunctionType | undefined => {
    if (!callFunctionType()  || !receiverFtype() || !args())
      { return undefined; }

    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: callFunctionType()!.returns,
      simpleEmit(writer: CodeWriter) {
        if (receiverFtype()!.returns().uid() === emptyTuple().uid() &&
            args()!.returns().uid() === emptyTuple().uid())
        {
          callFunctionType()!.simpleEmit(writer);  
        } else {
          callFunctionType()!.emit(receiverFtype()!, args()!, writer);
        }
        return writer;
      }
    });
  });

  return freeze({ functionType, error });
}

export const CallFunctionBuild = freeze({ make });

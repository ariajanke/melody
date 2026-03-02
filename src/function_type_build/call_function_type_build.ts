import { CodeWriter } from '../code_writer';
import { DastNode } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError, raise } from '../helpers';
import { StackSafetyChecker } from './stack_safety_checker';
import { TupleObjectFactory } from './tuple_type';

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
   mGetContextSizeInBytes: () => number,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
  : FunctionTypeBuild
{
  const { error, setErrorMessage, setErrorFn } = StandardError.make();

  const callNameStr = memoize((): string | undefined => {
    const callNameStr = mCallName.asString();
    if (!callNameStr) {
      return setErrorMessage('Cannot use node as a call name');
    } else if (callNameStr === kAssignmentOperator) {
      throw new Error(kAssignmentNotAValidCallName);
    }

    if (kLogToConsole) {
      console.log(`Looking up call "${callNameStr}" on receiver ` +
                  `"${mReceiver.asString()}" with args "${mArgs.asString()}"`);
    }
    return callNameStr;
  });

  const receiver = memoize(() => {
    const receiverBuild = mIntoFunctionTypeBuild(mReceiver);
    return receiverBuild.functionType() ?? setErrorFn(receiverBuild.error);
  });

  const args = memoize(() => {
    const argsBuild = mIntoFunctionTypeBuild(mArgs);
    return argsBuild.functionType() ?? setErrorFn(argsBuild.error);
  });

  const callFunctionType = memoize(() => {
    const freceiver = receiver();
    const fargs = args();
    if (!freceiver || !fargs) { return; }

    const callFunctionType = freceiver.
      returns().
      lookUp(callNameStr()!)?.
      byParameters( fargs.returns() );
    if (!callFunctionType) {
      const msg =
        `cannot find function "${callNameStr()}" ` +
        `on receiver "${mReceiver.asString()}" ` +
        `(type: "${freceiver.returns().name()}") ` +
        `for args "${mArgs.asString()}"`;
      return setErrorMessage(msg);
    }
    return callFunctionType;
  });

  const { emptyTuple } = TupleObjectFactory;

  const optionalIndexAccessor = memoize(() => {
    if (!receiver())
      { return undefined; }

    const indexAccessorName = FunctionNamingSchema.
      mapToFringeAccessor(callNameStr()!);
    return receiver()!.returns().
      lookUp(indexAccessorName)?.
      byParameters(emptyTuple());
  });

  const functionType = memoize((): FunctionType | undefined => {
    if (!callFunctionType())
      { return undefined; }
  
    const compositeFunctionType = freeze({
      parameters: emptyTuple,
      returns: () => callFunctionType()!.returns(),
      emit(writer: CodeWriter) {
        const contextSize = mGetContextSizeInBytes();
        if (contextSize < 0) {
          raise(`Context size cannot be negative, got ${contextSize}`);
        }
        writer.
          pushRepresentation( mGetContextSizeInBytes() ).
          incrementStackPointer();
        receiver()!.emit(writer);
        args()!.emit(writer);
        // NOTE
        // mechanics of call
        // To handle indirect calls, special handling is needed. Consider these
        // examples:
        // - with "puts" you will not find ".puts"
        // - with "f" you will find ".f"
        // NOTE
        // the function is *always* expected to consume it's parameters
        // need function index for user defined functions
        optionalIndexAccessor()?.emit(writer);
        callFunctionType()!.emit(writer);
        writer.forStackPointer('restoreToGlobal');
        return writer;
      },
      uid: memoize(Symbol)
    });

    if (kLogToConsole) {
      const { parameters, returns } = compositeFunctionType;
      console.log(`Call "${callNameStr}" as composite ftype ` +
                  `taking ${parameters().name()} returning ` +
                  `"${returns().name()}" ` +
                  `received by "${mReceiver.asString()}" `+
                  `(${optionalIndexAccessor() ? 'is' : 'is not'} an indirect call)`);
    }
    StackSafetyChecker.make().check(compositeFunctionType);

    return compositeFunctionType;
  });

  return freeze({ functionType, error });
}

export const CallFunctionTypeBuild = freeze({ make });

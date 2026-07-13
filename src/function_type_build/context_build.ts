import { DastDeclarationMap, DastNode } from '../dast_build';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { StandardErrorMessage } from '../helpers';

export interface ContextBaseStage {
  referenceType(): ObjectType;
  contextLinkBuild(mPendingNames: Readonly<{ [name: string]: true }>): ContextLinkStage;
};

export interface ContextLinkStage {
  preface(): FunctionType;
  receiverResolution(): ReceiverResolution;
  next(mPendingNames: { [name: string]: true }): ContextDelegationStage;
};

export interface ContextDelegationStage {
  next(declarationsMap: DastDeclarationMap,
       intoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
    : ContextDeclarationBuild;
};

export interface ContextDeclarationBuild {
  referenceType(): ObjectType | undefined;
  aggregateType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

/// Identifies how to get a receiver needed by a function call, typically
/// within the context of a function's stack frame.
export interface ReceiverResolution {
  /// For some given object type representing a receiver, find an ftype that 
  /// can be called (which takes a "Tuple()" receiver) to retrieve that
  /// receiver.
  mapExpectedToReceiverAccessor:
    (expectedReceiver: ObjectType) =>
    // will always have "Tuple()" as the expected receiver
    // returning undefined would mean here: can't identify proper receiver error
    FunctionType | undefined;
};

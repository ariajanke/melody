import { FunctionType, ObjectType } from '../function_type_build';
import * as cbs from './context_build/context_base_stage';
import * as cls from './context_build/context_link_stage';
import * as cds from './context_build/context_delegation_stage';
import * as cdb from './context_build/context_declaration_build';

export type  ContextBaseStage = cbs.ContextBaseStage_;
export const ContextBaseStage = cbs.ContextBaseStage_;

export type  ContextLinkStage = cls.ContextLinkStage_;

export type ContextDelegationStage = cds.ContextDelegationStage_;

export type ContextDeclarationBuild = cdb.ContextDeclarationBuild_;

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

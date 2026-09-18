import { Helpers, raise, StandardErrorMessage } from '../../helpers';
import { AstNode } from '../../ast_node';
import { Token } from '../../token';
import { LetMarkings } from './let_markings_stack';
import { ReceiverNameStripping } from './receiver_name_stripping';

export type StripBuildResult = AstNode | 'not-modified' | undefined;

export type CallNameTransform = (fn: () => string) => (() => string);

export interface StripBuild {
  node(): StripBuildResult;
  error(): StandardErrorMessage;
};

export type StripBuildConstructor =
  (recurseOn: (n: AstNode) => AstNode | undefined, 
   originalCallName: Token,
   receiver: AstNode,
   args: AstNode) => StripBuild;

export interface StripBuildClassInitialization {
  chooseSpecialization
    (callName: Token, markings: LetMarkings): StripBuildConstructor | undefined;
};

const { freeze, memoize } = Helpers;

let sInitializable: StripBuildClassInitialization | undefined = undefined;

function makeBaseNameStripping
  (mCallName: Token, mReceiver: AstNode, mTransform: CallNameTransform):
  ReceiverNameStripping
{
  const mStripping = ReceiverNameStripping.make(mReceiver);

  const nameTarget = memoize((): Token | undefined => {
    const { nameTarget } = mStripping;

    if (!nameTarget())
      { return undefined; }

    return freeze({
      content: mTransform(nameTarget()!.content),
      type   : nameTarget()!.type,
      start  : nameTarget()!.start,
      end    : mCallName.end
    });
  });

  return freeze({
    nameTarget,
    strippedTree: mStripping.strippedTree,
    error: mStripping.error
  });
}

function chooseSpecialization
  (callName: Token, markings: LetMarkings): StripBuildConstructor | undefined
{
  return (sInitializable ?? raise('uninitialized')).
    chooseSpecialization(callName, markings);
}

function initializeThisClass(i: StripBuildClassInitialization) {
  if (sInitializable)
    { raise('already initialized'); }

  sInitializable = i;
}

export const StripBuild = freeze({
  initializeThisClass,
  chooseSpecialization,
  makeBaseNameStripping
});

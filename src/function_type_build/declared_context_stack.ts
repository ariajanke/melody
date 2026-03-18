import { Helpers, raise } from '../helpers';
import type { DastFunctionNameMappings } from '../dast_build';
import { ObjectType } from '../function_type_build';
import { ContextFactoryStage } from './context_factory_stage';
import { FunctionNamingSchema } from '../function_naming_schema';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

export interface ContextSnapshot {
  contains(pendingName: string): boolean;
  contextType(): ObjectType;
  referenceType(): ObjectType;
  name(): string;
};

export const ContextSnapshot = freeze({
  make(mIncompleteContextType: ObjectType,
       mMappings: DastFunctionNameMappings)
    : ContextSnapshot
  {
    const { emptyTuple } = TupleObjectFactory;
    const { kContextName } = FunctionNamingSchema;

    function contains(pendingName: string): boolean {
      return mIncompleteContextType.lookUp(pendingName) !== undefined;
    }

    const referenceType = memoize(() => mIncompleteContextType.
      lookUp(kContextName)?.
      byParameters(emptyTuple())?.
      returns() ??
      raise(`Context type is missing "${kContextName}" function`));
    
    return freeze({
      contains,
      contextType: () => mIncompleteContextType,
      referenceType,
      name: () => mMappings.name
    });
  }
});

export interface DeclaredContextStack {
  findWhereDeclared(pendingName: string): ObjectType;
  hopCountFor(pendingName: string): number;
  contextForHop(idx: number): ContextSnapshot | undefined;
  // topContext(): ObjectType;
};

export interface WritableDeclaredContextStack extends DeclaredContextStack {
  withContextStage<T>
    (defs: DastFunctionNameMappings,
     fn: (stage: ContextFactoryStage, parent?: ObjectType) => T): T;
};

export const DeclaredContextStack = freeze({
  make(): WritableDeclaredContextStack {
    const mStack: ContextSnapshot[] = [];
    let mNameCacheThing: { [name: string]: number | undefined } = {};
    function nameCacheLookup(pendingName: string): number | undefined {
      if (mNameCacheThing[pendingName] !== undefined)
        { return mNameCacheThing[pendingName]; }
      for (let i = mStack.length - 1; i >= 0; i--) {
        if (mStack[i].contains(pendingName)) {
          mNameCacheThing[pendingName] = i;
          if (i === mStack.length - 1) {
            raise(`pending name "${pendingName}" should be a declared name ` +
                  `instead of a pending name`);
          }
          return i;
        }
      }
      return undefined;
    }

    function findWhereDeclared(pendingName: string): ObjectType {
      const idx = nameCacheLookup(pendingName);
      if (idx === undefined) {
        raise(`pending name "${pendingName}" is not declared in any context`);
      }
      return mStack[idx].referenceType();
    }

    function hopCountFor(pendingName: string): number {
      const idx = nameCacheLookup(pendingName);
      if (idx === undefined) {
        raise(`pending name "${pendingName}" is not declared in any context`);
      }
      return (mStack.length - 1) - idx;
    }

    // function topContext() {
    //   return mStack[mStack.length - 1]?.contextType() ?? raise(`I'm gay :/`);
    // }

    function contextForHop(hop: number): ContextSnapshot | undefined {
      return mStack[mStack.length - 1 - hop];
    }

    function withContextStage<T>
      (defs: DastFunctionNameMappings,
       fn: (stage: ContextFactoryStage) => T): T
    {
      const stage = ContextFactoryStage.make();
      const incomplete = stage.intoObjectType();
      mStack.push(ContextSnapshot.make(incomplete, defs));
      mNameCacheThing = {};
      const result = fn(stage);
      mStack.pop();
      return result;
    }

    return freeze({
      contextForHop,
      hopCountFor,
      withContextStage,
      findWhereDeclared,
      // topContext
    });
  }
});

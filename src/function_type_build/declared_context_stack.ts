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
  topContext(): ObjectType;
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
      if (idx !== undefined) {
        return mStack[idx].referenceType();
      }
      raise(`pending name "${pendingName}" is not declared in any context`);
    }

    function hopCountFor(pendingName: string): number {
      const idx = nameCacheLookup(pendingName);
      if (idx === undefined) {
        raise(`pending name "${pendingName}" is not declared in any context`);
      }
      // number of (additional) hops for:
      // - current (undefined!)
      // - parent (0)
      // - grandparent (1)
      // stack is structured like:
      // [grandparent, parent, current]
      // - hops   : [n, ..., 1, 0, undefined]
      // - indices: [0, ..., n-1, n, n+1]
      // so we can compute hops from indices like this:
      // okay, if we have 2 contexts
      // and pending name is in root
      // then we need 0 additional hops (because it lives in the direct parent)
      const toTop = (mStack.length - 1) - idx; // is in [0, n-1], where n is stack size
      const additionalHops = toTop - 1;
      if (additionalHops < 0)
        { raise('oh no!'); }
      return additionalHops;
    }

    function topContext() {
      return mStack[mStack.length - 1]?.contextType() ?? raise(`I'm gay :/`);
    }

    function contextForHop(hop: number): ContextSnapshot | undefined {
      const idx = ((mStack.length - 1) - hop) + 1;
      if (idx < 1) {
        raise(`hop ${hop} is too high for stack of size ${mStack.length}`);
      } else if (idx >= mStack.length) {
        return undefined;
      }

      return mStack[mStack.length - 1 - idx];
    }

    function withContextStage<T>
      (defs: DastFunctionNameMappings,
       fn: (stage: ContextFactoryStage, parent?: ObjectType) => T): T
    {
      const stage = ContextFactoryStage.make();
      const incomplete = stage.intoObjectType();
      const parent = mStack[mStack.length - 1]?.contextType();
      mStack.push(ContextSnapshot.make(incomplete, defs));
      mNameCacheThing = {};
      const result = fn(stage, parent);
      mStack.pop();
      return result;
    }

    return freeze({
      contextForHop,
      hopCountFor,
      withContextStage,
      findWhereDeclared,
      topContext
    });
  }
});

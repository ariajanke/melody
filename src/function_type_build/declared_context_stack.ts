import { Helpers, raise } from '../helpers';
import type { DastFunctionNameMappings } from '../dast_build';
import { ObjectType } from '../function_type_build';
import { ContextFactoryStage } from './context_factory_stage';

const { freeze } = Helpers;

const ThingTwo = freeze({
  make(mIncompleteContextType: ObjectType,
       _1: DastFunctionNameMappings)
  {
    function contains(pendingName: string): boolean {
      return mIncompleteContextType.lookUp(pendingName) !== undefined;
    }
    
    return freeze({ contains, type: () => mIncompleteContextType });
  }
});

export interface DeclaredContextStack {
  findWhereDeclared(pendingName: string): ObjectType;
  top(): ObjectType;
};

export interface WritableDeclaredContextStack extends DeclaredContextStack {
  // pushDeclarationSet(
  //   defs: DastFunctionNameMappings,
  //   incompleteContextType: ObjectType): void;
  // popDeclarationSet(): void;
  withContextStage<T>
    (defs: DastFunctionNameMappings,
     fn: (stage: ContextFactoryStage, parent?: ObjectType) => T): T;
};

export const DeclaredContextStack = freeze({
  make(): WritableDeclaredContextStack {
    const mStack: (ReturnType<typeof ThingTwo.make>)[] = [];
    // function pushDeclarationSet
    //   (defs: DastFunctionNameMappings,
    //    incompleteContextType: ObjectType)
    // {
    //   mStack.push(ThingTwo.make(incompleteContextType, defs));
    // }

    // const popDeclarationSet = (): void => { mStack.pop(); };

    function findWhereDeclared(pendingName: string): ObjectType {
      for (let i = mStack.length - 1; i >= 0; i--) {
        if (mStack[i].contains(pendingName)) {
          return mStack[i].type();
        }
      }
      raise(`pending name "${pendingName}" is not declared in any context`);
    }

    function top() {
      return mStack[mStack.length - 1]?.type() ?? raise(`I'm gay :/`);
    }

    function withContextStage<T>
      (defs: DastFunctionNameMappings,
       fn: (stage: ContextFactoryStage, parent?: ObjectType) => T): T
    {
      const stage = ContextFactoryStage.make();
      const incomplete = stage.intoObjectType();
      const parent = mStack[mStack.length - 1]?.type();
      mStack.push(ThingTwo.make(incomplete, defs));
      const result = fn(stage, parent);
      mStack.pop();
      return result;
    }

    return freeze({
      // pushDeclarationSet,
      // popDeclarationSet,
      withContextStage,
      findWhereDeclared,
      top
    });
  }
});

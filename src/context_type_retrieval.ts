import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { type AstNode } from './ast_node';
import { ContextVariable } from './context_variable';
import { FunctionLookUpTable } from './function_look_up_table';
import { CallHandlingStrategies, FunctionType, IncompleteFunctionType } from './function_type';
import { Helpers, StandardError } from './helpers';
import { LetDeclarationsRetrieval } from './let_declarations_retrieval';
import { LetNameElement } from './let_names_collection_new';
import { type ObjectLookUpTable } from './object_look_up_table';
import { ObjectType } from './object_type';
import { ObjectTypeResolution } from './object_type_resolution';
import { VariableDeclarationFunctionTable } from './variable_declaration_function_table';

const { freeze, memoize } = Helpers;

interface Entry extends LetNameElement {
  typeResolution: () => ObjectTypeResolution
};

function construct
  (node: AstNode, objTable: ObjectLookUpTable): ObjectTypeResolution
{
  const { error, setErrorFn, hasErrorSet } = StandardError.make();
  const mLetDecRetrieval = LetDeclarationsRetrieval.make(node);
  function assertedResolvedTypeOf(element: Entry): ObjectType {
    return element.typeResolution().resolve() ?? (() => {
      throw new Error('errors must be caught by now');
    })();
  }
  function onLetDecs<Type>(fn: (decs: Readonly<LetNameElement[]>) => Type): Type | undefined {
    const { elements, error } = mLetDecRetrieval;
    const els = elements();
    if (els) {
      return fn(els);
    }
    return setErrorFn(error);
  }
  function onFunctionDef
    (element: Entry, fn: (funcType: FunctionType) => void)
  {
    const anyAreDefs =
      element.node.map<boolean>(AstFunctionDefinitionNode.hasCreated);
    const isDef =
      anyAreDefs.length === 1 &&
      anyAreDefs.reduce((prev: boolean, cur: boolean) => prev && cur);

    const type = assertedResolvedTypeOf(element);
    if (type.name() !== 'Function' || isDef)
      { return; }
    
    const func = IncompleteFunctionType.
      make().
      setCallStrategy(CallHandlingStrategies.noReceiver).
      setName(element.name).
      setParameters([]).
      setReturns([]).
      setAstNode(element.node.map((node: AstNode) => node)[0] as AstFunctionDefinitionNode).
      finish();
    fn(func);
  }

  function onLetDef<Type>
    (element: Entry, fn: (funcTable: FunctionLookUpTable) => Type): Type
  {
    const type = assertedResolvedTypeOf(element);
    const cvar = ContextVariable.make().setType(type);
    const lookUpTable = VariableDeclarationFunctionTable.
      make( cvar, element.operator, 0 );
    return fn(lookUpTable);
  }

  const getContext = memoize(() => ObjectType.make('Context'));

  const objTableWithContext = memoize(() => {
    const {
      addBuiltinTypes,
      addType,
      lookUpByName,
      lookUpByType,
      lookUpTuple
    } = objTable;
    const ctx = getContext();
    const ctxRes = ObjectTypeResolution.makeFixedForType(ctx);
    return freeze({
      lookUpByName(name: string): ObjectTypeResolution {
        
        if (name === ctx.name()) {
          return ctxRes;
        }
        return lookUpByName(name);
      },
      lookUpByType(type: ObjectType): ObjectTypeResolution {
        if (type.uid() === ctx.uid())
          { return ctxRes; }
        return lookUpByType(type);
      },
      lookUpTuple,
      addType,
      addBuiltinTypes
    });
  });

  return freeze({
    resolve: memoize(() => {
      const entries = onLetDecs((decs: Readonly<LetNameElement[]>): Entry[] =>
        decs.
          map((el: LetNameElement): Entry => {
            return freeze({
              ...el,
              typeResolution: memoize(() => el.node.executionType(objTableWithContext()))
            });
          }));
      if (!entries) {
        return undefined;
      }

      entries.forEach((val: Entry) => {
        if (hasErrorSet())
          { return; }
        const res = val.typeResolution();
        const type = res.resolve();
        if (!type) {
          return setErrorFn(res.error);
        }
        onLetDef(val, (funcTable: FunctionLookUpTable) => {
          getContext().setLookUpTable({ [`.${val.name}`]: funcTable });
        });
        onFunctionDef(val, (funcType: FunctionType) => {
          getContext().setLookUp({ [val.name]: funcType });
        });
      });
      if (hasErrorSet())
        { return undefined; }
      return getContext();
    }),
    error
  });
}

export const ContextTypeRetrieval = freeze({ make: construct });
export type  ContextTypeRetrieval = ReturnType<typeof construct>;
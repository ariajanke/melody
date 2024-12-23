import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { type AstNode } from './ast_node';
import { ContextType } from './context_type';
import { CallHandlingStrategies, FunctionType, IncompleteFunctionType } from './function_type';
import { Helpers, StandardError } from './helpers';
import { LetDeclarationsRetrieval } from './let_declarations_retrieval';
import { LetNameElement } from './let_names_collection';
import { type ObjectLookUpTable } from './object_look_up_table';
import { WritableObjectType, ObjectType } from './object_type';
import { ObjectTypeResolution } from './object_type_resolution';
import { PutsPrinterType } from './puts_function_look_up_table';
import { StackReversalType } from './stack_reversal_type';
import { VariableDeclaration } from './variable_declaration_function_table';

const { freeze, memoize } = Helpers;

interface Entry extends LetNameElement {
  typeResolution: () => ObjectTypeResolution
};

function construct
  (node: AstNode,
   objTable: ObjectLookUpTable,
   startDefaultContextType?: () => WritableObjectType): ObjectTypeResolution
{
  startDefaultContextType ??= () => ContextType.makeWritable();
  const { error, setErrorFn, hasErrorSet } = StandardError.make();
  const mLetDecRetrieval = LetDeclarationsRetrieval.make(node);

  function assertedResolvedTypeOf(element: Entry): ObjectType {
    return element.typeResolution().resolve() ?? (() => {
      throw new Error('errors must be caught by now');
    })();
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
    const { emptyTupleInstance } = ObjectType;
    const func = IncompleteFunctionType.
      make().
      setCallStrategy(CallHandlingStrategies.noReceiver).
      setName(element.name).
      setParameters(emptyTupleInstance()).
      setReturns(emptyTupleInstance()).
      setAstNode(element.node.map((node: AstNode) => node)[0] as AstFunctionDefinitionNode).
      finish();
    fn(func);
  }

  const writableContextType = memoize(startDefaultContextType);
  const getContext = writableContextType().objectType;

  const objTableWithContext = memoize(() => {
    const {
      addBuiltinTypes,
      addType,
      lookUpByName,
      lookUpByType,
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
      addType,
      addBuiltinTypes
    });
  });

  function resolve() {
    const { elements } = mLetDecRetrieval;
      const entries = elements()?.map((el: LetNameElement): Entry => {
        return freeze({
          ...el,
          typeResolution: memoize(() => el.node.executionType(objTableWithContext()))
        });
      });
      if (!entries) {
        return setErrorFn(mLetDecRetrieval.error);
      }

      entries.forEach((val: Entry) => {
        if (hasErrorSet())
          { return; }

        const res = val.typeResolution();
        const type = res.resolve();
        if (!type) {
          return setErrorFn(res.error);
        }
        VariableDeclaration.
          make(val.name, type, val.operator).
          mergeInto( writableContextType() );

        onFunctionDef(val, (funcType: FunctionType) => {
          writableContextType().pushFunctionTypeByName(val.name, funcType);
        });
        PutsPrinterType.make().mergeInto(writableContextType());

        StackReversalType.make().mergeInto(writableContextType());
      });
      if (hasErrorSet())
        { return undefined; }
      return getContext();
  }

  return freeze({
    resolve: memoize(resolve),
    error
  });
}

export const ContextTypeRetrieval = freeze({ make: construct });
export type  ContextTypeRetrieval = ReturnType<typeof construct>;
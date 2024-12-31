import { type AstNode } from './ast_node';
import { ContextType } from '../context_type';
import { Helpers, StandardError } from '../helpers';
import { LetDeclarationsRetrieval } from './let_declarations_retrieval';
import { LetNameElement } from './let_names_collection';
import { type ObjectLookUpTable } from '../object_look_up_table';
import { WritableObjectType } from '../writable_object_type';
import { ObjectTypeResolution } from '../object_type_resolution';
import { PutsPrinterType } from '../puts_function_look_up_table';
import { VariableContextModifier } from './variable_context_modifier';

const { freeze, memoize } = Helpers;

function construct
  (node: AstNode,
   objTable: ObjectLookUpTable,
   startDefaultContextType?: () => WritableObjectType): ObjectTypeResolution
{
  startDefaultContextType ??= () => ContextType.makeWritable();
  const { error, setErrorFn, hasErrorSet } = StandardError.make();
  const mLetDecRetrieval = LetDeclarationsRetrieval.make(node);

  const writableContextType = memoize(startDefaultContextType);
  const getContext = writableContextType().objectType;

  function resolve() {
    objTable.addType(getContext());
    const entries = mLetDecRetrieval.elements()?.
      map((el: LetNameElement) =>
        VariableContextModifier.make(el, writableContextType(), objTable));
    if (!entries) {
      return setErrorFn(mLetDecRetrieval.error);
    }
    // stupid, ugly, that's pure TypeScript
    let done = false;
    entries.forEach((modifier: VariableContextModifier) => {
      if (done) { return; }
      done = !modifier.modifiedContextType();
      done && setErrorFn(modifier.error);
    });
    if (done)
      { return undefined; }
    PutsPrinterType.make().mergeInto(writableContextType());

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
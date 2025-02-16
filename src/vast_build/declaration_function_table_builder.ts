import { Helpers, StandardError } from '../helpers';
import { VariableDeclaration } from '../variable_declaration';
import { WritableObjectType } from '../writable_object_type';
import { AstNodeVisitor } from './ast_node_visitor';
import { LetNameElement } from './let_declarations_retrieval';
import { VastNodeResolution } from './vast_build_visitor';
import { VariableInitializerBuilder } from './variable_initializer_builder';

const { freeze } = Helpers;


function constructElement
  (mVisitor: AstNodeVisitor<VastNodeResolution>,
   mLetName: LetNameElement
  )
{
  const { error } = StandardError.make();
  const vastRes = mLetName.valueNode.visit(mVisitor);
  const vastEl = vastRes.node() ??
    (() => { throw new Error(vastRes.errors()[0].message); })();

  const varNames = mLetName.name.split(','); 
  const varDecs = varNames. // <- now live in this world
    map((name: string, idx: number) =>
      VariableDeclaration.make({
        name,
        operator: mLetName.operator,
        tuplePosition: varNames.length === 1 ? undefined : idx,
        valueNode: vastEl
      }));
  
  function build(mDestination: WritableObjectType): WritableObjectType | undefined {
    varDecs.forEach((v: VariableDeclaration) => v.mergeInto(mDestination));
    return VariableInitializerBuilder.
      make(mDestination.objectType(), vastEl, mLetName).
      mergeInto(mDestination);
  }
  return freeze({ build, error });
}

function construct
  (mVisitor: AstNodeVisitor<VastNodeResolution>,
   mLetNames: Readonly<LetNameElement[]>)
{
  const { error, hasErrorSet, setErrorFn } = StandardError.make();
  function build(destination: WritableObjectType): WritableObjectType | undefined {
    mLetNames.forEach((value: LetNameElement) => {
      if (hasErrorSet())
        { return; }
      const { build, error } = constructElement(mVisitor, value);
      if (!build(destination)) {
        setErrorFn(error);
      }
    });
    return hasErrorSet() ? undefined : destination;
  }
  return freeze({ build, error });
}

export const DeclarationFunctionTableBuilder = freeze({ make: construct });

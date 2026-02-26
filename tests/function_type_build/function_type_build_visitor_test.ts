import { DastDeclarationMap } from '../../src/dast_build';
import { DastFunctionDefintion, DastInitialSet } from '../../src/dast_build/dast_node_specializations';
import { FunctionType } from '../../src/function_type_build';
import { FunctionTypeBuildVisitor } from '../../src/function_type_build/function_type_build_visitor';
import { FunctionTypeRegistry } from '../../src/function_type_registry';
import { StringPoolBuilder } from '../../src/string_pool';
import { ReachPoint, TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ FunctionTypeBuildVisitor }, () => {
  it('creates exactly two function types for a nested function definition', () => {
    const registry = FunctionTypeRegistry.make();
    const visitor = FunctionTypeBuildVisitor.make(StringPoolBuilder.make(), registry);
    const nestedFuncNode = DastFunctionDefintion.
      make({ pendingNames: {}, declaredNames: {} }, []);
    const fInitialSetNode = DastInitialSet.make('f', nestedFuncNode);
    const declaredNames: DastDeclarationMap = {
      ['.f']: {
        functionKind: 'accessor',
        value: nestedFuncNode
      },
      ['<initSet>:(f)']: {
        functionKind: 'initialSet',
        value: nestedFuncNode,
        variableNames: ['f']
      }
    };
    const fdefs = { pendingNames: {}, declaredNames };
    
    const root = DastFunctionDefintion.make(fdefs, [fInitialSetNode]);
    root.visit(visitor);
    const { verifyHit, hitsAtExactly } = ReachPoint.make();
    registry.forEach((_0: FunctionType, _1: FunctionType) => {
      hitsAtExactly(2);
    });
    expect(verifyHit()).toBeTruthy();
  });
});

import { InterpretedCodeRunner } from '../../src/interpreter/interpreted_code_runner';
import { StringPool, StringPoolBuilder } from '../../src/string_pool';
import { ReachPoint, TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ InterpretedCodeRunner }, () => {
  it('can run a simple program', () => {
    const stringPoolBuilder = StringPoolBuilder.make();
    const helloWorldIndex = stringPoolBuilder.append('hello world');
    const code = [
      'pushRepresentation', helloWorldIndex,
      'printString'
    ];
    
    const { verifyHit, hitsAtExactly } = ReachPoint.make();
    const stringPool = stringPoolBuilder.finish();
    const runner = InterpretedCodeRunner.
      make(code,
        {},
        stringPool,
        {
          ...InterpretedCodeRunner.defaultInjections(),
          putsFunction(str: string) {
            expect(str).toBe('hello world');
            hitsAtExactly(1);
          }
        }
      );
    runner.run();
    expect(verifyHit()).toBeTruthy();;
  });

  it('can run a simple function call', () => {
    const userFuncCode = [
      'pushRepresentation', 12,
      'printInteger',
      'functionEnd'
    ];
    const entryFuncCode = [
      // receiver and function index
      'pushRepresentation', 0,
      'pushRepresentation', 0,
      'indirectCall', 0,
      'pushRepresentation', 12,
      'printInteger',
      'functionEnd',
      ...userFuncCode
    ];

    const code = [
      ...entryFuncCode,
      ...userFuncCode
    ];
    const { verifyHit, hitsAtExactly } = ReachPoint.make();
    const injections = {
      ...InterpretedCodeRunner.defaultInjections(),
      putsFunction(str: string) {
        expect(str).toBe('12');
        hitsAtExactly(2);
      }
    };
    const runner = InterpretedCodeRunner.
      make(code,
           { 0: entryFuncCode.length }, 
           StringPool.makeDefault(),
           injections);
    runner.run();
    expect(verifyHit()).toBeTruthy();
  });

  it('throws if the stack is not balanced at the end of the entry point', () => {
    const code = ['pushRepresentation', 0, 'functionEnd'];
    const runner = InterpretedCodeRunner.
      make(code, {}, StringPool.makeDefault());
    expect(() => runner.run()).
      toThrow(new Error('Stack not empty at end of program'));
  });

  it('throws if stack is not balanced at a function end', () => {
    const userFuncCode = [
      'pushRepresentation', 12,
      'printInteger',
      'printInteger', // over consume stack
      'functionEnd'
    ];
    const entryPoint = [
      'pushRepresentation', 0,
      'pushRepresentation', 0,
      'indirectCall', 0,
      'functionEnd'
    ];
    const code = [
      ...entryPoint,
      ...userFuncCode
    ];
    
    const runner = InterpretedCodeRunner.
      make(code,
           { 0: entryPoint.length },
           StringPool.makeDefault());
    expect(() => runner.run()).
      toThrow(new Error('Stack size mismatch at jump point, expected 1 but got 0'));
  });
});

import { FunctionNamingSchema } from '../../../src/function_naming_schema';
import { FunctionType, ObjectType } from '../../../src/function_type_build';
import { BuiltinTypeBase } from '../../../src/function_type_build/builtin_type_base';
import { ContextBaseStage } from '../../../src/function_type_build/context_build';
import { AncestorCollection, AncestorInfo } from '../../../src/function_type_build/context_build/ancestor_collection';
import { ContextAncestorAccessorsStage } from '../../../src/function_type_build/context_build/context_ancestor_accessors_stage';
import { ContextLinkStage_ } from '../../../src/function_type_build/context_build/context_link_stage';
import { WritableObjectType } from '../../../src/function_type_build/context_build/writable_object_type';
import { ContextFrameStack, WritableContextFrameStack } from '../../../src/function_type_build/context_frame_stack';
import { TupleObjectFactory } from '../../../src/function_type_build/tuple_type_factory';
import { Helpers, raise } from '../../../src/helpers';
import { CallCountingCodeWriter } from '../../code_writer_factories';
import { TestHelpers } from '../../test_helpers';

const { describeNamed } = TestHelpers;
const { memoize, freeze } = Helpers;

describeNamed({ ContextLinkStage_ }, () => {
  const { emptyTuple } = TupleObjectFactory;
  const makeStack = (): WritableContextFrameStack => ContextFrameStack.make(() => raise('no'));
  const { getSimpleEmitCallsFrom } = CallCountingCodeWriter;
  const { makeWithAncestors } = ContextLinkStage_.testing;

  const kUsedName = '.a';
  const kGreatGrandParentName = '<kGreatGrandParentName>';
  const kGrandParentName = '<kGrandParentName>';
  const kParentName = '<kParentName>';

  function receiverResolutionHasItselfAndNone
    (inst: () => ContextLinkStage_,
     ref: () => ObjectType): void
  {
    it('has a receiver resolution for itself', () => {
      const rec = inst().receiverResolution().mapExpectedToReceiverAccessor(ref());
      expect(rec?.returns().uid()).toEqual(ref().uid());
    });

    it('has a receiver resolution for none (empty tuple)', () => {
      const rec = inst().receiverResolution().
        mapExpectedToReceiverAccessor( emptyTuple() );
      expect(rec?.returns().uid()).toEqual(emptyTuple().uid());
    });
  }

  function makeWritableContextBase(): WritableObjectType {
    return WritableObjectType.make({}, ContextBaseStage.make().referenceType());
  }

  describe('no parents', () => {
    const ref = memoize(makeWritableContextBase);
    const inst = memoize(() => ContextLinkStage_.make({}, makeStack(), ref()));

    it('has preface which stashes away the stack pointer to a local', () => {      
      const calls = getSimpleEmitCallsFrom(inst().preface());
      expect(calls).toEqual(['saveStackPointerToLocal']);
    });

    receiverResolutionHasItselfAndNone(inst, ref);
  });

  const pendingNames = memoize((): { [name: string]: true } => ({
    [FunctionNamingSchema.kParentName]: true,
    [kUsedName]: true
  }));

  describe('direct parent only', () => {
    const aParentType = memoize((): ObjectType =>
      BuiltinTypeBase.makeNewWithDefaults());

    const anAncestorCollection = memoize((): AncestorCollection => freeze({
      allAncestorsOrdered: (): Readonly<AncestorInfo[]> => [],
      parentReference: aParentType,
      parentUniqueName: (): string | undefined => kParentName,
      searchForOriginalByName(name: string): ObjectType | undefined {
        if (name === kUsedName)
          { return aParentType(); }
        return undefined;
      }
    }));

    function parentAccessorOf(inst: ContextLinkStage_): FunctionType | undefined {
      return inst.receiverResolution().mapExpectedToReceiverAccessor( aParentType() );
    }

    const ref = memoize(makeWritableContextBase);
    const inst = memoize(() =>
      makeWithAncestors(pendingNames(), anAncestorCollection(), ref()));
    
    it('has preface which stashes the parent to the stack frame', () => {
      const calls = getSimpleEmitCallsFrom(inst().preface());
      expect(calls.slice(1)).toEqual(['storeParentPointer', '0']);
    });

    it('has a receiver resolution for the parent', () => {
      const getter = parentAccessorOf(inst());
      expect(getter).toBeDefined();
    });

    it('has a parent pointer accessor, gets from correct index', () => {
      
      const getter = parentAccessorOf(inst());
      const calls = getSimpleEmitCallsFrom(getter);
      expect(calls).toEqual([
        'pushStackPointer', 'loadInteger'
      ]);
    });

    receiverResolutionHasItselfAndNone(inst, ref);
  });

  const parentAddedType = (vName: string, parentType: ObjectType): WritableObjectType =>
    ContextAncestorAccessorsStage.testing.
      addParentLookUp(WritableObjectType.make(), vName, { type: parentType, accessIndex: 0 });

  describe('for a (grand parent) ancestor frame, direct parent unused', () => {
    const aGrandParentType = memoize(() =>
      ContextBaseStage.make().referenceType());

    const aParentType = memoize((): ObjectType =>
      parentAddedType(kParentName, aGrandParentType()));

    const anAncestorCollection = memoize((): AncestorCollection => freeze({
      allAncestorsOrdered: memoize((): Readonly<AncestorInfo[]> =>
        [{ type: aGrandParentType(), variableName: kGrandParentName }]),
      parentReference: aParentType,
      parentUniqueName: (): string | undefined => kParentName,
      searchForOriginalByName(name: string): ObjectType | undefined {
        if (name === kUsedName)
          { return aGrandParentType(); }
        return undefined;
      }
    }));

    const ref = memoize(makeWritableContextBase);
    const inst = memoize(() => ContextLinkStage_.testing.
      makeWithAncestors(pendingNames(), anAncestorCollection(), ref()));

    it('has preface which stashes the direct parent to the stack frame', () => {
      const calls = getSimpleEmitCallsFrom(inst().preface());
      expect(calls.slice(1, 3)).toEqual(['storeParentPointer', '0']);
    });

    it('has preface which stashes the ancestor to the stack frame', () => {
      const calls = getSimpleEmitCallsFrom(inst().preface());
      expect(calls.slice(3, 7)).toEqual([
        'pushStackPointer',
        'pushInteger',
        '4',
        'addIntegers'
      ]);
      expect(calls[calls.length - 1]).toEqual('storeInteger');
    });

    it('has a receiver resolution for the grand parent', () => {
      const recFtype = inst().receiverResolution().mapExpectedToReceiverAccessor(aGrandParentType());
      expect(recFtype).toBeDefined();
    });

    it('has no receiver resolution for the direct parent', () => {
      const recFtype = inst().receiverResolution().mapExpectedToReceiverAccessor(aParentType());
      expect(recFtype).toBeDefined();
    });

    receiverResolutionHasItselfAndNone(inst, ref);
  });

  describe('for a (great grand parent) ancestor frame', () => {
    const aGreatGrandParentType = memoize(() => ContextBaseStage.make().referenceType());

    const aGrandParentType = memoize((): ObjectType =>
      parentAddedType(kGrandParentName, aGreatGrandParentType()));

    const aParentType = memoize((): ObjectType =>
      parentAddedType(kParentName, aGrandParentType()));

    const anAncestorCollection = memoize((): AncestorCollection => freeze({
      allAncestorsOrdered: memoize((): Readonly<AncestorInfo[]> =>
        [
          { type: aGrandParentType(), variableName: kGrandParentName },
          { type: aGreatGrandParentType(), variableName: kGreatGrandParentName },
        ]),
      parentReference: aParentType,
      parentUniqueName: (): string | undefined => kParentName,
      searchForOriginalByName(name: string): ObjectType | undefined {
        if (name === kUsedName)
          { return aGreatGrandParentType(); }
        return undefined;
      }
    }));

    const ref = memoize(makeWritableContextBase);
    const inst = memoize(() => ContextLinkStage_.testing.
      makeWithAncestors(pendingNames(), anAncestorCollection(), ref()));

    // we still need that parent, because it's essential for further hop
    // emissions in child functions
    it('has preface which stashes the direct parent to the stack frame', () => {
      const calls = getSimpleEmitCallsFrom(inst().preface());
      expect(calls.slice(1, 3)).toEqual(['storeParentPointer', '0']);
    });

    it('has preface which stashes the ancestor to the stack frame', () => {
      const calls = getSimpleEmitCallsFrom(inst().preface());
      expect(calls.slice(3, 7)).toEqual([
        'pushStackPointer',
        'pushInteger',
        '4',
        'addIntegers'
      ]);
      expect(calls[calls.length - 1]).toEqual('storeInteger');
    });

    it('has a receiver resolution for the great grand parent', () => {
      const recFtype = inst().receiverResolution().mapExpectedToReceiverAccessor(aGreatGrandParentType());
      expect(recFtype).toBeDefined();
    });

    it('has no receiver resolution for the direct parent', () => {
      const recFtype = inst().receiverResolution().mapExpectedToReceiverAccessor(aParentType());
      expect(recFtype).toBeDefined();
    });

    receiverResolutionHasItselfAndNone(inst, ref);
  });
});

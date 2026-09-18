import { Helpers, raise } from '../helpers';
import { FunctionNamingSchema } from '../function_naming_schema';
import { ContextBaseStage } from './context_build';
import { AstNode } from '../ast_node';
import { PendingNamesRetrieval } from './context_base_names_set/pending_names_retrieval';
import {
  ChildFunctionDefinition,
  DeclarationNamesRetrieval,
  NameDeclaration,
  WritableNameSet,
  NameSet
} from './context_base_names_set/declaration_names_retrieval';

export interface ContextNamesRetrieval {
  declarations(): Readonly<NameDeclaration[]>;
  pendingNames(): NameSet;
};

type CacheFor<T> = { [uid: number]: T | undefined };

const { freeze, memoize } = Helpers;
const { accumulateNames } = PendingNamesRetrieval;

const ContextNamesRetrieval = freeze({
  make(mPendingNames: PendingNamesRetrieval,
       mDeclNames: DeclarationNamesRetrieval): ContextNamesRetrieval
  {
    const pendingNames = memoize((): NameSet => {
      const set = mPendingNames.pendingNames().reduce(accumulateNames, {} as WritableNameSet);
      if (mPendingNames.refersToParent())
        { set[FunctionNamingSchema.kParentName] = true; }
      return set;
    });

    const { declarations } = mDeclNames;

    return freeze({ pendingNames, declarations });
  }
});

export interface ContextBaseNamesSet {
  ensure(uid: number): ContextBaseStage;
  contextNamesFor(uid: number, nodes: Readonly<AstNode[]>): ContextNamesRetrieval;
};

function addToCache<T>(cache: CacheFor<T>, uid: number, obj: T): T {
  cache[uid] = obj;
  return obj;
}

function make
  (mBaseStageCtor: (uniqueName: string) => ContextBaseStage = ContextBaseStage.make)
  : ContextBaseNamesSet
{
  const mCache: CacheFor<ContextBaseStage> = {};
  const mPCache: CacheFor<PendingNamesRetrieval> = {};
  const mCCache: CacheFor<ContextNamesRetrieval> = {};

  function ensure(uid: number): ContextBaseStage {
    if (mCache[uid])
      { return mCache[uid]; }

    return addToCache(mCache, uid, mBaseStageCtor(`<frame:${uid}>`));
  }

  function pendingNamesFor(uid: number): PendingNamesRetrieval {
    return mPCache[uid] ?? raise('pending names was not initialized');
  }

  function addNewNamesRetrievalForChild(cdef: ChildFunctionDefinition)
    { addNewNamesRetrieval(cdef.uid, cdef.nodes); }

  function addNewNamesRetrieval
    (uid: number, nodes: Readonly<AstNode[]>): ContextNamesRetrieval
  {
    const declRetr = DeclarationNamesRetrieval.make(nodes);
    
    // NOTE eagerly add children, otherwise pendingNamesFor could raise
    declRetr.childDefinitions().forEach(addNewNamesRetrievalForChild);

    const isBuiltin = (name: string) =>
      ensure(uid).referenceType().lookUp(name) !== undefined;
    
    const pendingNames = PendingNamesRetrieval.
      make(declRetr, isBuiltin, pendingNamesFor);
    mPCache[uid] = pendingNames;
    return addToCache(mCCache, uid, ContextNamesRetrieval.make(pendingNames, declRetr));
  }

  function contextNamesFor(uid: number, nodes: Readonly<AstNode[]>): ContextNamesRetrieval {
    if (mCCache[uid])
      { return mCCache[uid]; }

    return addNewNamesRetrieval(uid, nodes);
  }

  return freeze({
    ensure,
    contextNamesFor
  });
}

export const ContextBaseNamesSet = freeze({
  instance: memoize(make),
  forTesting: { make }
});

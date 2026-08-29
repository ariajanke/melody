import { Helpers } from './helpers';

const { freeze, makeIsStringInLookUpTable } = Helpers;

const kFunctionDefinition = 'fn';
const kTableDefinition = 'tbl';
const kParentheticalOpen = '(';
const kParentheticalClose = ')';
const kBodyClose = '~';
const kGroupingCharacters = [kParentheticalOpen, kParentheticalClose, kBodyClose] as const;
// const kAllGroupings = [...kGroupingCharacters, kFunctionDefinition, kTableDefinition] as const;
const kAllOpenings = [kFunctionDefinition, kTableDefinition, kParentheticalOpen];
const kAllClosings = [kBodyClose, kParentheticalClose];

export const GroupingNamingSchema = freeze({
  isOpening: makeIsStringInLookUpTable(kAllOpenings),
  isClosing: makeIsStringInLookUpTable(kAllClosings),
  kGroupingCharacters,
  // kAllGroupings,
  kAllClosings,
  kAllOpenings,
  kFunctionDefinition,
  kTableDefinition,
  kParentheticalOpen,
  kParentheticalClose,
  kBodyClose
});

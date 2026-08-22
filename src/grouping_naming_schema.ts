import { Helpers } from './helpers';

const { freeze, makeIsStringInLookUpTable } = Helpers;

const kFunctionDefinition = 'fn';
const kTableDefinition = 'tbl';
const kParentheticalOpen = '(';
const kParentheticalClose = ')';
const kBodyClose = '~';
const kGroupingCharacters = [kParentheticalOpen, kParentheticalClose, kBodyClose] as const;
const kAllGroupings = [...kGroupingCharacters, kFunctionDefinition, kTableDefinition] as const;

export const GroupingNamingSchema = freeze({
  isGrouping: makeIsStringInLookUpTable(kAllGroupings),
  kGroupingCharacters,
  kAllGroupings,
  kFunctionDefinition,
  kTableDefinition,
  kParentheticalOpen,
  kParentheticalClose,
  kBodyClose
});

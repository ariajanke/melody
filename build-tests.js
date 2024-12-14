// make a shell script that:
// finds all '.ts' files minus "definition" files
// build the import file content
// bundle/build/compile the tests
import './tests/globals';
import './tests/ast_build_tests';
import './tests/ast_build/tree_part_build_tests';
// import './tests/ast_fringe_node_tests';
import './tests/interpreter_tests';
import './tests/persistent_stack_tests';
import './tests/tokenization_tests';
import './tests/tokenization/character_class_tests';
import './tests/tokenization/character_crawler_tests';
import './tests/tokenization/crawl_strategies_tests';
import './tests/ast_build/close_position_retrieval_tests';
import './tests/operative_statement_builder_tests';
import './tests/ast_build/fn_close_position_retrieval_tests';
import './src/wasm_compilation';
import './tests/wasm_compilation/wasm_helpers_tests';

import './tests/wasm_compilation/type_signature_tracker_tests';
import './tests/wasm_compilation/wasm_code_section_tests';
import './tests/wasm_compilation/wasm_exports_section_tests';
import './tests/wasm_compilation/wasm_functions_section_tests';
import './tests/wasm_compilation/wasm_imports_section_tests';
import './tests/wasm_compilation/wasm_types_section_tests';
import './tests/context_type_retrieval_tests';
import './tests/puts_function_look_up_table_tests';

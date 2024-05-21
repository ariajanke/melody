(() => {
  // src/helpers.ts
  var kDebugMode = globalThis["debug_mode"] ?? false;
  var Helpers = Object.freeze({
    expose,
    freeze: !kDebugMode ? Object.freeze : pass,
    mapValues,
    depthOneCopy,
    memoize,
    kInTestEnvironment: kDebugMode
  });
  expose({ Helpers });
  var TypeCheckable = (() => {
    function make2() {
      const kTypeKey = Symbol();
      function hasCreated(thing) {
        return thing?.type() === kTypeKey;
      }
      function type() {
        return kTypeKey;
      }
      return Helpers.freeze({ hasCreated, type });
    }
    return Helpers.freeze({
      make: make2
    });
  })();
  function pass(arg) {
    return arg;
  }
  function forEachKeyIn(obj, fn) {
    Object.getOwnPropertySymbols(obj).forEach(fn);
    Object.getOwnPropertyNames(obj).forEach(fn);
  }
  function mapValues(obj, fn) {
    const transformedObj = obj;
    forEachKeyIn(obj, (key) => {
      transformedObj[key] = fn(obj[key], key);
    });
    return transformedObj;
  }
  function depthOneCopy(obj) {
    const copy = {};
    forEachKeyIn(obj, (key) => {
      copy[key] = obj[key];
    });
    return copy;
  }
  function expose(braceEnclosedVar) {
    const setToWindow = (k) => {
      if (typeof window === "undefined")
        return;
      window[k] = braceEnclosedVar[k];
    };
    return Object.keys(braceEnclosedVar).forEach(setToWindow);
  }
  function memoize(fn) {
    let get = () => {
      const v = fn();
      get = () => v;
      return v;
    };
    return () => get();
  }

  // tests/test_helpers.ts
  var { freeze } = Helpers;
  var TestHelpers = freeze({
    describeNamed,
    fdescribeNamed
  });
  function describeNamed(obj, descFn) {
    describe(Object.keys(obj)[0], descFn);
  }
  function fdescribeNamed(obj, descFn) {
    fdescribe(Object.keys(obj)[0], descFn);
  }

  // src/character_class.ts
  var CharacterClass = (() => {
    const { freeze: freeze9, assign } = Object;
    const classes = freeze9({
      numeric: Symbol(),
      alphabetic: Symbol(),
      operative: Symbol(),
      spacious: Symbol(),
      newLine: Symbol(),
      literal: Symbol()
    });
    function arrayAsCharacterSetFor(arr, characterClass) {
      return arr.map((k) => ({ [k]: characterClass })).reduce(assign);
    }
    const kCharacterToCharacterClass = assign(
      {},
      // arrayAsCharacterSetFor(
      //   [
      //     '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
      //   ],
      //   classes.numeric),
      arrayAsCharacterSetFor(
        [
          "=",
          ":",
          ",",
          ".",
          "(",
          ")",
          "{",
          "}"
        ],
        classes.operative
      ),
      arrayAsCharacterSetFor(
        [
          " ",
          "	",
          "\r"
        ],
        classes.spacious
      ),
      arrayAsCharacterSetFor(
        [
          "'"
        ],
        classes.literal
      ),
      arrayAsCharacterSetFor(["\n"], classes.newLine)
    );
    function classOf(character) {
      if (character.length !== 1) {
        throw Error(`"${character}" is not one character`);
      }
      switch (character) {
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          return classes.numeric;
        default:
          break;
      }
      return kCharacterToCharacterClass[character] ?? classes.alphabetic;
    }
    return freeze9({
      classes,
      classOf
    });
  })();

  // src/crawl_strategies.ts
  var CrawlStrategies = (() => {
    const { freeze: freeze9 } = Object;
    const { classes, classOf } = CharacterClass;
    function crawlAlphanumeric(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        switch (classOf(input[i])) {
          case classes.operative:
          case classes.spacious:
          case classes.literal:
          case classes.newLine:
            return i;
          default:
            break;
        }
      }
      return length;
    }
    function crawlStringLiteral(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        if (classOf(input[i]) === classes.literal) {
          return i + 1;
        }
      }
      return length;
    }
    function crawlOperator(input, start) {
      if (start + 1 >= input.length) {
        return start + 1;
      } else if (input[start + 1] === "=" && input[start] !== "=") {
        return start + 2;
      }
      return start + 1;
    }
    function crawlSpace(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        switch (classOf(input[i])) {
          case classes.alphabetic:
          case classes.numeric:
          case classes.operative:
          case classes.literal:
          case classes.newLine:
            return i;
          default:
            break;
        }
      }
      return length;
    }
    function crawlNewLines(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        if (classOf(input[i]) !== classes.newLine) {
          return i;
        }
      }
      return length;
    }
    return freeze9({
      [classes.alphabetic]: crawlAlphanumeric,
      [classes.literal]: crawlStringLiteral,
      [classes.operative]: crawlOperator,
      [classes.numeric]: crawlAlphanumeric,
      [classes.spacious]: crawlSpace,
      [classes.newLine]: crawlNewLines
    });
  })();

  // src/token.ts
  var { freeze: freeze2 } = Object;
  var TokenType = Object.freeze({
    declareFunction: Symbol(),
    operator: Symbol(),
    stringLiteral: Symbol(),
    newLine: Symbol(),
    identifier: Symbol()
  });
  var Token = (() => {
    function unimplemented(desc) {
      return () => {
        throw Error(`Cannot call ${desc} unimplemented`);
      };
    }
    const kBlankToken = freeze2({
      type: unimplemented("type"),
      // TODO: try to get rid of this hack, blank token should
      // never be used
      content: () => "",
      //unimplemented<string>('content'),
      start: unimplemented("start"),
      end: unimplemented("end")
    });
    function identifyNonKeyword(token) {
      const firstChar = token[0];
      switch (firstChar) {
        case "'":
          return TokenType.stringLiteral;
        case "\n":
          return TokenType.newLine;
        case " ":
        case "	":
        case "\r":
          throw Error("cannot build token from whitespace");
      }
      return TokenType.identifier;
    }
    const controlSeqs = {
      ["fn"]: TokenType.declareFunction,
      ["{"]: TokenType.operator,
      ["}"]: TokenType.operator,
      ["("]: TokenType.operator,
      [")"]: TokenType.operator,
      [","]: TokenType.operator,
      [":="]: TokenType.operator
    };
    function makeFromStringOnly(mContents) {
      return construct(mContents, 0, 0);
    }
    function make2(mInput, mStart, mEnd) {
      return construct(mInput.substring(mStart, mEnd), mStart, mEnd);
    }
    function construct(mTokenContent, mStart, mEnd) {
      const mType = controlSeqs[mTokenContent] ?? identifyNonKeyword(mTokenContent);
      function content() {
        return mTokenContent;
      }
      function start() {
        return mStart;
      }
      function end() {
        return mEnd;
      }
      function type() {
        return mType;
      }
      return freeze2({ content, start, end, type });
    }
    return freeze2({
      make: make2,
      types: TokenType,
      kBlankToken,
      forTesting: { makeFromStringOnly }
    });
  })();

  // src/character_crawler.ts
  var CharacterCrawler = (() => {
    const { freeze: freeze9 } = Object;
    const injections2 = freeze9({
      CrawlStrategies,
      characterClassOf: CharacterClass.classOf,
      characterClasses: CharacterClass.classes
    });
    function make2(mInput, { CrawlStrategies: CrawlStrategies2, characterClassOf, characterClasses } = injections2) {
      const inst = freeze9({ reachedEnd, readToken, crawl });
      let mStart = 0;
      let mEnd = 0;
      let mReadToken = Token.kBlankToken;
      function readToken() {
        return mReadToken;
      }
      function reachedEnd() {
        return mEnd === mInput.length;
      }
      function crawledThrough() {
        if (mStart >= mInput.length) {
          throw Error("Cannot crawl at end of string");
        }
        const charClass = characterClassOf(mInput[mEnd]);
        if (mReadToken.content() !== "" && charClass !== characterClasses.spacious) {
          return;
        }
        const crawlFn = CrawlStrategies2[charClass];
        const next = crawlFn(mInput, mEnd);
        if (next <= mEnd) {
          throw Error("progression failed");
        }
        mEnd = next;
        if (charClass !== characterClasses.spacious) {
          mReadToken = Token.make(mInput, mStart, mEnd);
        }
        mStart = mEnd;
        return;
      }
      function crawl() {
        mReadToken = Token.kBlankToken;
        while (mReadToken.content() === "") {
          crawledThrough();
        }
        if (mStart < mInput.length) {
          crawledThrough();
        }
        return inst;
      }
      return inst;
    }
    return freeze9({ make: make2 });
  })();

  // src/tokenization.ts
  var { freeze: freeze3 } = Object;
  var TokenCollection = (() => {
    function verifyNoTwoContiguousNewLineTokens(mTokens) {
      const { length } = mTokens;
      if (length < 2)
        return;
      for (let i = 1; i < length; ++i) {
        if (mTokens[i].type() === Token.types.newLine && mTokens[i - 1].type() === Token.types.newLine) {
          throw Error(`Contiguous new lines not allowed near element ${i}`);
        }
      }
    }
    function make2(mTokens) {
      const mLength = mTokens.length;
      verifyNoTwoContiguousNewLineTokens(mTokens);
      function count() {
        return mLength;
      }
      function at(i) {
        return mTokens[i];
      }
      function forEach(fn) {
        mTokens.forEach((token) => fn(token.content()));
      }
      return freeze3({ count, at, forEach });
    }
    return freeze3({ make: make2 });
  })();
  var Tokenization = (() => {
    const injections2 = freeze3({ CharacterCrawler });
    function make2({ CharacterCrawler: CharacterCrawler2 } = injections2) {
      function tokenize(inp) {
        const rv = [];
        const crawler = CharacterCrawler2.make(inp);
        while (!crawler.reachedEnd()) {
          const readToken = crawler.crawl().readToken();
          rv.push(readToken);
        }
        return TokenCollection.make(rv);
      }
      return freeze3({ tokenize });
    }
    return freeze3({ make: make2 });
  })();

  // tests/tokenization_tests.ts
  var { describeNamed: describeNamed2 } = TestHelpers;
  describeNamed2({ Tokenization }, () => {
    const getTokens = (inp) => {
      const strings = [];
      Tokenization.make().tokenize(inp).forEach((str) => strings.push(str));
      return strings;
    };
    it("splits a hello world program", () => {
      expect(getTokens("puts('hello')")).toEqual(["puts", "(", "'hello'", ")"]);
    });
    describe("operators", () => {
      [
        [":==", [":=", "="]],
        ["===", ["=", "=", "="]],
        ["n := p", ["n", ":=", "p"]],
        ["n:=p", ["n", ":=", "p"]],
        ["n=p", ["n", "=", "p"]]
      ].forEach((pair) => {
        const [toSplit, expectedSplit] = pair;
        it(`splits "${toSplit}" correctly`, () => {
          expect(getTokens(toSplit)).toEqual(expectedSplit);
        });
      });
    });
    describe("whitespace", () => {
      [
        ["new lines", "a\nb\n\nc", ["a", "\n", "b", "\n\n", "c"]],
        [
          "spaces",
          "puts ('hello',   'world')  ",
          ["puts", "(", "'hello'", ",", "'world'", ")"]
        ],
        ["mixed with tabs", "n	:= 	p", ["n", ":=", "p"]]
      ].forEach((tuple) => {
        const [desc, toSplit, expectedSplit] = tuple;
        it(`splits "${desc}" correctly`, () => {
          expect(getTokens(toSplit)).toEqual(expectedSplit);
        });
      });
    });
  });

  // src/ast_node.ts
  var { freeze: freeze4 } = Object;
  var AstNode = freeze4({
    types: {
      functionCall: Symbol(),
      tuple: Symbol(),
      stringLiteral: Symbol(),
      identifier: Symbol(),
      letDeclaration: Symbol(),
      assignment: Symbol()
    }
  });
  var AstNodeVisitor = (() => {
    const kDefaultImplementations = (() => {
      function visitFunctionCall(_0) {
      }
      function visitAssignment(_0, _1) {
      }
      function visitLetDeclaration(_0) {
      }
      return freeze4({ visitAssignment, visitFunctionCall, visitLetDeclaration });
    })();
    function makeFakeVisitor({
      visitAssignment,
      visitFunctionCall,
      visitLetDeclaration
    }) {
      const defaults = kDefaultImplementations;
      return freeze4({
        visitAssignment: visitAssignment ?? defaults.visitAssignment,
        visitFunctionCall: visitFunctionCall ?? defaults.visitFunctionCall,
        visitLetDeclaration: visitLetDeclaration ?? defaults.visitLetDeclaration
      });
    }
    return freeze4({ makeFakeVisitor });
  })();

  // src/ast_tuple_node.ts
  var AstTupleNode = (() => {
    const { freeze: freeze9 } = Object;
    const tupleType = AstNode.types.tuple;
    function makeBinary(lhs, rhs) {
      return makeWithPair(lhs, rhs);
    }
    function makeUnary(lhs) {
      return makeWithPair(lhs, void 0);
    }
    function makeWithPair(lhs, rhs) {
      const mSubExpressions = [lhs];
      const inst = make2(mSubExpressions);
      if (rhs && inst.mergeWith(rhs)) {
        mSubExpressions.push(rhs);
      }
      return inst;
    }
    function make2(mSubExpressions) {
      const inst = freeze9({ forEach, count, visit, type, mergeWith });
      function forEach(fn) {
        mSubExpressions.forEach((node) => fn(node));
      }
      function count() {
        return mSubExpressions.length;
      }
      function visit(visitor) {
        mSubExpressions.forEach((node) => {
          node.visit(visitor);
        });
      }
      function type() {
        return tupleType;
      }
      function mergeWith(node) {
        if (node.type() !== tupleType) {
          return node;
        }
        node.forEach((subNode) => {
          mSubExpressions.push(subNode);
        });
        return void 0;
      }
      return inst;
    }
    return freeze9({ makeBinary, makeUnary, make: make2 });
  })();

  // src/partial_tree_next_token_build.ts
  var PartialTreeNextTokenBuild = (() => {
    const { freeze: freeze9 } = Object;
    const { memoize: memoize2 } = Helpers;
    const kCloseMapping = freeze9({
      ["("]: ")"
    });
    function make2(mTokens, mStart, mEnd, mFindCloseBasedOn) {
      let mError = () => {
      };
      const { lineContinuationScheme } = PartialTreeBuild;
      const closeMapping = kCloseMapping[mFindCloseBasedOn];
      const lineCont = closeMapping ? lineContinuationScheme.inGroup : lineContinuationScheme.operatorContinued;
      const closePosition = memoize2(() => {
        if (!closeMapping) {
          return mEnd;
        }
        const count = mTokens.count();
        for (let i = mStart; i < count; ++i) {
          if (mTokens.at(i).content() === closeMapping) {
            return i;
          }
        }
        mError = memoize2(() => freeze9({
          message: `Cannot find close position for ${mFindCloseBasedOn}`
        }));
        return void 0;
      });
      const unprocessedPart = memoize2(() => {
        const pos = closePosition();
        if (!pos)
          return void 0;
        return PartialTreeBuild.makeAssumeNotNewLine(mTokens, mStart, pos, lineCont);
      });
      const remainingRange = memoize2(() => {
        const pos = closePosition();
        if (!pos) {
          throw Error("call and test against unprocessedPart first");
        }
        return [Math.min(mEnd, pos + 1), mEnd];
      });
      function error() {
        return mError();
      }
      return freeze9({ unprocessedPart, remainingRange, error });
    }
    return freeze9({ make: make2 });
  })();

  // src/node_expansion.ts
  var { freeze: freeze5 } = Helpers;
  var NodeExpansion = (() => {
    const { freeze: freeze9, kInTestEnvironment } = Helpers;
    function visit(_0) {
    }
    function verifyInTesting() {
      if (kInTestEnvironment)
        return;
      throw Error("Cannot be called outside of a testing environment");
    }
    function makeBase() {
      const { type, hasCreated } = TypeCheckable.make();
      return freeze9({ hasCreated, type, freeze: freeze9, visit, verifyInTesting });
    }
    return freeze9({ makeBase });
  })();
  var EmptyNodeExpansion = (() => {
    const { type, hasCreated, visit } = NodeExpansion.makeBase();
    const kEmpty = [];
    function expandIntoNodes(_0) {
      return kEmpty;
    }
    const sharedInst = freeze5({
      expandIntoNodes,
      type,
      visit
    });
    function make2() {
      return sharedInst;
    }
    return freeze5({ make: make2, hasCreated });
  })();

  // src/start_group_node_expansion.ts
  var BareLeftTreePartHandler = (() => {
    const { freeze: freeze9 } = Object;
    const kSharedInst = freeze9({ handleLeftSide, visit });
    function handleLeftSide(nodes) {
      return nodes;
    }
    function visit(leftPart, visitor) {
      visitor.visitRemainingPart(leftPart);
    }
    function make2() {
      return kSharedInst;
    }
    return freeze9({ make: make2 });
  })();
  var IncompleteNodeLeftTreePartHandler = (() => {
    const { freeze: freeze9 } = Object;
    function make2(incompleteNode) {
      function handleLeftSide(nodes) {
        const [head, ...tail] = nodes;
        if (!head) {
          return [];
        }
        return [incompleteNode.finish(head), ...tail];
      }
      function visit(leftPart, visitor) {
        visitor.visitIncomplete(incompleteNode, leftPart);
      }
      return freeze9({ handleLeftSide, visit });
    }
    return freeze9({ make: make2 });
  })();
  var StartGroupNodeExpansion = (() => {
    const { freeze: freeze9 } = Object;
    function make2(leftPartHandler, leftPart, rightPart) {
      const {
        type,
        verifyInTesting
      } = NodeExpansion.makeBase();
      function expandIntoNodes(fn) {
        return [
          ...leftPartHandler.handleLeftSide(fn(leftPart)),
          //base.expandIntoNodes(fn),
          ...fn(rightPart)
        ];
      }
      function visit(visitor) {
        verifyInTesting();
        leftPartHandler.visit(leftPart, visitor);
        visitor.visitRemainingPart(rightPart);
      }
      return freeze9({ expandIntoNodes, type, visit });
    }
    return freeze9({ make: make2 });
  })();

  // src/partial_tree_start_group_build.ts
  var PartialTreeStartGroupBuild = (() => {
    const { memoize: memoize2, freeze: freeze9 } = Helpers;
    function skipNewLine(tokens, i) {
      if (tokens.at(i).type() === Token.types.newLine) {
        return i + 1;
      }
      return i;
    }
    function make2(mTokens, leftPartHandler, start, mEnd, closeBasedOn) {
      let mErrorFn = () => {
        return void 0;
      };
      const nextPart = memoize2(() => {
        const nextPartStart = skipNewLine(mTokens, start + 1);
        return PartialTreeNextTokenBuild.make(mTokens, nextPartStart, mEnd, closeBasedOn);
      });
      function getLeftPart() {
        return nextPart().unprocessedPart() ?? (() => {
          mErrorFn = nextPart().error;
        })();
      }
      function startGroupBuild() {
        const leftPart = getLeftPart();
        if (!leftPart) {
          return;
        }
        const remainingRange = nextPart().remainingRange();
        const rightPart = PartialTreeBuild.make(mTokens, ...remainingRange);
        return StartGroupNodeExpansion.make(leftPartHandler, leftPart, rightPart);
      }
      return freeze9({
        startGroupBuild: memoize2(startGroupBuild),
        error: () => mErrorFn()
      });
    }
    return freeze9({ make: make2, skipNewLine });
  })();

  // src/ast_stringable_node.ts
  var { freeze: freeze6 } = Object;
  var AstStringableNode = (() => {
    const tokenTypes = Token.types;
    const nodeTypes = AstNode.types;
    function _downcast(node) {
      switch (node.type()) {
        case nodeTypes.identifier:
        case nodeTypes.stringLiteral:
          return node;
        default:
          break;
      }
      return void 0;
    }
    function downcast(node) {
      return _downcast(node) ?? (() => {
        throw Error("AstNode is not a AstStringableNode");
      })();
    }
    function hasCreated(node) {
      return !!_downcast(node);
    }
    function makeForToken(token) {
      return (() => {
        switch (token.type()) {
          case tokenTypes.identifier:
            return AstIdentifierNode;
          case tokenTypes.stringLiteral:
            return AstStringLiteralNode;
          default:
            throw Error("cannot build stringable node from token");
        }
      })().make(token.content());
    }
    return freeze6({ downcast, hasCreated, makeForToken });
  })();
  function makeStringableNodeClass(nodeType) {
    function make2(value, comesBeforeOperator) {
      function visit(_0) {
      }
      function type() {
        return nodeType;
      }
      function asString() {
        return value;
      }
      return freeze6({ visit, type, asString, comesBeforeOperator });
    }
    return freeze6({ make: make2 });
  }
  var AstStringLiteralNode = (() => {
    const Super = makeStringableNodeClass(AstNode.types.stringLiteral);
    function make2(value) {
      value = (() => {
        if (value.length <= 2) {
          throw Error("not a valid string");
        }
        return value.substring(1, value.length - 1);
      })();
      function comesBeforeOperator(operator) {
        return operator.content() === ",";
      }
      return Super.make(value, comesBeforeOperator);
    }
    return freeze6({ make: make2 });
  })();
  var AstIdentifierNode = (() => {
    const Super = makeStringableNodeClass(AstNode.types.identifier);
    function make2(value) {
      function comesBeforeOperator(operator) {
        const str = operator.content();
        return str === "," || str === "(" || str === ":=";
      }
      return Super.make(value, comesBeforeOperator);
    }
    return freeze6({ make: make2 });
  })();

  // src/ast_function_call_node.ts
  var AstFunctionCallNode = (() => {
    const nodeTypes = AstNode.types;
    function make2(lhs, rhs) {
      const arguments_ = (() => {
        if (rhs.type() === nodeTypes.tuple) {
          return rhs;
        }
        return AstTupleNode.makeUnary(rhs);
      })();
      const name = (() => {
        switch (lhs.type()) {
          case nodeTypes.identifier:
          case nodeTypes.stringLiteral:
            return lhs.asString();
          default:
            throw Error("unhandled");
        }
      })();
      const inst = Object.freeze({
        name,
        arguments: arguments_,
        visit,
        type: () => nodeTypes.functionCall
      });
      function visit(visitor) {
        visitor.visitFunctionCall(inst);
      }
      return inst;
    }
    return Object.freeze({ make: make2 });
  })();

  // src/ast_assignment_node.ts
  var AstAssignmentNode = (() => {
    const { freeze: freeze9 } = Object;
    const assignmentType = AstNode.types.assignment;
    function make2(lhs, rhs) {
      const assignee = AstStringableNode.downcast(lhs);
      const inst = freeze9({ visit, type, assigneeName });
      function visit(visitor) {
        visitor.visitAssignment(inst, rhs);
      }
      function type() {
        return assignmentType;
      }
      function assigneeName() {
        return assignee.asString();
      }
      return inst;
    }
    return freeze9({ make: make2 });
  })();

  // src/ast_incomplete_binary_node.ts
  var AstIncompleteBinaryNode = (() => {
    const { freeze: freeze9 } = Object;
    function _selectedConstructor(operatorStr) {
      switch (operatorStr) {
        case "(":
          return AstFunctionCallNode.make;
        case ",":
        case "\n":
          return AstTupleNode.makeBinary;
        case ":=":
          return AstAssignmentNode.make;
        default:
          break;
      }
      throw Error(`Token ${operatorStr} does not result in a binary operator`);
    }
    function makeForOperator(operatorStr, lhs) {
      const fn = _selectedConstructor(operatorStr);
      return make2(fn, lhs);
    }
    function make2(fn, lhs) {
      function finish(rhs) {
        return fn(lhs, rhs);
      }
      function lhsAsString() {
        if (!AstStringableNode.hasCreated(lhs)) {
          return void 0;
        }
        return AstStringableNode.downcast(lhs).asString();
      }
      return freeze9({ finish, lhsAsString });
    }
    return freeze9({ make: make2, makeForOperator });
  })();

  // src/partial_tree_start_identifier_build.ts
  var SingleNodeCombiner = (() => {
    const { freeze: freeze9 } = Object;
    function make2(node) {
      const { type, visit } = NodeExpansion.makeBase();
      function expandIntoNodes(_0) {
        return [node];
      }
      return freeze9({ expandIntoNodes, type, visit });
    }
    return freeze9({ make: make2 });
  })();
  var SingleNodeCombinerWithRemaining = (() => {
    const { freeze: freeze9 } = Object;
    function make2(node, remainingPart) {
      const { type, verifyInTesting } = NodeExpansion.makeBase();
      function expandIntoNodes(fn) {
        return [
          node,
          ...fn(remainingPart)
        ];
      }
      function visit(visitor) {
        verifyInTesting();
        visitor.visitComplete(node, remainingPart);
      }
      return freeze9({ expandIntoNodes, type, visit });
    }
    return freeze9({ make: make2 });
  })();
  var PartialTreeStartIdentifierBuild = (() => {
    const { freeze: freeze9 } = Object;
    const { skipNewLine } = PartialTreeStartGroupBuild;
    const tokenTypes = Token.types;
    const makeStringableNodeFor = AstStringableNode.makeForToken;
    function make2(mTokens, mStart, mEnd, mLineContScheme) {
      if (mStart === mEnd) {
        throw Error("");
      }
      const { lineContinuationScheme } = PartialTreeBuild;
      let mErrorFn = () => {
        return void 0;
      };
      function build() {
        const lhsNode = makeStringableNodeFor(mTokens.at(mStart));
        if (mEnd - mStart === 1) {
          return SingleNodeCombiner.make(lhsNode);
        }
        const nextPos = mLineContScheme === lineContinuationScheme.inGroup ? skipNewLine(mTokens, mStart + 1) : mStart + 1;
        const next = mTokens.at(nextPos);
        if (next.type() === tokenTypes.operator) {
          if (!lhsNode.comesBeforeOperator(next)) {
            mErrorFn = () => freeze9({ message: `operator "${next.content()}" not allowed here` });
            return;
          }
          const incompleteNode = AstIncompleteBinaryNode.makeForOperator(next.content(), lhsNode);
          const group = PartialTreeStartGroupBuild.make(mTokens, IncompleteNodeLeftTreePartHandler.make(incompleteNode), nextPos, mEnd, next.content());
          const built = group.startGroupBuild();
          if (built)
            return built;
          mErrorFn = group.error;
          return;
        } else if (next.type() === tokenTypes.newLine) {
          if (mLineContScheme === lineContinuationScheme.normal) {
            return SingleNodeCombiner.make(lhsNode);
          }
          if (mLineContScheme !== lineContinuationScheme.operatorContinued) {
            throw Error("impossible branch??");
          }
          const { normal } = PartialTreeBuild.lineContinuationScheme;
          const remaining = PartialTreeBuild.make(mTokens, nextPos + 1, mEnd, normal);
          return SingleNodeCombinerWithRemaining.make(lhsNode, remaining);
        } else {
          mErrorFn = () => freeze9({
            message: `not sure how to handle token "${next.content()}"`
          });
          return;
        }
      }
      return freeze9({ build, error: () => mErrorFn() });
    }
    return freeze9({ make: make2 });
  })();

  // src/partial_tree_build.ts
  var { freeze: freeze7 } = Object;
  var PartialTreeBuild = (() => {
    const tokenTypes = Token.types;
    const lineContinuationScheme = freeze7({
      inGroup: Symbol(),
      operatorContinued: Symbol(),
      normal: Symbol()
    });
    const { skipNewLine } = PartialTreeStartGroupBuild;
    function make2(mTokens, mStart, mEnd, mLineContScheme = lineContinuationScheme.normal) {
      return construct(mTokens, mStart, mEnd, mLineContScheme);
    }
    function makeAssumeNotNewLine(mTokens, mStart, mEnd, mLineContScheme) {
      return construct(mTokens, mStart, mEnd, mLineContScheme);
    }
    function construct(mTokens, mStart, mEnd, mLineContScheme) {
      let mErrorFn = () => {
        return void 0;
      };
      function _fromGroupStart(start, closeBasedOn) {
        const group = PartialTreeStartGroupBuild.make(mTokens, BareLeftTreePartHandler.make(), start, mEnd, closeBasedOn);
        const built = group.startGroupBuild();
        if (built)
          return built;
        mErrorFn = group.error;
        return;
      }
      function ignoresNewLines() {
        return mLineContScheme !== lineContinuationScheme.normal;
      }
      function buildPart() {
        if (mStart === mEnd) {
          return EmptyNodeExpansion.make();
        }
        const startPos = skipNewLine(mTokens, mStart);
        if (startPos === mEnd) {
          return EmptyNodeExpansion.make();
        }
        const start = mTokens.at(startPos);
        if (start.type() === tokenTypes.identifier || start.type() === tokenTypes.stringLiteral) {
          const ptsib = PartialTreeStartIdentifierBuild.make(mTokens, startPos, mEnd, mLineContScheme);
          const built = ptsib.build();
          if (built)
            return built;
          mErrorFn = ptsib.error;
          return;
        } else if (start.content() == "(") {
          if (startPos + 1 < mEnd) {
            return _fromGroupStart(startPos, start.content());
          }
          mErrorFn = () => freeze7({
            message: "end of input reached before being able to close"
          });
          return;
        }
        mErrorFn = () => freeze7({
          message: "unimplemented case"
        });
      }
      function error() {
        return mErrorFn();
      }
      return freeze7({
        buildPart,
        ignoresNewLines,
        error,
        db: { mLineContScheme, mStart, mEnd }
      });
    }
    return freeze7({
      makeAssumeNotNewLine,
      make: make2,
      // kNothing,
      lineContinuationScheme,
      skipNewLine
    });
  })();

  // src/ast_build.ts
  var AstBuild = (() => {
    const { freeze: freeze9 } = Object;
    const mErrors = [];
    function buildProgramSequence(partBuild) {
      const part = partBuild.buildPart();
      if (!part) {
        mErrors.push(partBuild.error());
        return [];
      }
      return part.expandIntoNodes(buildProgramSequence);
    }
    function buildFor2(tokens) {
      const partBuild = PartialTreeBuild.make(tokens, 0, tokens.count());
      const res = buildProgramSequence(partBuild).map((n) => n);
      return AstTupleNode.make(res);
    }
    return freeze9({ buildFor: buildFor2, testable: { buildProgramSequence } });
  })();

  // tests/ast_build_tests.ts
  var { describeNamed: describeNamed3 } = TestHelpers;
  describeNamed3({ AstBuild }, () => {
    const makeToken = Token.forTesting.makeFromStringOnly;
    describe("builds a mutli-line ast", () => {
      let tokens = [];
      const buildAst = () => AstBuild.buildFor(TokenCollection.make(tokens));
      it("builds two function calls", () => {
        tokens = [
          makeToken("puts"),
          makeToken("("),
          makeToken("a"),
          makeToken(")"),
          makeToken("\n"),
          makeToken("puts"),
          makeToken("("),
          makeToken("a"),
          makeToken(")"),
          makeToken("\n")
        ];
        let i = 0;
        const visitor = AstNodeVisitor.makeFakeVisitor({
          visitFunctionCall: (_0) => {
            ++i;
          }
        });
        buildAst().visit(visitor);
        expect(i).toEqual(2);
      });
      it("two lines, operator first, call second", () => {
        tokens = [
          makeToken("\n"),
          makeToken("a"),
          makeToken(","),
          makeToken("b"),
          makeToken("\n"),
          makeToken("puts"),
          makeToken("("),
          makeToken("a"),
          makeToken(")"),
          makeToken("\n")
        ];
        let i = 0;
        const visitor = AstNodeVisitor.makeFakeVisitor({
          visitFunctionCall: (_0) => {
            ++i;
          }
        });
        buildAst().visit(visitor);
        expect(i).toEqual(1);
      });
    });
  });

  // tests/character_class_tests.ts
  var { describeNamed: describeNamed4 } = TestHelpers;
  describeNamed4({ CharacterClass }, () => {
    describe(".classOf", () => {
      const { classOf, classes } = CharacterClass;
      it("numeric", () => {
        expect(classOf("1")).toEqual(classes.numeric);
      });
      it("alphabetic", () => {
        expect(classOf("q")).toEqual(classes.alphabetic);
      });
      it("operative", () => {
        expect(classOf(",")).toEqual(classes.operative);
      });
      it("spacious", () => {
        expect(classOf("	")).toEqual(classes.spacious);
      });
      it("new line", () => {
        expect(classOf("\n")).toEqual(classes.newLine);
      });
    });
  });

  // tests/character_crawler_tests.ts
  var { describeNamed: describeNamed5 } = TestHelpers;
  describeNamed5({ CharacterCrawler }, () => {
    it('crawls an operator ":="', () => {
      const crawler = CharacterCrawler.make(":=");
      const token = crawler.crawl().readToken().content();
      expect(token).toEqual(":=");
    });
    it("skips whitespace", () => {
      const crawler = CharacterCrawler.make("   :=");
      const token = crawler.crawl().readToken().content();
      expect(token).toEqual(":=");
    });
    it("treats trailing whitespace as having reached the end", () => {
      const crawler = CharacterCrawler.make("a  ");
      crawler.crawl().readToken();
      expect(crawler.reachedEnd()).toBeTruthy();
    });
    it("crawls through the next token", () => {
      const crawler = CharacterCrawler.make("puts('hello')");
      const token = crawler.crawl().crawl().readToken().content();
      expect(token).toEqual("(");
    });
  });

  // tests/crawl_strategies_tests.ts
  var { describeNamed: describeNamed6 } = TestHelpers;
  describeNamed6({ CrawlStrategies }, () => {
    const { alphabetic, literal, operative, spacious } = CharacterClass.classes;
    const crawlAlphanumeric = CrawlStrategies[alphabetic];
    const crawlOperator = CrawlStrategies[operative];
    const crawlStringLiteral = CrawlStrategies[literal];
    const crawlSpace = CrawlStrategies[spacious];
    describeNamed6({ crawlAlphanumeric }, () => {
      [
        ["asdf", "end"],
        ["asdf ", "spaces"],
        ["asdf=", "operators"],
        ["asdf'", "quotations"],
        ["asdf\n", "new line"]
      ].forEach((pair) => {
        const [test, desc] = pair;
        it(`stops at ${desc}`, () => {
          expect(crawlAlphanumeric(test, 0)).toEqual(4);
        });
      });
      it("stops at end with numbers", () => {
        const str = "asdf123";
        expect(crawlAlphanumeric(str, 0)).toEqual(str.length);
      });
    });
    describeNamed6({ crawlOperator }, () => {
      [
        [":=", "re-assignable", 2],
        ["= ", "assignment", 1],
        ["+=", "accumulate", 2],
        ["==", "two assignments", 1],
        [",,", "commas", 1],
        ["((", "parens", 1]
      ].forEach((tuple) => {
        const [test, desc, expected] = tuple;
        it(`crawls out a: ${desc}`, () => {
          expect(crawlOperator(test, 0)).toEqual(expected);
        });
      });
    });
    describeNamed6({ crawlSpace }, () => {
      [
        ["  a", "alphabetic"],
        ["  ", "end"],
        ["	\r=", "at operator with other whitespace"],
        ["  +", "operator"],
        ["  1", "numeric"],
        ["  \n", "new line"]
      ].forEach((pair) => {
        const [test, desc] = pair;
        it(`stops at ${desc}`, () => {
          expect(crawlSpace(test, 0)).toEqual(2);
        });
      });
    });
    describeNamed6({ crawlStringLiteral }, () => {
      it(`crawls stopping at nothing but another "'"`, () => {
        const str = `'hello {" \\\\''`;
        const end = crawlStringLiteral(str, 0);
        expect(str.substring(0, end)).toEqual(`'hello {" \\\\'`);
      });
    });
  });

  // src/context.ts
  var Context = (() => {
    const { freeze: freeze9 } = Object;
    function make2() {
      const mAvailableVariables = {};
      function declareVariable(name, value) {
        if (mAvailableVariables[name]) {
          throw Error(`name "${name}" already taken`);
        }
        mAvailableVariables[name] = value;
      }
      function setVariable(name, value) {
        mAvailableVariables[name] = value;
      }
      function getValueOfVariable(name) {
        return mAvailableVariables[name];
      }
      return freeze9({ declareVariable, getValueOfVariable, setVariable });
    }
    return freeze9({ make: make2 });
  })();

  // src/interpreter.ts
  var { freeze: freeze8 } = Object;
  var Interpreter = freeze8({ make, buildFor });
  var injections = freeze8({ putsFunction: console.log });
  function make(context = Context.make(), { putsFunction } = injections) {
    const nodeTypes = AstNode.types;
    function visitFunctionCall(node) {
      if (node.name === "puts") {
        node.arguments.forEach((node2) => {
          putsFunction(getValueOf(node2));
        });
      }
    }
    function getValueOf(node) {
      const val = node.asString();
      switch (node.type()) {
        case nodeTypes.stringLiteral:
          return val;
        case nodeTypes.identifier:
          return context.getValueOfVariable(val) ?? (() => {
            throw Error(`variable ${val} not declared`);
          })();
        default:
          break;
      }
      throw Error("impossible branch??");
    }
    function visitLetDeclaration(_0) {
    }
    function visitAssignment(node, rhs) {
      context.setVariable(node.assigneeName(), getValueOf(rhs));
    }
    return freeze8({ visitFunctionCall, visitLetDeclaration, visitAssignment });
  }
  function buildFor(inp) {
    const tokenCollection = Tokenization.make().tokenize(inp);
    return AstBuild.buildFor(tokenCollection);
  }
  Helpers.expose({ Interpreter });

  // tests/interpreter_tests.ts
  var { describeNamed: describeNamed7 } = TestHelpers;
  describeNamed7({ Interpreter }, () => {
    function makePutsFunction() {
      const printedStrings = [];
      const putsFunction = (str) => {
        printedStrings.push(str);
      };
      const injections2 = { putsFunction };
      return { injections: injections2, printedStrings };
    }
    function makeWithInjections(injections2) {
      return Interpreter.make(Context.make(), injections2);
    }
    describe("integration specs", () => {
      it('compiles and runs a "hello world!" program', () => {
        const programRootNode = Interpreter.buildFor("puts('hello', ' world!')");
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const interpreter = makeWithInjections(injections2);
        programRootNode.visit(interpreter);
        expect(printedStrings).toEqual(["hello", " world!"]);
      });
      it('compiles and runs a "hello world!" program with a variable', () => {
        const context = Context.make();
        context.declareVariable("foo", "hello world!");
        const programRootNode = Interpreter.buildFor("puts(foo)");
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const interpreter = Interpreter.make(context, injections2);
        programRootNode.visit(interpreter);
        expect(printedStrings).toEqual(["hello world!"]);
      });
      it('compiles and runs a multiline "hello world!" program', () => {
        const programRootNode = Interpreter.buildFor("puts('hello')\nputs('world!')");
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const interpreter = makeWithInjections(injections2);
        programRootNode.visit(interpreter);
        expect(printedStrings).toEqual(["hello", "world!"]);
      });
      it('compiles and runs a "hello world!" program with an assignment', () => {
        const programRootNode = Interpreter.buildFor(`
        foo := 'hello world!'
        puts(foo)
      `);
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const intr = makeWithInjections(injections2);
        programRootNode.visit(intr);
        expect(printedStrings).toEqual(["hello world!"]);
      });
    });
  });

  // tests/ast_assignment_node_tests.ts
  var { describeNamed: describeNamed8 } = TestHelpers;
  describeNamed8({ AstAssignmentNode }, () => {
    const { make: make2 } = AstAssignmentNode;
    const makeIdentifier = AstIdentifierNode.make;
    it("is reachable by visitor", () => {
      let mustBeTrue = false;
      const visitor = AstNodeVisitor.makeFakeVisitor({
        visitAssignment: (_0, _1) => {
          mustBeTrue = true;
        }
      });
      make2(makeIdentifier(""), makeIdentifier("")).visit(visitor);
      expect(mustBeTrue).toBeTruthy();
    });
    it("reports self as an assignment node type", () => {
      const type = make2(makeIdentifier(""), makeIdentifier("")).type();
      expect(type).toEqual(AstNode.types.assignment);
    });
    it("maybe visited for assigee name", () => {
      let assigneeName = "";
      const visitor = AstNodeVisitor.makeFakeVisitor({
        visitAssignment: (node, _0) => {
          assigneeName = node.assigneeName();
        }
      });
      make2(makeIdentifier("foo"), makeIdentifier("")).visit(visitor);
      expect(assigneeName).toEqual("foo");
    });
    it("throws exception on attempt to instantiate with non-stringable node", () => {
      const tuple = AstTupleNode.make([]);
      expect(() => {
        make2(tuple, makeIdentifier(""));
      }).toThrowError();
    });
  });

  // tests/ast_incomplete_binary_node_tests.ts
  var { describeNamed: describeNamed9 } = TestHelpers;
  describeNamed9({ AstIncompleteBinaryNode }, () => {
    const { makeForOperator } = AstIncompleteBinaryNode;
    function makeAnyNode() {
      return AstIdentifierNode.make("");
    }
    function makeForOperatorWithAnyNodes(operator) {
      return makeForOperator(operator, makeAnyNode()).finish(makeAnyNode());
    }
    it("defers creation of a function call", () => {
      const createdType = makeForOperatorWithAnyNodes("(").type();
      expect(createdType).toEqual(AstNode.types.functionCall);
    });
    it("defers creation of a tuple", () => {
      const createdType = makeForOperatorWithAnyNodes(",").type();
      expect(createdType).toEqual(AstNode.types.tuple);
    });
    it("defers creation of an assignment", () => {
      const createdType = makeForOperatorWithAnyNodes(":=").type();
      expect(createdType).toEqual(AstNode.types.assignment);
    });
  });

  // tests/partial_tree_build_tests.ts
  var { describeNamed: describeNamed10 } = TestHelpers;
  describeNamed10({ PartialTreeBuild }, () => {
    const makeToken = Token.forTesting.makeFromStringOnly;
    const { buildProgramSequence } = AstBuild.testable;
    const make2 = (tokens) => PartialTreeBuild.make(TokenCollection.make(tokens), 0, tokens.length);
    const makePtbRes = (...tokens) => PartialTreeBuild.make(TokenCollection.make(tokens), 0, tokens.length).buildPart();
    function includeHasAResultExample(ptbRes) {
      it("returns a result", () => {
        expect(ptbRes()).toBeDefined();
      });
    }
    describe('handles general case "( \\n ..."', () => {
      const args = [makeToken("("), makeToken("\n"), makeToken("a"), makeToken(")")];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("begins as group start combiner", () => {
        expect(StartGroupCombiner.hasCreated(ptbRes())).toBeTruthy();
      });
      it("unprocessed range contains the remainder of tokens", () => {
        ;
        ptbRes()?.expandIntoNodes(buildProgramSequence);
        expect(EmptyNodeExpansion.hasCreated(ptbRes())).toBeTruthy();
      });
    });
    describe('handles grouping case "( a )"', () => {
      const args = [makeToken("("), makeToken("a"), makeToken(")")];
      const ptbRes = () => makePtbRes(...args);
      it("remaining part builds nothing", () => {
        expect(ptbRes()?.remainingPart?.buildPart()).toEqual(PartialTreeBuild.kNothing);
      });
      it("incomplete part builds a complete node", () => {
        expect(ptbRes()?.unprocessedPart?.buildPart()?.completedNode).toBeDefined();
      });
      it("incomplete part builds an identifier node", () => {
        const node = ptbRes()?.unprocessedPart?.buildPart()?.completedNode;
        expect(node?.type()).toBeDefined(AstNode.types.identifier);
      });
      it('incomplete part builds an "a" stringable node', () => {
        const node = ptbRes()?.unprocessedPart?.buildPart()?.completedNode;
        const str = node && AstStringableNode.downcast(node).asString();
        expect(str).toBeDefined("a");
      });
    });
    describe('handles grouping case "( a , b )"', () => {
      const ptbRes = () => makePtbRes(
        makeToken("("),
        makeToken("a"),
        makeToken(","),
        makeToken("b"),
        makeToken(")")
      );
      includeNoNodePtbExamples(ptbRes);
      it("unprocessed range contains the remainder of tokens", () => {
        expect(ptbRes()?.remainingPart?.buildPart()).toEqual(PartialTreeBuild.kNothing);
      });
    });
    describe('handles general operator case "a, b"', () => {
      const args = [makeToken("a"), makeToken(","), makeToken("b")];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("has no complete node", () => {
        expect(ptbRes()?.completedNode).toBeUndefined();
      });
      it("has an incomplete node", () => {
        expect(ptbRes()?.incompleteNode).toBeDefined();
      });
      it("incomplete node maps to correct token", () => {
        expect(ptbRes()?.incompleteNode?.lhsAsString()).toEqual("a");
      });
      it("creates a ptb that ignores new lines", () => {
        expect(ptbRes()?.unprocessedPart?.ignoresNewLines()).toBeTruthy();
      });
    });
    describe('handles case operator across new line "a, \\n b \\n ...', () => {
      const args = [
        makeToken("a"),
        makeToken(","),
        makeToken("\n"),
        makeToken("b"),
        makeToken("\n"),
        makeToken("c")
      ];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("has no complete node", () => {
        expect(ptbRes()?.completedNode).toBeUndefined();
      });
      it("has an incomplete node", () => {
        expect(ptbRes()?.incompleteNode).toBeDefined();
      });
      it("remaining part does not ignore new lines", () => {
        expect(ptbRes()?.remainingPart?.ignoresNewLines()).not.toBeTruthy();
      });
      it("unprocessedPart completion", () => {
        const res = ptbRes();
        const unprocessedPart = res?.unprocessedPart;
        const partBuildRes = unprocessedPart?.buildPart();
        const completedNode = partBuildRes?.completedNode;
        const tupleNode = completedNode && res?.incompleteNode?.finish(completedNode);
        expect(tupleNode?.type()).toEqual(AstNode.types.tuple);
      });
    });
    describe('handles function call case "f(...)..."', () => {
      describe(`a simple one parameter function call "f('a')"`, () => {
        const args = [
          makeToken("f"),
          makeToken("("),
          makeToken("'a'"),
          makeToken(")")
        ];
        const ptbRes = () => makePtbRes(...args);
        it("returns an incomplete node, with unprocessed part", () => {
          const res = ptbRes();
          res?.unprocessedPart?.buildPart();
          expect(res?.incompleteNode).toBeDefined();
          expect(res?.unprocessedPart).toBeDefined();
        });
        it("completes unprocessed part into an identifier", () => {
          const res = ptbRes()?.unprocessedPart?.buildPart();
          const stringable = res?.completedNode && AstStringableNode.downcast(res?.completedNode);
          expect(stringable?.asString()).toEqual("a");
        });
        it("function has correct name", () => {
          expect(ptbRes()?.incompleteNode?.lhsAsString()).toEqual("f");
        });
        it("completes into a function call", () => {
          const res = ptbRes();
          const node = res?.unprocessedPart?.buildPart()?.completedNode;
          const fCall = node && res?.incompleteNode?.finish(node);
          expect(fCall?.type()).toEqual(AstNode.types.functionCall);
        });
      });
    });
    describe("simple cases", () => {
      it("handles a single string literal", () => {
        const ptb = make2([makeToken("'a'")]);
        const res = ptb.buildPart();
        const comp = res?.completedNode;
        const stringable = comp && AstStringableNode.downcast(comp);
        expect(stringable?.asString()).toEqual("a");
      });
      it("handles new lines followed by nothing statements", () => {
        const res = make2([makeToken("\n")]).buildPart();
        expect(res).toEqual(PartialTreeBuild.kNothing);
      });
      it("handles empty statements", () => {
        const res = make2([]).buildPart();
        expect(res).toEqual(PartialTreeBuild.kNothing);
      });
      it("handles a lone token statement", () => {
        const args = [
          makeToken("a"),
          makeToken("\n")
        ];
        const res = make2(args).buildPart();
        expect(res).toBeDefined();
        expect(res?.completedNode?.type()).toEqual(AstNode.types.identifier);
        expect(res?.incompleteNode).toBeUndefined();
      });
    });
  });
})();

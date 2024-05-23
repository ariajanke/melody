(() => {
  // tests/globals.ts
  globalThis["debug_mode"] = true;

  // src/helpers.ts
  var kDebugMode = globalThis["debug_mode"] ?? false;
  var Helpers = Object.freeze({
    expose,
    freeze: !kDebugMode ? Object.freeze : pass,
    mapValues,
    depthOneCopy,
    memoize,
    verifyInTesting
    // passWhenInTesting
  });
  var StandardError = (() => {
    const { freeze: freeze12 } = Helpers;
    function make2() {
      let mErrorFn = () => {
      };
      function setErrorFn(fn) {
        mErrorFn = fn;
      }
      function setErrorMessage(message) {
        mErrorFn = () => freeze12({ message });
      }
      function error() {
        return mErrorFn();
      }
      return freeze12({ setErrorFn, setErrorMessage, error });
    }
    return freeze12({ make: make2 });
  })();
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
  function verifyInTesting() {
    if (kDebugMode)
      return;
    throw Error("Cannot be called outside of a testing environment");
  }
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
    const { freeze: freeze12, assign } = Object;
    const classes = freeze12({
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
    return freeze12({
      classes,
      classOf
    });
  })();

  // src/crawl_strategies.ts
  var CrawlStrategies = (() => {
    const { freeze: freeze12 } = Object;
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
    return freeze12({
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
      ["let"]: TokenType.operator,
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
    const { freeze: freeze12 } = Object;
    const injections2 = freeze12({
      CrawlStrategies,
      characterClassOf: CharacterClass.classOf,
      characterClasses: CharacterClass.classes
    });
    function make2(mInput, { CrawlStrategies: CrawlStrategies2, characterClassOf, characterClasses } = injections2) {
      const inst = freeze12({ reachedEnd, readToken, crawl });
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
    return freeze12({ make: make2 });
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
      function skipNewLine(i) {
        if (at(i).type() === Token.types.newLine) {
          return i + 1;
        }
        return i;
      }
      return freeze3({ count, at, forEach, skipNewLine });
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
    const { freeze: freeze12 } = Object;
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
      const inst = freeze12({ forEach, count, visit, type, mergeWith });
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
    return freeze12({ makeBinary, makeUnary, make: make2 });
  })();

  // src/partial_tree_next_token_build.ts
  var PartialTreeNextTokenBuild = (() => {
    const { memoize: memoize2, freeze: freeze12 } = Helpers;
    const kCloseMapping = freeze12({
      ["("]: ")"
    });
    function make2(mTokens, mStart, mEnd, mFindCloseBasedOn) {
      const { error, setErrorMessage } = StandardError.make();
      const closeMapping = kCloseMapping[mFindCloseBasedOn];
      const lineCont = closeMapping ? LineContinuationScheme.inGroup : LineContinuationScheme.operatorContinued;
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
        return setErrorMessage(`Cannot find close position for ${mFindCloseBasedOn}`);
      });
      const unprocessedPart = memoize2(() => {
        const pos = closePosition();
        if (!pos)
          return void 0;
        return PartialTreeBuild.make(mTokens, mStart, pos, lineCont);
      });
      const remainingRange = memoize2(() => {
        const pos = closePosition();
        if (!pos) {
          throw Error("call and test against unprocessedPart first");
        }
        return [Math.min(mEnd, pos + 1), mEnd];
      });
      return freeze12({ unprocessedPart, remainingRange, error });
    }
    return freeze12({ make: make2 });
  })();

  // src/node_expansion.ts
  var { freeze: freeze5 } = Helpers;
  var NodeExpansionVisitor = (() => {
    function makeDefaultImplementations(fn) {
      return freeze5({
        visitLeftPartOnly: (_0) => {
          fn();
        },
        visitLeftWithNode: (_0, _1) => {
          fn();
        },
        visitRightPartOnly: (_0) => {
          fn();
        },
        visitRightNodeOnly: (_0) => {
          fn();
        },
        visitRightWithPart: (_0, _1) => {
          fn();
        }
      });
    }
    function makeOverrider(defaultOnCallback = () => {
    }) {
      let mInstance = { ...makeDefaultImplementations(defaultOnCallback) };
      const inst = freeze5({
        visitLeftPartOnly,
        visitLeftWithNode,
        visitRightPartOnly,
        visitRightNodeOnly,
        visitRightWithPart,
        finish
      });
      function visitLeftPartOnly(fn) {
        mInstance.visitLeftPartOnly = fn;
        return inst;
      }
      function visitLeftWithNode(fn) {
        mInstance.visitLeftWithNode = fn;
        return inst;
      }
      function visitRightPartOnly(fn) {
        mInstance.visitRightPartOnly = fn;
        return inst;
      }
      function visitRightNodeOnly(fn) {
        mInstance.visitRightNodeOnly = fn;
        return inst;
      }
      function visitRightWithPart(fn) {
        mInstance.visitRightWithPart = fn;
        return inst;
      }
      function finish() {
        return freeze5(mInstance);
      }
      return inst;
    }
    return freeze5({ makeOverrider });
  })();
  var NodeExpansion = (() => {
    const { freeze: freeze12, verifyInTesting: verifyInTesting3 } = Helpers;
    function visit(_0) {
    }
    function makeBase() {
      const { type, hasCreated } = TypeCheckable.make();
      return freeze12({ hasCreated, type, freeze: freeze12, visit, verifyInTesting: verifyInTesting3 });
    }
    return freeze12({ makeBase });
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

  // src/left_side_node_expansion.ts
  var BareLeftTreePartHandler = (() => {
    const { freeze: freeze12 } = Object;
    const kSharedInst = freeze12({ handleLeftSide, visit });
    function handleLeftSide(nodes) {
      return nodes;
    }
    function visit(leftPart, visitor) {
      visitor.visitLeftPartOnly(leftPart);
    }
    function make2() {
      return kSharedInst;
    }
    return freeze12({ make: make2 });
  })();
  var IncompleteNodeLeftTreePartHandler = (() => {
    const { freeze: freeze12 } = Object;
    function make2(incompleteNode) {
      function handleLeftSide(nodes) {
        const [head, ...tail] = nodes;
        if (!head) {
          return [];
        }
        return [incompleteNode.finish(head), ...tail];
      }
      function visit(leftPart, visitor) {
        visitor.visitLeftWithNode(incompleteNode, leftPart);
      }
      return freeze12({ handleLeftSide, visit });
    }
    return freeze12({ make: make2 });
  })();
  var LeftSideNodeExpansion = (() => {
    const { freeze: freeze12 } = Object;
    function make2(leftPartHandler, leftPart, rightPart) {
      const {
        type,
        verifyInTesting: verifyInTesting3
      } = NodeExpansion.makeBase();
      function expandIntoNodes(fn) {
        return [
          ...leftPartHandler.handleLeftSide(fn(leftPart)),
          ...fn(rightPart)
        ];
      }
      function visit(visitor) {
        verifyInTesting3();
        leftPartHandler.visit(leftPart, visitor);
        visitor.visitRightPartOnly(rightPart);
      }
      return freeze12({ expandIntoNodes, type, visit });
    }
    return freeze12({ make: make2 });
  })();

  // src/partial_tree_start_group_build.ts
  var PartialTreeStartGroupBuild = (() => {
    const { memoize: memoize2, freeze: freeze12 } = Helpers;
    function make2(mTokens, leftPartHandler, mStartToken, mStart, mEnd) {
      const { setErrorMessage, error, setErrorFn } = StandardError.make();
      const normalLineContinuation = LineContinuationScheme.normal;
      const nextPart = memoize2(() => {
        if (mStart > mEnd) {
          setErrorMessage("end of input reached before being able to close");
        }
        const nextPartStart = mTokens.skipNewLine(mStart);
        return PartialTreeNextTokenBuild.make(mTokens, nextPartStart, mEnd, mStartToken.content());
      });
      function getLeftPart() {
        return nextPart().unprocessedPart() ?? setErrorFn(nextPart().error);
      }
      function startGroupBuild() {
        const leftPart = getLeftPart();
        if (!leftPart) {
          setErrorMessage("no left part??");
          return;
        }
        const { remainingRange } = nextPart();
        const rightPart = PartialTreeBuild.make(mTokens, ...remainingRange(), normalLineContinuation);
        return LeftSideNodeExpansion.make(leftPartHandler, leftPart, rightPart);
      }
      return freeze12({
        startGroupBuild: memoize2(startGroupBuild),
        error
      });
    }
    return freeze12({ make: make2 });
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
    const { freeze: freeze12 } = Object;
    const assignmentType = AstNode.types.assignment;
    function make2(lhs, rhs) {
      const { asString } = AstStringableNode.downcast(lhs);
      const inst = freeze12({ visit, type, assigneeName: asString });
      function visit(visitor) {
        visitor.visitAssignment(inst, rhs);
      }
      function type() {
        return assignmentType;
      }
      return inst;
    }
    return freeze12({ make: make2 });
  })();

  // src/ast_incomplete_binary_node.ts
  var AstIncompleteBinaryNode = (() => {
    const { freeze: freeze12 } = Object;
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
      return freeze12({ finish, lhsAsString });
    }
    return freeze12({ make: make2, makeForOperator });
  })();

  // src/right_side_node_expansion.ts
  var { freeze: freeze7 } = Helpers;
  var BareRightTreePartHandler = (() => {
    function make2() {
      function handleRightSide(_0) {
        return [];
      }
      function visit(node, visitor) {
        visitor.visitRightNodeOnly(node);
      }
      return freeze7({ handleRightSide, visit });
    }
    return freeze7({ make: make2 });
  })();
  var BuildPartRightTreePartHandler = (() => {
    function make2(rightPart) {
      function handleRightSide(fn) {
        return fn(rightPart);
      }
      function visit(node, visitor) {
        visitor.visitRightWithPart(node, rightPart);
      }
      return freeze7({ handleRightSide, visit });
    }
    return freeze7({ make: make2 });
  })();
  var RightSideNodeExpansion = (() => {
    function make2(node, rightHandler) {
      const { type, verifyInTesting: verifyInTesting3 } = NodeExpansion.makeBase();
      function expandIntoNodes(fn) {
        return [
          node,
          ...rightHandler.handleRightSide(fn)
        ];
      }
      function visit(visitor) {
        verifyInTesting3();
        rightHandler.visit(node, visitor);
      }
      return freeze7({ type, expandIntoNodes, visit });
    }
    return freeze7({ make: make2 });
  })();

  // src/partial_tree_start_operator_build.ts
  var PartialTreeStartOperatorBuild = (() => {
    const { freeze: freeze12 } = Helpers;
    function make2(mIncompleteNode, mNextToken, mTokens, mStart, mEnd) {
      const { setErrorFn, error } = StandardError.make();
      function build() {
        const leftTreePartHandler = IncompleteNodeLeftTreePartHandler.make(mIncompleteNode);
        const { startGroupBuild, error: error2 } = PartialTreeStartGroupBuild.make(mTokens, leftTreePartHandler, mNextToken, mStart, mEnd);
        return startGroupBuild() ?? setErrorFn(error2);
      }
      return freeze12({ build, error });
    }
    return freeze12({ make: make2 });
  })();

  // src/partial_tree_start_identifier_build.ts
  var { freeze: freeze8 } = Helpers;
  var PartialTreeStartIdentifierBuild = (() => {
    const tokenTypes = Token.types;
    const makeStringableNodeFor = AstStringableNode.makeForToken;
    function make2(mTokens, mStartToken, mStart, mEnd, mLineContScheme) {
      const { error, setErrorMessage, setErrorFn } = StandardError.make();
      function build() {
        const lhsNode = makeStringableNodeFor(mStartToken);
        if (mEnd === mStart) {
          return RightSideNodeExpansion.make(lhsNode, BareRightTreePartHandler.make());
        }
        const nextPos = mLineContScheme === LineContinuationScheme.inGroup ? mTokens.skipNewLine(mStart) : mStart;
        const next = mTokens.at(nextPos);
        if (next.type() === tokenTypes.operator) {
          if (!lhsNode.comesBeforeOperator(next)) {
            return setErrorMessage(`operator "${next.content()}" not allowed here`);
          }
          const incompleteNode = AstIncompleteBinaryNode.makeForOperator(next.content(), lhsNode);
          const { build: build2, error: error2 } = PartialTreeStartOperatorBuild.make(incompleteNode, next, mTokens, nextPos + 1, mEnd);
          return build2() ?? setErrorFn(error2);
        } else if (next.type() === tokenTypes.newLine) {
          if (mLineContScheme === LineContinuationScheme.normal) {
            return RightSideNodeExpansion.make(lhsNode, BareRightTreePartHandler.make());
          }
          if (mLineContScheme !== LineContinuationScheme.operatorContinued) {
            throw Error("impossible branch??");
          }
          const { normal } = LineContinuationScheme;
          const rightPart = PartialTreeBuild.make(mTokens, nextPos + 1, mEnd, normal);
          const ph = BuildPartRightTreePartHandler.make(rightPart);
          return RightSideNodeExpansion.make(lhsNode, ph);
        } else {
          return setErrorMessage(`not sure how to handle token "${next.content()}"`);
        }
      }
      return freeze8({ build, error });
    }
    return freeze8({ make: make2 });
  })();

  // src/ast_let_declaration_node.ts
  var { freeze: freeze9 } = Helpers;
  var AstLetDeclarationNode = (() => {
    function make2(node) {
      const inst = freeze9({ visit, type });
      const { letDeclaration } = AstNode.types;
      function visit(visitor) {
        visitor.visitLetDeclaration(inst, node);
      }
      function type() {
        return letDeclaration;
      }
      return inst;
    }
    return freeze9({ make: make2 });
  })();
  var AstIncompleteUnaryNode = (() => {
    function _selectedConstructor(operatorStr) {
      switch (operatorStr) {
        case "let":
          return AstLetDeclarationNode.make;
        default:
          break;
      }
      throw Error(`Token ${operatorStr} does not result in an unary operator`);
    }
    function makeForOperator(operatorStr) {
      return make2(_selectedConstructor(operatorStr));
    }
    function make2(fn) {
      return freeze9({ finish: fn });
    }
    return freeze9({ makeForOperator, make: make2 });
  })();

  // src/partial_tree_build.ts
  var { freeze: freeze10, verifyInTesting: verifyInTesting2 } = Helpers;
  var LineContinuationScheme = freeze10({
    inGroup: Symbol(),
    operatorContinued: Symbol(),
    normal: Symbol()
  });
  var PartialTreeBuild = (() => {
    const tokenTypes = Token.types;
    function make2(mTokens, mStart, mEnd, mLineContScheme) {
      const { error, setErrorFn, setErrorMessage } = StandardError.make();
      function buildPart() {
        if (mStart === mEnd) {
          return EmptyNodeExpansion.make();
        }
        const startPos = mTokens.skipNewLine(mStart);
        if (startPos === mEnd) {
          return EmptyNodeExpansion.make();
        }
        const start = mTokens.at(startPos);
        if (start.type() === tokenTypes.identifier || start.type() === tokenTypes.stringLiteral) {
          const { build, error: error2 } = PartialTreeStartIdentifierBuild.make(mTokens, start, startPos + 1, mEnd, mLineContScheme);
          return build() ?? setErrorFn(error2);
        } else if (start.content() === "(") {
          const { startGroupBuild, error: error2 } = PartialTreeStartGroupBuild.make(mTokens, BareLeftTreePartHandler.make(), start, startPos + 1, mEnd);
          return startGroupBuild() ?? setErrorFn(error2);
        } else if (start.type() == tokenTypes.operator) {
          const incomplete = AstIncompleteUnaryNode.makeForOperator(start.content());
          const { build, error: error2 } = PartialTreeStartOperatorBuild.make(incomplete, start, mTokens, startPos + 1, mEnd);
          return build() ?? setErrorFn(error2);
        }
        setErrorMessage("unimplemented case");
      }
      function range() {
        verifyInTesting2();
        return freeze10({ start: mStart, end: mEnd });
      }
      return freeze10({ buildPart, error, range });
    }
    return freeze10({ make: make2 });
  })();

  // src/ast_build.ts
  var AstBuild = (() => {
    const { freeze: freeze12 } = Object;
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
    return freeze12({ buildFor: buildFor2, testable: { buildProgramSequence } });
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
    const { freeze: freeze12 } = Object;
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
      return freeze12({ declareVariable, getValueOfVariable, setVariable });
    }
    return freeze12({ make: make2 });
  })();

  // src/interpreter.ts
  var { freeze: freeze11 } = Object;
  var LetVisitor = (() => {
    function make2(context) {
      let mAssigneeNameFn = () => {
        throw Error("must assign assignee name fn");
      };
      function setAssigneeName(fn) {
        mAssigneeNameFn = fn;
      }
      function visitFunctionCall(_0) {
        throw Error("");
      }
      function visitAssignment(_0, lhs) {
        context.declareVariable(mAssigneeNameFn(), AstStringableNode.downcast(lhs).asString());
      }
      function visitLetDeclaration(_0, _1) {
        throw Error("");
      }
      return freeze11({
        setAssigneeName,
        visitFunctionCall,
        visitAssignment,
        visitLetDeclaration
      });
    }
    return freeze11({ make: make2 });
  })();
  var Interpreter = freeze11({ make, buildFor });
  var injections = freeze11({ putsFunction: console.log });
  function make(context = Context.make(), { putsFunction } = injections) {
    const nodeTypes = AstNode.types;
    const mLetVisitor = LetVisitor.make(context);
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
    function visitLetDeclaration(_0, lhs) {
      if (lhs.type() !== AstNode.types.assignment) {
        throw Error("bad let");
      }
      const assignmentNode = lhs;
      mLetVisitor.setAssigneeName(assignmentNode.assigneeName);
      assignmentNode.visit(mLetVisitor);
    }
    function visitAssignment(node, rhs) {
      context.setVariable(node.assigneeName(), getValueOf(rhs));
    }
    return freeze11({ visitFunctionCall, visitLetDeclaration, visitAssignment });
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
      it("compiles and runs a simple program with a let declaration", () => {
        const programRootNode = Interpreter.buildFor(`
        let a := 'hello world!'
        puts(a)
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
    const normalCont = LineContinuationScheme.normal;
    const make2 = (tokens) => PartialTreeBuild.make(TokenCollection.make(tokens), 0, tokens.length, normalCont);
    const makePtbRes = (...tokens) => PartialTreeBuild.make(TokenCollection.make(tokens), 0, tokens.length, normalCont).buildPart();
    const ptbWithVisitor = (ptbRes, fn) => {
      ptbRes()?.visit(fn());
    };
    function includeHasAResultExample(ptbRes) {
      it("returns a result", () => {
        expect(ptbRes()).toBeDefined();
      });
    }
    describe('handles general case "( \\n ..."', () => {
      const args = [makeToken("("), makeToken("\n"), makeToken("a"), makeToken(")")];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("is composed of a left and right part only", () => {
        let leftPartCalls = 0;
        let rightPartCalls = 0;
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
          ++leftPartCalls;
        }).visitRightPartOnly((_1) => {
          ++rightPartCalls;
        }).finish());
        expect(leftPartCalls).toEqual(1);
        expect(rightPartCalls).toEqual(1);
      });
      it("makes right part with none of the tokens", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
        }).visitRightPartOnly((rightPart) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(4);
          expect(end).toEqual(4);
        }).finish());
      });
      it("makes left part with the remainder of the tokens, skipping new line", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((leftPart) => {
          const { start, end } = leftPart.range();
          expect(start).toEqual(2);
          expect(end).toEqual(3);
        }).visitRightPartOnly((_0) => {
        }).finish());
      });
    });
    ;
    const ReachPoint = (() => {
      function make3(mSet, mIdx) {
        let mRequiredHits = 1;
        let mName = `Point ${mIdx}`;
        function hitsAtExactly(times, name) {
          mRequiredHits = times;
          mSet[mIdx]++;
          if (mSet[mIdx] > times) {
            throw Error(`Reached "${mName} too many times`);
          }
          if (name) {
            mName = name;
          }
        }
        function verifySatisfied() {
          if (mSet[mIdx] !== mRequiredHits) {
            throw Error(`Point "${mName}" was not reached ${mRequiredHits} times`);
          }
        }
        return Object.freeze({ hitsAtExactly, verifySatisfied });
      }
      function makeCollection(size) {
        const mSet = [];
        mSet.length = size;
        mSet.fill(0);
        const mPoints = [];
        for (let i = 0; i < size; ++i) {
          mPoints.push(make3(mSet, i));
        }
        function points() {
          return mPoints;
        }
        function verifyAllHit() {
          mPoints.forEach((pt) => {
            pt.verifySatisfied();
          });
          return true;
        }
        return Object.freeze({ points, verifyAllHit });
      }
      return Object.freeze({ make: make3, makeCollection });
    })();
    function includeHasLeftAndRightPointWithNoNodes(ptbRes) {
      it("has left and right point with no nodes", () => {
        const { points, verifyAllHit } = ReachPoint.makeCollection(2);
        const [pt1, pt2] = points();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
          pt1.hitsAtExactly(1);
        }).visitRightPartOnly((_0) => {
          pt2.hitsAtExactly(1);
        }).finish());
        expect(verifyAllHit()).toBeTruthy();
      });
    }
    describe('handles grouping case "( a )"', () => {
      const args = [makeToken("("), makeToken("a"), makeToken(")")];
      const ptbRes = () => makePtbRes(...args);
      includeHasLeftAndRightPointWithNoNodes(ptbRes);
      it("has left and right point with no nodes", () => {
        const { points, verifyAllHit } = ReachPoint.makeCollection(2);
        const [pt1, pt2] = points();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
          pt1.hitsAtExactly(1);
        }).visitRightPartOnly((_0) => {
          pt2.hitsAtExactly(1);
        }).finish());
        expect(verifyAllHit()).toBeTruthy();
      });
      it("left part contains no tokens", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((leftPart) => {
          expect(args[leftPart.range().start].content()).toEqual("a");
        }).visitRightPartOnly((_0) => {
        }).finish());
      });
      it('right part contains the "a" token', () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
        }).visitRightPartOnly((rightPart) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(end);
        }).finish());
      });
    });
    describe('handles grouping case "( a , b )"', () => {
      const args = [
        makeToken("("),
        makeToken("a"),
        makeToken(","),
        makeToken("b"),
        makeToken(")")
      ];
      const ptbRes = () => makePtbRes(...args);
      includeHasLeftAndRightPointWithNoNodes(ptbRes);
      [
        ["a", 0],
        [",", 1],
        ["b", 2]
      ].forEach(([token, position]) => {
        it(`left part contains the "${token}" tokens`, () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((leftPart) => {
            const idx = leftPart.range().start + position;
            expect(idx).toBeLessThan(args.length);
            expect(args[idx]?.content()).toEqual(token);
          }).visitRightPartOnly((_0) => {
          }).finish());
        });
      });
      it(`right part contains no tokens`, () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
        }).visitRightPartOnly((rightPart) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(end);
        }).finish());
      });
    });
    function setupWithLeftPartCompletingTupleNode(ptbRes, fn) {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((node, _1) => {
        const compl = node.finish(AstIdentifierNode.make("b"));
        if (compl.type() === AstNode.types.tuple) {
          fn(compl);
        } else {
          fail();
        }
      }).visitRightPartOnly((_0) => {
      }).finish());
    }
    describe('handles general operator case "a, b"', () => {
      const args = [makeToken("a"), makeToken(","), makeToken("b")];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("left part has incomplete node", () => {
        const { points, verifyAllHit } = ReachPoint.makeCollection(2);
        const [pt1, pt2] = points();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, _1) => pt1.hitsAtExactly(1)).visitRightPartOnly((_0) => {
          pt2.hitsAtExactly(1);
        }).finish());
        verifyAllHit();
      });
      it("left part incomplete node, completes into a tuple node", () => {
        setupWithLeftPartCompletingTupleNode(ptbRes, (node) => {
          expect(node.count()).toEqual(2);
        });
      });
      it('left part incomplete node, completes into a tuple node, first is an "a" identifer', () => {
        setupWithLeftPartCompletingTupleNode(ptbRes, (node) => {
          let first = void 0;
          node.forEach((node2) => {
            first ??= AstStringableNode.downcast(node2).asString();
          });
          expect(first).toEqual("a");
        });
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
      includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes);
      it("has left side has incomplete node, has new line adjusted range", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, part) => {
          const { start, end } = part.range();
          expect(start).toEqual(3);
          expect(end).toEqual(6);
        }).visitRightPartOnly((_0) => {
        }).finish());
      });
      it("has right side, has new line adjusted range", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, _1) => {
        }).visitRightPartOnly((rightPart) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(6);
          expect(end).toEqual(6);
        }).finish());
      });
    });
    function includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes) {
      it("has left side has incomplete node, and nodeless right side", () => {
        const { points, verifyAllHit } = ReachPoint.makeCollection(2);
        const [pt1, pt2] = points();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, _1) => pt1.hitsAtExactly(1)).visitRightPartOnly((_0) => {
          pt2.hitsAtExactly(1);
        }).finish());
        verifyAllHit();
      });
    }
    describe('handles function call case "f(...)..."', () => {
      describe(`a simple one parameter function call "f('a')"`, () => {
        const args = [
          makeToken("f"),
          makeToken("("),
          makeToken("'a'"),
          makeToken(")")
        ];
        const ptbRes = () => makePtbRes(...args);
        includeHasAResultExample(ptbRes);
        includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes);
        it("has left side whose incomplete node that completes into a function", () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((node, _1) => {
            const completed = node.finish(AstIdentifierNode.make("c"));
            expect(completed.type()).toEqual(AstNode.types.functionCall);
          }).visitRightPartOnly((_0) => {
          }).finish());
        });
        it("has left side whose incomplete node that completes into the correct function", () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((node, _1) => {
            const completed = node.finish(AstIdentifierNode.make("c"));
            if (completed.type() !== AstNode.types.functionCall) {
              fail();
              return;
            }
            expect(completed.name).toEqual("f");
          }).visitRightPartOnly((_0) => {
          }).finish());
        });
        it("has left side, with one token", () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, part) => {
            const { start, end } = part.range();
            expect(end - start).toEqual(1);
          }).visitRightPartOnly((_0) => {
          }).finish());
        });
        it("has empty right side", () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, _1) => {
          }).visitRightPartOnly((rightPart) => {
            const { start, end } = rightPart.range();
            expect(start).toEqual(end);
          }).finish());
        });
      });
    });
    describe("let declaration", () => {
      const args = [
        makeToken("let"),
        makeToken("a"),
        makeToken("="),
        makeToken("'hello'")
      ];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes);
      it("has left side whose incomplete node that completes into a let", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((node, _1) => {
          const completed = node.finish(AstIdentifierNode.make("c"));
          expect(completed.type()).toEqual(AstNode.types.letDeclaration);
        }).visitRightPartOnly((_0) => {
        }).finish());
      });
    });
    describe("simple cases", () => {
      it("handles a single string literal", () => {
        const ptbRes = () => make2([makeToken("'a'")]).buildPart();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitRightNodeOnly((node) => {
          const str = AstStringableNode.downcast(node).asString();
          expect(str).toEqual("a");
        }).finish());
      });
      it("handles new lines followed by nothing statements", () => {
        const res = make2([makeToken("\n")]).buildPart();
        expect(EmptyNodeExpansion.hasCreated(res)).toBeTruthy();
      });
      it("handles empty statements", () => {
        const res = make2([]).buildPart();
        expect(EmptyNodeExpansion.hasCreated(res)).toBeTruthy();
      });
      it("handles a lone token statement", () => {
        const args = [
          makeToken("a"),
          makeToken("\n")
        ];
        const ptbRes = () => make2(args).buildPart();
        const { points, verifyAllHit } = ReachPoint.makeCollection(1);
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitRightNodeOnly((node) => {
          const str = AstStringableNode.downcast(node).asString();
          points()[0].hitsAtExactly(1);
          expect(str).toEqual("a");
        }).finish());
        verifyAllHit();
      });
    });
  });
})();

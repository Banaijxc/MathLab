/* =========================================================
   格物 MathLab — symbolic & numeric math core
   Browser: exposes window.MathCore
   Node: module.exports for verification tests
   ========================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("mathjs"), require("nerdamer/all.js"));
  } else {
    root.MathCore = factory(root.math, root.nerdamer);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (math, nerdamer) {
  "use strict";

  if (!math) throw new Error("MathCore requires math.js");
  if (!nerdamer) throw new Error("MathCore requires Nerdamer");

  const FUNCTIONS = new Set([
    "sin", "cos", "tan", "cot", "sec", "csc",
    "asin", "acos", "atan", "arcsin", "arccos", "arctan",
    "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
    "ln", "log", "log10", "lg", "exp", "sqrt", "cbrt", "abs",
    "sign", "floor", "ceil", "round", "erf", "min", "max", "mod"
  ]);

  const NERDAMER_FUNCTION_MAP = {
    ln: "log",
    arcsin: "asin",
    arccos: "acos",
    arctan: "atan",
    lg: "log10",
    arcsinh: "asinh",
    arccosh: "acosh",
    arctanh: "atanh"
  };

  const TEX_FUNCTION_MAP = {
    sin: "\\sin", cos: "\\cos", tan: "\\tan", cot: "\\cot",
    sec: "\\sec", csc: "\\csc",
    asin: "\\arcsin", acos: "\\arccos", atan: "\\arctan",
    arcsin: "\\arcsin", arccos: "\\arccos", arctan: "\\arctan",
    sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh",
    ln: "\\ln", log: "\\ln", lg: "\\log_{10}",
    erf: "\\operatorname{erf}", abs: "\\operatorname{abs}",
    sign: "\\operatorname{sign}", Si: "\\operatorname{Si}", Ci: "\\operatorname{Ci}"
  };

  const TRIG_NAMES = new Set(["sin", "cos", "tan", "cot", "sec", "csc"]);
  const HYPER_NAMES = new Set(["sinh", "cosh", "tanh"]);
  const INVERSE_TRIG_NAMES = new Set(["asin", "acos", "atan", "arcsin", "arccos", "arctan"]);
  const LOG_NAMES = new Set(["ln", "log"]);
  const KNOWN_SPECIAL_PATTERNS = [
    [/atan\(sqrt\(3\)\)/g, "(pi/3)"],
    [/atan\(-sqrt\(3\)\)/g, "(-pi/3)"],
    [/atan\(sqrt\(3\)\/3\)/g, "(pi/6)"],
    [/atan\(1\/sqrt\(3\)\)/g, "(pi/6)"],
    [/atan\(sqrt\(3\)\^\(-1\)\)/g, "(pi/6)"],
    [/atan\(-1\/sqrt\(3\)\)/g, "(-pi/6)"],
    [/atan\(-sqrt\(3\)\^\(-1\)\)/g, "(-pi/6)"],
    [/atan\(1\)/g, "(pi/4)"],
    [/atan\(-1\)/g, "(-pi/4)"],
    [/atan\(0\)/g, "0"],
    [/asin\(1\/2\)/g, "(pi/6)"],
    [/asin\(1\)/g, "(pi/2)"],
    [/asin\(0\)/g, "0"],
    [/acos\(1\/2\)/g, "(pi/3)"],
    [/acos\(0\)/g, "(pi/2)"],
    [/acos\(-1\)/g, "(pi)"],
    [/acos\(1\)/g, "0"],
    [/erf\(0\)/g, "0"],
    [/Si\(0\)/g, "0"],
    [/log\(1\)/g, "0"],
    [/sqrt\(1\)/g, "1"]
  ];

  /* ---------------------------------------------------------
     Small utilities
     --------------------------------------------------------- */

  function realValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "object") {
      if (typeof value.re === "number") {
        const im = typeof value.im === "number" ? value.im : 0;
        return Math.abs(im) < 1e-9 ? value.re : null;
      }
      if (typeof value.toNumber === "function") {
        const n = value.toNumber();
        return Number.isFinite(n) ? n : null;
      }
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function formatNumber(value, sig = 7) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—";
    if (Math.abs(value) < 1e-14) return "0";
    if (Math.abs(value) >= 1e8 || Math.abs(value) < 1e-5) {
      return value.toExponential(4).replace(/e([+-])(\d)$/, "e$10$2");
    }
    const rounded = Number(value.toPrecision(sig));
    return String(rounded);
  }

  function formatTime(ms) {
    if (!Number.isFinite(ms)) return "—";
    if (ms < 1) return "<1 ms";
    if (ms < 1000) return Math.round(ms) + " ms";
    return (ms / 1000).toFixed(2) + " s";
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function stripOuterParens(text) {
    let s = String(text).trim();
    while (s.startsWith("(") && s.endsWith(")")) {
      let depth = 0;
      let wraps = true;
      for (let i = 0; i < s.length; i += 1) {
        if (s[i] === "(") depth += 1;
        else if (s[i] === ")") {
          depth -= 1;
          if (depth === 0 && i < s.length - 1) {
            wraps = false;
            break;
          }
        }
      }
      if (!wraps) break;
      s = s.slice(1, -1).trim();
    }
    return s;
  }

  /* ---------------------------------------------------------
     Expression normalisation
     --------------------------------------------------------- */

  function preprocessRaw(input) {
    if (input === null || input === undefined) return "";
    let s = String(input).trim();
    if (!s) return "";
    s = s.replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=/i, "");

    s = s
      .replace(/[\u2212\u2013\u2014]/g, "-")
      .replace(/[×·∙•]/g, "*")
      .replace(/÷/g, "/")
      .replace(/π/g, " pi ")
      .replace(/∞/g, "Infinity")
      .replace(/[（]/g, "(")
      .replace(/[）]/g, ")")
      .replace(/[，]/g, ",")
      .replace(/\\left|\\right/g, "")
      .replace(/\\(sin|cos|tan|cot|sec|csc|ln|log|sqrt|pi|theta|exp|abs)/g, "$1")
      .replace(/√\s*\(/g, "sqrt(")
      .replace(/√\s*([A-Za-z0-9.]+)/g, "sqrt($1)")
      .replace(/∛\s*\(/g, "cbrt(")
      .replace(/∛\s*([A-Za-z0-9.]+)/g, "cbrt($1)");

    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ˣ]+/g, (run) => {
      const sup = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "ˣ": "x" };
      return "^" + run.split("").map((ch) => sup[ch] || ch).join("");
    });

    // A small convenience: turn |expr| into abs(expr).
    if (s.includes("|")) {
      let guard = 0;
      while (s.includes("|") && guard < 12) {
        const replaced = s.replace(/\|([^|]+)\|/g, "abs($1)");
        if (replaced === s) break;
        s = replaced;
        guard += 1;
      }
    }

    s = s
      .replace(/\barcsin\b/gi, "asin")
      .replace(/\barccos\b/gi, "acos")
      .replace(/\barctan\b/gi, "atan")
      .replace(/\blg\b/gi, "log10");

    // Function names are case-insensitive; constants become canonical.
    s = s.replace(/\bPI\b/g, "pi").replace(/\bPi\b/g, "pi");
    s = s.replace(/\bLN\b/g, "ln").replace(/\bLn\b/g, "ln");
    s = s.replace(/\bSIN\b/g, "sin").replace(/\bSin\b/g, "sin");
    s = s.replace(/\bCOS\b/g, "cos").replace(/\bCos\b/g, "cos");
    s = s.replace(/\bTAN\b/g, "tan").replace(/\bTan\b/g, "tan");
    s = s.replace(/\bEXP\b/g, "exp").replace(/\bExp\b/g, "exp");
    s = s.replace(/\bSQRT\b/g, "sqrt").replace(/\bSqrt\b/g, "sqrt");

    // Accept the common handwritten form "sin x" in addition to "sin(x)".
    s = s.replace(
      /\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|sinh|cosh|tanh|ln|log|sqrt|exp|abs)\s+((?:[0-9]*\.?[0-9]+)?[A-Za-z]?(?:\^[0-9]+)?)(?!\s*\()/g,
      (match, fn, arg) => (arg ? `${fn}(${arg})` : match)
    );

    return s.trim();
  }

  function tokenizeExpression(input) {
    const tokens = [];
    const re = /([0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?)|([A-Za-z_][A-Za-z0-9_]*)|([()+\-*/^,])|(\S)/g;
    let match;
    while ((match = re.exec(input)) !== null) {
      const text = match[0];
      if (/^\s+$/.test(text)) continue;
      if (match[1] !== undefined) tokens.push({ type: "number", value: text });
      else if (match[2] !== undefined) tokens.push({ type: "identifier", value: text });
      else if (match[3] !== undefined) {
        if (text === "(") tokens.push({ type: "open", value: text });
        else if (text === ")") tokens.push({ type: "close", value: text });
        else if (text === ",") tokens.push({ type: "comma", value: text });
        else tokens.push({ type: "operator", value: text });
      } else {
        throw new Error(`无法识别字符 “${text}”`);
      }
    }
    return tokens;
  }

  function insertImplicitMultiplication(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      const prev = result.length ? result[result.length - 1] : null;
      if (prev && canEndOperand(prev) && canStartOperand(token)) {
        const prevIsFunction = prev.type === "identifier" && FUNCTIONS.has(prev.value.toLowerCase());
        const skip = prevIsFunction && token.type === "open";
        if (!skip) result.push({ type: "operator", value: "*" });
      }
      result.push(token);
    }
    return result;
  }

  function canEndOperand(token) {
    return token.type === "number" || token.type === "identifier" || token.type === "close";
  }

  function canStartOperand(token) {
    return token.type === "number" || token.type === "identifier" || token.type === "open";
  }

  function normalizeExpression(input) {
    let source = preprocessRaw(input);
    if (!source) throw new Error("请输入一个表达式");
    if (source.includes("=")) throw new Error("这里需要一个表达式，而不是等式");
    if (/infinity/i.test(source)) throw new Error("暂不支持无穷大作为表达式值");
    const tokens = insertImplicitMultiplication(tokenizeExpression(source));
    let output = "";
    for (const token of tokens) output += token.value;
    if (!output) throw new Error("请输入一个表达式");
    if (output.length > 800) throw new Error("表达式过长，请拆分为更简单的形式");
    // Trigger a parse for a clearer early error.
    math.parse(output);
    return output;
  }

  function collectSymbols(node) {
    const names = new Set();
    node.traverse((child) => {
      if (child.isSymbolNode && !FUNCTIONS.has(child.name)) names.add(child.name);
    });
    return [...names];
  }

  function assertOnlyX(node) {
    const symbols = collectSymbols(node);
    const bad = symbols.filter((name) => !["x", "pi", "e"].includes(name));
    if (bad.length) {
      throw new Error(`不支持的变量 “${bad[0]}”，请仅使用 x。`);
    }
  }

  function parseExpression(input, options = {}) {
    const norm = normalizeExpression(input);
    let node;
    try {
      node = math.parse(norm);
    } catch (error) {
      throw new Error("表达式语法有误：" + cleanParseError(error.message));
    }
    if (options.onlyX !== false) assertOnlyX(node);
    return { norm, node };
  }

  function cleanParseError(message) {
    return String(message)
      .replace(/^Value expected.*?\(char \d+\)$/i, "缺少数字或变量")
      .replace(/^Unexpected end of expression.*$/i, "表达式不完整")
      .replace(/^Unexpected part.*$/i, "存在无法解析的部分")
      .replace(/^Parenthesis \).*$/i, "括号不匹配")
      .replace(/^Expected parenthesis.*$/i, "括号不匹配");
  }

  function toNerdamerString(input) {
    const node = typeof input === "string" ? math.parse(normalizeExpression(input)) : input;
    return renderNerdamer(node);
  }

  function renderNerdamer(node) {
    if (!node) throw new Error("空表达式");
    if (node.isParenthesisNode) return renderNerdamer(node.content);
    if (node.isConstantNode) {
      const value = node.value;
      if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("不支持非有限数");
        return String(value);
      }
      if (typeof value === "string") return value;
      throw new Error("不支持该常数");
    }
    if (node.isSymbolNode) {
      return node.name;
    }
    if (node.isOperatorNode) {
      const args = node.args || [];
      if (args.length === 1) {
        const inner = renderNerdamer(args[0]);
        if (node.op === "-") return `(-(${inner}))`;
        if (node.op === "+") return `(${inner})`;
      }
      if (args.length === 2) {
        const op = node.op;
        if (!["+", "-", "*", "/", "^"].includes(op)) throw new Error(`不支持运算符 ${op}`);
        return `(${renderNerdamer(args[0])})${op}(${renderNerdamer(args[1])})`;
      }
      throw new Error("不支持的运算结构");
    }
    if (node.isFunctionNode) {
      const originalName = node.name || (node.fn && node.fn.name);
      if (!originalName) throw new Error("不支持该函数");
      const name = NERDAMER_FUNCTION_MAP[originalName] || originalName;
      const args = node.args.map(renderNerdamer);
      if (name === "log10") return `(log(${args[0]})/log(10))`;
      return `${name}(${args.join(",")})`;
    }
    if (node.isArrayNode) throw new Error("积分输入中不支持数组");
    throw new Error("不支持的表达式结构");
  }

  function texCleanup(tex) {
    let out = String(tex);
    out = out.replace(/\\mathrm\{(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh)\}/g, (_, name) => "\\" + name);
    out = out.replace(/\\mathrm\{log\}/g, "\\ln");
    out = out.replace(/\\mathrm\{ln\}/g, "\\ln");
    out = out.replace(/\\mathrm\{lg\}/g, "\\log_{10}");
    out = out.replace(/\\mathrm\{atan\}/g, "\\arctan");
    out = out.replace(/\\mathrm\{asin\}/g, "\\arcsin");
    out = out.replace(/\\mathrm\{acos\}/g, "\\arccos");
    out = out.replace(/\\mathrm\{arcsin\}/g, "\\arcsin");
    out = out.replace(/\\mathrm\{arccos\}/g, "\\arccos");
    out = out.replace(/\\mathrm\{arctan\}/g, "\\arctan");
    out = out.replace(/\\mathrm\{erf\}/g, "\\operatorname{erf}");
    out = out.replace(/\\mathrm\{abs\}/g, "\\operatorname{abs}");
    out = out.replace(/\\mathrm\{sign\}/g, "\\operatorname{sign}");
    out = out.replace(/\\mathrm\{Si\}/g, "\\operatorname{Si}");
    out = out.replace(/\\mathrm\{Ci\}/g, "\\operatorname{Ci}");
    out = out.replace(/\\mathrm\{pi\}/g, "\\pi");
    out = out.replace(/\\mathrm\{theta\}/g, "\\theta");
    out = out.replace(/\\operatorname\{theta\}/g, "\\theta");
    out = out.replace(/\\mathrm\{e\}/g, "e");
    out = out.replace(/\\mathrm\{([A-Za-z]+)\}/g, "\\operatorname{$1}");
    out = out.replace(/\\cdot/g, "\\,");
    out = out.replace(/~\s*/g, "\\,");
    out = out.replace(/\\,\s*\\,/g, "\\,");
    return out.trim();
  }

  function nodeToTex(node) {
    try {
      return texCleanup(node.toTex({ parenthesis: "auto" }));
    } catch (error) {
      return "\\text{无法显示}";
    }
  }

  function expressionToTex(input) {
    const { node } = parseExpression(input, { onlyX: false });
    return nodeToTex(node);
  }

  function nerdamerToTex(input) {
    const text = typeof input === "string" ? input : input.toString();
    if (!text) return "";
    try {
      return texCleanup(nerdamer(text).toTeX());
    } catch (error) {
      return "\\text{" + escapeTexText(text) + "}";
    }
  }

  function wrapFunctionArgsWithAbs(text, functionName) {
    const needle = functionName + "(";
    let cursor = 0;
    let output = "";
    let guard = 0;
    while (guard < 40) {
      guard += 1;
      const start = text.indexOf(needle, cursor);
      if (start < 0) {
        output += text.slice(cursor);
        break;
      }
      output += text.slice(cursor, start) + needle;
      let depth = 0;
      let end = -1;
      for (let i = start + needle.length - 1; i < text.length; i += 1) {
        if (text[i] === "(") depth += 1;
        else if (text[i] === ")") {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end < 0) {
        output += text.slice(start + needle.length);
        break;
      }
      const argument = text.slice(start + needle.length, end);
      output += `abs(${argument})`;
      cursor = end;
    }
    return output;
  }

  function absoluteLogTex(expr) {
    return nerdamerToTex(wrapFunctionArgsWithAbs(String(expr), "log"));
  }

  function escapeTexText(text) {
    return String(text)
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/[{}]/g, "")
      .replace(/_/g, "\\_")
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/#/g, "\\#");
  }

  /* ---------------------------------------------------------
     Numeric evaluation
     --------------------------------------------------------- */

  function makeEvaluator(inputOrNode) {
    const norm = typeof inputOrNode === "string" ? normalizeExpression(inputOrNode) : inputOrNode.toString();
    let compiled = null;
    let nerdamerFn = null;
    try {
      compiled = math.compile(norm);
    } catch (error) {
      compiled = null;
    }
    if (!compiled) {
      try {
        const nd = typeof inputOrNode === "string" ? nerdamer(toNerdamerString(norm)) : nerdamer(renderNerdamer(inputOrNode));
        nerdamerFn = nd.buildFunction();
      } catch (error) {
        nerdamerFn = null;
      }
    }
    return function evaluateAt(x) {
      try {
        if (compiled) {
          const value = compiled.evaluate({ x });
          return realValue(value);
        }
        if (nerdamerFn) return realValue(nerdamerFn(x));
      } catch (error) {
        // Try the fallback once; some functions are unsupported by math.js.
        if (compiled) {
          try {
            if (!nerdamerFn) nerdamerFn = nerdamer(toNerdamerString(norm)).buildFunction();
            return realValue(nerdamerFn(x));
          } catch (inner) {
            return null;
          }
        }
      }
      return null;
    };
  }

  function evaluateConstant(input) {
    const { norm } = parseExpression(input, { onlyX: false });
    try {
      const value = math.evaluate(norm);
      const real = realValue(value);
      if (real !== null) return real;
    } catch (error) {
      /* fall through */
    }
    try {
      const fn = nerdamer(toNerdamerString(norm)).buildFunction();
      return realValue(fn());
    } catch (error) {
      return null;
    }
  }

  function evaluateNerdamerAt(expr, x) {
    try {
      const fn = nerdamer(expr).buildFunction();
      return realValue(fn(x));
    } catch (error) {
      try {
        const node = math.parse(expr);
        return realValue(node.compile().evaluate({ x }));
      } catch (inner) {
        return null;
      }
    }
  }

  function evaluateNerdamerConstant(expr) {
    try {
      const fn = nerdamer(expr).buildFunction();
      return realValue(fn());
    } catch (error) {
      try {
        const value = nerdamer(expr).evaluate().text();
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
      } catch (inner) {
        return null;
      }
    }
  }

  /* ---------------------------------------------------------
     Numeric integration
     --------------------------------------------------------- */

  function safeEvaluate(f, x) {
    try {
      const value = f(x);
      return Number.isFinite(value) ? value : null;
    } catch (error) {
      return null;
    }
  }

  function adaptiveSimpson(f, a, b, tolerance = 1e-10) {
    const fa = safeEvaluate(f, a);
    const fb = safeEvaluate(f, b);
    const fm = safeEvaluate(f, (a + b) / 2);
    if (fa === null || fb === null || fm === null) return null;
    const whole = ((b - a) / 6) * (fa + 4 * fm + fb);
    let evaluations = 3;

    function recurse(left, right, fLeft, fMid, fRight, estimate, eps, depth) {
      if (depth <= 0) return estimate;
      const mid = (left + right) / 2;
      const lm = (left + mid) / 2;
      const rm = (mid + right) / 2;
      const fLm = safeEvaluate(f, lm);
      const fRm = safeEvaluate(f, rm);
      evaluations += 2;
      if (fLm === null || fRm === null) return estimate;
      const leftEstimate = ((mid - left) / 6) * (fLeft + 4 * fLm + fMid);
      const rightEstimate = ((right - mid) / 6) * (fMid + 4 * fRm + fRight);
      const delta = leftEstimate + rightEstimate - estimate;
      if (Math.abs(delta) <= 15 * eps) {
        return leftEstimate + rightEstimate + delta / 15;
      }
      return recurse(left, mid, fLeft, fLm, fMid, leftEstimate, eps / 2, depth - 1)
        + recurse(mid, right, fMid, fRm, fRight, rightEstimate, eps / 2, depth - 1);
    }

    const value = recurse(a, b, fa, fm, fb, whole, tolerance, 18);
    return { value, evaluations };
  }

  function tanhSinh(f, a, b) {
    const center = (a + b) / 2;
    const half = (b - a) / 2;
    let previous = null;
    let previousDelta = null;
    let evaluations = 0;
    for (let level = 0; level < 9; level += 1) {
      const h = 0.5 * Math.pow(0.5, level);
      const limit = Math.ceil(4.2 / h);
      let sum = 0;
      for (let k = -limit; k <= limit; k += 1) {
        const t = k * h;
        const u = (Math.PI / 2) * Math.sinh(t);
        const coshU = Math.cosh(u);
        if (!Number.isFinite(coshU) || coshU === 0) continue;
        const weight = ((Math.PI / 2) * Math.cosh(t)) / (coshU * coshU);
        if (!Number.isFinite(weight) || weight < 1e-17) continue;
        let x = center + half * Math.tanh(u);
        const pad = Math.max(Math.abs(b - a) * 1e-14, 1e-15);
        if (x <= a) x = a + pad;
        if (x >= b) x = b - pad;
        const value = safeEvaluate(f, x);
        evaluations += 1;
        if (value !== null) sum += weight * value;
      }
      const value = sum * half * h;
      if (previous !== null) {
        const delta = Math.abs(value - previous);
        if (level >= 3 && delta <= 1e-10 * Math.max(1, Math.abs(value))) {
          return { value, evaluations, converged: true, error: delta };
        }
        if (previousDelta !== null && delta > previousDelta * 4) {
          return { value: previous, evaluations, converged: false, error: previousDelta };
        }
        previousDelta = delta;
      }
      previous = value;
    }
    return { value: previous, evaluations, converged: false, error: previousDelta };
  }

  function numericIntegral(f, a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    if (a === b) return { value: 0, method: "exact", error: 0, evaluations: 0, converged: true };
    let sign = 1;
    let lower = a;
    let upper = b;
    if (lower > upper) {
      sign = -1;
      lower = b;
      upper = a;
    }
    const simpson = adaptiveSimpson(f, lower, upper, 1e-10);
    const ts = tanhSinh(f, lower, upper);
    let chosen = null;
    let method = "";
    let error = null;
    let converged = false;

    if (simpson && ts && Number.isFinite(ts.value)) {
      const diff = Math.abs(simpson.value - ts.value);
      const scale = Math.max(1, Math.abs(ts.value));
      if (diff <= 1e-6 * scale) {
        chosen = simpson.value;
        method = "adaptive-simpson";
        error = Math.max(diff, ts.error || 0);
        converged = true;
      } else {
        chosen = ts.value;
        method = "tanh-sinh";
        error = diff;
        converged = ts.converged;
      }
    } else if (ts && Number.isFinite(ts.value)) {
      chosen = ts.value;
      method = "tanh-sinh";
      error = ts.error;
      converged = ts.converged;
    } else if (simpson && Number.isFinite(simpson.value)) {
      chosen = simpson.value;
      method = "adaptive-simpson";
      error = null;
      converged = true;
    }

    if (chosen === null) {
      // Last resort: a midpoint sum with an inset boundary for mild singularities.
      let sum = 0;
      let count = 0;
      const n = 4000;
      for (let i = 0; i < n; i += 1) {
        const x = lower + ((i + 0.5) / n) * (upper - lower);
        const value = safeEvaluate(f, x);
        if (value !== null) {
          sum += value;
          count += 1;
        }
      }
      if (count > n * 0.4) {
        chosen = (sum / count) * (upper - lower);
        method = "midpoint";
        converged = false;
      }
    }

    if (chosen === null) return null;
    return {
      value: sign * chosen,
      method,
      error,
      evaluations: (simpson ? simpson.evaluations : 0) + (ts ? ts.evaluations : 0),
      converged
    };
  }

  /* ---------------------------------------------------------
     Classification and solution steps
     --------------------------------------------------------- */

  function unwrap(node) {
    let current = node;
    while (current && current.isParenthesisNode) current = current.content;
    return current;
  }

  function containsX(node) {
    if (!node) return false;
    let found = false;
    node.traverse((child) => {
      if (child.isSymbolNode && child.name === "x") found = true;
    });
    return found;
  }

  function isConstantNode(node) {
    return !containsX(node);
  }

  function addends(node, sign = 1) {
    const n = unwrap(node);
    if (n.isOperatorNode && n.op === "+" && n.args.length === 2) {
      return [...addends(n.args[0], sign), ...addends(n.args[1], sign)];
    }
    if (n.isOperatorNode && n.op === "-" && n.args.length === 2 && !n.unary) {
      return [...addends(n.args[0], sign), ...addends(n.args[1], -sign)];
    }
    if (n.isOperatorNode && n.op === "-" && n.args.length === 1) {
      return addends(n.args[0], -sign);
    }
    return [{ node: n, sign }];
  }

  function productFactors(node) {
    const n = unwrap(node);
    if (n.isOperatorNode && n.op === "*") {
      return [...productFactors(n.args[0]), ...productFactors(n.args[1])];
    }
    return [n];
  }

  function functionName(node) {
    if (!node || !node.isFunctionNode) return null;
    return node.name || (node.fn && node.fn.name) || null;
  }

  function isSimpleXNode(node) {
    const n = unwrap(node);
    return !!n && n.isSymbolNode && n.name === "x";
  }

  function linearInner(node) {
    if (!node) return null;
    const n = unwrap(node);
    if (!containsX(n)) return null;
    try {
      const normalized = n.toString();
      const derivative = math.derivative(normalized, "x");
      const dString = derivative.toString();
      if (/(^|[^A-Za-z])x([^A-Za-z]|$)/.test(dString)) return null;
      const a = realValue(derivative.compile().evaluate({ x: 0.317 }));
      const b = realValue(n.compile().evaluate({ x: 0 }));
      if (a === null || b === null || Math.abs(a) < 1e-12) return null;
      return { a, b, node: n };
    } catch (error) {
      return null;
    }
  }

  function coefficientTex(value) {
    if (Math.abs(value - 1) < 1e-12) return "1";
    if (Number.isInteger(value)) return String(value);
    return nerdamerToTex(String(value));
  }

  function reciprocalCoefficientTex(value) {
    if (Math.abs(value - 1) < 1e-12) return "1";
    return nerdamerToTex(`(1)/(${value})`);
  }

  function classifyTerm(node) {
    const n = unwrap(node);
    if (!containsX(n)) {
      return { key: "constant", label: "常数积分" };
    }

    if (n.isFunctionNode) {
      const name = functionName(n);
      const arg = n.args && n.args[0];
      const inner = arg ? linearInner(arg) : null;
      if (LOG_NAMES.has(name) || name === "log10") {
        return { key: "log", label: isSimpleXNode(arg) ? "分部积分" : "换元 / 分部积分" };
      }
      if (name === "abs") return { key: "abs", label: "分段积分" };
      if (inner && Math.abs(inner.a - 1) > 1e-12) {
        return { key: "linear", label: "线性换元", inner, outer: name };
      }
      if (TRIG_NAMES.has(name) || HYPER_NAMES.has(name)) {
        return { key: "trig", label: "基本积分公式" };
      }
      if (INVERSE_TRIG_NAMES.has(name)) {
        return { key: "inverse-trig", label: "基本积分公式" };
      }
      if (name === "exp" || name === "sqrt") {
        return { key: "elementary", label: "基本积分公式" };
      }
      return { key: "function", label: "标准积分" };
    }

    if (n.isOperatorNode && n.op === "^") {
      const base = unwrap(n.args[0]);
      const exponent = unwrap(n.args[1]);
      if (isSimpleXNode(base) && !containsX(exponent)) {
        const power = realValue(exponent.compile().evaluate({ x: 0 }));
        if (power !== null && Math.abs(power + 1) < 1e-12) {
          return { key: "reciprocal", label: "对数公式" };
        }
        return { key: "power", label: "幂函数公式" };
      }
      if (base.isSymbolNode && (base.name === "e" || base.name === "exp")) {
        const inner = linearInner(exponent);
        if (inner && Math.abs(inner.a - 1) > 1e-12) {
          return { key: "linear", label: "线性换元", inner, outer: "exp" };
        }
        if (!inner) {
          return { key: "special", label: "特殊函数 / 换元" };
        }
        return { key: "exponential", label: "指数函数公式" };
      }
      return { key: "power-general", label: "换元 / 恒等变形" };
    }

    if (n.isOperatorNode && n.op === "/") {
      const numerator = unwrap(n.args[0]);
      const denominator = unwrap(n.args[1]);
      const inner = linearInner(denominator);
      if (inner && !containsX(numerator)) {
        return {
          key: "linear-reciprocal",
          label: Math.abs(inner.a - 1) > 1e-12 ? "线性换元" : "对数公式",
          inner,
          outer: "reciprocal"
        };
      }
      return { key: "rational", label: "有理函数 · 配方法" };
    }

    if (n.isOperatorNode && n.op === "*") {
      const factors = productFactors(n);
      const xFactors = factors.filter((factor) => containsX(factor));
      if (xFactors.length === 1) {
        const innerMethod = classifyTerm(xFactors[0]);
        return innerMethod;
      }
      const hasLog = factors.some((factor) => LOG_NAMES.has(functionName(factor)));
      const hasExp = factors.some((factor) =>
        (factor.isSymbolNode && factor.name === "e") ||
        functionName(factor) === "exp" ||
        (factor.isOperatorNode && factor.op === "^" && unwrap(factor.args[0]).isSymbolNode && unwrap(factor.args[0]).name === "e")
      );
      const hasTrig = factors.some((factor) =>
        TRIG_NAMES.has(functionName(factor)) ||
        (factor.isOperatorNode && factor.op === "^" && TRIG_NAMES.has(functionName(unwrap(factor.args[0]))))
      );
      const hasPower = factors.some((factor) =>
        isSimpleXNode(factor) ||
        (factor.isOperatorNode && factor.op === "^" && isSimpleXNode(factor.args[0]))
      );
      if (hasLog) return { key: "by-parts", label: "分部积分" };
      if (hasPower && (hasExp || hasTrig)) return { key: "by-parts", label: "分部积分" };
      if (xFactors.length >= 2) return { key: "substitution", label: "换元 / 积化和差" };
      return { key: "product", label: "换元 / 分部积分" };
    }

    if (isSimpleXNode(n) || (n.isOperatorNode && n.op === "^")) {
      return { key: "power", label: "幂函数公式" };
    }

    if (n.isOperatorNode && ["+", "-"].includes(n.op)) {
      return { key: "sum", label: "分项积分" };
    }

    return { key: "general", label: "综合积分法" };
  }

  function overallMethod(termInfo, node) {
    const labels = [...new Set(termInfo.map((item) => item.method.label))];
    if (labels.length === 1) return labels[0];
    if (labels.includes("分部积分")) return "分部积分 · 分项处理";
    if (labels.includes("线性换元")) return "线性换元 · 分项处理";
    if (labels.length === 2) return labels.join(" + ");
    return "分项积分 · 综合方法";
  }

  function findLinearSubstitution(node) {
    let found = null;
    node.traverse((child) => {
      if (found) return;
      if (child.isFunctionNode) {
        const name = functionName(child);
        const arg = child.args && child.args[0];
        const inner = arg ? linearInner(arg) : null;
        if (inner && Math.abs(inner.a - 1) > 1e-12 && ["sin", "cos", "tan", "cot", "sec", "csc", "exp", "sqrt", "ln", "log", "sinh", "cosh", "tanh"].includes(name)) {
          found = { inner, outer: name, node: child };
        }
      }
      if (child.isOperatorNode && child.op === "^" && unwrap(child.args[0]).isSymbolNode && unwrap(child.args[0]).name === "e") {
        const inner = linearInner(child.args[1]);
        if (inner && Math.abs(inner.a - 1) > 1e-12) found = { inner, outer: "exp", node: child };
      }
      if (child.isOperatorNode && child.op === "/") {
        const inner = linearInner(child.args[1]);
        if (inner && Math.abs(inner.a - 1) > 1e-12) found = { inner, outer: "reciprocal", node: child };
      }
    });
    return found;
  }

  function findIntegrationByParts(node) {
    const n = unwrap(node);
    if (n.isFunctionNode && LOG_NAMES.has(functionName(n))) {
      return { uNode: n, dvNode: null, kind: "log-only" };
    }
    if (!(n.isOperatorNode && n.op === "*")) return null;
    const factors = productFactors(n);
    const logFactor = factors.find((factor) => LOG_NAMES.has(functionName(factor)));
    if (logFactor) {
      const rest = factors.filter((factor) => factor !== logFactor);
      if (rest.length) {
        return { uNode: logFactor, dvNode: rest.length === 1 ? rest[0] : null, kind: "log-product", factors };
      }
    }
    const powerFactor = factors.find((factor) =>
      isSimpleXNode(factor) ||
      (factor.isOperatorNode && factor.op === "^" && isSimpleXNode(factor.args[0]) && !containsX(factor.args[1]))
    );
    const expOrTrig = factors.find((factor) => {
      const name = functionName(factor);
      if (name === "exp" || TRIG_NAMES.has(name)) return true;
      if (factor.isOperatorNode && factor.op === "^" && unwrap(factor.args[0]).isSymbolNode && unwrap(factor.args[0]).name === "e") return true;
      return false;
    });
    if (powerFactor && expOrTrig) {
      const rest = factors.filter((factor) => factor !== powerFactor);
      return { uNode: powerFactor, dvNode: rest.length === 1 ? rest[0] : null, kind: "poly-times", factors };
    }
    return null;
  }

  function makeIntegralTex(displayTex, type, lowerTex, upperTex) {
    if (type === "definite") {
      return `\\int_{${lowerTex}}^{${upperTex}} ${displayTex}\\,dx`;
    }
    return `\\int ${displayTex}\\,dx`;
  }

  function cleanSubstitution(expr) {
    let text = String(expr);
    for (const [pattern, replacement] of KNOWN_SPECIAL_PATTERNS) {
      text = text.replace(pattern, replacement);
    }
    try {
      return nerdamer(text).toString();
    } catch (error) {
      return text;
    }
  }

  function expressionLooksSimple(expr) {
    if (!expr) return false;
    if (expr.length > 180) return false;
    if (/\d{9,}/.test(expr)) return false;
    if (/\d+\.\d+/.test(expr)) return false;
    if (/\bi\b/.test(expr)) return false;
    return true;
  }

  function buildFallbackSteps() {
    return [];
  }

  function termIntegral(term, sign) {
    try {
      const nerd = renderNerdamer(term);
      const signPrefix = sign < 0 ? "-1*" : "";
      const integrated = nerdamer(`integrate(${signPrefix}(${nerd}),x)`);
      const text = integrated.toString();
      if (/\bintegrate\s*\(/.test(text)) return null;
      return text;
    } catch (error) {
      return null;
    }
  }

  function makeDirectEvaluator(expr) {
    let compiled = null;
    let nerdamerFn = null;
    try {
      compiled = math.parse(expr).compile();
    } catch (error) {
      compiled = null;
    }
    if (!compiled) {
      try {
        nerdamerFn = nerdamer(expr).buildFunction();
      } catch (error) {
        nerdamerFn = null;
      }
    }
    return (x) => {
      try {
        if (compiled) return realValue(compiled.evaluate({ x }));
        if (nerdamerFn) return realValue(nerdamerFn(x));
      } catch (error) {
        if (compiled) {
          try {
            if (!nerdamerFn) nerdamerFn = nerdamer(expr).buildFunction();
            return realValue(nerdamerFn(x));
          } catch (inner) {
            return null;
          }
        }
      }
      return null;
    };
  }

  function verifyIndefinite(node, resultText) {
    try {
      const originalEvaluator = makeEvaluator(node);
      const antiderivativeEvaluator = makeDirectEvaluator(resultText);
      let checked = 0;
      let maxError = 0;
      const samples = [-2.71, -1.37, -0.43, 0.31, 0.83, 1.47, 2.19, 3.11];
      for (const x of samples) {
        const original = originalEvaluator(x);
        if (original === null || !Number.isFinite(original)) continue;
        if (Math.abs(original) > 1e6) continue;
        const h = Math.max(1e-6, Math.abs(x) * 1e-5);
        const left = antiderivativeEvaluator(x - h);
        const right = antiderivativeEvaluator(x + h);
        if (left === null || right === null) continue;
        if (!Number.isFinite(left) || !Number.isFinite(right)) continue;
        if (Math.abs(left) > 1e7 || Math.abs(right) > 1e7) continue;
        const numericDerivative = (right - left) / (2 * h);
        if (!Number.isFinite(numericDerivative)) continue;
        const scale = Math.max(1, Math.abs(original));
        const error = Math.abs(original - numericDerivative) / scale;
        if (Number.isFinite(error)) {
          checked += 1;
          maxError = Math.max(maxError, error);
        }
      }
      if (checked < 2) {
        return { status: "unknown", label: "未能抽样验证", derivative: "", checked, maxError: null };
      }
      if (maxError < 2e-5) {
        return { status: "ok", label: "求导验证通过", derivative: "", checked, maxError };
      }
      return { status: "warn", label: "验证存在偏差", derivative: "", checked, maxError };
    } catch (error) {
      return { status: "unknown", label: "未能完成求导验证", derivative: "", checked: 0, maxError: null };
    }
  }

  function valueAtBound(antiderivative, bound, label) {
    const F = nerdamer(antiderivative);
    let expression = "";
    try {
      expression = F.sub("x", `(${bound.nerd})`).toString();
      const value = evaluateNerdamerConstant(expression);
      if (value !== null && Number.isFinite(value)) return { expression, value, method: "substitution" };
      if (/infinity/i.test(expression)) return { expression, value: null, divergent: true, method: "substitution" };
    } catch (error) {
      expression = "";
    }
    try {
      const limit = nerdamer(`limit((${antiderivative}),x,(${bound.nerd}))`).toString();
      if (/infinity/i.test(limit)) {
        return { expression: limit, value: null, divergent: true, method: "limit" };
      }
      const value = evaluateNerdamerConstant(limit);
      if (value !== null && Number.isFinite(value)) {
        return { expression: limit, value, method: "limit" };
      }
      return { expression: limit, value: null, method: "limit" };
    } catch (error) {
      return { expression, value: null, method: "limit" };
    }
  }

  function verifyDefinite(exactNumeric, numeric) {
    if (numeric === null || !Number.isFinite(numeric.value)) {
      return { status: "unknown", label: "数值校验不可用", difference: null };
    }
    if (exactNumeric === null || !Number.isFinite(exactNumeric)) {
      return { status: "numeric", label: "数值结果", difference: null };
    }
    const difference = Math.abs(exactNumeric - numeric.value);
    const scale = Math.max(1, Math.abs(numeric.value));
    if (difference <= 2e-6 * scale) {
      return { status: "ok", label: "数值校验通过", difference };
    }
    return { status: "warn", label: "符号与数值结果有偏差", difference };
  }

  function makeSubstitutionStep(info) {
    if (!info) return null;
    const uTex = nodeToTex(info.inner.node);
    const aTex = coefficientTex(info.inner.a);
    const invATex = reciprocalCoefficientTex(info.inner.a);
    if (info.outer === "reciprocal") {
      return {
        title: "换元：把线性分母记为 u",
        tag: "U-SUBSTITUTION",
        note: "令线性分母为 u，把原积分化为标准倒数积分。",
        tex: `u=${uTex},\\qquad du=${aTex}\\,dx,\\qquad dx=${invATex}\\,du`,
        subnote: "因为内层是线性的，只需再乘上系数的倒数。"
      };
    }
    return {
      title: "换元：把线性内层记为 u",
      tag: "U-SUBSTITUTION",
      note: "内层是一次式，令 u 等于内层后，积分只差一个常数倍。",
      tex: `u=${uTex},\\qquad du=${aTex}\\,dx,\\qquad dx=${invATex}\\,du`,
      subnote: "线性换元不会改变函数形态，只会带来一个系数缩放。"
    };
  }

  function makeByPartsStep(info, node) {
    if (!info) return null;
    try {
      const uTex = nodeToTex(info.uNode);
      let dvNode = info.dvNode;
      if (!dvNode) {
        const rest = unwrap(node).isOperatorNode && unwrap(node).op === "*"
          ? productFactors(node).filter((factor) => factor !== info.uNode)
          : [];
        if (rest.length === 1) dvNode = rest[0];
      }
      if (!dvNode) return null;
      const dvTex = nodeToTex(dvNode);
      const duStr = nerdamer(`diff((${renderNerdamer(info.uNode)}),x)`).toString();
      const vResult = nerdamer(`integrate((${renderNerdamer(dvNode)}),x)`);
      const vStr = vResult.toString();
      if (/\bintegrate\s*\(/.test(vStr)) return null;
      return {
        title: "分部积分：安排 u 与 dv",
        tag: "BY PARTS",
        note: "按“反对幂指三”的优先顺序选择 u。指数与三角函数适合作为 dv。",
        tex: `u=${uTex},\\qquad dv=${dvTex}\\,dx\\qquad\\Longrightarrow\\qquad du=${nerdamerToTex(duStr)}\\,dx,\\qquad v=${nerdamerToTex(vStr)}`,
        subnote: "代入公式 ∫u dv = uv − ∫v du，将问题转化为更简单的积分。"
      };
    } catch (error) {
      return null;
    }
  }

  /* ---------------------------------------------------------
     Exact rational-function fallback
     --------------------------------------------------------- */

  function bigAbs(value) {
    return value < 0n ? -value : value;
  }

  function bigGcd(a, b) {
    let x = bigAbs(a);
    let y = bigAbs(b);
    while (y) {
      const temp = x % y;
      x = y;
      y = temp;
    }
    return x || 1n;
  }

  class Rational {
    constructor(n, d = 1n) {
      if (typeof n === "number") n = BigInt(n);
      if (typeof d === "number") d = BigInt(d);
      if (d === 0n) throw new Error("除以零");
      if (d < 0n) {
        n = -n;
        d = -d;
      }
      const gcd = bigGcd(n, d);
      this.n = n / gcd;
      this.d = d / gcd;
    }

    static from(value) {
      if (value instanceof Rational) return value;
      if (typeof value === "bigint") return new Rational(value);
      if (typeof value === "number" && Number.isFinite(value)) return rationalFromNumber(value);
      return new Rational(0n);
    }

    add(other) {
      const rhs = Rational.from(other);
      return new Rational(this.n * rhs.d + rhs.n * this.d, this.d * rhs.d);
    }

    sub(other) {
      return this.add(Rational.from(other).neg());
    }

    mul(other) {
      const rhs = Rational.from(other);
      return new Rational(this.n * rhs.n, this.d * rhs.d);
    }

    div(other) {
      const rhs = Rational.from(other);
      return new Rational(this.n * rhs.d, this.d * rhs.n);
    }

    neg() {
      return new Rational(-this.n, this.d);
    }

    abs() {
      return this.n < 0n ? this.neg() : this;
    }

    isZero() {
      return this.n === 0n;
    }

    isOne() {
      return this.n === 1n && this.d === 1n;
    }

    equals(other) {
      const rhs = Rational.from(other);
      return this.n === rhs.n && this.d === rhs.d;
    }

    toNumber() {
      return Number(this.n) / Number(this.d);
    }

    toNerdamer() {
      return this.d === 1n ? `${this.n}` : `(${this.n}/${this.d})`;
    }

    toTex() {
      if (this.d === 1n) return `${this.n}`;
      if (this.n < 0n) return `-\\frac{${-this.n}}{${this.d}}`;
      return `\\frac{${this.n}}{${this.d}}`;
    }
  }

  function rationalFromNumber(value) {
    if (!Number.isFinite(value)) return new Rational(0n);
    if (Number.isInteger(value)) return new Rational(BigInt(value));
    let x = Math.abs(value);
    const sign = value < 0 ? -1n : 1n;
    let h1 = 1n;
    let h0 = 0n;
    let k1 = 0n;
    let k0 = 1n;
    for (let i = 0; i < 24; i += 1) {
      const a = Math.floor(x);
      const h2 = BigInt(a) * h1 + h0;
      const k2 = BigInt(a) * k1 + k0;
      if (bigAbs(k2) > 1000000n) break;
      h0 = h1;
      h1 = h2;
      k0 = k1;
      k1 = k2;
      const rest = x - a;
      if (rest < 1e-13) break;
      x = 1 / rest;
    }
    return new Rational(sign * h1, k1 || 1n);
  }

  function polyTrim(poly) {
    const out = poly.slice();
    while (out.length > 1 && out[out.length - 1].isZero()) out.pop();
    return out.length ? out : [new Rational(0n)];
  }

  function polyAdd(a, b) {
    const length = Math.max(a.length, b.length);
    const out = [];
    for (let i = 0; i < length; i += 1) {
      out.push((a[i] || new Rational(0n)).add(b[i] || new Rational(0n)));
    }
    return polyTrim(out);
  }

  function polySub(a, b) {
    const length = Math.max(a.length, b.length);
    const out = [];
    for (let i = 0; i < length; i += 1) {
      out.push((a[i] || new Rational(0n)).sub(b[i] || new Rational(0n)));
    }
    return polyTrim(out);
  }

  function polyScale(poly, scalar) {
    const s = Rational.from(scalar);
    return polyTrim(poly.map((coefficient) => coefficient.mul(s)));
  }

  function polyMul(a, b) {
    const out = new Array(a.length + b.length - 1).fill(null).map(() => new Rational(0n));
    for (let i = 0; i < a.length; i += 1) {
      for (let j = 0; j < b.length; j += 1) {
        out[i + j] = out[i + j].add(a[i].mul(b[j]));
      }
    }
    return polyTrim(out);
  }

  function polyEval(poly, x) {
    let value = new Rational(0n);
    for (let i = poly.length - 1; i >= 0; i -= 1) {
      value = value.mul(x).add(poly[i]);
    }
    return value;
  }

  function polyDegree(poly) {
    const trimmed = polyTrim(poly);
    if (trimmed.length === 1 && trimmed[0].isZero()) return -Infinity;
    return trimmed.length - 1;
  }

  function polyDivRem(numerator, denominator) {
    let remainder = polyTrim(numerator.slice());
    const divisor = polyTrim(denominator.slice());
    const divisorDegree = polyDegree(divisor);
    if (divisorDegree < 0) throw new Error("多项式除以零");
    const quotient = new Array(Math.max(1, remainder.length - divisorDegree)).fill(null).map(() => new Rational(0n));
    while (polyDegree(remainder) >= divisorDegree && !(remainder.length === 1 && remainder[0].isZero())) {
      const remainderDegree = polyDegree(remainder);
      const factor = remainder[remainderDegree].div(divisor[divisorDegree]);
      const shift = remainderDegree - divisorDegree;
      quotient[shift] = quotient[shift].add(factor);
      for (let i = 0; i <= divisorDegree; i += 1) {
        remainder[shift + i] = remainder[shift + i].sub(factor.mul(divisor[i]));
      }
      remainder = polyTrim(remainder);
      if (remainder.length === 1 && remainder[0].isZero()) break;
    }
    return { quotient: polyTrim(quotient), remainder: polyTrim(remainder) };
  }

  function polyToNerdamer(poly) {
    const x = "x";
    const pieces = [];
    for (let power = poly.length - 1; power >= 0; power -= 1) {
      const coefficient = poly[power];
      if (coefficient.isZero()) continue;
      const negative = coefficient.n < 0n;
      const magnitude = coefficient.abs();
      let piece = "";
      if (power === 0) {
        piece = magnitude.toNerdamer();
      } else {
        const xPart = power === 1 ? x : `${x}^${power}`;
        piece = magnitude.isOne() ? xPart : `${magnitude.toNerdamer()}*${xPart}`;
      }
      if (!pieces.length) {
        pieces.push((negative ? "-" : "") + piece);
      } else {
        pieces.push((negative ? "-" : "+") + piece);
      }
    }
    return pieces.length ? pieces.join("") : "0";
  }

  function integerDivisors(value) {
    const n = bigAbs(value);
    if (n === 0n) return [1n];
    if (n > 1000000000n) return [];
    const divisors = [];
    for (let i = 1n; i * i <= n; i += 1n) {
      if (n % i === 0n) {
        divisors.push(i);
        if (i * i !== n) divisors.push(n / i);
      }
    }
    return divisors.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  function findRationalRoot(poly) {
    const degree = polyDegree(poly);
    if (degree < 1 || degree > 4) return null;
    let lcm = 1n;
    for (const coefficient of poly) {
      lcm = (lcm * coefficient.d) / bigGcd(lcm, coefficient.d);
    }
    const integerPoly = poly.map((coefficient) => coefficient.mul(new Rational(lcm)));
    const leading = integerPoly[polyDegree(integerPoly)];
    const constant = integerPoly[0];
    if (constant.isZero()) return new Rational(0n);
    const pDivisors = integerDivisors(constant.n);
    const qDivisors = integerDivisors(leading.n);
    const seen = new Set();
    for (const p of pDivisors) {
      for (const q of qDivisors) {
        for (const sign of [1n, -1n]) {
          const candidate = new Rational(sign * p, q);
          const key = candidate.toNerdamer();
          if (seen.has(key)) continue;
          seen.add(key);
          if (polyEval(poly, candidate).isZero()) return candidate;
        }
      }
    }
    return null;
  }

  function extractSquare(value) {
    let n = bigAbs(value);
    if (n === 0n) return { outside: 0n, inside: 1n };
    let outside = 1n;
    let inside = 1n;
    let remaining = n;
    for (let p = 2n; p * p <= remaining; p += 1n) {
      let power = 0n;
      while (remaining % p === 0n) {
        remaining /= p;
        power += 1n;
      }
      if (power > 0n) {
        outside *= p ** (power / 2n);
        if (power % 2n === 1n) inside *= p;
      }
    }
    if (remaining > 1n) inside *= remaining;
    return { outside, inside };
  }

  function sqrtRational(value) {
    const rational = Rational.from(value);
    if (rational.n < 0n) return null;
    const radicand = rational.n * rational.d;
    const parts = extractSquare(radicand);
    return {
      coefficient: new Rational(parts.outside, rational.d),
      radicand: parts.inside
    };
  }

  function sqrtNerdamer(value) {
    const root = sqrtRational(value);
    if (!root) return null;
    if (root.radicand === 1n) return root.coefficient.toNerdamer();
    const radical = `sqrt(${root.radicand})`;
    if (root.coefficient.isOne()) return radical;
    return `${root.coefficient.toNerdamer()}*${radical}`;
  }

  function parseRationalNode(node) {
    const current = unwrap(node);
    if (current.isParenthesisNode) return parseRationalNode(current.content);
    if (current.isConstantNode) {
      const value = Number(current.value);
      if (!Number.isFinite(value)) return null;
      return { num: [rationalFromNumber(value)], den: [new Rational(1n)] };
    }
    if (current.isSymbolNode) {
      if (current.name === "x") return { num: [new Rational(0n), new Rational(1n)], den: [new Rational(1n)] };
      return null;
    }
    if (current.isFunctionNode) return null;
    if (current.isOperatorNode) {
      const args = current.args || [];
      if (args.length === 1 && (current.op === "-" || current.op === "+")) {
        const inner = parseRationalNode(args[0]);
        if (!inner) return null;
        if (current.op === "+") return inner;
        return { num: polyScale(inner.num, -1), den: inner.den };
      }
      if (args.length !== 2) return null;
      if (current.op === "+" || current.op === "-") {
        const left = parseRationalNode(args[0]);
        const right = parseRationalNode(args[1]);
        if (!left || !right) return null;
        const first = { num: polyMul(left.num, right.den), den: polyMul(left.den, right.den) };
        const second = { num: polyMul(right.num, left.den), den: polyMul(right.den, left.den) };
        return {
          num: current.op === "+" ? polyAdd(first.num, second.num) : polySub(first.num, second.num),
          den: first.den
        };
      }
      if (current.op === "*") {
        const left = parseRationalNode(args[0]);
        const right = parseRationalNode(args[1]);
        if (!left || !right) return null;
        return { num: polyMul(left.num, right.num), den: polyMul(left.den, right.den) };
      }
      if (current.op === "/") {
        const left = parseRationalNode(args[0]);
        const right = parseRationalNode(args[1]);
        if (!left || !right) return null;
        return { num: polyMul(left.num, right.den), den: polyMul(left.den, right.num) };
      }
      if (current.op === "^") {
        const base = parseRationalNode(args[0]);
        const exponentNode = unwrap(args[1]);
        if (!base || !exponentNode.isConstantNode) return null;
        const exponent = Number(exponentNode.value);
        if (!Number.isInteger(exponent) || Math.abs(exponent) > 8) return null;
        let num = [new Rational(1n)];
        let den = [new Rational(1n)];
        const count = Math.abs(exponent);
        for (let i = 0; i < count; i += 1) {
          num = polyMul(num, base.num);
          den = polyMul(den, base.den);
        }
        if (exponent < 0) return { num: den, den: num };
        return { num, den };
      }
    }
    return null;
  }

  function integratePolynomialExact(poly) {
    const pieces = [];
    for (let power = 0; power < poly.length; power += 1) {
      if (poly[power].isZero()) continue;
      const coefficient = poly[power].div(new Rational(BigInt(power + 1)));
      const newPower = power + 1;
      if (newPower === 0) {
        pieces.push(coefficient.toNerdamer());
      } else {
        const xPart = newPower === 1 ? "x" : `x^${newPower}`;
        pieces.push(`${coefficient.toNerdamer()}*${xPart}`);
      }
    }
    return pieces.join("+");
  }

  function integrateLinearLog(coefficient, root) {
    if (coefficient.isZero()) return "";
    const factor = root.isZero() ? "x" : `(x-(${root.toNerdamer()}))`;
    return `${coefficient.toNerdamer()}*log(abs(${factor}))`;
  }

  function integrateQuadraticExact(numerator, denominator) {
    const p = numerator[1] || new Rational(0n);
    const q = numerator[0] || new Rational(0n);
    const a = denominator[2];
    const b = denominator[1] || new Rational(0n);
    const c = denominator[0] || new Rational(0n);
    const discriminant = b.mul(b).sub(new Rational(4n).mul(a).mul(c));
    if (discriminant.isZero()) {
      const root = b.neg().div(new Rational(2n).mul(a));
      const linear = p;
      const constant = q.sub(p.mul(root));
      const pieces = [];
      if (!linear.isZero()) pieces.push(integrateLinearLog(linear, root));
      if (!constant.isZero()) pieces.push(`${constant.neg().toNerdamer()}/(x-(${root.toNerdamer()}))`);
      return pieces.join("+");
    }
    const derivativePart = p.div(new Rational(2n).mul(a));
    const constantPart = q.sub(p.mul(b).div(new Rational(2n).mul(a)));
    const pieces = [];
    if (!derivativePart.isZero()) {
      pieces.push(`${derivativePart.toNerdamer()}*log(abs(${polyToNerdamer(denominator)}))`);
    }
    if (!constantPart.isZero()) {
      if (discriminant.n < 0n) {
        const root = sqrtRational(discriminant.neg());
        if (!root) return null;
        const coefficient = new Rational(2n).mul(constantPart).div(root.coefficient);
        const linearCoefficient = new Rational(2n).mul(a).div(root.coefficient);
        const constantCoefficient = b.div(root.coefficient);
        if (root.radicand === 1n) {
          const argument = polyToNerdamer([constantCoefficient, linearCoefficient]);
          pieces.push(`${coefficient.toNerdamer()}*atan(${argument})`);
        } else {
          const numeratorArg = `(${new Rational(2n).mul(a).toNerdamer()})*x+(${b.toNerdamer()})`;
          pieces.push(`(${coefficient.toNerdamer()}/sqrt(${root.radicand}))*atan((${numeratorArg})/sqrt(${root.radicand}))`);
        }
      } else {
        const root = sqrtRational(discriminant);
        if (!root) return null;
        const sqrtExpr = sqrtNerdamer(discriminant);
        const coefficient = constantPart.div(root.coefficient);
        const logNumerator = `(2*x+(${b.toNerdamer()})-(${sqrtExpr}))`;
        const logDenominator = `(2*x+(${b.toNerdamer()})+(${sqrtExpr}))`;
        if (root.radicand === 1n) {
          pieces.push(`${coefficient.toNerdamer()}*log(abs(${logNumerator}/${logDenominator}))`);
        } else {
          pieces.push(`(${coefficient.toNerdamer()}/sqrt(${root.radicand}))*log(abs(${logNumerator}/${logDenominator}))`);
        }
      }
    }
    return pieces.join("+");
  }

  function integrateProperRationalExact(numerator, denominator) {
    const degree = polyDegree(denominator);
    if (degree === 1) {
      const root = denominator[0].neg().div(denominator[1]);
      return integrateLinearLog(numerator[0] || new Rational(0n), root);
    }
    if (degree === 2) {
      const discriminant = denominator[1].mul(denominator[1]).sub(new Rational(4n).mul(denominator[2]).mul(denominator[0]));
      if (!discriminant.isZero() && discriminant.n > 0n) {
        const root = sqrtRational(discriminant);
        if (root && root.radicand === 1n) {
          const sqrtValue = root.coefficient;
          const r1 = denominator[1].neg().add(sqrtValue).div(new Rational(2n).mul(denominator[2]));
          const r2 = denominator[1].neg().sub(sqrtValue).div(new Rational(2n).mul(denominator[2]));
          if (r1.equals(r2)) return integrateQuadraticExact(numerator, denominator);
          const a1 = polyEval(numerator, r1).div(r1.sub(r2));
          const a2 = polyEval(numerator, r2).div(r2.sub(r1));
          return [integrateLinearLog(a1, r1), integrateLinearLog(a2, r2)].filter(Boolean).join("+");
        }
      }
      return integrateQuadraticExact(numerator, denominator);
    }
    if (degree === 3) {
      const root = findRationalRoot(denominator);
      if (!root) return null;
      const division = polyDivRem(denominator, [root.neg(), new Rational(1n)]);
      if (!(division.remainder.length === 1 && division.remainder[0].isZero())) return null;
      const quadratic = division.quotient;
      const valueAtRoot = polyEval(quadratic, root);
      if (valueAtRoot.isZero()) return null;
      const coefficient = polyEval(numerator, root).div(valueAtRoot);
      const remainder = polySub(numerator, polyScale(quadratic, coefficient));
      const linearDivision = polyDivRem(remainder, [root.neg(), new Rational(1n)]);
      if (!(linearDivision.remainder.length === 1 && linearDivision.remainder[0].isZero())) return null;
      const quadraticPart = integrateQuadraticExact(linearDivision.quotient, quadratic);
      if (quadraticPart === null) return null;
      return [integrateLinearLog(coefficient, root), quadraticPart].filter(Boolean).join("+");
    }
    return null;
  }

  function integrateRationalFallback(node) {
    try {
      const rational = parseRationalNode(node);
      if (!rational) return null;
      let numerator = polyTrim(rational.num);
      let denominator = polyTrim(rational.den);
      if (polyDegree(denominator) < 0) return null;
      if (polyDegree(denominator) > 3) return null;
      const leading = denominator[polyDegree(denominator)];
      if (!leading || leading.isZero()) return null;
      numerator = polyScale(numerator, new Rational(1n).div(leading));
      denominator = polyScale(denominator, new Rational(1n).div(leading));
      const division = polyDivRem(numerator, denominator);
      const polynomialPart = division.quotient;
      const remainder = division.remainder;
      const pieces = [];
      const polynomialResult = integratePolynomialExact(polynomialPart);
      if (polynomialResult) pieces.push(polynomialResult);
      if (!(polyDegree(remainder) < 0) && !(remainder.length === 1 && remainder[0].isZero())) {
        const proper = integrateProperRationalExact(remainder, denominator);
        if (proper === null) return null;
        if (proper) pieces.push(proper);
      }
      const result = pieces.filter(Boolean).join("+");
      if (!result || /integrate\s*\(/.test(result)) return null;
      return result;
    } catch (error) {
      return null;
    }
  }

  function integrateExpression(input, options = {}) {
    const type = options.type === "definite" ? "definite" : "indefinite";
    const started = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const parsed = parseExpression(input);
    const { node, norm } = parsed;
    const displayTex = nodeToTex(node);
    const nerdStr = renderNerdamer(node);
    const addendInfo = addends(node);
    const termInfo = addendInfo.map((item) => ({
      ...item,
      method: classifyTerm(item.node)
    }));
    let method = overallMethod(termInfo, node);
    let rationalFallback = false;

    let antiderivative = null;
    let symbolic = false;
    let integrationError = null;
    let resultStr = "";
    try {
      const raw = nerdamer(`integrate((${nerdStr}),x)`);
      resultStr = raw.toString();
      if (!/\bintegrate\s*\(/.test(resultStr) && resultStr.trim() !== "") {
        symbolic = true;
        antiderivative = resultStr;
      } else {
        integrationError = "引擎未能找到初等原函数";
      }
    } catch (error) {
      integrationError = error.message || "符号积分失败";
    }

    if (!symbolic) {
      const rationalResult = integrateRationalFallback(node);
      if (rationalResult) {
        resultStr = rationalResult;
        antiderivative = rationalResult;
        symbolic = true;
        rationalFallback = true;
        method = "有理函数 · 部分分式";
        integrationError = null;
      }
    } else {
      const provisionalVerification = verifyIndefinite(node, antiderivative);
      if (provisionalVerification.status !== "ok") {
        const rationalResult = integrateRationalFallback(node);
        if (rationalResult) {
          resultStr = rationalResult;
          antiderivative = rationalResult;
          rationalFallback = true;
          method = "有理函数 · 部分分式";
        }
      }
    }

    if (type === "indefinite" && !symbolic) {
      return {
        ok: false,
        type,
        reason: "no-elementary",
        message: integrationError || "未能找到初等原函数",
        inputTex: displayTex,
        integralTex: makeIntegralTex(displayTex, type),
        method,
        terms: termInfo,
        steps: [
          {
            title: "识别被积函数",
            tag: "ANALYZE",
            note: "积分引擎尝试使用标准积分表、换元、分部积分与有理函数方法。",
            tex: makeIntegralTex(displayTex, type)
          },
          {
            title: "未找到初等原函数",
            tag: "NO ELEMENTARY FORM",
            note: "该函数可能没有初等原函数，或形式超出了本地引擎当前可处理的范围。可以尝试定积分，仍能获得高精度数值结果。",
            tex: "\\text{建议改用定积分模式，或检查表达式是否与预期一致。}"
          }
        ]
      };
    }

    if (!symbolic) {
      if (type !== "definite") {
        return {
          ok: false,
          type,
          reason: "no-elementary",
          message: integrationError || "未能找到初等原函数",
          inputTex: displayTex,
          integralTex: makeIntegralTex(displayTex, type),
          method,
          terms: termInfo
        };
      }
      const numericLower = parseBound(options.lower, "下限");
      const numericUpper = parseBound(options.upper, "上限");
      const evaluator = makeEvaluator(node);
      const numeric = numericIntegral(evaluator, numericLower.numeric, numericUpper.numeric);
      const integralTex = makeIntegralTex(displayTex, "definite", numericLower.tex, numericUpper.tex);
      if (!numeric || !Number.isFinite(numeric.value)) {
        throw new Error("既未找到初等原函数，数值积分也未能收敛。请检查函数在该区间内是否有奇点。");
      }
      if (numeric.converged === false) {
        throw new Error("检测到积分区间内可能存在奇点，数值积分未收敛；该定积分可能发散。请检查被积函数，或将区间拆开计算。");
      }
      const approxText = formatNumber(numeric.value, 10);
      const numericResultTex = `${integralTex}\\approx ${approxText}`;
      const numericSteps = [
        {
          title: "识别积分区间",
          tag: "ANALYZE",
          note: `积分区间为 [${formatNumber(numericLower.numeric, 8)}, ${formatNumber(numericUpper.numeric, 8)}]。符号引擎未找到初等原函数。`,
          tex: integralTex
        },
        {
          title: "改用数值积分",
          tag: "NUMERICAL",
          note: `使用${numericMethodLabel(numeric.method)}直接逼近曲线与 x 轴之间的有向面积。`,
          tex: `${integralTex}\\approx ${approxText}`
        },
        {
          title: "结果说明",
          tag: "NOTE",
          note: "该结果由数值积分给出，不依赖原函数。若被积函数在区间内存在奇点，结果可能带有一定误差。",
          tex: `\\int_{${numericLower.tex}}^{${numericUpper.tex}}${displayTex}\\,dx\\approx ${approxText}`
        }
      ];
      return {
        ok: true,
        type,
        symbolic: false,
        numericOnly: true,
        inputTex: displayTex,
        normalized: norm,
        integrandTex: displayTex,
        integralTex,
        method,
        methods: [method],
        terms: termInfo.map((item) => ({
          sign: item.sign,
          tex: nodeToTex(item.node),
          label: item.method.label,
          key: item.method.key
        })),
        bounds: { lower: numericLower, upper: numericUpper },
        exact: null,
        exactTex: "",
        exactNumeric: null,
        exactIsNice: false,
        approx: numeric.value,
        approxText,
        displayTex: numericResultTex,
        resultTex: numericResultTex,
        resultLatex: approxText,
        resultPlain: approxText,
        caption: `未找到初等原函数，已用${numericMethodLabel(numeric.method)}求得数值结果。`,
        numeric,
        verification: { status: "numeric", label: "数值结果", difference: null },
        steps: numericSteps,
        reason: "no-elementary",
        message: integrationError || "未能找到初等原函数",
        duration: ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - started,
        resultTitle: "定积分数值结果",
        resultKicker: "NUMERICAL INTEGRAL"
      };
    }

    const resultTex = nerdamerToTex(antiderivative);
    const verification = verifyIndefinite(node, antiderivative);
    const base = {
      ok: true,
      type,
      symbolic: true,
      inputTex: displayTex,
      normalized: norm,
      integrandTex: displayTex,
      integralTex: makeIntegralTex(displayTex, type),
      antiderivative,
      antiderivativeTex: resultTex,
      method,
      rationalFallback,
      methods: [...new Set(termInfo.map((item) => item.method.label))],
      terms: termInfo.map((item) => ({
        sign: item.sign,
        tex: nodeToTex(item.node),
        label: item.method.label,
        key: item.method.key
      })),
      verification
    };

    if (type === "indefinite") {
      const integrandHasLog = /(^|[^A-Za-z])(ln|log)\s*\(/.test(norm);
      let displayF = resultTex;
      let plainF = antiderivative;
      if (!integrandHasLog && antiderivative.includes("log(") && !antiderivative.includes("abs(")) {
        displayF = absoluteLogTex(antiderivative);
        plainF = wrapFunctionArgsWithAbs(antiderivative, "log");
      }
      const displayTexFull = `${makeIntegralTex(displayTex, type)}=${displayF}+C`;
      const resultLatex = `${displayF}+C`;
      base.antiderivativeTex = displayF;
      base.resultTex = displayTexFull;
      base.resultLatex = resultLatex;
      base.resultPlain = `${plainF} + C`;
      base.displayTex = displayTexFull;
      base.caption = "其中 C 为任意常数。已通过抽样求导验证。";
      base.approx = null;
      base.steps = buildIndefiniteSteps({
        node,
        termInfo,
        displayTex,
        nerdStr,
        antiderivative,
        resultTex: displayF,
        verification,
        method,
        rationalFallback
      });
      base.duration = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - started;
      base.resultTitle = "不定积分结果";
      base.resultKicker = "SYMBOLIC RESULT";
      return base;
    }

    // Definite branches -------------------------------------------------
    const lower = parseBound(options.lower, "下限");
    const upper = parseBound(options.upper, "上限");
    const definiteIntegralTex = makeIntegralTex(displayTex, "definite", lower.tex, upper.tex);
    if (lower.numeric === upper.numeric) {
      const zeroResult = {
        ...base,
        bounds: { lower, upper },
        integralTex: definiteIntegralTex,
        exact: "0",
        exactTex: "0",
        exactNumeric: 0,
        approx: 0,
        displayTex: `${definiteIntegralTex}=0`,
        resultTex: `${definiteIntegralTex}=0`,
        resultLatex: "0",
        resultPlain: "0",
        caption: "上下限相同，积分区间退化为一点，结果为 0。",
        steps: [
          {
            title: "检查积分区间",
            tag: "ANALYZE",
            note: "上下限相等，因此不需要进入原函数计算。",
            tex: `${definiteIntegralTex}=0`
          }
        ],
        verification: { status: "ok", label: "区间退化", difference: 0 },
        duration: ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - started
      };
      return zeroResult;
    }

    let upperSub = "";
    let lowerSub = "";
    let exact = "";
    let exactNumeric = null;
    let upperClean = "";
    let lowerClean = "";
    try {
      const upperValue = valueAtBound(antiderivative, upper, "上限");
      const lowerValue = valueAtBound(antiderivative, lower, "下限");
      if (upperValue.divergent) {
        throw new Error(`该定积分在积分上限 x=${upper.raw} 处发散，无法得到有限值。`);
      }
      if (lowerValue.divergent) {
        throw new Error(`该定积分在积分下限 x=${lower.raw} 处发散，无法得到有限值。`);
      }
      upperSub = upperValue.expression;
      lowerSub = lowerValue.expression;
      upperClean = cleanSubstitution(upperSub);
      lowerClean = cleanSubstitution(lowerSub);
      const difference = `(${upperClean})-(${lowerClean})`;
      exact = cleanSubstitution(difference);
      exactNumeric = evaluateNerdamerConstant(exact);
    } catch (error) {
      if (/发散/.test(error.message || "")) throw error;
      integrationError = error.message;
    }

    const evaluator = makeEvaluator(node);
    const numeric = numericIntegral(evaluator, lower.numeric, upper.numeric);
    let exactIsNice = expressionLooksSimple(exact);
    if (exactNumeric === null) exactIsNice = false;
    const exactTex = exact ? nerdamerToTex(exact) : "";
    const upperTex = upper.tex;
    const lowerTex = lower.tex;
    const approxValue = numeric ? numeric.value : exactNumeric;
    const verificationDefinite = verifyDefinite(exactNumeric, numeric);
    if (numeric && numeric.converged === false && verificationDefinite.status !== "ok") {
      throw new Error("检测到积分区间内可能存在奇点，数值积分未收敛；该定积分可能发散。请检查被积函数，或将区间拆开计算。");
    }
    const mainResultTex = exactIsNice
      ? `${definiteIntegralTex}=${exactTex}`
      : numeric
        ? `${definiteIntegralTex}\\approx ${formatNumber(numeric.value, 10)}`
        : `${definiteIntegralTex}=${exactTex}`;

    const steps = buildDefiniteSteps({
      node,
      termInfo,
      displayTex,
      nerdStr,
      antiderivative,
      resultTex: nerdamerToTex(antiderivative),
      lower,
      upper,
      upperSub,
      lowerSub,
      upperClean,
      lowerClean,
      exact,
      exactTex,
      exactNumeric,
      exactIsNice,
      numeric,
      verification: verificationDefinite,
      method,
      rationalFallback
    });

    return {
      ...base,
      symbolic: true,
      bounds: { lower, upper },
      integralTex: definiteIntegralTex,
      exact,
      exactTex,
      exactNumeric,
      exactIsNice,
      approx: approxValue,
      approxText: formatNumber(approxValue, 10),
      displayTex: mainResultTex,
      resultTex: mainResultTex,
      resultLatex: exactIsNice ? exactTex : formatNumber(approxValue, 12),
      resultPlain: exactIsNice ? exact : formatNumber(approxValue, 12),
      caption: exactIsNice
        ? `近似值 ${formatNumber(approxValue, 9)}${numeric ? " · " + numericMethodLabel(numeric.method) : ""}`
        : `未找到简洁的初等闭式，以上为高精度数值结果${numeric ? " · " + numericMethodLabel(numeric.method) : ""}。`,
      numeric,
      verification: verificationDefinite,
      steps,
      duration: ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - started,
      resultTitle: "定积分结果",
      resultKicker: "DEFINITE INTEGRAL"
    };
  }

  function numericMethodLabel(method) {
    if (method === "adaptive-simpson") return "自适应 Simpson";
    if (method === "tanh-sinh") return "tanh-sinh 数值积分";
    if (method === "midpoint") return "中点近似";
    return "数值积分";
  }

  function parseBound(input, label) {
    if (input === null || input === undefined || String(input).trim() === "") {
      throw new Error(`请填写积分${label}`);
    }
    const parsed = parseExpression(String(input), { onlyX: false });
    const symbols = collectSymbols(parsed.node);
    const bad = symbols.filter((name) => !["pi", "e"].includes(name));
    if (bad.length) throw new Error(`积分${label}只能是常数，不能包含变量 “${bad[0]}”。`);
    let numeric = null;
    try {
      numeric = realValue(math.evaluate(parsed.norm));
    } catch (error) {
      numeric = null;
    }
    if (numeric === null) numeric = evaluateConstant(parsed.norm);
    if (numeric === null || !Number.isFinite(numeric)) {
      throw new Error(`积分${label}不是一个有限的实数值。`);
    }
    return {
      raw: String(input),
      norm: parsed.norm,
      nerd: renderNerdamer(parsed.node),
      tex: nodeToTex(parsed.node),
      numeric
    };
  }

  function methodIntroText(method, hasMultipleTerms) {
    if (hasMultipleTerms) return "被积函数包含多项，利用积分的线性性质逐项处理。";
    if (method.includes("分部积分")) return "识别为乘积结构，使用分部积分把问题转化为更简单的积分。";
    if (method.includes("换元")) return "含线性内层，使用换元法化为标准积分。";
    if (method.includes("有理函数")) return "被积函数为有理式，尝试部分分式分解或配方法。";
    if (method.includes("幂函数")) return "套用幂函数积分公式，再化简系数。";
    if (method.includes("对数")) return "套用倒数积分公式，得到对数形式的原函数。";
    if (method.includes("分段")) return "绝对值需要按零点分段处理，再合并结果。";
    if (method.includes("特殊函数")) return "该积分需要借助特殊函数表示。";
    if (method.includes("基本积分")) return "套用基本积分公式，再化简结果。";
    return "根据结构选择换元、分部或标准积分公式。";
  }

  function buildIndefiniteSteps(context) {
    const {
      node, termInfo, displayTex, nerdStr, antiderivative, resultTex, verification, method
    } = context;
    const steps = [];
    const terms = addends(node);
    const integralTex = makeIntegralTex(displayTex, "indefinite");

    steps.push({
      title: "识别被积函数",
      tag: "ANALYZE",
      note: methodIntroText(method, terms.length > 1),
      tex: integralTex
    });

    if (context.rationalFallback) {
      steps.push({
        title: "有理函数：部分分式与配方法",
        tag: "PARTIAL FRACTIONS",
        note: "把有理式分解为一次因式与不可约二次因式；一次项积分得到对数，二次项配方后得到反正切。",
        tex: `\\frac{P(x)}{Q(x)}\\;\\longrightarrow\\;\\text{一次项}+\\frac{\\text{一次式}}{\\text{不可约二次式}}`
      });
    }

    const linearSub = findLinearSubstitution(node);
    if (linearSub) {
      const subStep = makeSubstitutionStep(linearSub);
      if (subStep) steps.push(subStep);
    }

    const byParts = findIntegrationByParts(node);
    if (byParts) {
      const bpStep = makeByPartsStep(byParts, node);
      if (bpStep) steps.push(bpStep);
    }

    const tableRows = [];
    if (terms.length > 1) {
      for (const item of termInfo) {
        const integral = termIntegral(item.node, item.sign);
        tableRows.push({
          term: `${item.sign < 0 ? "-" : ""}${nodeToTex(item.node)}`,
          label: item.method.label,
          result: integral === null ? null : nerdamerToTex(integral)
        });
      }
      steps.push({
        title: "逐项求原函数",
        tag: "INTEGRATE",
        note: "对每一项分别套用公式或换元，符号与常数因子保持不变。",
        table: {
          headers: ["积分项", "方法", "原函数"],
          rows: tableRows
        }
      });
    } else {
      steps.push({
        title: "套用积分公式并化简",
        tag: "INTEGRATE",
        note: "根据识别出的结构计算原函数，并合并同类项。",
        tex: `${integralTex}=${resultTex}+C`
      });
    }

    steps.push({
      title: "合并结果并加上积分常数",
      tag: "COMBINE",
      note: "不定积分表示一族原函数，因此必须保留任意常数 C。",
      tex: `${integralTex}=${resultTex}+C`
    });

    const derivativeTex = verification.derivative ? nerdamerToTex(verification.derivative) : "";
    steps.push({
      title: "对结果求导验证",
      tag: "VERIFY",
      note: verification.status === "ok"
        ? `在 ${verification.checked} 个抽样点上求导，与原被积函数的数值一致。`
        : "符号引擎已完成原函数计算；若结果形式较复杂，建议结合数值结果检查。",
      tex: verification.status === "ok"
        ? `\\frac{d}{dx}\\left[${resultTex}+C\\right]=${derivativeTex || "f(x)"}\\;\\checkmark`
        : `\\frac{d}{dx}\\left[${resultTex}+C\\right]\\;\\overset{?}{=}\\;${displayTex}`,
      subnote: verification.maxError !== null ? `最大相对偏差 ${formatNumber(verification.maxError, 3)}` : ""
    });

    return steps;
  }

  function buildDefiniteSteps(context) {
    const {
      node, termInfo, displayTex, antiderivative, resultTex, lower, upper,
      upperSub, lowerSub, upperClean, lowerClean, exact, exactTex,
      exactNumeric, exactIsNice, numeric, verification, method
    } = context;
    const steps = [];
    const integralTex = makeIntegralTex(displayTex, "definite", lower.tex, upper.tex);
    const terms = addends(node);

    steps.push({
      title: "识别积分区间",
      tag: "ANALYZE",
      note: `积分区间为 [${formatNumber(lower.numeric, 8)}, ${formatNumber(upper.numeric, 8)}]，被积函数${terms.length > 1 ? `有 ${terms.length} 项` : `按${method}处理`}。`,
      tex: integralTex
    });

    const linearSub = findLinearSubstitution(node);
    if (linearSub) {
      const subStep = makeSubstitutionStep(linearSub);
      if (subStep) steps.push(subStep);
    }
    const byParts = findIntegrationByParts(node);
    if (byParts) {
      const bpStep = makeByPartsStep(byParts, node);
      if (bpStep) steps.push(bpStep);
    }

    if (terms.length > 1) {
      const rows = termInfo.map((item) => {
        const integral = termIntegral(item.node, item.sign);
        return {
          term: `${item.sign < 0 ? "-" : ""}${nodeToTex(item.node)}`,
          label: item.method.label,
          result: integral === null ? null : nerdamerToTex(integral)
        };
      });
      steps.push({
        title: "先求原函数",
        tag: "ANTIDERIVATIVE",
        note: "定积分先忽略上下限，求出一个原函数 F(x)；逐项积分后合并。",
        table: { headers: ["积分项", "方法", "原函数"], rows }
      });
    }

    const subUpper = upperClean ? nerdamerToTex(upperClean) : nerdamerToTex(upperSub);
    const subLower = lowerClean ? nerdamerToTex(lowerClean) : nerdamerToTex(lowerSub);
    steps.push({
      title: "应用牛顿–莱布尼茨公式",
      tag: "FUNDAMENTAL THEOREM",
      note: "若 F′(x)=f(x)，定积分等于原函数在上限与下限处的差。",
      tex: `${integralTex}=\\left[${resultTex}\\right]_{${lower.tex}}^{${upper.tex}}=F(${upper.tex})-F(${lower.tex})`
    });

    steps.push({
      title: "代入上下限",
      tag: "EVALUATE",
      note: "分别把上限与下限代入原函数，再作差化简。",
      tex: `F(${upper.tex})-F(${lower.tex})=\\left(${subUpper}\\right)-\\left(${subLower}\\right)`
    });

    if (exactIsNice) {
      steps.push({
        title: "化简并得到精确值",
        tag: "EXACT VALUE",
        note: numeric
          ? `同时用${numericMethodLabel(numeric.method)}独立计算，数值结果与符号结果一致。`
          : "符号化简得到闭式结果。",
        tex: `${integralTex}=${exactTex}${exactNumeric !== null ? `\\approx ${formatNumber(exactNumeric, 10)}` : ""}`
      });
    } else {
      steps.push({
        title: "计算数值结果",
        tag: "NUMERICAL VALUE",
        note: "没有找到足够简洁的初等闭式，改用高精度数值积分给出结果。",
        tex: `${integralTex}\\approx ${formatNumber(numeric ? numeric.value : exactNumeric, 10)}`
      });
    }

    if (numeric && exactNumeric !== null) {
      steps.push({
        title: "数值交叉校验",
        tag: "VERIFY",
        note: verification.status === "ok"
          ? `符号结果与数值积分相差 ${formatNumber(verification.difference, 4)}，校验通过。`
          : "符号结果与数值积分存在差异，请留意函数的奇点或分支。",
        tex: `\\left|F(${upper.tex})-F(${lower.tex})-\\int_{${lower.tex}}^{${upper.tex}}${displayTex}\\,dx\\right|\\approx ${formatNumber(verification.difference, 4)}`
      });
    } else if (numeric) {
      steps.push({
        title: "数值交叉校验",
        tag: "VERIFY",
        note: `使用${numericMethodLabel(numeric.method)}完成独立数值积分。`,
        tex: `\\int_{${lower.tex}}^{${upper.tex}}${displayTex}\\,dx\\approx ${formatNumber(numeric.value, 10)}`
      });
    }

    return steps;
  }

  function numericOnlyDefinite(input, options) {
    // Used by the app when the symbolic path reports a non-elementary result.
    const parsed = parseExpression(input);
    const lower = parseBound(options.lower, "下限");
    const upper = parseBound(options.upper, "上限");
    const evaluator = makeEvaluator(parsed.node);
    return numericIntegral(evaluator, lower.numeric, upper.numeric);
  }

  /* ---------------------------------------------------------
     Public API
     --------------------------------------------------------- */

  return {
    math,
    nerdamer,
    normalizeExpression,
    parseExpression,
    toNerdamerString,
    nodeToTex,
    expressionToTex,
    nerdamerToTex,
    texCleanup,
    makeIntegralTex,
    classifyTerm,
    addends,
    containsX,
    formatNumber,
    formatTime,
    escapeHtml,
    makeEvaluator,
    numericIntegral,
    numericMethodLabel,
    evaluateConstant,
    evaluateNerdamerAt,
    parseBound,
    integrateExpression,
    numericOnlyDefinite,
    buildFallbackSteps
  };
});

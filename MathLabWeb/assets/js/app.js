/* =========================================================
   格物 MathLab — application controller
   ========================================================= */
(function () {
  "use strict";

  const MC = window.MathCore;
  const katex = window.katex;

  if (!MC || !katex) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<div style="padding:24px;font-family:sans-serif;color:#9b2c2c">数学引擎加载失败，请确认 assets/vendor 目录中的文件完整。</div>'
    );
    return;
  }

  const COLORS = ["#0e7a5f", "#d45f4d", "#3d6ddb", "#b9822e", "#7a58c9"];
  const SUBSCRIPTS = ["₁", "₂", "₃", "₄", "₅"];

  const FUNCTION_GALLERY = [
    {
      id: "linear", name: "一次函数", formula: "y = x", expr: "x", color: "#0e7a5f",
      subtitle: "最简单的线性关系。",
      description: "图像是一条过原点的直线，斜率表示每单位 x 变化带来的 y 变化。",
      domain: "(-∞, +∞)", range: "(-∞, +∞)", shape: "严格递增；关于原点中心对称",
      features: "零点 x=0；y 轴截距 0；斜率 1",
      view: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 }
    },
    {
      id: "quadratic", name: "二次函数", formula: "y = x²", expr: "x^2", color: "#3d6ddb",
      subtitle: "抛物线的基本形态。",
      description: "偶函数，图像关于 y 轴对称。在顶点处取得最小值，开口方向由二次项系数决定。",
      domain: "(-∞, +∞)", range: "[0, +∞)", shape: "在 (-∞,0] 递减，在 [0,+∞) 递增；关于 y 轴对称",
      features: "顶点 (0,0)；零点 x=0（二重零点）",
      view: { xMin: -4, xMax: 4, yMin: -1, yMax: 9 }
    },
    {
      id: "cubic", name: "三次函数", formula: "y = x³", expr: "x^3", color: "#7a58c9",
      subtitle: "奇函数的代表。",
      description: "图像关于原点中心对称，整体严格递增，但在原点附近会变得平坦。",
      domain: "(-∞, +∞)", range: "(-∞, +∞)", shape: "严格递增；关于原点中心对称",
      features: "零点 x=0；拐点 (0,0)",
      view: { xMin: -3, xMax: 3, yMin: -12, yMax: 12 }
    },
    {
      id: "reciprocal", name: "反比例函数", formula: "y = 1/x", expr: "1/x", color: "#d45f4d",
      subtitle: "带有两条渐近线。",
      description: "在 x=0 处无定义，图像分为两支，以 x 轴和 y 轴为渐近线。",
      domain: "(-∞,0) ∪ (0,+∞)", range: "(-∞,0) ∪ (0,+∞)", shape: "在各自区间内递减；关于原点中心对称",
      features: "无零点；x=0 为垂直渐近线，y=0 为水平渐近线",
      view: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 }
    },
    {
      id: "sqrt", name: "平方根函数", formula: "y = √x", expr: "sqrt(x)", color: "#b9822e",
      subtitle: "定义域只有非负实数。",
      description: "从原点出发，增长逐渐放缓。与 y=x² 在 x≥0 上互为反函数。",
      domain: "[0, +∞)", range: "[0, +∞)", shape: "严格递增；非奇非偶",
      features: "零点与端点均为 (0,0)",
      view: { xMin: 0, xMax: 9, yMin: -0.6, yMax: 3.5 }
    },
    {
      id: "abs", name: "绝对值函数", formula: "y = |x|", expr: "abs(x)", color: "#d45f4d",
      subtitle: "分段线性的 V 形图像。",
      description: "把负数翻到 x 轴上方，图像关于 y 轴对称。在原点处不可导。",
      domain: "(-∞, +∞)", range: "[0, +∞)", shape: "在 (-∞,0] 递减，在 [0,+∞) 递增；关于 y 轴对称",
      features: "顶点 (0,0)；零点 x=0",
      view: { xMin: -5, xMax: 5, yMin: -0.6, yMax: 5.2 }
    },
    {
      id: "sine", name: "正弦函数", formula: "y = sin x", expr: "sin(x)", color: "#0e7a5f",
      subtitle: "周期为 2π 的波浪。",
      description: "值域在 -1 到 1 之间，是最常见的周期函数之一。",
      domain: "(-∞, +∞)", range: "[-1, 1]", shape: "周期 2π；关于原点中心对称",
      features: "零点 x=kπ；最大值 1，最小值 -1",
      view: { xMin: -6.6, xMax: 6.6, yMin: -1.7, yMax: 1.7 }
    },
    {
      id: "cosine", name: "余弦函数", formula: "y = cos x", expr: "cos(x)", color: "#3d6ddb",
      subtitle: "与正弦相差 π/2 的相位。",
      description: "偶函数，图像关于 y 轴对称，形状与正弦波相同。",
      domain: "(-∞, +∞)", range: "[-1, 1]", shape: "周期 2π；关于 y 轴对称",
      features: "零点 x=π/2+kπ；最大值 1，最小值 -1",
      view: { xMin: -6.6, xMax: 6.6, yMin: -1.7, yMax: 1.7 }
    },
    {
      id: "exponential", name: "指数函数", formula: "y = eˣ", expr: "e^x", color: "#b9822e",
      subtitle: "增长越来越快的函数。",
      description: "以自然常数 e 为底，始终为正。x 越大增长越快，向左无限接近 x 轴。",
      domain: "(-∞, +∞)", range: "(0, +∞)", shape: "严格递增；无对称性",
      features: "y 轴截距 (0,1)；y=0 为水平渐近线；无零点",
      view: { xMin: -3, xMax: 3, yMin: -0.8, yMax: 12 }
    },
    {
      id: "logarithm", name: "对数函数", formula: "y = ln x", expr: "ln(x)", color: "#7a58c9",
      subtitle: "指数函数的反函数。",
      description: "只在 x>0 时有定义，增长速度逐渐放慢，以 y 轴为垂直渐近线。",
      domain: "(0, +∞)", range: "(-∞, +∞)", shape: "严格递增；非奇非偶",
      features: "零点 x=1；x=0 为垂直渐近线",
      view: { xMin: 0.04, xMax: 6, yMin: -3.5, yMax: 2.5 }
    },
    {
      id: "gaussian", name: "高斯函数", formula: "y = e^(−x²)", expr: "e^(-x^2)", color: "#d45f4d",
      subtitle: "钟形曲线。",
      description: "在 x=0 处达到峰值 1，向两侧快速衰减。概率论中的正态分布与它密切相关。",
      domain: "(-∞, +∞)", range: "(0, 1]", shape: "在 (-∞,0] 递增，在 [0,+∞) 递减；关于 y 轴对称",
      features: "最大值 (0,1)；y=0 为水平渐近线",
      view: { xMin: -3, xMax: 3, yMin: -0.2, yMax: 1.15 }
    },
    {
      id: "damped", name: "阻尼振荡", formula: "y = sin x · e^(−x²/8)", expr: "sin(x)*e^(-x^2/8)", color: "#0e7a5f",
      subtitle: "振幅逐渐衰减的波。",
      description: "正弦振荡被高斯型包络逐渐压小，是物理中常见的衰减振动模型。",
      domain: "(-∞, +∞)", range: "约 [-1, 1]", shape: "关于原点中心对称；振幅随 |x| 增大而衰减",
      features: "零点包含 x=0 与 x=kπ；峰值逐渐变小",
      view: { xMin: -8, xMax: 8, yMin: -1.1, yMax: 1.1 }
    }
  ];

  const APP_MODES = {
    area: {
      label: "平面面积",
      title: "平面区域面积",
      kicker: "AREA RESULT",
      unit: "unit²",
      symbol: "A",
      formulaTex: "A=\\int_{a}^{b}\\left|f(x)-g(x)\\right|\\,dx",
      defaults: { top: "sin(x)", bottom: "0", lower: "0", upper: "pi" },
      topLabel: "上边界 f(x)", bottomLabel: "下边界 g(x)",
      topHint: "y 较大的一条曲线", bottomHint: "填 0 即曲线与 x 轴之间",
      lowerLabel: "下限 a", upperLabel: "上限 b",
      boundsLabel: "积分区间", boundsHint: "沿 x 轴，从左到右",
      hint: "面积取两条曲线差值的绝对值；f 与 g 可以交换位置。",
      visualTitle: "区域示意", visualBadge: "面积",
      legendTop: "上边界 f(x)", legendBottom: "下边界 g(x)",
      visualNote: "着色区域为两条曲线之间的平面区域；面积按有向宽度取绝对值累加。"
    },
    "volume-x": {
      label: "绕 x 轴体积",
      title: "旋转体体积",
      kicker: "VOLUME RESULT",
      unit: "unit³",
      symbol: "V",
      formulaTex: "V=\\pi\\int_{a}^{b}\\left|f(x)^2-g(x)^2\\right|\\,dx",
      defaults: { top: "sqrt(1-x^2)", bottom: "0", lower: "-1", upper: "1" },
      topLabel: "外半径 f(x)", bottomLabel: "内半径 g(x)",
      topHint: "离旋转轴较远的曲线", bottomHint: "没有空心时填 0",
      lowerLabel: "下限 a", upperLabel: "上限 b",
      boundsLabel: "积分区间", boundsHint: "沿 x 轴，从左到右",
      hint: "绕 x 轴旋转使用垫圈法；建议区域满足 0 ≤ g(x) ≤ f(x)。",
      visualTitle: "旋转体截面", visualBadge: "体积",
      legendTop: "外半径 f(x)", legendBottom: "内半径 g(x)",
      visualNote: "上下镜像显示旋转体的截面轮廓；着色区域表示被旋转的平面区域。"
    },
    "volume-y": {
      label: "绕 y 轴体积",
      title: "旋转体体积",
      kicker: "SHELL METHOD",
      unit: "unit³",
      symbol: "V",
      formulaTex: "V=2\\pi\\int_{a}^{b}x\\left|f(x)-g(x)\\right|\\,dx",
      defaults: { top: "x", bottom: "x^2", lower: "0", upper: "1" },
      topLabel: "上边界 f(x)", bottomLabel: "下边界 g(x)",
      topHint: "柱壳的高度上端", bottomHint: "柱壳的高度下端",
      lowerLabel: "下限 a", upperLabel: "上限 b",
      boundsLabel: "积分区间", boundsHint: "柱壳法要求 a ≥ 0",
      hint: "绕 y 轴旋转采用柱壳法，要求整个区域位于 y 轴右侧，即 a ≥ 0。",
      visualTitle: "柱壳区域", visualBadge: "体积",
      legendTop: "上边界 f(x)", legendBottom: "下边界 g(x)",
      visualNote: "着色区域绕 y 轴旋转；半径由 x 坐标给出，高度为两曲线之差。"
    },
    polar: {
      label: "极坐标面积",
      title: "极坐标区域面积",
      kicker: "POLAR AREA",
      unit: "unit²",
      symbol: "A",
      formulaTex: "A=\\frac{1}{2}\\int_{\\theta_1}^{\\theta_2}r(\\theta)^2\\,d\\theta",
      defaults: { polar: "1+cos(theta)", lower: "0", upper: "2*pi" },
      topLabel: "极径 r(θ)", bottomLabel: "",
      topHint: "用 theta 表示极角", bottomHint: "",
      lowerLabel: "起始角 θ₁", upperLabel: "终止角 θ₂",
      boundsLabel: "极角区间", boundsHint: "角度使用弧度制",
      hint: "极坐标面积由扇形累加得到；输入中用 theta 或 θ 表示极角。",
      visualTitle: "极坐标区域", visualBadge: "极面积",
      legendTop: "r(θ)", legendBottom: "区域",
      visualNote: "曲线与两条极角射线围成的扇形区域即为所求面积。"
    }
  };

  const APP_EXAMPLES = {
    "area-curves": { mode: "area", values: { top: "x^2", bottom: "x", lower: "0", upper: "1" } },
    sphere: { mode: "volume-x", values: { top: "sqrt(1-x^2)", bottom: "0", lower: "-1", upper: "1" } },
    shell: { mode: "volume-y", values: { top: "x", bottom: "x^2", lower: "0", upper: "1" } },
    cardioid: { mode: "polar", values: { polar: "1+cos(theta)", lower: "0", upper: "2*pi" } }
  };

  const STORAGE = {
    plot: "mathlab.plot.v1",
    integral: "mathlab.integral.v1",
    apps: "mathlab.apps.v1",
    history: "mathlab.history.v1",
    theme: "mathlab.theme.v1"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const dom = {};
  const state = {
    view: "plot",
    functions: [],
    activeFunctionId: null,
    plotView: { xMin: -8, xMax: 8, yMin: null, yMax: null, autoY: true },
    plotOptions: { showGrid: true, showDerivative: false, showPoints: true },
    integral: { type: "indefinite", integrand: "x * exp(x)", lower: "0", upper: "1" },
    apps: { mode: "area", values: null },
    history: []
  };

  let plotter = null;
  let areaPlotter = null;
  let galleryPlotter = null;
  let appsPlotter = null;
  let activeGalleryItem = null;
  let currentResult = null;
  let currentAppResult = null;
  let currentPrimary = null;
  let plotCache = { valid: [] };
  let activeModal = null;
  let lastFocused = null;
  let isCalculating = false;
  let isAppCalculating = false;
  let hasIntegralAutoRun = false;
  let hasAppsAutoRun = false;
  let activeAppInput = null;
  let toastTimer = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheDom();
    loadTheme();
    loadState();
    initPlotModule();
    initFunctionInputMethod();
    initFunctionGallery();
    initIntegralModule();
    initAppsModule();
    initModals();
    initGlobalEvents();
    renderFormulaBook();

    const initialView = normalizeViewName(location.hash.replace(/^#\/?/, ""));
    switchView(initialView, { initial: true, updateHash: false });

    if (state.view === "integral") {
      setTimeout(() => maybeAutoRunIntegral(), 260);
    }
    if (state.view === "apps") {
      setTimeout(() => maybeAutoRunApps(), 280);
    }
  }

  function cacheDom() {
    dom.navItems = $$(".nav-item");
    dom.views = $$("[data-view-panel]");
    dom.themeBtn = $("#themeBtn");
    dom.formulaBtn = $("#formulaBtn");
    dom.helpBtn = $("#helpBtn");
    dom.brandLink = $("#brandLink");
    dom.formulaModal = $("#formulaModal");
    dom.helpModal = $("#helpModal");
    dom.toastStack = $("#toastStack");

    dom.functionList = $("#functionList");
    dom.functionCount = $("#functionCount");
    dom.addFunctionBtn = $("#addFunctionBtn");
    dom.xMinInput = $("#xMinInput");
    dom.xMaxInput = $("#xMaxInput");
    dom.yMinInput = $("#yMinInput");
    dom.yMaxInput = $("#yMaxInput");
    dom.autoFitBtn = $("#autoFitBtn");
    dom.gridToggle = $("#gridToggle");
    dom.derivativeToggle = $("#derivativeToggle");
    dom.pointsToggle = $("#pointsToggle");
    dom.resetViewBtn = $("#resetViewBtn");
    dom.zoomInBtn = $("#zoomInBtn");
    dom.zoomOutBtn = $("#zoomOutBtn");
    dom.exportPlotBtn = $("#exportPlotBtn");
    dom.canvasEmpty = $("#canvasEmpty");
    dom.plotStatus = $("#plotStatus");
    dom.plotReadout = $("#plotReadout");
    dom.rootsList = $("#rootsList");
    dom.extremaList = $("#extremaList");
    dom.interceptList = $("#interceptList");
    dom.analysisBadge = $("#analysisBadge");
    dom.tableBadge = $("#tableBadge");
    dom.valueTableBody = $("#valueTableBody");
    dom.functionCanvas = $("#functionCanvas");
    dom.fnInputMethod = $("#fnInputMethod");
    dom.fnInputBody = $("#fnInputBody");
    dom.fnInputToggle = $("#fnInputToggle");
    dom.fnActiveLabel = $("#fnActiveLabel");
    dom.fnPreviewMath = $("#fnPreviewMath");
    dom.fnKeypadTabs = $$("[data-fn-keypad]");
    dom.fnKeypadPanels = $$("[data-fn-panel]");
    dom.fnInsertButtons = $$("[data-fn-insert]");
    dom.fnTemplateButtons = $$("[data-fn-template]");
    dom.functionGallery = $("#functionGallery");
    dom.galleryModal = $("#galleryModal");
    dom.galleryTitle = $("#galleryTitle");
    dom.gallerySubtitle = $("#gallerySubtitle");
    dom.galleryCanvas = $("#galleryCanvas");
    dom.galleryFormula = $("#galleryFormula");
    dom.galleryDescription = $("#galleryDescription");
    dom.galleryDomain = $("#galleryDomain");
    dom.galleryRange = $("#galleryRange");
    dom.galleryShape = $("#galleryShape");
    dom.galleryFeatures = $("#galleryFeatures");
    dom.galleryUseBtn = $("#galleryUseBtn");

    dom.integralType = $("#integralType");
    dom.integralDisplay = $("#integralDisplay");
    dom.integralPreview = $("#integralPreview");
    dom.integralBoundsPreview = $("#integralBoundsPreview");
    dom.boundTopPreview = $("#boundTopPreview");
    dom.boundBottomPreview = $("#boundBottomPreview");
    dom.integrandInput = $("#integrandInput");
    dom.integrandError = $("#integrandError");
    dom.integrandField = $("#integrandField");
    dom.boundsSection = $("#boundsSection");
    dom.upperBoundInput = $("#upperBoundInput");
    dom.lowerBoundInput = $("#lowerBoundInput");
    dom.boundsError = $("#boundsError");
    dom.calculateBtn = $("#calculateBtn");
    dom.clearIntegrandBtn = $("#clearIntegrandBtn");
    dom.backspaceBtn = $("#backspaceBtn");
    dom.randomExampleBtn = $("#randomExampleBtn");
    dom.historyList = $("#historyList");
    dom.clearHistoryBtn = $("#clearHistoryBtn");

    dom.integralEmpty = $("#integralEmpty");
    dom.resultCard = $("#resultCard");
    dom.resultKicker = $("#resultKicker");
    dom.resultTitle = $("#resultTitle");
    dom.verifyBadge = $("#verifyBadge");
    dom.methodBadge = $("#methodBadge");
    dom.resultFormula = $("#resultFormula");
    dom.resultCaption = $("#resultCaption");
    dom.approxValue = $("#approxValue");
    dom.numericCheck = $("#numericCheck");
    dom.computeTime = $("#computeTime");
    dom.copyLatexBtn = $("#copyLatexBtn");
    dom.copyResultBtn = $("#copyResultBtn");
    dom.insertResultBtn = $("#insertResultBtn");
    dom.errorCard = $("#errorCard");
    dom.errorTitle = $("#errorTitle");
    dom.errorMessage = $("#errorMessage");
    dom.errorExampleBtn = $("#errorExampleBtn");
    dom.stepsCard = $("#stepsCard");
    dom.stepsList = $("#stepsList");
    dom.stepsSummary = $("#stepsSummary");
    dom.areaCard = $("#areaCard");
    dom.areaCanvas = $("#areaCanvas");
    dom.antiderivativeToggle = $("#antiderivativeToggle");
    dom.areaValueLabel = $("#areaValueLabel");
    dom.formulaList = $("#formulaList");

    dom.appModeGrid = $("#appModeGrid");
    dom.appModeButtons = $$("[data-app-mode]");
    dom.appFormulaPreview = $("#appFormulaPreview");
    dom.appFields = $("#appFields");
    dom.appTopField = $("#appTopField");
    dom.appBottomField = $("#appBottomField");
    dom.appPolarField = $("#appPolarField");
    dom.appTopInput = $("#appTopInput");
    dom.appBottomInput = $("#appBottomInput");
    dom.appPolarInput = $("#appPolarInput");
    dom.appTopLabel = $("#appTopLabel");
    dom.appBottomLabel = $("#appBottomLabel");
    dom.appTopHint = $("#appTopHint");
    dom.appBottomHint = $("#appBottomHint");
    dom.appTopPrefix = $("#appTopPrefix");
    dom.appBottomPrefix = $("#appBottomPrefix");
    dom.appLowerInput = $("#appLowerInput");
    dom.appUpperInput = $("#appUpperInput");
    dom.appLowerLabel = $("#appLowerLabel");
    dom.appUpperLabel = $("#appUpperLabel");
    dom.appBoundsLabel = $("#appBoundsLabel");
    dom.appBoundsHint = $("#appBoundsHint");
    dom.appHint = $("#appHint");
    dom.appCalculateBtn = $("#appCalculateBtn");
    dom.appSymbolButtons = $$("[data-app-insert]");
    dom.appExampleList = $("#appExampleList");
    dom.appEmpty = $("#appEmpty");
    dom.appResultCard = $("#appResultCard");
    dom.appResultKicker = $("#appResultKicker");
    dom.appResultTitle = $("#appResultTitle");
    dom.appVerifyBadge = $("#appVerifyBadge");
    dom.appUnitBadge = $("#appUnitBadge");
    dom.appResultFormula = $("#appResultFormula");
    dom.appResultCaption = $("#appResultCaption");
    dom.appResultValue = $("#appResultValue");
    dom.appResultMethod = $("#appResultMethod");
    dom.appResultConvergence = $("#appResultConvergence");
    dom.appCopyBtn = $("#appCopyBtn");
    dom.appSendBtn = $("#appSendBtn");
    dom.appVisualCard = $("#appVisualCard");
    dom.appVisualTitle = $("#appVisualTitle");
    dom.appVisualBadge = $("#appVisualBadge");
    dom.appsCanvas = $("#appsCanvas");
    dom.polarCanvas = $("#polarCanvas");
    dom.appLegendTop = $("#appLegendTop");
    dom.appLegendBottom = $("#appLegendBottom");
    dom.appLegendItemBottom = $("#appLegendItemBottom");
    dom.appVisualValue = $("#appVisualValue");
    dom.appVisualNote = $("#appVisualNote");
    dom.appStepsCard = $("#appStepsCard");
    dom.appStepsSummary = $("#appStepsSummary");
    dom.appStepsList = $("#appStepsList");

    dom.keypadTabs = $$("[data-keypad]");
    dom.keypadPanels = $$("[data-keypad-panel]");
    dom.insertButtons = $$("[data-insert]");
    dom.templateButtons = $$("[data-template]");
    dom.shortcut = $(".primary-btn .shortcut");
  }

  /* ---------------------------------------------------------
     General helpers
     --------------------------------------------------------- */

  function icon(name) {
    return `<svg class="icon" aria-hidden="true"><use href="#${name}"></use></svg>`;
  }

  function renderMath(element, tex, displayMode = false) {
    if (!element) return;
    if (!tex) {
      element.textContent = "";
      return;
    }
    try {
      katex.render(tex, element, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
        output: "html"
      });
    } catch (error) {
      element.textContent = tex;
    }
  }

  function debounce(fn, wait) {
    let timer = null;
    const wrapped = (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
    wrapped.cancel = () => clearTimeout(timer);
    wrapped.flush = (...args) => {
      clearTimeout(timer);
      fn(...args);
    };
    return wrapped;
  }

  function uid(prefix = "fn") {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* storage can be unavailable in private mode */
    }
  }

  function saveText(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* ignore */
    }
  }

  function toast(message, type = "success") {
    if (!dom.toastStack) return;
    const node = document.createElement("div");
    node.className = "toast" + (type === "error" ? " is-error" : "");
    node.innerHTML = icon(type === "error" ? "i-info" : "i-check");
    const label = document.createElement("span");
    label.textContent = message;
    node.appendChild(label);
    dom.toastStack.appendChild(node);
    setTimeout(() => {
      node.classList.add("is-leaving");
      setTimeout(() => node.remove(), 260);
    }, 2600);
  }

  async function copyText(text, successMessage) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast(successMessage);
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        toast(successMessage);
      } catch (inner) {
        toast("复制失败，请手动选择文本", "error");
      }
      textarea.remove();
    }
  }

  function formatValue(value, sig = 5) {
    return MC.formatNumber(value, sig);
  }

  function setIconButton(button, iconName) {
    button.innerHTML = icon(iconName);
  }

  function isTypingTarget(target) {
    return target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
  }

  /* ---------------------------------------------------------
     Theme & navigation
     --------------------------------------------------------- */

  function loadTheme() {
    const saved = (() => {
      try {
        return localStorage.getItem(STORAGE.theme);
      } catch (error) {
        return null;
      }
    })();
    const theme = saved === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    updateThemeColor(theme);
  }

  function updateThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1310" : "#f3f6f2");
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    saveText(STORAGE.theme, next);
    updateThemeColor(next);
    if (plotter) plotter.refreshTheme();
    if (areaPlotter) areaPlotter.refreshTheme();
    if (galleryPlotter) galleryPlotter.refreshTheme();
    if (appsPlotter) appsPlotter.refreshTheme();
    drawGalleryThumbnails();
    if (currentAppResult && currentAppResult.mode === "polar") drawPolarVisual(currentAppResult);
    setTimeout(() => {
      if (plotter) plotter.resize();
      if (areaPlotter && !dom.areaCard.classList.contains("is-hidden")) areaPlotter.resize();
      if (galleryPlotter && activeModal === dom.galleryModal) galleryPlotter.resize();
      if (appsPlotter && !dom.appVisualCard.classList.contains("is-hidden")) appsPlotter.resize();
    }, 80);
  }

  function normalizeViewName(name) {
    if (name === "integral") return "integral";
    if (name === "apps" || name === "applications") return "apps";
    return "plot";
  }

  function switchView(view, options = {}) {
    view = normalizeViewName(view);
    state.view = view;
    dom.navItems.forEach((item) => {
      const active = item.dataset.view === view;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
    });
    dom.views.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.viewPanel === view);
    });
    if (options.updateHash !== false) {
      const nextHash = "#" + view;
      if (location.hash !== nextHash) {
        try {
          history.replaceState(null, "", nextHash);
        } catch (error) {
          location.hash = view;
        }
      }
    }
    if (view === "plot") {
      requestAnimationFrame(() => {
        if (plotter) {
          plotter.resize();
          updatePlotStatus();
        }
        drawGalleryThumbnails();
      });
    } else if (view === "integral") {
      if (!options.initial || location.hash.includes("integral")) {
        setTimeout(() => maybeAutoRunIntegral(), 220);
      }
    } else if (view === "apps") {
      requestAnimationFrame(() => {
        if (appsPlotter && !dom.appVisualCard.classList.contains("is-hidden")) appsPlotter.resize();
        if (currentAppResult && currentAppResult.mode === "polar") drawPolarVisual(currentAppResult);
      });
      if (!options.initial || location.hash.includes("apps")) {
        setTimeout(() => maybeAutoRunApps(), 240);
      }
    }
  }

  function maybeAutoRunIntegral() {
    if (hasIntegralAutoRun || state.view !== "integral") return;
    if (!dom.integrandInput.value.trim()) return;
    try {
      MC.normalizeExpression(dom.integrandInput.value);
    } catch (error) {
      return;
    }
    calculateIntegral({ auto: true });
  }

  function maybeAutoRunApps() {
    if (hasAppsAutoRun || state.view !== "apps") return;
    if (!dom.appCalculateBtn) return;
    calculateApplication({ auto: true });
  }

  /* ---------------------------------------------------------
     Plot state
     --------------------------------------------------------- */

  function loadState() {
    const savedPlot = readStorage(STORAGE.plot, null);
    if (savedPlot && Array.isArray(savedPlot.functions) && savedPlot.functions.length) {
      state.functions = savedPlot.functions
        .slice(0, 5)
        .map((fn, index) => ({
          id: fn.id || uid(),
          expr: typeof fn.expr === "string" ? fn.expr : "",
          color: typeof fn.color === "string" ? fn.color : COLORS[index % COLORS.length],
          visible: fn.visible !== false
        }));
      if (!state.functions.length) defaultFunctions();
      if (savedPlot.view) {
        const savedAutoY = savedPlot.view.autoY !== false;
        state.plotView = {
          xMin: finiteOr(savedPlot.view.xMin, -8),
          xMax: finiteOr(savedPlot.view.xMax, 8),
          yMin: savedAutoY ? null : finiteOrNull(savedPlot.view.yMin),
          yMax: savedAutoY ? null : finiteOrNull(savedPlot.view.yMax),
          autoY: savedAutoY
        };
      }
      if (savedPlot.options) {
        state.plotOptions = {
          showGrid: savedPlot.options.showGrid !== false,
          showDerivative: savedPlot.options.showDerivative === true,
          showPoints: savedPlot.options.showPoints !== false
        };
      }
    } else {
      defaultFunctions();
    }

    const savedIntegral = readStorage(STORAGE.integral, null);
    if (savedIntegral && typeof savedIntegral === "object") {
      state.integral = {
        type: savedIntegral.type === "definite" ? "definite" : "indefinite",
        integrand: typeof savedIntegral.integrand === "string" ? savedIntegral.integrand : state.integral.integrand,
        lower: typeof savedIntegral.lower === "string" ? savedIntegral.lower : "0",
        upper: typeof savedIntegral.upper === "string" ? savedIntegral.upper : "1"
      };
    }

    const savedHistory = readStorage(STORAGE.history, []);
    if (Array.isArray(savedHistory)) state.history = savedHistory.slice(0, 10);

    const savedApps = readStorage(STORAGE.apps, null);
    if (savedApps && typeof savedApps === "object") {
      if (APP_MODES[savedApps.mode]) state.apps.mode = savedApps.mode;
      if (savedApps.values && typeof savedApps.values === "object") {
        state.apps.values = {};
        Object.keys(APP_MODES).forEach((mode) => {
          const savedValues = savedApps.values[mode];
          state.apps.values[mode] = savedValues && typeof savedValues === "object"
            ? { ...APP_MODES[mode].defaults, ...savedValues }
            : { ...APP_MODES[mode].defaults };
        });
      }
    }
  }

  function finiteOr(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function finiteOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function defaultFunctions() {
    state.functions = [
      { id: uid(), expr: "sin(x) * exp(-x^2/8)", color: COLORS[0], visible: true }
    ];
  }

  function savePlotState() {
    writeStorage(STORAGE.plot, {
      functions: state.functions,
      view: state.plotView,
      options: state.plotOptions
    });
  }

  function initPlotModule() {
    dom.functionCanvas.setAttribute("aria-label", "函数图像画布，可拖动平移、滚轮缩放");

    plotter = new window.FunctionPlotter(dom.functionCanvas, {
      onHover: handlePlotHover,
      onViewChange: debounce(() => {
        syncAnalysis();
        updatePlotStatus();
      }, 180)
    });

    plotter.setOptions({
      showGrid: state.plotOptions.showGrid,
      showDerivative: state.plotOptions.showDerivative,
      showPoints: state.plotOptions.showPoints
    });

    dom.xMinInput.value = String(state.plotView.xMin);
    dom.xMaxInput.value = String(state.plotView.xMax);
    dom.yMinInput.value = state.plotView.yMin === null ? "" : String(state.plotView.yMin);
    dom.yMaxInput.value = state.plotView.yMax === null ? "" : String(state.plotView.yMax);
    dom.gridToggle.checked = state.plotOptions.showGrid;
    dom.derivativeToggle.checked = state.plotOptions.showDerivative;
    dom.pointsToggle.checked = state.plotOptions.showPoints;

    plotter.setView({
      xMin: state.plotView.xMin,
      xMax: state.plotView.xMax,
      yMin: state.plotView.yMin,
      yMax: state.plotView.yMax
    });

    renderFunctionList();
    updatePlot({ save: false });

    dom.addFunctionBtn.addEventListener("click", addFunction);
    dom.gridToggle.addEventListener("change", () => {
      state.plotOptions.showGrid = dom.gridToggle.checked;
      plotter.setOptions({ showGrid: state.plotOptions.showGrid });
      savePlotState();
    });
    dom.derivativeToggle.addEventListener("change", () => {
      state.plotOptions.showDerivative = dom.derivativeToggle.checked;
      plotter.setOptions({ showDerivative: state.plotOptions.showDerivative });
      savePlotState();
    });
    dom.pointsToggle.addEventListener("change", () => {
      state.plotOptions.showPoints = dom.pointsToggle.checked;
      plotter.setOptions({ showPoints: state.plotOptions.showPoints });
      savePlotState();
    });

    const applyViewDebounced = debounce(applyViewInputs, 240);
    [dom.xMinInput, dom.xMaxInput, dom.yMinInput, dom.yMaxInput].forEach((input) => {
      input.addEventListener("input", applyViewDebounced);
      input.addEventListener("change", () => applyViewDebounced.flush());
    });

    dom.autoFitBtn.addEventListener("click", () => {
      dom.yMinInput.value = "";
      dom.yMaxInput.value = "";
      plotter.autoY = true;
      plotter.fitY();
      plotter.setHomeFromCurrent();
      state.plotView.yMin = null;
      state.plotView.yMax = null;
      state.plotView.autoY = true;
      savePlotState();
      updatePlotStatus();
      toast("已根据当前 X 范围自动适配 Y 轴");
    });

    dom.resetViewBtn.addEventListener("click", resetPlotView);
    dom.zoomInBtn.addEventListener("click", () => {
      const plot = plotter.getPlotRect();
      plotter.zoomAt(0.8, plot.left + plot.width / 2, plot.top + plot.height / 2);
    });
    dom.zoomOutBtn.addEventListener("click", () => {
      const plot = plotter.getPlotRect();
      plotter.zoomAt(1.25, plot.left + plot.width / 2, plot.top + plot.height / 2);
    });
    dom.exportPlotBtn.addEventListener("click", () => {
      const stamp = new Date().toISOString().slice(0, 10);
      plotter.exportPNG(`mathlab-plot-${stamp}.png`);
      toast("图像已导出为 PNG");
    });

    $$("[data-plot-preset]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!state.functions.length) defaultFunctions();
        state.functions[0].expr = button.dataset.plotPreset;
        state.functions[0].visible = true;
        renderFunctionList();
        updatePlot();
        toast("已载入示例函数");
      });
    });
  }

  function renderFunctionList() {
    dom.functionList.textContent = "";
    state.functions.slice(0, 5).forEach((fn, index) => {
      const row = document.createElement("div");
      row.className = "fn-row";
      row.dataset.id = fn.id;

      const colorButton = document.createElement("button");
      colorButton.type = "button";
      colorButton.className = "fn-color";
      colorButton.style.setProperty("--fn-color", fn.color);
      colorButton.title = "更换曲线颜色";
      colorButton.setAttribute("aria-label", "更换第 " + (index + 1) + " 条曲线的颜色");
      colorButton.addEventListener("click", () => cycleColor(fn.id));

      const main = document.createElement("div");
      main.className = "fn-main";
      const line = document.createElement("div");
      line.className = "fn-line";
      const name = document.createElement("span");
      name.className = "fn-name";
      name.textContent = `f${SUBSCRIPTS[index]}(x)`;
      const equals = document.createElement("span");
      equals.className = "fn-equals";
      equals.textContent = "=";
      const input = document.createElement("input");
      input.className = "fn-input";
      input.type = "text";
      input.value = fn.expr;
      input.spellcheck = false;
      input.autocomplete = "off";
      input.placeholder = "例如 sin(x) * exp(-x^2/8)";
      input.setAttribute("aria-label", "第 " + (index + 1) + " 条函数表达式");
      input.addEventListener("input", () => {
        fn.expr = input.value;
        savePlotState();
        updatePlotDebounced();
        if (state.activeFunctionId === fn.id) updateFunctionPreview();
      });
      input.addEventListener("focus", () => {
        setActiveFunction(fn.id, { focus: false });
      });
      input.addEventListener("blur", () => {
        updatePlot();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          updatePlot();
          input.blur();
        }
      });
      line.append(name, equals, input);
      const error = document.createElement("p");
      error.className = "fn-error";
      main.append(line, error);

      const visibility = document.createElement("button");
      visibility.type = "button";
      visibility.className = "fn-action visibility";
      visibility.title = fn.visible ? "隐藏曲线" : "显示曲线";
      visibility.setAttribute("aria-label", visibility.title);
      visibility.innerHTML = icon(fn.visible ? "i-eye" : "i-eye-off");
      visibility.addEventListener("click", () => {
        fn.visible = !fn.visible;
        renderFunctionList();
        updatePlot();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "fn-action delete";
      remove.title = state.functions.length <= 1 ? "至少保留一条函数" : "删除曲线";
      remove.setAttribute("aria-label", remove.title);
      remove.disabled = state.functions.length <= 1;
      remove.style.opacity = state.functions.length <= 1 ? "0.3" : "";
      remove.style.cursor = state.functions.length <= 1 ? "not-allowed" : "";
      remove.innerHTML = icon("i-trash");
      remove.addEventListener("click", () => removeFunction(fn.id));

      row.append(colorButton, main, visibility, remove);
      if (!fn.visible) row.classList.add("is-hidden-function");
      dom.functionList.appendChild(row);
    });

    dom.functionCount.textContent = `${state.functions.length} / 5`;
    dom.addFunctionBtn.disabled = state.functions.length >= 5;
    dom.addFunctionBtn.title = state.functions.length >= 5 ? "最多同时绘制 5 条函数" : "添加一条函数";

    if (!state.functions.some((fn) => fn.id === state.activeFunctionId)) {
      state.activeFunctionId = state.functions[0] ? state.functions[0].id : null;
    }
    if (state.activeFunctionId) setActiveFunction(state.activeFunctionId, { focus: false });
  }

  function initFunctionInputMethod() {
    if (!dom.fnInputMethod) return;
    if (dom.fnInputToggle) {
      dom.fnInputToggle.addEventListener("click", () => {
        const collapsed = dom.fnInputBody.classList.toggle("is-collapsed");
        dom.fnInputToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
        const label = dom.fnInputToggle.querySelector("span");
        if (label) label.textContent = collapsed ? "展开" : "收起";
      });
    }
    dom.fnKeypadTabs.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.fnKeypad;
        dom.fnKeypadTabs.forEach((item) => item.classList.toggle("is-active", item === button));
        dom.fnKeypadPanels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.fnPanel === tab));
      });
    });
    dom.fnInsertButtons.forEach((button) => {
      button.addEventListener("click", () => insertIntoFunction(button.dataset.fnInsert));
    });
    dom.fnTemplateButtons.forEach((button) => {
      button.addEventListener("click", () => applyFunctionTemplate(button.dataset.fnTemplate));
    });
    if (!state.activeFunctionId && state.functions[0]) state.activeFunctionId = state.functions[0].id;
    updateFunctionPreview();
  }

  function activeFunctionEntry() {
    return state.functions.find((fn) => fn.id === state.activeFunctionId) || state.functions[0] || null;
  }

  function setActiveFunction(id, options = {}) {
    if (!id) return;
    state.activeFunctionId = id;
    const index = state.functions.findIndex((fn) => fn.id === id);
    dom.functionList.querySelectorAll(".fn-row").forEach((row) => {
      row.classList.toggle("is-active", row.dataset.id === id);
    });
    if (dom.fnActiveLabel) {
      dom.fnActiveLabel.textContent = index >= 0 ? `f${SUBSCRIPTS[index]}(x)` : "f(x)";
    }
    updateFunctionPreview();
    if (options.focus !== false) {
      const input = dom.functionList.querySelector(`[data-id="${id}"] .fn-input`);
      if (input) input.focus({ preventScroll: true });
    }
  }

  function updateFunctionPreview() {
    if (!dom.fnPreviewMath) return;
    const fn = activeFunctionEntry();
    if (!fn) {
      dom.fnPreviewMath.textContent = "输入一个表达式开始";
      dom.fnPreviewMath.classList.remove("is-error");
      return;
    }
    const index = state.functions.findIndex((item) => item.id === fn.id);
    if (!fn.expr.trim()) {
      dom.fnPreviewMath.textContent = "选择模板或键入表达式，例如 sin(x) · e^(-x²/8)";
      dom.fnPreviewMath.classList.remove("is-error");
      return;
    }
    try {
      const tex = MC.expressionToTex(fn.expr);
      dom.fnPreviewMath.classList.remove("is-error");
      renderMath(dom.fnPreviewMath, `\\displaystyle f_{${index + 1}}(x)=${tex}`, false);
    } catch (error) {
      dom.fnPreviewMath.classList.add("is-error");
      dom.fnPreviewMath.textContent = error.message;
    }
  }

  function insertIntoFunction(text) {
    if (!text) return;
    const fn = activeFunctionEntry();
    if (!fn) return;
    const input = dom.functionList.querySelector(`[data-id="${fn.id}"] .fn-input`);
    if (!input) return;
    insertTextAtCursor(input, text);
    fn.expr = input.value;
    savePlotState();
    updateFunctionPreview();
    updatePlotDebounced();
    input.focus({ preventScroll: true });
  }

  function applyFunctionTemplate(template) {
    if (!template) return;
    const fn = activeFunctionEntry();
    if (!fn) return;
    const input = dom.functionList.querySelector(`[data-id="${fn.id}"] .fn-input`);
    if (!input) return;
    fn.expr = template;
    input.value = template;
    savePlotState();
    updatePlot();
    updateFunctionPreview();
    input.focus({ preventScroll: true });
    const end = template.length;
    input.setSelectionRange(end, end);
  }

  function insertTextAtCursor(input, text) {
    const start = input.selectionStart === null ? input.value.length : input.selectionStart;
    const end = input.selectionEnd === null ? input.value.length : input.selectionEnd;
    const selected = input.value.slice(start, end);
    let insertion = text;
    let caret = start + text.length;
    if (text.endsWith("(")) {
      if (selected) {
        insertion = text + selected + ")";
        caret = start + insertion.length;
      } else {
        insertion = text + ")";
        caret = start + text.length;
      }
    } else if (text === "^" && selected) {
      insertion = "^(" + selected + ")";
      caret = start + insertion.length;
    }
    input.setRangeText(insertion, start, end, "end");
    input.selectionStart = caret;
    input.selectionEnd = caret;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function initFunctionGallery() {
    if (!dom.functionGallery) return;
    dom.functionGallery.textContent = "";
    FUNCTION_GALLERY.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-item";
      button.dataset.galleryId = item.id;
      button.setAttribute("aria-label", `查看${item.name}的图像与性质`);
      const canvas = document.createElement("canvas");
      canvas.className = "gallery-thumb";
      canvas.setAttribute("aria-hidden", "true");
      const meta = document.createElement("span");
      meta.className = "gallery-meta";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const formula = document.createElement("code");
      formula.textContent = item.formula;
      meta.append(name, formula);
      button.append(canvas, meta);
      button.addEventListener("click", () => openGalleryItem(item.id));
      dom.functionGallery.appendChild(button);
    });

    galleryPlotter = new window.FunctionPlotter(dom.galleryCanvas, {
      interactive: true,
      showTooltip: true,
      showLegend: false,
      padding: { left: 46, right: 18, top: 20, bottom: 30 }
    });
    dom.galleryUseBtn.addEventListener("click", useActiveGalleryItem);

    requestAnimationFrame(() => {
      drawGalleryThumbnails();
    });
    window.addEventListener("resize", debounce(drawGalleryThumbnails, 180));
  }

  function drawGalleryThumbnails() {
    if (!dom.functionGallery) return;
    dom.functionGallery.querySelectorAll("[data-gallery-id]").forEach((button) => {
      const item = FUNCTION_GALLERY.find((entry) => entry.id === button.dataset.galleryId);
      const canvas = button.querySelector("canvas");
      if (item && canvas) drawGalleryThumb(canvas, item);
    });
  }

  function drawGalleryThumb(canvas, item) {
    const width = canvas.clientWidth || 190;
    const height = canvas.clientHeight || Math.round(width / 1.85);
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const styles = getComputedStyle(document.documentElement);
    const surface = styles.getPropertyValue("--surface").trim() || "#fff";
    const line = styles.getPropertyValue("--line").trim() || "#dfe8e1";
    const axis = styles.getPropertyValue("--canvas-axis").trim() || "#8fa49a";
    const view = item.view;
    const pad = 8;
    const left = pad;
    const right = width - pad;
    const top = pad;
    const bottom = height - pad;
    const xSpan = view.xMax - view.xMin;
    const ySpan = view.yMax - view.yMin;
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = line;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    for (let i = 1; i < 4; i += 1) {
      const x = left + (i / 4) * (right - left);
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      const y = top + (i / 4) * (bottom - top);
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    const mapX = (x) => left + ((x - view.xMin) / xSpan) * (right - left);
    const mapY = (y) => top + ((view.yMax - y) / ySpan) * (bottom - top);
    const zeroY = mapY(0);
    const zeroX = mapX(0);
    ctx.strokeStyle = axis;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    if (zeroY >= top && zeroY <= bottom) {
      ctx.moveTo(left, zeroY);
      ctx.lineTo(right, zeroY);
    }
    if (zeroX >= left && zeroX <= right) {
      ctx.moveTo(zeroX, top);
      ctx.lineTo(zeroX, bottom);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    let evaluator;
    try {
      evaluator = MC.makeEvaluator(item.expr);
    } catch (error) {
      return;
    }
    const samples = 220;
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 1.7;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    let drawing = false;
    let previousY = null;
    for (let i = 0; i <= samples; i += 1) {
      const x = view.xMin + (i / samples) * xSpan;
      const y = evaluator(x);
      if (y === null || !Number.isFinite(y)) {
        drawing = false;
        previousY = null;
        continue;
      }
      const px = mapX(x);
      const py = mapY(y);
      if (previousY !== null && Math.abs(py - previousY) > (bottom - top) * 0.8) {
        drawing = false;
      }
      if (!drawing) {
        ctx.moveTo(px, py);
        drawing = true;
      } else {
        ctx.lineTo(px, py);
      }
      previousY = py;
    }
    ctx.stroke();
  }

  function openGalleryItem(id) {
    const item = FUNCTION_GALLERY.find((entry) => entry.id === id);
    if (!item || !galleryPlotter) return;
    activeGalleryItem = item;
    dom.galleryTitle.textContent = item.name;
    dom.gallerySubtitle.textContent = item.subtitle;
    dom.galleryDescription.textContent = item.description;
    dom.galleryDomain.textContent = item.domain;
    dom.galleryRange.textContent = item.range;
    dom.galleryShape.textContent = item.shape;
    dom.galleryFeatures.textContent = item.features;
    renderMath(dom.galleryFormula, `\\displaystyle y=${MC.expressionToTex(item.expr)}`, false);

    openModal(dom.galleryModal);
    galleryPlotter.setOptions({ showGrid: true, showPoints: false, showDerivative: false });
    galleryPlotter.setFunctions([{ expr: item.expr, color: item.color, visible: true, label: item.name }]);
    galleryPlotter.setView(item.view);
    galleryPlotter.clearTrace();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => galleryPlotter.resize());
    });
  }

  function useActiveGalleryItem() {
    if (!activeGalleryItem) return;
    closeModal();
    switchView("plot");
    if (!state.functions.length) defaultFunctions();
    const fn = activeFunctionEntry() || state.functions[0];
    if (fn) {
      fn.expr = activeGalleryItem.expr;
      fn.visible = true;
      state.activeFunctionId = fn.id;
    }
    if (activeGalleryItem.view) {
      dom.xMinInput.value = String(activeGalleryItem.view.xMin);
      dom.xMaxInput.value = String(activeGalleryItem.view.xMax);
      dom.yMinInput.value = String(activeGalleryItem.view.yMin);
      dom.yMaxInput.value = String(activeGalleryItem.view.yMax);
      state.plotView = {
        xMin: activeGalleryItem.view.xMin,
        xMax: activeGalleryItem.view.xMax,
        yMin: activeGalleryItem.view.yMin,
        yMax: activeGalleryItem.view.yMax,
        autoY: false
      };
      plotter.setView(state.plotView);
    }
    renderFunctionList();
    updatePlot();
    updateFunctionPreview();
    savePlotState();
    toast(`已将「${activeGalleryItem.name}」绘制到画布`);
  }

  function addFunction() {
    if (state.functions.length >= 5) {
      toast("最多同时绘制 5 条函数", "error");
      return;
    }
    const used = new Set(state.functions.map((fn) => fn.color));
    const color = COLORS.find((value) => !used.has(value)) || COLORS[state.functions.length % COLORS.length];
    const fn = { id: uid(), expr: "", color, visible: true };
    state.functions.push(fn);
    state.activeFunctionId = fn.id;
    renderFunctionList();
    savePlotState();
    updatePlot();
    updateFunctionPreview();
    const row = dom.functionList.querySelector(`[data-id="${fn.id}"] input`);
    if (row) row.focus();
  }

  function removeFunction(id) {
    if (state.functions.length <= 1) {
      toast("至少保留一条函数；可以清空表达式", "error");
      return;
    }
    state.functions = state.functions.filter((fn) => fn.id !== id);
    renderFunctionList();
    savePlotState();
    updatePlot();
  }

  function cycleColor(id) {
    const fn = state.functions.find((item) => item.id === id);
    if (!fn) return;
    const index = COLORS.indexOf(fn.color);
    fn.color = COLORS[(index + 1) % COLORS.length];
    const row = dom.functionList.querySelector(`[data-id="${id}"] .fn-color`);
    if (row) row.style.setProperty("--fn-color", fn.color);
    savePlotState();
    updatePlot();
  }

  const updatePlotDebounced = debounce(() => updatePlot(), 230);

  function updatePlot(options = {}) {
    const valid = [];
    let primary = null;
    state.functions.forEach((fn, index) => {
      const row = dom.functionList.querySelector(`[data-id="${fn.id}"]`);
      if (!row) return;
      const errorEl = row.querySelector(".fn-error");
      const input = row.querySelector(".fn-input");
      if (input && input.value !== fn.expr) input.value = fn.expr;
      row.classList.remove("has-error");
      errorEl.textContent = "";
      if (!fn.expr.trim()) return;
      try {
        const normalized = MC.normalizeExpression(fn.expr);
        const node = MC.math.parse(normalized);
        const symbols = [];
        node.traverse((child) => {
          if (child.isSymbolNode && !["x", "pi", "e"].includes(child.name) && !isKnownFunctionName(child.name)) {
            symbols.push(child.name);
          }
        });
        if (symbols.length) throw new Error(`不支持的变量 “${symbols[0]}”`);
        const entry = {
          expr: normalized,
          color: fn.color,
          visible: fn.visible,
          label: `f${SUBSCRIPTS[index]}(x)`
        };
        if (fn.visible) valid.push(entry);
        if (!primary && fn.visible) primary = { ...entry, index, normalized, node };
      } catch (error) {
        row.classList.add("has-error");
        errorEl.textContent = error.message;
      }
    });

    plotCache.valid = valid;
    currentPrimary = primary;
    plotter.setFunctions(valid);
    dom.canvasEmpty.classList.toggle("is-visible", valid.length === 0);
    if (!valid.length) {
      const text = dom.canvasEmpty.querySelector("p");
      if (text) {
        text.textContent = state.functions.some((fn) => fn.visible && fn.expr.trim())
          ? "表达式需要修正，或所有曲线都已隐藏"
          : "输入一个函数开始绘制";
      }
    }
    updatePlotStatus();
    syncAnalysis();
    if (options.save !== false) savePlotState();
  }

  function isKnownFunctionName(name) {
    return [
      "sin", "cos", "tan", "cot", "sec", "csc", "asin", "acos", "atan",
      "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "ln", "log",
      "log10", "lg", "exp", "sqrt", "cbrt", "abs", "sign", "floor", "ceil",
      "round", "erf"
    ].includes(name);
  }

  function updatePlotStatus() {
    if (!plotter) return;
    const count = plotCache.valid.length;
    const x1 = formatValue(plotter.xMin, 4);
    const x2 = formatValue(plotter.xMax, 4);
    dom.plotStatus.textContent = count
      ? `${count} 条曲线 · x ∈ [${x1}, ${x2}]`
      : "等待输入";
  }

  function applyViewInputs() {
    const xMin = Number(dom.xMinInput.value);
    const xMax = Number(dom.xMaxInput.value);
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax - xMin <= 1e-9) {
      toast("X 轴范围需要两个有效数字，且最大值大于最小值", "error");
      return;
    }
    const yMin = dom.yMinInput.value.trim() === "" ? null : Number(dom.yMinInput.value);
    const yMax = dom.yMaxInput.value.trim() === "" ? null : Number(dom.yMaxInput.value);
    let fixedY = false;
    if (yMin !== null && yMax !== null && Number.isFinite(yMin) && Number.isFinite(yMax) && yMax > yMin) {
      fixedY = true;
    } else if (yMin !== null || yMax !== null) {
      toast("Y 轴范围需要同时填写且最大值大于最小值；已切换为自动适配", "info");
    }
    state.plotView = {
      xMin,
      xMax,
      yMin: fixedY ? yMin : null,
      yMax: fixedY ? yMax : null,
      autoY: !fixedY
    };
    if (!fixedY) {
      dom.yMinInput.value = "";
      dom.yMaxInput.value = "";
    }
    plotter.setView(state.plotView);
    syncAnalysis();
    updatePlotStatus();
    savePlotState();
  }

  function resetPlotView() {
    const home = plotter.home || state.plotView;
    dom.xMinInput.value = String(home.xMin);
    dom.xMaxInput.value = String(home.xMax);
    dom.yMinInput.value = home.autoY || home.yMin === null ? "" : String(home.yMin);
    dom.yMaxInput.value = home.autoY || home.yMax === null ? "" : String(home.yMax);
    plotter.resetView();
    state.plotView = {
      xMin: plotter.xMin,
      xMax: plotter.xMax,
      yMin: plotter.autoY ? null : plotter.yMin,
      yMax: plotter.autoY ? null : plotter.yMax,
      autoY: plotter.autoY
    };
    syncAnalysis();
    updatePlotStatus();
    savePlotState();
  }

  function handlePlotHover(data) {
    if (!data || !data.values || !data.values.length) {
      dom.plotReadout.innerHTML = '<span class="readout-x">x <b>—</b></span><span class="readout-y">y <b>—</b></span>';
      return;
    }
    const first = data.values[0];
    dom.plotReadout.innerHTML = `
      <span class="readout-x">x <b>${formatValue(data.x, 5)}</b></span>
      <span class="readout-y">${first.label || "y"} <b>${formatValue(first.value, 5)}</b></span>
    `;
  }

  /* ---------------------------------------------------------
     Plot analysis
     --------------------------------------------------------- */

  function syncAnalysis() {
    if (!plotter) return;
    if (!currentPrimary) {
      clearAnalysis();
      plotter.setPoints([]);
      return;
    }
    const xMin = plotter.xMin;
    const xMax = plotter.xMax;
    const analysis = analyzeFunction(currentPrimary.normalized, xMin, xMax, currentPrimary.color);
    dom.analysisBadge.textContent = `f${SUBSCRIPTS[currentPrimary.index]}(x)`;
    dom.tableBadge.textContent = `f${SUBSCRIPTS[currentPrimary.index]}(x)`;
    renderPointChips(dom.rootsList, analysis.roots, "root");
    renderPointChips(dom.extremaList, analysis.extrema, "extremum");
    renderIntercept(analysis.intercept);
    renderValueTable(analysis.table);
    plotter.setPoints(analysis.points);
  }

  function clearAnalysis() {
    dom.analysisBadge.textContent = "主函数";
    dom.tableBadge.textContent = "f₁(x)";
    dom.rootsList.innerHTML = '<span class="muted-chip">暂无</span>';
    dom.extremaList.innerHTML = '<span class="muted-chip">暂无</span>';
    dom.interceptList.innerHTML = '<span class="muted-chip">暂无</span>';
    dom.valueTableBody.innerHTML = '<tr><td>—</td><td>—</td></tr>';
  }

  function analyzeFunction(normalized, xMin, xMax, color) {
    const evaluator = MC.makeEvaluator(normalized);
    const span = xMax - xMin;
    const sampleCount = 2200;
    const samples = [];
    for (let i = 0; i <= sampleCount; i += 1) {
      const x = xMin + (i / sampleCount) * span;
      const y = evaluator(x);
      samples.push({ x, y: y !== null && Number.isFinite(y) ? y : null });
    }

    const roots = [];
    const addRoot = (x) => {
      if (!Number.isFinite(x) || x < xMin - span * 1e-6 || x > xMax + span * 1e-6) return;
      if (Math.abs(x) < span * 1e-7) x = 0;
      if (roots.some((root) => Math.abs(root - x) < Math.max(1e-6, span * 2e-5))) return;
      roots.push(x);
    };

    for (let i = 0; i < samples.length; i += 1) {
      const point = samples[i];
      if (point.y === null) continue;
      if (Math.abs(point.y) < 1e-10) addRoot(point.x);
      if (i > 0) {
        const previous = samples[i - 1];
        if (previous.y === null || point.y === null) continue;
        if (previous.y * point.y < 0) {
          const root = bisectZero(evaluator, previous.x, point.x, 60);
          if (root !== null) {
            const yAtRoot = evaluator(root);
            if (yAtRoot !== null && Math.abs(yAtRoot) < Math.max(1e-5, Math.abs(previous.y) * 1e-6)) {
              addRoot(root);
            }
          }
        }
      }
    }

    // Tangential roots, such as x^2 at the origin.
    for (let i = 1; i < samples.length - 1; i += 1) {
      const point = samples[i];
      const before = samples[i - 1];
      const after = samples[i + 1];
      if (point.y === null || before.y === null || after.y === null) continue;
      const abs = Math.abs(point.y);
      if (abs < 1e-4 && abs <= Math.abs(before.y) && abs <= Math.abs(after.y)) {
        const root = goldenMinimumAbs(evaluator, before.x, after.x);
        if (root !== null) {
          const y = evaluator(root);
          if (y !== null && Math.abs(y) < 1e-7) addRoot(root);
        }
      }
    }

    if (xMin <= 0 && xMax >= 0) {
      const y0 = evaluator(0);
      if (y0 !== null && Math.abs(y0) < 1e-8) addRoot(0);
    }

    roots.sort((a, b) => a - b);
    const finalRoots = roots.slice(0, 8);

    const derivative = getDerivativeEvaluator(normalized, span);
    const extrema = [];
    const derivSamples = [];
    for (let i = 0; i <= 1800; i += 1) {
      const x = xMin + (i / 1800) * span;
      const d = derivative(x);
      derivSamples.push({ x, d: d !== null && Number.isFinite(d) ? d : null });
    }
    for (let i = 1; i < derivSamples.length; i += 1) {
      const prev = derivSamples[i - 1];
      const curr = derivSamples[i];
      if (prev.d === null || curr.d === null) continue;
      if (prev.d * curr.d < 0) {
        const critical = bisectZero(derivative, prev.x, curr.x, 55);
        if (critical === null) continue;
        const y = evaluator(critical);
        if (y === null || !Number.isFinite(y)) continue;
        if (extrema.some((item) => Math.abs(item.x - critical) < Math.max(1e-5, span * 3e-5))) continue;
        const h = Math.max(span * 2e-5, 1e-5);
        const left = evaluator(critical - h);
        const right = evaluator(critical + h);
        let type = "critical";
        if (left !== null && right !== null) {
          if (y <= left && y <= right) type = "min";
          else if (y >= left && y >= right) type = "max";
        }
        if (type === "critical") continue;
        extrema.push({ x: critical, y, type });
      }
    }

    extrema.sort((a, b) => a.x - b.x);
    const finalExtrema = extrema.slice(0, 6);

    let intercept = null;
    if (xMin <= 0 && xMax >= 0) {
      const y = evaluator(0);
      if (y !== null && Number.isFinite(y)) intercept = { x: 0, y };
    }

    const points = [];
    for (const root of finalRoots) {
      const y = evaluator(root);
      if (y === null) continue;
      points.push({
        x: root,
        y,
        type: "root",
        color,
        label: `x=${formatValue(root, 4)}`
      });
    }
    for (const item of finalExtrema) {
      points.push({
        x: item.x,
        y: item.y,
        type: item.type,
        color: item.type === "max" ? "#d45f4d" : "#3d6ddb",
        label: `${item.type === "max" ? "max" : "min"}`
      });
    }

    const table = [];
    const tableCount = 7;
    const start = xMin;
    for (let i = 0; i < tableCount; i += 1) {
      const x = start + (i / (tableCount - 1)) * span;
      const y = evaluator(x);
      table.push({ x, y: y !== null && Number.isFinite(y) ? y : null });
    }

    return { roots: finalRoots, extrema: finalExtrema, intercept, points, table };
  }

  function bisectZero(fn, left, right, iterations) {
    let a = left;
    let b = right;
    let fa = fn(a);
    let fb = fn(b);
    if (fa === null || fb === null) return null;
    if (Math.abs(fa) < 1e-14) return a;
    if (Math.abs(fb) < 1e-14) return b;
    if (fa * fb > 0) return null;
    for (let i = 0; i < iterations; i += 1) {
      const mid = (a + b) / 2;
      const fm = fn(mid);
      if (fm === null) return null;
      if (Math.abs(fm) < 1e-13) return mid;
      if (fa * fm <= 0) {
        b = mid;
        fb = fm;
      } else {
        a = mid;
        fa = fm;
      }
    }
    return (a + b) / 2;
  }

  function goldenMinimumAbs(fn, left, right) {
    const ratio = (Math.sqrt(5) - 1) / 2;
    let a = left;
    let b = right;
    let c = b - ratio * (b - a);
    let d = a + ratio * (b - a);
    let fc = absValue(fn(c));
    let fd = absValue(fn(d));
    for (let i = 0; i < 48; i += 1) {
      if (fc === null || fd === null) return null;
      if (fc < fd) {
        b = d;
        d = c;
        fd = fc;
        c = b - ratio * (b - a);
        fc = absValue(fn(c));
      } else {
        a = c;
        c = d;
        fc = fd;
        d = a + ratio * (b - a);
        fd = absValue(fn(d));
      }
    }
    const center = (a + b) / 2;
    const fcCenter = absValue(fn(center));
    const fcBest = absValue(fn(c));
    let best = c;
    if (fcCenter !== null && (fcBest === null || fcCenter < fcBest)) best = center;
    return Number.isFinite(best) ? best : null;
  }

  function absValue(value) {
    return value === null || !Number.isFinite(value) ? null : Math.abs(value);
  }

  function getDerivativeEvaluator(normalized, span) {
    try {
      const derivative = MC.math.derivative(normalized, "x");
      return (x) => {
        try {
          const value = derivative.compile().evaluate({ x });
          if (typeof value === "number" && Number.isFinite(value)) return value;
          return null;
        } catch (error) {
          return null;
        }
      };
    } catch (error) {
      const evaluator = MC.makeEvaluator(normalized);
      const h = Math.max(span * 1e-6, 1e-5);
      return (x) => {
        const a = evaluator(x - h);
        const b = evaluator(x + h);
        if (a === null || b === null) return null;
        return (b - a) / (2 * h);
      };
    }
  }

  function renderPointChips(container, values, kind) {
    container.textContent = "";
    if (!values.length) {
      const empty = document.createElement("span");
      empty.className = "muted-chip";
      empty.textContent = kind === "root" ? "视窗内无零点" : "视窗内无极值";
      container.appendChild(empty);
      return;
    }
    values.slice(0, 8).forEach((value) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "point-chip" + (value.type === "min" ? " is-min" : value.type === "max" ? " is-max" : "");
      const x = kind === "root" ? value : value.x;
      chip.dataset.x = String(x);
      chip.title = "将视图定位到这里";
      if (kind === "root") {
        chip.innerHTML = `x <em>=</em> ${formatValue(value, 5)}`;
      } else {
        chip.innerHTML = `${value.type === "max" ? "max" : "min"} <em>·</em> x=${formatValue(value.x, 4)} <em>·</em> y=${formatValue(value.y, 4)}`;
      }
      chip.addEventListener("click", () => focusPlotX(Number(chip.dataset.x)));
      container.appendChild(chip);
    });
  }

  function renderIntercept(intercept) {
    dom.interceptList.textContent = "";
    if (!intercept) {
      const empty = document.createElement("span");
      empty.className = "muted-chip";
      empty.textContent = "不在视窗内或未定义";
      dom.interceptList.appendChild(empty);
      return;
    }
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "point-chip";
    chip.innerHTML = `(0, ${formatValue(intercept.y, 5)})`;
    chip.addEventListener("click", () => focusPlotX(0));
    dom.interceptList.appendChild(chip);
  }

  function renderValueTable(rows) {
    dom.valueTableBody.textContent = "";
    for (const row of rows) {
      const tr = document.createElement("tr");
      const x = document.createElement("td");
      x.textContent = formatValue(row.x, 5);
      const y = document.createElement("td");
      y.textContent = row.y === null ? "—" : formatValue(row.y, 6);
      tr.append(x, y);
      dom.valueTableBody.appendChild(tr);
    }
  }

  function focusPlotX(x) {
    if (!Number.isFinite(x)) return;
    const span = plotter.xMax - plotter.xMin;
    plotter.xMin = x - span / 2;
    plotter.xMax = x + span / 2;
    plotter.scheduleDraw();
    syncAnalysis();
    updatePlotStatus();
  }

  /* ---------------------------------------------------------
     Integral module
     --------------------------------------------------------- */

  function initIntegralModule() {
    dom.integrandInput.value = state.integral.integrand;
    dom.upperBoundInput.value = state.integral.upper;
    dom.lowerBoundInput.value = state.integral.lower;
    if (dom.shortcut) {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
      dom.shortcut.textContent = isMac ? "⌘↵" : "Ctrl↵";
    }

    setIntegralType(state.integral.type, { save: false, silent: true });
    renderIntegralPreview();
    renderHistory();

    if (areaPlotter) {
      areaPlotter.refreshTheme();
    }
    areaPlotter = new window.FunctionPlotter(dom.areaCanvas, {
      interactive: true,
      showTooltip: true,
      showLegend: false,
      padding: { left: 48, right: 18, top: 22, bottom: 34 }
    });
    areaPlotter.setOptions({ showGrid: true, showPoints: false, showDerivative: false });

    dom.integralType.addEventListener("click", (event) => {
      const button = event.target.closest("[data-type]");
      if (!button) return;
      setIntegralType(button.dataset.type);
    });

    dom.integrandInput.addEventListener("input", () => {
      state.integral.integrand = dom.integrandInput.value;
      saveIntegralDraft();
      debounceIntegralPreview();
    });
    dom.integrandInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        calculateIntegral();
      }
    });
    dom.upperBoundInput.addEventListener("input", () => {
      state.integral.upper = dom.upperBoundInput.value;
      saveIntegralDraft();
      renderIntegralPreviewDebounced();
    });
    dom.lowerBoundInput.addEventListener("input", () => {
      state.integral.lower = dom.lowerBoundInput.value;
      saveIntegralDraft();
      renderIntegralPreviewDebounced();
    });

    dom.clearIntegrandBtn.addEventListener("click", () => {
      dom.integrandInput.value = "";
      state.integral.integrand = "";
      dom.integrandInput.focus();
      dom.integrandInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    dom.backspaceBtn.addEventListener("click", () => {
      backspaceAtCursor(dom.integrandInput);
    });

    $$("[data-insert]").forEach((button) => {
      button.addEventListener("click", () => {
        insertIntoIntegrand(button.dataset.insert);
      });
    });
    $$("[data-template]").forEach((button) => {
      button.addEventListener("click", () => {
        applyIntegrandTemplate(button.dataset.template);
      });
    });

    dom.keypadTabs.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.keypad;
        dom.keypadTabs.forEach((item) => item.classList.toggle("is-active", item === button));
        dom.keypadPanels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.keypadPanel === tab));
      });
    });

    dom.calculateBtn.addEventListener("click", () => calculateIntegral());
    dom.randomExampleBtn.addEventListener("click", () => {
      const example = randomIntegralExample();
      applyIntegralExample(example);
      toast("已换一个示例，点击「开始计算」查看推导");
    });
    dom.errorExampleBtn.addEventListener("click", () => {
      const example = randomIntegralExample();
      applyIntegralExample(example);
      calculateIntegral();
    });
    dom.clearHistoryBtn.addEventListener("click", () => {
      state.history = [];
      writeStorage(STORAGE.history, state.history);
      renderHistory();
      toast("计算记录已清空");
    });
    dom.copyLatexBtn.addEventListener("click", () => {
      if (!currentResult) return;
      copyText(currentResult.resultLatex, "LaTeX 已复制");
    });
    dom.copyResultBtn.addEventListener("click", () => {
      if (!currentResult) return;
      copyText(currentResult.resultPlain, "结果已复制");
    });
    dom.insertResultBtn.addEventListener("click", () => {
      if (!currentResult) return;
      const expr = currentResult.antiderivative || currentResult.exact;
      if (!expr) {
        toast("当前结果为数值结果，没有可复用的原函数", "error");
        return;
      }
      switchView("integral", { updateHash: false });
      dom.integrandInput.value = expr;
      state.integral.integrand = expr;
      saveIntegralDraft();
      renderIntegralPreview();
      dom.integrandInput.focus();
      toast("已把原函数填入被积函数");
    });
    dom.antiderivativeToggle.addEventListener("change", () => {
      if (currentResult && currentResult.type === "definite") renderArea(currentResult);
    });
  }

  const debounceIntegralPreview = debounce(() => renderIntegralPreview(), 150);
  const renderIntegralPreviewDebounced = debounce(() => renderIntegralPreview(), 120);

  function setIntegralType(type, options = {}) {
    type = type === "definite" ? "definite" : "indefinite";
    state.integral.type = type;
    $$("[data-type]", dom.integralType).forEach((button) => {
      const active = button.dataset.type === type;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    dom.integralDisplay.classList.toggle("is-indefinite", type === "indefinite");
    dom.boundsSection.classList.toggle("is-collapsed", type === "indefinite");
    if (type === "definite") {
      dom.boundsSection.removeAttribute("aria-hidden");
    } else {
      dom.boundsSection.setAttribute("aria-hidden", "true");
    }
    if (options.save !== false) saveIntegralDraft();
    if (!options.silent) renderIntegralPreview();
  }

  function saveIntegralDraft() {
    writeStorage(STORAGE.integral, state.integral);
  }

  function renderIntegralPreview() {
    const type = state.integral.type;
    const raw = dom.integrandInput.value;
    let tex = "";
    let error = "";
    if (!raw.trim()) {
      tex = "\\text{输入被积函数}";
    } else {
      try {
        tex = MC.expressionToTex(raw);
      } catch (err) {
        error = err.message;
        tex = "\\text{表达式待修正}";
      }
    }
    renderMath(dom.integralPreview, tex, false);
    dom.integrandField.classList.toggle("has-error", Boolean(error));
    dom.integrandError.textContent = error;
    dom.integrandError.classList.toggle("is-visible", Boolean(error));

    if (type === "definite") {
      renderBoundTex(dom.upperBoundInput.value, dom.boundTopPreview);
      renderBoundTex(dom.lowerBoundInput.value, dom.boundBottomPreview);
      checkBoundsPreview();
    } else {
      dom.boundTopPreview.textContent = "";
      dom.boundBottomPreview.textContent = "";
      dom.boundsError.textContent = "";
      dom.boundsError.classList.remove("is-visible");
      dom.upperBoundInput.classList.remove("is-invalid");
      dom.lowerBoundInput.classList.remove("is-invalid");
    }
  }

  function renderBoundTex(raw, element) {
    if (!element) return;
    if (!raw || !String(raw).trim()) {
      element.textContent = "?";
      return;
    }
    try {
      const tex = MC.expressionToTex(String(raw));
      renderMath(element, tex, false);
    } catch (error) {
      element.textContent = "?";
    }
  }

  function checkBoundsPreview() {
    if (state.integral.type !== "definite") return;
    let message = "";
    try {
      MC.parseBound(dom.lowerBoundInput.value, "下限");
      dom.lowerBoundInput.classList.remove("is-invalid");
    } catch (error) {
      message = error.message;
      dom.lowerBoundInput.classList.add("is-invalid");
    }
    try {
      MC.parseBound(dom.upperBoundInput.value, "上限");
      dom.upperBoundInput.classList.remove("is-invalid");
    } catch (error) {
      if (!message) message = error.message;
      dom.upperBoundInput.classList.add("is-invalid");
    }
    dom.boundsError.textContent = message;
    dom.boundsError.classList.toggle("is-visible", Boolean(message));
  }

  function insertIntoIntegrand(text) {
    const input = dom.integrandInput;
    const start = input.selectionStart === null ? input.value.length : input.selectionStart;
    const end = input.selectionEnd === null ? input.value.length : input.selectionEnd;
    const selected = input.value.slice(start, end);
    let insertion = text;
    let caret = start + text.length;
    if (text.endsWith("(")) {
      if (selected) {
        insertion = text + selected + ")";
        caret = start + insertion.length;
      } else {
        insertion = text + ")";
        caret = start + text.length;
      }
    } else if (text === "^" && selected) {
      insertion = "^(" + selected + ")";
      caret = start + insertion.length;
    }
    input.setRangeText(insertion, start, end, "end");
    input.selectionStart = caret;
    input.selectionEnd = caret;
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function backspaceAtCursor(input) {
    const start = input.selectionStart === null ? input.value.length : input.selectionStart;
    const end = input.selectionEnd === null ? input.value.length : input.selectionEnd;
    if (start === 0 && end === 0) return;
    if (start !== end) {
      input.setRangeText("", start, end, "end");
    } else {
      input.setRangeText("", Math.max(0, start - 1), start, "end");
    }
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyIntegrandTemplate(template) {
    if (!template) return;
    dom.integrandInput.value = template;
    state.integral.integrand = template;
    saveIntegralDraft();
    renderIntegralPreview();
    dom.integrandInput.focus();
    const end = template.length;
    dom.integrandInput.setSelectionRange(end, end);
  }

  const EXAMPLES = [
    { type: "indefinite", integrand: "x^2", lower: "0", upper: "1" },
    { type: "indefinite", integrand: "sin(2x)", lower: "0", upper: "pi" },
    { type: "indefinite", integrand: "x * exp(x)", lower: "0", upper: "1" },
    { type: "indefinite", integrand: "ln(x)", lower: "1", upper: "e" },
    { type: "definite", integrand: "1/(1+x^2)", lower: "0", upper: "1" },
    { type: "definite", integrand: "sin(x)", lower: "0", upper: "pi" },
    { type: "definite", integrand: "exp(-x^2)", lower: "0", upper: "1" },
    { type: "definite", integrand: "x^2", lower: "0", upper: "2" },
    { type: "definite", integrand: "1/sqrt(x)", lower: "0", upper: "1" },
    { type: "definite", integrand: "x/(x^2+1)", lower: "0", upper: "2" }
  ];

  function randomIntegralExample() {
    const candidates = EXAMPLES.filter((item) => item.integrand !== state.integral.integrand);
    return candidates[Math.floor(Math.random() * candidates.length)] || EXAMPLES[0];
  }

  function applyIntegralExample(example) {
    setIntegralType(example.type, { save: false, silent: true });
    dom.integrandInput.value = example.integrand;
    state.integral.integrand = example.integrand;
    dom.lowerBoundInput.value = example.lower;
    dom.upperBoundInput.value = example.upper;
    state.integral.lower = example.lower;
    state.integral.upper = example.upper;
    saveIntegralDraft();
    renderIntegralPreview();
  }

  async function calculateIntegral(options = {}) {
    if (isCalculating) return;
    const raw = dom.integrandInput.value.trim();
    const type = state.integral.type;
    if (!raw) {
      showError("缺少被积函数", "请先输入一个被积函数，或点击符号键盘中的模板。");
      dom.integrandInput.focus();
      return;
    }
    if (type === "definite") {
      if (!dom.lowerBoundInput.value.trim() || !dom.upperBoundInput.value.trim()) {
        showError("缺少积分上下限", "定积分需要填写下限与上限，例如 0 和 pi/2。");
        return;
      }
    }

    let parsed;
    try {
      parsed = MC.parseExpression(raw);
    } catch (error) {
      showError("表达式有误", error.message);
      return;
    }
    if (type === "definite") {
      try {
        MC.parseBound(dom.lowerBoundInput.value, "下限");
        MC.parseBound(dom.upperBoundInput.value, "上限");
      } catch (error) {
        showError("积分上下限有误", error.message);
        return;
      }
    }

    hasIntegralAutoRun = true;
    isCalculating = true;
    dom.calculateBtn.classList.add("is-loading");
    dom.calculateBtn.disabled = true;
    dom.errorCard.classList.add("is-hidden");
    dom.resultCard.setAttribute("aria-busy", "true");
    await new Promise((resolve) => setTimeout(resolve, 40));

    try {
      const result = MC.integrateExpression(raw, {
        type,
        lower: dom.lowerBoundInput.value,
        upper: dom.upperBoundInput.value
      });
      if (!result.ok) {
        currentResult = null;
        const message = result.reason === "no-elementary"
          ? "当前本地引擎未能找到该函数的初等原函数。可以切换到「定积分」获得高精度数值结果，或检查表达式是否与预期一致。"
          : (result.message || "可以尝试换一种写法，或切换到定积分模式获得数值结果。");
        showError("未能找到初等原函数", message);
        return;
      }
      state.integral.integrand = raw;
      state.integral.lower = dom.lowerBoundInput.value;
      state.integral.upper = dom.upperBoundInput.value;
      state.integral.type = type;
      saveIntegralDraft();
      renderResult(result);
      addHistory(result);
      if (!options.auto && window.innerWidth < 1100) {
        setTimeout(() => {
          dom.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
      }
    } catch (error) {
      currentResult = null;
      const message = error && error.message ? error.message : "计算过程中出现未知错误。";
      const title = /发散|奇点/.test(message) ? "积分可能发散" : "无法完成计算";
      showError(title, message);
    } finally {
      isCalculating = false;
      dom.calculateBtn.classList.remove("is-loading");
      dom.calculateBtn.disabled = false;
      dom.resultCard.removeAttribute("aria-busy");
    }
  }

  function showError(title, message) {
    currentResult = null;
    dom.errorTitle.textContent = title;
    dom.errorMessage.textContent = message;
    dom.errorCard.classList.remove("is-hidden");
    dom.resultCard.classList.add("is-hidden");
    dom.stepsCard.classList.add("is-hidden");
    dom.areaCard.classList.add("is-hidden");
    dom.integralEmpty.classList.add("is-hidden");
    if (window.innerWidth < 1100) {
      dom.errorCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function renderResult(result) {
    currentResult = result;
    dom.integralEmpty.classList.add("is-hidden");
    dom.errorCard.classList.add("is-hidden");
    dom.resultCard.classList.remove("is-hidden");

    dom.resultKicker.textContent = result.resultKicker || (result.type === "definite" ? "DEFINITE INTEGRAL" : "SYMBOLIC RESULT");
    dom.resultTitle.textContent = result.resultTitle || (result.type === "definite" ? "定积分结果" : "不定积分结果");
    renderMath(dom.resultFormula, result.displayTex, true);
    dom.resultFormula.classList.toggle("is-numeric", result.type === "definite" && !result.exactIsNice);

    const verification = result.verification || { status: "unknown", label: "未验证" };
    dom.verifyBadge.className = "verify-badge";
    if (verification.status === "warn") dom.verifyBadge.classList.add("is-warning");
    if (verification.status === "error") dom.verifyBadge.classList.add("is-error");
    const badgeIcon = verification.status === "ok" ? "i-check" : verification.status === "numeric" ? "i-chart" : "i-info";
    dom.verifyBadge.innerHTML = icon(badgeIcon) + "<span></span>";
    dom.verifyBadge.querySelector("span").textContent = verification.label;
    dom.methodBadge.textContent = result.method || "符号积分";

    dom.resultCaption.textContent = result.caption || "";
    const approxLabel = dom.approxValue.closest(".secondary-item").querySelector("span");
    if (result.type === "definite") {
      approxLabel.textContent = "近似值";
      dom.approxValue.textContent = result.approxText ? "≈ " + result.approxText : "—";
    } else {
      approxLabel.textContent = "结果形式";
      dom.approxValue.textContent = "符号闭式";
    }
    if (result.type === "definite") {
      if (verification.difference !== null && verification.difference !== undefined) {
        dom.numericCheck.textContent = "|Δ| = " + formatValue(verification.difference, 3);
      } else {
        dom.numericCheck.textContent = result.numeric ? MC.numericMethodLabel(result.numeric.method) : "数值结果";
      }
    } else {
      dom.numericCheck.textContent = verification.maxError !== null && verification.maxError !== undefined
        ? "max ε = " + formatValue(verification.maxError, 3)
        : "求导抽样";
    }
    dom.computeTime.textContent = MC.formatTime(result.duration);

    dom.insertResultBtn.disabled = !(result.antiderivative || result.exact);
    dom.insertResultBtn.style.opacity = dom.insertResultBtn.disabled ? "0.45" : "";
    dom.insertResultBtn.title = dom.insertResultBtn.disabled ? "数值结果没有可复用的原函数" : "把原函数填入被积函数";

    renderSteps(result);
    if (result.type === "definite") {
      renderArea(result);
    } else {
      dom.areaCard.classList.add("is-hidden");
    }
  }

  function renderSteps(result) {
    dom.stepsList.textContent = "";
    const steps = Array.isArray(result.steps) ? result.steps : [];
    if (!steps.length) {
      dom.stepsCard.classList.add("is-hidden");
      return;
    }
    dom.stepsCard.classList.remove("is-hidden");
    dom.stepsSummary.textContent = `${steps.length} 步 · ${result.method || "符号积分"}`;

    steps.forEach((step, index) => {
      const li = document.createElement("li");
      li.className = "step-item";

      const number = document.createElement("div");
      number.className = "step-index";
      number.textContent = String(index + 1).padStart(2, "0");

      const body = document.createElement("div");
      body.className = "step-body";

      const heading = document.createElement("div");
      heading.className = "step-heading";
      const title = document.createElement("h3");
      title.textContent = step.title;
      const tag = document.createElement("span");
      tag.className = "step-tag";
      tag.textContent = step.tag || "";
      heading.append(title, tag);

      const note = document.createElement("p");
      note.className = "step-note";
      note.textContent = step.note || "";

      body.append(heading, note);

      if (step.tex) {
        const math = document.createElement("div");
        math.className = "step-math";
        renderMath(math, step.tex, true);
        body.appendChild(math);
      }

      if (step.table && Array.isArray(step.table.rows)) {
        const table = document.createElement("table");
        table.className = "step-term-table";
        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        for (const header of step.table.headers) {
          const th = document.createElement("th");
          th.textContent = header;
          headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        const tbody = document.createElement("tbody");
        for (const row of step.table.rows) {
          const tr = document.createElement("tr");
          const termCell = document.createElement("td");
          termCell.className = "term-math";
          renderMath(termCell, `\\displaystyle ${row.term}`, false);
          const methodCell = document.createElement("td");
          const method = document.createElement("span");
          method.className = "term-method";
          method.textContent = row.label || "";
          methodCell.appendChild(method);
          const resultCell = document.createElement("td");
          resultCell.className = "term-math";
          if (row.result) renderMath(resultCell, `\\displaystyle ${row.result}`, false);
          else resultCell.textContent = "—";
          tr.append(termCell, methodCell, resultCell);
          tbody.appendChild(tr);
        }
        table.append(thead, tbody);
        body.appendChild(table);
      }

      if (step.subnote) {
        const sub = document.createElement("p");
        sub.className = "step-subnote";
        sub.textContent = step.subnote;
        body.appendChild(sub);
      }

      li.append(number, body);
      dom.stepsList.appendChild(li);
    });
  }

  function renderArea(result) {
    if (!result || result.type !== "definite" || !result.bounds) {
      dom.areaCard.classList.add("is-hidden");
      return;
    }
    const lower = result.bounds.lower.numeric;
    const upper = result.bounds.upper.numeric;
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
      dom.areaCard.classList.add("is-hidden");
      return;
    }
    dom.areaCard.classList.remove("is-hidden");

    const normalized = result.normalized || state.integral.integrand;
    let evaluator = null;
    try {
      evaluator = MC.makeEvaluator(normalized);
    } catch (error) {
      evaluator = null;
    }
    if (!evaluator) {
      dom.areaCard.classList.add("is-hidden");
      return;
    }

    const span = Math.abs(upper - lower);
    const pad = Math.max(span * 0.38, 0.65);
    const xMin = Math.min(lower, upper) - pad;
    const xMax = Math.max(lower, upper) + pad;

    const functions = [{
      expr: normalized,
      color: "#0e7a5f",
      visible: true,
      label: "f(x)"
    }];

    const hasAntiderivative = Boolean(result.antiderivative);
    dom.antiderivativeToggle.disabled = !hasAntiderivative;
    dom.antiderivativeToggle.closest(".mini-switch").style.opacity = hasAntiderivative ? "" : "0.5";
    if (!hasAntiderivative) dom.antiderivativeToggle.checked = false;
    if (hasAntiderivative && dom.antiderivativeToggle.checked) {
      try {
        MC.math.parse(result.antiderivative);
        functions.push({
          expr: result.antiderivative,
          color: "#b9822e",
          visible: true,
          label: "F(x)",
          dashed: true
        });
      } catch (error) {
        dom.antiderivativeToggle.checked = false;
        dom.antiderivativeToggle.disabled = true;
      }
    }

    const areaLabel = result.verification.status === "numeric" || !result.exactIsNice
      ? ""
      : "A = " + formatValue(result.approx, 5);
    dom.areaValueLabel.textContent = "A ≈ " + formatValue(result.approx, 7);

    areaPlotter.setOptions({ showGrid: true, showPoints: false, showDerivative: false });
    areaPlotter.setView({ xMin, xMax, autoY: true });
    areaPlotter.setFunctions(functions);
    areaPlotter.setArea({
      x1: lower,
      x2: upper,
      evaluator,
      label: areaLabel
    });
    areaPlotter.clearTrace();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        areaPlotter.resize();
      });
    });
  }

  function addHistory(result) {
    if (!result || !result.ok) return;
    const item = {
      id: uid("h"),
      time: Date.now(),
      type: result.type,
      integrand: state.integral.integrand,
      lower: state.integral.lower,
      upper: state.integral.upper,
      result: result.resultPlain,
      method: result.method,
      symbolic: result.symbolic
    };
    state.history = state.history.filter((entry) =>
      !(entry.integrand === item.integrand && entry.type === item.type && entry.lower === item.lower && entry.upper === item.upper)
    );
    state.history.unshift(item);
    state.history = state.history.slice(0, 10);
    writeStorage(STORAGE.history, state.history);
    renderHistory();
  }

  function renderHistory() {
    dom.historyList.textContent = "";
    if (!state.history.length) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "完成一次计算后，结果会自动保存在这里。";
      dom.historyList.appendChild(empty);
      return;
    }
    state.history.slice(0, 6).forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      button.title = "载入这次计算";
      const type = document.createElement("span");
      type.className = "history-type";
      type.textContent = item.type === "definite" ? "∫" : "∫";
      const main = document.createElement("span");
      main.className = "history-main";
      const formula = document.createElement("span");
      formula.className = "history-formula";
      formula.textContent = item.type === "definite"
        ? `∫[${item.lower},${item.upper}] ${item.integrand}`
        : `∫ ${item.integrand} dx`;
      const time = document.createElement("span");
      time.className = "history-time";
      time.textContent = relativeTime(item.time);
      main.append(formula, time);
      const result = document.createElement("span");
      result.className = "history-result";
      result.textContent = item.result || "—";
      button.append(type, main, result);
      button.addEventListener("click", () => {
        setIntegralType(item.type, { silent: true });
        dom.integrandInput.value = item.integrand;
        dom.lowerBoundInput.value = item.lower;
        dom.upperBoundInput.value = item.upper;
        state.integral = {
          type: item.type,
          integrand: item.integrand,
          lower: item.lower,
          upper: item.upper
        };
        saveIntegralDraft();
        renderIntegralPreview();
        calculateIntegral();
      });
      dom.historyList.appendChild(button);
    });
  }

  function relativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60 * 1000) return "刚刚";
    if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + " 小时前";
    if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / 86400000) + " 天前";
    return new Date(timestamp).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  }

  /* ---------------------------------------------------------
     Integral applications
     --------------------------------------------------------- */

  function ensureAppValues() {
    if (!state.apps.values) state.apps.values = {};
    Object.keys(APP_MODES).forEach((mode) => {
      if (!state.apps.values[mode]) state.apps.values[mode] = { ...APP_MODES[mode].defaults };
    });
  }

  function initAppsModule() {
    if (!dom.appModeGrid) return;
    ensureAppValues();
    appsPlotter = new window.FunctionPlotter(dom.appsCanvas, {
      interactive: true,
      showTooltip: true,
      showLegend: false,
      padding: { left: 52, right: 20, top: 22, bottom: 34 }
    });
    appsPlotter.setOptions({ showGrid: true, showPoints: false, showDerivative: false });

    dom.appModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.appMode;
        if (!APP_MODES[mode] || mode === state.apps.mode) return;
        saveAppInputValues();
        setAppMode(mode);
        setTimeout(() => calculateApplication({ auto: true }), 180);
      });
    });

    [dom.appTopInput, dom.appBottomInput, dom.appPolarInput].forEach((input) => {
      if (!input) return;
      input.addEventListener("focus", () => {
        activeAppInput = input;
      });
      input.addEventListener("input", () => {
        saveAppInputValues();
        clearAppHint();
        updateAppModelDebounced();
      });
    });
    [dom.appLowerInput, dom.appUpperInput].forEach((input) => {
      input.addEventListener("input", () => {
        saveAppInputValues();
        clearAppHint();
        updateAppModelDebounced();
      });
    });

    dom.appSymbolButtons.forEach((button) => {
      button.addEventListener("click", () => insertIntoAppInput(button.dataset.appInsert));
    });
    dom.appCalculateBtn.addEventListener("click", () => calculateApplication());
    dom.appCopyBtn.addEventListener("click", () => {
      if (currentAppResult) copyText(currentAppResult.copyText, "几何结果已复制");
    });
    dom.appSendBtn.addEventListener("click", sendAppToIntegral);

    dom.appExampleList.querySelectorAll("[data-app-example]").forEach((button) => {
      button.addEventListener("click", () => {
        const example = APP_EXAMPLES[button.dataset.appExample];
        if (!example) return;
        ensureAppValues();
        state.apps.values[example.mode] = { ...APP_MODES[example.mode].defaults, ...example.values };
        setAppMode(example.mode, { values: state.apps.values[example.mode], keepOutput: false });
        calculateApplication();
      });
    });

    setAppMode(state.apps.mode || "area", { silent: true, keepOutput: true });
    window.addEventListener("resize", debounce(() => {
      if (currentAppResult && currentAppResult.mode === "polar") drawPolarVisual(currentAppResult);
      if (appsPlotter && state.view === "apps" && !dom.appVisualCard.classList.contains("is-hidden")) appsPlotter.resize();
    }, 200));
  }

  const updateAppModelDebounced = debounce(() => updateAppModelPreview(), 150);

  function updateAppModeControls() {
    const mode = state.apps.mode;
    const config = APP_MODES[mode];
    if (!config) return;
    dom.appModeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.appMode === mode);
    });
    const isPolar = mode === "polar";
    dom.appTopField.classList.toggle("is-hidden", isPolar);
    dom.appBottomField.classList.toggle("is-hidden", isPolar);
    dom.appPolarField.classList.toggle("is-hidden", !isPolar);
    dom.appTopLabel.textContent = config.topLabel;
    dom.appBottomLabel.textContent = config.bottomLabel;
    dom.appTopHint.textContent = config.topHint;
    dom.appBottomHint.textContent = config.bottomHint;
    dom.appTopPrefix.textContent = isPolar ? "r(θ) =" : "f(x) =";
    dom.appBottomPrefix.textContent = "g(x) =";
    dom.appLowerLabel.textContent = config.lowerLabel;
    dom.appUpperLabel.textContent = config.upperLabel;
    dom.appBoundsLabel.textContent = config.boundsLabel;
    dom.appBoundsHint.textContent = config.boundsHint;
    dom.appHint.textContent = config.hint;
    dom.appHint.classList.remove("is-error");
    dom.appSymbolButtons.forEach((button) => {
      if (button.dataset.appInsert === "theta") button.classList.toggle("is-hidden", !isPolar);
    });
    activeAppInput = isPolar ? dom.appPolarInput : dom.appTopInput;
    updateAppModelPreview();
    updateAppGeometryLabels();
  }

  function setAppMode(mode, options = {}) {
    if (!APP_MODES[mode]) return;
    ensureAppValues();
    if (!options.skipSave) saveAppInputValues();
    state.apps.mode = mode;
    const values = options.values
      ? { ...options.values }
      : { ...(state.apps.values[mode] || APP_MODES[mode].defaults) };
    state.apps.values[mode] = values;
    dom.appTopInput.value = values.top || "";
    dom.appBottomInput.value = values.bottom || "";
    dom.appPolarInput.value = values.polar || "";
    dom.appLowerInput.value = values.lower || "";
    dom.appUpperInput.value = values.upper || "";
    updateAppModeControls();
    if (!options.keepOutput) resetAppOutput();
    if (!options.silent) saveAppInputValues();
  }

  function saveAppInputValues() {
    ensureAppValues();
    const mode = state.apps.mode;
    state.apps.values[mode] = {
      top: dom.appTopInput.value,
      bottom: dom.appBottomInput.value,
      polar: dom.appPolarInput.value,
      lower: dom.appLowerInput.value,
      upper: dom.appUpperInput.value
    };
    writeStorage(STORAGE.apps, state.apps);
  }

  function updateAppGeometryLabels() {
    const isPolar = state.apps.mode === "polar";
    if (isPolar) {
      dom.appVisualBadge.textContent = "极面积";
    } else if (state.apps.mode === "area") {
      dom.appVisualBadge.textContent = "面积";
    } else {
      dom.appVisualBadge.textContent = "体积";
    }
  }

  function updateAppModelPreview() {
    if (!dom.appFormulaPreview) return;
    const mode = state.apps.mode;
    const config = APP_MODES[mode];
    let lowerTex = "a";
    let upperTex = "b";
    try {
      lowerTex = MC.parseBound(dom.appLowerInput.value, "下限").tex;
    } catch (error) {
      /* keep symbolic placeholder */
    }
    try {
      upperTex = MC.parseBound(dom.appUpperInput.value, "上限").tex;
    } catch (error) {
      /* keep symbolic placeholder */
    }
    let tex = config.formulaTex;
    if (mode === "area") {
      tex = `A=\\int_{${lowerTex}}^{${upperTex}}\\left|f(x)-g(x)\\right|\\,dx`;
    } else if (mode === "volume-x") {
      tex = `V=\\pi\\int_{${lowerTex}}^{${upperTex}}\\left|f(x)^2-g(x)^2\\right|\\,dx`;
    } else if (mode === "volume-y") {
      tex = `V=2\\pi\\int_{${lowerTex}}^{${upperTex}}x\\left|f(x)-g(x)\\right|\\,dx`;
    } else {
      tex = `A=\\frac{1}{2}\\int_{${lowerTex}}^{${upperTex}}r(\\theta)^2\\,d\\theta`;
    }
    renderMath(dom.appFormulaPreview, tex, false);
  }

  function clearAppHint() {
    const config = APP_MODES[state.apps.mode];
    if (!config) return;
    dom.appHint.textContent = config.hint;
    dom.appHint.classList.remove("is-error");
  }

  function setAppHint(message, isError = false) {
    dom.appHint.textContent = message;
    dom.appHint.classList.toggle("is-error", isError);
  }

  function insertIntoAppInput(text) {
    if (!text) return;
    const input = activeAppInput || (state.apps.mode === "polar" ? dom.appPolarInput : dom.appTopInput);
    if (!input) return;
    insertTextAtCursor(input, text);
    saveAppInputValues();
    updateAppModelPreview();
    input.focus({ preventScroll: true });
  }

  function resetAppOutput() {
    currentAppResult = null;
    dom.appResultCard.classList.add("is-hidden");
    dom.appVisualCard.classList.add("is-hidden");
    dom.appStepsCard.classList.add("is-hidden");
    dom.appEmpty.classList.remove("is-hidden");
    dom.polarCanvas.classList.add("is-hidden");
    dom.appsCanvas.classList.remove("is-hidden");
    if (appsPlotter) appsPlotter.clearTrace();
  }

  function prepareCartesianExpression(raw, label) {
    if (!String(raw || "").trim()) throw new Error(`${label}不能为空`);
    const norm = MC.normalizeExpression(raw);
    const node = MC.math.parse(norm);
    const symbols = [];
    node.traverse((child) => {
      if (child.isSymbolNode && !["x", "pi", "e"].includes(child.name) && !isKnownFunctionName(child.name)) {
        symbols.push(child.name);
      }
    });
    if (symbols.length) throw new Error(`${label}中包含不支持的变量 “${symbols[0]}”`);
    return {
      raw: String(raw),
      norm,
      tex: MC.expressionToTex(raw),
      evaluator: MC.makeEvaluator(norm)
    };
  }

  function preparePolarExpression(raw) {
    if (!String(raw || "").trim()) throw new Error("极径 r(θ) 不能为空");
    const source = String(raw).replace(/[θϑ]/g, "theta").replace(/\\theta/g, "theta");
    const norm = MC.normalizeExpression(source);
    const node = MC.math.parse(norm);
    const symbols = [];
    node.traverse((child) => {
      if (child.isSymbolNode && !["theta", "pi", "e"].includes(child.name) && !isKnownFunctionName(child.name)) {
        symbols.push(child.name);
      }
    });
    if (symbols.length) {
      throw new Error(`极径表达式中请使用 theta 表示极角，不支持变量 “${symbols[0]}”`);
    }
    const code = node.compile();
    const evaluator = (theta) => {
      try {
        const value = code.evaluate({ theta });
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (value && typeof value.re === "number" && Math.abs(value.im || 0) < 1e-9) return value.re;
        return null;
      } catch (error) {
        return null;
      }
    };
    let tex = MC.texCleanup(node.toTex({ parenthesis: "auto" }));
    tex = tex.replace(/\\mathrm\{theta\}/g, "\\theta").replace(/\\operatorname\{theta\}/g, "\\theta");
    return { raw: String(raw), norm, tex, evaluator, xNorm: norm.replace(/\btheta\b/g, "x") };
  }

  function appBounds() {
    const lower = MC.parseBound(dom.appLowerInput.value, "下限");
    const upper = MC.parseBound(dom.appUpperInput.value, "上限");
    if (!(upper.numeric > lower.numeric + 1e-12)) {
      throw new Error("上限需要大于下限，才能计算正的几何量。");
    }
    return { lower, upper };
  }

  async function calculateApplication(options = {}) {
    if (isAppCalculating) return;
    const mode = state.apps.mode;
    const config = APP_MODES[mode];
    if (!config) return;
    isAppCalculating = true;
    hasAppsAutoRun = true;
    clearAppHint();
    dom.appCalculateBtn.classList.add("is-loading");
    dom.appCalculateBtn.disabled = true;
    await new Promise((resolve) => setTimeout(resolve, 40));
    try {
      saveAppInputValues();
      const bounds = appBounds();
      let top = null;
      let bottom = null;
      let polar = null;
      let integrand = null;
      let integralExpression = "";
      if (mode === "polar") {
        polar = preparePolarExpression(dom.appPolarInput.value);
        integrand = (theta) => {
          const r = polar.evaluator(theta);
          return r === null ? NaN : 0.5 * r * r;
        };
        integralExpression = `0.5*((${polar.xNorm})^2)`;
      } else {
        top = prepareCartesianExpression(dom.appTopInput.value, config.topLabel);
        bottom = prepareCartesianExpression(dom.appBottomInput.value || "0", config.bottomLabel);
        if (mode === "volume-y" && bounds.lower.numeric < -1e-9) {
          throw new Error("绕 y 轴旋转使用柱壳法，要求积分下限 a ≥ 0，即区域位于 y 轴右侧。");
        }
        if (mode === "area") {
          integrand = (x) => {
            const f = top.evaluator(x);
            const g = bottom.evaluator(x);
            return f === null || g === null ? NaN : Math.abs(f - g);
          };
          integralExpression = `abs((${top.norm})-(${bottom.norm}))`;
        } else if (mode === "volume-x") {
          integrand = (x) => {
            const f = top.evaluator(x);
            const g = bottom.evaluator(x);
            return f === null || g === null ? NaN : Math.PI * Math.abs(f * f - g * g);
          };
          integralExpression = `pi*abs((${top.norm})^2-(${bottom.norm})^2)`;
        } else {
          integrand = (x) => {
            const f = top.evaluator(x);
            const g = bottom.evaluator(x);
            return f === null || g === null ? NaN : 2 * Math.PI * x * Math.abs(f - g);
          };
          integralExpression = `2*pi*x*abs((${top.norm})-(${bottom.norm}))`;
        }
      }

      const numeric = MC.numericIntegral(integrand, bounds.lower.numeric, bounds.upper.numeric);
      if (!numeric || !Number.isFinite(numeric.value)) {
        throw new Error("数值积分未能收敛。请检查函数在该区间内是否有奇点，或缩小积分区间。");
      }
      const exactInfo = recognizeAppValue(numeric.value);
      const value = numeric.value;
      const methodLabel = MC.numericMethodLabel(numeric.method);
      const converged = numeric.converged !== false;
      const result = {
        mode,
        config,
        bounds,
        top,
        bottom,
        polar,
        integrand,
        integralExpression,
        numeric,
        value,
        exactInfo,
        methodLabel,
        converged,
        isPolar: mode === "polar",
        copyText: exactInfo ? `${config.symbol} = ${exactInfo.plain}` : `${config.symbol} ≈ ${formatValue(value, 10)}`,
        formulaTex: exactInfo
          ? `${config.symbol}=${exactInfo.tex}`
          : `${config.symbol}\\approx ${formatValue(value, 10)}`
      };
      currentAppResult = result;
      renderAppResult(result);
      renderAppVisual(result);
      renderAppSteps(result);
      dom.appEmpty.classList.add("is-hidden");
      dom.appResultCard.classList.remove("is-hidden");
      dom.appVisualCard.classList.remove("is-hidden");
      dom.appStepsCard.classList.remove("is-hidden");
      if (!options.auto && window.innerWidth < 1100) {
        setTimeout(() => dom.appResultCard.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      }
    } catch (error) {
      const message = error && error.message ? error.message : "计算过程中出现未知错误。";
      setAppHint(message, true);
      resetAppOutput();
      if (!options.auto) toast(message, "error");
    } finally {
      isAppCalculating = false;
      dom.appCalculateBtn.classList.remove("is-loading");
      dom.appCalculateBtn.disabled = false;
    }
  }

  function recognizeAppValue(value) {
    if (!Number.isFinite(value)) return null;
    if (Math.abs(value) < 1e-10) return { tex: "0", plain: "0" };
    const piRatio = bestRational(value / Math.PI, 60, 1e-7);
    if (piRatio && Math.abs(piRatio[0]) > 0) {
      const [p, q] = piRatio;
      if (Math.abs(p) <= 60 && q <= 60) {
        const sign = p < 0 ? "-" : "";
        const numerator = Math.abs(p) === 1 ? "\\pi" : `${Math.abs(p)}\\pi`;
        const tex = q === 1
          ? `${sign}${numerator}`
          : `${sign}\\frac{${numerator}}{${q}}`;
        const plain = q === 1
          ? `${sign}${Math.abs(p) === 1 ? "π" : Math.abs(p) + "π"}`
          : `${sign}${Math.abs(p) === 1 ? "π" : Math.abs(p) + "π"}/${q}`;
        return { tex, plain };
      }
    }
    const rational = bestRational(value, 10000, 5e-8);
    if (rational) {
      const [p, q] = rational;
      const sign = p < 0 ? "-" : "";
      const tex = q === 1 ? `${p}` : `${sign}\\frac{${Math.abs(p)}}{${q}}`;
      const plain = q === 1 ? `${p}` : `${sign}${Math.abs(p)}/${q}`;
      return { tex, plain };
    }
    return null;
  }

  function bestRational(value, maxDenominator, tolerance) {
    if (!Number.isFinite(value)) return null;
    const sign = value < 0 ? -1 : 1;
    let x = Math.abs(value);
    let h1 = 1;
    let h0 = 0;
    let k1 = 0;
    let k0 = 1;
    for (let i = 0; i < 32; i += 1) {
      const a = Math.floor(x);
      const h2 = a * h1 + h0;
      const k2 = a * k1 + k0;
      if (k2 > maxDenominator) break;
      h0 = h1;
      h1 = h2;
      k0 = k1;
      k1 = k2;
      if (Math.abs(value - (sign * h1) / k1) <= tolerance * Math.max(1, Math.abs(value))) {
        return [sign * h1, k1];
      }
      const rest = x - a;
      if (rest < 1e-12) break;
      x = 1 / rest;
    }
    return null;
  }

  function renderAppResult(result) {
    const config = result.config;
    dom.appResultKicker.textContent = config.kicker;
    dom.appResultTitle.textContent = config.title;
    dom.appUnitBadge.textContent = config.unit;
    renderMath(dom.appResultFormula, result.formulaTex, true);
    const valueText = result.exactInfo
      ? `≈ ${formatValue(result.value, 10)}`
      : formatValue(result.value, 10);
    dom.appResultValue.textContent = valueText;
    dom.appResultMethod.textContent = result.methodLabel;
    dom.appResultConvergence.textContent = result.converged ? "收敛" : "未完全收敛";
    dom.appResultConvergence.style.color = result.converged ? "" : "var(--amber)";
    const captionParts = [];
    if (result.exactInfo) captionParts.push(`精确形式 ${result.exactInfo.plain}`);
    captionParts.push(`${result.methodLabel}`);
    if (!result.exactInfo && result.numeric.error !== null && Number.isFinite(result.numeric.error)) {
      captionParts.push(`误差估计 ${formatValue(result.numeric.error, 3)}`);
    }
    if (result.mode === "polar") {
      const span = result.bounds.upper.numeric - result.bounds.lower.numeric;
      if (span > Math.PI * 2 + 1e-6) captionParts.push("角度区间超过一圈，面积可能重复计算");
    }
    if (result.mode === "volume-y") captionParts.push("柱壳法 · 区域位于 y 轴右侧");
    dom.appResultCaption.textContent = captionParts.join(" · ");
    dom.appVerifyBadge.className = "verify-badge" + (result.converged ? "" : " is-warning");
    dom.appVerifyBadge.innerHTML = icon(result.converged ? "i-check" : "i-info") + "<span>" + (result.converged ? "数值收敛" : "未完全收敛") + "</span>";
  }

  function renderAppVisual(result) {
    const config = result.config;
    dom.appVisualTitle.textContent = config.visualTitle;
    dom.appVisualBadge.textContent = config.visualBadge;
    dom.appLegendTop.textContent = config.legendTop;
    dom.appLegendBottom.textContent = config.legendBottom;
    dom.appLegendItemBottom.classList.toggle("is-hidden", result.mode === "polar");
    dom.appVisualValue.textContent = `${config.symbol} ≈ ${formatValue(result.value, 7)}`;
    dom.appVisualNote.textContent = config.visualNote;
    if (result.mode === "polar") {
      dom.appsCanvas.classList.add("is-hidden");
      dom.polarCanvas.classList.remove("is-hidden");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => drawPolarVisual(result));
      });
      return;
    }

    dom.polarCanvas.classList.add("is-hidden");
    dom.appsCanvas.classList.remove("is-hidden");
    const lower = result.bounds.lower.numeric;
    const upper = result.bounds.upper.numeric;
    const span = Math.abs(upper - lower);
    const pad = Math.max(span * 0.14, 0.35);
    const functions = [
      { expr: result.top.norm, color: "#0e7a5f", visible: true, label: "f(x)" },
      { expr: result.bottom.norm, color: "#d45f4d", visible: true, label: "g(x)" }
    ];
    const regions = [{
      x1: lower,
      x2: upper,
      top: result.top.evaluator,
      bottom: result.bottom.evaluator,
      color: "#0e7a5f",
      alpha: 0.16
    }];
    if (result.mode === "volume-x") {
      functions.push(
        { expr: `-(${result.top.norm})`, color: "#6eae9b", visible: true, label: "−f(x)", dashed: true },
        { expr: `-(${result.bottom.norm})`, color: "#e5a398", visible: true, label: "−g(x)", dashed: true }
      );
      regions.push({
        x1: lower,
        x2: upper,
        top: (x) => { const value = result.bottom.evaluator(x); return value === null ? null : -value; },
        bottom: (x) => { const value = result.top.evaluator(x); return value === null ? null : -value; },
        color: "#6eae9b",
        alpha: 0.1,
        showBounds: false
      });
    }
    appsPlotter.setOptions({ showGrid: true, showPoints: false, showDerivative: false });
    appsPlotter.setView({ xMin: lower - pad, xMax: upper + pad, autoY: true });
    appsPlotter.setFunctions(functions);
    appsPlotter.setRegions(regions);
    appsPlotter.clearTrace();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => appsPlotter.resize());
    });
  }

  function drawPolarVisual(result) {
    if (!result || !result.polar) return;
    const canvas = dom.polarCanvas;
    const shell = canvas.parentElement;
    const width = shell.clientWidth;
    const height = shell.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const styles = getComputedStyle(document.documentElement);
    const surface = styles.getPropertyValue("--surface-soft").trim() || "#f8faf7";
    const line = styles.getPropertyValue("--line").trim() || "#dfe8e1";
    const axis = styles.getPropertyValue("--canvas-axis").trim() || "#8fa49a";
    const accent = styles.getPropertyValue("--accent").trim() || "#0e7a5f";
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const lower = result.bounds.lower.numeric;
    const upper = result.bounds.upper.numeric;
    const samples = 700;
    const points = [];
    let maxRadius = 0;
    for (let i = 0; i <= samples; i += 1) {
      const theta = lower + (i / samples) * (upper - lower);
      const r = result.polar.evaluator(theta);
      if (r === null || !Number.isFinite(r)) continue;
      const radius = Math.abs(r);
      maxRadius = Math.max(maxRadius, radius);
      points.push({ theta, r, x: r * Math.cos(theta), y: r * Math.sin(theta) });
    }
    if (!points.length || maxRadius < 1e-9) {
      ctx.fillStyle = axis;
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("极径在该区间内没有有效取值", cx, cy);
      return;
    }
    const scale = (Math.min(width, height) * 0.4) / maxRadius;
    const map = (x, y) => ({ x: cx + x * scale, y: cy - y * scale });

    // Concentric grid.
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, (Math.min(width, height) * 0.4) * (i / 4), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Spokes.
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * Math.min(width, height) * 0.43, cy - Math.sin(angle) * Math.min(width, height) * 0.43);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Shaded sector.
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (const point of points) {
      const mapped = map(point.x, point.y);
      ctx.lineTo(mapped.x, mapped.y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(14, 122, 95, 0.16)";
    ctx.fill();

    // Boundary rays.
    const startAngle = lower;
    const endAngle = upper;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const startRadius = Math.min(width, height) * 0.45;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(startAngle) * startRadius, cy - Math.sin(startAngle) * startRadius);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(endAngle) * startRadius, cy - Math.sin(endAngle) * startRadius);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Polar curve.
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let started = false;
    for (const point of points) {
      const mapped = map(point.x, point.y);
      if (!started) {
        ctx.moveTo(mapped.x, mapped.y);
        started = true;
      } else {
        ctx.lineTo(mapped.x, mapped.y);
      }
    }
    ctx.stroke();

    // Axes labels.
    ctx.fillStyle = axis;
    ctx.font = '10px "Cascadia Code", Consolas, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("θ=0", width - 31, cy - 13);
    ctx.fillText("π/2", cx + 8, 17);
    ctx.fillText("π", 19, cy - 13);
    ctx.fillText("3π/2", cx + 10, height - 17);
  }

  function renderAppSteps(result) {
    const config = result.config;
    const isPolar = result.mode === "polar";
    const lowerTex = result.bounds.lower.tex;
    const upperTex = result.bounds.upper.tex;
    const modelTex = isPolar
      ? `A=\\frac{1}{2}\\int_{${lowerTex}}^{${upperTex}}r(\\theta)^2\\,d\\theta`
      : result.mode === "area"
        ? `A=\\int_{${lowerTex}}^{${upperTex}}\\left|f(x)-g(x)\\right|\\,dx`
        : result.mode === "volume-x"
          ? `V=\\pi\\int_{${lowerTex}}^{${upperTex}}\\left|f(x)^2-g(x)^2\\right|\\,dx`
          : `V=2\\pi\\int_{${lowerTex}}^{${upperTex}}x\\left|f(x)-g(x)\\right|\\,dx`;
    const funcsTex = isPolar
      ? `r(\\theta)=${result.polar.tex}`
      : `f(x)=${result.top.tex},\\qquad g(x)=${result.bottom.tex}`;
    const steps = [
      {
        title: "建立积分模型",
        tag: "MODEL",
        note: isPolar ? "把极坐标区域切成许多小扇形，累加面积。" : "把几何量表示成定积分：面积用曲线差，体积用截面面积或柱壳周长。",
        tex: modelTex
      },
      {
        title: "代入函数与区间",
        tag: "SUBSTITUTE",
        note: isPolar ? `极角从 ${result.bounds.lower.raw} 到 ${result.bounds.upper.raw}。` : `函数与上下限代入后，被积函数只含 x。`,
        tex: isPolar
          ? `${funcsTex}\\qquad \\theta_1=${lowerTex},\\quad \\theta_2=${upperTex}`
          : `${funcsTex}\\qquad a=${lowerTex},\\quad b=${upperTex}`
      },
      {
        title: "执行数值积分",
        tag: "NUMERICAL",
        note: `使用${result.methodLabel}；${result.converged ? "数值结果收敛。" : "数值结果未完全收敛，请留意区间内的奇点。"}`,
        tex: `${config.symbol}\\approx ${formatValue(result.value, 10)}`
      },
      {
        title: "结果解读",
        tag: "INTERPRET",
        note: result.exactInfo ? `识别到精确形式 ${result.exactInfo.plain}；几何量的单位为 ${config.unit}。` : `几何量的单位为 ${config.unit}；结果由高精度数值积分给出。`,
        tex: result.exactInfo ? `${config.symbol}=${result.exactInfo.tex}` : `${config.symbol}\\approx ${formatValue(result.value, 10)}`
      }
    ];
    if (result.mode === "volume-y") {
      steps[3].note += " 柱壳法要求区域在 y 轴右侧。";
    }
    dom.appStepsList.textContent = "";
    steps.forEach((step, index) => {
      const li = document.createElement("li");
      li.className = "step-item";
      const num = document.createElement("div");
      num.className = "step-index";
      num.textContent = String(index + 1).padStart(2, "0");
      const body = document.createElement("div");
      body.className = "step-body";
      const heading = document.createElement("div");
      heading.className = "step-heading";
      const title = document.createElement("h3");
      title.textContent = step.title;
      const tag = document.createElement("span");
      tag.className = "step-tag";
      tag.textContent = step.tag;
      heading.append(title, tag);
      const note = document.createElement("p");
      note.className = "step-note";
      note.textContent = step.note;
      const math = document.createElement("div");
      math.className = "step-math";
      renderMath(math, step.tex, true);
      body.append(heading, note, math);
      li.append(num, body);
      dom.appStepsList.appendChild(li);
    });
    dom.appStepsSummary.textContent = `${steps.length} 步 · 定积分应用`;
  }

  function sendAppToIntegral() {
    if (!currentAppResult) return;
    const result = currentAppResult;
    switchView("integral", { updateHash: false });
    setIntegralType("definite", { silent: true });
    dom.integrandInput.value = result.integralExpression;
    dom.lowerBoundInput.value = result.bounds.lower.raw;
    dom.upperBoundInput.value = result.bounds.upper.raw;
    state.integral = {
      type: "definite",
      integrand: result.integralExpression,
      lower: result.bounds.lower.raw,
      upper: result.bounds.upper.raw
    };
    saveIntegralDraft();
    renderIntegralPreview();
    calculateIntegral({ auto: true });
    toast("已把几何模型对应的定积分填入积分模块");
  }



  function initModals() {
    dom.formulaBtn.addEventListener("click", () => openModal(dom.formulaModal));
    dom.helpBtn.addEventListener("click", () => openModal(dom.helpModal));
    $$("[data-close-modal]").forEach((element) => {
      element.addEventListener("click", closeModal);
    });
    $$("[data-tex]").forEach((element) => {
      renderMath(element, element.dataset.tex, false);
    });
    $$("[data-formula]").forEach((button) => {
      button.addEventListener("click", () => {
        const formula = button.dataset.formula;
        if (!formula) return;
        closeModal();
        switchView("integral", { updateHash: false });
        setIntegralType("indefinite", { silent: true });
        applyIntegrandTemplate(formula);
        toast("已填入公式示例，可直接计算");
      });
    });
  }

  function renderFormulaBook() {
    $$("[data-tex]").forEach((element) => {
      if (!element.querySelector(".katex")) renderMath(element, element.dataset.tex, false);
    });
  }

  function openModal(modal) {
    if (!modal) return;
    if (activeModal) closeModal();
    activeModal = modal;
    lastFocused = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-modal-open");
    const focusable = modal.querySelector("button, [href], input, select, textarea");
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 30);
  }

  function closeModal() {
    if (!activeModal) return;
    activeModal.classList.remove("is-open");
    activeModal.setAttribute("aria-hidden", "true");
    activeModal = null;
    document.body.classList.remove("is-modal-open");
    if (lastFocused && lastFocused.focus) {
      lastFocused.focus({ preventScroll: true });
      lastFocused = null;
    }
  }

  /* ---------------------------------------------------------
     Global events
     --------------------------------------------------------- */

  function initGlobalEvents() {
    dom.navItems.forEach((item) => {
      item.addEventListener("click", () => switchView(item.dataset.view));
    });
    dom.brandLink.addEventListener("click", (event) => {
      event.preventDefault();
      switchView("plot");
    });
    dom.themeBtn.addEventListener("click", toggleTheme);

    $$(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (activeModal) closeModal();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        if (state.view === "integral") {
          event.preventDefault();
          calculateIntegral();
        } else if (state.view === "apps") {
          event.preventDefault();
          calculateApplication();
        }
        return;
      }
      if (event.altKey && ["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        switchView(event.key === "1" ? "plot" : event.key === "2" ? "integral" : "apps");
        return;
      }
      if (event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        toggleTheme();
      }
    });

    window.addEventListener("hashchange", () => {
      const view = normalizeViewName(location.hash.replace(/^#\/?/, ""));
      switchView(view, { updateHash: false });
    });

    window.addEventListener("beforeunload", () => {
      state.integral.integrand = dom.integrandInput.value;
      state.integral.lower = dom.lowerBoundInput.value;
      state.integral.upper = dom.upperBoundInput.value;
      saveIntegralDraft();
      savePlotState();
      if (dom.appTopInput) saveAppInputValues();
    });
  }
})();

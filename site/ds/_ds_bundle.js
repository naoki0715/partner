/* @ds-bundle: {"format":4,"namespace":"CAREECONDesignSystem_c32b90","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ImagePlaceholder","sourcePath":"components/core/ImagePlaceholder.jsx"},{"name":"ComparisonTable","sourcePath":"components/data/ComparisonTable.jsx"},{"name":"AccordionItem","sourcePath":"components/feedback/AccordionItem.jsx"},{"name":"FormField","sourcePath":"components/forms/FormField.jsx"},{"name":"FormPanel","sourcePath":"components/forms/FormPanel.jsx"},{"name":"CTABanner","sourcePath":"components/layout/CTABanner.jsx"},{"name":"SectionArrowLabel","sourcePath":"components/layout/SectionArrowLabel.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"7553b2f0807e","components/core/Button.jsx":"88dac9966fda","components/core/Icon.jsx":"25915a0969df","components/core/ImagePlaceholder.jsx":"36673856afb1","components/data/ComparisonTable.jsx":"561fd5c3a749","components/feedback/AccordionItem.jsx":"f29398039b1b","components/forms/FormField.jsx":"cd619d266e31","components/forms/FormPanel.jsx":"d55b6f95c919","components/layout/CTABanner.jsx":"95938fc20efa","components/layout/SectionArrowLabel.jsx":"4cac5016f6db"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CAREECONDesignSystem_c32b90 = window.CAREECONDesignSystem_c32b90 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function Badge({
  variant = 'eyebrow',
  children,
  tone
}) {
  if (variant === 'eyebrow') {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 18px',
        border: '1.5px solid var(--color-green-500)',
        borderRadius: 40,
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--color-green-500)',
        background: '#fff',
        fontFamily: 'var(--font-body)'
      }
    }, children);
  }
  if (variant === 'required') {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'var(--color-red-600)',
        padding: '2px 6px',
        borderRadius: 3,
        fontFamily: 'var(--font-body)'
      }
    }, children);
  }
  if (variant === 'before' || variant === 'after') {
    const isAfter = variant === 'after';
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 16px',
        borderRadius: 4,
        fontFamily: 'var(--font-body)',
        background: isAfter ? 'var(--color-green-500)' : '#ccc',
        color: isAfter ? '#fff' : '#6d6d6d'
      }
    }, children);
  }
  const tones = {
    blue: {
      bg: 'var(--color-cat-blue-bg)',
      fg: 'var(--color-cat-blue-fg)'
    },
    green: {
      bg: 'var(--color-cat-green-bg)',
      fg: 'var(--color-cat-green-fg)'
    },
    orange: {
      bg: 'var(--color-cat-orange-bg)',
      fg: 'var(--color-cat-orange-fg)'
    }
  };
  const t = tones[tone] || tones.blue;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 16px',
      borderRadius: 8,
      background: t.bg,
      color: t.fg,
      fontWeight: 700,
      fontSize: 15,
      fontFamily: 'var(--font-body)'
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function Button({
  variant = 'primary',
  subLabel,
  label,
  icon,
  href,
  onClick,
  style
}) {
  const base = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '14px 28px',
    borderRadius: 8,
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
    border: '1px solid transparent',
    ...style
  };
  const variants = {
    primary: {
      background: 'var(--color-yellow-500)',
      color: 'var(--color-navy)',
      borderColor: '#fff'
    },
    outline: {
      background: '#fff',
      color: 'var(--color-blue-500)',
      borderColor: 'var(--color-blue-500)'
    },
    'outline-on-blue': {
      background: 'var(--color-blue-600)',
      color: '#fff',
      borderColor: 'var(--color-blue-600)'
    }
  };
  const Tag = href ? 'a' : 'button';
  return /*#__PURE__*/React.createElement(Tag, {
    href: href,
    onClick: onClick,
    style: {
      ...base,
      ...variants[variant]
    }
  }, subLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12
    }
  }, subLabel), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 16
    }
  }, icon, label));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
/** @type {Record<string,string>} */
const PATHS = {
  document: 'M12.4567 0H5.35373L1.37976 3.97372V13.9958H12.4567L12.4567 0ZM11.538 13.0768H2.2987V4.50997H5.88998V0.918688H11.538V13.0768ZM9.6135 6.50787H4.22278V7.21575H9.6135V6.50787ZM9.6135 8.44098H4.22278V9.14885H9.6135V8.44098ZM9.6135 10.3741H4.22278V11.0819H9.6135V10.3741ZM9.61349 2.99072H7.25171V5.25554H9.61349V2.99072ZM12.8922 2.00418V2.92287H13.7016V15.0811H4.46224V14.4312H3.54333V16H14.6202V2.00418H12.8922Z'
};
function Icon({
  name = 'document',
  size = 16,
  color = 'var(--color-navy)'
}) {
  if (name === 'yen') {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: size,
        fontWeight: 700,
        color,
        lineHeight: 1,
        display: 'inline-block'
      }
    }, "\xA5");
  }
  const d = PATHS[name] || PATHS.document;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: d,
    fill: color,
    fillRule: "evenodd"
  }));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/ImagePlaceholder.jsx
try { (() => {
function ImagePlaceholder({
  label = 'image',
  height = 160,
  aspect,
  tone = 'blue'
}) {
  const tones = {
    blue: '#e8eeff',
    gray: '#eee'
  };
  const stripe = tones[tone] || tones.blue;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: aspect ? undefined : height,
      aspectRatio: aspect,
      borderRadius: 8,
      background: `repeating-linear-gradient(135deg, ${stripe} 0 10px, #fff 10px 20px)`,
      border: '1px solid #dfe1e8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      color: 'var(--color-gray-600)',
      fontFamily: 'monospace',
      fontSize: 12,
      textAlign: 'center',
      padding: 8
    }
  }, label);
}
Object.assign(__ds_scope, { ImagePlaceholder });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ImagePlaceholder.jsx", error: String((e && e.message) || e) }); }

// components/data/ComparisonTable.jsx
try { (() => {
const MARKS = {
  good: '◎',
  ok: '○',
  mid: '△',
  bad: '×'
};
const MARK_COLOR = {
  good: 'var(--color-blue-600)',
  ok: '#999',
  mid: 'var(--color-yellow-500)',
  bad: '#ccc'
};
function Mark({
  value,
  strong
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: strong ? 28 : 20,
      fontWeight: 700,
      color: MARK_COLOR[value] || '#999'
    }
  }, MARKS[value] || '—');
}
function ComparisonTable({
  productName = 'CAREECON+',
  rows = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: 1000,
      minWidth: 1000,
      borderCollapse: 'collapse',
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 2px 16px rgba(0,19,80,.06)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    colSpan: 2,
    style: {
      background: 'var(--color-blue-tint-200)',
      padding: '18px 20px'
    }
  }), /*#__PURE__*/React.createElement("th", {
    style: {
      background: 'var(--color-blue-600)',
      color: '#fff',
      padding: '18px 20px',
      fontWeight: 700,
      fontSize: 15
    }
  }, productName), /*#__PURE__*/React.createElement("th", {
    style: {
      background: '#f3f3f5',
      color: 'var(--color-navy)',
      padding: '18px 20px',
      fontWeight: 700,
      fontSize: 15
    }
  }, "Excel"), /*#__PURE__*/React.createElement("th", {
    style: {
      background: '#f3f3f5',
      color: 'var(--color-navy)',
      padding: '18px 20px',
      fontWeight: 700,
      fontSize: 15
    }
  }, "\u4ED6\u793E\u30C4\u30FC\u30EB"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((row, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, row.categoryLabel && /*#__PURE__*/React.createElement("td", {
    rowSpan: row.categorySpan || 1,
    style: {
      width: 130,
      textAlign: 'center',
      fontWeight: 700,
      background: row.categoryBg,
      color: row.categoryFg,
      border: '1px solid var(--color-blue-border-soft)',
      padding: '16px 8px'
    }
  }, row.categoryLabel), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '16px 10px',
      fontSize: 16,
      color: 'var(--color-navy)',
      borderBottom: '1px solid var(--color-blue-border)',
      borderRight: '1px solid var(--color-blue-tint-300)',
      lineHeight: 1.7
    }
  }, row.label), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'center',
      background: 'var(--color-blue-tint-500)',
      boxShadow: 'inset 4px 0 0 var(--color-blue-600), inset -4px 0 0 var(--color-blue-600)'
    }
  }, /*#__PURE__*/React.createElement(Mark, {
    value: row.us,
    strong: true
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'center',
      background: '#fbfbfb',
      borderRight: '1px solid var(--color-blue-tint-300)'
    }
  }, /*#__PURE__*/React.createElement(Mark, {
    value: row.excel
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'center',
      background: '#fbfbfb'
    }
  }, /*#__PURE__*/React.createElement(Mark, {
    value: row.other
  })))))));
}
Object.assign(__ds_scope, { ComparisonTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ComparisonTable.jsx", error: String((e && e.message) || e) }); }

// components/feedback/AccordionItem.jsx
try { (() => {
const {
  useState
} = React;
function AccordionItem({
  question,
  answer,
  defaultOpen = false
}) {
  const [open, setOpen] = useState(defaultOpen);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 8,
      overflow: 'hidden',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 25px',
      height: 76,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--color-blue-500)',
      fontFamily: 'var(--font-display-num)'
    }
  }, "Q."), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: '#212121'
    }
  }, question)), /*#__PURE__*/React.createElement("span", {
    style: {
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform .2s',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 6l4 4 4-4",
    stroke: "#001350",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })))), open && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      padding: '0 25px 24px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--color-red-500)',
      fontFamily: 'var(--font-display-num)'
    }
  }, "A."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      fontWeight: 500,
      color: '#212121',
      lineHeight: 1.6,
      margin: 0
    }
  }, answer)));
}
Object.assign(__ds_scope, { AccordionItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/AccordionItem.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormField.jsx
try { (() => {
function FormField({
  label,
  required = true,
  type = 'text',
  placeholder,
  name
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      fontWeight: 700,
      color: '#fff'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#fff',
      background: 'var(--color-red-600)',
      padding: '2px 6px',
      borderRadius: 3
    }
  }, "\u5FC5\u9808")), /*#__PURE__*/React.createElement("input", {
    type: type,
    name: name,
    placeholder: placeholder,
    style: {
      width: '100%',
      padding: '12px 14px',
      background: '#fff',
      border: 'none',
      borderRadius: 6,
      fontSize: 14,
      color: 'var(--color-navy)',
      boxSizing: 'border-box'
    }
  }));
}
Object.assign(__ds_scope, { FormField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormField.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormPanel.jsx
try { (() => {
function FormPanel({
  eyebrow = '＼ 30秒で完了 ／',
  title = '無料で資料をダウンロード',
  desc,
  children,
  submitSub = '＼ 機能詳細はこちら ／',
  submitLabel = '資料請求する',
  onSubmit
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(90deg, #0137dd 0%, #0481cd 100%)',
      border: '10px solid var(--color-yellow-400)',
      borderRadius: 20,
      padding: '32px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      boxShadow: '0 20px 48px rgba(0,19,80,.18)',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: 'var(--color-yellow-500)',
      margin: 0
    }
  }, eyebrow), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 22,
      fontWeight: 900,
      color: '#fff',
      margin: 0,
      lineHeight: 1.3
    }
  }, title), desc && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'rgba(255,255,255,.85)',
      margin: 0
    }
  }, desc)), /*#__PURE__*/React.createElement("form", {
    onSubmit: onSubmit,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, children, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    style: {
      width: '100%',
      padding: '16px 20px',
      background: 'var(--color-yellow-500)',
      border: 'none',
      borderRadius: 10,
      color: 'var(--color-navy)',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      boxShadow: '0 4px 20px rgba(0,61,217,.25)',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, submitSub), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 18,
      fontWeight: 900
    }
  }, "\u8CC7\u6599\u8ACB\u6C42\u3059\u308B"))));
}
Object.assign(__ds_scope, { FormPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormPanel.jsx", error: String((e && e.message) || e) }); }

// components/layout/CTABanner.jsx
try { (() => {
function CTABanner({
  title = 'CAREECON+を詳しく知る',
  desc = '資料請求または見積依頼をお選びください',
  cards = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(to right, #2c5dff, #008cd2)',
      borderRadius: 24,
      padding: '60px 40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 40,
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#fff',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      margin: 0
    }
  }, desc)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 36,
      width: '100%',
      maxWidth: 900
    }
  }, cards.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      background: '#fff',
      borderRadius: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      padding: 20
    }
  }, c.image, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: 'var(--color-navy)'
    }
  }, c.subLabel), c.button))));
}
Object.assign(__ds_scope, { CTABanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/CTABanner.jsx", error: String((e && e.message) || e) }); }

// components/layout/SectionArrowLabel.jsx
try { (() => {
function SectionArrowLabel({
  children,
  color = 'var(--color-blue-600)'
}) {
  const arrow = flip => /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      transform: flip ? 'scaleX(-1)' : undefined
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 0,
      height: 0,
      borderLeft: '7px solid transparent',
      borderRight: '7px solid transparent',
      borderTop: '10px solid var(--color-yellow-500)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 0,
      height: 0,
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderTop: '7px solid var(--color-blue-500)'
    }
  }));
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 16,
      color,
      fontFamily: 'var(--font-body)',
      fontWeight: 700
    }
  }, arrow(false), children, arrow(true));
}
Object.assign(__ds_scope, { SectionArrowLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/SectionArrowLabel.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ImagePlaceholder = __ds_scope.ImagePlaceholder;

__ds_ns.ComparisonTable = __ds_scope.ComparisonTable;

__ds_ns.AccordionItem = __ds_scope.AccordionItem;

__ds_ns.FormField = __ds_scope.FormField;

__ds_ns.FormPanel = __ds_scope.FormPanel;

__ds_ns.CTABanner = __ds_scope.CTABanner;

__ds_ns.SectionArrowLabel = __ds_scope.SectionArrowLabel;

})();

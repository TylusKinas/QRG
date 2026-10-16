/* Minifier: shrinks game source before compression without changing what it does.
 *
 * It is a one-pass scanner that understands strings, template literals, regular expressions and comments:
 *   - comments are dropped;
 *   - indentation and spaces around punctuation are removed (a space stays only where two words or two
 *     identical signs would otherwise fuse: `let a`, `a + +b`, `a - -b`);
 *   - line breaks are kept (automatic semicolon insertion depends on them), except where a break can
 *     never matter: after `;` `{` `,` `(` `[` and before `}` `]`.
 * Names are never renamed, so the result is always the same program. min(min(x)) === min(x).
 */
function min(src) {
  const n = src.length;
  let out = '', i = 0, pend = '';                       // pend: pending whitespace: '' | ' ' | '\n'
  const word = c => c !== undefined && /[\w$]/.test(c);
  const KW = /(?:^|[^\w$.])(?:return|typeof|case|in|of|void|delete|throw|else|do|new|yield|await)$/;

  const flush = next => {                               // decide what the pending whitespace becomes
    if (pend && out) {
      const a = out[out.length - 1];
      if (pend === '\n') {
        if (a !== '\n' && !';{,(['.includes(a) && !'}]'.includes(next)) out += '\n';
      } else if (a !== '\n') {
        if ((word(a) && word(next)) || (a === '+' && next === '+') || (a === '-' && next === '-') || (a === '/' && (next === '/' || next === '*'))) out += ' ';
      }
    }
    pend = '';
  };
  const regexOk = () => {                               // may a '/' here start a regular expression?
    const a = out[out.length - 1];
    if ((a === '+' || a === '-') && out[out.length - 2] === a && /[\w$)\]]/.test(out[out.length - 3] || '')) return false;   // `x++ / 2`
    if (a === undefined || '(,=:[!&|?{};+-*%<>~^\n'.includes(a)) return true;
    return word(a) && KW.test(out);
  };

  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; if (!pend) pend = ' '; continue; }
    if (c === '\n' || c === '\r') { if (c === '\n') pend = '\n'; i++; continue; }
    if (c === ' ' || c === '\t') { if (!pend) pend = ' '; i++; continue; }

    if (c === '"' || c === "'" || c === '`') {          // string or template literal: copied untouched
      flush(c);
      let j = i + 1, depth = 0;
      while (j < n) {
        const e = src[j];
        if (e === '\\') { j += 2; continue; }
        if (c === '`' && e === '$' && src[j + 1] === '{') { depth++; j += 2; continue; }
        if (c === '`' && depth && e === '}') { depth--; j++; continue; }
        if (e === c && !depth) break;
        j++;
      }
      out += src.slice(i, j + 1); i = j + 1;
      continue;
    }
    if (c === '/' && regexOk()) {                       // regular expression literal: copied untouched
      flush(c);
      let j = i + 1, cls = false;
      while (j < n && src[j] !== '\n') {
        const e = src[j];
        if (e === '\\') { j += 2; continue; }
        if (e === '[') cls = true; else if (e === ']') cls = false; else if (e === '/' && !cls) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/.test(src[j])) j++;
      out += src.slice(i, j); i = j;
      continue;
    }
    flush(c);
    out += c; i++;
  }
  return out.replace(/\n+$/, '');
}

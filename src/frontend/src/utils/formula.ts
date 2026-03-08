/**
 * Formula Engine
 *
 * Supports:
 * - Arithmetic: +, -, *, /, parentheses
 * - Cell references: A1, B5, C10
 * - Functions: SUM(A1:A5)
 * - Cycle detection via visiting set
 *
 * Design: Recursive descent parser
 * expr -> term (('+' | '-') term)*
 * term -> factor (('*' | '/') factor)*
 * factor -> number | cellRef | function | '(' expr ')' | '-' factor
 */

export type CellGetter = (key: string) => string;

export function colIndexToLetter(col: number): string {
  return String.fromCharCode(65 + col);
}

export function letterToColIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

export function cellKeyToAddress(row: number, col: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}

export function addressToCellKey(address: string): string | null {
  const match = address.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;
  const col = letterToColIndex(match[1]);
  const row = Number.parseInt(match[2], 10) - 1;
  if (col < 0 || col > 25 || row < 0 || row > 99) return null;
  return `${row},${col}`;
}

function parseRangeKeys(range: string): string[] {
  const match = range.match(/^([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/);
  if (!match) return [];
  const startCol = letterToColIndex(match[1]);
  const startRow = Number.parseInt(match[2], 10) - 1;
  const endCol = letterToColIndex(match[3]);
  const endRow = Number.parseInt(match[4], 10) - 1;
  const keys: string[] = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      keys.push(`${r},${c}`);
    }
  }
  return keys;
}

interface TokenNumber {
  type: "number";
  value: number;
}
interface TokenOp {
  type: "op";
  value: string;
}
interface TokenIdent {
  type: "ident";
  value: string;
}
interface TokenParen {
  type: "paren";
  value: string;
}
interface TokenColon {
  type: "colon";
}
interface TokenComma {
  type: "comma";
}

type Token =
  | TokenNumber
  | TokenOp
  | TokenIdent
  | TokenParen
  | TokenColon
  | TokenComma;

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let num = "";
      while (
        i < expr.length &&
        ((expr[i] >= "0" && expr[i] <= "9") || expr[i] === ".")
      ) {
        num += expr[i++];
      }
      tokens.push({ type: "number", value: Number(num) });
      continue;
    }
    if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")) {
      let ident = "";
      while (
        i < expr.length &&
        ((expr[i] >= "A" && expr[i] <= "Z") ||
          (expr[i] >= "a" && expr[i] <= "z") ||
          (expr[i] >= "0" && expr[i] <= "9"))
      ) {
        ident += expr[i++];
      }
      tokens.push({ type: "ident", value: ident });
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
      continue;
    }
    if (ch === ":") {
      tokens.push({ type: "colon" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma" });
      i++;
      continue;
    }
    i++;
  }
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos: number;
  private getCellValue: CellGetter;
  private visiting: Set<string>;
  private currentKey: string;

  constructor(
    tokens: Token[],
    getCellValue: CellGetter,
    visiting: Set<string>,
    currentKey: string,
  ) {
    this.tokens = tokens;
    this.pos = 0;
    this.getCellValue = getCellValue;
    this.visiting = visiting;
    this.currentKey = currentKey;
  }

  private peek(): Token | null {
    return this.tokens[this.pos] ?? null;
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  parse(): number {
    const val = this.parseExpr();
    return val;
  }

  private parseExpr(): number {
    let left = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t && t.type === "op" && (t.value === "+" || t.value === "-")) {
        this.consume();
        const right = this.parseTerm();
        if (t.value === "+") left = left + right;
        else left = left - right;
      } else {
        break;
      }
    }
    return left;
  }

  private parseTerm(): number {
    let left = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (t && t.type === "op" && (t.value === "*" || t.value === "/")) {
        this.consume();
        const right = this.parseFactor();
        if (t.value === "*") left = left * right;
        else left = right === 0 ? Number.NaN : left / right;
      } else {
        break;
      }
    }
    return left;
  }

  private parseFactor(): number {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end");

    // Unary minus
    if (t.type === "op" && t.value === "-") {
      this.consume();
      return -this.parseFactor();
    }

    // Parentheses
    if (t.type === "paren" && t.value === "(") {
      this.consume();
      const val = this.parseExpr();
      const close = this.peek();
      if (close && close.type === "paren" && close.value === ")") {
        this.consume();
      }
      return val;
    }

    // Number literal
    if (t.type === "number") {
      this.consume();
      return t.value;
    }

    // Identifier: function call or cell reference
    if (t.type === "ident") {
      this.consume();
      const ident = t.value.toUpperCase();

      // Check if next token is colon (range start) - e.g., A1:A5
      // This shouldn't happen at top level without a function, but handle it
      const next = this.peek();

      // Function call: SUM(...)
      if (next && next.type === "paren" && next.value === "(") {
        this.consume(); // consume "("
        return this.parseFunction(ident);
      }

      // Might be cell ref: e.g., A1
      const cellKey = addressToCellKey(ident);
      if (cellKey) {
        if (this.visiting.has(cellKey)) {
          throw new Error("#CYCLE!");
        }
        const raw = this.getCellValue(cellKey);
        return resolveToNumber(raw, this.getCellValue, this.visiting, cellKey);
      }

      // Unknown identifier
      throw new Error(`Unknown reference: ${ident}`);
    }

    throw new Error(`Unexpected token: ${JSON.stringify(t)}`);
  }

  private parseFunction(name: string): number {
    // Collect arguments (could be ranges or expressions)
    const args: number[] = [];

    while (true) {
      const t = this.peek();
      if (!t) break;
      if (t.type === "paren" && t.value === ")") {
        this.consume();
        break;
      }
      // Check for range: IDENT:IDENT
      if (t.type === "ident") {
        const identTok = this.consume() as TokenIdent;
        const next = this.peek();
        if (next && next.type === "colon") {
          // It's a range
          this.consume(); // consume ":"
          const endTok = this.peek();
          if (endTok && endTok.type === "ident") {
            this.consume();
            const range = `${identTok.value}:${(endTok as TokenIdent).value}`;
            const keys = parseRangeKeys(range);
            for (const key of keys) {
              if (this.visiting.has(key)) {
                throw new Error("#CYCLE!");
              }
              const raw = this.getCellValue(key);
              const num = resolveToNumber(
                raw,
                this.getCellValue,
                this.visiting,
                key,
              );
              if (!Number.isNaN(num)) args.push(num);
            }
          }
        } else {
          // Single cell reference
          const cellKey = addressToCellKey(identTok.value);
          if (cellKey) {
            if (this.visiting.has(cellKey)) {
              throw new Error("#CYCLE!");
            }
            const raw = this.getCellValue(cellKey);
            const num = resolveToNumber(
              raw,
              this.getCellValue,
              this.visiting,
              cellKey,
            );
            if (!Number.isNaN(num)) args.push(num);
          }
        }
      } else {
        // Expression argument
        args.push(this.parseExpr());
      }

      // Consume comma if present
      const comma = this.peek();
      if (comma && comma.type === "comma") {
        this.consume();
      }
    }

    switch (name) {
      case "SUM":
        return args.reduce((acc, v) => acc + v, 0);
      case "AVERAGE":
        return args.length > 0
          ? args.reduce((acc, v) => acc + v, 0) / args.length
          : 0;
      case "MAX":
        return args.length > 0 ? Math.max(...args) : 0;
      case "MIN":
        return args.length > 0 ? Math.min(...args) : 0;
      case "COUNT":
        return args.length;
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }
}

function resolveToNumber(
  raw: string,
  getCellValue: CellGetter,
  visiting: Set<string>,
  cellKey: string,
): number {
  if (!raw) return 0;
  if (raw.startsWith("=")) {
    const newVisiting = new Set(visiting);
    newVisiting.add(cellKey);
    const result = evaluateFormula(raw, getCellValue, newVisiting, cellKey);
    const num = Number(result);
    return Number.isNaN(num) ? 0 : num;
  }
  const num = Number(raw);
  return Number.isNaN(num) ? 0 : num;
}

export function evaluateFormula(
  raw: string,
  getCellValue: CellGetter,
  visiting: Set<string> = new Set(),
  currentKey = "",
): string {
  if (!raw.startsWith("=")) return raw;
  const expr = raw.slice(1).trim();
  try {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens, getCellValue, visiting, currentKey);
    const result = parser.parse();
    if (Number.isNaN(result)) return "#DIV/0!";
    if (!Number.isFinite(result)) return "#DIV/0!";
    // Format: avoid unnecessary decimals
    const rounded = Math.round(result * 1e10) / 1e10;
    return String(rounded);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "#CYCLE!") return "#CYCLE!";
      if (e.message.startsWith("#")) return e.message;
    }
    return "#ERROR!";
  }
}

export function getDisplayValue(
  formula: string,
  value: string,
  getCellValue: CellGetter,
  visiting: Set<string> = new Set(),
  currentKey = "",
): string {
  if (formula?.startsWith("=")) {
    return evaluateFormula(formula, getCellValue, visiting, currentKey);
  }
  return value;
}

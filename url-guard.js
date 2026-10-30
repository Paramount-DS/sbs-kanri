// =============================================
// 外部リンク（URL）ブロック機能 - url-guard.js
// Slack・社内URL等の貼り付けを防止する共通スクリプト
// 他のスクリプト（cs.js 等）と名前が衝突しないよう IIFE で包んでいる。
// 公開するのは window.UrlGuard / attachUrlGuard / hasUrlGuardError のみ。
// =============================================
(function () {
  const URL_CHARS = "[A-Za-z0-9\\-._~:/?#\\[\\]@!$&'()*+,;=%|]";
  const PATTERN_SRC =
    "<[A-Za-z][A-Za-z0-9+.\\-]*:\\/\\/[^<>\\n]*>" +                 // Slack形式 <url|表示名>
    "|<?(?:" +
      "(?:[A-Za-z][A-Za-z0-9+.\\-]*):\\/\\/" + URL_CHARS + "+" +   // scheme://...
      "|www\\." + URL_CHARS + "+" +                                  // www....
      "|(?<![@A-Za-z0-9.\\-])(?:[A-Za-z0-9-]+\\.)+(?:com|net|org|jp|io|co|app|dev|me|info|biz|ly|gl|link|page|site|ai|us|tv)(?:[/?#]" + URL_CHARS + "*)?(?![A-Za-z0-9])" +
    ")>?";

  const MESSAGE = "外部リンク（URL）は入力できません。リンクではなく内容を文章で記入してください。";

  // lastIndex の状態を持ち越さないよう、毎回新しい RegExp を作る
  function newRegex() { return new RegExp(PATTERN_SRC, "gi"); }

  function contains(text) {
    return newRegex().test(String(text == null ? "" : text));
  }

  // URL部分を取り除き、空になった括弧や余分な空白を整える
  function strip(text) {
    const original = String(text == null ? "" : text);
    if (!contains(original)) return original;
    return original
      .replace(newRegex(), "")
      .replace(/[（(「【\[<]\s*[）)」】\]>]/g, "")
      .replace(/[ \t　]{2,}/g, " ")
      .split("\n").map(line => line.trim()).join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // 通常のオブジェクト（{...}）だけを対象にする。
  // Timestamp等のクラスのインスタンスは除外。別の実行環境で作られたオブジェクトも通常扱いにする。
  function isPlainObject(v) {
    if (v === null || typeof v !== "object") return false;
    const proto = Object.getPrototypeOf(v);
    if (proto === null || proto === Object.prototype) return true;
    return !!(proto.constructor && proto.constructor.name === "Object" && Object.getPrototypeOf(proto) === null);
  }

  // オブジェクト／配列を再帰的にたどり、URLを含む文字列の位置を集める
  // 戻り値: [{ path: ["visits", 2, "freeText"], text: "..." }, ...]
  function scan(value, path, out) {
    path = path || [];
    out = out || [];
    if (typeof value === "string") {
      if (contains(value)) out.push({ path: path.slice(), text: value });
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => scan(v, path.concat(i), out));
    } else if (isPlainObject(value)) {
      Object.keys(value).forEach(k => scan(value[k], path.concat(k), out));
    }
    return out;
  }

  function getAtPath(obj, path) {
    return path.reduce((cur, key) => (cur == null ? undefined : cur[key]), obj);
  }

  function setAtPath(obj, path, val) {
    const parent = getAtPath(obj, path.slice(0, -1));
    if (parent != null) parent[path[path.length - 1]] = val;
  }

  // "visits[2].freeText" 形式の表示用ラベル
  function pathLabel(path) {
    return path.reduce((s, k) => (typeof k === "number" ? s + "[" + k + "]" : (s ? s + "." + k : String(k))), "");
  }

  window.UrlGuard = { contains, strip, scan, getAtPath, setAtPath, pathLabel, newRegex, MESSAGE };

  // ---- 入力欄へのリアルタイム警告 ----
  window.attachUrlGuard = function (el) {
    if (!el || el.dataset.urlGuard) return;
    el.dataset.urlGuard = "1";
    const note = document.createElement("div");
    note.className = "url-guard-note";
    note.textContent = MESSAGE;
    note.hidden = true;
    el.insertAdjacentElement("afterend", note);
    const check = () => {
      const bad = contains(el.value);
      el.classList.toggle("has-external-link", bad);
      note.hidden = !bad;
    };
    el.addEventListener("input", check);
    el.addEventListener("paste", () => setTimeout(check, 0));
    check();
  };

  // ---- 保存前チェック（true ならURLあり＝保存をブロック）----
  window.hasUrlGuardError = function (fieldIds) {
    for (const id of fieldIds) {
      const el = document.getElementById(id);
      if (el && contains(el.value)) { el.focus(); return true; }
    }
    return false;
  };
})();

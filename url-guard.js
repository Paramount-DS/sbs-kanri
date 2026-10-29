// =============================================
// 外部リンク（URL）ブロック機能 - url-guard.js
// 全ページ共通で読み込む
// Slack・社内URL等の貼り付けを防止する
// =============================================

const URL_CHARS = "[A-Za-z0-9\\-._~:/?#\\[\\]@!$&'()*+,;=%|]";
const EXTERNAL_LINK_PATTERN = new RegExp(
  "<[A-Za-z][A-Za-z0-9+.\\-]*:\\/\\/[^<>\\n]*>" +               // Slack形式 <url|表示名>
  "|<?(?:" +
    "(?:[A-Za-z][A-Za-z0-9+.\\-]*):\\/\\/" + URL_CHARS + "+" + // scheme://...
    "|www\\." + URL_CHARS + "+" +                                // www....
    "|(?<![@A-Za-z0-9.\\-])(?:[A-Za-z0-9-]+\\.)+(?:com|net|org|jp|io|co|app|dev|me|info|biz|ly|gl|link|page|site|ai|us|tv)(?:[/?#]" + URL_CHARS + "*)?(?![A-Za-z0-9])" +
  ")>?",
  "gi"
);

const URL_GUARD_MESSAGE = "外部リンク（URL）は入力できません。リンクではなく内容を文章で記入してください。";

function containsExternalLink(text) {
  EXTERNAL_LINK_PATTERN.lastIndex = 0;
  const found = EXTERNAL_LINK_PATTERN.test(String(text || ""));
  EXTERNAL_LINK_PATTERN.lastIndex = 0;
  return found;
}

// テキストエリアとinputにリアルタイム警告を付ける
function attachUrlGuard(el) {
  if (!el || el.dataset.urlGuard) return;
  el.dataset.urlGuard = "1";

  const note = document.createElement("div");
  note.className = "url-guard-note";
  note.textContent = URL_GUARD_MESSAGE;
  note.hidden = true;
  el.insertAdjacentElement("afterend", note);

  const check = () => {
    const bad = containsExternalLink(el.value);
    el.classList.toggle("has-external-link", bad);
    note.hidden = !bad;
  };
  el.addEventListener("input", check);
  el.addEventListener("paste", () => setTimeout(check, 0));
  check();
}

// フォーム送信時にURL含有チェック（trueなら送信ブロック）
function hasUrlGuardError(fieldIds) {
  for (const id of fieldIds) {
    const el = document.getElementById(id);
    if (el && containsExternalLink(el.value)) {
      el.focus();
      return true;
    }
  }
  return false;
}

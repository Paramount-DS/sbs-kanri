// =============================================
// パスワード認証 - auth.js
// 全ページ共通で読み込む認証スクリプト
// =============================================

const AUTH_SESSION_KEY = "sbs_auth_verified";
const AUTH_COLLECTION = "config";
const AUTH_DOC_ID = "appPassword";

// =============================================
// 認証チェック（ページ読み込み時に即実行）
// =============================================
(function () {
  // すでにこのセッションで認証済みならスキップ
  if (sessionStorage.getItem(AUTH_SESSION_KEY) === "true") {
    return;
  }

  // 本体コンテンツを隠す
  document.documentElement.style.visibility = "hidden";

  // DOM構築後にログイン画面を表示
  document.addEventListener("DOMContentLoaded", showAuthGate);
})();

function showAuthGate() {
  // すでに認証済みなら表示しない
  if (sessionStorage.getItem(AUTH_SESSION_KEY) === "true") {
    document.documentElement.style.visibility = "visible";
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "authGateOverlay";
  overlay.innerHTML = `
    <div class="auth-gate-box">
      <img src="logo.png" alt="Parasight" class="auth-gate-logo" />
      <p class="auth-gate-desc">パスワードを入力してください</p>
      <input type="password" id="authGateInput" class="auth-gate-input" placeholder="パスワード" autocomplete="off" />
      <div id="authGateError" class="auth-gate-error"></div>
      <button id="authGateBtn" class="auth-gate-btn">ログイン</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.documentElement.style.visibility = "visible";

  const input = document.getElementById("authGateInput");
  const btn   = document.getElementById("authGateBtn");
  const errEl = document.getElementById("authGateError");

  setTimeout(() => input.focus(), 100);

  async function attemptLogin() {
    const pw = input.value;
    if (!pw) { errEl.textContent = "パスワードを入力してください"; return; }
    btn.disabled = true;
    btn.textContent = "確認中...";
    errEl.textContent = "";

    try {
      const doc = await db.collection(AUTH_COLLECTION).doc(AUTH_DOC_ID).get();
      if (!doc.exists) {
        errEl.textContent = "パスワード設定が見つかりません（管理者に確認してください）";
        btn.disabled = false; btn.textContent = "ログイン";
        return;
      }
      const correctPw = doc.data().password;
      if (pw === correctPw) {
        sessionStorage.setItem(AUTH_SESSION_KEY, "true");
        overlay.remove();
      } else {
        errEl.textContent = "パスワードが正しくありません";
        input.value = "";
        input.focus();
        btn.disabled = false; btn.textContent = "ログイン";
      }
    } catch (err) {
      console.error(err);
      errEl.textContent = "認証中にエラーが発生しました";
      btn.disabled = false; btn.textContent = "ログイン";
    }
  }

  btn.addEventListener("click", attemptLogin);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") attemptLogin(); });
}

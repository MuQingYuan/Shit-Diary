/* =====================================================================
 * 50-ui.js — 全局 UI 工具
 * toast / openModal / closeModal。
 * ===================================================================== */

/* ================= 全局工具 ================= */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}
let modalCb = null;
function openModal(title, body, buttons) {
  const el = document.getElementById('modal');
  el.innerHTML = '<div class="modal-box">' +
    '<div class="modal-title">' + title + '</div>' +
    '<div class="modal-body">' + body + '</div>' +
    '<div class="modal-btns">' + buttons.map((b, i) =>
      '<button class="modal-btn ' + b.cls + '" data-i="' + i + '">' + b.text + '</button>').join('') +
    '</div></div>';
  el.classList.add('show');
  modalCb = (i) => {
    el.classList.remove('show');
    const b = buttons[i];
    if (b && b.onClick) b.onClick();
  };
  el.querySelectorAll('.modal-btn').forEach((btn) => btn.addEventListener('click', () => modalCb(+btn.dataset.i)));
}
function closeModal() { document.getElementById('modal').classList.remove('show'); }


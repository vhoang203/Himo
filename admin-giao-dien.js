/* Trang quản trị — chế độ sáng / tối do người dùng chọn bằng công tắc trên đầu trang (16/11/2026).
   Tệp này chạy trong <head>, TRƯỚC khi trang vẽ, để không nháy màu khi chế độ đã chọn khác chế độ của máy.
   Chưa chọn gì → không đặt gì, trang theo máy (prefers-color-scheme). Phần công tắc nằm trong admin.js. */
(function () {
  try {
    var c = window.localStorage.getItem('himo-admin-theme');
    if (c === 'light' || c === 'dark') document.documentElement.setAttribute('data-theme', c);
  } catch (e) { /* trình duyệt chặn bộ nhớ — theo máy */ }
})();

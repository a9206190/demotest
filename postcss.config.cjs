function appendCustomCSS() {
  return {
    postcssPlugin: 'append-custom-css',
    OnceExit(root) {
      root.append(`
/* === 自動追加固定亮色輸入樣式 === */
input, textarea, select {
  background-color: #e6e6e6 !important;
  color: #111 !important;
}
input:focus, textarea:focus, select:focus {
  background-color: #e6e6e6 !important;
  border-color: #999 !important;
  box-shadow: none !important;
  outline: none !important;
}
      `);
    },
  };
}
appendCustomCSS.postcss = true;

module.exports = {
  plugins: [appendCustomCSS()],
};

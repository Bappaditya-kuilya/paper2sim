import '@testing-library/jest-dom/vitest';

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {};
  HTMLDialogElement.prototype.close = function () {};
}

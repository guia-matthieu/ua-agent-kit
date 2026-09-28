/* An external validator loaded from its own file. It rejects a non-ASCII local part on input and on submit.
   After a reload by the runner it must be there again, or the page is scored without it (review of #21). */
(function () {
  const input = document.getElementById('email'), err = document.getElementById('err'), form = document.getElementById('f');
  const check = () => {
    const bad = input.value !== '' && !/^[!-~]+@/.test(input.value);
    err.hidden = !bad;
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return !bad;
  };
  input.addEventListener('input', check);
  form.addEventListener('submit', e => { if (!check()) e.preventDefault(); });
})();

const btn = document.getElementById('toggleBtn');
const status = document.getElementById('status');

chrome.storage.local.get('inspectorActive', ({ inspectorActive }) => {
  if (inspectorActive) {
    btn.textContent = 'Deactivate Inspector';
    btn.classList.add('active');
  }
});

btn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'TOGGLE_INSPECTOR' }, (res) => {
    if (!res || res.reason === 'not_localhost') {
      status.textContent = 'Only works on localhost URLs';
      status.classList.add('error');
      return;
    }
    const nowActive = !btn.classList.contains('active');
    btn.classList.toggle('active');
    btn.textContent = nowActive ? 'Deactivate Inspector' : 'Activate Inspector';
    status.textContent = nowActive ? 'Inspector active on this tab' : '';
    chrome.storage.local.set({ inspectorActive: nowActive });
    window.close();
  });
});

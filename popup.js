document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['savedProxies'], (result) => {
    if (result.savedProxies) {
      document.getElementById('proxyList').value = result.savedProxies;
    }
  });

  chrome.proxy.settings.get({ incognito: false }, (details) => {
    const statusText = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    const pingText = document.getElementById('ping-text');

    if (details.value.mode === "fixed_servers") {
      const host = details.value.rules.singleProxy.host;
      const port = details.value.rules.singleProxy.port;
      
      statusText.innerText = `Подключено: ${host}:${port}`;
      dot.classList.add('active');
      
      measurePing();
    } else {
      statusText.innerText = "Отключено";
      dot.classList.remove('active');
      pingText.innerText = "—";
    }
  });
});

document.getElementById('setProxy').addEventListener('click', async () => {
  const text = document.getElementById('proxyList').value.trim();
  const btn = document.getElementById('setProxy');
  const pingText = document.getElementById('ping-text');
  const statusText = document.getElementById('status-text');
  const dot = document.getElementById('status-dot');

  chrome.storage.local.set({ savedProxies: text });
  const proxies = text.split('\n').map(p => p.trim()).filter(line => line.includes(':'));

  if (!proxies.length) return alert("Введите IP:PORT");

  const [host, port] = proxies[Math.floor(Math.random() * proxies.length)].split(':');

  btn.classList.add('loading');
  statusText.innerText = `Подключаем...`;
  dot.classList.remove('active');

  const config = {
    mode: "fixed_servers",
    rules: { 
      singleProxy: { 
        scheme: "socks5", 
        host: host, 
        port: parseInt(port) 
      } 
    }
  };

  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    statusText.innerText = `Подключено: ${host}:${port}`;
    dot.classList.add('active');
    setTimeout(() => {
      measurePing().finally(() => btn.classList.remove('loading'));
    }, 500);
  });
});

async function measurePing() {
  const pingText = document.getElementById('ping-text');
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4000);

    await fetch('https://www.google.com/generate_204', { 
      mode: 'no-cors', cache: 'no-store', signal: controller.signal 
    });

    clearTimeout(tid);
    const ms = Date.now() - start;
    pingText.innerText = `${ms} ms`;
    pingText.style.color = ms < 400 ? 'var(--success)' : 'var(--warning)';
  } catch (e) {
    pingText.innerText = "Ошибка сети";
    pingText.style.color = 'var(--danger)';
  }
}

document.getElementById('clearProxy').addEventListener('click', () => {
  chrome.proxy.settings.clear({ scope: 'regular' }, () => {
    document.getElementById('status-text').innerText = "Отключено";
    document.getElementById('ping-text').innerText = "—";
    document.getElementById('status-dot').classList.remove('active');
  });
});
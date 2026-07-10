// ---- custom hacker cursor ----
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');

window.addEventListener('mousemove', (e) => {
  cursorDot.style.left = e.clientX + 'px';
  cursorDot.style.top = e.clientY + 'px';
  cursorRing.style.left = e.clientX + 'px';
  cursorRing.style.top = e.clientY + 'px';

  document.getElementById('coordX').textContent = String(e.clientX).padStart(3, '0');
  document.getElementById('coordY').textContent = String(e.clientY).padStart(3, '0');
});

document.querySelectorAll('button, textarea, .layer-item').forEach(el => {
  el.addEventListener('mouseenter', () => cursorRing.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursorRing.classList.remove('hover'));
});

// ---- clock ----
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toTimeString().split(' ')[0];
}
setInterval(updateClock, 1000);
updateClock();

// ---- char counter ----
const inputText = document.getElementById('inputText');
const charCount = document.getElementById('charCount');
inputText.addEventListener('input', () => {
  charCount.textContent = `${inputText.value.length} chars`;
});

// ---- typewriter effect ----
function typeWrite(el, text, speed = 18) {
  return new Promise(resolve => {
    el.textContent = '';
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'blink-caret';
    cursor.textContent = '_';

    function step() {
      if (i < text.length) {
        el.textContent = text.slice(0, i + 1);
        el.appendChild(cursor);
        i++;
        setTimeout(step, speed);
      } else {
        resolve();
      }
    }
    step();
  });
}

function logLine(container, text, isErr = false) {
  const line = document.createElement('div');
  line.className = 'console-line' + (isErr ? ' err' : '');
  container.appendChild(line);
  return typeWrite(line, text, 12);
}

// ---- analyze ----
const analyzeBtn = document.getElementById('analyzeBtn');
const consoleEl = document.getElementById('console');
const preprocessLog = document.getElementById('preprocessLog');
const pulseDot = document.getElementById('pulseDot');
const resultPanel = document.getElementById('resultPanel');
const resultLabel = document.getElementById('resultLabel');

analyzeBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  consoleEl.innerHTML = '';
  resultPanel.classList.remove('show');
  pulseDot.classList.add('active');

  if (!text) {
    await logLine(consoleEl, '> error: input buffer is empty', true);
    pulseDot.classList.remove('active');
    return;
  }

  await logLine(consoleEl, '> reading input buffer...');
  await logLine(consoleEl, '> sending to model server...');

  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();

    if (!res.ok) {
      await logLine(consoleEl, `> error: ${data.error || 'unknown failure'}`, true);
      pulseDot.classList.remove('active');
      return;
    }

    preprocessLog.innerHTML = `
      <div>&gt; tokenized ✓</div>
      <div>&gt; stopwords removed ✓</div>
      <div>&gt; stemmed ✓</div>
      <div class="dim">&gt; "${data.cleaned_input.slice(0, 40)}${data.cleaned_input.length > 40 ? '...' : ''}"</div>
    `;

    await logLine(consoleEl, `> vectorized via tf-idf`);
    await logLine(consoleEl, `> classification complete. confidence ${data.confidence}%`);

    resultLabel.textContent = data.label;
    resultLabel.className = 'result-label ' + data.label;
    resultPanel.classList.add('show');

    requestAnimationFrame(() => {
      document.getElementById('negBar').style.width = data.neg_score + '%';
      document.getElementById('posBar').style.width = data.pos_score + '%';
      document.getElementById('negVal').textContent = data.neg_score + '%';
      document.getElementById('posVal').textContent = data.pos_score + '%';
    });

  } catch (err) {
    await logLine(consoleEl, `> error: connection to server failed`, true);
  } finally {
    pulseDot.classList.remove('active');
  }
});
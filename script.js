// ============================================
//  MULTI-CIPHER CONVERTER — script.js
//  All cipher logic runs entirely in the browser.
// ============================================

// ---- State ----
let currentMode   = 'encode'; // 'encode' | 'decode'
let currentCipher = 'caesar';

// ---- Cipher info descriptions ----
const CIPHER_INFO = {
  caesar:       'Caesar Cipher: Each letter is shifted forward (encode) or backward (decode) by the specified number of positions in the alphabet. Non-alphabetic characters are left unchanged.',
  rot13:        'ROT13: A special case of Caesar Cipher with a fixed shift of 13. Because 13+13=26, encoding and decoding use the same operation — just apply it twice to get back the original.',
  base64:       'Base64: Converts text into a string of ASCII characters (A–Z, a–z, 0–9, +, /) using 6-bit groups. Widely used for data transport (e.g. email attachments, URLs). Not encryption — anyone can decode it.',
  substitution: 'Substitution Cipher: Each letter is swapped for another using a fixed, pre-shared alphabet mapping. Without knowing the key, frequency analysis can crack it. Non-letters pass through unchanged.',
};

// ---- Substitution key (fixed 26-letter mapping) ----
// Plain:  ABCDEFGHIJKLMNOPQRSTUVWXYZ
// Cipher: QWERTYUIOPASDFGHJKLZXCVBNM
const SUB_ENCODE_MAP = {
  A:'Q', B:'W', C:'E', D:'R', E:'T', F:'Y', G:'U', H:'I', I:'O', J:'P',
  K:'A', L:'S', M:'D', N:'F', O:'G', P:'H', Q:'J', R:'K', S:'L', T:'Z',
  U:'X', V:'C', W:'V', X:'B', Y:'N', Z:'M',
};

// Build decode map by inverting encode map
const SUB_DECODE_MAP = Object.fromEntries(
  Object.entries(SUB_ENCODE_MAP).map(([k, v]) => [v, k])
);

// ============================================
//  CIPHER FUNCTIONS
// ============================================

/**
 * caesarCipher(text, shift, encode)
 * Shifts each alphabetic character by `shift` positions.
 * @param {string}  text   - Input string
 * @param {number}  shift  - Shift amount (1–25)
 * @param {boolean} encode - true = shift forward, false = shift backward
 * @returns {string} - Transformed string
 */
function caesarCipher(text, shift, encode = true) {
  shift = ((shift % 26) + 26) % 26; // normalize to 0-25
  if (!encode) shift = (26 - shift) % 26; // reverse direction for decoding

  return text.replace(/[a-zA-Z]/g, (char) => {
    const base = char >= 'a' ? 97 : 65; // ASCII base for lowercase/uppercase
    return String.fromCharCode(((char.charCodeAt(0) - base + shift) % 26) + base);
  });
}

/**
 * rot13(text)
 * ROT13 is its own inverse — the same function encodes and decodes.
 * @param {string} text - Input string
 * @returns {string} - ROT13 transformed string
 */
function rot13(text) {
  return caesarCipher(text, 13, true); // same operation for encode & decode
}

/**
 * base64Encode(text)
 * Converts a UTF-8 string to Base64.
 * @param {string} text
 * @returns {string} Base64 encoded string, or error message
 */
function base64Encode(text) {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch (e) {
    return '[ERROR: Could not encode — invalid input]';
  }
}

/**
 * base64Decode(text)
 * Converts a Base64 string back to UTF-8.
 * @param {string} text
 * @returns {string} Decoded string, or error message
 */
function base64Decode(text) {
  const cleaned = text.trim();
  // Base64 strings must only contain valid characters and be properly padded
  const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) && cleaned.length % 4 === 0;
  if (!isValidBase64) return '';
  try {
    return decodeURIComponent(escape(atob(cleaned)));
  } catch (e) {
    return '';
  }
}

/**
 * substitutionCipher(text, encode)
 * Replaces each letter using a fixed substitution map.
 * @param {string}  text   - Input string
 * @param {boolean} encode - true = use encode map, false = use decode map
 * @returns {string} - Substituted string
 */
function substitutionCipher(text, encode = true) {
  const map = encode ? SUB_ENCODE_MAP : SUB_DECODE_MAP;

  return text.replace(/[a-zA-Z]/g, (char) => {
    const upper = char.toUpperCase();
    const mapped = map[upper] ?? upper; // fallback to original if not in map
    // Preserve original case
    return char === char.toUpperCase() ? mapped : mapped.toLowerCase();
  });
}

// ============================================
//  CORE PROCESSING
// ============================================

/**
 * processText()
 * Reads the current input, applies the selected cipher,
 * and writes the result to the output panel.
 * Called on every input event and on setting changes.
 */
function processText() {
  const input      = document.getElementById('input-text').value;
  const outputEl   = document.getElementById('output-text');
  const statusEl   = document.getElementById('status-bar');
  const charEl     = document.getElementById('char-count');
  const isEncoding = currentMode === 'encode';

  // Update char counter
  charEl.textContent = input.length;

  // Handle empty input
  if (!input.trim()) {
    outputEl.innerHTML = '<span class="placeholder-text">Encrypted output will appear here...</span>';
    statusEl.textContent = 'READY';
    return;
  }

  let result = '';
  const shift = parseInt(document.getElementById('shift-input').value, 10) || 3;

  // Dispatch to the correct cipher
  switch (currentCipher) {
    case 'caesar':
      result = caesarCipher(input, shift, isEncoding);
      break;
    case 'rot13':
      result = rot13(input); // ROT13 is symmetric
      break;
    case 'base64':
      result = isEncoding ? base64Encode(input) : base64Decode(input);
      break;
    case 'substitution':
      result = substitutionCipher(input, isEncoding);
      break;
    default:
      result = input;
  }

  // Render output (escape HTML to prevent XSS)
  if (result === '') {
    outputEl.innerHTML = '<span class="placeholder-text">Waiting for valid input...</span>';
    statusEl.textContent = 'READY';
    return;
  }
  outputEl.textContent = result;

  // Update status bar
  const cipherLabel = currentCipher.toUpperCase();
  statusEl.textContent = isEncoding
    ? `${cipherLabel} → ENCODED (${result.length} chars)`
    : `${cipherLabel} → DECODED (${result.length} chars)`;
}

// ============================================
//  UI CONTROLS
// ============================================

/**
 * setMode(mode)
 * Switches between 'encode' and 'decode' mode.
 * @param {'encode'|'decode'} mode
 */
function setMode(mode) {
  currentMode = mode;
  const isEncoding = mode === 'encode';

  // Update button states
  document.getElementById('btn-encode').classList.toggle('active', isEncoding);
  document.getElementById('btn-decode').classList.toggle('active', !isEncoding);

  // Update mode indicator
  document.getElementById('mode-indicator').textContent = isEncoding
    ? 'MODE: ENCODING'
    : 'MODE: DECODING';

  // Update output panel label
  document.getElementById('output-label').textContent = isEncoding
    ? ' OUTPUT_ENCRYPTED.txt'
    : ' OUTPUT_DECRYPTED.txt';

  processText();
}

/**
 * onCipherChange()
 * Called when the user selects a different cipher radio button.
 * Updates the active cipher, shows/hides shift control, and refreshes output.
 */
function onCipherChange() {
  const selected = document.querySelector('input[name="cipher"]:checked');
  if (!selected) return;
  currentCipher = selected.value;

  // Show shift control only for Caesar
  const shiftControl = document.getElementById('shift-control');
  shiftControl.classList.toggle('hidden', currentCipher !== 'caesar');

  // Update cipher info banner
  document.getElementById('info-text').textContent = CIPHER_INFO[currentCipher] ?? '';

  // Highlight active card (CSS handles this via :checked, but we update aria for a11y)
  document.querySelectorAll('.cipher-card-inner').forEach(el => el.removeAttribute('aria-selected'));
  selected.closest('.cipher-card').querySelector('.cipher-card-inner').setAttribute('aria-selected', 'true');

  processText();
}

/**
 * adjustShift(delta)
 * Increments or decrements the Caesar shift value.
 * @param {number} delta — +1 or -1
 */
function adjustShift(delta) {
  const input = document.getElementById('shift-input');
  let value = parseInt(input.value, 10) || 3;
  value = Math.min(25, Math.max(1, value + delta));
  input.value = value;
  processText();
}

/**
 * copyOutput()
 * Copies the current output text to the clipboard.
 */
async function copyOutput() {
  const outputEl  = document.getElementById('output-text');
  const copyBtn   = document.getElementById('copy-btn');
  const text      = outputEl.textContent;

  if (!text || outputEl.querySelector('.placeholder-text')) {
    flashButton(copyBtn, '✕ NOTHING TO COPY', false);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    flashButton(copyBtn, '✓ COPIED!', true);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    flashButton(copyBtn, '✓ COPIED!', true);
  }
}

/**
 * flashButton(btn, label, success)
 * Temporarily changes a button's label to give feedback.
 */
function flashButton(btn, label, success) {
  const original = btn.textContent;
  btn.textContent = label;
  btn.style.color  = success ? 'var(--green)' : 'var(--red)';
  btn.style.borderColor = success ? 'var(--green)' : 'var(--red)';
  setTimeout(() => {
    btn.textContent = original;
    btn.style.color = '';
    btn.style.borderColor = '';
  }, 1500);
}

/**
 * swapIO()
 * Moves the current output text into the input field,
 * then re-processes — useful for chaining encode → decode.
 */
function swapIO() {
  const outputEl = document.getElementById('output-text');
  const inputEl  = document.getElementById('input-text');
  const swapBtn  = document.getElementById('swap-btn');

  const outputText = outputEl.textContent;
  if (!outputText || outputEl.querySelector('.placeholder-text')) {
    swapBtn.textContent = '✕ NOTHING TO SWAP';
    swapBtn.style.background = 'var(--red)';
    setTimeout(() => {
      swapBtn.textContent = '⇄ SWAP I/O';
      swapBtn.style.background = '';
    }, 1200);
    return;
  }

  // Animate the swap
  swapBtn.textContent = '✓ SWAPPED!';
  swapBtn.style.background = 'var(--green-dim)';
  setTimeout(() => {
    swapBtn.textContent = '⇄ SWAP I/O';
    swapBtn.style.background = '';
  }, 1000);

  inputEl.value = outputText;
  setMode('decode');
  inputEl.focus();
}


function clearAll() {
  document.getElementById('input-text').value = '';
  processText();
  document.getElementById('input-text').focus();
}

// ============================================
//  INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Trigger cipher change logic to set initial state
  onCipherChange();

  // Allow Tab key inside textarea (insert spaces instead of shifting focus)
  document.getElementById('input-text').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta    = e.target;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      ta.value    = ta.value.slice(0, start) + '    ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 4;
      processText();
    }
  });
});

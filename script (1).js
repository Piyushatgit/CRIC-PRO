/* ==========================================================
   Your AI Coach — behavior
   Vanilla JS, no dependencies.
   ========================================================== */

(function () {
  "use strict";

  /* ---------- Elements ---------- */
  const landingView = document.getElementById("landing-view");
  const chatView    = document.getElementById("chat-view");
  const startBtn    = document.getElementById("start-btn");
  const backBtn     = document.getElementById("back-btn");
  const messagesEl  = document.getElementById("messages");
  const threadEl    = document.getElementById("thread");
  const emptyState  = document.getElementById("empty-state");
  const chipsEl     = document.getElementById("chips");
  const composer    = document.getElementById("composer");
  const inputEl     = document.getElementById("input");
  const sendBtn     = document.getElementById("send-btn");

  /* ---------- State ----------
     Simple array so saved history can be added later.
     Shape: { id, role: "user" | "coach", text, createdAt } */
  const messages = [];
  let isTyping = false;
  let typingEl = null;
  let nextId = 1;

  /* ==========================================================
     Reply logic (the ONE place to swap in a real backend)
     ========================================================== */

  const REPLIES = {
    coverDrive:
      "A good cover drive starts before the bat moves. Get your head over the ball and let your front foot land close to its line, pointing towards extra cover.\n\n" +
      "Then let the bat come down straight with a soft top hand. Most mistimed drives come from reaching with the hands or leaning back.\n\n" +
      "When it goes wrong, are you getting out playing the shot, or does it just feel off?",

    spin:
      "Getting out to spin is very common, and it is usually about decisions more than talent. Most players either play from the crease and get beaten in the air, or go too early and get stranded.\n\n" +
      "Watch the ball out of the hand, then pick: all the way forward, or right back. Half-and-half is what gets people out.\n\n" +
      "Are you being bowled, stumped, or caught when you get out?",

    practice:
      "Happy to help with a practice week. Here's a simple shape: two days on batting skills, one on fielding and fitness, one lighter day for match simulation, and a proper rest day.\n\n" +
      "The most useful sessions are short and specific, like 30 minutes on just your front-foot defence, rather than a long unfocused net.\n\n" +
      "How many days a week can you realistically train?",

    strikeRate:
      "Strike rate is simply runs per 100 balls. Score 30 off 20 balls and your strike rate is 150.\n\n" +
      "Higher isn't always better. What matters is the situation: early in an innings, a steady 80 can be fine, while in the last few overs you want to be well above 130.\n\n" +
      "What's your usual strike rate, and what format do you play most?",

    fallback:
      "Thanks for telling me that. I'd like to understand your game a bit better before I give advice.\n\n" +
      "I can help with technique, like your cover drive or playing spin, with your numbers, like strike rate, or with planning your practice week.\n\n" +
      "What would you like to work on first?"
  };

  /**
   * Pick a canned reply by keyword.
   * Kept separate so getCoachReply stays tiny and easy to replace.
   */
  function pickReply(message) {
    const text = message.toLowerCase();
    if (text.includes("cover drive")) return REPLIES.coverDrive;
    if (text.includes("spin"))        return REPLIES.spin;
    if (text.includes("practice"))    return REPLIES.practice;
    if (text.includes("strike rate")) return REPLIES.strikeRate;
    return REPLIES.fallback;
  }

  // TODO: Replace with API call to backend.
  function getCoachReply(message) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(pickReply(message));
      }, 1200);
    });
  }

  /* ==========================================================
     Views
     ========================================================== */

  function showChat() {
    landingView.hidden = true;
    chatView.hidden = false;
    inputEl.focus({ preventScroll: true });
  }

  function showLanding() {
    chatView.hidden = true;
    landingView.hidden = false;
    startBtn.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  /* ==========================================================
     Rendering
     ========================================================== */

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  /** Build one message node (bubble + timestamp) and add it to the thread. */
  function renderMessage(message) {
    const wrap = document.createElement("div");
    wrap.className = "msg msg-" + message.role;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (message.role === "coach") {
      // One <p> per paragraph; textContent keeps it safe from HTML injection
      message.text.split(/\n\n+/).forEach(function (para) {
        const p = document.createElement("p");
        p.textContent = para;
        bubble.appendChild(p);
      });
    } else {
      bubble.textContent = message.text;
    }

    const time = document.createElement("span");
    time.className = "time";
    time.textContent = formatTime(message.createdAt);

    wrap.append(bubble, time);
    threadEl.appendChild(wrap);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ---------- Typing indicator ---------- */

  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement("div");
    typingEl.className = "msg msg-coach";
    typingEl.innerHTML =
      '<div class="bubble typing" role="status" aria-label="Coach is typing">' +
      "<span></span><span></span><span></span></div>";
    threadEl.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTyping() {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  /* ==========================================================
     Input helpers
     ========================================================== */

  function addMessage(role, text) {
    const message = { id: nextId++, role: role, text: text, createdAt: new Date() };
    messages.push(message);
    renderMessage(message);
    return message;
  }

  /** Grow the textarea with its content, up to the CSS max-height. */
  function autoResize() {
    inputEl.style.height = "auto";
    inputEl.style.height = inputEl.scrollHeight + "px";
  }

  function updateSendState() {
    sendBtn.disabled = isTyping || inputEl.value.trim() === "";
  }

  function setBusy(busy) {
    isTyping = busy;
    inputEl.disabled = busy;
    updateSendState();
  }

  function hideEmptyState() {
    if (emptyState) emptyState.hidden = true;
  }

  /* ==========================================================
     Sending
     ========================================================== */

  async function sendMessage(rawText) {
    const text = rawText.trim();
    if (!text || isTyping) return;

    hideEmptyState();
    addMessage("user", text);

    inputEl.value = "";
    autoResize();
    setBusy(true);
    showTyping();

    try {
      const reply = await getCoachReply(text);
      hideTyping();
      addMessage("coach", reply);
    } catch (err) {
      hideTyping();
      addMessage("coach", "Sorry, I lost my train of thought for a second. Could you say that again?");
    } finally {
      setBusy(false);
      inputEl.focus({ preventScroll: true });
    }
  }

  /* ==========================================================
     Events
     ========================================================== */

  startBtn.addEventListener("click", showChat);
  backBtn.addEventListener("click", showLanding);

  composer.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(inputEl.value);
  });

  // Enter sends, Shift+Enter inserts a new line
  inputEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendMessage(inputEl.value);
    }
  });

  inputEl.addEventListener("input", function () {
    autoResize();
    updateSendState();
  });

  // Suggestion chips send their own text
  chipsEl.addEventListener("click", function (event) {
    const chip = event.target.closest(".chip");
    if (chip) sendMessage(chip.textContent);
  });

  // Keep the latest message visible when the mobile keyboard opens
  window.addEventListener("resize", scrollToBottom);
})();

/*
  Registration form logic:
  - 4 step wizard with animated slides
  - Inline validation on Next / Submit
  - LocalStorage autosave + restore (including current step)
  - Fee calculation based on age category (Junior/Open)
  - UPI ID copy button
  - Success screen + lightweight confetti
  - FormSubmit integration via POST fetch (no page navigation)
*/

(function () {
  const STORAGE_KEY = "ypl_s2_registration_v1";
  const TOTAL_STEPS = 4;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const form = $("#registrationForm");
  if (!form) return;

  const steps = $(".steps");
  const progressFill = $("#progressFill");
  const progressMeta = $("#progressMeta");
  const feeAmt = $("#feeAmount");
  const feeHint = $("#feeHint");
  const successRoot = $("#successRoot");

  let state = {
    step: 1,
    values: {},
  };

  /* ---------------- Helpers ---------------- */
  function setError(name, message) {
    const el = $(`[data-error-for="${name}"]`);
    if (el) el.textContent = message || "";
  }

  function clearAllErrors() {
    $$("[data-error-for]").forEach((el) => (el.textContent = ""));
  }

  function getValue(name) {
    const el = form.elements.namedItem(name);
    if (!el) return "";

    // Radio group handling
    if (el instanceof RadioNodeList) return el.value || "";
    if (el instanceof HTMLInputElement && el.type === "checkbox") return el.checked ? "yes" : "";
    return (el.value ?? "").toString().trim();
  }

  function setValue(name, value) {
    const el = form.elements.namedItem(name);
    if (!el) return;

    if (el instanceof RadioNodeList) {
      // RadioNodeList has no .value setter that updates UI reliably; set checked manually.
      const radios = $$(`input[name="${CSS.escape(name)}"]`, form);
      radios.forEach((r) => (r.checked = r.value === value));
      return;
    }

    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      el.checked = value === "yes" || value === true;
      return;
    }

    el.value = value ?? "";
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // If storage is unavailable, we still allow form usage.
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      state = {
        step: Number(parsed.step || 1),
        values: parsed.values && typeof parsed.values === "object" ? parsed.values : {},
      };
    } catch {
      // ignore bad storage
    }
  }

  function syncFromFormIntoState() {
    const names = $$("[name]", form).map((el) => el.getAttribute("name")).filter(Boolean);
    for (const name of new Set(names)) {
      state.values[name] = getValue(name);
    }
  }

  function applyStateToForm() {
    for (const [name, value] of Object.entries(state.values || {})) {
      setValue(name, value);
    }
    // Re-apply custom UI selections for card/pill widgets.
    refreshChoiceUIs();
    updateFeeUI();
  }

  function clampStep(n) {
    return Math.min(TOTAL_STEPS, Math.max(1, n));
  }

  function goToStep(step) {
    state.step = clampStep(step);
    saveState();

    const offsetPct = (state.step - 1) * 25;
    if (steps) steps.style.transform = `translateX(-${offsetPct}%)`;

    const pct = (state.step / TOTAL_STEPS) * 100;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressMeta) progressMeta.textContent = `Step ${state.step} of ${TOTAL_STEPS}`;

    // Scroll to top of form for mobile convenience.
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------- Fee calculation ---------------- */
  function calculateFee() {
    const ageCategory = getValue("ageCategory"); // junior/open
    if (ageCategory === "junior") return 700;
    if (ageCategory === "open") return 900;
    return 0;
  }

  function updateFeeUI() {
    const fee = calculateFee();
    if (feeAmt) feeAmt.textContent = fee ? `₹${fee}` : "—";
    if (feeHint) {
      feeHint.textContent =
        fee === 700 ? "Junior (7–15 years)" : fee === 900 ? "Open (Above 15)" : "Select an age category in Step 3.";
    }
    // Hidden field so FormSubmit email contains the computed fee.
    const feeField = form.elements.namedItem("calculatedFee");
    if (feeField && !(feeField instanceof RadioNodeList)) feeField.value = fee ? `₹${fee}` : "";
  }

  /* ---------------- Validation ---------------- */
  function validateStep1() {
    let ok = true;
    const fullName = getValue("fullName");
    const email = getValue("email");
    const mobile = getValue("mobile");
    const gender = getValue("gender");

    if (!fullName) { setError("fullName", "Full name is required."); ok = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("email", "Enter a valid email address."); ok = false; }
    if (!mobile || !/^\d{10}$/.test(mobile)) { setError("mobile", "Enter a 10-digit mobile number."); ok = false; }
    if (!gender) { setError("gender", "Please select gender."); ok = false; }
    return ok;
  }

  function validateStep2() {
    let ok = true;
    const towerWing = getValue("towerWing");
    const flatNumber = getValue("flatNumber");
    const residentType = getValue("residentType");
    const familyCount = getValue("familyCount");

    if (!towerWing) { setError("towerWing", "Please choose your tower/wing."); ok = false; }
    if (!flatNumber || !/^(0\d{3}|1\d{3}|20\d{2}|210[0-5])$/.test(flatNumber)) {
      // Accepts 0001-2105 with reasonable strictness.
      setError("flatNumber", "Flat number must be between 0001 and 2105.");
      ok = false;
    }
    if (!residentType) { setError("residentType", "Select resident type."); ok = false; }
    const n = Number(familyCount || "0");
    if (!Number.isFinite(n) || n < 1 || n > 10) { setError("familyCount", "Family player count must be 1–10."); ok = false; }
    return ok;
  }

  function validateStep3() {
    let ok = true;
    const ageCategory = getValue("ageCategory");
    const tshirt = getValue("tshirtSize");
    const expertise = getValue("expertise");

    if (!ageCategory) { setError("ageCategory", "Choose Junior or Open."); ok = false; }
    if (!tshirt) { setError("tshirtSize", "Select a T-shirt size."); ok = false; }
    if (!expertise) { setError("expertise", "Select an expertise."); ok = false; }
    return ok;
  }

  function validateStep4() {
    let ok = true;
    updateFeeUI();
    const fee = calculateFee();
    const paymentOk = getValue("paymentConfirmed"); // checkbox
    const txnRef = getValue("txnRef");

    if (!fee) { setError("paymentConfirmed", "Select age category first (Step 3)."); ok = false; }
    if (!paymentOk) { setError("paymentConfirmed", "Please confirm you have completed the payment."); ok = false; }
    if (!txnRef) { setError("txnRef", "Transaction reference number is required."); ok = false; }
    return ok;
  }

  function validateCurrentStep() {
    clearAllErrors();
    switch (state.step) {
      case 1: return validateStep1();
      case 2: return validateStep2();
      case 3: return validateStep3();
      case 4: return validateStep4();
      default: return true;
    }
  }

  /* ---------------- Custom UI widgets (cards/pills) ---------------- */
  function refreshChoiceUIs() {
    // Card choices
    $$("[data-choice-group]", form).forEach((group) => {
      const name = group.getAttribute("data-choice-group");
      const selected = getValue(name);
      $$("[data-choice]", group).forEach((card) => {
        card.classList.toggle("is-selected", card.getAttribute("data-choice") === selected);
      });
    });

    // Pill selector
    $$("[data-pillset]", form).forEach((set) => {
      const name = set.getAttribute("data-pillset");
      const selected = getValue(name);
      $$("[data-pill]", set).forEach((pill) => {
        pill.classList.toggle("is-selected", pill.getAttribute("data-pill") === selected);
      });
    });
  }

  function attachChoiceHandlers() {
    $$("[data-choice-group]", form).forEach((group) => {
      const name = group.getAttribute("data-choice-group");
      group.addEventListener("click", (e) => {
        const card = (e.target instanceof Element) ? e.target.closest("[data-choice]") : null;
        if (!card) return;
        const value = card.getAttribute("data-choice") || "";
        setValue(name, value);
        refreshChoiceUIs();
        updateFeeUI();
        syncFromFormIntoState();
        saveState();
      });
    });

    $$("[data-pillset]", form).forEach((set) => {
      const name = set.getAttribute("data-pillset");
      set.addEventListener("click", (e) => {
        const pill = (e.target instanceof Element) ? e.target.closest("[data-pill]") : null;
        if (!pill) return;
        const value = pill.getAttribute("data-pill") || "";
        setValue(name, value);
        refreshChoiceUIs();
        syncFromFormIntoState();
        saveState();
      });
    });
  }

  /* ---------------- Buttons ---------------- */
  function attachNavHandlers() {
    $$(".js-next").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!validateCurrentStep()) return;
        syncFromFormIntoState();
        saveState();
        goToStep(state.step + 1);
      });
    });

    $$(".js-back").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        clearAllErrors();
        syncFromFormIntoState();
        saveState();
        goToStep(state.step - 1);
      });
    });
  }

  /* ---------------- UPI copy ---------------- */
  const copyBtn = $("#copyUpi");
  copyBtn?.addEventListener("click", async () => {
    const upi = $("#upiId")?.textContent?.trim() || "";
    try {
      await navigator.clipboard.writeText(upi);
      copyBtn.textContent = "COPIED";
      window.setTimeout(() => (copyBtn.textContent = "COPY"), 900);
    } catch {
      copyBtn.textContent = "COPY FAILED";
      window.setTimeout(() => (copyBtn.textContent = "COPY"), 900);
    }
  });

  /* ---------------- Confetti ---------------- */
  function fireConfetti() {
    const root = document.createElement("div");
    root.className = "confetti";
    document.body.appendChild(root);

    const colors = ["#FFD36A", "#37E3D6", "#F2B93B", "#12B8AE", "#F4F7FF"];
    for (let i = 0; i < 26; i++) {
      const c = document.createElement("div");
      c.className = "confetto";
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.setProperty("--x", `${(Math.random() * 2 - 1) * 120}px`);
      c.style.animationDelay = `${Math.random() * 220}ms`;
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      root.appendChild(c);
    }
    window.setTimeout(() => root.remove(), 1700);
  }

  /* ---------------- Submit handling ---------------- */
  function renderSuccess() {
    if (!successRoot) return;
    const v = state.values;

    successRoot.innerHTML = `
      <div class="card success">
        <span class="pill">Registration submitted</span>
        <h2>Welcome to YPL Season 2!</h2>
        <p class="muted">We’ve captured your details. Team drafts begin after announcements on May 5, 2026.</p>
        <div class="success-grid" aria-label="Submitted details">
          ${kv("Player", v.fullName)}
          ${kv("Email", v.email)}
          ${kv("Mobile", v.mobile)}
          ${kv("Tower/Wing", v.towerWing)}
          ${kv("Flat", v.flatNumber)}
          ${kv("Category", v.ageCategory === "junior" ? "Junior" : v.ageCategory === "open" ? "Open" : "—")}
          ${kv("Expertise", v.expertise)}
          ${kv("Fee", v.calculatedFee || (calculateFee() ? `₹${calculateFee()}` : "—"))}
        </div>
        <div style="margin-top: 1rem; display:flex; gap:.6rem; flex-wrap:wrap;">
          <a class="btn btn--outline" href="index.html">Back to Home</a>
          <button class="btn btn--gold" type="button" id="newRegistration">Register another player</button>
        </div>
      </div>
    `;

    $("#newRegistration")?.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    });
  }

  function kv(k, v) {
    const safeK = escapeHtml(k || "—");
    const safeV = escapeHtml((v || "—").toString());
    return `<div class="kv"><b>${safeK}</b><span>${safeV}</span></div>`;
  }

  function escapeHtml(str) {
    return str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors();

    // Validate all steps on submit.
    const prevStep = state.step;
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      state.step = s;
      if (!validateCurrentStep()) {
        goToStep(s);
        state.step = s;
        return;
      }
    }
    state.step = prevStep;

    syncFromFormIntoState();
    updateFeeUI();
    saveState();

    // Post to FormSubmit without navigating away.
    try {
      const action = form.getAttribute("action") || "";
      const data = new FormData(form);
      // no-cors prevents CORS failures from breaking UX (FormSubmit still receives the POST).
      await fetch(action, { method: "POST", body: data, mode: "no-cors" });
    } catch {
      // Even if the network call fails, we still show the success screen (static site constraint).
    }

    fireConfetti();
    renderSuccess();
    form.style.display = "none";
    localStorage.removeItem(STORAGE_KEY);
  });

  /* ---------------- Autosave ---------------- */
  form.addEventListener("input", () => {
    syncFromFormIntoState();
    updateFeeUI();
    saveState();
  });
  form.addEventListener("change", () => {
    syncFromFormIntoState();
    updateFeeUI();
    saveState();
  });

  /* ---------------- Init ---------------- */
  attachChoiceHandlers();
  attachNavHandlers();
  loadState();
  applyStateToForm();
  goToStep(state.step || 1);
})();


import "./style.css";
import { createSuccessParticles, playSuccessSound } from "./animations";
import { redeemCode } from "./api";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root element.");
}

const root = app;
const CHARACTER_IMAGE_1 = "/redeem-character-1.jpg";
const CHARACTER_IMAGE_2 = "/redeem-character-2.jpg";
const CHARACTER_IMAGE_3 = "/redeem-character-3.jpg";
const CHARACTER_FADE_IN_MS = 1200;
const CHARACTER_SECOND_IMAGE_WAIT_MS = 1300;
const CHARACTER_FINAL_WAIT_MS = 500;
const CHARACTER_FAST_FADE_MS = 180;

renderRedeemForm();

function renderRedeemForm(errorMessage?: string): void {
  const safeErrorMessage = errorMessage ? escapeHtml(errorMessage) : "";

  root.innerHTML = `
    <main class="page-shell">
      <header class="site-header">
        <span class="brand-mark" aria-hidden="true">M5R</span>
        <span class="site-name">m5rcel&rsquo;s Redeemer</span>
      </header>

      <section class="redeem-view" aria-labelledby="page-title">
        <div class="intro-copy">
          <p class="eyebrow">GIFT CODE</p>
          <h1 id="page-title">Redeem your code</h1>
          <p class="subtitle">Enter your gift code to redeem your reward.</p>
        </div>

        <form class="redeem-form" novalidate>
          <label for="code-input">Redeem code</label>
          <div class="code-box">
            <input
              id="code-input"
              name="code"
              type="text"
              inputmode="text"
              autocomplete="one-time-code"
              spellcheck="false"
              placeholder="M5R-8F3K-Q2LX-Z9PA"
              aria-describedby="code-status"
              ${errorMessage ? "aria-invalid=\"true\"" : ""}
            />
          </div>
          <button class="primary-button" type="submit">
            <span>Redeem</span>
          </button>
          <p id="code-status" class="form-message ${errorMessage ? "is-error" : ""}" aria-live="polite">
            ${safeErrorMessage || "Codes are validated securely on the server."}
          </p>
        </form>
      </section>

      <footer>made by m5rcel</footer>
    </main>
  `;

  const form = root.querySelector<HTMLFormElement>(".redeem-form");
  const input = root.querySelector<HTMLInputElement>("#code-input");

  input?.focus();
  input?.addEventListener("input", () => {
    input.value = input.value.toUpperCase();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitRedeemForm(input?.value ?? "");
  });
}

async function submitRedeemForm(rawCode: string): Promise<void> {
  const code = rawCode.trim();
  if (code.length === 0) {
    renderRedeemForm("Enter a redeem code to continue.");
    return;
  }

  renderLoading();

  try {
    const response = await redeemCode(code);
    if (!response.ok) {
      renderRedeemForm(response.message);
      return;
    }

    await runSuccessFlow();
  } catch {
    renderRedeemForm("Unable to reach the server. Please try again.");
  }
}

function renderLoading(): void {
  renderSimpleState({
    busy: true,
    label: "Checking",
    message: "Checking code...",
    indicator: "spinner"
  });
}

async function runSuccessFlow(): Promise<void> {
  renderSuccess();
  await runSuccessCharacterSequence();
}

function renderSuccess(): void {
  root.innerHTML = `
    <main class="page-shell">
      <header class="site-header">
        <span class="brand-mark" aria-hidden="true">M5R</span>
        <span class="site-name">m5rcel&rsquo;s Redeemer</span>
      </header>

      <div class="success-character" aria-hidden="true">
        <img src="${CHARACTER_IMAGE_1}" alt="" />
      </div>

      <section class="success-view" aria-live="polite">
        <div class="particle-layer" aria-hidden="true"></div>
        <div class="checkmark-wrap" aria-hidden="true">
          <svg class="checkmark" viewBox="0 0 72 72" role="img">
            <path d="M21 37.5 31.2 47 52 25" />
          </svg>
        </div>
        <div class="success-copy">
          <h1>Code Redeemed Successfully</h1>
          <p>Thank you for redeeming your code.</p>
        </div>
      </section>

      <footer>made by m5rcel</footer>
    </main>
  `;

  const particleLayer = root.querySelector<HTMLElement>(".particle-layer");
  if (particleLayer) {
    createSuccessParticles(particleLayer);
  }
}

async function runSuccessCharacterSequence(): Promise<void> {
  const character = root.querySelector<HTMLElement>(".success-character");
  const image = character?.querySelector<HTMLImageElement>("img");
  if (!character || !image) {
    return;
  }

  await waitForImage(image);
  await nextFrame();
  character.classList.add("is-visible");
  await delay(CHARACTER_FADE_IN_MS);

  image.src = CHARACTER_IMAGE_2;
  await waitForImage(image);
  await delay(CHARACTER_SECOND_IMAGE_WAIT_MS);

  image.src = CHARACTER_IMAGE_3;
  character.classList.add("is-frantic");
  await waitForImage(image);

  const soundResult = await playSuccessSound();
  if (soundResult === "blocked") {
    await waitForCharacterContinue(character);
  }

  character.classList.remove("is-frantic");
  image.src = CHARACTER_IMAGE_2;
  await waitForImage(image);
  await delay(CHARACTER_FINAL_WAIT_MS);

  character.classList.add("is-exiting");
  await delay(CHARACTER_FAST_FADE_MS);
  character.remove();
}

function waitForCharacterContinue(character: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const button = document.createElement("button");
    button.className = "character-continue";
    button.type = "button";
    button.textContent = "Tap to continue";
    character.append(button);
    button.focus();

    button.addEventListener(
      "click",
      () => {
        button.disabled = true;
        button.remove();
        void (async () => {
          await playSuccessSound();
          resolve();
        })();
      },
      { once: true }
    );
  });
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function renderSimpleState(input: {
  busy?: boolean;
  indicator: "pulse" | "spinner";
  label: string;
  message: string;
}): void {
  root.innerHTML = `
    <main class="page-shell">
      <header class="site-header">
        <span class="brand-mark" aria-hidden="true">M5R</span>
        <span class="site-name">m5rcel&rsquo;s Redeemer</span>
      </header>

      <section class="redeem-view is-centered" aria-live="polite" ${input.busy ? "aria-busy=\"true\"" : ""}>
        <div class="state-indicator ${input.indicator === "spinner" ? "spinner" : "pulse-dot"}" aria-hidden="true"></div>
        <div class="intro-copy">
          <p class="eyebrow">${input.label}</p>
          <h1>${input.message}</h1>
        </div>
      </section>

      <footer>made by m5rcel</footer>
    </main>
  `;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    };

    return entities[character] ?? character;
  });
}

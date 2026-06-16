import "./style.css";
import { redeemCode } from "./api-client";
import { buildParticles, playSuccessSound } from "./animations";

function mustQuery<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

const form = mustQuery<HTMLFormElement>("#redeem-form");
const input = mustQuery<HTMLInputElement>("#code-input");
const button = mustQuery<HTMLButtonElement>("#redeem-button");
const statusMessage = mustQuery<HTMLParagraphElement>("#status-message");
const successScreen = mustQuery<HTMLElement>("#success-screen");
const redeemCard = mustQuery<HTMLElement>(".redeem-card");
const particleField = mustQuery<HTMLElement>(".particle-field");
const tapPanel = mustQuery<HTMLElement>("#tap-to-continue");
const tapButton = mustQuery<HTMLButtonElement>("#tap-button");

const messages: Record<string, string> = {
  INVALID_CODE: "This code does not exist.",
  ALREADY_REDEEMED: "This code has already been redeemed.",
  EXPIRED_CODE: "This code has expired.",
  MALFORMED_CODE: "Please enter a valid code format.",
  SERVER_ERROR: "Something went wrong. Please try again.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again."
};

function normalizeInput(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function setLoading(isLoading: boolean): void {
  button.disabled = isLoading;
  input.disabled = isLoading;
  form.classList.toggle("is-loading", isLoading);
}

function showError(message: string): void {
  statusMessage.textContent = message;
  statusMessage.className = "status-message error";
}

function clearStatus(): void {
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

function showSuccessScreen(): void {
  buildParticles(particleField);
  redeemCard.classList.add("redeem-card--complete");

  window.setTimeout(() => {
    redeemCard.hidden = true;
    successScreen.hidden = false;
    successScreen.classList.add("success-screen--visible");
  }, 260);
}

async function finishSuccessFlow(): Promise<void> {
  const audioResult = await playSuccessSound();

  if (audioResult === "blocked") {
    tapPanel.hidden = false;
    tapButton.focus();
    return;
  }

  showSuccessScreen();
}

tapButton.addEventListener("click", async () => {
  tapPanel.hidden = true;
  await playSuccessSound();
  showSuccessScreen();
});

input.addEventListener("input", () => {
  input.value = normalizeInput(input.value);
  clearStatus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();

  const code = normalizeInput(input.value);

  if (!code) {
    showError("Please enter a redeem code.");
    input.focus();
    return;
  }

  setLoading(true);

  try {
    const result = await redeemCode(code);

    if (!result.ok) {
      showError(messages[result.error] ?? messages.SERVER_ERROR);
      setLoading(false);
      return;
    }

    statusMessage.textContent = result.message;
    statusMessage.className = "status-message success";
    await finishSuccessFlow();
  } catch {
    showError("Could not connect to the redeem server.");
    setLoading(false);
  }
});

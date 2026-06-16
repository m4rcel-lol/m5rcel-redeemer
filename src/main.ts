import "./style.css";
import { redeemCode } from "./api-client";
import { buildParticles, playSuccessSound } from "./animations";

const form = document.querySelector<HTMLFormElement>("#redeem-form");
const input = document.querySelector<HTMLInputElement>("#code-input");
const button = document.querySelector<HTMLButtonElement>("#redeem-button");
const statusMessage = document.querySelector<HTMLParagraphElement>("#status-message");
const successScreen = document.querySelector<HTMLElement>("#success-screen");
const redeemCard = document.querySelector<HTMLElement>(".redeem-card");
const particleField = document.querySelector<HTMLElement>(".particle-field");
const tapPanel = document.querySelector<HTMLElement>("#tap-to-continue");
const tapButton = document.querySelector<HTMLButtonElement>("#tap-button");

if (!form || !input || !button || !statusMessage || !successScreen || !redeemCard || !particleField || !tapPanel || !tapButton) {
  throw new Error("Required DOM nodes are missing.");
}

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

export type SuccessSoundResult = "played" | "blocked" | "skipped";

const SUCCESS_SOUND_PATH = "/success.mp3";
const AUDIO_TIMEOUT_MS = 30_000;

export async function playSuccessSound(): Promise<SuccessSoundResult> {
  const audio = new Audio(SUCCESS_SOUND_PATH);
  audio.preload = "auto";
  audio.volume = 0.9;

  return new Promise((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => settle("skipped"), AUDIO_TIMEOUT_MS);

    const settle = (result: SuccessSoundResult): void => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      resolve(result);
    };

    audio.addEventListener("ended", () => settle("played"), { once: true });
    audio.addEventListener("error", () => settle("skipped"), { once: true });

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error: unknown) => {
        if (isAutoplayBlockedError(error)) {
          settle("blocked");
          return;
        }

        settle("skipped");
      });
    }
  });
}

export function createSuccessParticles(container: HTMLElement, count = 34): void {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "success-particle";
    particle.style.setProperty("--particle-x", `${randomBetween(-140, 140)}px`);
    particle.style.setProperty("--particle-y", `${randomBetween(-150, -40)}px`);
    particle.style.setProperty("--particle-rotate", `${randomBetween(-80, 80)}deg`);
    particle.style.setProperty("--particle-delay", `${randomBetween(0, 260)}ms`);
    particle.style.setProperty("--particle-size", `${randomBetween(5, 10)}px`);
    fragment.append(particle);
  }

  container.append(fragment);
}

function isAutoplayBlockedError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "NotAllowedError" || error.name === "SecurityError";
  }

  if (error instanceof Error) {
    return /notallowed|permission|interact|gesture|play/i.test(
      `${error.name} ${error.message}`
    );
  }

  return true;
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

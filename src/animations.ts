export function buildParticles(container: HTMLElement): void {
  container.innerHTML = "";

  for (let index = 0; index < 34; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.style.setProperty("--x", `${Math.random() * 220 - 110}px`);
    particle.style.setProperty("--y", `${Math.random() * -170 - 24}px`);
    particle.style.setProperty("--delay", `${Math.random() * 0.55}s`);
    particle.style.setProperty("--size", `${Math.random() * 6 + 4}px`);
    container.appendChild(particle);
  }
}

export async function playSuccessSound(): Promise<"played" | "missing-or-failed" | "blocked"> {
  const audio = new Audio("/success.mp3");
  audio.preload = "auto";
  audio.volume = 0.75;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: "played" | "missing-or-failed" | "blocked") => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    audio.addEventListener("ended", () => finish("played"), { once: true });
    audio.addEventListener("error", () => finish("missing-or-failed"), { once: true });

    const playPromise = audio.play();

    if (playPromise) {
      playPromise.catch((error: unknown) => {
        const name = error instanceof DOMException ? error.name : "";
        finish(name === "NotAllowedError" ? "blocked" : "missing-or-failed");
      });
    }

    window.setTimeout(() => {
      if (!settled && audio.paused) finish("missing-or-failed");
    }, 900);
  });
}

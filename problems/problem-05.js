window.ARG_PROBLEMS = window.ARG_PROBLEMS || [];
window.ARG_PROBLEMS.push({
  id: 5,
  name: "Lucky strike",
  answer: "One in a million",
  content: `
    <div class="lottery-puzzle">
      <div class="lottery-ticket">
        <div class="lottery-title">Lucky Lottery</div>
        <div class="scratch-area">
          <div class="scratch-result" aria-live="polite"></div>
          <canvas class="scratch-cover" aria-label="scratch ticket cover"></canvas>
        </div>
      </div>
      <p class="lottery-odds">
        first prize:
        <span class="lottery-chance" contenteditable="true" inputmode="decimal" spellcheck="false">0.1</span>%
      </p>
    </div>
  `,
  onRender({ centerpiece }) {
    const canvas = centerpiece.querySelector(".scratch-cover");
    const result = centerpiece.querySelector(".scratch-result");
    const chanceInput = centerpiece.querySelector(".lottery-chance");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const scratchRadius = 18;
    let hasStarted = false;
    let isDrawing = false;
    let hasRevealed = false;
    let isWinner = false;

    function readChance() {
      const rawValue = chanceInput.textContent.replace(",", ".").replace(/[^\d.]/g, "");
      const parsed = Number(rawValue);

      if (!Number.isFinite(parsed)) {
        return 0.1;
      }

      return Math.min(Math.max(parsed, 0), 100);
    }

    function prepareCanvas() {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "#a7a7a7";
      context.fillRect(0, 0, rect.width, rect.height);

      context.fillStyle = "rgba(255, 255, 255, 0.18)";
      for (let index = 0; index < 120; index += 1) {
        context.fillRect(Math.random() * rect.width, Math.random() * rect.height, 1, 1);
      }
    }

    function sanitizeChanceInput() {
      const cleaned = chanceInput.textContent.replace(",", ".").replace(/[^\d.]/g, "");
      if (chanceInput.textContent !== cleaned) {
        chanceInput.textContent = cleaned || "0";
      }
    }

    function decideResult() {
      const probability = readChance() / 100;
      isWinner = Math.random() < probability;
      result.innerHTML = isWinner
        ? '<div class="lottery-star" aria-hidden="true">★</div><div class="lottery-prize">One in a million</div>'
        : '<div class="lottery-blank">NO STAR</div>';
    }

    function getPoint(event) {
      const rect = canvas.getBoundingClientRect();

      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function getScratchedRatio() {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let clearPixels = 0;

      for (let index = 3; index < imageData.length; index += 4) {
        if (imageData[index] === 0) {
          clearPixels += 1;
        }
      }

      return clearPixels / (imageData.length / 4);
    }

    function revealIfReady() {
      if (hasRevealed || getScratchedRatio() < 0.42) {
        return;
      }

      hasRevealed = true;
      canvas.classList.add("is-revealed");
    }

    function scratchAt(event) {
      const point = getPoint(event);
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.arc(point.x, point.y, scratchRadius, 0, Math.PI * 2);
      context.fill();
      revealIfReady();
    }

    function handlePointerDown(event) {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);

      if (!hasStarted) {
        hasStarted = true;
        decideResult();
      }

      isDrawing = true;
      scratchAt(event);
    }

    function handlePointerMove(event) {
      if (!isDrawing) {
        return;
      }

      event.preventDefault();
      scratchAt(event);
    }

    function handlePointerUp(event) {
      isDrawing = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    }

    function preventChanceEnter(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        chanceInput.blur();
      }
    }

    prepareCanvas();
    chanceInput.addEventListener("input", sanitizeChanceInput);
    chanceInput.addEventListener("keydown", preventChanceEnter);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);

    return () => {
      chanceInput.removeEventListener("input", sanitizeChanceInput);
      chanceInput.removeEventListener("keydown", preventChanceEnter);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
    };
  },
});

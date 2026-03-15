import { type Page, expect } from "@playwright/test";

/** Create a quiz via the /create page and return the room code from the redirect URL. */
export async function createQuizViaUI(
  page: Page,
  title: string,
  questions: {
    text: string;
    type: "multiple-choice" | "open-ended";
    options?: string[];
    correctIndex?: number;
    timeLimit?: string; // "10", "20", "30", "60" or "" for no limit
  }[]
): Promise<string> {
  await page.goto("/create");
  await page.getByPlaceholder("Titulo do quiz...").fill(title);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Add question if not the first (first one exists by default)
    if (i > 0) {
      await page.getByRole("button", { name: "+ Adicionar Pergunta" }).click();
    }

    // Fill question text — target the i-th textarea
    const textareas = page.locator("textarea");
    await textareas.nth(i).fill(q.text);

    // Set type
    if (q.type === "open-ended") {
      // Click the i-th "Resposta Aberta" button
      await page.getByRole("button", { name: "Resposta Aberta" }).nth(i).click();
    }

    // Fill MC options
    if (q.type === "multiple-choice" && q.options) {
      const questionBlock = page.locator(".bg-amber-50").nth(i);
      const optionInputs = questionBlock.locator('input[placeholder^="Opcao"]');

      for (let j = 0; j < q.options.length; j++) {
        // Add extra options if needed (starts with 2)
        if (j >= 2) {
          await questionBlock.getByText("+ Adicionar opcao").click();
        }
        await optionInputs.nth(j).fill(q.options[j]);
      }

      // Select correct answer
      if (q.correctIndex !== undefined) {
        const radios = questionBlock.locator('input[type="radio"]');
        await radios.nth(q.correctIndex).check();
      }
    }

    // Set time limit
    if (q.timeLimit) {
      const questionBlock = page.locator(".bg-amber-50").nth(i);
      await questionBlock.locator("select").selectOption(q.timeLimit);
    }
  }

  // Save — wait for navigation to /host/[code]
  await page.getByRole("button", { name: "Guardar e Criar Sala" }).click();
  await page.waitForURL(/\/host\/[A-Za-z0-9]+/, { timeout: 10_000 });

  // Extract room code from URL
  const url = page.url();
  const code = url.split("/host/")[1]?.split("?")[0];
  if (!code) throw new Error(`Could not extract room code from URL: ${url}`);
  return code;
}

/** Join a room as a player in a separate page/context. */
export async function joinRoomAsPlayer(
  page: Page,
  code: string,
  playerName: string
): Promise<void> {
  await page.goto(`/play/${code}`);
  await page.getByPlaceholder("O teu nome").fill(playerName);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Wait for lobby — player should see "A esperar" or similar
  await expect(
    page.getByText(/esperar|lobby/i).first()
  ).toBeVisible({ timeout: 5_000 });
}

/** Host: advance to next question (click "Proxima Pergunta" or "Comecar") */
export async function hostStartQuestion(page: Page): Promise<void> {
  // Could be "Comecar Jogo", "Proxima Pergunta", or "Comecar"
  const startBtn = page.getByRole("button", { name: /[Cc]omecar|[Pp]roxima/i }).first();
  await startBtn.click();
}

/** Host: reveal answers */
export async function hostReveal(page: Page): Promise<void> {
  const revealBtn = page.getByRole("button", { name: /[Rr]evelar|[Mm]ostrar/i }).first();
  await revealBtn.click();
}

/** Clean up: delete a quiz by ID via API */
export async function deleteQuizViaAPI(baseURL: string, quizId: string): Promise<void> {
  await fetch(`${baseURL}/api/quizzes/${quizId}`, { method: "DELETE" });
}

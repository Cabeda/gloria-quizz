import { test, expect } from "@playwright/test";
import { createQuizViaUI } from "./helpers";

test.describe("Full Game Flow", () => {
  test("lobby → 2 MC questions → final leaderboard on both screens", async ({ browser }) => {
    test.setTimeout(90_000);

    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    // Create quiz with 2 MC questions (use distinct option names to avoid ambiguity)
    const code = await createQuizViaUI(hostPage, "Full Game Test", [
      {
        text: "Capital de Portugal?",
        type: "multiple-choice",
        options: ["Roma", "Lisboa"],
        correctIndex: 1,
      },
      {
        text: "Capital de Espanha?",
        type: "multiple-choice",
        options: ["Madrid", "Barcelona"],
        correctIndex: 0,
      },
    ]);

    // Player joins
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/play/${code}`);
    await playerPage.getByPlaceholder("O teu nome").fill("Diana");
    await playerPage.getByRole("button", { name: "Entrar" }).click();
    await expect(playerPage.getByText("A espera que o jogo comece...")).toBeVisible({ timeout: 5_000 });
    await expect(hostPage.getByText("Diana")).toBeVisible({ timeout: 8_000 });

    // --- Question 1 ---
    await hostPage.getByRole("button", { name: "Comecar!" }).click();
    await expect(hostPage.getByText("Capital de Portugal?")).toBeVisible({ timeout: 8_000 });

    // Wait for player to see Q1 options
    await expect(playerPage.getByRole("button", { name: "Lisboa" })).toBeVisible({ timeout: 8_000 });
    await playerPage.getByRole("button", { name: "Lisboa" }).click();
    await expect(playerPage.getByText("Resposta enviada!")).toBeVisible({ timeout: 3_000 });

    // Auto-reveal (1 player, MC) — host transitions to reveal phase
    await expect(hostPage.getByText("Proxima Pergunta")).toBeVisible({ timeout: 12_000 });

    // --- Question 2 ---
    await hostPage.getByRole("button", { name: "Proxima Pergunta" }).click();

    // Wait for host to show Q2
    await expect(hostPage.getByText("Capital de Espanha?")).toBeVisible({ timeout: 8_000 });

    // Wait for player to see Q2 options (confirms polling picked up the new question)
    await expect(playerPage.getByRole("button", { name: "Madrid" })).toBeVisible({ timeout: 10_000 });

    // Player answers Q2 correctly
    await playerPage.getByRole("button", { name: "Madrid" }).click();
    await expect(playerPage.getByText("Resposta enviada!")).toBeVisible({ timeout: 3_000 });

    // Auto-reveal for last question — host should see "Ver Resultado Final"
    await expect(hostPage.getByText("Ver Resultado Final")).toBeVisible({ timeout: 15_000 });

    // Host finishes game
    await hostPage.getByRole("button", { name: "Ver Resultado Final" }).click();

    // Host should show "Fim do Jogo!" heading
    await expect(hostPage.getByText("Fim do Jogo!")).toBeVisible({ timeout: 15_000 });

    // Player should see "Fim do Jogo!"
    await expect(playerPage.getByText("Fim do Jogo!")).toBeVisible({ timeout: 15_000 });
    await expect(playerPage.getByText(/1o lugar/)).toBeVisible({ timeout: 5_000 });

    await hostContext.close();
    await playerContext.close();
  });
});

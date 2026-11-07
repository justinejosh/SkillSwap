import { test, expect, Page } from "@playwright/test";

async function mockRecovery(page: Page, available = true) {
  const calls: { path: string; body: any }[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5174") {
      await route.continue();
      return;
    }
    if (url.origin !== "http://127.0.0.1:5009") {
      await route.abort();
      return;
    }
    const path = url.pathname;
    if (path.endsWith("/providers")) {
      await route.fulfill({ json: { google: { enabled: false } } });
      return;
    }
    if (path.endsWith("/recovery-options")) {
      await route.fulfill({ json: { emailDeliveryAvailable: available } });
      return;
    }
    calls.push({ path, body: route.request().postDataJSON() });
    if (path.endsWith("/request-verification"))
      await route.fulfill({
        status: 202,
        json: {
          message:
            "If an eligible account exists, a verification message will be sent.",
        },
      });
    else if (path.endsWith("/request-password-reset"))
      await route.fulfill({
        status: 202,
        json: {
          message:
            "If an eligible account exists, a password reset link will be sent.",
        },
      });
    else if (path.endsWith("/reset-password"))
      await route.fulfill({
        json: {
          message:
            "Password reset. Institutional email verification is still required for unverified accounts.",
        },
      });
    else
      await route.fulfill({
        status: 404,
        json: { error: "Unexpected test route" },
      });
  });
  return calls;
}

test("forgot-password opens recovery and preserves the typed email", async ({
  page,
}) => {
  const calls = await mockRecovery(page);
  await page.goto("/login");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("syntheticlag@fixture.example");
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recover your account" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Institutional email", { exact: true }),
  ).toHaveValue("syntheticlag@fixture.example");
  await page.getByRole("button", { name: "Send password reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If an eligible account exists",
  );
  expect(calls).toEqual([
    {
      path: "/api/auth/request-password-reset",
      body: { email: "syntheticlag@fixture.example" },
    },
  ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("verification requests validate email and use a success notice", async ({
  page,
}) => {
  const calls = await mockRecovery(page);
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Request institutional email verification" })
    .click();
  expect(calls).toHaveLength(0);
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("syntheticlag@fixture.example");
  await page
    .getByRole("button", { name: "Request institutional email verification" })
    .click();
  await expect(page.getByRole("status")).toContainText("verification message");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(calls[0].path).toBe("/api/auth/request-verification");
});

test("unconfigured email is explained and unavailable actions do not claim to send", async ({
  page,
}) => {
  const calls = await mockRecovery(page, false);
  await page.goto("/login");
  await expect(
    page.getByText("Email delivery is unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Request institutional email verification",
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "A reset link cannot be sent",
  );
  await expect(
    page.getByRole("button", { name: "Send password reset link" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Check email availability again" })
    .click();
  expect(calls).toHaveLength(0);
});

test("reset requires matching passwords, removes the URL token and preserves verification requirements", async ({
  page,
}) => {
  const calls = await mockRecovery(page);
  await page.goto("/reset-password#token=synthetic-reset-token");
  await expect(page).toHaveURL(/\/reset-password$/);
  await page
    .getByLabel("New password", { exact: true })
    .fill("synthetic-next-password");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("synthetic-wrong-password");
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Passwords must match");
  expect(calls).toHaveLength(0);
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("synthetic-next-password");
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "verification is still required",
  );
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  expect(calls).toEqual([
    {
      path: "/api/auth/reset-password",
      body: {
        token: "synthetic-reset-token",
        newPassword: "synthetic-next-password",
      },
    },
  ]);
});

test("missing reset token offers a new request without submitting a password", async ({
  page,
}) => {
  const calls = await mockRecovery(page);
  await page.goto("/reset-password");
  await expect(page.getByRole("alert")).toContainText("Open the full link");
  await expect(
    page.getByRole("link", { name: "Request a new reset link" }),
  ).toBeVisible();
  expect(calls).toHaveLength(0);
});

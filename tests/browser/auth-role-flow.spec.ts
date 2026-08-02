import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPrismaClient } from "../../src/lib/prisma";

type RoleExpectation = {
  email: string;
  allowed: string[];
  denied: Array<{
    path: string;
    role: "reader" | "writer" | "admin";
  }>;
  visibleNav: string[];
  hiddenNav: string[];
};

function readLocalEnvValue(name: string): string | undefined {
  if (process.env[name]) {
    return process.env[name];
  }

  try {
    const source = readFileSync(
      path.join(process.cwd(), ".env"),
      "utf8",
    );

    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();

      if (key === name) {
        return trimmed.slice(separator + 1).trim();
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

const DEV_PASSWORD = readLocalEnvValue("DEV_TEST_USER_PASSWORD");

if (!DEV_PASSWORD) {
  throw new Error(
    "DEV_TEST_USER_PASSWORD is missing. Run the Section 5.9 development-user setup first.",
  );
}

async function clearBrowserAuth(page: Page) {
  await page.context().clearCookies();
  await page.goto("/");
}

async function signIn(page: Page, email: string, password = DEV_PASSWORD!) {
  await clearBrowserAuth(page);
  await page.goto("/auth");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signinResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/signin") &&
      response.request().method() === "POST",
  );

  await page
    .getByRole("button", { name: "Continue to account" })
    .click();

  const signinResponse = await signinResponsePromise;
  expect(signinResponse.status()).toBe(200);

  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

async function assertAllowed(page: Page, route: string) {
  await page.goto(route);
  await expect(page).toHaveURL(
    new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?|$)`),
  );
}

async function assertDenied(
  page: Page,
  route: string,
  role: "reader" | "writer" | "admin",
) {
  await page.goto(route);
  await expect(page).toHaveURL(
    new RegExp(`/account\\?denied=${role}(?:&|$)`),
  );
}

async function assertNav(
  page: Page,
  visible: string[],
  hidden: string[],
) {
  await page.goto("/account");

  for (const label of visible) {
    await expect(
      page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
  }

  for (const label of hidden) {
    await expect(
      page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: label, exact: true }),
    ).toHaveCount(0);
  }
}

const roleCases: RoleExpectation[] = [
  {
    email: "reader@bookshop.local",
    allowed: ["/library", "/checkout"],
    denied: [
      { path: "/studio", role: "writer" },
      { path: "/admin", role: "admin" },
    ],
    visibleNav: [],
    hiddenNav: ["Studio", "Admin"],
  },
  {
    email: "writer@bookshop.local",
    allowed: ["/library", "/checkout", "/studio"],
    denied: [{ path: "/admin", role: "admin" }],
    visibleNav: ["Studio"],
    hiddenNav: ["Admin"],
  },
  {
    email: "admin@bookshop.local",
    allowed: ["/library", "/checkout", "/studio", "/admin"],
    denied: [],
    visibleNav: ["Studio", "Admin"],
    hiddenNav: [],
  },
];

test.describe("Section 5.11 real browser authentication", () => {
  for (const roleCase of roleCases) {
    test(`${roleCase.email} receives only its database-authorized routes`, async ({
      page,
    }) => {
      await signIn(page, roleCase.email);

      for (const route of roleCase.allowed) {
        await assertAllowed(page, route);
      }

      for (const denied of roleCase.denied) {
        await assertDenied(page, denied.path, denied.role);
      }

      await assertNav(
        page,
        roleCase.visibleNav,
        roleCase.hiddenNav,
      );
    });
  }

  test("wrong password is rejected in the real sign-in form", async ({
    page,
  }) => {
    await clearBrowserAuth(page);
    await page.goto("/auth");

    await page
      .getByLabel("Email")
      .fill("reader@bookshop.local");
    await page
      .getByLabel("Password")
      .fill("DefinitelyWrong2026");

    await page
      .getByRole("button", { name: "Continue to account" })
      .click();

    await expect(page).toHaveURL(/\/auth(?:\?|$)/);
    await expect(
      page.getByText(
        "We could not sign you in with that email and password.",
      ),
    ).toBeVisible();
  });

  test("signout revokes browser access to protected routes", async ({
    page,
  }) => {
    await signIn(page, "writer@bookshop.local");
    await assertAllowed(page, "/studio");

    const result = await page.evaluate(async () => {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });

      return response.ok;
    });

    expect(result).toBe(true);

    await page.goto("/studio");

    await expect(page).toHaveURL(
      /\/auth\?redirect=%2Fstudio$/,
    );
  });

  test("invalid V2 cookie is rejected by the browser route flow", async ({
    page,
    context,
  }) => {
    await clearBrowserAuth(page);

    await context.addCookies([
      {
        name: "bookshop_auth_v2",
        value: "invalid-expired-session-token",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/library");

    await expect(page).toHaveURL(
      /\/auth\?redirect=%2Flibrary$/,
    );
  });

  test("legacy bookshop_session cookie cannot restore browser access", async ({
    page,
    context,
  }) => {
    await clearBrowserAuth(page);

    await context.addCookies([
      {
        name: "bookshop_session",
        value:
          "%7B%22roles%22%3A%7B%22reader%22%3Atrue%2C%22writer%22%3Atrue%2C%22admin%22%3Atrue%7D%7D",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/admin");

    await expect(page).toHaveURL(
      /\/auth\?redirect=%2Fadmin$/,
    );
  });

  test("browser signup creates Reader-only access", async ({ page }) => {
    const prisma = getPrismaClient();

    if (!prisma) {
      throw new Error("Prisma client unavailable.");
    }

    const suffix = Date.now().toString(36);
    const email = `browser-${suffix}@example.test`;
    const username = `browser-${suffix}`.slice(0, 32);
    const password = "BrowserSignup2026";

    try {
      await clearBrowserAuth(page);
      await page.goto("/auth");

      await page
        .getByRole("button", { name: "Create account" })
        .click();

      await page
        .getByLabel("Full name")
        .fill("Browser Signup Test");
      await page
        .getByLabel("Username")
        .fill(username);
      await page
        .getByLabel("Email")
        .fill(email);
      await page
        .getByLabel("Password")
        .fill(password);

      await page
        .getByRole("button", { name: "Create free account" })
        .click();

      await expect(page).toHaveURL(/\/account(?:\?|$)/);

      await assertAllowed(page, "/library");
      await assertAllowed(page, "/checkout");
      await assertDenied(page, "/studio", "writer");
      await assertDenied(page, "/admin", "admin");

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      expect(user).not.toBeNull();
      expect(user?.roles.map((entry) => entry.role.key)).toEqual([
        "READER",
      ]);
    } finally {
      await prisma.user.deleteMany({
        where: { email },
      });
    }
  });
});
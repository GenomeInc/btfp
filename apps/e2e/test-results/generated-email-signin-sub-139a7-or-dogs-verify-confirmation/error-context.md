# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: generated/email-signin-submit-thing.spec.ts >> sign in with work email, submit a dangerous food item for dogs, verify confirmation
- Location: tests/generated/email-signin-submit-thing.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder('123456')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByPlaceholder('123456')

```

```yaml
- dialog "Sign in with your work email":
  - heading "Sign in with your work email" [level=2]
  - paragraph: No GitHub account needed — use your organizational email instead. Once reviewed, you'll be able to contribute directly.
  - textbox "you@yourclinic.org": e2e-1785208490176@badthingsforpets.com
  - paragraph: Internal server error
  - button "Cancel"
  - button "Send code"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('sign in with work email, submit a dangerous food item for dogs, verify confirmation', async ({
  4  |   page,
  5  | }) => {
  6  |   const email = `e2e-${Date.now()}@badthingsforpets.com`;
  7  | 
  8  |   // Navigate to the home page
  9  |   await page.goto('/');
  10 | 
  11 |   // --- Step 1: Open the email sign-in dialog and request a code ---
  12 |   await page.getByRole('button', { name: /sign in with work email/i }).click();
  13 | 
  14 |   await page.getByPlaceholder('you@yourclinic.org').fill(email);
  15 |   await page.getByRole('button', { name: /send code/i }).click();
  16 | 
  17 |   // --- Step 2: Wait for the code input to appear (confirms POST /api/auth/email/request finished) ---
  18 |   // This request does a synchronous Bedrock classification + SES send
  19 |   // (~2.5s warm, longer on a cold Lambda right after a fresh deploy) —
  20 |   // the default 5s expect timeout isn't enough margin.
> 21 |   await expect(page.getByPlaceholder('123456')).toBeVisible({ timeout: 15000 });
     |                                                 ^ Error: expect(locator).toBeVisible() failed
  22 | 
  23 |   // Fetch the OTP code from the test endpoint (unauthenticated, no need for page.request here)
  24 |   const codeResponse = await page.request.get(
  25 |     `/api/auth/email/test-code?email=${encodeURIComponent(email)}`,
  26 |   );
  27 |   expect(codeResponse.ok()).toBeTruthy();
  28 |   const { code } = await codeResponse.json();
  29 | 
  30 |   // --- Step 3: Enter the code and sign in ---
  31 |   await page.getByPlaceholder('123456').fill(code);
  32 |   await page.getByRole('button', { name: /sign in/i }).click();
  33 | 
  34 |   // Dialog should close after successful sign-in
  35 |   await expect(page.getByPlaceholder('123456')).not.toBeVisible();
  36 | 
  37 |   // --- Step 4: Verify the user as a contributor via the test endpoint ---
  38 |   const verifyResponse = await page.request.post('/api/auth/test/verify');
  39 |   expect(verifyResponse.ok()).toBeTruthy();
  40 | 
  41 |   // Reload so the app picks up the updated verifiedContributor status
  42 |   await page.reload();
  43 | 
  44 |   // --- Step 5: Navigate to /submit ---
  45 |   await page.goto('/submit');
  46 | 
  47 |   // --- Step 6: Fill out the submission form ---
  48 | 
  49 |   // Name
  50 |   await page.getByLabel(/^name$/i).fill('Chocolate');
  51 | 
  52 |   // Type — select "food" (lowercase matches real DOM value)
  53 |   await page.getByRole('combobox', { name: /type/i }).selectOption('food');
  54 | 
  55 |   // Dangerous for — "dog" is checked by default; confirm it's checked (or check it explicitly)
  56 |   const dogCheckbox = page.getByRole('checkbox', { name: /^dog$/i });
  57 |   if (!(await dogCheckbox.isChecked())) {
  58 |     await dogCheckbox.check();
  59 |   }
  60 | 
  61 |   // Why is it dangerous?
  62 |   await page
  63 |     .getByLabel(/why is it dangerous/i)
  64 |     .fill(
  65 |       'Chocolate contains theobromine and caffeine, which are toxic to dogs and can cause vomiting, seizures, and death.',
  66 |     );
  67 | 
  68 |   // Source (optional)
  69 |   await page
  70 |     .getByLabel(/source/i)
  71 |     .fill(
  72 |       'https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/chocolate',
  73 |     );
  74 | 
  75 |   // Submit
  76 |   await page.getByRole('button', { name: /submit for review/i }).click();
  77 | 
  78 |   // --- Step 7: Assert on the confirmation screen ---
  79 |   await expect(page.getByRole('heading', { name: /thanks! 🐾/i })).toBeVisible();
  80 |   await expect(
  81 |     page.getByText('Your submission is in the moderation queue for review.'),
  82 |   ).toBeVisible();
  83 | });
  84 | 
```
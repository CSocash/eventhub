# Node 20 + Playwright with every browser (Chromium, Firefox, WebKit) pre-installed.
# Used both locally (docker compose) and in CI (.github/workflows/playwright.yml).
FROM node:20-bookworm

WORKDIR /app

# Never try to serve the HTML report from inside the container (it would hang on failure)
ENV PLAYWRIGHT_HTML_OPEN=never

# Install only the root test dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Install all browsers plus their OS libraries. The Playwright CLI comes from the
# lockfile, so browser builds always match the installed @playwright/test version.
RUN npx playwright install --with-deps \
    && rm -rf /var/lib/apt/lists/*

# Copy the test suite
COPY playwright.config.ts ./
COPY tests/ ./tests/

# Console output + HTML report (written to /app/playwright-report).
# Extra args are appended, e.g. `docker compose run --rm tests tests/booking-flow.spec.js -g "title"`
ENTRYPOINT ["npx", "playwright", "test", "--reporter=line,html"]

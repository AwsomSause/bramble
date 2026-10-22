# Putting Bramble online (GitHub Pages)

Bramble is a static website, so GitHub Pages can host it free. You don't need any passwords, API keys or secrets.

## One-time setup

1. **Make a GitHub account** at <https://github.com> if you don't have one.
2. **Create a repository** named `bramble`:
   - Go to **+ → New repository** and set the name to `bramble`.
   - Choose **Public**. Free GitHub Pages needs a public repository.
   - Don't add a README, because the project already has one.
3. **Tell Bramble its repository address.** In `src/config.ts`, change

   ```ts
   repoUrl: 'https://github.com/OWNER/bramble',
   ```

   so that `OWNER` is your GitHub username. "Report a problem" links use this address.
4. **Push the code.** From the project folder:

   ```bash
   git remote add origin https://github.com/<your-username>/bramble.git
   git push -u origin main
   ```
5. **Turn on Pages.** In the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
6. **Watch it build.** Open the **Actions** tab. The **CI** workflow:
   - runs the linter, the type checker, the unit tests, the catalog check, the security audit, the browser and accessibility tests, the production build and the size check,
   - then deploys, but only if every step passed.

   It takes about 5 minutes.
7. **Visit your site** at `https://<your-username>.github.io/bramble/`.

> Named the repository something other than `bramble`? The site's address changes to `/<repo-name>/`. Add `BASE_PATH: /<repo-name>/` as an `env:` entry on the build steps in `.github/workflows/ci.yml`.

## Updating the site

Commit and push to `main`. CI checks everything and redeploys. If any check fails, the old version stays online and the failing step is shown in red under **Actions**.

You can also work on a separate branch and open a pull request. CI checks the pull request without deploying it.

## Rolling back a bad change

Choose either:

- **Undo the commit:** `git revert <commit-id>`, then `git push`. CI deploys the previous state.
- **Redeploy an older build:** under **Actions → CI**, open an older successful run on `main` and choose **Re-run all jobs**.

## Using your own domain later (optional)

1. Buy a domain, for example `bramble.fun`, from any registrar.
2. In GitHub, go to **Settings → Pages → Custom domain**, enter it, and save. Then create `public/CNAME` containing just the domain (one line), so every deploy keeps it.
3. At your registrar, add DNS records:
   - For the bare domain (`bramble.fun`), add **A** records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`. You can also add **AAAA** records for `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` and `2606:50c0:8003::153`.
   - For `www`, add a **CNAME** record pointing to `<your-username>.github.io`.
   - Check GitHub's current list before you copy these: <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>.
4. Wait for DNS to update (minutes to a few hours). Then tick **Enforce HTTPS** in **Settings → Pages**.
5. The site now lives at the root of the domain, not under `/bramble/`. Set `BASE_PATH: /` on the build steps in `.github/workflows/ci.yml`.

## Weekly link check

The **Check embeds** workflow runs every Monday, and you can also run it from the Actions tab. It reports linked games whose sites have started refusing to be shown inside other sites. It doesn't change anything by itself. To apply the results, run `npm run check-embeds -- --write` locally and commit `catalog/embed-status.json`.

## Keeping dependencies up to date

Dependabot opens weekly pull requests for updated tools. CI tests each one. Merge it if CI is green.

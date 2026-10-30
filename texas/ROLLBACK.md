# Rollback

- **Intel tab (texas-v-intel1):** `git revert --no-edit texas-pre-intel..texas-v-intel1-final`, then push. This removes the tab, the collector and the workflow step. The data on the device (stars and read marks) is left alone, and nothing else reads it.
- To pause collection only, delete the "Build Intel feed" step from the daily refresh workflow. The tab keeps showing the last file and shows a stale notice after 48 hours.

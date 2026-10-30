# Rollback

- **Intel tab (texas-v-intel1):** `git revert --no-edit texas-pre-intel..texas-v-intel1-final`, then push. This removes the tab, the collector and the workflow step. The data on the device (stars and read marks) is left alone, and nothing else reads it.
- To pause collection only, delete the "Build Intel feed" step from the daily refresh workflow. The tab keeps showing the last file and shows a stale notice after 48 hours.
- **Intel 2 (Houston HTML sources and weekly newsletter, texas-v-intel2):** `git revert --no-edit texas-pre-intel2..texas-v-intel2-final`, then push. The newsletter files in texas/data/newsletters/ are removed by the revert. The daily data commits inside that range are reverted too, and the next daily run rebuilds the data.
- **Intel link fix (texas-v-intel1.1):** `git revert --no-edit texas-v-intel1..texas-v-intel1.1` restores the old Legistar links, which showed "Invalid parameter", so it is not recommended. That range also contains one daily data commit. Because texas-v-intel1.1 comes after texas-pre-intel2, roll back Intel 2 alone with `git revert --no-edit texas-v-intel1.1..texas-v-intel2-final`.

# dashboardlify examples

Two fictional "Acme" admin screens used as scan fixtures.

- `slop-dashboard.html` is a deliberately sloppy, AI-looking dashboard. The scan should flag it heavily.
- `clean-dashboard.html` is the same screen written with tight tokens. The scan should leave it alone.

## Scan

From this folder:

```sh
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs slop-dashboard.html
node ../plugins/dashboardlify/skills/dashboardlify/scripts/scan.mjs clean-dashboard.html
```

## Try the tighten command

Never run it on the original. Copy first:

```sh
cp slop-dashboard.html /tmp/slop-copy.html
/dashboardlify:tighten /tmp/slop-copy.html
```

Then scan the copy again and open both in a browser to compare.

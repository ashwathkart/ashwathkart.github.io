---
layout: page
title: "Sample Blog: How to Structure Entries"
permalink: /blogs/sample-blog/
order: 1
foreword: "A quick example blog showing front matter fields, headings, and body structure."
published: true
draft: false
---

## Foreword

This sample entry demonstrates the recommended format for any file in `_blogs/`.

## Draft workflow

If you want to push work-in-progress but keep it out of the site:

- Set `published: false` (best option: it is not generated at all).
- Or set `draft: true` (also treated as hidden by list pages in this site).
- Or set `hidden: true`, which does the same.

## Ordering

Entries are ordered by the `order:` number, lowest first. There are no dates
anywhere — rename or reorder files freely, only `order:` matters.

## Suggested front matter

Use this at the top of each blog file:

```yaml
---
layout: page
title: "Your Blog Title"
permalink: /blogs/your-blog-slug/
order: 1
foreword: "A one-line preview shown on /blogs/."
published: true
draft: false
---
```

## Main body

Write the blog content in normal Markdown.

### Subheading example

- Bullet points
- Technical notes
- Links and images as needed

### Another section

You can split the article into multiple subsections for readability.

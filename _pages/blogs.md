---
layout: page
title: Blogs
permalink: /blogs/
---

Below are blog entries from the `_blogs` directory.

{% assign sorted_blogs = site.blogs | sort: "date" | reverse %}
{% if sorted_blogs.size > 0 %}
{% for blog in sorted_blogs %}
### [{{ blog.title }}]({{ blog.url | prepend: site.baseurl }})
{% if blog.foreword %}
{{ blog.foreword }}
{% endif %}

{% endfor %}
{% else %}
No blogs yet. Add a markdown file in `_blogs/` to publish one here.
{% endif %}

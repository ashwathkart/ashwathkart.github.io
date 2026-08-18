---
layout: page
title: Blogs
permalink: /blogs/
---
Here are some articles I've written as a creative outlet and also an exercise in writing about diverse topics ranging from ethics in AI to more mundane topics like optimized grocery shopping pickroutes.

{% include visible-blogs.html %}
{% for blog in visible_blogs %}
### [{{ blog.title }}]({{ blog.url | relative_url }})
{% if blog.foreword %}
{{ blog.foreword }}
{% endif %}
{% endfor %}
{% if visible_blogs.size == 0 %}
No blogs yet. Add a markdown file in `_blogs/` to publish one here.
{% endif %}

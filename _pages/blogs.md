---
layout: page
title: Blogs
permalink: /blogs/
---
Here are some articles I've written as a creative outlet and also an exercise in writing about diverse topics ranging from ethics in AI to more mundane topics like optimized grocery shopping pickroutes.

{% assign sorted_blogs = site.blogs | sort: "date" | reverse %}

{% assign visible_blog_count = 0 %}
{% for blog in sorted_blogs %}
  {% assign is_hidden_blog = false %}
  {% if blog.draft == true or blog.published == false %}
    {% assign is_hidden_blog = true %}
  {% endif %}
  {% assign blog_title_prefix = blog.title | slice: 0, 1 %}
  {% if blog_title_prefix == '*' %}
    {% assign is_hidden_blog = true %}
  {% endif %}

  {% unless is_hidden_blog %}

### [}](})

{% if blog.foreword %}
{{ blog.foreword }}
{% endif %}

    {% assign visible_blog_count = visible_blog_count | plus: 1 %}
  {% endunless %}
{% endfor %}

{% if visible_blog_count == 0 %}
No blogs yet. Add a markdown file in `_blogs/` to publish one here.
{% endif %}

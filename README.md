# ItsAllGreekToMe

A static food blog for mostly Greek recipes.

## Local Preview

Open `index.html` in a browser.

The site uses React from a CDN and does not need a build step.

## Add Recipes

Add a new recipe object to `recipes.js`.

You can also use the site UI's `Create recipe` button. Recipes created from
the UI, including uploaded thumbnails, are saved in that browser with
`localStorage`.

Use this format:

```js
{
  title: "Recipe Name",
  category: "Category",
  time: "45 min",
  description: "One short sentence for the recipe card.",
  tags: ["tag-one", "tag-two"],
  ingredients: ["ingredient one", "ingredient two"],
  image: "https://example.com/image.jpg",
},
```

You can draft full recipes in `recipes/` using `recipes/recipe-template.md`.

## GitHub Pages

The site is designed to run on GitHub Pages from the repository root.

Expected URL:

```text
https://dpettas.github.io/itsallgreektome/
```

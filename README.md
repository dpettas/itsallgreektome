# ItsAllGreekToMe

A static food blog for mostly Greek recipes.

## Local Preview

Open `index.html` in a browser.

The site uses React from a CDN and does not need a build step.

## Add Recipes

Add a new recipe object to `recipes.js`.

You can also use the site UI's `Create recipe` button to publish a recipe
directly into this GitHub repository.

The publish form writes:
- recipe data to `data/published-recipes.json`
- uploaded thumbnails to `images/user/`

Requirements for UI publishing:
- a GitHub token with repository `Contents` read and write access
- the correct `owner`, `repo`, and `branch` in the modal

The token is stored only in the current browser session with `sessionStorage`.
The owner/repo/branch fields are stored locally in the browser with
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

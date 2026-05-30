const grid = document.querySelector("#recipe-grid");
const searchInput = document.querySelector("#recipe-search");
const tagBar = document.querySelector("#tag-bar");
const resultCount = document.querySelector("#result-count");

let activeTag = "all";

const allTags = [
  "all",
  ...Array.from(new Set(recipes.flatMap((recipe) => recipe.tags))).sort(),
];

function normalize(value) {
  return value.toLowerCase().trim();
}

function recipeMatches(recipe, query) {
  const haystack = [
    recipe.title,
    recipe.category,
    recipe.description,
    ...recipe.tags,
    ...recipe.ingredients,
  ]
    .join(" ")
    .toLowerCase();

  const matchesSearch = !query || haystack.includes(query);
  const matchesTag = activeTag === "all" || recipe.tags.includes(activeTag);

  return matchesSearch && matchesTag;
}

function renderTags() {
  tagBar.innerHTML = allTags
    .map(
      (tag) => `
        <button class="tag-button" type="button" aria-pressed="${tag === activeTag}" data-tag="${tag}">
          ${tag === "all" ? "All recipes" : tag}
        </button>
      `,
    )
    .join("");
}

function renderRecipes() {
  const query = normalize(searchInput.value);
  const filtered = recipes.filter((recipe) => recipeMatches(recipe, query));

  resultCount.textContent = `${filtered.length} recipe${filtered.length === 1 ? "" : "s"} found`;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state">No recipes match that search.</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (recipe) => `
        <article class="recipe-card">
          <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
          <div class="recipe-body">
            <div class="recipe-meta">
              <span>${recipe.category}</span>
              <span>${recipe.time}</span>
            </div>
            <h3>${recipe.title}</h3>
            <p>${recipe.description}</p>
            <div class="recipe-tags" aria-label="Tags for ${recipe.title}">
              ${recipe.tags.map((tag) => `<span>${tag}</span>`).join("")}
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

tagBar.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tag]");

  if (!button) {
    return;
  }

  activeTag = button.dataset.tag;
  renderTags();
  renderRecipes();
});

searchInput.addEventListener("input", renderRecipes);

renderTags();
renderRecipes();

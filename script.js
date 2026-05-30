const recipes = [
  {
    title: "Spanakopita",
    category: "Savory Pie",
    time: "75 min",
    description:
      "Flaky phyllo layered with spinach, feta, scallions, dill, and olive oil.",
    tags: ["vegetarian", "phyllo", "feta", "classic"],
    ingredients: ["spinach", "feta", "dill", "phyllo"],
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Chicken Souvlaki",
    category: "Grill",
    time: "35 min",
    description:
      "Lemon-oregano chicken skewers with warm pita, tomato, onion, and tzatziki.",
    tags: ["grill", "weeknight", "pita", "lemon"],
    ingredients: ["chicken", "oregano", "lemon", "pita"],
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Tzatziki",
    category: "Dip",
    time: "15 min",
    description:
      "Thick Greek yogurt with cucumber, garlic, dill, lemon, and a good olive oil finish.",
    tags: ["dip", "yogurt", "vegetarian", "quick"],
    ingredients: ["yogurt", "cucumber", "garlic", "dill"],
    image:
      "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Gemista",
    category: "Baked",
    time: "95 min",
    description:
      "Tomatoes and peppers stuffed with herbed rice, vegetables, and olive oil.",
    tags: ["vegetarian", "rice", "baked", "summer"],
    ingredients: ["tomatoes", "peppers", "rice", "parsley"],
    image:
      "https://images.unsplash.com/photo-1541014741259-de529411b96a?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Moussaka",
    category: "Comfort Food",
    time: "2 hr",
    description:
      "Layered eggplant, spiced meat sauce, potatoes, and creamy bechamel.",
    tags: ["baked", "classic", "eggplant", "dinner"],
    ingredients: ["eggplant", "potato", "beef", "bechamel"],
    image:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Greek Village Salad",
    category: "Salad",
    time: "10 min",
    description:
      "Tomatoes, cucumber, onion, olives, feta, oregano, and olive oil.",
    tags: ["salad", "vegetarian", "quick", "feta"],
    ingredients: ["tomatoes", "cucumber", "olives", "feta"],
    image:
      "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=900&q=80",
  },
];

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

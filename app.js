const { createElement: h, useEffect, useMemo, useState } = React;
const recipes = Array.isArray(window.recipes) ? window.recipes : [];

function getStoredFavorites() {
  try {
    return JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
  } catch {
    return [];
  }
}

function App() {
  const page = document.querySelector("#app").dataset.page;
  const [favorites, setFavorites] = useState(getStoredFavorites);

  useEffect(() => {
    localStorage.setItem("favoriteRecipes", JSON.stringify(favorites));
  }, [favorites]);

  function toggleFavorite(slug) {
    setFavorites((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  if (page === "recipe") {
    return h(RecipePage, { favorites, toggleFavorite });
  }

  return h(HomePage, { favorites, toggleFavorite });
}

function Nav({ compact = false }) {
  return h(
    "nav",
    { className: "nav", "aria-label": "Main navigation" },
    h("a", { className: "brand", href: compact ? "index.html" : "#top" }, "ItsAllGreekToMe"),
    h("a", { href: "index.html#recipes" }, "Recipes"),
    h("a", { href: "index.html#about" }, "About"),
  );
}

function HomePage({ favorites, toggleFavorite }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [showFavorites, setShowFavorites] = useState(false);

  const allTags = useMemo(
    () => ["all", ...Array.from(new Set(recipes.flatMap((recipe) => recipe.tags))).sort()],
    [],
  );

  const filteredRecipes = useMemo(() => {
    const needle = query.toLowerCase().trim();

    return recipes.filter((recipe) => {
      const haystack = [
        recipe.title,
        recipe.category,
        recipe.description,
        recipe.prepTime || "",
        recipe.cookTime || "",
        recipe.servings || "",
        ...recipe.tags,
        ...recipe.ingredients,
        ...(recipe.ingredientsList || []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !needle || haystack.includes(needle);
      const matchesTag = activeTag === "all" || recipe.tags.includes(activeTag);
      const matchesFavorite = !showFavorites || favorites.includes(recipe.slug);

      return matchesSearch && matchesTag && matchesFavorite;
    });
  }, [activeTag, favorites, query, showFavorites]);

  return h(
    React.Fragment,
    null,
    h(
      "header",
      { className: "site-header" },
      h(Nav),
      h(
        "section",
        { className: "hero", id: "top" },
        h(
          "div",
          { className: "hero-content" },
          h("p", { className: "eyebrow" }, "Greek recipes, family-table energy"),
          h("h1", null, "Mostly Greek food for everyday cooking."),
          h("p", null, "Search traditional favorites, filter by tags, and save ideas for the next meal."),
          h("a", { className: "hero-link", href: "#recipes" }, "Browse recipes"),
        ),
      ),
    ),
    h(
      "main",
      null,
      h(
        "section",
        { className: "intro", id: "about", "aria-labelledby": "about-title" },
        h("div", null, h("p", { className: "section-kicker" }, "Food Blog"), h("h2", { id: "about-title" }, "Simple recipes with Greek flavor.")),
        h("p", null, "A growing recipe notebook for dips, pies, grilled dishes, stews, sweets, and weeknight plates inspired by Greek kitchens."),
      ),
      h(
        "section",
        { className: "recipe-section", id: "recipes", "aria-labelledby": "recipes-title" },
        h(
          "div",
          { className: "section-heading" },
          h("div", null, h("p", { className: "section-kicker" }, "Recipe Index"), h("h2", { id: "recipes-title" }, "Find something to cook")),
          h(
            "label",
            { className: "search-label" },
            h("span", null, "Search recipes"),
            h("input", {
              type: "search",
              value: query,
              placeholder: "Search by name, ingredient, or tag",
              autoComplete: "off",
              onChange: (event) => setQuery(event.target.value),
            }),
          ),
        ),
        h(
          "div",
          { className: "interactive-row" },
          h(
            "label",
            { className: "toggle-control" },
            h("input", {
              type: "checkbox",
              checked: showFavorites,
              onChange: (event) => setShowFavorites(event.target.checked),
            }),
            h("span", null, "Favorites only"),
          ),
          h("button", { className: "clear-button", type: "button", onClick: () => { setQuery(""); setActiveTag("all"); setShowFavorites(false); } }, "Clear filters"),
        ),
        h(
          "div",
          { className: "tag-bar", "aria-label": "Filter recipes by tag" },
          allTags.map((tag) =>
            h("button", {
              key: tag,
              className: "tag-button",
              type: "button",
              "aria-pressed": tag === activeTag,
              onClick: () => setActiveTag(tag),
            }, tag === "all" ? "All recipes" : tag),
          ),
        ),
        h("div", { className: "result-count", "aria-live": "polite" }, `${filteredRecipes.length} recipe${filteredRecipes.length === 1 ? "" : "s"} found`),
        h(
          "div",
          { className: "recipe-grid" },
          filteredRecipes.length
            ? filteredRecipes.map((recipe) => h(RecipeCard, { key: recipe.slug, recipe, favorites, toggleFavorite }))
            : h("div", { className: "empty-state" }, "No recipes match that search."),
        ),
      ),
    ),
    h(Footer),
  );
}

function RecipeCard({ recipe, favorites, toggleFavorite }) {
  const isFavorite = favorites.includes(recipe.slug);

  return h(
    "article",
    { className: "recipe-card" },
    h("img", { src: recipe.image, alt: recipe.title, loading: "lazy" }),
    h(
      "div",
      { className: "recipe-body" },
      h("div", { className: "recipe-meta" }, h("span", null, recipe.category), h("span", null, recipe.time)),
      h("h3", null, recipe.title),
      h("p", null, recipe.description),
      h("div", { className: "recipe-tags", "aria-label": `Tags for ${recipe.title}` }, recipe.tags.map((tag) => h("span", { key: tag }, tag))),
      h(
        "div",
        { className: "card-actions" },
        h("a", { className: "recipe-card-link", href: `recipe.html?recipe=${recipe.slug}` }, "View full recipe"),
        h("button", { className: "favorite-button", type: "button", "aria-pressed": isFavorite, onClick: () => toggleFavorite(recipe.slug) }, isFavorite ? "Saved" : "Save"),
      ),
    ),
  );
}

function RecipePage({ favorites, toggleFavorite }) {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("recipe");
  const recipe = recipes.find((item) => item.slug === slug);
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [checkedSteps, setCheckedSteps] = useState([]);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    document.title = recipe ? `${recipe.title} | ItsAllGreekToMe` : "Recipe not found | ItsAllGreekToMe";
  }, [recipe]);

  if (!recipe) {
    return h(React.Fragment, null, h("header", { className: "page-header" }, h(Nav, { compact: true })), h("main", { className: "recipe-page" }, h("section", { className: "recipe-not-found" }, h("p", { className: "section-kicker" }, "Recipe"), h("h1", null, "Recipe not found"), h("p", null, "That recipe is not available yet."), h("a", { className: "recipe-card-link", href: "index.html#recipes" }, "Back to all recipes"))), h(Footer));
  }

  const isFavorite = favorites.includes(recipe.slug);

  function toggleChecked(value, setter) {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  return h(
    React.Fragment,
    null,
    h("header", { className: "page-header" }, h(Nav, { compact: true })),
    h(
      "main",
      { className: "recipe-page" },
      h(
        "article",
        null,
        h(
          "section",
          { className: "recipe-post-hero" },
          h(
            "div",
            { className: "recipe-post-copy" },
            h("p", { className: "section-kicker" }, recipe.category),
            h("h1", null, recipe.title),
            h("p", { className: "published" }, `Published: ${recipe.published}`),
            h("p", null, recipe.description),
            h(
              "div",
              { className: "hero-actions" },
              h("a", { className: "skip-link", href: "#recipe-card" }, "Jump to recipe"),
              h("button", { className: "favorite-button", type: "button", "aria-pressed": isFavorite, onClick: () => toggleFavorite(recipe.slug) }, isFavorite ? "Saved recipe" : "Save recipe"),
            ),
          ),
          h("img", { src: recipe.image, alt: recipe.title }),
        ),
        h("section", { className: "recipe-story" }, recipe.story.map((item) => h("p", { key: item }, item))),
        h(
          "section",
          { className: "recipe-details" },
          h("div", null, h("p", { className: "section-kicker" }, "Details"), h("h2", null, recipe.detailsTitle || "Recipe Notes")),
          h("ul", null, recipe.details.map((item) => h("li", { key: item }, item))),
        ),
        h(
          "section",
          { className: "full-recipe-card", id: "recipe-card" },
          h(
            "div",
            { className: "full-recipe-heading" },
            h("div", null, h("p", { className: "section-kicker" }, "Recipe"), h("h2", null, recipe.title)),
            h("div", { className: "recipe-tags" }, recipe.tags.map((tag) => h("span", { key: tag }, tag))),
          ),
          h(
            "div",
            { className: "cook-controls" },
            h("span", null, "Scale"),
            [1, 2, 3].map((value) => h("button", { key: value, type: "button", className: value === scale ? "active-scale" : "", onClick: () => setScale(value) }, `${value}x`)),
          ),
          h(
            "dl",
            { className: "recipe-stats" },
            h("div", null, h("dt", null, "Prep Time"), h("dd", null, recipe.prepTime)),
            h("div", null, h("dt", null, "Cook Time"), h("dd", null, recipe.cookTime)),
            h("div", null, h("dt", null, "Total Time"), h("dd", null, recipe.totalTime)),
            h("div", null, h("dt", null, "Servings"), h("dd", null, scale === 1 ? recipe.servings : `${recipe.servings} x ${scale}`)),
          ),
          h(
            "div",
            { className: "recipe-method" },
            h(
              "section",
              null,
              h("h3", null, "Ingredients"),
              h(
                "ul",
                { className: "ingredient-list check-list" },
                recipe.ingredientsList.map((item) =>
                  h("li", { key: item, className: checkedIngredients.includes(item) ? "checked" : "" }, h("label", null, h("input", { type: "checkbox", checked: checkedIngredients.includes(item), onChange: () => toggleChecked(item, setCheckedIngredients) }), h("span", null, item))),
                ),
              ),
            ),
            h(
              "section",
              null,
              h("h3", null, "Instructions"),
              h(
                "ol",
                { className: "instruction-list check-list" },
                recipe.instructions.map((item) =>
                  h("li", { key: item, className: checkedSteps.includes(item) ? "checked" : "" }, h("label", null, h("input", { type: "checkbox", checked: checkedSteps.includes(item), onChange: () => toggleChecked(item, setCheckedSteps) }), h("span", null, item))),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    h(Footer),
  );
}

function Footer() {
  return h("footer", { className: "footer" }, h("p", null, "ItsAllGreekToMe"), h("p", null, "Built as an interactive React recipe blog."));
}

ReactDOM.createRoot(document.querySelector("#app")).render(h(App));

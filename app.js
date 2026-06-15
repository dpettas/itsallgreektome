const { createElement: h, useEffect, useMemo, useState } = React;
const baseRecipes = Array.isArray(window.recipes) ? window.recipes : [];
const defaultRecipeImage = "images/greek-table.jpg";
const publishedRecipesPath = "data/published-recipes.json";

function getStoredFavorites() {
  try {
    return JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
  } catch {
    return [];
  }
}

function getStoredPublishConfig() {
  try {
    return JSON.parse(
      localStorage.getItem("githubPublishConfig") ||
        JSON.stringify({
          owner: "dpettas",
          repo: "itsallgreektome",
          branch: "main",
        }),
    );
  } catch {
    return {
      owner: "dpettas",
      repo: "itsallgreektome",
      branch: "main",
    };
  }
}

function getSessionToken() {
  return sessionStorage.getItem("githubPublishToken") || "";
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitLines(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(value) {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function toBase64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function fromBase64(value) {
  return decodeURIComponent(escape(atob(value.replace(/\n/g, ""))));
}

function dataUrlToBase64(dataUrl) {
  const parts = dataUrl.split(",");
  return parts.length > 1 ? parts[1] : "";
}

function dataUrlToExtension(dataUrl) {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
  if (!match) {
    return "jpg";
  }

  const type = match[1].toLowerCase();
  if (type === "jpeg") {
    return "jpg";
  }

  return type;
}

async function githubJsonRequest(path, { body, method = "GET", token }) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `GitHub request failed: ${response.status}`;

    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorMessage;
    } catch {
      const errorText = await response.text();
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

async function loadPublishedRecipes() {
  const response = await fetch(`${publishedRecipesPath}?t=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not load published recipes: ${response.status}`);
  }

  return response.json();
}

async function publishRecipeToGithub({ publishConfig, recipe, token }) {
  const owner = publishConfig.owner.trim();
  const repo = publishConfig.repo.trim();
  const branch = publishConfig.branch.trim() || "main";

  if (!owner || !repo) {
    throw new Error("Owner and repo are required.");
  }

  let publishedRecipe = { ...recipe };

  if (recipe.image.startsWith("data:image/")) {
    const extension = dataUrlToExtension(recipe.image);
    const imagePath = `images/user/${recipe.slug}-${Date.now()}.${extension}`;
    await githubJsonRequest(`/repos/${owner}/${repo}/contents/${imagePath}`, {
      method: "PUT",
      token,
      body: {
        message: `Add image for ${recipe.title}`,
        branch,
        content: dataUrlToBase64(recipe.image),
      },
    });
    publishedRecipe = {
      ...publishedRecipe,
      image: imagePath,
    };
  }

  let file = null;
  let currentRecipes = [];

  try {
    file = await githubJsonRequest(
      `/repos/${owner}/${repo}/contents/${publishedRecipesPath}?ref=${encodeURIComponent(branch)}`,
      { token },
    );
    currentRecipes = JSON.parse(fromBase64(file.content));
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Not Found")) {
      throw error;
    }
  }

  const nextRecipes = [publishedRecipe, ...currentRecipes];

  await githubJsonRequest(`/repos/${owner}/${repo}/contents/${publishedRecipesPath}`, {
    method: "PUT",
    token,
    body: {
      message: `Publish recipe ${recipe.title}`,
      branch,
      ...(file ? { sha: file.sha } : {}),
      content: toBase64(JSON.stringify(nextRecipes, null, 2) + "\n"),
    },
  });

  return publishedRecipe;
}

function App() {
  const page = document.querySelector("#app").dataset.page;
  const [favorites, setFavorites] = useState(getStoredFavorites);
  const [publishConfig, setPublishConfig] = useState(getStoredPublishConfig);
  const [githubToken, setGithubToken] = useState(getSessionToken);
  const [publishedRecipes, setPublishedRecipes] = useState([]);
  const recipes = useMemo(() => [...publishedRecipes, ...baseRecipes], [publishedRecipes]);

  useEffect(() => {
    localStorage.setItem("favoriteRecipes", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("githubPublishConfig", JSON.stringify(publishConfig));
  }, [publishConfig]);

  useEffect(() => {
    sessionStorage.setItem("githubPublishToken", githubToken);
  }, [githubToken]);

  useEffect(() => {
    let cancelled = false;

    loadPublishedRecipes()
      .then((items) => {
        if (!cancelled) {
          setPublishedRecipes(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPublishedRecipes([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleFavorite(slug) {
    setFavorites((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  function handlePublishedRecipe(recipe) {
    setPublishedRecipes((current) => [recipe, ...current]);
  }

  if (page === "recipe") {
    return h(RecipePage, { favorites, recipes, toggleFavorite });
  }

  return h(HomePage, {
    favorites,
    githubToken,
    onPublishRecipe: handlePublishedRecipe,
    publishConfig,
    recipes,
    setGithubToken,
    setPublishConfig,
    toggleFavorite,
  });
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

function MobileNav({ items }) {
  return h(
    "nav",
    { className: "mobile-nav", "aria-label": "Mobile navigation" },
    items.map((item) =>
      item.href
        ? h("a", { href: item.href, key: item.label }, h("span", null, item.icon), h("strong", null, item.label))
        : h("button", { type: "button", key: item.label, onClick: item.onClick }, h("span", null, item.icon), h("strong", null, item.label)),
    ),
  );
}

function HomePage({
  favorites,
  githubToken,
  onPublishRecipe,
  publishConfig,
  recipes,
  setGithubToken,
  setPublishConfig,
  toggleFavorite,
}) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  const allTags = useMemo(
    () => ["all", ...Array.from(new Set(recipes.flatMap((recipe) => recipe.tags))).sort()],
    [recipes],
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
  }, [activeTag, favorites, query, recipes, showFavorites]);

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
          h(
            "div",
            { className: "hero-actions" },
            h("a", { className: "hero-link", href: "#recipes" }, "Browse recipes"),
            h("button", { className: "hero-button", type: "button", onClick: () => setIsCreatorOpen(true) }, "Create recipe"),
          ),
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
          { className: "recipe-controls" },
          h(
            "div",
            { className: "interactive-row" },
            h("button", { className: "create-button", type: "button", onClick: () => setIsCreatorOpen(true) }, "Create recipe"),
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
            { className: "tag-shell" },
            h("p", null, "Categories"),
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
    isCreatorOpen &&
      h(RecipeCreator, {
        onClose: () => setIsCreatorOpen(false),
        onPublish: (recipe) => {
          onPublishRecipe(recipe);
          setIsCreatorOpen(false);
          setQuery("");
          setActiveTag("all");
          setShowFavorites(false);
          window.location.hash = "recipes";
        },
        githubToken,
        publishConfig,
        recipes,
        setGithubToken,
        setPublishConfig,
      }),
    h(Footer),
    h(MobileNav, {
      items: [
        { href: "#recipes", icon: "R", label: "Recipes" },
        { icon: "+", label: "Create", onClick: () => setIsCreatorOpen(true) },
        {
          icon: "S",
          label: "Saved",
          onClick: () => {
            setShowFavorites(true);
            window.location.hash = "recipes";
          },
        },
      ],
    }),
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

function RecipeCreator({
  githubToken,
  onClose,
  onPublish,
  publishConfig,
  recipes,
  setGithubToken,
  setPublishConfig,
}) {
  const [form, setForm] = useState({
    title: "",
    category: "Family Recipe",
    prepTime: "15 minutes",
    cookTime: "30 minutes",
    servings: "4 servings",
    description: "",
    tags: "greek, homemade",
    ingredients: "",
    instructions: "",
    story: "",
    details: "",
    image: "",
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 1200;
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        updateField("image", canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => updateField("image", reader.result);
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPublishError("");

    const title = form.title.trim();

    if (!title) {
      setPublishError("Add a recipe title.");
      return;
    }

    const slugBase = slugify(title || "new-recipe");
    const existingSlugs = new Set(recipes.map((recipe) => recipe.slug));
    let slug = slugBase;
    let suffix = 2;

    while (existingSlugs.has(slug)) {
      slug = `${slugBase}-${suffix}`;
      suffix += 1;
    }

    const ingredientsList = splitLines(form.ingredients);
    const instructions = splitLines(form.instructions);
    const tags = splitTags(form.tags);
    const prepTime = form.prepTime.trim();
    const cookTime = form.cookTime.trim();

    if (!ingredientsList.length) {
      setPublishError("Add at least one ingredient.");
      return;
    }

    if (!instructions.length) {
      setPublishError("Add at least one instruction.");
      return;
    }

    const recipe = {
      title,
      slug,
      category: form.category.trim() || "Recipe",
      time: cookTime || prepTime || "New",
      published: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      prepTime: prepTime || "Not set",
      cookTime: cookTime || "Not set",
      totalTime: [prepTime, cookTime].filter(Boolean).join(" + ") || "Not set",
      servings: form.servings.trim() || "Not set",
      description: form.description.trim() || "A homemade Greek recipe.",
      tags: tags.length ? tags : ["homemade"],
      ingredients: ingredientsList.slice(0, 5),
      ingredientsList: ingredientsList.length ? ingredientsList : ["Add ingredients"],
      instructions: instructions.length ? instructions : ["Add instructions"],
      story: splitLines(form.story).length
        ? splitLines(form.story)
        : [form.description.trim() || "A new recipe from the kitchen."],
      detailsTitle: "Recipe notes",
      details: splitLines(form.details).length
        ? splitLines(form.details)
        : ["Adjust seasoning to taste.", "Serve warm or at room temperature."],
      image: form.image || defaultRecipeImage,
    };

    if (!githubToken.trim()) {
      setPublishError("Enter a GitHub token with repository contents write access.");
      return;
    }

    setIsPublishing(true);

    try {
      const publishedRecipe = await publishRecipeToGithub({
        publishConfig,
        recipe,
        token: githubToken.trim(),
      });
      onPublish(publishedRecipe);
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : "Could not publish recipe to GitHub.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  return h(
    "div",
    { className: "modal-backdrop", role: "presentation" },
    h(
      "section",
      { className: "recipe-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "create-recipe-title" },
      h(
        "div",
        { className: "modal-heading" },
        h("div", null, h("p", { className: "section-kicker" }, "New Recipe"), h("h2", { id: "create-recipe-title" }, "Create recipe")),
        h("button", { className: "icon-close", type: "button", onClick: onClose, "aria-label": "Close" }, "x"),
      ),
        h(
          "form",
          { className: "recipe-form", onSubmit: handleSubmit },
          h(
            "section",
            { className: "publish-panel" },
            h("p", { className: "section-kicker" }, "GitHub Publish"),
            h(
              "div",
              { className: "form-grid" },
              h(FormField, {
                label: "Owner",
                value: publishConfig.owner,
                onChange: (value) =>
                  setPublishConfig((current) => ({ ...current, owner: value })),
              }),
              h(FormField, {
                label: "Repo",
                value: publishConfig.repo,
                onChange: (value) =>
                  setPublishConfig((current) => ({ ...current, repo: value })),
              }),
              h(FormField, {
                label: "Branch",
                value: publishConfig.branch,
                onChange: (value) =>
                  setPublishConfig((current) => ({ ...current, branch: value })),
              }),
              h(FormField, {
                label: "GitHub token",
                type: "password",
                value: githubToken,
                onChange: (value) => setGithubToken(value),
              }),
            ),
            h(
              "p",
              { className: "publish-note" },
              "Use a token with repository contents read/write access. The token is kept only in this browser session.",
            ),
          ),
          h(
            "div",
            { className: "form-grid" },
          h(FormField, { label: "Title", value: form.title, required: true, onChange: (value) => updateField("title", value) }),
          h(FormField, { label: "Category", value: form.category, onChange: (value) => updateField("category", value) }),
          h(FormField, { label: "Prep time", value: form.prepTime, onChange: (value) => updateField("prepTime", value) }),
          h(FormField, { label: "Cook time", value: form.cookTime, onChange: (value) => updateField("cookTime", value) }),
          h(FormField, { label: "Servings", value: form.servings, onChange: (value) => updateField("servings", value) }),
          h(FormField, { label: "Tags", value: form.tags, onChange: (value) => updateField("tags", value) }),
        ),
        h(FormField, { label: "Description", value: form.description, required: true, onChange: (value) => updateField("description", value) }),
        h(
          "div",
          { className: "image-picker" },
          h(
            "label",
            null,
            h("span", null, "Thumbnail image"),
            h("input", { type: "file", accept: "image/*", onChange: handleImageUpload }),
          ),
          h("img", { src: form.image || defaultRecipeImage, alt: "Recipe thumbnail preview" }),
        ),
        h(TextAreaField, { label: "Ingredients", value: form.ingredients, required: true, onChange: (value) => updateField("ingredients", value) }),
        h(TextAreaField, { label: "Instructions", value: form.instructions, required: true, onChange: (value) => updateField("instructions", value) }),
        h(TextAreaField, { label: "Story", value: form.story, onChange: (value) => updateField("story", value) }),
        h(TextAreaField, { label: "Notes", value: form.details, onChange: (value) => updateField("details", value) }),
        h(
          "div",
          { className: "modal-actions" },
          h("button", { className: "clear-button", type: "button", onClick: onClose }, "Cancel"),
          h(
            "button",
            { className: "create-button", disabled: isPublishing, type: "submit" },
            isPublishing ? "Publishing..." : "Publish recipe",
          ),
        ),
        publishError && h("p", { className: "publish-error" }, publishError),
      ),
    ),
  );
}

function FormField({ label, onChange, required = false, type = "text", value }) {
  return h(
    "label",
    { className: "form-field" },
    h("span", null, label),
    h("input", {
      required,
      type,
      value,
      onChange: (event) => onChange(event.target.value),
    }),
  );
}

function TextAreaField({ label, onChange, required = false, value }) {
  return h(
    "label",
    { className: "form-field" },
    h("span", null, label),
    h("textarea", {
      required,
      rows: 4,
      value,
      onChange: (event) => onChange(event.target.value),
    }),
  );
}

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

function parseQuantity(value) {
  if (!value) {
    return null;
  }

  const mixedMatch = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const numerator = Number(mixedMatch[2]);
    const denominator = Number(mixedMatch[3]);
    return whole + numerator / denominator;
  }

  const fractionMatch = value.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return Number(fractionMatch[1]) / Number(fractionMatch[2]);
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatQuantity(value) {
  const roundedWhole = Math.round(value);
  if (Math.abs(value - roundedWhole) < 0.001) {
    return String(roundedWhole);
  }

  const whole = Math.floor(value);
  const denominator = 8;
  let numerator = Math.round((value - whole) * denominator);

  if (numerator === denominator) {
    return String(whole + 1);
  }

  const divisor = gcd(numerator, denominator);
  numerator /= divisor;
  const reducedDenominator = denominator / divisor;
  const fraction = `${numerator}/${reducedDenominator}`;

  return whole ? `${whole} ${fraction}` : fraction;
}

function scaleIngredient(item, scale) {
  if (scale === 1) {
    return item;
  }

  const match = item.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?))(.*)$/);

  if (!match) {
    return item;
  }

  const quantity = parseQuantity(match[1]);

  if (quantity === null) {
    return item;
  }

  return `${formatQuantity(quantity * scale)}${match[2]}`;
}

function RecipePage({ favorites, recipes, toggleFavorite }) {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("recipe");
  const recipe = recipes.find((item) => item.slug === slug);
  const relatedRecipes = recipes.filter((item) => item.slug !== slug).slice(0, 4);
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
    h("header", { className: "page-header", id: "top" }, h(Nav, { compact: true })),
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
          h(
            "div",
            { className: "recipe-visual" },
            h("img", { src: recipe.image, alt: recipe.title }),
            h(
              "div",
              { className: "image-badge" },
              h("span", null, recipe.totalTime),
              h("strong", null, recipe.servings),
            ),
          ),
        ),
        h("section", { className: "recipe-story" }, recipe.story.map((item) => h("p", { key: item }, item))),
        h(
          "section",
          { className: "recipe-thumbnail-section", "aria-labelledby": "more-recipes-title" },
          h(
            "div",
            { className: "thumbnail-heading" },
            h("p", { className: "section-kicker" }, "More Recipes"),
            h("h2", { id: "more-recipes-title" }, "Keep browsing"),
          ),
          h(
            "div",
            { className: "thumbnail-strip" },
            relatedRecipes.map((item) =>
              h(
                "a",
                { className: "thumbnail-link", href: `recipe.html?recipe=${item.slug}`, key: item.slug },
                h("img", { src: item.image, alt: item.title, loading: "lazy" }),
                h("span", null, item.title),
              ),
            ),
          ),
        ),
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
            h("span", null, "Scale ingredients"),
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
                  h(
                    "li",
                    { key: item, className: checkedIngredients.includes(item) ? "checked" : "" },
                    h(
                      "label",
                      null,
                      h("input", { type: "checkbox", checked: checkedIngredients.includes(item), onChange: () => toggleChecked(item, setCheckedIngredients) }),
                      h("span", null, scaleIngredient(item, scale)),
                    ),
                  ),
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
    h(MobileNav, {
      items: [
        { href: "index.html#recipes", icon: "R", label: "Recipes" },
        { href: "#recipe-card", icon: "C", label: "Card" },
        { icon: "S", label: isFavorite ? "Saved" : "Save", onClick: () => toggleFavorite(recipe.slug) },
      ],
    }),
  );
}

function Footer() {
  return h("footer", { className: "footer" }, h("p", null, "ItsAllGreekToMe"), h("p", null, "Built as an interactive React recipe blog."));
}

ReactDOM.createRoot(document.querySelector("#app")).render(h(App));

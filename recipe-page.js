const params = new URLSearchParams(window.location.search);
const slug = params.get("recipe");
const recipes = Array.isArray(window.recipes) ? window.recipes : [];
const recipe = recipes.find((item) => item.slug === slug);
const page = document.querySelector("#recipe-page");

function listItems(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function paragraphs(items) {
  return items.map((item) => `<p>${item}</p>`).join("");
}

if (!recipe) {
  document.title = "Recipe not found | ItsAllGreekToMe";
  page.innerHTML = `
    <section class="recipe-not-found">
      <p class="section-kicker">Recipe</p>
      <h1>Recipe not found</h1>
      <p>That recipe is not available yet.</p>
      <a class="recipe-card-link" href="index.html#recipes">Back to all recipes</a>
    </section>
  `;
} else {
  document.title = `${recipe.title} | ItsAllGreekToMe`;
  page.innerHTML = `
    <article>
      <section class="recipe-post-hero">
        <div class="recipe-post-copy">
          <p class="section-kicker">${recipe.category}</p>
          <h1>${recipe.title}</h1>
          <p class="published">Published: ${recipe.published}</p>
          <p>${recipe.description}</p>
          <a class="skip-link" href="#recipe-card">Jump to recipe</a>
        </div>
        <img src="${recipe.image}" alt="${recipe.title}" />
      </section>

      <section class="recipe-story">
        ${paragraphs(recipe.story || [])}
      </section>

      <section class="recipe-details">
        <div>
          <p class="section-kicker">Details</p>
          <h2>${recipe.detailsTitle || "Recipe Notes"}</h2>
        </div>
        <ul>
          ${listItems(recipe.details || [])}
        </ul>
      </section>

      <section class="full-recipe-card" id="recipe-card">
        <div class="full-recipe-heading">
          <div>
            <p class="section-kicker">Recipe</p>
            <h2>${recipe.title}</h2>
          </div>
          <div class="recipe-tags">
            ${recipe.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
        </div>

        <dl class="recipe-stats">
          <div>
            <dt>Prep Time</dt>
            <dd>${recipe.prepTime}</dd>
          </div>
          <div>
            <dt>Cook Time</dt>
            <dd>${recipe.cookTime}</dd>
          </div>
          <div>
            <dt>Total Time</dt>
            <dd>${recipe.totalTime}</dd>
          </div>
          <div>
            <dt>Servings</dt>
            <dd>${recipe.servings}</dd>
          </div>
        </dl>

        <div class="recipe-method">
          <section>
            <h3>Ingredients</h3>
            <ul class="ingredient-list">
              ${listItems(recipe.ingredientsList || recipe.ingredients)}
            </ul>
          </section>

          <section>
            <h3>Instructions</h3>
            <ol class="instruction-list">
              ${listItems(recipe.instructions || [])}
            </ol>
          </section>
        </div>
      </section>
    </article>
  `;
}

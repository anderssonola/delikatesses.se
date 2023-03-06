const path = require("path");
const glob = require("fast-glob");
const { DateTime } = require("luxon");
const CleanCSS = require("clean-css");
const UglifyJS = require("uglify-js");
const htmlmin = require("html-minifier");
const svgSprite = require("eleventy-plugin-svg-sprite");

module.exports = function (eleventyConfig) {
  // Configuration API: use eleventyConfig.addLayoutAlias(from, to) to add
  // layout aliases! Say you have a bunch of existing content using
  // layout: post. If you don’t want to rewrite all of those values, just map
  // post to a new file like this:
  // eleventyConfig.addLayoutAlias("post", "layouts/my_new_post_layout.njk");

  // Merge data instead of overriding
  // https://www.11ty.dev/docs/data-deep-merge/
  eleventyConfig.setDataDeepMerge(true);

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByGlob("./posts/**/*.md")
  );

  // Add support for maintenance-free post authors
  // Adds an authors collection using the author key in our post frontmatter
  // Thanks to @pdehaan: https://github.com/pdehaan
  eleventyConfig.addCollection("authors", (collection) => {
    const blogs = collection.getFilteredByGlob("posts/**/*.md");
    return blogs.reduce((coll, post) => {
      const author = post.data.author;
      if (!author) {
        return coll;
      }
      if (!coll.hasOwnProperty(author)) {
        coll[author] = [];
      }
      coll[author].push(post.data);
      return coll;
    }, {});
  });

  // Date formatting (human readable)
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toFormat("dd LLL yyyy");
  });

  // Date formatting (machine readable)
  eleventyConfig.addFilter("machineDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toFormat("yyyy-MM-dd");
  });

  // Filters
  glob.sync("./_filters/*.js").forEach((file) => {
    let filters = require("./" + file);
    Object.keys(filters).forEach((name) =>
      eleventyConfig.addFilter(name, filters[name])
    );
  });

  // Minify CSS
  eleventyConfig.addFilter("cssmin", function (code) {
    return new CleanCSS({}).minify(code).styles;
  });

  // Minify JS
  eleventyConfig.addFilter("jsmin", function (code) {
    let minified = UglifyJS.minify(code);
    if (minified.error) {
      console.log("UglifyJS error: ", minified.error);
      return code;
    }
    return minified.code;
  });

  // Minify HTML output
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (outputPath.indexOf(".html") > -1) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }
    return content;
  });

  // Don't process folders with static assets e.g. images
  eleventyConfig.addPassthroughCopy("favicon.ico");
  // eleventyConfig.addPassthroughCopy("static/img");
  eleventyConfig.addPassthroughCopy("admin/");
  eleventyConfig.addPassthroughCopy("_includes/assets/css/app.css");
  eleventyConfig.addPassthroughCopy("_includes/assets/css/water.css");
  eleventyConfig.addPassthroughCopy({ "robots.txt": "/robots.txt" });

  /* Markdown Plugins */
  let markdownIt = require("markdown-it");
  let unresolvedImages = [];
  eleventyConfig.setLibrary(
    "md",
    markdownIt({
      breaks: true,
      linkify: true,
    })
      .use(require("markdown-it-anchor"), {
        permalink: false,
      })
      .use(require("markdown-it-eleventy-img"), {
        resolvePath: (filepath, env) => path.join(process.cwd(), filepath),
        imgOptions: {
          outputDir: path.join("_site", "/img"),
          formats: ["avif", "webp", "jpeg"],
          loading: "lazy",
          widths: [1000, 800, 600, 400],
        },
        globalAttributes: {
          class: "image image-markdown",
          decoding: "async",
          sizes: "100vw"
        },
        renderImage(image, attributes) {
          const [Image, options] = image;
          const [src, attrs] = attributes;

          try {
            Image(src, options);
            const metadata = Image.statsSync(src, options);
            const imageMarkup = Image.generateHTML(metadata, attrs, {
              whitespaceMode: "inline",
            });
            console.log("Unresolved image path", src)
            return imageMarkup;
          } catch (e) {
            return `<span class="image image--fallback"><svg focusable="false" viewBox="0 0 24 24" class="svg-icon image__icon" aria-hidden="true"><path d="m2.3979 2.414 19.1846 19.1907-1.3978 1.3965-3.0002-3.0011H3V5.8113L1 3.8106l1.3979-1.3965zM15.185 18.0002l-1.9994-2H6.5l2.6748-4.0122L5 7.8119V18h10.1851z" fill-rule="evenodd" clip-rule="evenodd"></path><path d="m6.8114 4.0001 1.9994 2H19v10.1924l2 2.0006V4.0001H6.8114z"></path><path d="M14 9.5001c0 .8284.6716 1.5 1.5 1.5s1.5-.6716 1.5-1.5-.6716-1.5-1.5-1.5-1.5.6716-1.5 1.5z"></path></svg></span>`
          }
        },
      })
  );

  // SVG sprite plugin
  eleventyConfig.addPlugin(svgSprite, {
    path: "./static/svg", // relative path to SVG directory
    // (MUST be defined when initialising plugin)
  });

  return {
    templateFormats: ["md", "njk", "liquid"],

    // If your site lives in a different subdirectory, change this.
    // Leading or trailing slashes are all normalized away, so don’t worry about it.
    // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
    // This is only used for URLs (it does not affect your file structure)
    pathPrefix: "/",

    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
};

// backend/server.js
// =======================================
// ✅ SSR React + Express Setup (No EJS)
// =======================================

// --- Enable Babel for JSX transpilation ---
require('ignore-styles');
require('@babel/register')({
  extensions: ['.js', '.jsx'],
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  ignore: [/(node_modules)/],
  cache: false,
});

// --- Dependencies ---
const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

// --- Import the root React App (SSR entry) ---
const App = require('../frontend/src/App').default;

const app = express();
const PORT = process.env.PORT || 5000;

// --- Serve Static React Build Files ---
const buildPath = path.resolve(__dirname, '..', 'frontend', 'build');
app.use(express.static(buildPath));

// =======================================
// ✅ Helper Function for HTML Injection
// =======================================
function injectHTML(htmlTemplate, { appHTML, initialData, seo }) {
  return htmlTemplate
    // Inject rendered React markup
    .replace('<div id="root"></div>', `<div id="root">${appHTML}</div>`)
    // Inject initial state for client hydration
    .replace(
      '</body>',
      `<script>window.__INITIAL_DATA__ = ${initialData}</script></body>`
    )
    // Inject SEO meta tags
    .replace(/__SEO_TITLE__/g, seo.title)
    .replace(/__SEO_DESCRIPTION__/g, seo.description)
    .replace(/__SEO_KEYWORDS__/g, seo.keywords);
}

// =======================================
// ✅ SSR Rendering Route
// =======================================
app.get('/', async (req, res) => {
  try {
    // 1️⃣ Fetch Product Data
    const { data: products } = await axios.get('https://fakestoreapi.com/products');
    const initialData = JSON.stringify(products);

    // 2️⃣ SEO Meta Info
    const seo = {
      title: 'Discover Our Products – Shop Smart',
      description: 'Explore trending items from FakeStore API — discover, filter, and shop smarter.',
      keywords: 'ecommerce, products, online store, fashion, shopping',
    };

    // 3️⃣ Render React Component to HTML
    const appHTML = ReactDOMServer.renderToString(
      React.createElement(App, { products })
    );

    // 4️⃣ Load the HTML template
    const htmlFilePath = path.join(buildPath, 'index.html');
    if (!fs.existsSync(htmlFilePath)) {
      return res.status(500).send('❌ Build index.html not found. Run `npm run build` in frontend.');
    }

    let htmlData = fs.readFileSync(htmlFilePath, 'utf-8');

    // 5️⃣ Inject SSR + SEO data into template
    const finalHTML = injectHTML(htmlData, { appHTML, initialData, seo });

    // 6️⃣ Send the rendered page
    res.send(finalHTML);
  } catch (error) {
    console.error('❌ SSR Error:', error);
    res.status(500).send('An error occurred during server-side rendering.');
  }
});

// =======================================
// ✅ Fallback: Serve React App for Other Routes
// (For SPA client-side routing like /product/:id)
// =======================================
app.get('*', (req, res) => {
  const htmlFilePath = path.join(buildPath, 'index.html');
  if (fs.existsSync(htmlFilePath)) {
    const htmlData = fs.readFileSync(htmlFilePath, 'utf-8');
    const seo = {
      title: 'Shop Smart – Explore Products',
      description: 'Your one-stop shop for the latest and greatest products.',
      keywords: 'ecommerce, shopping, deals',
    };
    const finalHTML = injectHTML(htmlData, { appHTML: '', initialData: '[]', seo });
    res.send(finalHTML);
  } else {
    res.status(404).send('404 - Page not found');
  }
});

// =======================================
// ✅ Start Server
// =======================================
app.listen(PORT, () => {
  console.log(`🚀 SSR Server running → http://localhost:${PORT}`);
});

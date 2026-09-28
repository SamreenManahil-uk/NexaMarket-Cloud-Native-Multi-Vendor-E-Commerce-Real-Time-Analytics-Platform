<script setup lang="ts">
import SiteHeader from "./components/SiteHeader.vue";
</script>
<template>
  <a href="#main" class="skip-link">Skip to content</a>
  <SiteHeader />
  <main id="main" class="container" tabindex="-1"><RouterView /></main>
  <footer class="site-footer">
    <div class="container">
      <div>
        <RouterLink to="/" class="brand"
          >NexaMarket<span class="brand-dot">.</span></RouterLink
        >
        <p>A brighter place for everyday discoveries.</p>
      </div>
      <span class="development-label"
        >Development catalogue · Fictional listings</span
      ><RouterLink to="/">Explore the marketplace ↗</RouterLink>
    </div>
  </footer>
</template>

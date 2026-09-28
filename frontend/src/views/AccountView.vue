<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { authStore } from "../stores/auth";

const router = useRouter();
const user = computed(() => authStore.state.user);

const initials = computed(() => {
  if (!user.value) return "NM";

  return (
    user.value.firstName.charAt(0) +
    user.value.lastName.charAt(0)
  ).toUpperCase();
});

const memberSince = computed(() => {
  if (!user.value?.createdAt) return "";

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(user.value.createdAt));
});

async function logout(): Promise<void> {
  authStore.logout();
  await router.push("/");
}
</script>

<template>
  <main v-if="user" class="nx-account">
    <div class="nx-account-shell">
      <nav class="nx-account-breadcrumb">
        <RouterLink to="/">Home</RouterLink>
        <span>›</span>
        <strong>My account</strong>
      </nav>

      <section class="nx-account-hero">
        <div class="nx-account-identity">
          <div class="nx-account-avatar">
            {{ initials }}
          </div>

          <div>
            <span>MY NEXAMARKET</span>
            <h1>
              Welcome back,
              {{ user.firstName }}.
            </h1>
            <p>
              Manage your shopping activity from one place.
            </p>
          </div>
        </div>

        <RouterLink
          to="/#catalogue"
          class="nx-account-shop"
        >
          Explore marketplace
          <span>→</span>
        </RouterLink>
      </section>

      <section class="nx-account-layout">
        <aside class="nx-account-nav">
          <div class="nx-account-nav-title">
            <span>ACCOUNT</span>
            <strong>Overview</strong>
          </div>

          <RouterLink
            to="/account"
            class="active"
          >
            <span>⌂</span>
            Dashboard
          </RouterLink>

          <RouterLink to="/orders">
            <span>▱</span>
            My orders
          </RouterLink>

          <RouterLink to="/wishlist">
            <span>♡</span>
            Wishlist
          </RouterLink>

          <RouterLink to="/cart">
            <span>Bag</span>
            Shopping cart
          </RouterLink>

          <RouterLink to="/nexa-ai">
            <span>AI</span>
            Nexa AI
          </RouterLink>

          <div class="nx-account-nav-divider"></div>

          <button
            type="button"
            @click="logout"
          >
            <span>↗</span>
            Sign out
          </button>
        </aside>

        <div class="nx-account-content">
          <section class="nx-account-intro">
            <div>
              <span>DASHBOARD</span>
              <h2>Your marketplace, your way.</h2>
              <p>
                Jump back into your orders, wishlist,
                shopping cart or Nexa AI assistant.
              </p>
            </div>

            <div class="nx-account-secure">
              <span>✓</span>
              <div>
                <strong>Authenticated session</strong>
                <p>Your account is currently signed in.</p>
              </div>
            </div>
          </section>

          <section class="nx-account-actions">
            <RouterLink
              to="/orders"
              class="nx-account-action orders"
            >
              <div class="nx-action-icon">▱</div>
              <span>SHOPPING ACTIVITY</span>
              <h3>My orders</h3>
              <p>
                Review your order history, totals,
                products and current order status.
              </p>
              <strong>
                View order history
                <span>→</span>
              </strong>
            </RouterLink>

            <RouterLink
              to="/wishlist"
              class="nx-account-action wishlist"
            >
              <div class="nx-action-icon">♡</div>
              <span>SAVED FOR LATER</span>
              <h3>Wishlist</h3>
              <p>
                Return to products you've saved from
                the NexaMarket catalogue.
              </p>
              <strong>
                Open wishlist
                <span>→</span>
              </strong>
            </RouterLink>

            <RouterLink
              to="/cart"
              class="nx-account-action cart"
            >
              <div class="nx-action-icon">Bag</div>
              <span>READY TO CHECK OUT</span>
              <h3>Shopping cart</h3>
              <p>
                Review selected products and continue
                through simulated checkout.
              </p>
              <strong>
                View cart
                <span>→</span>
              </strong>
            </RouterLink>

            <RouterLink
              to="/nexa-ai"
              class="nx-account-action ai"
            >
              <div class="nx-action-icon">AI</div>
              <span>SMART DISCOVERY</span>
              <h3>Ask Nexa AI</h3>
              <p>
                Search the live catalogue by product,
                category or budget using natural language.
              </p>
              <strong>
                Start a conversation
                <span>→</span>
              </strong>
            </RouterLink>
          </section>

          <section class="nx-account-bottom">
            <article class="nx-account-profile">
              <div class="nx-account-section-head">
                <div>
                  <span>PROFILE</span>
                  <h3>Account details</h3>
                </div>

                <span class="nx-account-role">
                  {{ user.role }}
                </span>
              </div>

              <div class="nx-profile-grid">
                <div>
                  <span>FULL NAME</span>
                  <strong>
                    {{ user.firstName }}
                    {{ user.lastName }}
                  </strong>
                </div>

                <div>
                  <span>EMAIL ADDRESS</span>
                  <strong>{{ user.email }}</strong>
                </div>

                <div>
                  <span>MEMBER SINCE</span>
                  <strong>{{ memberSince }}</strong>
                </div>

                <div>
                  <span>ACCOUNT TYPE</span>
                  <strong>{{ user.role }}</strong>
                </div>
              </div>
            </article>

            <article class="nx-account-help">
              <span>NEXA AI</span>
              <h3>
                Need help finding your next product?
              </h3>
              <p>
                Ask Nexa AI to search the current
                marketplace catalogue for you.
              </p>

              <RouterLink to="/nexa-ai">
                Ask Nexa AI →
              </RouterLink>
            </article>
          </section>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.nx-account {
  min-height: 75vh;
  padding: 34px 0 80px;
  background: #f7f7f3;
  color: #18382e;
}

.nx-account-shell {
  width: min(calc(100% - 48px), 1280px);
  margin: 0 auto;
}

.nx-account-breadcrumb {
  display: flex;
  gap: 9px;
  margin-bottom: 28px;
  color: #7a817d;
  font-size: 13px;
}

.nx-account-breadcrumb a {
  color: inherit;
  text-decoration: none;
}

.nx-account-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
  padding: 36px 40px;
  margin-bottom: 25px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 85% 30%, rgba(246,208,85,.23), transparent 28%),
    #173f32;
  color: #fff;
}

.nx-account-identity {
  display: flex;
  gap: 22px;
  align-items: center;
}

.nx-account-avatar {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 50%;
  background: rgba(255,255,255,.12);
  font-size: 23px;
  font-weight: 900;
}

.nx-account-identity span,
.nx-account-intro > div > span,
.nx-account-action > span,
.nx-account-section-head > div > span,
.nx-account-help > span {
  color: #3a785f;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .13em;
}

.nx-account-identity > div > span {
  color: #f2d25e;
}

.nx-account-identity h1 {
  margin: 5px 0;
  font-size: clamp(32px, 4vw, 48px);
  letter-spacing: -.04em;
}

.nx-account-identity p {
  margin: 0;
  color: #cbdad4;
}

.nx-account-shop {
  display: flex;
  gap: 28px;
  align-items: center;
  min-height: 48px;
  padding: 0 20px;
  border-radius: 999px;
  background: #fff;
  color: #173f32;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}

.nx-account-layout {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 25px;
  align-items: start;
}

.nx-account-nav {
  position: sticky;
  top: 20px;
  overflow: hidden;
  padding: 15px;
  border: 1px solid #e1e5df;
  border-radius: 19px;
  background: #fff;
}

.nx-account-nav-title {
  padding: 10px 11px 18px;
}

.nx-account-nav-title span {
  display: block;
  margin-bottom: 4px;
  color: #8b918d;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .12em;
}

.nx-account-nav a,
.nx-account-nav button {
  display: flex;
  gap: 11px;
  align-items: center;
  width: 100%;
  min-height: 45px;
  padding: 0 11px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #59635e;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
}

.nx-account-nav a > span,
.nx-account-nav button > span {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  border-radius: 8px;
  background: #f0f2ed;
  color: #2a624c;
  font-size: 10px;
  font-weight: 900;
}

.nx-account-nav a.active {
  background: #edf3ef;
  color: #174d39;
}

.nx-account-nav-divider {
  height: 1px;
  margin: 12px 8px;
  background: #e9ebe7;
}

.nx-account-content {
  display: grid;
  gap: 22px;
}

.nx-account-intro {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  padding: 30px;
  border: 1px solid #e1e5df;
  border-radius: 20px;
  background: #fff;
}

.nx-account-intro h2 {
  margin: 6px 0 8px;
  font-size: 30px;
  letter-spacing: -.035em;
}

.nx-account-intro p {
  max-width: 570px;
  margin: 0;
  color: #747d77;
  line-height: 1.55;
}

.nx-account-secure {
  display: flex;
  gap: 11px;
  align-items: center;
  min-width: 230px;
  padding: 13px 16px;
  border-radius: 13px;
  background: #eef5f0;
}

.nx-account-secure > span {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #1d6549;
  color: #fff;
}

.nx-account-secure p {
  margin-top: 3px;
  font-size: 11px;
}

.nx-account-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 17px;
}

.nx-account-action {
  position: relative;
  min-height: 220px;
  padding: 25px;
  overflow: hidden;
  border: 1px solid #e1e5df;
  border-radius: 20px;
  background: #fff;
  color: #18382e;
  text-decoration: none;
  transition: transform .18s ease, box-shadow .18s ease;
}

.nx-account-action:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 35px rgba(26,59,48,.08);
}

.nx-action-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 27px;
  border-radius: 13px;
  background: #edf3ef;
  color: #18563f;
  font-size: 13px;
  font-weight: 900;
}

.nx-account-action.wishlist .nx-action-icon {
  background: #fff0ef;
  color: #a4514b;
}

.nx-account-action.cart .nx-action-icon {
  background: #fff5d9;
  color: #836618;
}

.nx-account-action.ai {
  background: #183f32;
  color: #fff;
  border-color: #183f32;
}

.nx-account-action.ai .nx-action-icon {
  background: rgba(255,255,255,.12);
  color: #f2d25e;
}

.nx-account-action.ai > span {
  color: #f2d25e;
}

.nx-account-action h3 {
  margin: 6px 0 8px;
  font-size: 24px;
  letter-spacing: -.025em;
}

.nx-account-action p {
  max-width: 410px;
  margin: 0 0 22px;
  color: #747d77;
  font-size: 13px;
  line-height: 1.55;
}

.nx-account-action.ai p {
  color: #c9d9d3;
}

.nx-account-action > strong {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  font-size: 12px;
}

.nx-account-bottom {
  display: grid;
  grid-template-columns: 1.5fr .75fr;
  gap: 17px;
}

.nx-account-profile,
.nx-account-help {
  padding: 27px;
  border: 1px solid #e1e5df;
  border-radius: 20px;
  background: #fff;
}

.nx-account-section-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}

.nx-account-section-head h3,
.nx-account-help h3 {
  margin: 5px 0 0;
  font-size: 22px;
}

.nx-account-role {
  height: fit-content;
  padding: 7px 10px;
  border-radius: 999px;
  background: #edf3ef;
  color: #236149;
  font-size: 10px;
  font-weight: 900;
}

.nx-profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.nx-profile-grid div {
  padding-top: 14px;
  border-top: 1px solid #eceeea;
}

.nx-profile-grid span {
  display: block;
  margin-bottom: 6px;
  color: #949a96;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .09em;
}

.nx-profile-grid strong {
  overflow-wrap: anywhere;
  font-size: 13px;
}

.nx-account-help {
  background: #f7e7e3;
  border-color: #f0d9d4;
}

.nx-account-help > span {
  color: #9b5149;
}

.nx-account-help p {
  color: #785f5a;
  font-size: 13px;
  line-height: 1.55;
}

.nx-account-help a {
  display: inline-block;
  margin-top: 15px;
  color: #7e3f39;
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
}

@media (max-width: 920px) {
  .nx-account-layout {
    grid-template-columns: 1fr;
  }

  .nx-account-nav {
    position: static;
    display: flex;
    gap: 5px;
    overflow-x: auto;
  }

  .nx-account-nav-title,
  .nx-account-nav-divider {
    display: none;
  }

  .nx-account-nav a,
  .nx-account-nav button {
    flex: 0 0 auto;
    width: auto;
  }

  .nx-account-bottom {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .nx-account-shell {
    width: min(calc(100% - 28px), 1280px);
  }

  .nx-account-hero,
  .nx-account-intro {
    align-items: flex-start;
    flex-direction: column;
  }

  .nx-account-actions,
  .nx-profile-grid {
    grid-template-columns: 1fr;
  }

  .nx-account-avatar {
    width: 58px;
    height: 58px;
    flex-basis: 58px;
  }

  .nx-account-hero {
    padding: 27px;
  }

  .nx-account-shop {
    width: 100%;
    justify-content: space-between;
    box-sizing: border-box;
  }

  .nx-account-secure {
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }
}
</style>

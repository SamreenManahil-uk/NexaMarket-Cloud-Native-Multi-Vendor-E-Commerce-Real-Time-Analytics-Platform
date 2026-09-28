<script setup lang="ts">
import { computed } from "vue";
import { artworkKind } from "../utils/artwork";
const props = defineProps<{ name?: string; category?: string }>();
const kind = computed(() => artworkKind(props.name || "", props.category));
</script>
<template>
  <svg
    class="category-artwork"
    viewBox="0 0 240 200"
    fill="none"
    aria-hidden="true"
  >
    <ellipse
      cx="122"
      cy="174"
      rx="66"
      ry="9"
      fill="currentColor"
      opacity=".12"
    />
    <g
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <g v-if="kind === 'lamp'">
        <path d="M91 165h72l-8-9h-54z" fill="currentColor" />
        <path d="M125 155V107l35-55-27-12" stroke-width="8" />
        <path d="m111 30 34 23-27 38-51-34z" fill="currentColor" />
        <path d="m67 57 51 34" stroke="#fff" stroke-width="7" />
        <circle cx="127" cy="106" r="7" fill="#fff" />
      </g>
      <g v-else-if="kind === 'notebook'" transform="rotate(-12 120 100)">
        <rect x="69" y="30" width="105" height="137" rx="9" fill="#fff" />
        <rect
          x="62"
          y="25"
          width="105"
          height="137"
          rx="9"
          fill="currentColor"
        />
        <path d="M81 26v134" stroke="#fff" opacity=".5" />
        <path d="M99 66h48M99 77h31" stroke="#fff" />
        <rect
          x="143"
          y="26"
          width="7"
          height="135"
          fill="#fff"
          opacity=".2"
          stroke="none"
        />
      </g>
      <g v-else-if="kind === 'pens'" transform="rotate(18 120 100)">
        <path d="M85 44h15v103l-7 20-8-20z" fill="currentColor" />
        <path d="M116 30h15v117l-7 20-8-20z" fill="#fff" />
        <path d="M147 53h15v94l-7 20-8-20z" fill="currentColor" opacity=".55" />
        <path d="M88 59h8m23-14h8m23 23h8" stroke="#fff" />
      </g>
      <g v-else-if="kind === 'mug'">
        <path d="M160 77h14c35 0 29 57-12 52" stroke-width="13" />
        <path d="M64 64h99v76c0 39-99 39-99 0z" fill="currentColor" />
        <ellipse cx="114" cy="64" rx="49" ry="12" fill="#fff" />
        <ellipse
          cx="114"
          cy="66"
          rx="38"
          ry="6"
          fill="currentColor"
          opacity=".25"
        />
        <path
          d="M81 88v45c0 9 5 15 13 18"
          stroke="#fff"
          opacity=".5"
          stroke-width="7"
        />
      </g>
      <g v-else-if="kind === 'bottle'">
        <rect
          x="100"
          y="25"
          width="40"
          height="20"
          rx="6"
          fill="currentColor"
        />
        <path
          d="M101 45v15c0 12-19 16-19 32v63c0 20 76 20 76 0V92c0-16-19-20-19-32V45"
          fill="currentColor"
        />
        <path d="M82 94h76v43H82z" fill="#fff" opacity=".85" />
        <path d="m111 119 9-14 10 14-10 9z" fill="currentColor" />
        <path d="M96 78v9" stroke="#fff" stroke-width="6" />
      </g>
      <g v-else-if="kind === 'tote'">
        <path d="m73 66-11 99q58 15 116 0L167 66z" fill="currentColor" />
        <path d="M96 84V52c0-34 48-34 48 0v32" stroke-width="9" />
        <path d="M96 84V52c0-34 48-34 48 0v32" stroke="#fff" stroke-width="4" />
        <path
          d="m106 123 14-18 14 18-14 19z"
          fill="#fff"
          stroke="none"
          opacity=".85"
        />
      </g>
      <g v-else-if="kind === 'pouch'">
        <path d="M69 70h104l14 84q-67 23-134 0z" fill="currentColor" />
        <path d="M72 77h96" stroke="#fff" stroke-width="6" />
        <path d="M151 78v18h9V79" stroke="#fff" />
        <path d="M76 144q43 12 86 0" stroke="#fff" opacity=".4" />
      </g>
      <g v-else-if="kind === 'blanket'">
        <path d="m61 51 111-12 20 113-115 17z" fill="currentColor" />
        <path
          d="m84 49 17 115m10-118 17 114m11-117 17 113M67 79l109-13M71 107l109-13M77 136l109-13"
          stroke="#fff"
          opacity=".5"
          stroke-width="8"
        />
        <path
          d="m79 171 2 9m13-11 2 9m13-11 2 9m13-11 2 9m13-11 2 9m13-11 2 9m13-11 2 9"
        />
      </g>
      <g v-else-if="kind === 'basket'">
        <path d="m59 78 14 83q48 18 96 0l14-83" fill="currentColor" />
        <ellipse cx="121" cy="78" rx="62" ry="17" fill="#fff" />
        <path
          d="M89 65V51c0-22 64-22 64 0v14M66 103h110M69 123h104M73 144h97M87 95l7 66m23-64v68m26-69-4 65m24-69-8 66"
          stroke="#fff"
          opacity=".5"
        />
      </g>
      <g v-else>
        <path d="m60 67 60-28 60 28v79l-60 30-60-30z" fill="currentColor" />
        <path d="m60 67 60 29 60-29M120 96v80M91 54l60 29v27" stroke="#fff" />
      </g>
    </g>
  </svg>
</template>

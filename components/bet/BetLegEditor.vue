<script setup>
const props = defineProps({ legs: { type: Array, default: () => [] } })
const emit = defineEmits(['update:legs', 'add', 'remove'])

function update(index, key, value) {
  emit(
    'update:legs',
    props.legs.map((leg, itemIndex) => (itemIndex === index ? { ...leg, [key]: value } : leg))
  )
}
</script>

<template>
  <div class="legs-editor">
    <div class="legs-heading">
      <div>
        <strong>Accumulator legs</strong><small>Add every match and pick in your bet.</small>
      </div>
      <button class="outline-button" type="button" @click="$emit('add')">＋ Add leg</button>
    </div>
    <div v-for="(leg, index) in legs" :key="index" class="leg-row">
      <div class="leg-number">{{ index + 1 }}</div>
      <div class="leg-fields">
        <label class="sr-only" :for="`match-${index}`">Match {{ index + 1 }}</label
        ><input
          :id="`match-${index}`"
          :value="leg.match"
          placeholder="Match, e.g. Arsenal v Chelsea"
          @input="update(index, 'match', $event.target.value)"
        />
        <div class="leg-subfields">
          <label class="sr-only" :for="`market-${index}`">Market {{ index + 1 }}</label
          ><select
            :id="`market-${index}`"
            :value="leg.market"
            @change="update(index, 'market', $event.target.value)"
          >
            <option>Match result</option>
            <option>Both teams to score</option>
            <option>Total goals</option></select
          ><label class="sr-only" :for="`pick-${index}`">Pick {{ index + 1 }}</label
          ><input
            :id="`pick-${index}`"
            :value="leg.pick"
            placeholder="Pick"
            @input="update(index, 'pick', $event.target.value)"
          /><label class="sr-only" :for="`odds-${index}`">Fractional odds {{ index + 1 }}</label
          ><input
            :id="`odds-${index}`"
            :value="leg.odds"
            type="text"
            inputmode="text"
            placeholder="1/2"
            aria-label="Fractional odds"
            @input="update(index, 'odds', $event.target.value)"
          /><button
            v-if="legs.length > 1"
            class="remove-leg"
            type="button"
            :aria-label="`Remove leg ${index + 1}`"
            @click="$emit('remove', index)"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

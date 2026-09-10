<script setup>
const props = defineProps({ betType: { type: String, default: 'Accumulator' } })
const emit = defineEmits(['parsed'])
const fileInput = ref(null)
const previewUrl = ref('')
const loading = ref(false)
const error = ref('')

function pickFile() {
  fileInput.value?.click()
}

// Full-resolution phone screenshots can land close to hosting platforms' request-body
// limits (e.g. Vercel serverless functions cap around 4.5MB) — a big screenshot can get
// silently mangled in transit and arrive at the API with no usable file data. Shrink
// anything oversized client-side first; the OCR doesn't need retina resolution to work.
async function compressForUpload(file, maxDimension = 1600, quality = 0.85) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file
  if (file.size < 1.5 * 1024 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    // Best-effort — if compression fails for any reason, fall back to the original file.
    return file
  }
}

async function handleFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  error.value = ''
  previewUrl.value = URL.createObjectURL(file)
  loading.value = true
  try {
    const uploadFile = await compressForUpload(file)
    const formData = new FormData()
    formData.append('image', uploadFile)
    formData.append('betType', props.betType)
    const result = await $fetch('/api/betslip/parse', { method: 'POST', body: formData })
    emit('parsed', result)
  } catch (err) {
    error.value = err.data?.statusMessage || 'Could not read that bet slip. Try a clearer screenshot.'
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="slip-upload">
    <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
    <button type="button" class="slip-upload-dropzone" :disabled="loading" @click="pickFile">
      <img v-if="previewUrl" :src="previewUrl" alt="Bet slip preview" class="slip-upload-preview" />
      <template v-else>
        <span class="slip-upload-icon">📸</span>
        <span>Upload a screenshot of your bet slip</span>
      </template>
    </button>
    <p v-if="loading" class="builder-hint"><LoadingSpinner label="Reading your slip…" inline small /></p>
    <p v-else-if="error" class="builder-error">{{ error }}</p>
    <p v-else class="slip-upload-hint">We'll prefill the selections below — check them over before saving.</p>
  </div>
</template>

<style scoped>
.slip-upload {
  display: grid;
  gap: 8px;
}

.slip-upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 120px;
  padding: 16px;
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: #fafaff;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
}

.slip-upload-dropzone:disabled {
  opacity: 0.6;
  cursor: wait;
}

.slip-upload-icon {
  font-size: 24px;
}

.slip-upload-preview {
  max-height: 160px;
  max-width: 100%;
  border-radius: 6px;
  object-fit: contain;
}

.slip-upload-hint {
  color: var(--muted);
  font-size: 9px;
}
</style>

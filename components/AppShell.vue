<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="app-main">
      <AppTopBar />
      <main class="app-page"><slot /></main>
    </div>
    <MobileBottomNav />
  </div>
</template>

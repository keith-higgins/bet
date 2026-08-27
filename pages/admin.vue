<template>
  <div class="page-wrap manage-page">
    <section class="page-heading">
      <p class="overline">LEAGUE MANAGEMENT</p>
      <h1>Manage</h1>
      <p class="subheading">Manage players and keep each Premier League week moving.</p>
    </section>
    <div class="manage-grid">
      <PlayerInviteForm /><NuxtLink class="admin-form-card manage-link-card" to="/challenges"
        ><div class="card-icon">↗</div>
        <div>
          <p class="overline">ROUNDS</p>
          <h2>Manage weeks</h2>
          <p>Create, edit, and remove weekly turns and review recorded bets.</p>
        </div>
        <span class="card-link">Open week manager →</span></NuxtLink
      >
    </div>
  </div>
</template>

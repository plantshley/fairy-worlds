const loader = document.getElementById("loader");
const loaderTitle = loader.querySelector(".loader-title");
const loaderFill = loader.querySelector(".loader-bar-fill");
const loaderPct = loader.querySelector(".loader-pct");

export function showLoader(title) {
  loaderTitle.textContent = title;
  loaderFill.style.width = "0%";
  loaderPct.textContent = "0%";
  loader.hidden = false;
}

export function updateLoader(pct) {
  const clamped = Math.max(0, Math.min(99, pct));
  loaderFill.style.width = `${clamped}%`;
  loaderPct.textContent = `${Math.round(clamped)}%`;
}

export function hideLoader() {
  loaderFill.style.width = "100%";
  loaderPct.textContent = "100%";
  setTimeout(() => {
    loader.hidden = true;
  }, 280);
}

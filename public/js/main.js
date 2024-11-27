const backdrop = document.querySelector(".backdrop");
const sideDrawer = document.querySelector(".mobile-nav");
const menuToggle = document.querySelector("#side-menu-toggle");

function backdropClickHandler() {
  backdrop.style.display = "none";
  sideDrawer.classList.remove("open");
}

function menuToggleClickHandler() {
  backdrop.style.display = "block";
  sideDrawer.classList.add("open");
}

backdrop.addEventListener("click", backdropClickHandler);
menuToggle.addEventListener("click", menuToggleClickHandler);

function closeToast(event) {
  let toastClose = event.target;
  toastClose.closest(".toast-container").remove();
}
function closeToastDuration() {
  if (document.querySelectorAll(".toast-container")) {
    let toasts = document.querySelectorAll(".toast-container");
    toasts.forEach((toast) => {
      setTimeout(() => {
        toast.remove();
      }, 5000);
    });
  }
}
closeToastDuration();

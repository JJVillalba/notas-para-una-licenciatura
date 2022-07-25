// import Headroom from "headroom.js"

const menuElement = document.querySelector("menu");
let isMenuOpen = false;
menuElement.addEventListener("click", (ev) => {
  menuElement.className = isMenuOpen ? "close" : "open";
  isMenuOpen = !isMenuOpen;
});

(function () {
  const KEY = "menu-night-mode";
  const btn = document.createElement("button");
  btn.id = "nightModeToggle";
  btn.type = "button";
  btn.innerHTML = '<span class="night-icon">☾</span><span>ليلي</span>';
  btn.setAttribute("aria-label", "تفعيل الوضع الليلي");
  btn.title = "الوضع الليلي";

  function apply(dark) {
    document.documentElement.classList.toggle("night-mode", dark);
    btn.querySelector(".night-icon").textContent = dark ? "☀" : "☾";
    btn.lastChild.textContent = dark ? " نهاري" : " ليلي";
    btn.title = dark ? "الوضع النهاري" : "الوضع الليلي";
    try { localStorage.setItem(KEY, dark ? "1" : "0"); } catch (e) {}
  }

  function init() {
    document.head.appendChild(Object.assign(document.createElement("link"), {
      rel: "stylesheet", href: "night-mode.css"
    }));

    const target = document.querySelector(".search, .sticky, header, nav") || document.body;
    target.prepend(btn);

    let saved = "0";
    try { saved = localStorage.getItem(KEY) || "0"; } catch (e) {}
    apply(saved === "1");

    btn.addEventListener("click", function () {
      apply(!document.documentElement.classList.contains("night-mode"));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
// Shared navigation: hamburger + Range visibility
(function() {
  function toggleMobileNav() {
    var menu = document.getElementById('nav-mobile-menu');
    if (menu) menu.classList.toggle('open');
  }
  function closeMobileNav() {
    var menu = document.getElementById('nav-mobile-menu');
    if (menu) menu.classList.remove('open');
  }

  // Expose globally for onclick attributes
  window.toggleMobileNav = window.toggleMobileNav || toggleMobileNav;
  window.closeMobileNav  = window.closeMobileNav  || closeMobileNav;

  // Close mobile menu on outside click
  document.addEventListener('click', function(e) {
    var nav  = document.getElementById('app-nav');
    var menu = document.getElementById('nav-mobile-menu');
    if (menu && menu.classList.contains('open') && nav && !nav.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
    }
  });

  // Show Range nav link if session flag is set
  document.addEventListener('DOMContentLoaded', function() {
    if (sessionStorage.getItem('datum_range_revealed')) {
      var rl  = document.getElementById('nav-range-link');
      var mob = document.getElementById('nav-mob-range');
      if (rl)  rl.style.display  = '';
      if (mob) mob.style.display = '';
    }
  });
})();

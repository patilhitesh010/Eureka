// Smooth Page Transition Handler

document.addEventListener('DOMContentLoaded', () => {
  // Create progress bar element if not present
  let progressBar = document.getElementById('page-progress-bar');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'page-progress-bar';
    document.body.appendChild(progressBar);
  }

  // Animate progress bar completion on load
  setTimeout(() => {
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBar.style.opacity = '0';
    }, 300);
  }, 50);

  // Intercept link clicks for smooth page transitions
  document.body.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    const target = anchor.getAttribute('target');

    // Skip external links, hash links, mailto, javascript, or links opening in a new tab
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || target === '_blank') {
      return;
    }

    e.preventDefault();
    navigateTo(href);
  });
});

// Global page navigation helper function
window.navigateTo = function(url) {
  let progressBar = document.getElementById('page-progress-bar');
  if (progressBar) {
    progressBar.style.opacity = '1';
    progressBar.style.width = '70%';
  }
  document.body.classList.add('fade-out');
  
  setTimeout(() => {
    window.location.href = url;
  }, 220);
};

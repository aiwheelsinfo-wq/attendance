/**
 * Main application client-side script
 */

// Toast Notifications System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow soft-shadow animate-scale-in border-l-4 ${
    type === 'success' ? 'border-green-500' : 
    type === 'error' ? 'border-red-500' : 
    type === 'warning' ? 'border-amber-500' : 'border-blue-500'
  }`;

  const iconColor = type === 'success' ? 'text-green-500 bg-green-100' : 
                   type === 'error' ? 'text-red-500 bg-red-100' : 
                   type === 'warning' ? 'text-amber-500 bg-amber-100' : 'text-blue-500 bg-blue-100';

  const iconSvg = type === 'success' ? 
    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>` : 
    type === 'error' ? 
    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>` : 
    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;

  toast.innerHTML = `
    <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${iconColor}">
      ${iconSvg}
    </div>
    <div class="ms-3 text-sm font-normal text-slate-700">${message}</div>
    <button type="button" class="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8" onclick="this.parentElement.remove()">
      <span class="sr-only">Close</span>
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  `;

  container.appendChild(toast);

  // Auto-remove toast after 4 seconds
  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// Sidebar toggle for mobile/desktop
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarCollapseBtn = document.getElementById('sidebar-collapse');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('hidden');
    });
  }

  if (sidebarOverlay && sidebar) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.add('-translate-x-full');
      sidebarOverlay.classList.add('hidden');
    });
  }

  if (sidebarCollapseBtn && sidebar) {
    sidebarCollapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('w-64');
      sidebar.classList.toggle('w-20');
      
      // Toggle class on elements with text labels
      const labels = document.querySelectorAll('.sidebar-label');
      labels.forEach(lbl => lbl.classList.toggle('hidden'));
      
      // Shrink logo container
      const logoText = document.getElementById('logo-text');
      if (logoText) logoText.classList.toggle('hidden');
    });
  }

  // Handle global key escapes for modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
      openModals.forEach(modal => modal.classList.add('hidden'));
    }
  });

  // Display initial toast if set in URL params or session storage
  const urlParams = new URLSearchParams(window.location.search);
  const successMsg = urlParams.get('msg');
  const errorMsg = urlParams.get('err');
  if (successMsg) {
    showToast(decodeURIComponent(successMsg), 'success');
    // Clear URL param without reloading
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  if (errorMsg) {
    showToast(decodeURIComponent(errorMsg), 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

// Modal helper functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.classList.remove('scale-100', 'opacity-100');
      content.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 200);
  }
}

// Role switcher simulation
function switchRole(role) {
  fetch(`/api/auth/switch-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // Show success toast on page load
      window.location.reload();
    } else {
      showToast('Failed to switch role', 'error');
    }
  })
  .catch(err => {
    console.error(err);
    showToast('Network error while switching roles', 'error');
  });
}

// GPS / Geolocation Helper for check-in
function getGPSLocation(callback) {
  if (!navigator.geolocation) {
    callback("Geolocation not supported by this browser", null);
    return;
  }

  showToast("Detecting GPS coordinates...", "info");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      callback(null, `${lat}, ${lng}`);
    },
    (error) => {
      console.warn("Geolocation error:", error.message);
      // Fallback coordinate mapping
      const fallbacks = [
        "19.175371, 72.953798 (HQ Office Zone)",
        "19.181088, 72.956275 (Branch B)",
        "18.921980, 72.834650 (Gateway Office)",
        "19.076008, 72.877673 (WFO Hub)"
      ];
      const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      callback(null, randomFallback);
    },
    { timeout: 6000, enableHighAccuracy: true }
  );
}

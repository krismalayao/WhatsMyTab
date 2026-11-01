// Theme Toggle Initialization & Smooth Fade/Pop Animation
const htmlElement = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle');

const savedTheme = localStorage.getItem('theme') || 'light';
htmlElement.setAttribute('data-theme', savedTheme);
themeToggleBtn.textContent = savedTheme === 'light' ? '🌙' : '☀️';

themeToggleBtn.onclick = () => {
  const currentTheme = htmlElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  // Trigger fade-out & shrink
  themeToggleBtn.classList.add('animate');
  
  setTimeout(() => {
    // Switch theme and icon midway through the transition
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggleBtn.textContent = newTheme === 'light' ? '🌙' : '☀️';
    
    // Fade-in & pop back to normal size
    themeToggleBtn.classList.remove('animate');
  }, 150);
};

let allTabs = [];
let favoriteUrls = JSON.parse(localStorage.getItem('favoriteTabs') || '[]');
let currentFilter = 'all';
let searchQuery = '';

async function fetchTabs() {
  allTabs = await chrome.tabs.query({});
  render();
}

function getDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return 'Other';
  }
}

function createTabCard(tab) {
  const card = document.createElement('div');
  card.className = 'tab-card';

  // LOGO (Favicon with fallback to no_logo.png)
  const icon = document.createElement('img');
  icon.className = 'tab-fav-icon';
  icon.src = tab.favIconUrl || 'resources/no_logo.png';
  icon.onerror = () => {
    icon.src = 'resources/no_logo.png';
  };
  icon.alt = '';

  // Name of Tab (Title + URL)
  const info = document.createElement('div');
  info.className = 'tab-info';
  
  const title = document.createElement('span');
  title.className = 'tab-title';
  title.textContent = tab.title || 'Untitled';
  
  const url = document.createElement('span');
  url.className = 'tab-url';
  url.textContent = tab.url;
  
  info.appendChild(title);
  info.appendChild(url);

  // FaveBtn
  const isFav = favoriteUrls.includes(tab.url);
  const faveBtn = document.createElement('button');
  faveBtn.className = `fav-flag-btn ${isFav ? 'starred' : ''}`;
  faveBtn.innerHTML = isFav ? '★' : '☆';
  
  faveBtn.onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(tab.url);
  };

  card.appendChild(icon);
  card.appendChild(info);
  card.appendChild(faveBtn);

  // Click card to switch to tab
  card.onclick = async () => {
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  };

  return card;
}

function toggleFavorite(url) {
  if (favoriteUrls.includes(url)) {
    favoriteUrls = favoriteUrls.filter(u => u !== url);
  } else {
    if (favoriteUrls.length >= 5) {
      alert('You can only favorite up to 5 tabs!');
      return;
    }
    favoriteUrls.push(url);
  }
  localStorage.setItem('favoriteTabs', JSON.stringify(favoriteUrls));
  render();
}

function render() {
  const container = document.getElementById('tab-list');
  container.innerHTML = '';

  // 1. Filter by search query
  let filtered = allTabs.filter(tab => 
    (tab.title && tab.title.toLowerCase().includes(searchQuery)) || 
    (tab.url && tab.url.toLowerCase().includes(searchQuery))
  );

  // 2. Filter by button category
  if (currentFilter === 'favorites') {
    filtered = filtered.filter(tab => favoriteUrls.includes(tab.url));
  }

  // Render based on filter type
  if (currentFilter === 'grouped') {
    // Group tabs by domain name
    const groups = {};
    filtered.forEach(tab => {
      const domain = getDomain(tab.url);
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(tab);
    });

    for (const [domain, tabs] of Object.entries(groups)) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'domain-group';

      const header = document.createElement('div');
      header.className = 'domain-header';
      header.textContent = `${domain} (${tabs.length})`;
      groupDiv.appendChild(header);

      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'domain-items';
      tabs.forEach(tab => itemsDiv.appendChild(createTabCard(tab)));
      groupDiv.appendChild(itemsDiv);

      container.appendChild(groupDiv);
    }
  } else {
    // Standard flat list view
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.style.textAlign = 'center';
      empty.style.color = 'var(--text-secondary)';
      empty.style.marginTop = '20px';
      empty.style.fontSize = '12px';
      empty.textContent = 'No matching tabs found.';
      container.appendChild(empty);
    } else {
      filtered.forEach(tab => container.appendChild(createTabCard(tab)));
    }
  }

  renderFavoritesBar();
}

function renderFavoritesBar() {
  const favList = document.getElementById('favorites-list');
  const favCount = document.getElementById('fav-count');
  favList.innerHTML = '';
  favCount.textContent = `${favoriteUrls.length}/5`;

  favoriteUrls.forEach(url => {
    const matchingTab = allTabs.find(t => t.url === url);
    const title = matchingTab ? matchingTab.title : url;
    const favicon = matchingTab?.favIconUrl || 'resources/no_logo.png';

    const chip = document.createElement('div');
    chip.className = 'fav-chip';

    const icon = document.createElement('img');
    icon.src = favicon;
    icon.onerror = () => {
      icon.src = 'resources/no_logo.png';
    };

    const label = document.createElement('span');
    label.textContent = title;

    chip.appendChild(icon);
    chip.appendChild(label);

    chip.onclick = async () => {
      if (matchingTab) {
        await chrome.tabs.update(matchingTab.id, { active: true });
        await chrome.windows.update(matchingTab.windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: url });
      }
    };

    favList.appendChild(chip);
  });
}

// Event Listeners for UI Controls
document.getElementById('search').addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase();
  render();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.onclick = (e) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.getAttribute('data-filter');
    render();
  };
});

// Real-time Tab Listeners
chrome.tabs.onUpdated.addListener(fetchTabs);
chrome.tabs.onRemoved.addListener(fetchTabs);
chrome.tabs.onCreated.addListener(fetchTabs);

// Initial Load
fetchTabs();
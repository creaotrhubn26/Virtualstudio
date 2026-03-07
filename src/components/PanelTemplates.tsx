/**
 * Panel Templates
 * Pre-designed templates for CreatorHub Virtual Studio functions and Marketplace products
 */

export interface PanelTemplate {
  id: string;
  name: string;
  description: string;
  category: 'function' | 'service';
  thumbnail?: string;
  html: string;
  css?: string;
  config?: {
    defaultHeight?: number;
    position?: 'bottom' | 'left' | 'right' | 'top';
    features?: string[];
  };
}

// CreatorHub Virtual Studio Function Templates
export const FUNCTION_TEMPLATES: PanelTemplate[] = [
  {
    id: 'help-basic',
    name: 'Hjelp - Grunnleggende',
    description: 'Enkel hjelp-panel med dokumentasjon og veiledninger',
    category: 'function',
    html: `
      <div class="custom-panel-content help-template">
        <div class="help-header">
          <h1>{{title}}</h1>
          <p class="help-subtitle">{{description}}</p>
        </div>
        
        <div class="help-search">
          <input type="text" placeholder="Søk i hjelp..." class="help-search-input" id="helpSearchInput">
        </div>
        
        <div class="help-sections" id="helpSections">
          <div class="help-section">
            <h2>Hurtigstart</h2>
            <ul class="help-list">
              <li>Bruk resize handle øverst for å justere størrelse</li>
              <li>Klikk på resize handle for å maksimere/minimere</li>
              <li>Bruk fullscreen-knappen for fullskjermvisning</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h2>Funksjoner</h2>
            <div class="help-feature-grid">
              <div class="help-feature-item">
                <strong>Kameraer</strong>
                <span>Lagre og bytt mellom ulike vinkler</span>
              </div>
              <div class="help-feature-item">
                <strong>Perspektiver</strong>
                <span>Forhåndsdefinerte kameravinkler</span>
              </div>
              <div class="help-feature-item">
                <strong>Studio Library</strong>
                <span>Ferdig utstyr og modeller</span>
              </div>
              <div class="help-feature-item">
                <strong>Lyssystem</strong>
                <span>Profesjonelle lyskilder</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    css: `
      .help-template {
        padding: 32px;
        background: linear-gradient(135deg, rgba(0,212,255,0.02) 0%, rgba(139,92,246,0.02) 100%);
      }
      .help-header {
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 2px solid rgba(0,212,255,0.2);
      }
      .help-header h1 {
        color: #fff;
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 12px;
        background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .help-subtitle {
        color: rgba(255,255,255,0.8);
        font-size: 16px;
        line-height: 1.6;
      }
      .help-search {
        margin-bottom: 32px;
      }
      .help-search-input {
        width: 100%;
        padding: 14px 20px;
        background: rgba(0,0,0,0.4);
        border: 2px solid rgba(255,255,255,0.15);
        border-radius: 12px;
        color: #fff;
        font-size: 15px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .help-search-input:focus {
        outline: none;
        border-color: #00d4ff;
        background: rgba(0,0,0,0.5);
        box-shadow: 0 4px 16px rgba(0,212,255,0.3);
        transform: translateY(-1px);
      }
      .help-search-input::placeholder {
        color: rgba(255,255,255,0.4);
      }
      .help-section {
        margin-bottom: 40px;
      }
      .help-section h2 {
        color: #00d4ff;
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .help-section h2::before {
        content: '';
        width: 4px;
        height: 24px;
        background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
        border-radius: 2px;
      }
      .help-list {
        list-style: none;
        padding: 0;
        background: rgba(0,0,0,0.2);
        border-radius: 12px;
        padding: 16px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .help-list li {
        padding: 14px 16px;
        color: rgba(255,255,255,0.95);
        border-bottom: 1px solid rgba(255,255,255,0.08);
        transition: all 0.2s ease;
        border-radius: 8px;
        margin-bottom: 4px;
      }
      .help-list li:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      .help-list li:hover {
        background: rgba(0,212,255,0.1);
        padding-left: 20px;
        transform: translateX(4px);
      }
      .help-list li::before {
        content: '→';
        color: #00d4ff;
        margin-right: 12px;
        font-weight: bold;
      }
      .help-feature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
      }
      .help-feature-item {
        background: linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(139,92,246,0.12) 100%);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(0,212,255,0.3);
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        position: relative;
        overflow: hidden;
      }
      .help-feature-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #00d4ff 0%, #8b5cf6 100%);
      }
      .help-feature-item:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0,212,255,0.4);
        border-color: #00d4ff;
      }
      .help-feature-item strong {
        display: block;
        color: #00d4ff;
        margin-bottom: 10px;
        font-size: 16px;
        font-weight: 700;
      }
      .help-feature-item span {
        color: rgba(255,255,255,0.85);
        font-size: 14px;
        line-height: 1.5;
      }
    `,
    config: {
      defaultHeight: 600,
      position: 'bottom',
    },
  },
  {
    id: 'notes-simple',
    name: 'Notater - Enkel',
    description: 'Enkel notat-panel med tekstområde',
    category: 'function',
    html: `
      <div class="custom-panel-content notes-template">
        <div class="notes-header">
          <h1>{{title}}</h1>
        </div>
        <textarea 
          id="notesTextarea" 
          class="notes-textarea"
          placeholder="Skriv notater her..."
        ></textarea>
        <div class="notes-actions">
          <button class="notes-save-btn" data-action="save">💾 Lagre notater</button>
          <button class="notes-clear-btn" data-action="clear">🗑️ Tøm</button>
        </div>
        <div class="notes-stats">
          <span id="notesCharCount">0 tegn</span>
        </div>
      </div>
    `,
    css: `
      .notes-template {
        padding: 32px;
        display: flex;
        flex-direction: column;
        height: 100%;
        background: linear-gradient(135deg, rgba(0,212,255,0.02) 0%, rgba(139,92,246,0.02) 100%);
      }
      .notes-header {
        margin-bottom: 24px;
        padding-bottom: 20px;
        border-bottom: 2px solid rgba(0,212,255,0.2);
      }
      .notes-header h1 {
        color: #fff;
        font-size: 28px;
        font-weight: 700;
        margin: 0;
        background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .notes-textarea {
        flex: 1;
        width: 100%;
        padding: 20px;
        background: rgba(0,0,0,0.4);
        border: 2px solid rgba(255,255,255,0.15);
        border-radius: 12px;
        color: #fff;
        font-family: inherit;
        font-size: 15px;
        line-height: 1.6;
        resize: none;
        min-height: 300px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .notes-textarea:focus {
        outline: none;
        border-color: #00d4ff;
        background: rgba(0,0,0,0.5);
        box-shadow: 0 4px 16px rgba(0,212,255,0.3);
      }
      .notes-textarea::placeholder {
        color: rgba(255,255,255,0.4);
      }
      .notes-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }
      .notes-save-btn, .notes-clear-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .notes-save-btn {
        background: linear-gradient(135deg, #00d4ff 0%, #00b8e6 100%);
        color: #000;
        flex: 1;
      }
      .notes-save-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,212,255,0.4);
      }
      .notes-save-btn:active {
        transform: translateY(0);
      }
      .notes-clear-btn {
        background: rgba(255,255,255,0.1);
        color: #fff;
        border: 2px solid rgba(255,255,255,0.2);
      }
      .notes-clear-btn:hover {
        background: rgba(255,255,255,0.2);
        border-color: rgba(255,255,255,0.3);
        transform: translateY(-2px);
      }
      .notes-stats {
        margin-top: 16px;
        padding: 12px 16px;
        background: rgba(0,212,255,0.1);
        border-radius: 8px;
        color: rgba(255,255,255,0.8);
        font-size: 13px;
        text-align: center;
        border: 1px solid rgba(0,212,255,0.2);
      }
    `,
    config: {
      defaultHeight: 500,
      position: 'bottom',
    },
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Dashboard med statistikk og oversikt',
    category: 'function',
    html: `
      <div class="custom-panel-content dashboard-template">
        <div class="dashboard-header">
          <h1>{{title}}</h1>
        </div>
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-value" id="stat1">0</div>
            <div class="stat-label">Totalt</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="stat2">0</div>
            <div class="stat-label">Aktive</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="stat3">0</div>
            <div class="stat-label">Fullførte</div>
          </div>
        </div>
        <div class="dashboard-content">
          <h2>Oversikt</h2>
          <p>{{description}}</p>
        </div>
      </div>
    `,
    css: `
      .dashboard-template {
        padding: 32px;
        background: linear-gradient(135deg, rgba(0,212,255,0.02) 0%, rgba(139,92,246,0.02) 100%);
      }
      .dashboard-header {
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 2px solid rgba(0,212,255,0.2);
      }
      .dashboard-header h1 {
        color: #fff;
        font-size: 32px;
        font-weight: 700;
        margin: 0;
        background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .dashboard-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
      }
      .stat-card {
        background: linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(139,92,246,0.15) 100%);
        padding: 28px 24px;
        border-radius: 16px;
        border: 1px solid rgba(0,212,255,0.3);
        text-align: center;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        position: relative;
        overflow: hidden;
      }
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #00d4ff 0%, #8b5cf6 100%);
      }
      .stat-card:hover {
        transform: translateY(-6px);
        box-shadow: 0 8px 24px rgba(0,212,255,0.4);
        border-color: #00d4ff;
      }
      .stat-value {
        font-size: 42px;
        font-weight: 800;
        background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 10px;
        line-height: 1;
      }
      .stat-label {
        color: rgba(255,255,255,0.85);
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .dashboard-content {
        background: rgba(0,0,0,0.2);
        padding: 24px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .dashboard-content h2 {
        color: #00d4ff;
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .dashboard-content h2::before {
        content: '';
        width: 4px;
        height: 24px;
        background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
        border-radius: 2px;
      }
      .dashboard-content p {
        color: rgba(255,255,255,0.9);
        line-height: 1.7;
        font-size: 15px;
      }
    `,
    config: {
      defaultHeight: 500,
      position: 'bottom',
    },
  },
  {
    id: 'marketplace-grid',
    name: 'Marketplace - Grid View',
    description: 'Marketplace-panel med søk, filtre og grid-visning',
    category: 'function',
    html: `
      <div class="custom-panel-content marketplace-grid-template">
        <div class="marketplace-header">
          <h1>{{title}}</h1>
          <div class="marketplace-search-bar">
            <input type="text" placeholder="Søk i marketplace..." class="search-input" id="marketplaceSearch">
            <button class="search-btn">🔍</button>
          </div>
        </div>
        
        <div class="marketplace-filters">
          <select class="filter-select" id="categoryFilter">
            <option value="all">Alle kategorier</option>
            <option value="feature">Funksjoner</option>
            <option value="asset">Assets</option>
            <option value="plugin">Plugins</option>
            <option value="template">Maler</option>
          </select>
          <select class="filter-select" id="priceFilter">
            <option value="all">Alle priser</option>
            <option value="free">Gratis</option>
            <option value="paid">Betalt</option>
          </select>
          <button class="view-toggle-btn" id="viewToggle">📋</button>
        </div>
        
        <div class="marketplace-stats">
          <span id="productCount">0 produkter</span>
          <span id="installedCount">0 installert</span>
        </div>
        
        <div class="marketplace-grid" id="productGrid">
          <div class="product-card">
            <div class="product-thumbnail">📦</div>
            <div class="product-info">
              <h3>Eksempel Produkt</h3>
              <p>Beskrivelse av produktet</p>
              <div class="product-meta">
                <span class="product-price">Gratis</span>
                <span class="product-rating">⭐ 4.5</span>
              </div>
            </div>
            <button class="install-btn">Installer</button>
          </div>
        </div>
      </div>
    `,
    css: `
      .marketplace-grid-template {
        padding: 32px;
        background: linear-gradient(135deg, rgba(0,212,255,0.02) 0%, rgba(139,92,246,0.02) 100%);
      }
      .marketplace-header {
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 2px solid rgba(0,212,255,0.2);
      }
      .marketplace-header h1 {
        color: #fff;
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 20px;
        background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .marketplace-search-bar {
        display: flex;
        gap: 12px;
      }
      .search-input {
        flex: 1;
        padding: 14px 20px;
        background: rgba(0,0,0,0.4);
        border: 2px solid rgba(255,255,255,0.15);
        border-radius: 12px;
        color: #fff;
        font-size: 15px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .search-input:focus {
        outline: none;
        border-color: #00d4ff;
        background: rgba(0,0,0,0.5);
        box-shadow: 0 4px 16px rgba(0,212,255,0.3);
      }
      .search-input::placeholder {
        color: rgba(255,255,255,0.4);
      }
      .search-btn {
        padding: 14px 24px;
        background: linear-gradient(135deg, #00d4ff 0%, #00b8e6 100%);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 20px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,212,255,0.3);
      }
      .search-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,212,255,0.4);
      }
      .marketplace-filters {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      .filter-select {
        padding: 12px 18px;
        background: rgba(0,0,0,0.4);
        border: 2px solid rgba(255,255,255,0.15);
        border-radius: 10px;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .filter-select:hover {
        border-color: rgba(0,212,255,0.5);
      }
      .filter-select:focus {
        outline: none;
        border-color: #00d4ff;
      }
      .view-toggle-btn {
        padding: 12px 18px;
        background: rgba(255,255,255,0.1);
        border: 2px solid rgba(255,255,255,0.2);
        border-radius: 10px;
        color: #fff;
        cursor: pointer;
        font-size: 20px;
        transition: all 0.3s ease;
      }
      .view-toggle-btn:hover {
        background: rgba(255,255,255,0.2);
        border-color: rgba(255,255,255,0.3);
        transform: scale(1.05);
      }
      .marketplace-stats {
        display: flex;
        gap: 32px;
        margin-bottom: 28px;
        padding: 16px 20px;
        background: rgba(0,212,255,0.1);
        border-radius: 12px;
        border: 1px solid rgba(0,212,255,0.2);
      }
      .marketplace-stats span {
        color: rgba(255,255,255,0.9);
        font-size: 14px;
        font-weight: 500;
      }
      .marketplace-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 24px;
      }
      .product-card {
        background: linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(139,92,246,0.08) 100%);
        border: 2px solid rgba(0,212,255,0.2);
        border-radius: 16px;
        padding: 24px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        position: relative;
        overflow: hidden;
      }
      .product-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #00d4ff 0%, #8b5cf6 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .product-card:hover {
        border-color: #00d4ff;
        transform: translateY(-6px);
        box-shadow: 0 8px 24px rgba(0,212,255,0.4);
      }
      .product-card:hover::before {
        opacity: 1;
      }
      .product-thumbnail {
        width: 100%;
        height: 180px;
        background: linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(139,92,246,0.15) 100%);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 72px;
        margin-bottom: 20px;
        border: 2px solid rgba(0,212,255,0.2);
        transition: all 0.3s ease;
      }
      .product-card:hover .product-thumbnail {
        border-color: #00d4ff;
        transform: scale(1.02);
      }
      .product-info h3 {
        color: #fff;
        font-size: 20px;
        font-weight: 700;
        margin: 0 0 10px 0;
      }
      .product-info p {
        color: rgba(255,255,255,0.8);
        font-size: 14px;
        line-height: 1.5;
        margin: 0 0 16px 0;
      }
      .product-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 12px 16px;
        background: rgba(0,0,0,0.2);
        border-radius: 8px;
      }
      .product-price {
        color: #00d4ff;
        font-weight: 700;
        font-size: 16px;
      }
      .product-rating {
        color: rgba(255,255,255,0.9);
        font-size: 14px;
        font-weight: 500;
      }
      .install-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #00d4ff 0%, #00b8e6 100%);
        color: #000;
        border: none;
        border-radius: 10px;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,212,255,0.3);
      }
      .install-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,212,255,0.5);
      }
      .install-btn:active {
        transform: translateY(0);
      }
    `,
    config: {
      defaultHeight: 700,
      position: 'bottom',
    },
  },
  {
    id: 'virtual-studio',
    name: 'Virtual Studio',
    description: 'Panel for casting-planlegging med roller og kandidater',
    category: 'function',
    html: `
      <div class="custom-panel-content casting-template">
        <div class="casting-header">
          <h1>{{title}}</h1>
          <button class="add-btn" data-action="add-project">+ Nytt prosjekt</button>
        </div>
        
        <div class="casting-tabs">
          <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
          <button class="tab-btn" data-tab="roles">Roller</button>
          <button class="tab-btn" data-tab="candidates">Kandidater</button>
          <button class="tab-btn" data-tab="schedule">Timeplan</button>
        </div>
        
        <div class="casting-content">
          <div id="tab-dashboard" class="tab-content active">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-value" id="totalRoles">0</div>
                <div class="stat-label">Totale roller</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value" id="filledRoles">0</div>
                <div class="stat-label">Fylte roller</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-value" id="upcomingAuditions">0</div>
                <div class="stat-label">Kommende prøver</div>
              </div>
            </div>
          </div>
          
          <div id="tab-roles" class="tab-content">
            <div class="roles-list" id="rolesList">
              <div class="role-card">
                <h3>Hovedrolle</h3>
                <p>Status: Åpen</p>
                <div class="role-actions">
                  <button class="action-btn">Rediger</button>
                  <button class="action-btn">Se kandidater</button>
                </div>
              </div>
            </div>
          </div>
          
          <div id="tab-candidates" class="tab-content">
            <div class="candidates-grid" id="candidatesGrid">
              <div class="candidate-card">
                <div class="candidate-avatar">👤</div>
                <h4>Kandidat navn</h4>
                <p>Rolle: Hovedrolle</p>
                <div class="candidate-status">Under vurdering</div>
              </div>
            </div>
          </div>
          
          <div id="tab-schedule" class="tab-content">
            <div class="schedule-calendar" id="scheduleCalendar">
              <p>Timeplan visning kommer snart</p>
            </div>
          </div>
        </div>
      </div>
    `,
    css: `
      .casting-template {
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .casting-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .casting-header h1 {
        color: #fff;
        font-size: 28px;
        margin: 0;
      }
      .add-btn {
        padding: 10px 20px;
        background: #00d4ff;
        color: #000;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .casting-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .tab-btn {
        padding: 12px 24px;
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      }
      .tab-btn:hover {
        color: rgba(255,255,255,0.9);
      }
      .tab-btn.active {
        color: #00d4ff;
        border-bottom-color: #00d4ff;
      }
      .casting-content {
        flex: 1;
        overflow-y: auto;
      }
      .tab-content {
        display: none;
      }
      .tab-content.active {
        display: block;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 24px;
      }
      .stat-card {
        background: rgba(0,212,255,0.1);
        padding: 24px;
        border-radius: 12px;
        border: 1px solid rgba(0,212,255,0.2);
        text-align: center;
      }
      .stat-icon {
        font-size: 32px;
        margin-bottom: 12px;
      }
      .stat-value {
        font-size: 36px;
        font-weight: 700;
        color: #00d4ff;
        margin-bottom: 8px;
      }
      .stat-label {
        color: rgba(255,255,255,0.7);
        font-size: 14px;
      }
      .role-card, .candidate-card {
        background: rgba(0,0,0,0.2);
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 16px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .role-card h3, .candidate-card h4 {
        color: #fff;
        margin: 0 0 8px 0;
      }
      .role-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      .action-btn {
        padding: 6px 12px;
        background: rgba(0,212,255,0.2);
        border: 1px solid #00d4ff;
        border-radius: 4px;
        color: #00d4ff;
        cursor: pointer;
        font-size: 12px;
      }
      .candidate-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(0,212,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        margin-bottom: 12px;
      }
      .candidate-status {
        display: inline-block;
        padding: 4px 12px;
        background: rgba(255,184,0,0.2);
        color: #ffb800;
        border-radius: 12px;
        font-size: 12px;
        margin-top: 8px;
      }
    `,
    config: {
      defaultHeight: 700,
      position: 'bottom',
    },
  },
  {
    id: 'ai-assistant',
    name: 'AI Assistant',
    description: 'AI-assistent panel med anbefalinger og analyse',
    category: 'function',
    html: `
      <div class="custom-panel-content ai-assistant-template">
        <div class="ai-header">
          <div class="ai-icon">🤖</div>
          <div>
            <h1>{{title}}</h1>
            <p class="ai-subtitle">AI-drevet scene-assistent</p>
          </div>
        </div>
        
        <div class="ai-tabs">
          <button class="ai-tab active" data-tab="recommendations">Anbefalinger</button>
          <button class="ai-tab" data-tab="analysis">Analyse</button>
          <button class="ai-tab" data-tab="patterns">Mønstre</button>
        </div>
        
        <div class="ai-content">
          <div id="ai-recommendations" class="ai-tab-content active">
            <div class="quality-score">
              <div class="score-circle">
                <div class="score-value">75</div>
                <div class="score-label">Kvalitet</div>
              </div>
              <div class="score-grade">B+</div>
            </div>
            
            <div class="recommendations-list">
              <div class="recommendation-card high">
                <div class="rec-priority">Høy prioritet</div>
                <h3>Optimaliser kamera-vinkel</h3>
                <p>Juster kameraet for bedre rammekomposisjon basert på rule of thirds.</p>
                <div class="rec-impact">Forventet forbedring: +15%</div>
                <button class="apply-btn">Bruk anbefaling</button>
              </div>
              
              <div class="recommendation-card medium">
                <div class="rec-priority">Middels prioritet</div>
                <h3>Tilføy fill-lys</h3>
                <p>Legg til et fill-lys for å redusere harde skygger.</p>
                <div class="rec-impact">Forventet forbedring: +10%</div>
                <button class="apply-btn">Bruk anbefaling</button>
              </div>
            </div>
          </div>
          
          <div id="ai-analysis" class="ai-tab-content">
            <div class="analysis-section">
              <h2>Scene-analyse</h2>
              <div class="analysis-metrics">
                <div class="metric">
                  <span class="metric-label">Eksponering</span>
                  <div class="metric-bar">
                    <div class="metric-fill" style="width: 75%"></div>
                  </div>
                  <span class="metric-value">75%</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Komposisjon</span>
                  <div class="metric-bar">
                    <div class="metric-fill" style="width: 80%"></div>
                  </div>
                  <span class="metric-value">80%</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Lyssetting</span>
                  <div class="metric-bar">
                    <div class="metric-fill" style="width: 70%"></div>
                  </div>
                  <span class="metric-value">70%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div id="ai-patterns" class="ai-tab-content">
            <div class="patterns-grid">
              <div class="pattern-card">
                <h3>Three-Point Lighting</h3>
                <p>Klassisk belysningsmønster som gir dybde og dimensjon.</p>
                <button class="apply-btn">Bruk mønster</button>
              </div>
              <div class="pattern-card">
                <h3>Rembrandt Lighting</h3>
                <p>Dramatisk belysning med karakteristisk trekant på kinnet.</p>
                <button class="apply-btn">Bruk mønster</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    css: `
      .ai-assistant-template {
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .ai-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }
      .ai-icon {
        font-size: 48px;
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,212,255,0.1);
        border-radius: 12px;
      }
      .ai-header h1 {
        color: #fff;
        font-size: 24px;
        margin: 0 0 4px 0;
      }
      .ai-subtitle {
        color: rgba(255,255,255,0.6);
        margin: 0;
      }
      .ai-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .ai-tab {
        padding: 12px 24px;
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .ai-tab.active {
        color: #00d4ff;
        border-bottom-color: #00d4ff;
      }
      .ai-content {
        flex: 1;
        overflow-y: auto;
      }
      .ai-tab-content {
        display: none;
      }
      .ai-tab-content.active {
        display: block;
      }
      .quality-score {
        display: flex;
        align-items: center;
        gap: 24px;
        margin-bottom: 32px;
        padding: 24px;
        background: rgba(0,212,255,0.1);
        border-radius: 12px;
      }
      .score-circle {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 4px solid #00d4ff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .score-value {
        font-size: 32px;
        font-weight: 700;
        color: #00d4ff;
      }
      .score-label {
        font-size: 12px;
        color: rgba(255,255,255,0.7);
      }
      .score-grade {
        font-size: 48px;
        font-weight: 700;
        color: #fff;
      }
      .recommendations-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .recommendation-card {
        padding: 20px;
        background: rgba(0,0,0,0.2);
        border-radius: 12px;
        border-left: 4px solid;
      }
      .recommendation-card.high {
        border-left-color: #ff4444;
      }
      .recommendation-card.medium {
        border-left-color: #ffb800;
      }
      .recommendation-card.low {
        border-left-color: #00d4ff;
      }
      .rec-priority {
        display: inline-block;
        padding: 4px 12px;
        background: rgba(255,68,68,0.2);
        color: #ff4444;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .recommendation-card.medium .rec-priority {
        background: rgba(255,184,0,0.2);
        color: #ffb800;
      }
      .recommendation-card.low .rec-priority {
        background: rgba(0,212,255,0.2);
        color: #00d4ff;
      }
      .recommendation-card h3 {
        color: #fff;
        font-size: 18px;
        margin: 0 0 8px 0;
      }
      .recommendation-card p {
        color: rgba(255,255,255,0.8);
        margin: 0 0 12px 0;
      }
      .rec-impact {
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        margin-bottom: 12px;
      }
      .apply-btn {
        padding: 8px 16px;
        background: #00d4ff;
        color: #000;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .analysis-metrics {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .metric {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .metric-label {
        width: 120px;
        color: rgba(255,255,255,0.8);
        font-size: 14px;
      }
      .metric-bar {
        flex: 1;
        height: 8px;
        background: rgba(0,0,0,0.3);
        border-radius: 4px;
        overflow: hidden;
      }
      .metric-fill {
        height: 100%;
        background: #00d4ff;
        transition: width 0.3s;
      }
      .metric-value {
        width: 50px;
        text-align: right;
        color: #00d4ff;
        font-weight: 600;
      }
      .patterns-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }
      .pattern-card {
        padding: 20px;
        background: rgba(0,212,255,0.05);
        border: 1px solid rgba(0,212,255,0.2);
        border-radius: 12px;
      }
      .pattern-card h3 {
        color: #00d4ff;
        margin: 0 0 8px 0;
      }
      .pattern-card p {
        color: rgba(255,255,255,0.7);
        margin: 0 0 12px 0;
      }
    `,
    config: {
      defaultHeight: 700,
      position: 'bottom',
    },
  },
  {
    id: 'timeline-animation',
    name: 'Tidslinje & Animasjon',
    description: 'Panel for animasjon med tidslinje og keyframes',
    category: 'function',
    html: `
      <div class="custom-panel-content timeline-template">
        <div class="timeline-header">
          <h1>{{title}}</h1>
          <div class="timeline-controls">
            <button class="control-btn" data-action="play">▶️</button>
            <button class="control-btn" data-action="pause">⏸️</button>
            <button class="control-btn" data-action="stop">⏹️</button>
          </div>
        </div>
        
        <div class="timeline-tabs">
          <button class="timeline-tab active" data-tab="timeline">Tidslinje</button>
          <button class="timeline-tab" data-tab="keyframes">Keyframes</button>
          <button class="timeline-tab" data-tab="layers">Lag</button>
        </div>
        
        <div class="timeline-content">
          <div id="timeline-timeline" class="timeline-tab-content active">
            <div class="timeline-track">
              <div class="timeline-ruler">
                <div class="ruler-mark">0s</div>
                <div class="ruler-mark">1s</div>
                <div class="ruler-mark">2s</div>
                <div class="ruler-mark">3s</div>
                <div class="ruler-mark">4s</div>
                <div class="ruler-mark">5s</div>
              </div>
              <div class="timeline-clips">
                <div class="timeline-clip" style="left: 10%; width: 20%;">
                  <div class="clip-label">Kamera 1</div>
                </div>
                <div class="timeline-clip" style="left: 40%; width: 30%;">
                  <div class="clip-label">Lys</div>
                </div>
              </div>
            </div>
            <div class="timeline-scrubber">
              <div class="scrubber-handle" id="scrubberHandle"></div>
            </div>
          </div>
          
          <div id="timeline-keyframes" class="timeline-tab-content">
            <div class="keyframes-list">
              <div class="keyframe-item">
                <div class="keyframe-time">0.5s</div>
                <div class="keyframe-property">Position X</div>
                <div class="keyframe-value">100</div>
                <button class="keyframe-delete">×</button>
              </div>
              <div class="keyframe-item">
                <div class="keyframe-time">1.2s</div>
                <div class="keyframe-property">Rotation Y</div>
                <div class="keyframe-value">45°</div>
                <button class="keyframe-delete">×</button>
              </div>
            </div>
          </div>
          
          <div id="timeline-layers" class="timeline-tab-content">
            <div class="layers-list">
              <div class="layer-item">
                <div class="layer-visibility">👁️</div>
                <div class="layer-name">Kamera</div>
                <div class="layer-type">Transform</div>
                <button class="layer-expand">▼</button>
              </div>
              <div class="layer-item">
                <div class="layer-visibility">👁️</div>
                <div class="layer-name">Lys</div>
                <div class="layer-type">Light</div>
                <button class="layer-expand">▼</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    css: `
      .timeline-template {
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .timeline-header h1 {
        color: #fff;
        font-size: 28px;
        margin: 0;
      }
      .timeline-controls {
        display: flex;
        gap: 8px;
      }
      .control-btn {
        padding: 8px 16px;
        background: rgba(0,212,255,0.2);
        border: 1px solid #00d4ff;
        border-radius: 6px;
        color: #00d4ff;
        cursor: pointer;
        font-size: 18px;
      }
      .timeline-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .timeline-tab {
        padding: 12px 24px;
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .timeline-tab.active {
        color: #00d4ff;
        border-bottom-color: #00d4ff;
      }
      .timeline-content {
        flex: 1;
        overflow-y: auto;
      }
      .timeline-tab-content {
        display: none;
      }
      .timeline-tab-content.active {
        display: block;
      }
      .timeline-track {
        background: rgba(0,0,0,0.3);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        position: relative;
        min-height: 120px;
      }
      .timeline-ruler {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .ruler-mark {
        color: rgba(255,255,255,0.6);
        font-size: 12px;
      }
      .timeline-clips {
        position: relative;
        height: 60px;
      }
      .timeline-clip {
        position: absolute;
        height: 100%;
        background: #00d4ff;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: move;
      }
      .clip-label {
        color: #000;
        font-weight: 600;
        font-size: 12px;
      }
      .timeline-scrubber {
        height: 4px;
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
        position: relative;
        cursor: pointer;
      }
      .scrubber-handle {
        position: absolute;
        width: 16px;
        height: 16px;
        background: #00d4ff;
        border-radius: 50%;
        top: -6px;
        left: 0;
        cursor: grab;
      }
      .keyframes-list, .layers-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .keyframe-item, .layer-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px;
        background: rgba(0,0,0,0.2);
        border-radius: 6px;
      }
      .keyframe-time, .layer-name {
        width: 80px;
        color: #00d4ff;
        font-weight: 600;
      }
      .keyframe-property, .layer-type {
        flex: 1;
        color: rgba(255,255,255,0.8);
      }
      .keyframe-value {
        width: 100px;
        color: rgba(255,255,255,0.6);
        text-align: right;
      }
      .keyframe-delete, .layer-expand {
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        font-size: 20px;
      }
      .layer-visibility {
        cursor: pointer;
      }
    `,
    config: {
      defaultHeight: 600,
      position: 'bottom',
    },
  },
  {
    id: 'scene-composer',
    name: 'Scene Composer',
    description: 'Panel for scene-komposisjon med objekter og transformasjoner',
    category: 'function',
    html: `
      <div class="custom-panel-content scene-composer-template">
        <div class="composer-header">
          <h1>{{title}}</h1>
          <div class="composer-actions">
            <button class="action-btn" data-action="save-scene">💾 Lagre</button>
            <button class="action-btn" data-action="load-scene">📂 Last inn</button>
          </div>
        </div>
        
        <div class="composer-toolbar">
          <button class="tool-btn active" data-tool="select">🔍</button>
          <button class="tool-btn" data-tool="move">↔️</button>
          <button class="tool-btn" data-tool="rotate">🔄</button>
          <button class="tool-btn" data-tool="scale">📏</button>
        </div>
        
        <div class="composer-content">
          <div class="objects-panel">
            <h3>Objekter i scenen</h3>
            <div class="objects-list" id="objectsList">
              <div class="object-item">
                <div class="object-icon">📷</div>
                <div class="object-info">
                  <div class="object-name">Kamera 1</div>
                  <div class="object-type">Camera</div>
                </div>
                <button class="object-delete">×</button>
              </div>
              <div class="object-item">
                <div class="object-icon">💡</div>
                <div class="object-info">
                  <div class="object-name">Key Light</div>
                  <div class="object-type">Light</div>
                </div>
                <button class="object-delete">×</button>
              </div>
            </div>
            <button class="add-object-btn" data-action="add-object">+ Legg til objekt</button>
          </div>
          
          <div class="properties-panel">
            <h3>Egenskaper</h3>
            <div class="property-group">
              <label>Posisjon X</label>
              <input type="number" value="0" class="property-input">
            </div>
            <div class="property-group">
              <label>Posisjon Y</label>
              <input type="number" value="0" class="property-input">
            </div>
            <div class="property-group">
              <label>Posisjon Z</label>
              <input type="number" value="0" class="property-input">
            </div>
            <div class="property-group">
              <label>Rotasjon X</label>
              <input type="number" value="0" class="property-input">
            </div>
            <div class="property-group">
              <label>Rotasjon Y</label>
              <input type="number" value="0" class="property-input">
            </div>
            <div class="property-group">
              <label>Rotasjon Z</label>
              <input type="number" value="0" class="property-input">
            </div>
          </div>
        </div>
      </div>
    `,
    css: `
      .scene-composer-template {
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .composer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .composer-header h1 {
        color: #fff;
        font-size: 28px;
        margin: 0;
      }
      .composer-actions {
        display: flex;
        gap: 8px;
      }
      .action-btn {
        padding: 8px 16px;
        background: rgba(0,212,255,0.2);
        border: 1px solid #00d4ff;
        border-radius: 6px;
        color: #00d4ff;
        cursor: pointer;
        font-size: 14px;
      }
      .composer-toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        padding: 12px;
        background: rgba(0,0,0,0.2);
        border-radius: 8px;
      }
      .tool-btn {
        padding: 10px 16px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 6px;
        color: #fff;
        cursor: pointer;
        font-size: 18px;
      }
      .tool-btn.active {
        background: #00d4ff;
        color: #000;
      }
      .composer-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        flex: 1;
        overflow-y: auto;
      }
      .objects-panel, .properties-panel {
        background: rgba(0,0,0,0.2);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .objects-panel h3, .properties-panel h3 {
        color: #00d4ff;
        font-size: 18px;
        margin: 0 0 16px 0;
      }
      .objects-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
      }
      .object-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(0,212,255,0.05);
        border-radius: 6px;
      }
      .object-icon {
        font-size: 24px;
      }
      .object-info {
        flex: 1;
      }
      .object-name {
        color: #fff;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .object-type {
        color: rgba(255,255,255,0.6);
        font-size: 12px;
      }
      .object-delete {
        background: none;
        border: none;
        color: #ff4444;
        cursor: pointer;
        font-size: 20px;
      }
      .add-object-btn {
        width: 100%;
        padding: 12px;
        background: #00d4ff;
        color: #000;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .property-group {
        margin-bottom: 16px;
      }
      .property-group label {
        display: block;
        color: rgba(255,255,255,0.8);
        font-size: 14px;
        margin-bottom: 8px;
      }
      .property-input {
        width: 100%;
        padding: 10px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
      }
    `,
    config: {
      defaultHeight: 600,
      position: 'bottom',
    },
  },
  {
    id: 'notes-advanced',
    name: 'Notater - Avansert',
    description: 'Avansert notat-panel med kategorier og søk',
    category: 'function',
    html: `
      <div class="custom-panel-content notes-advanced-template">
        <div class="notes-header">
          <h1>{{title}}</h1>
          <button class="new-note-btn" data-action="create-note">+ Nytt notat</button>
        </div>
        
        <div class="notes-toolbar">
          <input type="text" placeholder="Søk i notater..." class="notes-search" id="notesSearch">
          <select class="notes-category-filter" id="categoryFilter">
            <option value="all">Alle kategorier</option>
            <option value="general">Generelt</option>
            <option value="lighting">Lys</option>
            <option value="camera">Kamera</option>
            <option value="model">Modell</option>
            <option value="setup">Oppsett</option>
          </select>
        </div>
        
        <div class="notes-content">
          <div class="notes-sidebar">
            <div class="notes-list" id="notesList">
              <div class="note-item active">
                <div class="note-item-header">
                  <span class="note-category-badge general">Generelt</span>
                  <span class="note-date">I dag</span>
                </div>
                <div class="note-item-title">Eksempel notat</div>
                <div class="note-item-preview">Dette er et eksempel notat...</div>
              </div>
            </div>
          </div>
          
          <div class="notes-editor">
            <div class="editor-header">
              <input type="text" placeholder="Notat tittel..." class="note-title-input" id="noteTitle">
              <select class="note-category-select" id="noteCategory">
                <option value="general">Generelt</option>
                <option value="lighting">Lys</option>
                <option value="camera">Kamera</option>
                <option value="model">Modell</option>
                <option value="setup">Oppsett</option>
              </select>
            </div>
            <textarea class="note-content-textarea" id="noteContent" placeholder="Skriv notatet ditt her..."></textarea>
            <div class="editor-actions">
              <button class="save-note-btn" data-action="save-note">💾 Lagre</button>
              <button class="delete-note-btn" data-action="delete-note">🗑️ Slett</button>
            </div>
          </div>
        </div>
      </div>
    `,
    css: `
      .notes-advanced-template {
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .notes-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .notes-header h1 {
        color: #fff;
        font-size: 28px;
        margin: 0;
      }
      .new-note-btn {
        padding: 10px 20px;
        background: #00d4ff;
        color: #000;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .notes-toolbar {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
      }
      .notes-search {
        flex: 1;
        padding: 10px 16px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
      }
      .notes-category-filter {
        padding: 10px 16px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
      }
      .notes-content {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 24px;
        flex: 1;
        overflow: hidden;
      }
      .notes-sidebar {
        background: rgba(0,0,0,0.2);
        border-radius: 8px;
        padding: 16px;
        overflow-y: auto;
      }
      .notes-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .note-item {
        padding: 12px;
        background: rgba(0,212,255,0.05);
        border-radius: 6px;
        cursor: pointer;
        border: 1px solid transparent;
      }
      .note-item:hover {
        border-color: rgba(0,212,255,0.3);
      }
      .note-item.active {
        border-color: #00d4ff;
        background: rgba(0,212,255,0.1);
      }
      .note-item-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .note-category-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
      }
      .note-category-badge.general { background: rgba(136,136,136,0.3); color: #888; }
      .note-category-badge.lighting { background: rgba(251,191,36,0.3); color: #fbbf24; }
      .note-category-badge.camera { background: rgba(0,168,255,0.3); color: #00a8ff; }
      .note-category-badge.model { background: rgba(16,185,129,0.3); color: #10b981; }
      .note-category-badge.setup { background: rgba(139,92,246,0.3); color: #8b5cf6; }
      .note-date {
        color: rgba(255,255,255,0.5);
        font-size: 12px;
      }
      .note-item-title {
        color: #fff;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .note-item-preview {
        color: rgba(255,255,255,0.6);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .notes-editor {
        display: flex;
        flex-direction: column;
        background: rgba(0,0,0,0.2);
        border-radius: 8px;
        padding: 20px;
      }
      .editor-header {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }
      .note-title-input {
        flex: 1;
        padding: 10px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
        font-size: 16px;
        font-weight: 600;
      }
      .note-category-select {
        padding: 10px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
      }
      .note-content-textarea {
        flex: 1;
        padding: 16px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
        font-family: inherit;
        font-size: 14px;
        resize: none;
        min-height: 300px;
      }
      .editor-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
      }
      .save-note-btn, .delete-note-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .save-note-btn {
        background: #00d4ff;
        color: #000;
      }
      .delete-note-btn {
        background: rgba(255,68,68,0.2);
        color: #ff4444;
        border: 1px solid #ff4444;
      }
    `,
    config: {
      defaultHeight: 600,
      position: 'bottom',
    },
  },
  {
    id: 'asset-library',
    name: 'Asset Library',
    description: 'Panel for asset-bibliotek med grid-visning og filtre',
    category: 'function',
    html: `
      <div class="custom-panel-content asset-library-template">
        <div class="library-header">
          <h1>{{title}}</h1>
          <div class="library-actions">
            <button class="upload-btn" data-action="upload">📤 Last opp</button>
            <button class="import-btn" data-action="import">📥 Importer</button>
          </div>
        </div>
        
        <div class="library-filters">
          <input type="text" placeholder="Søk i assets..." class="library-search" id="assetSearch">
          <select class="library-type-filter" id="typeFilter">
            <option value="all">Alle typer</option>
            <option value="model">3D Modeller</option>
            <option value="texture">Teksturer</option>
            <option value="hdri">HDRI</option>
            <option value="material">Materialer</option>
          </select>
          <button class="view-toggle" id="viewToggle" data-action="toggle-view">⊞</button>
        </div>
        
        <div class="library-stats">
          <span id="assetCount">0 assets</span>
          <span id="totalSize">0 MB</span>
        </div>
        
        <div class="library-grid" id="assetGrid">
          <div class="asset-card">
            <div class="asset-thumbnail">📦</div>
            <div class="asset-info">
              <div class="asset-name">Eksempel Asset</div>
              <div class="asset-type">3D Modell</div>
              <div class="asset-size">2.5 MB</div>
            </div>
            <div class="asset-actions">
              <button class="asset-use-btn">Bruk</button>
              <button class="asset-delete-btn">×</button>
            </div>
          </div>
        </div>
      </div>
    `,
    css: `
      .asset-library-template {
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .library-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .library-header h1 {
        color: #fff;
        font-size: 28px;
        margin: 0;
      }
      .library-actions {
        display: flex;
        gap: 8px;
      }
      .upload-btn, .import-btn {
        padding: 10px 20px;
        background: rgba(0,212,255,0.2);
        border: 1px solid #00d4ff;
        border-radius: 6px;
        color: #00d4ff;
        font-weight: 600;
        cursor: pointer;
      }
      .library-filters {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }
      .library-search {
        flex: 1;
        padding: 10px 16px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
      }
      .library-type-filter {
        padding: 10px 16px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
      }
      .view-toggle {
        padding: 10px 16px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 6px;
        color: #fff;
        cursor: pointer;
        font-size: 18px;
      }
      .library-stats {
        display: flex;
        gap: 24px;
        margin-bottom: 24px;
        color: rgba(255,255,255,0.7);
        font-size: 14px;
      }
      .library-grid {
        flex: 1;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }
      .asset-card {
        background: rgba(0,212,255,0.05);
        border: 1px solid rgba(0,212,255,0.2);
        border-radius: 12px;
        padding: 16px;
        transition: all 0.2s;
      }
      .asset-card:hover {
        border-color: #00d4ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,212,255,0.3);
      }
      .asset-thumbnail {
        width: 100%;
        height: 120px;
        background: rgba(0,212,255,0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        margin-bottom: 12px;
      }
      .asset-info {
        margin-bottom: 12px;
      }
      .asset-name {
        color: #fff;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .asset-type {
        color: rgba(255,255,255,0.6);
        font-size: 12px;
        margin-bottom: 4px;
      }
      .asset-size {
        color: rgba(255,255,255,0.5);
        font-size: 11px;
      }
      .asset-actions {
        display: flex;
        gap: 8px;
      }
      .asset-use-btn {
        flex: 1;
        padding: 8px;
        background: #00d4ff;
        color: #000;
        border: none;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        font-size: 12px;
      }
      .asset-delete-btn {
        padding: 8px 12px;
        background: rgba(255,68,68,0.2);
        color: #ff4444;
        border: 1px solid #ff4444;
        border-radius: 4px;
        cursor: pointer;
      }
    `,
    config: {
      defaultHeight: 700,
      position: 'bottom',
    },
  },
  {
    id: 'cinematography-patterns',
    name: 'Cinematography Patterns',
    description: 'Panel for belysningsmønstre og cinematografiske mønstre',
    category: 'function',
    html: `
      <div class="custom-panel-content cinematography-template">
        <div class="patterns-header">
          <h1>{{title}}</h1>
          <button class="create-pattern-btn" data-action="create-pattern">+ Nytt mønster</button>
        </div>
        
        <div class="patterns-tabs">
          <button class="pattern-tab active" data-tab="library">Bibliotek</button>
          <button class="pattern-tab" data-tab="favorites">Favoritter</button>
          <button class="pattern-tab" data-tab="custom">Mine mønstre</button>
        </div>
        
        <div class="patterns-content">
          <div id="pattern-library" class="pattern-tab-content active">
            <div class="pattern-filters">
              <select class="pattern-category-filter" id="patternCategory">
                <option value="all">Alle kategorier</option>
                <option value="portrait">Portrett</option>
                <option value="fashion">Fashion</option>
                <option value="commercial">Commercial</option>
                <option value="dramatic">Dramatisk</option>
              </select>
              <input type="text" placeholder="Søk..." class="pattern-search" id="patternSearch">
            </div>
            
            <div class="patterns-grid" id="patternsGrid">
              <div class="pattern-card">
                <div class="pattern-preview">💡</div>
                <div class="pattern-info">
                  <h3>Three-Point Lighting</h3>
                  <p>Klassisk belysningsmønster</p>
                  <div class="pattern-tags">
                    <span class="pattern-tag">Portrett</span>
                    <span class="pattern-tag">Klassisk</span>
                  </div>
                </div>
                <div class="pattern-actions">
                  <button class="pattern-use-btn">Bruk</button>
                  <button class="pattern-favorite-btn">⭐</button>
                </div>
              </div>
              
              <div class="pattern-card">
                <div class="pattern-preview">🎭</div>
                <div class="pattern-info">
                  <h3>Rembrandt Lighting</h3>
                  <p>Dramatisk belysning med trekant</p>
                  <div class="pattern-tags">
                    <span class="pattern-tag">Dramatisk</span>
                    <span class="pattern-tag">Portrett</span>
                  </div>
                </div>
                <div class="pattern-actions">
                  <button class="pattern-use-btn">Bruk</button>
                  <button class="pattern-favorite-btn">⭐</button>
                </div>
              </div>
            </div>
          </div>
          
          <div id="pattern-favorites" class="pattern-tab-content">
            <p>Dine favoritt-mønstre vises her</p>
          </div>
          
          <div id="pattern-custom" class="pattern-tab-content">
            <p>Dine egendefinerte mønstre vises her</p>
          </div>
        </div>
      </div>
    `,
    css: `
      .cinematography-template {
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .patterns-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .patterns-header h1 {
        color: #fff;
        font-size: 28px;
        margin: 0;
      }
      .create-pattern-btn {
        padding: 10px 20px;
        background: #00d4ff;
        color: #000;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .patterns-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .pattern-tab {
        padding: 12px 24px;
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .pattern-tab.active {
        color: #00d4ff;
        border-bottom-color: #00d4ff;
      }
      .patterns-content {
        flex: 1;
        overflow-y: auto;
      }
      .pattern-tab-content {
        display: none;
      }
      .pattern-tab-content.active {
        display: block;
      }
      .pattern-filters {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
      }
      .pattern-category-filter, .pattern-search {
        padding: 10px 16px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
      }
      .pattern-search {
        flex: 1;
      }
      .patterns-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }
      .pattern-card {
        background: rgba(0,212,255,0.05);
        border: 1px solid rgba(0,212,255,0.2);
        border-radius: 12px;
        padding: 20px;
        transition: all 0.2s;
      }
      .pattern-card:hover {
        border-color: #00d4ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,212,255,0.3);
      }
      .pattern-preview {
        width: 100%;
        height: 160px;
        background: rgba(0,212,255,0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 64px;
        margin-bottom: 16px;
      }
      .pattern-info h3 {
        color: #fff;
        font-size: 18px;
        margin: 0 0 8px 0;
      }
      .pattern-info p {
        color: rgba(255,255,255,0.7);
        font-size: 14px;
        margin: 0 0 12px 0;
      }
      .pattern-tags {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .pattern-tag {
        padding: 4px 12px;
        background: rgba(0,212,255,0.2);
        color: #00d4ff;
        border-radius: 12px;
        font-size: 12px;
      }
      .pattern-actions {
        display: flex;
        gap: 8px;
      }
      .pattern-use-btn {
        flex: 1;
        padding: 10px;
        background: #00d4ff;
        color: #000;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .pattern-favorite-btn {
        padding: 10px 16px;
        background: rgba(255,184,0,0.2);
        color: #ffb800;
        border: 1px solid #ffb800;
        border-radius: 6px;
        cursor: pointer;
        font-size: 18px;
      }
    `,
    config: {
      defaultHeight: 700,
      position: 'bottom',
    },
  },
  {
    id: 'photography-training',
    name: 'Photography Training',
    description: 'Panel for fotografi-opplæring med interaktive leksjoner',
    category: 'function',
    html: `
      <div class="custom-panel-content photography-training-template">
        <div class="training-header">
          <h1>{{title}}</h1>
          <div class="training-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 45%"></div>
            </div>
            <span class="progress-text">45% fullført</span>
          </div>
        </div>
        
        <div class="training-tabs">
          <button class="training-tab active" data-tab="lessons">Leksjoner</button>
          <button class="training-tab" data-tab="quiz">Quiz</button>
          <button class="training-tab" data-tab="tips">Tips</button>
        </div>
        
        <div class="training-content">
          <div id="training-lessons" class="training-tab-content active">
            <div class="lessons-list">
              <div class="lesson-card completed">
                <div class="lesson-icon">✅</div>
                <div class="lesson-info">
                  <h3>White Balance</h3>
                  <p>Lær om fargetemperatur og hvordan justere white balance</p>
                </div>
                <button class="lesson-review-btn">Gjennomgå</button>
              </div>
              
              <div class="lesson-card active">
                <div class="lesson-icon">📚</div>
                <div class="lesson-info">
                  <h3>Exposure Triangle</h3>
                  <p>Forstå forholdet mellom ISO, aperture og shutter speed</p>
                </div>
                <button class="lesson-start-btn">Start</button>
              </div>
              
              <div class="lesson-card locked">
                <div class="lesson-icon">🔒</div>
                <div class="lesson-info">
                  <h3>Composition Rules</h3>
                  <p>Lær om rule of thirds, leading lines og mer</p>
                </div>
                <button class="lesson-locked-btn" disabled>Låst</button>
              </div>
            </div>
          </div>
          
          <div id="training-quiz" class="training-tab-content">
            <div class="quiz-container">
              <h2>Test din kunnskap</h2>
              <div class="quiz-question">
                <p>Hva er hovedformålet med white balance?</p>
                <div class="quiz-options">
                  <button class="quiz-option">A) Justere eksponering</button>
                  <button class="quiz-option">B) Korrigere fargetemperatur</button>
                  <button class="quiz-option">C) Endre ISO-verdi</button>
                </div>
              </div>
            </div>
          </div>
          
          <div id="training-tips" class="training-tab-content">
            <div class="tips-grid">
              <div class="tip-card">
                <div class="tip-icon">💡</div>
                <h3>Pro Tips</h3>
                <p>Bruk histogram for å sjekke eksponering</p>
              </div>
              <div class="tip-card">
                <div class="tip-icon">📸</div>
                <h3>Komposisjon</h3>
                <p>Rule of thirds gir bedre visuell balanse</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    css: `
      .photography-training-template {
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .training-header {
        margin-bottom: 24px;
      }
      .training-header h1 {
        color: #fff;
        font-size: 28px;
        margin: 0 0 16px 0;
      }
      .training-progress {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .progress-bar {
        flex: 1;
        height: 8px;
        background: rgba(0,0,0,0.3);
        border-radius: 4px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: #00d4ff;
        transition: width 0.3s;
      }
      .progress-text {
        color: rgba(255,255,255,0.7);
        font-size: 14px;
        white-space: nowrap;
      }
      .training-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .training-tab {
        padding: 12px 24px;
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .training-tab.active {
        color: #00d4ff;
        border-bottom-color: #00d4ff;
      }
      .training-content {
        flex: 1;
        overflow-y: auto;
      }
      .training-tab-content {
        display: none;
      }
      .training-tab-content.active {
        display: block;
      }
      .lessons-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .lesson-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: rgba(0,0,0,0.2);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .lesson-card.completed {
        border-color: rgba(16,185,129,0.3);
        background: rgba(16,185,129,0.05);
      }
      .lesson-card.active {
        border-color: #00d4ff;
        background: rgba(0,212,255,0.1);
      }
      .lesson-card.locked {
        opacity: 0.5;
      }
      .lesson-icon {
        font-size: 32px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lesson-info {
        flex: 1;
      }
      .lesson-info h3 {
        color: #fff;
        font-size: 18px;
        margin: 0 0 4px 0;
      }
      .lesson-info p {
        color: rgba(255,255,255,0.7);
        font-size: 14px;
        margin: 0;
      }
      .lesson-start-btn, .lesson-review-btn {
        padding: 10px 20px;
        background: #00d4ff;
        color: #000;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .lesson-locked-btn {
        padding: 10px 20px;
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.3);
        border: none;
        border-radius: 6px;
        cursor: not-allowed;
      }
      .quiz-container {
        padding: 24px;
        background: rgba(0,0,0,0.2);
        border-radius: 12px;
      }
      .quiz-container h2 {
        color: #00d4ff;
        margin-bottom: 24px;
      }
      .quiz-question p {
        color: #fff;
        font-size: 18px;
        margin-bottom: 16px;
      }
      .quiz-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .quiz-option {
        padding: 12px 16px;
        background: rgba(0,212,255,0.1);
        border: 1px solid rgba(0,212,255,0.3);
        border-radius: 6px;
        color: #fff;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
      }
      .quiz-option:hover {
        background: rgba(0,212,255,0.2);
        border-color: #00d4ff;
      }
      .tips-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }
      .tip-card {
        padding: 20px;
        background: rgba(0,212,255,0.05);
        border: 1px solid rgba(0,212,255,0.2);
        border-radius: 12px;
        text-align: center;
      }
      .tip-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
      .tip-card h3 {
        color: #00d4ff;
        margin: 0 0 8px 0;
      }
      .tip-card p {
        color: rgba(255,255,255,0.8);
        margin: 0;
      }
    `,
    config: {
      defaultHeight: 700,
      position: 'bottom',
    },
  },
];

// Marketplace Product Templates
export const MARKETPLACE_TEMPLATES: PanelTemplate[] = [
  {
    id: 'service-basic',
    name: 'Tjeneste - Grunnleggende',
    description: 'Grunnleggende tjeneste-panel for marketplace',
    category: 'service',
    html: `
      <div class="custom-panel-content marketplace-template">
        <div class="marketplace-header">
          <div class="marketplace-icon">🎯</div>
          <div>
            <h1>{{title}}</h1>
            <p class="marketplace-version">v{{version}} • {{author}}</p>
          </div>
        </div>
        
        <div class="marketplace-description">
          <p>{{description}}</p>
        </div>
        
        <div class="marketplace-features">
          <h2>Funksjoner</h2>
          <ul class="feature-list">
            <li>Funksjon 1</li>
            <li>Funksjon 2</li>
            <li>Funksjon 3</li>
          </ul>
        </div>
        
        <div class="marketplace-actions">
          <button class="marketplace-primary-btn" data-action="install">
            📥 Installer
          </button>
          <button class="marketplace-secondary-btn" data-action="learn-more">
            ℹ️ Les mer
          </button>
        </div>
      </div>
    `,
    css: `
      .marketplace-template {
        padding: 24px;
      }
      .marketplace-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
        padding-bottom: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .marketplace-icon {
        font-size: 48px;
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,212,255,0.1);
        border-radius: 12px;
      }
      .marketplace-header h1 {
        color: #fff;
        font-size: 24px;
        margin: 0 0 4px 0;
      }
      .marketplace-version {
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        margin: 0;
      }
      .marketplace-description {
        margin-bottom: 24px;
      }
      .marketplace-description p {
        color: rgba(255,255,255,0.9);
        line-height: 1.6;
        font-size: 15px;
      }
      .marketplace-features {
        margin-bottom: 24px;
      }
      .marketplace-features h2 {
        color: #00d4ff;
        font-size: 18px;
        margin-bottom: 12px;
      }
      .feature-list {
        list-style: none;
        padding: 0;
      }
      .feature-list li {
        padding: 8px 0;
        color: rgba(255,255,255,0.8);
        padding-left: 24px;
        position: relative;
      }
      .feature-list li:before {
        content: '✓';
        position: absolute;
        left: 0;
        color: #00d4ff;
        font-weight: bold;
      }
      .marketplace-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }
      .marketplace-primary-btn, .marketplace-secondary-btn {
        flex: 1;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .marketplace-primary-btn {
        background: #00d4ff;
        color: #000;
      }
      .marketplace-primary-btn:hover {
        background: #00b8e6;
      }
      .marketplace-secondary-btn {
        background: rgba(255,255,255,0.1);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.2);
      }
      .marketplace-secondary-btn:hover {
        background: rgba(255,255,255,0.2);
      }
    `,
    config: {
      defaultHeight: 500,
      position: 'bottom',
    },
  },
  {
    id: 'service-advanced',
    name: 'Tjeneste - Avansert',
    description: 'Avansert tjeneste-panel med flere seksjoner',
    category: 'service',
    html: `
      <div class="custom-panel-content marketplace-advanced-template">
        <div class="marketplace-hero">
          <div class="marketplace-hero-icon">🚀</div>
          <h1>{{title}}</h1>
          <p class="marketplace-tagline">{{description}}</p>
          <div class="marketplace-badges">
            <span class="badge">v{{version}}</span>
            <span class="badge">{{author}}</span>
            <span class="badge badge-primary">Ny</span>
          </div>
        </div>
        
        <div class="marketplace-tabs">
          <button class="tab-btn active" data-tab="overview">Oversikt</button>
          <button class="tab-btn" data-tab="features">Funksjoner</button>
          <button class="tab-btn" data-tab="docs">Dokumentasjon</button>
        </div>
        
        <div class="marketplace-content">
          <div id="tab-overview" class="tab-content active">
            <h2>Om {{title}}</h2>
            <p>{{description}}</p>
            <div class="marketplace-stats">
              <div class="stat">
                <div class="stat-number">0</div>
                <div class="stat-label">Installasjoner</div>
              </div>
              <div class="stat">
                <div class="stat-number">0</div>
                <div class="stat-label">Anmeldelser</div>
              </div>
              <div class="stat">
                <div class="stat-number">5.0</div>
                <div class="stat-label">Vurdering</div>
              </div>
            </div>
          </div>
          
          <div id="tab-features" class="tab-content">
            <h2>Funksjoner</h2>
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">✨</div>
                <h3>Funksjon 1</h3>
                <p>Beskrivelse av funksjon 1</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h3>Funksjon 2</h3>
                <p>Beskrivelse av funksjon 2</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🎨</div>
                <h3>Funksjon 3</h3>
                <p>Beskrivelse av funksjon 3</p>
              </div>
            </div>
          </div>
          
          <div id="tab-docs" class="tab-content">
            <h2>Dokumentasjon</h2>
            <div class="docs-section">
              <h3>Komme i gang</h3>
              <p>Instruksjoner for å komme i gang med {{title}}.</p>
            </div>
          </div>
        </div>
        
        <div class="marketplace-footer">
          <button class="install-btn" data-action="install">
            📥 Installer nå
          </button>
        </div>
      </div>
    `,
    css: `
      .marketplace-advanced-template {
        padding: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .marketplace-hero {
        padding: 32px 24px;
        text-align: center;
        background: linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(0,212,255,0.05) 100%);
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .marketplace-hero-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }
      .marketplace-hero h1 {
        color: #fff;
        font-size: 32px;
        margin: 0 0 8px 0;
      }
      .marketplace-tagline {
        color: rgba(255,255,255,0.8);
        font-size: 16px;
        margin: 0 0 16px 0;
      }
      .marketplace-badges {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .badge {
        padding: 4px 12px;
        background: rgba(255,255,255,0.1);
        border-radius: 12px;
        font-size: 12px;
        color: rgba(255,255,255,0.8);
      }
      .badge-primary {
        background: #00d4ff;
        color: #000;
        font-weight: 600;
      }
      .marketplace-tabs {
        display: flex;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding: 0 24px;
      }
      .tab-btn {
        padding: 12px 24px;
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      }
      .tab-btn:hover {
        color: rgba(255,255,255,0.9);
      }
      .tab-btn.active {
        color: #00d4ff;
        border-bottom-color: #00d4ff;
      }
      .marketplace-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }
      .tab-content {
        display: none;
      }
      .tab-content.active {
        display: block;
      }
      .marketplace-content h2 {
        color: #00d4ff;
        font-size: 20px;
        margin-bottom: 16px;
      }
      .marketplace-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-top: 24px;
      }
      .stat {
        text-align: center;
        padding: 16px;
        background: rgba(0,212,255,0.1);
        border-radius: 8px;
      }
      .stat-number {
        font-size: 24px;
        font-weight: 700;
        color: #00d4ff;
        margin-bottom: 4px;
      }
      .stat-label {
        color: rgba(255,255,255,0.7);
        font-size: 12px;
      }
      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }
      .feature-card {
        padding: 20px;
        background: rgba(0,212,255,0.05);
        border: 1px solid rgba(0,212,255,0.2);
        border-radius: 8px;
        text-align: center;
      }
      .feature-icon {
        font-size: 32px;
        margin-bottom: 12px;
      }
      .feature-card h3 {
        color: #00d4ff;
        font-size: 16px;
        margin: 0 0 8px 0;
      }
      .feature-card p {
        color: rgba(255,255,255,0.7);
        font-size: 14px;
        margin: 0;
      }
      .docs-section {
        margin-top: 16px;
      }
      .docs-section h3 {
        color: #fff;
        font-size: 18px;
        margin-bottom: 8px;
      }
      .marketplace-footer {
        padding: 24px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      .install-btn {
        width: 100%;
        padding: 16px;
        background: #00d4ff;
        color: #000;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .install-btn:hover {
        background: #00b8e6;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,212,255,0.4);
      }
    `,
    config: {
      defaultHeight: 600,
      position: 'bottom',
    },
  },
];

/**
 * Replace template variables with actual values
 */
export function applyTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  return result;
}

/**
 * Get template by ID
 */
export function getTemplateById(
  id: string,
  category: 'function' | 'service'
): PanelTemplate | undefined {
  const templates =
    category === 'function' ? FUNCTION_TEMPLATES : MARKETPLACE_TEMPLATES;
  return templates.find((t) => t.id === id);
}

/**
 * Get all templates for a category
 */
export function getTemplatesByCategory(
  category: 'function' | 'service'
): PanelTemplate[] {
  return category === 'function' ? FUNCTION_TEMPLATES : MARKETPLACE_TEMPLATES;
}


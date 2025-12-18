// power-usage-calendar-card.js
class PowerUsageCalendarCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {};
    this.data = {
      daylist: [],
      yearlist: [],
      monthlist: []
    };
    // 添加API数据存储
    this.apiData = {
      day_list: [],
      year_list: [],
      year_month_list: [],
      total: {}
    };
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth() + 1;
    this.currentDay = new Date().getDate();
    this.availableYears = [];
    this.yearChart = null;
    this.monthChart = null;
    this.dayChart = null;
    this.pieChart = null;
    this.yearChartOriginalData = null;
    
    // 添加数据缓存
    this.cache = {
      daylist: null,
      yearlist: null,
      monthlist: null,
      lastUpdate: 0,
      cacheDuration: 5 * 60 * 1000, // 5分钟缓存
      yearly_data: {},
      monthly_data: {},
      daily_data: {}
    };
    
    // API数据缓存
    this.apiCache = {
      data: null,
      lastUpdate: 0,
      cacheDuration: 5 * 60 * 1000
    };
    
    // 添加窗口大小变化监听器
    this.resizeTimer = null;
  }

  setConfig(config) {
    this.config = {
      entity: config.entity || '',
      title: config.title || '电力使用量日历',
      hide_title: config.hide_title || false,
      width: config.width || '400px',
      // 添加API配置
      external_api: config.external_api || false,
      api_host: config.api_host || ''
    };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    
    // 1. 如果启用了外部API
    if (this.config.external_api) {
      const now = Date.now();
      // 增加一个较长的时间检查（例如30秒内不重复因为hass触发而自动更新API）
      // 或者只在初次加载时通过 set hass 触发
      if (!this._lastApiUpdate || (now - this._lastApiUpdate > 300000)) {
        this._lastApiUpdate = now;
        this.updateApiData();
      }
      return;
    }
    
    // 2. 原有的实体数据处理逻辑（增加数据变化校验）
    if (!this.config.entity) return;
    const entity = hass.states[this.config.entity];
    if (!entity) return;
    
    const entityData = JSON.stringify({
      daylist: entity.attributes?.daylist || [],
      yearlist: entity.attributes?.yearlist || [],
      monthlist: entity.attributes?.monthlist || []
    });

    if (entityData !== this._lastEntityData) {
      this._lastEntityData = entityData;
      this.updateData();
    }
  }

  // 更新API数据
  async updateApiData(force = false) {
    // 1. 基础配置检查
    if (!this.config.external_api || !this.config.api_host) {
      return;
    }
    
    const now = Date.now();
    const cacheExpired = now - this.apiCache.lastUpdate > this.apiCache.cacheDuration;
    
    // 2. 检查缓存：只有在非强制刷新、且缓存未过期、且已有数据时才使用缓存
    if (!force && !cacheExpired && this.apiCache.data) {
      // 如果数据已经在处理中，则不需要重新执行 processApiData 导致 DOM 重绘
      // 只有当 API 数据真的存在且我们需要它时才执行
      this.processApiData(this.apiCache.data);
      return;
    }
    
    // 3. 执行 API 请求
    try {
      const response = await fetch(this.config.api_host);
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      const data = await response.json();
      
      // 4. 更新缓存和时间戳
      this.apiCache.data = data;
      this.apiCache.lastUpdate = now;
      this._lastApiUpdate = now; // 同步更新 set hass 中的锁时间戳
      
      // 5. 分发处理数据
      this.processApiData(data);
      
    } catch (error) {
      console.error('获取API数据失败:', error);
      // 可选：在此处添加 UI 错误提示逻辑
    }
  }

  // 处理API数据
  processApiData(data) {
    // 转换API数据格式为内部格式
    this.apiData = {
      day_list: data.day_list || [],
      year_list: data.year_list || [],
      year_month_list: data.year_month_list || [],
      total: data.total || {}
    };
    
    // 更新可用年份
    this.updateApiAvailableYears();
    
    // 更新UI
    if (this.shadowRoot) {
      this.renderCalendar();
      this.updateStats();
      
      // 如果当前是年或月选项卡，更新图表
      const activeTab = this.shadowRoot.querySelector('.tab-btn.active');
      if (activeTab) {
        const tabName = activeTab.id.replace('tab-', '');
        if (tabName === 'year') {
          this.loadYearChart();
        } else if (tabName === 'month') {
          this.loadMonthChart(this.currentYear);
        } else if (tabName === 'day') {
          this.loadDailyChart();
        }
      }
    }
  }

  // 更新API数据的可用年份
  updateApiAvailableYears() {
    const years = new Set();
    
    // 从year_list获取年份
    this.apiData.year_list.forEach(year => {
      if (year.year) {
        years.add(parseInt(year.year));
      }
    });
    
    // 从day_list获取年份
    this.apiData.day_list.forEach(day => {
      if (day.day) {
        years.add(new Date(day.day).getFullYear());
      }
    });
    
    // 从year_month_list获取年份
    this.apiData.year_month_list.forEach(month => {
      if (month.year_month) {
        years.add(parseInt(month.year_month.split('-')[0]));
      }
    });
    
    this.availableYears = Array.from(years).sort((a, b) => b - a);
    this.updateYearSelectors();
  }

  updateData() {
    // 如果启用了外部API，使用API数据
    if (this.config.external_api) {
      this.updateApiData();
      return;
    }
    
    // 原有逻辑...
    if (!this.config.entity || !this._hass || !this._hass.states[this.config.entity]) {
      return;
    }

    const entity = this._hass.states[this.config.entity];
    const attributes = entity.attributes || {};
    const newDaylist = attributes.daylist || [];
    const newYearlist = attributes.yearlist || [];
    const newMonthlist = attributes.monthlist || [];
    
    // 检查是否需要更新（数据变化或缓存过期）
    const now = Date.now();
    const daylistChanged = JSON.stringify(newDaylist) !== JSON.stringify(this.cache.daylist);
    const yearlistChanged = JSON.stringify(newYearlist) !== JSON.stringify(this.cache.yearlist);
    const monthlistChanged = JSON.stringify(newMonthlist) !== JSON.stringify(this.cache.monthlist);
    const cacheExpired = now - this.cache.lastUpdate > this.cache.cacheDuration;
    
    if (!daylistChanged && !yearlistChanged && !monthlistChanged && !cacheExpired && 
        this.cache.daylist && this.cache.yearlist && this.cache.monthlist) {
      // 使用缓存数据
      this.data.daylist = this.cache.daylist;
      this.data.yearlist = this.cache.yearlist;
      this.data.monthlist = this.cache.monthlist;
      
      // 更新可用年份
      this.updateAvailableYears();
      
      // 更新UI
      this.renderCalendar();
      this.updateStats();
      
      // 如果当前是年或月选项卡，更新图表
      const activeTab = this.shadowRoot.querySelector('.tab-btn.active');
      if (activeTab) {
        const tabName = activeTab.id.replace('tab-', '');
        if (tabName === 'year') {
          this.loadYearChart();
        } else if (tabName === 'month') {
          this.loadMonthChart(this.currentYear);
        }
      }
      return;
    }
    
    // 更新数据
    this.data.daylist = newDaylist;
    this.data.yearlist = newYearlist;
    this.data.monthlist = newMonthlist;
    
    // 更新缓存
    this.cache.daylist = [...newDaylist];
    this.cache.yearlist = [...newYearlist];
    this.cache.monthlist = [...newMonthlist];
    this.cache.lastUpdate = now;
    
    // 更新可用年份
    this.updateAvailableYears();
    
    // 更新UI
    this.renderCalendar();
    this.updateStats();
  }

  updateAvailableYears() {
    const years = new Set();
    
    // 从yearlist获取年份
    this.data.yearlist.forEach(year => {
      if (year.year) {
        years.add(parseInt(year.year));
      }
    });
    
    // 从daylist获取年份（作为备用）
    this.data.daylist.forEach(day => {
      if (day.day) {
        years.add(new Date(day.day).getFullYear());
      }
    });
    
    this.availableYears = Array.from(years).sort((a, b) => b - a);
    this.updateYearSelectors();
  }

  getStyles() {
    return `
      :host {
        --background: rgba(2, 2, 2, 0.5);
        --daybackground-filled: rgba(104,202,150, 0.15);
        --daybackground-empty: rgba(200, 200, 200, 0);
        --calendarbox: 1px solid rgba(255, 255, 255, 0.26);
        --primary-text-color: #ffffff;
        --primary-color: #3f51b5;
        --divider-color: #e0e0e0;
        --date-background: red;
        --date-color: white;
        --today-background: rgba(128,164,255, 0.7);
        --tab-active: #3f51b5;
        --tab-inactive: #e0e0e0;
        --chart-background: rgba(2, 2, 2, 0.1);    //#f8f9fa
        --button-active-bg: rgba(63, 81, 181, 0.1);
      }

      .container {
        max-width: auto;
        background: var(--background);
        padding: 5px;
        padding-top: 10px;
        padding-bottom: 10px;
        box-sizing: border-box;
        margin-left: auto;
        margin-right: auto;
        border-radius: 12px;
        overflow: hidden;
      }

      .card-header {
        padding: 5px 0px;
        border-bottom: 1px solid var(--divider-color);
        margin-bottom: 5px;
      }

      .card-title {
        font-size: 16px;
        font-weight: bold;
        color: var(--primary-text-color);
        text-align: center;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2px;
        flex-wrap: nowrap;
        font-size: 12px;
        padding: 1px 0;
      }

      .tabs-container {
        display: flex;
        justify-content: flex-start;
        gap: 5px;
        flex: 1;
        padding: 8px;
      }

      .tab-btn {
        padding: 4px 5px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: #ffffff00;
        cursor: pointer;
        font-size: 11px;
        color: var(--primary-text-color);
        white-space: nowrap;
        transition: all 0.2s;
        min-width: 30px;
        height: 25px;
      }

      .tab-btn:hover {
        color: var(--primary-color);
      }

      .tab-btn.active {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background-color: var(--button-active-bg);
      }

      .control-container {
        display: none;
        align-items: center;
        justify-content: flex-end;
        gap: 5px;
        flex: 1;
        white-space: nowrap;
      }

      .control-container.show {
        display: flex;
      }

      .control-select {
        background: var(--background);
        color: var(--primary-text-color);
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        padding: 0px 11px 0px 2px;
        font-size: 11px;
        cursor: pointer;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        white-space: nowrap;
        min-width: 42px;
        height: 25px;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 1px center;
        background-size: 12px;
      }

      .control-select:focus {
        outline: none;
        border-color: var(--primary-color);
      }

      .control-btn {
        padding: 4px 10px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: #ffffff00;
        cursor: pointer;
        font-size: 11px;
        color: #ffffff;
        white-space: nowrap;
        transition: all 0.2s;
        min-width: 50px;
        height: 25px;
      }
      
      .control-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .control-btn.active {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background-color: var(--button-active-bg);
      }

    .tab-content {
        display: none;
        width: 100%;
        /* 确保移除固定高度，改为自适应 */
        height: auto; 
        min-height: 100px; /* 设置一个最小高度防止完全塌陷 */
        position: relative;
        box-sizing: border-box;
    }

        .tab-content.active {
            display: block;
            /* 允许内容撑开父容器 */
            height: auto; 
            overflow: visible; 
        }

        .chart-container {
          width: calc(100% - 0px);
          height: 350px; /* 作为初始默认高度 */
          min-height: 250px;
          background: var(--chart-background);
          border-radius: 8px;
          padding: 0px;
          margin: 10px auto 0;
          box-sizing: border-box;
          transition: height 0.3s ease; /* 添加平滑过渡效果 */
        }

      .chart-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-bottom: -4px;
        flex-wrap: wrap;
      }

      .year-selector {
        display: flex;
        gap: 5px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
      }

      .year-btn {
        padding: 4px 8px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: #ffffff00;
        cursor: pointer;
        font-size: 11px;
      }

      .year-btn:hover {
        border-color: var(--primary-color);
      }

      .year-btn.active {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
      }

      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 0px;
        font-size: 0.6em;
        background: transparent;
        border: var(--calendarbox);
        margin-bottom: 5px;
      }

      .day-of-week {
        text-align: center;
        font-weight: bold;
        padding: 4px;
        border-bottom: var(--calendarbox);
        font-size: 11px;
      }
      .day-of-week:not(:last-child) {
        border-right: var(--calendarbox);
      }

      .calendar-day {
        position: relative;
        padding: 2px;
        background: var(--daybackground-empty);
        min-height: 35px;
        border-bottom: var(--calendarbox);
        cursor: pointer;
      }
      .calendar-day:not(:nth-child(7n)) {
        border-right: var(--calendarbox);
      }
      .calendar-day.has-date {
        background: var(--daybackground-filled);
      }
      .calendar-day.today {
        background: var(--today-background) !important;
      }

      .date-circle {
        background: red;
        color: var(--date-color);
        border-radius: 50%;
        width: 22px;
        height: 22px;
        line-height: 21px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 2px;
        left: 4px;
        font-size: 12px;
      }

      /* 修改 .data-value 样式 */
      .data-value {
          background: #F9D505;
          color: black;
          padding: 0px 0px;
          border-radius: 4px;
          margin-top: 13px;
          font-size: 10px;
          
          /* 关键修改：宽度自适应 */
          width: calc(100% - 10px); /* 100% 减去左右各 5px 的间距 */
          margin-left: 5px;         /* 左边距 5px */
          margin-right: 5px;        /* 右边距 5px */
          
          height: 15px;
          line-height: 15px;        /* 让文字垂直居中 */
          text-align: center;
          display: block;           /* 改为 block 确保宽度计算生效 */
          box-sizing: border-box;    /* 确保 padding 不影响宽度计算 */
      }

      /* 修改 .calc-value 样式 */
      .calc-value {
          background: #804AFF;
          color: white;
          padding: 0px 0px;
          border-radius: 4px;
          margin-top: 2px;
          font-size: 10px;

          /* 关键修改：宽度自适应 */
          width: calc(100% - 10px); /* 100% 减去左右各 5px 的间距 */
          margin-left: 5px;         /* 左边距 5px */
          margin-right: 5px;        /* 右边距 5px */

          height: 15px;
          line-height: 15px;        /* 让文字垂直居中 */
          text-align: center;
          display: block;           /* 改为 block */
          box-sizing: border-box;
      }

      .stats-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        padding: 0px 0;
        flex-wrap: nowrap;
      }
      
      .month-stats, .year-stats {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      
      .stat-label {
        font-weight: bold;
      }
      
      .stat-value {
        padding: 2px 2px;
        border-radius: 4px;
        font-weight: bold;
      }
      
      .kwh-value {
        background-color: #F9D505;
        color: black;
      }
      
      .cost-value {
        background-color: #804AFF;
        color: white;
      }
      
      .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        z-index: 1000;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(4px);
        transition: opacity 0.3s ease;
        opacity: 0;
      }
      .modal.show {
        opacity: 1;
      }

      .modal-content {
        background: var(--background);
        border-radius: 16px;
        max-width: 380px;
        width: 90%;
        max-height: 95vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        transform: translateY(-30px);
        transition: transform 0.3s ease;
      }
      .modal.show .modal-content {
        transform: translateY(0);
      }

      .modal-header {
        position: sticky;
        top: 0;
        background: var(--background);
        padding: 2px 8px;
        font-weight: bold;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 10,
        border-bottom: 1px solid #ddd;
        color: #ffffff;
      }

      .modal-body {
        padding: 10px;
        background: var(--background);
        overflow-y: auto;
        flex: 1;
      }

      .close-btn {
        cursor: pointer;
        font-size: 22px;
        color: #888;
        transition: color 0.2s;
      }
      .close-btn:hover {
        color: #f44336;
      }

      .pie-chart-section {
        display: flex;
        align-items: center;
        padding: 0px;
        border-bottom: 1px solid #eee;
        margin-bottom: 10px;
        background-color: #f9f9f9;
        border-radius: 8px;
      }
      
      .pie-chart-container {
        width: 240px;
        height: 140px;
        flex-shrink: 0;
      }
      
      .usage-stats {
        flex: 1;
        padding-left: 15px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        color: black;
      }
      
      .usage-stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding: 1px 10px;
        background-color: white;
        border-radius: 6px;
        border-left: 4px solid;
      }
      
      .usage-stat-item:last-child {
        margin-bottom: 0;
      }
      
      .usage-stat-label {
        font-weight: 500;
        font-size: 11px;
      }
      
      .usage-stat-value {
        font-weight: bold;
        font-size: 11px;
      }
      
      .valley-stat {
        border-left-color: #4CAF50;
      }
      
      .peak-stat {
        border-left-color: #FF9800;
      }
      
      .normal-stat {
        border-left-color: #2196F3;
      }
      
      .sharp-stat {
        border-left-color: #F44336;
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
        font-size: 14px;
        color: #666;
      }

      .loading-spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid var(--primary-color);
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin-right: 10px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .error-message {
        text-align: center;
        padding: 20px;
        color: #f44336;
        font-size: 14px;
      }

      .valley-color { color: #4CAF50; }
      .peak-color { color: #FF9800; }
      .normal-color { color: #2196F3; }
      .sharp-color { color: #F44336; }

      @media (max-width: 600px) {
        .card-header {
          padding: 3px 0px;
          margin-bottom: 3px;
        }
        
        .card-title {
          font-size: 14px;
        }
        
        .header {
          flex-wrap: wrap;
          font-size: 12px;
        }
        .tabs-container {
          margin-bottom: 5px;
        }
        .tab-btn {
          padding: 4px 12px;
          font-size: 11px;
          margin-top: 6px;
        }
        .control-container {
          gap: 5px;
        }
        .control-select {
          padding: 3px 18px 3px 6px;
          font-size: 11px;
          min-width: 60px;
        }
        .control-btn {
          padding: 3px 8px;
          font-size: 11px;
          min-width: 45px;
        }
        .calendar-grid {
          grid-template-columns: repeat(7, minmax(0, 1fr));
          font-size: 0.75em;
        }
        .date-circle {
          width: 16px;
          height: 16px;
          line-height: 11.2px;
          font-size: 11.2px;
        }
        .data-value, .calc-value {
          font-size: 9.6px;
        }
        .stats-container {
          flex-direction: row;
          gap: 0;
          justify-content: space-between;
        }
        .month-stats, .year-stats {
          justify-content: space-between;
        }
        .chart-container {
          width: calc(100% - 20px);
          height: 300px;
        }
        .chart-controls {
          flex-direction: column;
          gap: 5px;
        }
      }
    `;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: ${this.config.width};
          max-width: 100%;
          margin: 0 auto;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        }
        
        ${this.getStyles()}
      </style>
      <div class="container card">
        ${!this.config.hide_title ? `
        <div class="card-header">
          <div class="card-title">${this.config.title}</div>
        </div>
        ` : ''}
        
        <div class="header">
          <div class="tabs-container">
            <button class="tab-btn" id="tab-year">年</button>
            <button class="tab-btn" id="tab-month">月</button>
            <button class="tab-btn" id="tab-day">日</button>
            <button class="tab-btn active" id="tab-calendar">日历</button>
          </div>
          
          <div class="control-container show" id="calendarControls">
            <button class="control-btn" id="currentMonthBtn">本月</button>
            <select id="yearSelect" class="control-select">
            </select>
            <select id="monthSelect" class="control-select">
              ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                `<option value="${m}" ${m === this.currentMonth ? 'selected' : ''}>${m}月</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="control-container" id="dayControls">
            <button class="control-btn" id="refreshDayBtn">刷新</button>
            <select id="dayYearSelect" class="control-select">
            </select>
            <select id="dayMonthSelect" class="control-select">
              ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                `<option value="${m}" ${m === this.currentMonth ? 'selected' : ''}>${m}月</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="tab-content" id="tab-content-year">
          <div class="chart-controls">
            <div class="year-selector" id="yearYearSelector">
            </div>
          </div>
          <div class="chart-container" id="yearChart"></div>
        </div>

        <div class="tab-content" id="tab-content-month">
          <div class="chart-controls">
            <div class="year-selector" id="monthYearSelector">
            </div>
          </div>
          <div class="chart-container" id="monthChart"></div>
        </div>

        <div class="tab-content" id="tab-content-day">
          <div class="chart-container" id="dayChart"></div>
        </div>

        <div class="tab-content active" id="tab-content-calendar">
          <div class="calendar-grid" id="calendarGrid">
          </div>
          
          <div class="stats-container">
            <div class="month-stats">
              <div class="stat-item">
                <span class="stat-label">月用量：</span>
                <span class="stat-value kwh-value" id="monthUsage">0°</span>
                <span class="stat-value cost-value" id="monthCost">￥0</span>
              </div>
            </div>
            
            <div class="year-stats">
              <div class="stat-item">
                <span class="stat-label">年用量：</span>
                <span class="stat-value kwh-value" id="yearUsage">0°</span>
                <span class="stat-value cost-value" id="yearCost">￥0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="detailsModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <span id="modalTitle">用电详情</span>
            <span class="close-btn">&times;</span>
          </div>
          <div id="modalBody" class="modal-body">
          </div>
        </div>
      </div>
    `;
    
    // 添加事件监听器
    this.addEventListeners();
    
    // 初始化ECharts
    this.initCharts();
    
    // 如果启用了外部API，立即获取数据
    if (this.config.external_api) {
      this.updateApiData();
    }
  }

  addEventListeners() {
    // 选项卡切换
    this.shadowRoot.getElementById('tab-year').addEventListener('click', () => this.switchTab('year'));
    this.shadowRoot.getElementById('tab-month').addEventListener('click', () => this.switchTab('month'));
    this.shadowRoot.getElementById('tab-day').addEventListener('click', () => this.switchTab('day'));
    this.shadowRoot.getElementById('tab-calendar').addEventListener('click', () => this.switchTab('calendar'));
    
    // 日历控制
    this.shadowRoot.getElementById('currentMonthBtn').addEventListener('click', () => this.navToCurrentMonth());
    this.shadowRoot.getElementById('yearSelect').addEventListener('change', () => this.updateCalendar());
    this.shadowRoot.getElementById('monthSelect').addEventListener('change', () => this.updateCalendar());
    
    // 日图表控制
    this.shadowRoot.getElementById('refreshDayBtn').addEventListener('click', () => this.loadDailyChart());
    this.shadowRoot.getElementById('dayYearSelect').addEventListener('change', () => this.loadDailyChart());
    this.shadowRoot.getElementById('dayMonthSelect').addEventListener('change', () => this.loadDailyChart());
    
    // 弹窗关闭
    this.shadowRoot.querySelector('.close-btn').addEventListener('click', () => this.closeDetails());
    this.shadowRoot.getElementById('detailsModal').addEventListener('click', (e) => {
      if (e.target.id === 'detailsModal') this.closeDetails();
    });
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', () => {
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }
      this.resizeTimer = setTimeout(() => {
        this.resizeCharts();
      }, 300);
    });
  }

  // ==================== 日历相关方法 ====================
  
  updateCalendar() {
    const yearSelect = this.shadowRoot.getElementById('yearSelect');
    const monthSelect = this.shadowRoot.getElementById('monthSelect');
    
    this.currentYear = parseInt(yearSelect.value);
    this.currentMonth = parseInt(monthSelect.value);
    
    this.renderCalendar();
    this.updateStats();
  }

  navToCurrentMonth() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    
    this.updateYearSelectors();
    this.renderCalendar();
    this.updateStats();
  }

  updateYearSelectors() {
    // 更新日历年份选择器
    const yearSelect = this.shadowRoot.getElementById('yearSelect');
    if (yearSelect) {
      yearSelect.innerHTML = '';
      this.availableYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        if (year === this.currentYear) {
          option.selected = true;
        }
        yearSelect.appendChild(option);
      });
    }
    
    // 更新日图表年份选择器
    const dayYearSelect = this.shadowRoot.getElementById('dayYearSelect');
    if (dayYearSelect) {
      dayYearSelect.innerHTML = '';
      this.availableYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        if (year === this.currentYear) {
          option.selected = true;
        }
        dayYearSelect.appendChild(option);
      });
    }
    
    // 更新月份选择器
    const dayMonthSelect = this.shadowRoot.getElementById('dayMonthSelect');
    if (dayMonthSelect) {
      dayMonthSelect.value = this.currentMonth;
    }
    
    // 更新年图表年份选择器
    this.updateYearChartSelector();
    
    // 更新月图表年份选择器
    this.updateMonthChartSelector();
  }

  updateYearChartSelector() {
    const yearYearSelector = this.shadowRoot.getElementById('yearYearSelector');
    if (!yearYearSelector) return;
    
    yearYearSelector.innerHTML = '';
    
    // 总量按钮
    const totalBtn = document.createElement('button');
    totalBtn.className = 'year-btn';
    totalBtn.textContent = '总量';
    totalBtn.addEventListener('click', () => {
      this.showTotalChart();
      yearYearSelector.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
      totalBtn.classList.add('active');
    });
    yearYearSelector.appendChild(totalBtn);
    
    // 年度按钮
    const allBtn = document.createElement('button');
    allBtn.className = 'year-btn active';
    allBtn.textContent = '年度';
    allBtn.addEventListener('click', () => {
      this.showAllYearsChart();
      yearYearSelector.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
    });
    yearYearSelector.appendChild(allBtn);
    
    // 各年份按钮
    this.availableYears.forEach(year => {
      const btn = document.createElement('button');
      btn.className = 'year-btn';
      btn.textContent = `${year}年`;
      btn.addEventListener('click', () => {
        this.showSingleYearChart(year);
        yearYearSelector.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      yearYearSelector.appendChild(btn);
    });
  }

  updateMonthChartSelector() {
    const monthYearSelector = this.shadowRoot.getElementById('monthYearSelector');
    if (!monthYearSelector) return;
    
    monthYearSelector.innerHTML = '';
    
    this.availableYears.forEach(year => {
      const btn = document.createElement('button');
      btn.className = `year-btn ${year === this.currentYear ? 'active' : ''}`;
      btn.textContent = `${year}年`;
      btn.addEventListener('click', () => {
        this.loadMonthChart(year);
        monthYearSelector.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      monthYearSelector.appendChild(btn);
    });
  }

  renderCalendar() {
    const calendarGrid = this.shadowRoot.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    // 创建星期标题
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    let html = '';
    
    weekdays.forEach(day => {
      html += `<div class="day-of-week">${day}</div>`;
    });
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth, 0);
    const totalDays = lastDay.getDate();
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    
    // 填充空白
    for (let i = 0; i < firstDayOfWeek; i++) {
      html += '<div class="calendar-day"></div>';
    }
    
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === this.currentYear && 
                          (now.getMonth() + 1) === this.currentMonth;
    
    // 填充日期
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let dayData, hasData, dayEleNum, dayEleCost;
      
      if (this.config.external_api) {
        // 使用API数据
        dayData = this.getApiDayData(dateStr);
        hasData = dayData !== null;
        dayEleNum = hasData ? dayData.ele : 0;
        dayEleCost = hasData ? dayData.cost : 0;
      } else {
        // 使用实体数据
        dayData = this.getDayData(dateStr);
        hasData = dayData && (dayData.dayEleNum > 0);
        dayEleNum = hasData ? dayData.dayEleNum : 0;
        dayEleCost = hasData ? dayData.dayEleCost : 0;
      }
      
      const isToday = isCurrentMonth && day === now.getDate();
      
      let dayClass = 'calendar-day';
      if (hasData) dayClass += ' has-date';
      if (isToday) dayClass += ' today';
      
      let usageHtml = '';
      if (hasData) {
        usageHtml = `
          <div class="data-value">${dayEleNum.toFixed(2)}°</div>
          <div class="calc-value">￥${dayEleCost.toFixed(2)}</div>
        `;
      }
      
      html += `
        <div class="${dayClass}" data-date="${dateStr}">
          <span class="date-circle">${day}</span>
          ${usageHtml}
        </div>
      `;
    }
    
    calendarGrid.innerHTML = html;
    
    // 添加点击事件
    calendarGrid.querySelectorAll('.calendar-day.has-date').forEach(day => {
      day.addEventListener('click', (e) => {
        const date = e.currentTarget.dataset.date;
        if (date) this.showDetails(date);
      });
    });
    setTimeout(() => this.syncTabHeights(), 50);    
  }

  getDayData(dateStr) {
    return this.data.daylist.find(day => day.day === dateStr);
  }

  getApiDayData(dateStr) {
    return this.apiData.day_list.find(day => day.day === dateStr) || null;
  }

  updateStats() {
    let monthUsage = 0;
    let monthCost = 0;
    let yearUsage = 0;
    let yearCost = 0;
    
    if (this.config.external_api) {
      // 使用API数据
      // 计算月用量和费用
      this.apiData.day_list.forEach(day => {
        if (!day.day) return;
        const date = new Date(day.day);
        if (date.getFullYear() === this.currentYear && (date.getMonth() + 1) === this.currentMonth) {
          monthUsage += (day.ele || 0);
          monthCost += (day.cost || 0);
        }
      });
      
      // 计算年用量和费用
      const yearData = this.apiData.year_list.find(item => parseInt(item.year) === this.currentYear);
      if (yearData) {
        yearUsage = yearData.ele || 0;
        yearCost = yearData.cost || 0;
      } else {
        // 从日数据计算
        this.apiData.day_list.forEach(day => {
          if (!day.day) return;
          const date = new Date(day.day);
          if (date.getFullYear() === this.currentYear) {
            yearUsage += (day.ele || 0);
            yearCost += (day.cost || 0);
          }
        });
      }
    } else {
      // 使用实体数据
      const currentMonthData = this.getMonthData(this.currentYear, this.currentMonth);
      const currentYearData = this.getYearData(this.currentYear);
      
      // 如果有月数据，直接使用
      if (currentMonthData) {
        monthUsage = currentMonthData.monthEleNum || 0;
        monthCost = currentMonthData.monthEleCost || 0;
      } else {
        // 备用：从daylist计算
        this.data.daylist.forEach(day => {
          if (!day.day) return;
          const date = new Date(day.day);
          if (date.getFullYear() === this.currentYear && (date.getMonth() + 1) === this.currentMonth) {
            monthUsage += (day.dayEleNum || 0);
            monthCost += (day.dayEleCost || 0);
          }
        });
      }
      
      // 如果有年数据，直接使用
      if (currentYearData) {
        yearUsage = currentYearData.yearEleNum || 0;
        yearCost = currentYearData.yearEleCost || 0;
      } else {
        // 备用：从daylist计算
        this.data.daylist.forEach(day => {
          if (!day.day) return;
          const date = new Date(day.day);
          if (date.getFullYear() === this.currentYear) {
            yearUsage += (day.dayEleNum || 0);
            yearCost += (day.dayEleCost || 0);
          }
        });
      }
    }
    
    // 更新UI
    const monthUsageEl = this.shadowRoot.getElementById('monthUsage');
    const monthCostEl = this.shadowRoot.getElementById('monthCost');
    const yearUsageEl = this.shadowRoot.getElementById('yearUsage');
    const yearCostEl = this.shadowRoot.getElementById('yearCost');
    
    if (monthUsageEl) monthUsageEl.textContent = `${monthUsage.toFixed(1)}°`;
    if (monthCostEl) monthCostEl.textContent = `￥${monthCost.toFixed(2)}`;
    if (yearUsageEl) yearUsageEl.textContent = `${yearUsage.toFixed(1)}°`;
    if (yearCostEl) yearCostEl.textContent = `￥${yearCost.toFixed(2)}`;
  }

  // 辅助方法：获取月份数据
  getMonthData(year, month) {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    return this.data.monthlist.find(item => item.month === monthKey);
  }

  // 辅助方法：获取年份数据
  getYearData(year) {
    return this.data.yearlist.find(item => parseInt(item.year) === year);
  }

  // 在类中添加此方法,计算并同步高度
  syncTabHeights() {
    const calendarTab = this.shadowRoot.getElementById('tab-content-calendar');
    const chartContainers = this.shadowRoot.querySelectorAll('.chart-container');
    
    if (!calendarTab || chartContainers.length === 0) return;

    // 1. 获取日历选项卡当前应有的高度
    let calendarHeight = 0;
    // 如果日历当前是显示状态，直接测量
    if (calendarTab.classList.contains('active')) {
      calendarHeight = calendarTab.offsetHeight;
    } else {
      // 如果日历当前隐藏，需要临时显示它来测量真实高度
      const originalStyle = calendarTab.getAttribute('style') || '';
      calendarTab.style.display = 'block';
      calendarTab.style.visibility = 'hidden';
      calendarTab.style.position = 'absolute';
      calendarHeight = calendarTab.offsetHeight;
      calendarTab.setAttribute('style', originalStyle);
    }

    // 2. 将高度应用到所有图表容器
    chartContainers.forEach(container => {
      const parentTab = container.closest('.tab-content');
      const controls = parentTab.querySelector('.chart-controls');
      // 减去选项卡顶部的控制栏高度和 margin
      const controlsHeight = controls ? controls.offsetHeight : 0;
      const adjustedHeight = Math.max(calendarHeight - controlsHeight - 15, 250);
      
      container.style.height = `${adjustedHeight}px`;
    });

    // 3. 通知 ECharts 调整大小
    this.resizeCharts();
  }

  // ==================== 图表相关方法 ====================
  
  initCharts() {
    // 加载ECharts库
    if (!window.echarts) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
      script.onload = () => {
        this.initializeChartInstances();
      };
      document.head.appendChild(script);
    } else {
      this.initializeChartInstances();
    }
  }

  initializeChartInstances() {
    const yearChartEl = this.shadowRoot.getElementById('yearChart');
    const monthChartEl = this.shadowRoot.getElementById('monthChart');
    const dayChartEl = this.shadowRoot.getElementById('dayChart');

    // 初始化前先销毁旧实例，防止重复绑定 DOM 导致显示异常
    if (this.yearChart) { this.yearChart.dispose(); }
    if (this.monthChart) { this.monthChart.dispose(); }
    if (this.dayChart) { this.dayChart.dispose(); }

    // 初始化新实例
    if (yearChartEl) this.yearChart = echarts.init(yearChartEl);
    if (monthChartEl) this.monthChart = echarts.init(monthChartEl);
    if (dayChartEl) this.dayChart = echarts.init(dayChartEl);

    // 初始化后延迟调整大小以确保容器宽度正确
    setTimeout(() => {
      this.resizeCharts();
    }, 100);
  }

  resizeCharts() {
    // 调整所有图表大小
    const charts = [this.yearChart, this.monthChart, this.dayChart, this.pieChart];
    charts.forEach(chart => {
      if (chart && !chart.isDisposed()) {
        try {
          chart.resize();
        } catch (e) {
          console.log('图表调整大小出错:', e);
        }
      }
    });
  }

  showLoading(chart, text) {
    if (!chart) return;
    chart.showLoading({
      text: text,
      color: '#3f51b5',
      textColor: '#000',
      maskColor: 'rgba(255, 255, 255, 0.8)',
      zlevel: 0
    });
  }

  hideLoading(chart) {
    if (!chart) return;
    chart.hideLoading();
  }

  switchTab(tabName) {
    // 更新选项卡按钮状态
    ['year', 'month', 'day', 'calendar'].forEach(name => {
      const btn = this.shadowRoot.getElementById(`tab-${name}`);
      if (btn) btn.classList.toggle('active', name === tabName);
    });
    
    // 隐藏所有控制区域
    ['calendarControls', 'dayControls'].forEach(id => {
      const container = this.shadowRoot.getElementById(id);
      if (container) container.classList.remove('show', 'active');
    });
    
    // 更新内容区域
    ['year', 'month', 'day', 'calendar'].forEach(name => {
      const content = this.shadowRoot.getElementById(`tab-content-${name}`);
      if (content) content.classList.toggle('active', name === tabName);
    });
    
    // 显示对应的控制区域
    if (tabName === 'calendar') {
      const calendarControls = this.shadowRoot.getElementById('calendarControls');
      if (calendarControls) {
        calendarControls.classList.add('show');
        const currentMonthBtn = this.shadowRoot.getElementById('currentMonthBtn');
        if (currentMonthBtn) currentMonthBtn.classList.add('active');
      }
    } else if (tabName === 'day') {
      const dayControls = this.shadowRoot.getElementById('dayControls');
      if (dayControls) {
        dayControls.classList.add('show');
        const refreshDayBtn = this.shadowRoot.getElementById('refreshDayBtn');
        if (refreshDayBtn) refreshDayBtn.classList.add('active');
      }
    }
    this.syncTabHeights();    
    // 加载对应选项卡的数据
    switch(tabName) {
      case 'year':
        this.loadYearChart();
        break;
      case 'month':
        this.loadMonthChart(this.currentYear);
        break;
      case 'day':
        this.loadDailyChart();
        break;
      case 'calendar':
        break;
    }
    
    // 调整图表大小
    setTimeout(() => {
      this.resizeCharts();
    }, 200);
  }

  loadYearChart() {
    if (!this.yearChart) return;
    
    this.showLoading(this.yearChart, '加载年数据中...');
    
    if (this.config.external_api) {
      // 使用API数据
      const years = this.apiData.year_list.sort((a, b) => parseInt(a.year) - parseInt(b.year));
      
      // 准备数据
      const yearList = years.map(item => item.year.toString());
      const valleyData = years.map(item => parseFloat(item.v_ele) || 0);
      const peakData = years.map(item => parseFloat(item.p_ele) || 0);
      const normalData = years.map(item => parseFloat(item.n_ele) || 0);
      const sharpData = years.map(item => parseFloat(item.t_ele) || 0);
      const totalEleData = years.map(item => parseFloat(item.ele) || 0);
      const totalCostData = years.map(item => parseFloat(item.cost) || 0);
      
      this.yearChartOriginalData = {
        yearList,
        valleyData,
        peakData,
        normalData,
        sharpData,
        totalEleData,
        totalCostData,
        years
      };
    } else {
      // 使用实体数据
      const years = this.data.yearlist.sort((a, b) => parseInt(a.year) - parseInt(b.year));
      
      // 准备数据
      const yearList = years.map(item => item.year.toString());
      
      // 提取数据 - 从yearlist直接获取
      const valleyData = years.map(item => parseFloat(item.yearVPq) || 0);
      const peakData = years.map(item => parseFloat(item.yearPPq) || 0);
      const normalData = years.map(item => parseFloat(item.yearNPq) || 0);
      const sharpData = years.map(item => parseFloat(item.yearTPq) || 0);
      const totalEleData = years.map(item => parseFloat(item.yearEleNum) || 0);
      const totalCostData = years.map(item => parseFloat(item.yearEleCost) || 0);
      
      // 存储数据
      this.yearChartOriginalData = {
        yearList,
        valleyData,
        peakData,
        normalData,
        sharpData,
        totalEleData,
        totalCostData,
        years
      };
    }
    
    this.showAllYearsChart();
  }

  showAllYearsChart() {
    if (!this.yearChart || !this.yearChartOriginalData) return;
    
    const data = this.yearChartOriginalData;
    
    const { yearList, valleyData, peakData, normalData, sharpData, totalEleData, totalCostData } = data;
    
    // 存储每个年份的分时电量总和与总电量比较结果
    const compareResults = new Array(yearList.length).fill(false);
    const hollowBarData = new Array(yearList.length).fill(0);
    
    // 计算每个年份的比较结果
    for (let i = 0; i < yearList.length; i++) {
      const totalByTimePeriods = (valleyData[i] + peakData[i] + normalData[i] + sharpData[i]);
      const diff = Math.abs(totalByTimePeriods - totalEleData[i]);
      compareResults[i] = diff <= 200; // 误差在200以内认为相等
      
      // 如果不相等，设置空心柱状图数据
      if (!compareResults[i] && totalEleData[i] > 0) {
        hollowBarData[i] = totalEleData[i];
      }
    }
    
    // 计算金额轴的最大值
    const maxCostValue = Math.max(...totalCostData);
    const costAxisMax = maxCostValue * 2;
    
    // 构建图例数据和系列数据
    const legendData = [];
    const seriesData = [];
    
    // 谷电量
    if (valleyData.some(value => value > 0)) {
      legendData.push('谷电量');
      seriesData.push({
        name: '谷电量',
        type: 'bar',
        stack: '用电量',
        data: valleyData,
        itemStyle: { color: '#4CAF50' },
        barWidth: '60%'
      });
    }
    
    // 峰电量
    if (peakData.some(value => value > 0)) {
      legendData.push('峰电量');
      seriesData.push({
        name: '峰电量',
        type: 'bar',
        stack: '用电量',
        data: peakData,
        itemStyle: { color: '#FF9800' },
        barWidth: '60%'
      });
    }
    
    // 平电量
    if (normalData.some(value => value > 0)) {
      legendData.push('平电量');
      seriesData.push({
        name: '平电量',
        type: 'bar',
        stack: '用电量',
        data: normalData,
        itemStyle: { color: '#2196F3' },
        barWidth: '60%'
      });
    }
    
    // 尖电量
    if (sharpData.some(value => value > 0)) {
      legendData.push('尖电量');
      seriesData.push({
        name: '尖电量',
        type: 'bar',
        stack: '用电量',
        data: sharpData,
        itemStyle: { color: '#F44336' },
        barWidth: '60%'
      });
    }
    
    // 空心柱状图 - 不使用堆叠，从x轴开始，完全重叠
    if (hollowBarData.some(value => value > 0)) {
      seriesData.push({
        name: '',
        type: 'bar',
        data: hollowBarData,
        itemStyle: { 
          color: 'transparent',
          borderColor: '#F9D505',
          borderWidth: 2,
          borderType: 'solid'
        },
        label: { 
          show: false
        },
        barWidth: '60%',
        barGap: '-100%', // 关键：让柱状图完全重叠
        z: 1 // 在底层
      });
    }
    
    // 总用电量标签
    if (totalEleData.some(value => value > 0)) {
      legendData.push('总用电量');
      seriesData.push({
        name: '总用电量',
        type: 'scatter',
        data: totalEleData,
        itemStyle: { 
          color: 'transparent',
          borderWidth: 0
        },
        label: { 
          show: true, 
          position: 'top', 
          fontSize: 10,
          backgroundColor: '#F9D505',
          color: 'black',
          padding: [3, 5, 3, 5],
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#000000',
          borderType: 'solid',
          formatter: function(params) {
            if (params.value === 0 || params.value === 0.00) {
              return '';
            }
            return params.value.toFixed(1);
          }
        },
        symbolSize: 0
      });
    }
    
    // 总金额
    if (totalCostData.some(value => value > 0)) {
      legendData.push('总金额');
      seriesData.push({
        name: '总金额',
        type: 'line',
        yAxisIndex: 1,
        data: totalCostData,
        itemStyle: { color: '#804AFF' },
        lineStyle: { width: 3 },
        symbolSize: 8,
        label: { 
          show: true, 
          position: 'top',
          fontSize: 10,
          backgroundColor: '#804AFF',
          color: 'white',
          padding: [3, 5, 3, 5],
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#FFFFFF',
          borderType: 'solid',
          formatter: function(params) {
            if (params.value === 0 || params.value === 0.00) {
              return '';
            }
            return params.value.toFixed(1);
          }
        }
      });
    }
    
    // 设置x轴标签旋转
    const axisLabelRotate = yearList.length === 1 ? 0 : 45;
    
    // 创建图表配置
    const option = {
      title: { show: false },
      tooltip: {
        trigger: 'axis',
        textStyle: {
          fontSize: 12, 
        },         
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          let result = params[0].name + '<br/>';
          let totalEle = 0;
          let totalCost = 0;
          let totalByTime = 0;
          
          params.forEach(item => {
            if (item.seriesName === '谷电量') {
              result += `<span style="color:#4CAF50">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
              totalByTime += item.value;
            } else if (item.seriesName === '峰电量') {
              result += `<span style="color:#FF9800">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
              totalByTime += item.value;
            } else if (item.seriesName === '平电量') {
              result += `<span style="color:#2196F3">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
              totalByTime += item.value;
            } else if (item.seriesName === '尖电量') {
              result += `<span style="color:#F44336">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
              totalByTime += item.value;
            } else if (item.seriesName === '总用电量') {
              totalEle = item.value;
            } else if (item.seriesName === '') {
              // 空心边框，不在tooltip中显示
            } else if (item.seriesName === '总金额') {
              totalCost = item.value;
            }
          });
          
          result += `<span style="font-weight:bold;">分时总电量: ${totalByTime.toFixed(2)} kWh</span><br/>`;
          result += `<span style="font-weight:bold;">总用电量: ${totalEle.toFixed(2)} kWh</span><br/>`;
          result += `<span style="font-weight:bold;">总金额: ￥${totalCost.toFixed(2)}</span>`;
          return result;
        }
      },
      legend: {
        data: legendData,
        bottom: 0,
        textStyle: { 
          fontSize: 11,
          color: '#ffffff'
        }
      },
      grid: {
        left: '3%',
        right: '1%',
        bottom: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: yearList.map(year => year + '年'),
        axisLabel: { 
          rotate: axisLabelRotate,
          fontSize: 10
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '用电量(kWh)',
          position: 'left',
          axisLine: {
            show: true,
            lineStyle: { color: '#F9D505' }
          },
          splitLine: { show: false }
        },
        {
          type: 'value',
          name: '金额(元)',
          position: 'right',
          splitLine: { show: false },
          axisLine: {
            show: true,
            lineStyle: { color: '#804AFF' }
          },
          min: 0,
          max: Math.max(costAxisMax, 10)
        }
      ],
      series: seriesData
    };
    
    this.yearChart.setOption(option, true);
    this.hideLoading(this.yearChart);
    
    // 调整图表大小
    setTimeout(() => {
      this.resizeCharts();
    }, 100);
  }

  showTotalChart() {
    if (!this.yearChart) return;
    
    this.showLoading(this.yearChart, '计算总量中...');
    
    let totalValley, totalPeak, totalNormal, totalSharp, totalEle, totalCost;
    
    if (this.config.external_api) {
      // 使用API的total节点
      const totalData = this.apiData.total;
      totalValley = parseFloat(totalData.v_ele) || 0;
      totalPeak = parseFloat(totalData.p_ele) || 0;
      totalNormal = parseFloat(totalData.n_ele) || 0;
      totalSharp = parseFloat(totalData.t_ele) || 0;
      totalEle = parseFloat(totalData.ele) || 0;
      totalCost = parseFloat(totalData.cost) || 0;
    } else {
      // 使用实体数据
      const years = this.data.yearlist;
      
      // 计算所有年份的总和
      totalValley = 0;
      totalPeak = 0;
      totalNormal = 0;
      totalSharp = 0;
      totalEle = 0;
      totalCost = 0;
      
      years.forEach(year => {
        totalValley += parseFloat(year.yearVPq) || 0;
        totalPeak += parseFloat(year.yearPPq) || 0;
        totalNormal += parseFloat(year.yearNPq) || 0;
        totalSharp += parseFloat(year.yearTPq) || 0;
        totalEle += parseFloat(year.yearEleNum) || 0;
        totalCost += parseFloat(year.yearEleCost) || 0;
      });
    }
    
    // 计算分时总计和总电量的差值
    const totalByTimePeriods = totalValley + totalPeak + totalNormal + totalSharp;
    const diff = Math.abs(totalByTimePeriods - totalEle);
    const hasRemaining = diff > 200; // 误差大于200认为有剩余
    
    // 准备饼图数据
    const pieData = [];
    
    if (totalValley > 0) {
      pieData.push({
        name: '谷电量',
        value: totalValley,
        itemStyle: { color: '#4CAF50' }
      });
    }
    
    if (totalPeak > 0) {
      pieData.push({
        name: '峰电量',
        value: totalPeak,
        itemStyle: { color: '#FF9800' }
      });
    }
    
    if (totalNormal > 0) {
      pieData.push({
        name: '平电量',
        value: totalNormal,
        itemStyle: { color: '#2196F3' }
      });
    }
    
    if (totalSharp > 0) {
      pieData.push({
        name: '尖电量',
        value: totalSharp,
        itemStyle: { color: '#F44336' }
      });
    }
    
    // 如果有剩余部分，添加空心环形
    if (hasRemaining && totalEle > totalByTimePeriods) {
      const remaining = totalEle - totalByTimePeriods;
      if (remaining > 0) {
        pieData.push({
          name: '剩余电量',
          value: remaining,
          itemStyle: { 
            color: 'transparent',
            borderColor: '#F9D505',
            borderWidth: 2,
            borderType: 'solid'
          }
        });
      }
    }
    
    // 计算百分比
    pieData.forEach(item => {
      item.percent = totalEle > 0 ? ((item.value / totalEle) * 100).toFixed(1) + '%' : '0%';
    });
    
    // 设置饼图选项
    const option = {
      title: { show: false },
      tooltip: {
        trigger: 'item',
        textStyle: {
          fontSize: 12, 
        },         
        formatter: function(params) {
          const value = params.value.toFixed(2);
          const percent = params.percent;
          if (params.name === '剩余电量') {
            return `无归属电量<br/>${value} kWh (${percent}%)<br/>分时电量总和与总电量差异部分`;
          }
          return `${params.name}<br/>${value} kWh (${percent}%)`;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: 11
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { 
          fontSize: 11,
          color: '#ffffff'
        },
        formatter: function(name) {
          const dataItem = pieData.find(item => item.name === name);
          if (!dataItem) return name;
          if (name === '剩余电量') {
            return `${name}: ${dataItem.value.toFixed(1)}kWh (差异)`;
          }
          return `${name}: ${dataItem.value.toFixed(1)}kWh`;
        }
      },
      series: [
        {
          name: '用电量分布',
          type: 'pie',
          radius: ['55%', '70%'],
          center: ['48%', '40%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: function(params) {
              const dataItem = pieData.find(item => item.name === params.name);
              if (!dataItem) return params.name;
              if (params.name === '剩余电量') {
                return `${params.name}\n${params.value.toFixed(1)}kWh\n${dataItem.percent}`;
              }
              return `${params.name}\n${params.value.toFixed(1)}kWh\n${dataItem.percent}`;
            },
            fontSize: 10,
            lineHeight: 14
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          labelLine: {
            length: 15,
            length2: 20,
            smooth: true
          },
          data: pieData
        }
      ],
      graphic: [
        {
          type: 'text',
          left: '38%',
          top: '32%',
          style: {
            text: '所有年份总量',
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#FFFFFF',
            textAlign: 'center',
            textVerticalAlign: 'bottom'
          }
        },
        {
          type: 'text',
          left: '35%',
          top: '37%',
          style: {
            text: `总用电: ${totalEle.toFixed(2)} kWh`,
            fontSize: 12,
            fill: '#3f51b5',
            fontWeight: 'bold',
            textAlign: 'center'
          }
        },
        {
          type: 'text',
          left: '35%',
          top: '42%',
          style: {
            text: `总金额: ￥${totalCost.toFixed(2)}`,
            fontSize: 12,
            fill: '#804AFF',
            fontWeight: 'bold',
            textAlign: 'center'
          }
        },
        {
          type: 'text',
          left: '35%',
          top: '47%',
          style: {
            text: `平均年用电: ${(this.config.external_api ? this.apiData.year_list.length : this.data.yearlist.length) > 0 ? (totalEle / (this.config.external_api ? this.apiData.year_list.length : this.data.yearlist.length)).toFixed(2) : 0} kWh`,
            fontSize: 10,
            fill: '#666',
            textAlign: 'center'
          }
        }
      ]
    };
    
    this.yearChart.setOption(option, true);
    this.hideLoading(this.yearChart);
    
    // 调整图表大小
    setTimeout(() => {
      this.resizeCharts();
    }, 100);
  }

  showSingleYearChart(selectedYear) {
    if (!this.yearChart || !this.yearChartOriginalData) return;
    
    const data = this.yearChartOriginalData;
    const yearIndex = data.yearList.indexOf(selectedYear.toString());
    
    if (yearIndex === -1) return;
    
    // 获取该年份的数据
    const yearData = {
      valley: data.valleyData[yearIndex] || 0,
      peak: data.peakData[yearIndex] || 0,
      normal: data.normalData[yearIndex] || 0,
      sharp: data.sharpData[yearIndex] || 0,
      totalEle: data.totalEleData[yearIndex] || 0,
      totalCost: data.totalCostData[yearIndex] || 0,
      year: selectedYear.toString()
    };
    
    // 计算分时总计和总电量的差值
    const totalByTimePeriods = yearData.valley + yearData.peak + yearData.normal + yearData.sharp;
    const diff = Math.abs(totalByTimePeriods - yearData.totalEle);
    const hasRemaining = diff > 200; // 误差大于200认为有剩余
    
    // 准备饼图数据
    const pieData = [];
    
    if (yearData.valley > 0) {
      pieData.push({
        name: '谷电量',
        value: yearData.valley,
        itemStyle: { color: '#4CAF50' }
      });
    }
    
    if (yearData.peak > 0) {
      pieData.push({
        name: '峰电量',
        value: yearData.peak,
        itemStyle: { color: '#FF9800' }
      });
    }
    
    if (yearData.normal > 0) {
      pieData.push({
        name: '平电量',
        value: yearData.normal,
        itemStyle: { color: '#2196F3' }
      });
    }
    
    if (yearData.sharp > 0) {
      pieData.push({
        name: '尖电量',
        value: yearData.sharp,
        itemStyle: { color: '#F44336' }
      });
    }
    
    // 如果有剩余部分，添加空心环形
    if (hasRemaining && yearData.totalEle > totalByTimePeriods) {
      const remaining = yearData.totalEle - totalByTimePeriods;
      if (remaining > 0) {
        pieData.push({
          name: '剩余电量',
          value: remaining,
          itemStyle: { 
            color: 'transparent',
            borderColor: '#F9D505',
            borderWidth: 2,
            borderType: 'solid'
          }
        });
      }
    }
    
    // 计算百分比
    pieData.forEach(item => {
      item.percent = yearData.totalEle > 0 ? ((item.value / yearData.totalEle) * 100).toFixed(1) + '%' : '0%';
    });
    
    // 设置圆环图选项
    const option = {
      title: { show: false },
      tooltip: {
        trigger: 'item',
        textStyle: {
          fontSize: 12, 
        },         
        formatter: function(params) {
          const value = params.value.toFixed(2);
          const percent = params.percent;
          if (params.name === '剩余电量') {
            return `剩余电量<br/>${value} kWh (${percent}%)<br/>分时电量总和与总电量差异部分`;
          }
          return `${params.name}<br/>${value} kWh (${percent}%)`;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: 11
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { 
          fontSize: 11,
          color: '#ffffff'
        },
        formatter: function(name) {
          const dataItem = pieData.find(item => item.name === name);
          if (!dataItem) return name;
          if (name === '剩余电量') {
            return `${name}: ${dataItem.value.toFixed(1)}kWh (差异)`;
          }
          return `${name}: ${dataItem.value.toFixed(1)}kWh`;
        }
      },
      series: [
        {
          name: '用电量分布',
          type: 'pie',
          radius: ['55%', '70%'],
          center: ['48%', '40%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: function(params) {
              const dataItem = pieData.find(item => item.name === params.name);
              if (!dataItem) return params.name;
              if (params.name === '剩余电量') {
                return `${params.name}\n${params.value.toFixed(1)}kWh\n${dataItem.percent}`;
              }
              return `${params.name}\n${params.value.toFixed(1)}kWh\n${dataItem.percent}`;
            },
            fontSize: 10,
            lineHeight: 14
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          labelLine: {
            length: 15,
            length2: 20,
            smooth: true
          },
          data: pieData
        }
      ],
      graphic: [
        {
          type: 'text',
          left: '38%',
          top: '32%',
          style: {
            text: `${selectedYear}年`,
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#FFFFFF',
            textAlign: 'center',
            textVerticalAlign: 'bottom'
          }
        },
        {
          type: 'text',
          left: '35%',
          top: '37%',
          style: {
            text: `总用电: ${yearData.totalEle.toFixed(2)} kWh`,
            fontSize: 12,
            fill: '#3f51b5',
            fontWeight: 'bold',
            textAlign: 'center'
          }
        },
        {
          type: 'text',
          left: '35%',
          top: '42%',
          style: {
            text: `总金额: ￥${yearData.totalCost.toFixed(2)}`,
            fontSize: 12,
            fill: '#804AFF',
            fontWeight: 'bold',
            textAlign: 'center'
          }
        },
        {
          type: 'text',
          left: '35%',
          top: '47%',
          style: {
            text: `日平均: ${(yearData.totalEle / 365).toFixed(2)} kWh`,
            fontSize: 10,
            fill: '#666',
            textAlign: 'center'
          }
        }
      ]
    };
    
    this.yearChart.setOption(option, true);
    
    // 调整图表大小
    setTimeout(() => {
      this.resizeCharts();
    }, 100);
  }

  loadMonthChart(selectedYear) {
    if (!this.monthChart) return;
    
    this.showLoading(this.monthChart, '加载月数据中...');
    
    let months;
    
    if (this.config.external_api) {
      // 使用API数据
      months = this.apiData.year_month_list.filter(item => {
        if (!item.year_month) return false;
        const year = parseInt(item.year_month.split('-')[0]);
        return year === selectedYear;
      }).sort((a, b) => {
        // 按月份排序
        const monthA = parseInt(a.year_month.split('-')[1]);
        const monthB = parseInt(b.year_month.split('-')[1]);
        return monthA - monthB;
      });
    } else {
      // 使用实体数据
      months = this.data.monthlist.filter(item => {
        // month格式: "2025-12"
        if (!item.month) return false;
        const year = parseInt(item.month.split('-')[0]);
        return year === selectedYear;
      }).sort((a, b) => {
        // 按月份排序
        const monthA = parseInt(a.month.split('-')[1]);
        const monthB = parseInt(b.month.split('-')[1]);
        return monthA - monthB;
      });
    }
    
    // 准备数据
    const monthList = ['1月', '2月', '3月', '4月', '5月', '6月','7月', '8月', '9月', '10月', '11月', '12月'];
    const valleyData = new Array(12).fill(0);
    const peakData = new Array(12).fill(0);
    const normalData = new Array(12).fill(0);
    const sharpData = new Array(12).fill(0);
    const totalEleData = new Array(12).fill(0);
    const totalCostData = new Array(12).fill(0);
    
    // 存储每个月份的分时电量总和与总电量比较结果
    const compareResults = new Array(12).fill(false);
    const hollowBarData = new Array(12).fill(0);
    
    // 填充月份数据
    months.forEach(month => {
      let monthNum, ele, v_ele, p_ele, n_ele, t_ele, cost;
      
      if (this.config.external_api) {
        monthNum = parseInt(month.year_month.split('-')[1]);
        ele = parseFloat(month.ele) || 0;
        v_ele = parseFloat(month.v_ele) || 0;
        p_ele = parseFloat(month.p_ele) || 0;
        n_ele = parseFloat(month.n_ele) || 0;
        t_ele = parseFloat(month.t_ele) || 0;
        cost = parseFloat(month.cost) || 0;
      } else {
        monthNum = parseInt(month.month.split('-')[1]);
        ele = parseFloat(month.monthEleNum) || 0;
        v_ele = parseFloat(month.monthVPq) || 0;
        p_ele = parseFloat(month.monthPPq) || 0;
        n_ele = parseFloat(month.monthNPq) || 0;
        t_ele = parseFloat(month.monthTPq) || 0;
        cost = parseFloat(month.monthEleCost) || 0;
      }
      
      const index = monthNum - 1;
      valleyData[index] = v_ele;
      peakData[index] = p_ele;
      normalData[index] = n_ele;
      sharpData[index] = t_ele;
      totalEleData[index] = ele;
      totalCostData[index] = cost;
      
      // 计算分时电量总和
      const totalByTimePeriods = (valleyData[index] + peakData[index] + normalData[index] + sharpData[index]);
      
      // 判断分时电量总和是否等于总电量（误差正负10）
      const diff = Math.abs(totalByTimePeriods - totalEleData[index]);
      compareResults[index] = diff <= 10; // 误差在10以内认为相等
      
      // 如果不相等，设置空心柱状图数据
      if (!compareResults[index] && totalEleData[index] > 0) {
        hollowBarData[index] = totalEleData[index];
      }
    });
    
    // 计算金额轴的最大值
    const maxCostValue = Math.max(...totalCostData);
    const costAxisMax = maxCostValue * 2;
    
    // 构建图例数据
    const legendData = [];
    const seriesData = [];
    
    // 谷电量
    if (valleyData.some(value => value > 0)) {
      legendData.push('谷电量');
      seriesData.push({
        name: '谷电量',
        type: 'bar',
        stack: '用电量',
        data: valleyData,
        itemStyle: { color: '#4CAF50' },
        barWidth: '60%'
      });
    }
    
    // 峰电量
    if (peakData.some(value => value > 0)) {
      legendData.push('峰电量');
      seriesData.push({
        name: '峰电量',
        type: 'bar',
        stack: '用电量',
        data: peakData,
        itemStyle: { color: '#FF9800' },
        barWidth: '60%'
      });
    }
    
    // 平电量
    if (normalData.some(value => value > 0)) {
      legendData.push('平电量');
      seriesData.push({
        name: '平电量',
        type: 'bar',
        stack: '用电量',
        data: normalData,
        itemStyle: { color: '#2196F3' },
        barWidth: '60%'
      });
    }
    
    // 尖电量
    if (sharpData.some(value => value > 0)) {
      legendData.push('尖电量');
      seriesData.push({
        name: '尖电量',
        type: 'bar',
        stack: '用电量',
        data: sharpData,
        itemStyle: { color: '#F44336' },
        barWidth: '60%'
      });
    }
    
    // 空心柱状图 - 不使用堆叠，从x轴开始，完全重叠
    if (hollowBarData.some(value => value > 0)) {
      seriesData.push({
        name: '',
        type: 'bar',
        data: hollowBarData,
        itemStyle: { 
          color: 'transparent',
          borderColor: '#F9D505',
          borderWidth: 2,
          borderType: 'solid'
        },
        label: { 
          show: false
        },
        barWidth: '60%',
        barGap: '-100%', // 关键：让柱状图完全重叠
        z: 1 // 在底层
      });
    }
    
    // 总用电量标签
    if (totalEleData.some(value => value > 0)) {
      legendData.push('总用电量');
      seriesData.push({
        name: '总用电量',
        type: 'scatter',
        data: totalEleData,
        itemStyle: { 
          color: 'transparent',
          borderWidth: 0
        },
        label: { 
          show: true, 
          position: 'top', 
          fontSize: 10,
          backgroundColor: '#F9D505',
          color: 'black',
          padding: [3, 5, 3, 5],
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#000000',
          borderType: 'solid',
          formatter: function(params) {
            if (params.value === 0 || params.value === 0.00) {
              return '';
            }
            return params.value.toFixed(1);
          }
        },
        symbolSize: 0
      });
    }
    
    // 总金额
    if (totalCostData.some(value => value > 0)) {
      legendData.push('总金额');
      seriesData.push({
        name: '总金额',
        type: 'line',
        yAxisIndex: 1,
        data: totalCostData,
        itemStyle: { color: '#804AFF' },
        lineStyle: { width: 3 },
        symbolSize: 8,
        label: { 
          show: true, 
          position: 'top',
          fontSize: 10,
          backgroundColor: '#804AFF',
          color: 'white',
          padding: [3, 5, 3, 5],
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#FFFFFF',
          borderType: 'solid',
          formatter: function(params) {
            if (params.value === 0 || params.value === 0.00) {
              return '';
            }
            return params.value.toFixed(1);
          }
        }
      });
    }
    
    // 设置图表选项
    const option = {
      title: { show: false },
      tooltip: {
        trigger: 'axis',
        textStyle: {
          fontSize: 12, 
        },         
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          let result = params[0].name + '<br/>';
          let totalEle = 0;
          let totalCost = 0;
          let totalByTime = 0;
          
          params.forEach(item => {
            if (item.seriesName === '谷电量') {
              result += `<span style="color:#4CAF50">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
              totalByTime += item.value;
            } else if (item.seriesName === '峰电量') {
              result += `<span style="color:#FF9800">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
              totalByTime += item.value;
            } else if (item.seriesName === '平电量') {
              result += `<span style="color:#2196F3">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
              totalByTime += item.value;
            } else if (item.seriesName === '尖电量') {
              result += `<span style="color:#F44336">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
              totalByTime += item.value;
            } else if (item.seriesName === '总用电量') {
              totalEle = item.value;
            } else if (item.seriesName === '') {
              // 空心边框，不在tooltip中显示
            } else if (item.seriesName === '总金额') {
              totalCost = item.value;
            }
          });
          
          result += `<span style="font-weight:bold;">分时总电量: ${totalByTime.toFixed(2)} kWh</span><br/>`;
          result += `<span style="font-weight:bold;">总用电量: ${totalEle.toFixed(2)} kWh</span><br/>`;
          result += `<span style="font-weight:bold;">总金额: ￥${totalCost.toFixed(2)}</span>`;
          return result;
        }
      },
      legend: {
        data: legendData,
        bottom: 0,
        textStyle: { 
          fontSize: 11,
          color: '#ffffff'
        }
      },
      grid: {
        left: '3%',
        right: '1%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: monthList
      },
      yAxis: [
          {
            type: 'value',
            name: '用电量(kWh)',
            position: 'left',
            splitLine: { show: false },
            axisLine: {
              show: true,
              lineStyle: { color: '#F9D505' }
            },
            axisLabel: {
              formatter: function (value) {
                return Math.round(value); 
              }
            }
          },
          {
            type: 'value',
            name: '金额(元)',
            position: 'right',
            splitLine: { show: false },
            axisLine: {
              show: true,
              lineStyle: { color: '#804AFF' }
            },
            min: 0,
            max: Math.max(costAxisMax, 10),
            axisLabel: {
              formatter: function (value) {
                return Math.round(value); 
              }
            }
          }
        ],
        series: seriesData
    };
    
    this.monthChart.setOption(option, true);
    this.hideLoading(this.monthChart);
    
    // 调整图表大小
    setTimeout(() => {
      this.resizeCharts();
    }, 100);
  }

  loadDailyChart() {
    if (!this.dayChart) return;
    
    const yearSelect = this.shadowRoot.getElementById('dayYearSelect');
    const monthSelect = this.shadowRoot.getElementById('dayMonthSelect');
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    
    this.showLoading(this.dayChart, '加载日数据中...');
    
    let days;
    
    if (this.config.external_api) {
      // 使用API数据
      days = this.apiData.day_list.filter(day => {
        if (!day.day) return false;
        const date = new Date(day.day);
        return date.getFullYear() === year && (date.getMonth() + 1) === month;
      }).sort((a, b) => new Date(a.day) - new Date(b.day));
    } else {
      // 使用实体数据
      days = this.data.daylist.filter(day => {
        if (!day.day) return false;
        const date = new Date(day.day);
        return date.getFullYear() === year && (date.getMonth() + 1) === month;
      }).sort((a, b) => new Date(a.day) - new Date(b.day));
    }
    
    // 准备数据
    const dayList = days.map(item => {
      const date = new Date(item.day);
      return date.getDate();
    });
    
    let valleyData, peakData, normalData, sharpData, totalEleData, totalCostData;
    
    if (this.config.external_api) {
      valleyData = days.map(item => item.v_ele || 0);
      peakData = days.map(item => item.p_ele || 0);
      normalData = days.map(item => item.n_ele || 0);
      sharpData = days.map(item => item.t_ele || 0);
      totalEleData = days.map(item => item.ele || 0);
      totalCostData = days.map(item => item.cost || 0);
    } else {
      valleyData = days.map(item => item.dayVPq || 0);
      peakData = days.map(item => item.dayPPq || 0);
      normalData = days.map(item => item.dayNPq || 0);
      sharpData = days.map(item => item.dayTPq || 0);
      totalEleData = days.map(item => item.dayEleNum || 0);
      totalCostData = days.map(item => item.dayEleCost || 0);
    }
    
    // 计算最大值和最小值及其索引（用于必须显示的标签）
    const eleMaxValue = Math.max(...totalEleData);
    const eleMinValue = Math.min(...totalEleData.filter(v => v > 0)); // 过滤掉0值
    const eleMaxIndex = totalEleData.indexOf(eleMaxValue);
    const eleMinIndex = totalEleData.indexOf(eleMinValue);
    
    const costMaxValue = Math.max(...totalCostData);
    const costMinValue = Math.min(...totalCostData.filter(v => v > 0)); // 过滤掉0值
    const costMaxIndex = totalCostData.indexOf(costMaxValue);
    const costMinIndex = totalCostData.indexOf(costMinValue);
    
    // 动态计算标签间隔
    const dayCount = dayList.length;
    let interval = 0;
    let rotate = 45;
    
    // 标签抽稀间隔（根据天数调整）
    let labelInterval = 1; // 默认显示所有标签
    
    if (dayCount <= 10) {
      interval = 0;
      rotate = 0;
      labelInterval = 1; // 10天以下显示所有标签
    } else if (dayCount <= 15) {
      interval = 0;
      rotate = 0;
      labelInterval = 2; // 每2个显示一个标签
    } else if (dayCount <= 20) {
      interval = 1;
      rotate = 45;
      labelInterval = 3; // 每3个显示一个标签
    } else if (dayCount <= 25) {
      interval = 2;
      rotate = 45;
      labelInterval = 4; // 每4个显示一个标签
    } else {
      interval = 3;
      rotate = 45;
      labelInterval = 5; // 每5个显示一个标签
    }
    
    // 计算金额轴的最大值
    const maxCostValue = Math.max(...totalCostData);
    const costAxisMax = maxCostValue * 2;
    
    // 构建图例数据
    const legendData = [];
    const seriesData = [];
    
    // 谷电量
    if (valleyData.some(value => value > 0)) {
      legendData.push('谷电量');
      seriesData.push({
        name: '谷电量',
        type: 'bar',
        stack: '用电量',
        data: valleyData,
        itemStyle: { color: '#4CAF50' }
      });
    }
    
    // 峰电量
    if (peakData.some(value => value > 0)) {
      legendData.push('峰电量');
      seriesData.push({
        name: '峰电量',
        type: 'bar',
        stack: '用电量',
        data: peakData,
        itemStyle: { color: '#FF9800' }
      });
    }
    
    // 平电量
    if (normalData.some(value => value > 0)) {
      legendData.push('平电量');
      seriesData.push({
        name: '平电量',
        type: 'bar',
        stack: '用电量',
        data: normalData,
        itemStyle: { color: '#2196F3' }
      });
    }
    
    // 尖电量
    if (sharpData.some(value => value > 0)) {
      legendData.push('尖电量');
      seriesData.push({
        name: '尖电量',
        type: 'bar',
        stack: '用电量',
        data: sharpData,
        itemStyle: { color: '#F44336' }
      });
    }
    
    // 总用电量
    if (totalEleData.some(value => value > 0)) {
      legendData.push('总用电量');
      seriesData.push({
        name: '总用电量',
        type: 'scatter',
        data: totalEleData,
        itemStyle: { 
          color: 'transparent',
          borderWidth: 0
        },
        label: { 
          show: true, 
          position: 'top', 
          fontSize: 10,
          backgroundColor: '#F9D505',
          color: 'black',
          padding: [3, 3, 1, 3],
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#000000',
          borderType: 'solid',
          formatter: function(params) {
            const value = params.value || 0;
            const dataIndex = params.dataIndex;
            
            // 值为0时不显示
            if (value === 0 || value === 0.00) {
              return '';
            }
            
            // 必须显示的条件：最大值、最小值
            if (dataIndex === eleMaxIndex || dataIndex === eleMinIndex) {
              return value.toFixed(1);
            }
            
            // 抽稀显示：按间隔显示标签
            if (dataIndex % labelInterval === 0) {
              return value.toFixed(1);
            }
            
            // 其他情况不显示
            return '';
          }
        },
        symbolSize: 0
      });
    }
    
    // 总金额
    if (totalCostData.some(value => value > 0)) {
      legendData.push('总金额');
      seriesData.push({
        name: '总金额',
        type: 'line',
        yAxisIndex: 1,
        data: totalCostData,
        itemStyle: { color: '#804AFF' },
        lineStyle: { width: 3 },
        symbolSize: 8,
        label: { 
          show: true, 
          position: 'top',
          fontSize: 10,
          backgroundColor: '#804AFF',
          color: 'white',
          padding: [3, 3, 1, 3],
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#FFFFFF',
          borderType: 'solid',
          formatter: function(params) {
            const value = params.value || 0;
            const dataIndex = params.dataIndex;
            
            // 值为0时不显示
            if (value === 0 || value === 0.00) {
              return '';
            }
            
            // 必须显示的条件：最大值、最小值
            if (dataIndex === costMaxIndex || dataIndex === costMinIndex) {
              return value.toFixed(1);
            }
            
            // 抽稀显示：按间隔显示标签
            if (dataIndex % labelInterval === 0) {
              return value.toFixed(1);
            }
            
            // 其他情况不显示
            return '';
          }
        }
      });
    }
    
    // 设置图表选项
    const option = {
      title: { show: false },
      tooltip: {
        trigger: 'axis',
        textStyle: {
          fontSize: 12, 
        },        
        formatter: function(params) {
          const dayNumber = params[0].axisValue; 
          const dayIndex = dayNumber - 1;          
          let dateStr;
          
          if (days && days[dayIndex] && days[dayIndex].day) {
            const dayData = days[dayIndex].day;
            // 处理各种日期格式，统一为"xxxx年xx月xx日"格式
            if (dayData.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
              const [y, m, d] = dayData.split('-');
              dateStr = `${y}年${m.padStart(2, '0')}月${d.padStart(2, '0')}日`;
            }
            // 处理"2024-1-1"格式
            else if (dayData.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
              const [y, m, d] = dayData.split('-');
              dateStr = `${y}年${m.padStart(2, '0')}月${d.padStart(2, '0')}日`;
            }
            // 处理"2024年01月01日"或"2024年1月1日"格式
            else if (dayData.match(/^\d{4}年\d{1,2}月\d{1,2}日$/)) {
              dateStr = dayData.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, (match, y, m, d) => {
                return `${y}年${m.padStart(2, '0')}月${d.padStart(2, '0')}日`;
              });
            }
            // 其他格式直接使用
            else {
              dateStr = dayData;
            }
          } else {
            // 构造"xxxx年xx月xx日"格式
            dateStr = `${year}年${month.toString().padStart(2, '0')}月${dayNumber.toString().padStart(2, '0')}日`;
          }
          
          let result = dateStr + '<br/>';
          let totalEle = 0;
          let totalCost = 0;
          
          params.forEach(item => {
            if (item.seriesName === '谷电量') {
              result += `<span style="color:#4CAF50">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
            } else if (item.seriesName === '峰电量') {
              result += `<span style="color:#FF9800">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
            } else if (item.seriesName === '平电量') {
              result += `<span style="color:#2196F3">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
            } else if (item.seriesName === '尖电量') {
              result += `<span style="color:#F44336">${item.marker} ${item.seriesName}: ${item.value.toFixed(2)} kWh</span><br/>`;
            } else if (item.seriesName === '总用电量') {
              totalEle = item.value;
            } else if (item.seriesName === '总金额') {
              totalCost = item.value;
            }
          });
          
          result += `<span style="font-weight:bold;">总用电量: ${totalEle.toFixed(2)} kWh</span><br/>`;
          result += `<span style="font-weight:bold;">总金额: ￥${totalCost.toFixed(2)}</span>`;
          return result;
        }
      },
      legend: {
        data: legendData,
        bottom: 0,
        textStyle: { 
          fontSize: 11,
          color: '#ffffff'
        }
      },
      grid: {
        left: '3%',
        right: '1%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dayList.map(day => day + '日'),
        axisLabel: { 
          interval: interval,
          rotate: rotate,
          fontSize: 10,
          margin: 8
        },
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '用电量(kWh)',
          position: 'left',
          axisLine: {
            show: true,
            lineStyle: { color: '#F9D505' }
          },          
          splitLine: { show: false }
        },
        {
          type: 'value',
          name: '金额(元)',
          position: 'right',
          splitLine: { show: false },
          axisLine: {
            show: true,
            lineStyle: { color: '#804AFF' }
          },
          min: 0,
          max: Math.max(costAxisMax, 10)
        }
      ],
      series: seriesData
    };
    
    this.dayChart.setOption(option, true);
    this.hideLoading(this.dayChart);
    
    // 调整图表大小
    setTimeout(() => {
      this.resizeCharts();
    }, 100);
  }

  // ==================== 弹窗相关方法 ====================
  
  showDetails(date) {
    const modal = this.shadowRoot.getElementById('detailsModal');
    const modalTitle = this.shadowRoot.getElementById('modalTitle');
    const modalBody = this.shadowRoot.getElementById('modalBody');
    
    modalTitle.textContent = `${date} 用电详情`;
    modal.style.display = 'flex';
    
    modalBody.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span>加载数据中...</span>
      </div>
    `;
    
    setTimeout(() => {
      modal.classList.add('show');
      this.renderDailyDetails(date, modalBody);
    }, 10);
  }

  renderDailyDetails(date, modalBody) {
    let dayData;
    
    if (this.config.external_api) {
      dayData = this.getApiDayData(date);
    } else {
      dayData = this.getDayData(date);
    }
    
    if (!dayData) {
      modalBody.innerHTML = '<p style="text-align: center; padding: 20px;">该日期无数据</p>';
      return;
    }
    
    let valleyEle, peakEle, normalEle, sharpEle, totalEle, totalCost;
    
    if (this.config.external_api) {
      valleyEle = dayData.v_ele || 0;
      peakEle = dayData.p_ele || 0;
      normalEle = dayData.n_ele || 0;
      sharpEle = dayData.t_ele || 0;
      totalEle = dayData.ele || 0;
      totalCost = dayData.cost || 0;
    } else {
      valleyEle = dayData.dayVPq || 0;
      peakEle = dayData.dayPPq || 0;
      normalEle = dayData.dayNPq || 0;
      sharpEle = dayData.dayTPq || 0;
      totalEle = dayData.dayEleNum || 0;
      totalCost = dayData.dayEleCost || 0;
    }
    
    // 创建饼图容器
    const pieChartContainer = document.createElement('div');
    pieChartContainer.className = 'pie-chart-container';
    pieChartContainer.id = 'dailyPieChart';
    
    // 创建统计区域
    const usageStats = document.createElement('div');
    usageStats.className = 'usage-stats';
    
    // 添加统计项
    const valleyStat = document.createElement('div');
    valleyStat.className = 'usage-stat-item valley-stat';
    valleyStat.innerHTML = `
      <span class="usage-stat-label">谷:</span>
      <span class="usage-stat-value">${valleyEle.toFixed(2)} kWh</span>
    `;
    
    const peakStat = document.createElement('div');
    peakStat.className = 'usage-stat-item peak-stat';
    peakStat.innerHTML = `
      <span class="usage-stat-label">峰:</span>
      <span class="usage-stat-value">${peakEle.toFixed(2)} kWh</span>
    `;
    
    const normalStat = document.createElement('div');
    normalStat.className = 'usage-stat-item normal-stat';
    normalStat.innerHTML = `
      <span class="usage-stat-label">平:</span>
      <span class="usage-stat-value">${normalEle.toFixed(2)} kWh</span>
    `;
    
    usageStats.appendChild(valleyStat);
    usageStats.appendChild(peakStat);
    usageStats.appendChild(normalStat);
    
    if (sharpEle > 0) {
      const sharpStat = document.createElement('div');
      sharpStat.className = 'usage-stat-item sharp-stat';
      sharpStat.innerHTML = `
        <span class="usage-stat-label">尖:</span>
        <span class="usage-stat-value">${sharpEle.toFixed(2)} kWh</span>
      `;
      usageStats.appendChild(sharpStat);
    }
    
    // 总用电量
    const totalStat = document.createElement('div');
    totalStat.className = 'usage-stat-item';
    totalStat.style.borderLeftColor = '#804AFF';
    totalStat.style.fontWeight = 'bold';
    totalStat.innerHTML = `
      <span class="usage-stat-label">总:</span>
      <span class="usage-stat-value">${totalEle.toFixed(2)} kWh</span>
    `;
    usageStats.appendChild(totalStat);
    
    // 创建饼图区域
    const pieChartSection = document.createElement('div');
    pieChartSection.className = 'pie-chart-section';
    pieChartSection.appendChild(pieChartContainer);
    pieChartSection.appendChild(usageStats);
    
    modalBody.innerHTML = '';
    modalBody.appendChild(pieChartSection);
    
    // 添加用电详情
    const detailsSection = document.createElement('div');
    detailsSection.style.padding = '5px';
    detailsSection.style.background = '#38b48b';
    detailsSection.style.borderRadius = '8px';
    detailsSection.style.marginTop = '10px';
    detailsSection.innerHTML = `
      <h4 style="margin-top: 0; margin-bottom: 10px;">用电详情</h4>
      <div style="font-size: 12px; line-height: 1.5; ">
        <div><strong>日期:</strong> ${date}</div>
        <div><strong>总用电量:</strong> ${totalEle.toFixed(2)} kWh</div>
        <div><strong>电费:</strong> ￥${totalCost.toFixed(2)}</div>
        <div><strong>平均单价:</strong> ￥${totalEle > 0 ? (totalCost / totalEle).toFixed(3) : '0.000'}/kWh</div>
      </div>
    `;
    modalBody.appendChild(detailsSection);
    
    // 初始化饼图
    this.initPieChart(pieChartContainer, valleyEle, peakEle, normalEle, sharpEle, totalEle);
  }

  initPieChart(container, valleyEle, peakEle, normalEle, sharpEle, totalEle) {
    if (!window.echarts) return;
    
    if (this.pieChart) {
      this.pieChart.dispose();
    }
    
    this.pieChart = echarts.init(container);
    
    // 准备饼图数据
    const pieData = [];
    
    if (valleyEle > 0) {
      pieData.push({
        name: '谷',
        value: valleyEle,
        itemStyle: { color: '#4CAF50' }
      });
    }
    
    if (peakEle > 0) {
      pieData.push({
        name: '峰',
        value: peakEle,
        itemStyle: { color: '#FF9800' }
      });
    }
    
    if (normalEle > 0) {
      pieData.push({
        name: '平',
        value: normalEle,
        itemStyle: { color: '#2196F3' }
      });
    }
    
    if (sharpEle > 0) {
      pieData.push({
        name: '尖',
        value: sharpEle,
        itemStyle: { color: '#F44336' }
      });
    }
    
    const option = {
      title: {
        show: false
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} kWh  <br/>({d}%)',
        padding: [3, 3],
        textStyle: {
          fontSize: 12,
          lineHeight: 18
        }
      },
      legend: {
        show: false
      },
      series: [
        {
          name: '用电量',
          type: 'pie',
          radius: '70%',
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 0,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}用电\n{c}kWh\n{d}%',
            fontSize: 10
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            length: 10,
            length2: 10
          },
          data: pieData
        }
      ]
    };
    
    this.pieChart.setOption(option);
    
    // 调整图表大小
    setTimeout(() => {
      if (this.pieChart && !this.pieChart.isDisposed()) {
        this.pieChart.resize();
      }
    }, 100);
  }

  closeDetails() {
    const modal = this.shadowRoot.getElementById('detailsModal');
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('power-usage-calendar-card', PowerUsageCalendarCard);
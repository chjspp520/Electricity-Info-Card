const template = document.createElement('template');
template.innerHTML = `
  <style>
    .electricity-card {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, rgba(204, 244, 243, 1) 0%, rgba(177, 233, 234, 1) 100%);
      border-radius: 16px;
      padding: 4px 8px;;
      color: #333333;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      margin: 0 auto;
      transition: background 0.3s ease;
    }

    .header {
      display: flex;
      justify-content: center; /* 改为居中显示 */
      align-items: center;
      margin-bottom: 0px;
    }

    .user-info {
      font-size: 15px;
      font-weight: 600;
      color: #333;
      text-align: center; /* 确保文本居中 */
      width: 100%; /* 占据整个宽度 */
    }

    .user-info.hidden {
      display: none;
    }

    .balance-section {
      text-align: left;
      margin-bottom: 4px;
      padding-bottom: 0px;
    }

    .balance-label {
      font-size: 14px;
      opacity: 0.7;
      margin-bottom: 0px;
      color: #666;
      order: 0;
    }

    .balance-price-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: -7px;
      order: 2;
    }
    
    .balance-item {
      display: flex;
      align-items: baseline;
      gap: 8px; 
    }
    
    .balance-amount {
      font-size: 30px;
      font-weight: 700;
      color: #ff5722;
      display: flex;
      align-items: baseline;
    }

    .balance-unit {
      font-size: 14px;
      opacity: 0.8;
      margin-left: 4px;
      color: #666;
    }

    .price-display {
      display: flex;
      align-items: baseline;
      font-size: 20px;
      font-weight: 600;
      color: #2196f3;
    }

    .price-label {
      font-size: 12px;
      opacity: 0.7;
      margin-right: 4px;
      color: #666;
      font-weight: normal;
    }

    .price-value {
      color: #2196f3;
      font-weight: 600;
    }

    .price-unit {
      font-size: 12px;
      opacity: 0.8;
      margin-left: 4px;
      color: #666;
    }

    .date-info {
      font-size: 11px;
      opacity: 0.7;
      color: #666;
    }

    .tier-indicator {
      margin: 0px 0 0px 0;
      padding: 0px 0;
      position: relative;
    }

    .tier-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tier-label-left {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }

    .tier-label-right {
      font-size: 12px;
      opacity: 0.8;
    }

    .tiers-container {
      display: flex;
      align-items: flex-end;
      margin-bottom: 10px;
      position: relative;
      justify-content: center;
      gap: 2px;
    }

    .tier {
      position: relative;
      flex: 1;
      min-height: 40px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      max-width: 140px;
      top: 13px;
      transition: top 0.3s ease;
    }

    .tier-block {
      position: relative;
      height: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      color: #333;
      text-align: center;
      line-height: 1.2;
      z-index: 1;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      overflow: hidden;
      white-space: nowrap; /* 防止文字换行 */
    }

    /* 第一阶梯样式 - 右侧尖箭头，左侧直角 */
    .tier-1 .tier-block {
      background-color: rgb(85, 197, 147);
      /* 路径：左上 -> 右上折点 -> 右尖端 -> 右下折点 -> 左下 */
      clip-path: polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%);
      margin-right: -10px;
    }

    /* 第二阶梯样式 - 右侧尖箭头，左侧内凹箭头 */
    .tier-2 .tier-block {
      background-color: rgb(248, 195, 55);
      /* 路径：左上 -> 右上折点 -> 右尖端 -> 右下折点 -> 左下 -> 左侧内凹点 */
      clip-path: polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%, 12px 50%);
      margin: 0 -10px;
    }

    /* 第三阶梯样式 - 右侧直角，左侧内凹箭头 */
    .tier-3 .tier-block {
      background-color: rgb(247, 147, 53);
      /* 路径：左上 -> 右上 -> 右下 -> 左下 -> 左侧内凹点 */
      clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 12px 50%);
      margin-left: -10px;
    }

    /* 红色竖线指示器 - 放在tiers-container中，与current-indicator相同的定位基准 */
    .red-line-indicator {
      position: absolute;
      top: 13px;
      left: 0;
      width: 3px;
      height: 15px;
      background-color: #ff0000;
      z-index: 8;
      box-shadow: 0 0 3px rgba(255, 0, 0, 0.7);
      transform: translateX(-50%);
    }

    .tier.current .tier-block {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      filter: brightness(1.05);
    }

    .tier-content {
      margin-top: 2px;
      text-align: center;
      font-size: 11px;
      color: #666;
      line-height: 1.3;
      padding: 6px 4px;
      border-radius: 4px;
      position: relative;
      overflow: hidden;
      z-index: 0;
      transition: all 0.3s ease;
    }

    .tier-content.hidden {
      display: none;
    }

    /* 第一阶梯内容渐变背景 - 从上到下 */
    .tier-1 .tier-content {
      background: linear-gradient(to bottom, rgb(213, 250, 237) 0%, rgba(237, 252, 245, 0.3) 100%);
      /* 移除边框 */
    }

    /* 第二阶梯内容渐变背景 - 从左上到下 */
    .tier-2 .tier-content {
      background: linear-gradient(to bottom right, rgb(248, 247, 217) 0%, rgba(255, 252, 236, 0.3) 100%);
      /* 移除边框 */
    }

    /* 第三阶梯内容渐变背景 - 从左上到下 */
    .tier-3 .tier-content {
      background: linear-gradient(to bottom right, rgb(253, 240, 224) 0%, rgba(254, 245, 238, 0.3) 100%);
      /* 移除边框 */
    }

    .tier-title {
      font-weight: 600;
      margin-bottom: 2px;
      color: #444;
    }

    .tier-range {
      margin-bottom: 2px;
      color: #555;
    }

    .tier-price {
      color: #2196f3;
      font-weight: 500;
    }

    .current-indicator {
      position: absolute;
      top: -18px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #ff5722;
      color: white;
      padding: 4px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 4px;
      pointer-events: none; /* 防止遮挡点击事件 */
    }

    /* 根据当前阶梯设置背景色 */
    .current-indicator.tier-1 {
      background-color: rgb(85, 197, 147);
    }

    .current-indicator.tier-2 {
      background-color: rgb(248, 195, 55);
    }

    .current-indicator.tier-3 {
      background-color: rgb(247, 147, 53);
    }

    .current-indicator:after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 4px solid;
    }

    .current-indicator.tier-1:after {
      border-top-color: rgb(85, 197, 147);
    }

    .current-indicator.tier-2:after {
      border-top-color: rgb(248, 195, 55);
    }

    .current-indicator.tier-3:after {
      border-top-color: rgb(247, 147, 53);
    }

    .data-container {
      display: flex;
      flex-direction: row;
      gap: 10px; /* 进一步减少间距 */
      margin-bottom: 10px;
      margin-top: 20px;
      transition: margin-top 0.3s ease;
    }

    /* 当tier-content隐藏时，data-container向上移动 */
    .data-container.compact {
      margin-top: 0px;
    }

    .current-month-stats {
      flex: 1;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      padding: 6px;
      backdrop-filter: blur(5px);
      min-width: 100px;
    }
    
    .month-stats {
      flex: 1;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      padding: 6px;
      backdrop-filter: blur(5px);
      min-width: 120px; 
    }
    
    .year-stats {
      flex: 1;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      padding: 6px;
      backdrop-filter: blur(5px);
      min-width: 120px;
    }
    
    .month-label {
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
    }

    .month-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0px;
      margin-bottom: 4px; /* 添加底部边距为分时条留空间 */
    }

    .month-stat {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .month-stat-value {
      font-size: 12px;
      font-weight: 600;
      color: #2196f3;
      display: flex;
      align-items: baseline;
    }

    .month-stat-value.yellow {
      color: #ff9800;
    }

    .month-stat-value.green {
      color: #4caf50;
    }

    .month-stat-unit {
      font-size: 10px;
      opacity: 0.8;
      margin-left: 2px;
      color: #666;
    }

    .year-label {
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 2px; /* 减少底部边距 */
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
    }

    .year-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0px;
      margin-bottom: 4px; /* 添加底部边距为分时条留空间 */
    }

    .year-stat {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .year-stat-value {
      font-size: 12px;
      font-weight: 600;
      color: #4caf50;
      display: flex;
      align-items: baseline;
    }

    .year-stat-unit {
      font-size: 10px;
      opacity: 0.8;
      margin-left: 2px;
      color: #666;
    }

    .time-distribution-bar {
      width: 100%;
      height: 15px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
      display: flex;
      margin-top: -4px;
      position: relative; 
    }

    .time-distribution-bar.empty {
      display: none; /* 当没有数据时隐藏 */
    }

    .time-distribution-bar.hidden {
      display: none; /* 当配置为不显示时隐藏 */
    }

    .time-segment {
      height: 100%;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      font-size: 9px;
      font-weight: 600;
      color: white; 
      text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
      min-width: 20px;
    }

    /* 各分时用电背景色 */
  .time-segment-peak {
    background: linear-gradient(90deg, #FF9800, #F57C00); /* 峰 - 橙色渐变 */
  }

  .time-segment-normal {
    background: linear-gradient(90deg, #2196F3, #1976D2); /* 平 - 蓝色渐变 */
  }

  .time-segment-valley {
    background: linear-gradient(90deg, #4CAF50, #388E3C); /* 谷 - 绿色渐变 */
  }

  .time-segment-tip {
    background: linear-gradient(90deg, #F44336, #D32F2F); /* 尖 - 红色渐变 */
  }

    /* 分时用电标签 - 移除前面的颜色点 */
    .time-labels {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #666;
      margin-top: 2px;
      opacity: 0.8;
      position: relative;
    }

    .time-labels.empty {
      display: none; /* 当没有数据时隐藏 */
    }

    .time-labels.hidden {
      display: none; /* 当配置为不显示时隐藏 */
    }

    .time-label {
      display: flex;
      flex-direction: column; /* 改为垂直布局 */
      align-items: center;
      text-align: center;
      width: 100%; /* 每个标签占满可用空间 */
    }

    /* 移除时间点样式 */
    .time-dot {
      display: none; /* 隐藏颜色点 */
    }

    .icon {
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    .tier-icon {
      width: 14px;
      height: 14px;
    }
  </style>

  <div class="electricity-card">
    <div class="header">
      <div class="user-info" id="user-info">用电信息</div>
    </div>

    <div class="balance-section">
      <div class="balance-price-row">
        <div class="balance-item">
          <span class="balance-label">余额</span>
          <div class="balance-amount">
            ¥<span id="balance">0.00</span>
            <span class="balance-unit">元</span>
          </div>
        </div>
        <div class="price-display">
          <span class="price-label">单价:</span>
          <span class="price-value" id="electricity-price">0.4983</span>
          <span class="price-unit">元/千瓦时</span>
        </div>
      </div>
      <div class="date-info" id="date">更新时间 --</div>
    </div>

    <div class="tier-indicator">
      <div class="tier-label">
        <div class="tier-label-left">
          <svg class="icon tier-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,12H9V17H7V12M11,7H13V17H11V7M15,10H17V17H15V10Z" />
          </svg>
          用电阶梯
        </div>
        <div class="tier-label-right" id="tier-period">阶梯周期: 07.01-06.30</div>
      </div>
      
      <div class="tiers-container">
        <div class="tier tier-1" id="tier-1">
          <div class="tier-block" id="tier-1-block">第一阶梯</div>
          <div class="tier-content">
            <div class="tier-range" id="tier-1-range">0-2160度</div>
            <div class="tier-price" id="tier-1-price">0.4983元/度</div>
          </div>
        </div>
        
        <div class="tier tier-2" id="tier-2">
          <div class="tier-block" id="tier-2-block">第二阶梯</div>
          <div class="tier-content">
            <div class="tier-range" id="tier-2-range">2161-4200度</div>
            <div class="tier-price" id="tier-2-price">0.5483元/度</div>
          </div>
        </div>
        
        <div class="tier tier-3" id="tier-3">
          <div class="tier-block" id="tier-3-block">第三阶梯</div>
          <div class="tier-content">
            <div class="tier-range" id="tier-3-range">4201度以上</div>
            <div class="tier-price" id="tier-3-price">0.7983元/度</div>
          </div>
        </div>
        
        <div class="current-indicator" id="current-indicator">
          第<span id="current-tier">1</span>阶梯 <span id="current-usage">0</span>度
        </div>
      </div>
    </div>

    <div class="data-container" id="data-container">
      <!-- 本月用电 -->
      <div class="current-month-stats">
        <div class="month-label">
          <svg class="icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          本月用电
        </div>
        
        <div class="month-grid">
          <div class="month-stat">
            <div class="month-stat-value green">
              <span id="current-month-electricity">0</span>
              <span class="month-stat-unit">度</span>
            </div>
          </div>
          
          <div class="month-stat">
            <div class="month-stat-value yellow">
              <span id="current-month-cost">0.00</span>
              <span class="month-stat-unit">元</span>
            </div>
          </div>
        </div>
        
        <!-- 本月分时用电条 -->
        <div class="time-distribution-bar" id="current-month-distribution"></div>
        <div class="time-labels" id="current-month-labels"></div>
      </div>

      <!-- 上月统计 -->
      <div class="month-stats">
        <div class="month-label">
          <svg class="icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M11.25 6C11.25 4.2 12.71 2.74 14.5 2.74C16.29 2.74 17.75 4.2 17.75 6H20V21H4V6H6.25C6.25 4.2 7.71 2.74 9.5 2.74C11.29 2.74 12.75 4.2 12.75 6H11.25M14.5 4.24C13.53 4.24 12.75 5.02 12.75 6H16.25C16.25 5.02 15.47 4.24 14.5 4.24M9.5 4.24C8.53 4.24 7.75 5.02 7.75 6H11.25C11.25 5.02 10.47 4.24 9.5 4.24M6.25 8V19H17.75V8H15.25V10H13.75V8H10.25V10H8.75V8H6.25Z"/>
          </svg>
          上月统计
        </div>
        
        <div class="month-grid">
          <div class="month-stat">
            <div class="month-stat-value">
              <span id="last-month-electricity">0</span>
              <span class="month-stat-unit">度</span>
            </div>
          </div>
          
          <div class="month-stat">
            <div class="month-stat-value yellow">
              <span id="last-month-cost">0.00</span>
              <span class="month-stat-unit">元</span>
            </div>
          </div>
        </div>
        
        <!-- 上月分时用电条 -->
        <div class="time-distribution-bar" id="last-month-distribution"></div>
        <div class="time-labels" id="last-month-labels"></div>
      </div>

      <!-- 年度累计 -->
      <div class="year-stats">
        <div class="year-label">
          <svg class="icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9,10V12H7V10H9M13,10V12H11V10H13M17,10V12H15V10H17M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H6V1H8V3H16V1H18V3H19M19,19V8H5V19H19M9,14V16H7V14H9M13,14V16H11V14H13M17,14V16H15V14H17Z"/>
          </svg>
          <span id="current-year">2025</span>年累计
        </div>
        
        <div class="year-grid">
          <div class="year-stat">
            <div class="year-stat-value">
              <span id="year-electricity">0</span>
              <span class="year-stat-unit">度</span>
            </div>
          </div>
          
          <div class="year-stat">
            <div class="year-stat-value">
              <span id="year-cost">0.00</span>
              <span class="year-stat-unit">元</span>
            </div>
          </div>
        </div>
        
        <!-- 年度分时用电条 -->
        <div class="time-distribution-bar" id="year-distribution"></div>
        <div class="time-labels" id="year-labels"></div>
      </div>
    </div>
  </div>
`;

class ElectricityInfoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    // 存储元素引用
    this.userInfoEl = this.shadowRoot.getElementById('user-info');
    this.balanceEl = this.shadowRoot.getElementById('balance');
    this.dateEl = this.shadowRoot.getElementById('date');
    this.electricityCardEl = this.shadowRoot.querySelector('.electricity-card');
    this.dataContainerEl = this.shadowRoot.getElementById('data-container');
    
    // 本月用电元素
    this.currentMonthElectricityEl = this.shadowRoot.getElementById('current-month-electricity');
    this.currentMonthCostEl = this.shadowRoot.getElementById('current-month-cost');
    this.currentMonthDistributionEl = this.shadowRoot.getElementById('current-month-distribution');
    this.currentMonthLabelsEl = this.shadowRoot.getElementById('current-month-labels');
    
    // 上月用电元素
    this.lastMonthElectricityEl = this.shadowRoot.getElementById('last-month-electricity');
    this.lastMonthCostEl = this.shadowRoot.getElementById('last-month-cost');
    this.lastMonthDistributionEl = this.shadowRoot.getElementById('last-month-distribution');
    this.lastMonthLabelsEl = this.shadowRoot.getElementById('last-month-labels');
    
    // 年度用电元素
    this.currentYearEl = this.shadowRoot.getElementById('current-year');
    this.yearElectricityEl = this.shadowRoot.getElementById('year-electricity');
    this.yearCostEl = this.shadowRoot.getElementById('year-cost');
    this.yearDistributionEl = this.shadowRoot.getElementById('year-distribution');
    this.yearLabelsEl = this.shadowRoot.getElementById('year-labels');
    
    this.electricityPriceEl = this.shadowRoot.getElementById('electricity-price');
    
    // 阶梯电价相关元素
    this.tierPeriodEl = this.shadowRoot.getElementById('tier-period');
    this.tier1El = this.shadowRoot.getElementById('tier-1');
    this.tier2El = this.shadowRoot.getElementById('tier-2');
    this.tier3El = this.shadowRoot.getElementById('tier-3');
    this.currentIndicatorEl = this.shadowRoot.getElementById('current-indicator');
    this.currentTierEl = this.shadowRoot.getElementById('current-tier');
    this.currentUsageEl = this.shadowRoot.getElementById('current-usage');
    this.tiersContainerEl = this.shadowRoot.querySelector('.tiers-container');
    
    // 阶梯块中的文字元素
    this.tier1BlockEl = this.shadowRoot.getElementById('tier-1-block');
    this.tier2BlockEl = this.shadowRoot.getElementById('tier-2-block');
    this.tier3BlockEl = this.shadowRoot.getElementById('tier-3-block');
    
    // 阶梯范围DOM元素
    this.tier1RangeEl = this.shadowRoot.getElementById('tier-1-range');
    this.tier2RangeEl = this.shadowRoot.getElementById('tier-2-range');
    this.tier3RangeEl = this.shadowRoot.getElementById('tier-3-range');
    this.tier1PriceEl = this.shadowRoot.getElementById('tier-1-price');
    this.tier2PriceEl = this.shadowRoot.getElementById('tier-2-price');
    this.tier3PriceEl = this.shadowRoot.getElementById('tier-3-price');
    
    // 所有tier-content元素
    this.tierContentElements = this.shadowRoot.querySelectorAll('.tier-content');
    
    // 默认配置
    this.defaultConfig = {
      // 阶梯电价配置
      tier1_max: 2160,
      tier1_price: 0.4983,
      tier2_max: 4200,
      tier2_price: 0.5483,
      tier3_price: 0.7983,
      // 计费周期配置 (格式: M.D-M.D 如: 7.1-6.30)
      billing_cycle: '7.1-6.30',
      // 背景色配置
      background: 'linear-gradient(135deg, rgba(204, 244, 243, 1) 0%, rgba(177, 233, 234, 1) 100%)',
      // 是否显示名称
      show_name: true,
      // 是否显示分时用电条
      show_time_distribution: true,
      // 是否显示阶梯详情（tier-content）
      show_tier_content: true
    };
    
    // 阶梯电价配置
    this.tierConfig = {
      tiers: [
        { id: 1, max: 2160, price: 0.4983, color: '#55c593', title: '第一阶梯' },
        { id: 2, max: 4200, price: 0.5483, color: '#f8c337', title: '第二阶梯' },
        { id: 3, max: Infinity, price: 0.7983, color: '#f79335', title: '第三阶梯' }
      ],
      // 阶梯电价计算周期 (默认: 7月1日到6月30日)
      periodStartMonth: 7, // 开始月份
      periodStartDay: 1,   // 开始日
      periodEndMonth: 6,   // 结束月份
      periodEndDay: 30     // 结束日
    };
    
    // 分时用电配置
    this.timeConfig = {
      // 分时用电类型配置
      types: [
        { key: 'TPq', name: '尖', colorClass: 'time-segment-tip', dotClass: 'time-dot-tip' },
        { key: 'PPq', name: '峰', colorClass: 'time-segment-peak', dotClass: 'time-dot-peak' },
        { key: 'NPq', name: '平', colorClass: 'time-segment-normal', dotClass: 'time-dot-normal' },
        { key: 'VPq', name: '谷', colorClass: 'time-segment-valley', dotClass: 'time-dot-valley' }
      ]
    };
    
    // 初始化变量
    this._hass = null;
    this._config = null;
    this.currentPeriodUsage = 0; // 当前周期用电量
    this.currentTier = 1; // 当前阶梯
    this.lastUpdateTime = 0; // 上次更新时间戳
    this.updateInterval = 10 * 60 * 1000; // 10分钟更新间隔（毫秒）
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('请配置实体');
    }
    
    this._config = config;
    
    // 设置用户名称（如果配置了的话）
    if (config.name) {
      this.userInfoEl.textContent = config.name;
    }
    
    // 控制名称显示
    this.updateNameVisibility(config);
    
    // 控制分时用电显示
    this.updateTimeDistributionVisibility(config);
    
    // 控制阶梯详情显示
    this.updateTierContentVisibility(config);
    
    // 更新阶梯电价配置和计费周期配置
    this.updateTierConfig(config);
    this.updatePeriodConfig(config);
    
    // 更新背景色配置
    this.updateBackgroundConfig(config);
    
    this.updateCard();
  }

  // 控制名称显示
  updateNameVisibility(config) {
    // 默认显示名称
    const showName = config.show_name !== undefined ? config.show_name : this.defaultConfig.show_name;
    
    if (showName) {
      this.userInfoEl.classList.remove('hidden');
    } else {
      this.userInfoEl.classList.add('hidden');
    }
  }

  // 控制分时用电显示
  updateTimeDistributionVisibility(config) {
    // 默认显示分时用电
    const showTimeDistribution = config.show_time_distribution !== undefined ? config.show_time_distribution : this.defaultConfig.show_time_distribution;
    
    // 获取所有分时用电相关元素
    const timeDistributionBars = [
      this.currentMonthDistributionEl,
      this.lastMonthDistributionEl,
      this.yearDistributionEl
    ];
    
    const timeLabels = [
      this.currentMonthLabelsEl,
      this.lastMonthLabelsEl,
      this.yearLabelsEl
    ];
    
    if (showTimeDistribution) {
      // 显示分时用电条和标签
      timeDistributionBars.forEach(el => el.classList.remove('hidden'));
      timeLabels.forEach(el => el.classList.remove('hidden'));
    } else {
      // 隐藏分时用电条和标签
      timeDistributionBars.forEach(el => el.classList.add('hidden'));
      timeLabels.forEach(el => el.classList.add('hidden'));
    }
  }

  // 控制阶梯详情显示
  updateTierContentVisibility(config) {
    // 默认显示阶梯详情
    const showTierContent = config.show_tier_content !== undefined ? config.show_tier_content : this.defaultConfig.show_tier_content;
    
    // 获取所有tier元素
    const tierElements = [
      this.tier1El,
      this.tier2El,
      this.tier3El
    ];
    
    if (showTierContent) {
      // 显示tier-content元素
      this.tierContentElements.forEach(el => el.classList.remove('hidden'));
      // 移除data-container的compact类
      this.dataContainerEl.classList.remove('compact');
      
      // 当show_tier_content为true时，设置tier的top为13px
      tierElements.forEach(el => {
        el.style.top = '13px';
      });
      
      // 当show_tier_content为true时，tier-block中只显示阶梯名称
      this.updateTierBlockText(true);
    } else {
      // 隐藏tier-content元素
      this.tierContentElements.forEach(el => el.classList.add('hidden'));
      // 添加data-container的compact类，使其向上移动
      this.dataContainerEl.classList.add('compact');
      
      // 当show_tier_content为false时，设置tier的top为-13px
      tierElements.forEach(el => {
        el.style.top = '-13px';
      });
      
      // 当show_tier_content为false时，tier-block中显示阶梯电量
      this.updateTierBlockText(false);
    }
  }
  
  // 新增方法：根据是否显示tier-content来更新tier-block文本
  updateTierBlockText(showTierContent) {
    const tier1 = this.tierConfig.tiers[0];
    const tier2 = this.tierConfig.tiers[1];
    const tier3 = this.tierConfig.tiers[2];
    
    if (showTierContent) {
      // 只显示阶梯名称
      this.tier1BlockEl.textContent = '第一阶梯';
      this.tier2BlockEl.textContent = '第二阶梯';
      this.tier3BlockEl.textContent = '第三阶梯';
    } else {
      // 显示阶梯名称和电量范围
      const tier1RangeText = `0-${tier1.max}度`;
      const tier2RangeText = `${tier1.max + 1}-${tier2.max}度`;
      const tier3RangeText = `${tier2.max + 1}度以上`;
      
      this.tier1BlockEl.textContent = `第一阶梯(${tier1RangeText})`;
      this.tier2BlockEl.textContent = `第二阶梯(${tier2RangeText})`;
      this.tier3BlockEl.textContent = `第三阶梯(${tier3RangeText})`;
    }
  }

  // 更新阶梯电价配置
  updateTierConfig(config) {
    // 第一阶梯配置
    if (config.tier1_max !== undefined) {
      this.tierConfig.tiers[0].max = parseFloat(config.tier1_max) || this.defaultConfig.tier1_max;
    }
    if (config.tier1_price !== undefined) {
      this.tierConfig.tiers[0].price = parseFloat(config.tier1_price) || this.defaultConfig.tier1_price;
    }
    
    // 第二阶梯配置
    if (config.tier2_max !== undefined) {
      this.tierConfig.tiers[1].max = parseFloat(config.tier2_max) || this.defaultConfig.tier2_max;
    }
    if (config.tier2_price !== undefined) {
      this.tierConfig.tiers[1].price = parseFloat(config.tier2_price) || this.defaultConfig.tier2_price;
    }
    
    // 第三阶梯配置
    if (config.tier3_price !== undefined) {
      this.tierConfig.tiers[2].price = parseFloat(config.tier3_price) || this.defaultConfig.tier3_price;
    }
    
    // 更新阶梯范围显示
    this.updateTierDisplay();
  }

  // 更新背景色配置
  updateBackgroundConfig(config) {
    if (config.background) {
      // 设置卡片背景
      this.electricityCardEl.style.background = config.background;
    } else {
      // 使用默认背景
      this.electricityCardEl.style.background = this.defaultConfig.background;
    }
  }

  // 解析计费周期字符串 (格式: M.D-M.D 如: 7.1-6.30, 1.1-12.31, 12.1-11.30)
  parseBillingCycle(billingCycleStr) {
    // 默认值
    let periodStartMonth = 7;
    let periodStartDay = 1;
    let periodEndMonth = 6;
    let periodEndDay = 30;
    
    if (billingCycleStr) {
      try {
        // 分割开始和结束日期
        const parts = billingCycleStr.split('-');
        if (parts.length === 2) {
          // 解析开始日期
          const startParts = parts[0].split('.');
          if (startParts.length === 2) {
            periodStartMonth = parseInt(startParts[0]);
            periodStartDay = parseInt(startParts[1]);
          }
          
          // 解析结束日期
          const endParts = parts[1].split('.');
          if (endParts.length === 2) {
            periodEndMonth = parseInt(endParts[0]);
            periodEndDay = parseInt(endParts[1]);
          }
        }
      } catch (error) {
        console.warn('计费周期配置格式错误，使用默认值:', error);
      }
    }
    
    return {
      periodStartMonth,
      periodStartDay,
      periodEndMonth,
      periodEndDay
    };
  }

  // 更新计费周期配置
  updatePeriodConfig(config) {
    // 优先使用 billing_cycle 配置，如果不存在则使用旧的配置方式
    let periodConfig;
    
    if (config.billing_cycle !== undefined) {
      // 使用新的 billing_cycle 格式
      periodConfig = this.parseBillingCycle(config.billing_cycle);
    } else if (config.period_start_month !== undefined || config.period_end_month !== undefined) {
      // 使用旧的配置方式（向后兼容）
      periodConfig = {
        periodStartMonth: parseInt(config.period_start_month) || this.defaultConfig.periodStartMonth,
        periodStartDay: parseInt(config.period_start_day) || this.defaultConfig.periodStartDay,
        periodEndMonth: parseInt(config.period_end_month) || this.defaultConfig.periodEndMonth,
        periodEndDay: parseInt(config.period_end_day) || this.defaultConfig.periodEndDay
      };
    } else {
      // 使用默认值
      periodConfig = this.parseBillingCycle(this.defaultConfig.billing_cycle);
    }
    
    // 更新配置
    this.tierConfig.periodStartMonth = periodConfig.periodStartMonth;
    this.tierConfig.periodStartDay = periodConfig.periodStartDay;
    this.tierConfig.periodEndMonth = periodConfig.periodEndMonth;
    this.tierConfig.periodEndDay = periodConfig.periodEndDay;
  }

  // 更新阶梯显示
  updateTierDisplay() {
    const tier1 = this.tierConfig.tiers[0];
    const tier2 = this.tierConfig.tiers[1];
    const tier3 = this.tierConfig.tiers[2];
    
    // 更新tier-range元素（用于tier-content中）
    const tier1RangeText = `0-${tier1.max}度`;
    const tier2RangeText = `${tier1.max + 1}-${tier2.max}度`;
    const tier3RangeText = `${tier2.max + 1}度以上`;
    
    this.tier1RangeEl.textContent = tier1RangeText;
    this.tier2RangeEl.textContent = tier2RangeText;
    this.tier3RangeEl.textContent = tier3RangeText;
    
    this.tier1PriceEl.textContent = `${tier1.price.toFixed(4)}元/度`;
    this.tier2PriceEl.textContent = `${tier2.price.toFixed(4)}元/度`;
    this.tier3PriceEl.textContent = `${tier3.price.toFixed(4)}元/度`;
    
    // 根据当前配置更新tier-block文本
    const showTierContent = this._config && this._config.show_tier_content !== undefined 
      ? this._config.show_tier_content 
      : this.defaultConfig.show_tier_content;
    
    this.updateTierBlockText(showTierContent);
  }

  // 计算分时用电比例和用量
  calculateTimeDistribution(data) {
    const total = data.total || 0;
    const distributions = [];
    let hasNonZeroValue = false;
    
    // 计算各分时用电量，过滤掉0值的时段
    for (const type of this.timeConfig.types) {
      const value = data[type.key] || 0;
      
      // 只有当用电量大于0时才添加
      if (value > 0) {
        hasNonZeroValue = true;
        distributions.push({
          ...type,
          value: value,
          // 不计算百分比，只记录原始值
          percentage: 0,
          width: 0 // 宽度将在后续计算
        });
      }
    }
    
    // 如果没有非零值，返回空数组
    if (!hasNonZeroValue) {
      return [];
    }
    
    // 计算总用电量（仅非零值）
    const sum = distributions.reduce((total, dist) => total + dist.value, 0);
    
    // 计算每个时段的宽度百分比
    distributions.forEach(dist => {
      dist.percentage = (dist.value / sum) * 100;
      dist.width = dist.percentage;
    });
    
    return distributions;
  }

  // 创建分时用电条 - 修改：只显示用量，0值不显示
  createTimeDistributionBar(distributions, containerEl, labelsEl) {
    // 清空现有内容
    containerEl.innerHTML = '';
    labelsEl.innerHTML = '';
    
    // 如果没有数据，隐藏整个分时条区域
    if (distributions.length === 0) {
      containerEl.classList.add('empty');
      labelsEl.classList.add('empty');
      return;
    }
    
    // 显示分时条区域
    containerEl.classList.remove('empty');
    labelsEl.classList.remove('empty');
    
    // 创建分时段条
    distributions.forEach(dist => {
      const segment = document.createElement('div');
      segment.className = `time-segment ${dist.colorClass}`;
      segment.style.width = `${dist.width}%`;
      
      // 只显示用量，不显示百分比
      const displayText = `${dist.value.toFixed(1)}`;
      segment.textContent = displayText;
      segment.title = `${dist.name}: ${dist.value.toFixed(1)}度`;
      containerEl.appendChild(segment);
    });
    
    // 创建标签 - 只显示对应的分时名称
    distributions.forEach(dist => {
      const label = document.createElement('div');
      label.className = 'time-label';
      
      const text = document.createElement('span');
      text.textContent = dist.name;
      text.title = `${dist.name}: ${dist.value.toFixed(1)}度`;
      
      label.appendChild(text);
      labelsEl.appendChild(label);
    });
  }

  set hass(hass) {
    this._hass = hass;
    this.updateCardWithThrottle();
  }

  // 节流更新函数，限制10分钟更新一次
  updateCardWithThrottle() {
    const now = Date.now();
    
    // 如果是第一次更新或者距离上次更新超过10分钟，则更新卡片
    if (!this.lastUpdateTime || (now - this.lastUpdateTime) >= this.updateInterval) {
      this.lastUpdateTime = now;
      this.updateCard();
      console.log(`卡片数据已更新，下次更新将在10分钟后`);
    } else {
      const remainingMinutes = Math.ceil((this.updateInterval - (now - this.lastUpdateTime)) / 60000);
      console.log(`数据更新频率限制：${remainingMinutes}分钟后更新`);
    }
  }

  // 获取当前年月字符串（格式：YYYY-MM）
  getCurrentMonthStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  // 获取当前月份用电数据
  getCurrentMonthData(monthlist) {
    if (!monthlist || !Array.isArray(monthlist)) {
      return { 
        monthEleNum: 0, 
        monthEleCost: 0,
        total: 0,
        TPq: 0,
        PPq: 0,
        NPq: 0,
        VPq: 0
      };
    }
    
    const currentMonthStr = this.getCurrentMonthStr();
    
    // 查找当前月份的数据
    const currentMonthData = monthlist.find(item => item.month === currentMonthStr);
    
    if (currentMonthData) {
      return {
        monthEleNum: currentMonthData.monthEleNum || 0,
        monthEleCost: currentMonthData.monthEleCost || 0,
        total: currentMonthData.monthEleNum || 0,
        TPq: currentMonthData.monthTPq || 0,
        PPq: currentMonthData.monthPPq || 0,
        NPq: currentMonthData.monthNPq || 0,
        VPq: currentMonthData.monthVPq || 0
      };
    }
    
    return { 
      monthEleNum: 0, 
      monthEleCost: 0,
      total: 0,
      TPq: 0,
      PPq: 0,
      NPq: 0,
      VPq: 0
    };
  }

  // 获取当前阶梯电价周期
  getCurrentTierPeriod() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 月份从0开始，所以+1
    
    let startYear, endYear;
    
    // 判断当前日期属于哪个计费周期
    // 比较当前月份和计费周期开始月份
    if (currentMonth >= this.tierConfig.periodStartMonth) {
      // 如果当前月份在计费周期开始月份之后或相同
      startYear = currentYear;
      
      // 计算结束年份：如果结束月份小于开始月份，说明跨年了
      if (this.tierConfig.periodEndMonth < this.tierConfig.periodStartMonth) {
        endYear = currentYear + 1;
      } else {
        endYear = currentYear;
      }
    } else {
      // 如果当前月份在计费周期开始月份之前
      // 说明当前属于上一个周期的后半段
      startYear = currentYear - 1;
      
      // 计算结束年份
      if (this.tierConfig.periodEndMonth < this.tierConfig.periodStartMonth) {
        endYear = currentYear;
      } else {
        endYear = currentYear;
      }
    }
    
    // 创建周期开始和结束日期
    const periodStart = new Date(startYear, this.tierConfig.periodStartMonth - 1, this.tierConfig.periodStartDay);
    const periodEnd = new Date(endYear, this.tierConfig.periodEndMonth - 1, this.tierConfig.periodEndDay);
    
    return {
      start: periodStart,
      end: periodEnd,
      startYear,
      endYear
    };
  }

  // 格式化日期为 MM.DD 格式
  formatDateMMDD(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}.${day}`;
  }

  // 从daylist计算当前周期累计用电量
  calculatePeriodUsageFromDaylist(daylist) {
    if (!daylist || !Array.isArray(daylist)) {
      return 0;
    }
    
    const period = this.getCurrentTierPeriod();
    const periodStart = period.start;
    const periodEnd = period.end;
    const now = new Date();
    
    // 使用今天的日期或周期结束日期中较早的那个
    const endDate = now < periodEnd ? now : periodEnd;
    
    let totalUsage = 0;
    
    // 遍历daylist，累加在周期内的用电量
    for (const dayData of daylist) {
      const dayStr = dayData.day;
      
      // 解析日期字符串，假设格式为 "YYYY-MM-DD"
      const [year, month, day] = dayStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // 检查日期是否在周期内
      if (date >= periodStart && date <= endDate) {
        totalUsage += dayData.dayEleNum || 0;
      }
    }
    
    return totalUsage;
  }

  // 计算当前阶梯
  calculateCurrentTier(usage) {
    const tiers = this.tierConfig.tiers;
    
    for (let i = 0; i < tiers.length; i++) {
      if (usage <= tiers[i].max) {
        return {
          tier: i + 1,
          price: tiers[i].price,
          maxUsage: tiers[i].max,
          remaining: Math.max(0, tiers[i].max - usage),
          isLastTier: i === tiers.length - 1
        };
      }
    }
    
    // 如果超过所有阶梯，返回最后一个阶梯
    const lastTier = tiers[tiers.length - 1];
    return {
      tier: tiers.length,
      price: lastTier.price,
      maxUsage: Infinity,
      remaining: 0,
      isLastTier: true
    };
  }

  // 计算准确的位置百分比
  calculateIndicatorPosition(usage, tierInfo) {
    const totalWidth = 100; // 总宽度百分比
    const tierWidthPercent = totalWidth / this.tierConfig.tiers.length;
    
    // 如果是最后一个阶梯
    if (tierInfo.isLastTier) {
      // 如果用电量刚好在最后一个阶梯开始处
      if (usage <= this.tierConfig.tiers[this.tierConfig.tiers.length - 2].max) {
        return (tierInfo.tier - 1) * tierWidthPercent;
      }
      // 如果在最后一个阶梯中间或后面
      const lastTierStart = this.tierConfig.tiers[this.tierConfig.tiers.length - 2].max;
      const lastTierUsage = usage - lastTierStart;
      // 假设最后一个阶梯显示为剩余20%的宽度
      const lastTierDisplayPercent = 0.2;
      const positionInLastTier = Math.min(lastTierUsage / 1000, 1) * lastTierDisplayPercent;
      
      return ((tierInfo.tier - 1) + positionInLastTier) * tierWidthPercent;
    }
    
    // 对于第一和第二阶梯
    const tierStart = tierInfo.tier === 1 ? 0 : this.tierConfig.tiers[tierInfo.tier - 2].max;
    const tierSize = tierInfo.maxUsage - tierStart;
    const tierProgress = usage - tierStart;
    const tierPercent = tierSize > 0 ? tierProgress / tierSize : 0;
    
    // 计算总位置百分比
    return ((tierInfo.tier - 1) + tierPercent) * tierWidthPercent;
  }

  // 更新阶梯指示器
  updateTierIndicator(usage) {
    const tierInfo = this.calculateCurrentTier(usage);
    const period = this.getCurrentTierPeriod();
    
    // 存储当前周期用电量和阶梯
    this.currentPeriodUsage = usage;
    this.currentTier = tierInfo.tier;
    
    // 更新电价显示
    this.electricityPriceEl.textContent = tierInfo.price.toFixed(4);
    
    // 更新周期显示为 MM.DD-MM.DD 格式
    const startDateStr = this.formatDateMMDD(period.start);
    const endDateStr = this.formatDateMMDD(period.end);
    this.tierPeriodEl.textContent = `阶梯周期: ${startDateStr}-${endDateStr}`;
    
    // 移除所有阶梯的current类
    this.tier1El.classList.remove('current');
    this.tier2El.classList.remove('current');
    this.tier3El.classList.remove('current');
    
    // 为当前阶梯添加current类
    const currentTierEl = this.shadowRoot.getElementById(`tier-${tierInfo.tier}`);
    if (currentTierEl) {
      currentTierEl.classList.add('current');
    }
    
    // 移除可能存在的旧红色竖线指示器
    const oldRedLines = this.shadowRoot.querySelectorAll('.red-line-indicator');
    oldRedLines.forEach(line => line.remove());
    
    // 计算current-indicator的位置
    const indicatorPosition = this.calculateIndicatorPosition(usage, tierInfo);
    
    // 创建红色竖线指示器（放在tiers-container中）
    const redLineIndicator = document.createElement('div');
    redLineIndicator.className = 'red-line-indicator';
    redLineIndicator.style.left = `${indicatorPosition}%`;
    this.tiersContainerEl.appendChild(redLineIndicator);
    
    // 更新当前指示器内容
    this.currentTierEl.textContent = tierInfo.tier;
    this.currentUsageEl.textContent = usage.toFixed(1);
    
    // 更新当前指示器背景色
    this.currentIndicatorEl.classList.remove('tier-1', 'tier-2', 'tier-3');
    this.currentIndicatorEl.classList.add(`tier-${tierInfo.tier}`);
    
    // 设置current-indicator位置 - 与红色竖线完全相同的百分比
    this.currentIndicatorEl.style.left = `${indicatorPosition}%`;
    
    // 确保两个指示器在同一垂直线上
    // current-indicator的箭头应该正好指向红色竖线的顶部
    // 通过调整current-indicator的top值来对齐
    this.currentIndicatorEl.style.top = '-18px'; // 确保与红色竖线对齐
  }

  updateCard() {
    if (!this._config || !this._hass) return;

    const entityId = this._config.entity;
    const entity = this._hass.states[entityId];
    
    if (!entity) {
      console.warn(`实体 ${entityId} 未找到`);
      return;
    }

    // 更新余额
    const balance = parseFloat(entity.state) || 0;
    this.balanceEl.textContent = balance.toFixed(2);

    // 获取属性
    const attributes = entity.attributes || {};
    
    // 更新日期
    const date = attributes.date || '';
    this.dateEl.textContent = `截至 ${date}`;
    
    // 获取monthlist数据
    const monthlist = attributes.monthlist || [];
    
    // 更新本月用电数据
    const currentMonthData = this.getCurrentMonthData(monthlist);
    this.currentMonthElectricityEl.textContent = currentMonthData.monthEleNum.toFixed(1);
    this.currentMonthCostEl.textContent = currentMonthData.monthEleCost.toFixed(2);
    
    // 更新本月分时用电条
    const currentMonthDistribution = this.calculateTimeDistribution(currentMonthData);
    this.createTimeDistributionBar(currentMonthDistribution, this.currentMonthDistributionEl, this.currentMonthLabelsEl);
    
    // 更新上月数据（上个月）
    let lastMonthData = {};
    if (monthlist.length > 1) {
      lastMonthData = monthlist[1]; // 获取上个月的数据
    } else if (monthlist.length > 0) {
      lastMonthData = monthlist[0]; // 如果没有上个月数据，使用当前月
    }
    
    // 构建上月分时用电数据
    const lastMonthTimeData = {
      total: lastMonthData.monthEleNum || 0,
      TPq: lastMonthData.monthTPq || 0,
      PPq: lastMonthData.monthPPq || 0,
      NPq: lastMonthData.monthNPq || 0,
      VPq: lastMonthData.monthVPq || 0
    };
    
    this.lastMonthElectricityEl.textContent = lastMonthData.monthEleNum || 0;
    this.lastMonthCostEl.textContent = lastMonthData.monthEleCost ? 
      lastMonthData.monthEleCost.toFixed(2) : '0.00';
    
    // 更新上月分时用电条
    const lastMonthDistribution = this.calculateTimeDistribution(lastMonthTimeData);
    this.createTimeDistributionBar(lastMonthDistribution, this.lastMonthDistributionEl, this.lastMonthLabelsEl);
    
    // 更新年度数据
    const yearlist = attributes.yearlist || [];
    const currentYear = new Date().getFullYear().toString();
    const currentYearData = yearlist.find(item => item.year === currentYear) || 
                          yearlist.find(item => item.year === "2025") || 
                          {};
    
    // 构建年度分时用电数据
    const yearTimeData = {
      total: currentYearData.yearEleNum || 0,
      TPq: currentYearData.yearTPq || 0,
      PPq: currentYearData.yearPPq || 0,
      NPq: currentYearData.yearNPq || 0,
      VPq: currentYearData.yearVPq || 0
    };
    
    this.currentYearEl.textContent = currentYearData.year || currentYear;
    this.yearElectricityEl.textContent = currentYearData.yearEleNum || 0;
    this.yearCostEl.textContent = currentYearData.yearEleCost ? 
      currentYearData.yearEleCost.toFixed(2) : '0.00';
    
    // 更新年度分时用电条
    const yearDistribution = this.calculateTimeDistribution(yearTimeData);
    this.createTimeDistributionBar(yearDistribution, this.yearDistributionEl, this.yearLabelsEl);
    
    // 计算并更新阶梯电价
    // 使用daylist计算当前阶梯电价周期的累计用电量
    const daylist = attributes.daylist || [];
    const currentPeriodUsage = this.calculatePeriodUsageFromDaylist(daylist);
    
    this.updateTierIndicator(currentPeriodUsage);
  }

  // 定义卡片配置
  static getConfigElement() {
    return document.createElement('hui-entity-card-editor');
  }

  static getStubConfig() {
    return {
      entity: 'sensor.electricity_info',
      name: '用电信息',
      show_name: true,
      show_time_distribution: true,
      show_tier_content: true,
      // 阶梯电价配置
      tier1_max: 2160,
      tier1_price: 0.4983,
      tier2_max: 4200,
      tier2_price: 0.5483,
      tier3_price: 0.7983,
      // 计费周期配置 (格式: M.D-M.D)
      billing_cycle: '7.1-6.30',
      // 背景色配置（支持十六进制、rgba和渐变色）
      background: 'linear-gradient(135deg, rgba(204, 244, 243, 1) 0%, rgba(177, 233, 234, 1) 100%)'
    };
  }
}

// 注册自定义元素
customElements.define('electricity-info-card', ElectricityInfoCard);

// 告诉Home Assistant这个卡片类型
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'electricity-info-card',
  name: '用电信息卡片',
  description: '显示用电信息的自定义卡片，支持自定义阶梯电价、计费周期、背景色和控制各项显示',
  preview: true
});

console.log('用电信息卡片已加载');